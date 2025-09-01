/**
 * Unified API Service - Combines ALL working APIs
 * ESPN, SportsDataIO, OpenWeather
 */

// API Keys
const SPORTSDATA_API_KEY = 'c5298a785e5e48fdad99fca62bfff60e';
const OPENWEATHER_API_KEY = 'cebea6d73816dccaecbe0dcd99d2471c';

export interface UnifiedGame {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  date: string;
  status: string;
  venue?: string;
  weather?: {
    temp: number;
    condition: string;
    windSpeed: number;
    humidity: number;
  };
  odds?: {
    spread: number;
    overUnder: number;
    homeML: number;
    awayML: number;
  };
  bettingTrends?: {
    publicBetting: number;
    sharpMoney: number;
    lineMovement: string;
  };
}

export class UnifiedApiService {
  
  // Get ALL games from multiple sources
  async getAllGames(): Promise<UnifiedGame[]> {
    const games: UnifiedGame[] = [];
    
    try {
      // 1. Fetch ESPN games (no auth needed)
      const espnGames = await this.fetchESPNGames();
      games.push(...espnGames);
      
      // 2. Fetch SportsDataIO games for additional data
      const sportsDataGames = await this.fetchSportsDataIOGames();
      
      // 3. Merge odds and betting data
      for (const game of games) {
        const matchingSDGame = sportsDataGames.find(
          sdg => this.teamsMatch(game, sdg)
        );
        
        if (matchingSDGame) {
          game.odds = {
            spread: matchingSDGame.PointSpread || 0,
            overUnder: matchingSDGame.OverUnder || 0,
            homeML: matchingSDGame.HomeMoneyLine || -110,
            awayML: matchingSDGame.AwayMoneyLine || 110
          };
        }
        
        // 4. Add weather data for outdoor games
        if (game.venue) {
          game.weather = await this.fetchWeatherForVenue(game.venue);
        }
      }
      
      console.log(`✅ Unified API: Found ${games.length} total games with complete data`);
      return games;
      
    } catch (error) {
      console.error('Unified API error:', error);
      return games; // Return what we have
    }
  }
  
  // ESPN API - Get current games
  async fetchESPNGames(): Promise<UnifiedGame[]> {
    const sports = [
      { sport: 'football', league: 'nfl' },
      { sport: 'basketball', league: 'nba' },
      { sport: 'baseball', league: 'mlb' },
      { sport: 'hockey', league: 'nhl' }
    ];
    
    const allGames: UnifiedGame[] = [];
    
    for (const { sport, league } of sports) {
      try {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const events = data.events || [];
        
        for (const event of events) {
          const competition = event.competitions?.[0];
          if (!competition) continue;
          
          const home = competition.competitors?.find((c: any) => c.homeAway === 'home');
          const away = competition.competitors?.find((c: any) => c.homeAway === 'away');
          
          if (!home || !away) continue;
          
          allGames.push({
            id: event.id,
            sport: league.toUpperCase(),
            homeTeam: home.team.displayName,
            awayTeam: away.team.displayName,
            homeScore: parseInt(home.score) || 0,
            awayScore: parseInt(away.score) || 0,
            date: event.date,
            status: competition.status?.type?.description || 'Scheduled',
            venue: competition.venue?.fullName
          });
        }
      } catch (error) {
        console.error(`Error fetching ${league} from ESPN:`, error);
      }
    }
    
    return allGames;
  }
  
  // SportsDataIO API - Get games with betting data
  async fetchSportsDataIOGames(): Promise<any[]> {
    const allGames = [];
    
    // NFL Games
    try {
      const nflResponse = await fetch(
        `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2024/1?key=${SPORTSDATA_API_KEY}`
      );
      if (nflResponse.ok) {
        const nflGames = await nflResponse.json();
        allGames.push(...nflGames);
      }
    } catch (error) {
      console.error('SportsDataIO NFL error:', error);
    }
    
    // NBA Games
    try {
      const today = new Date().toISOString().split('T')[0];
      const nbaResponse = await fetch(
        `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${today}?key=${SPORTSDATA_API_KEY}`
      );
      if (nbaResponse.ok) {
        const nbaGames = await nbaResponse.json();
        allGames.push(...nbaGames);
      }
    } catch (error) {
      console.error('SportsDataIO NBA error:', error);
    }
    
    return allGames;
  }
  
  // OpenWeather API - Get weather for venue
  async fetchWeatherForVenue(venue: string): Promise<any> {
    try {
      // Extract city from venue name (simple approach)
      const city = venue.split(',')[0].split(' ').slice(-1)[0];
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=imperial`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      return {
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        windSpeed: Math.round(data.wind.speed),
        humidity: data.main.humidity
      };
    } catch (error) {
      console.error('Weather API error:', error);
      return null;
    }
  }
  
  // Helper to match teams between different APIs
  private teamsMatch(game1: any, game2: any): boolean {
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
    return (
      normalize(game1.homeTeam).includes(normalize(game2.HomeTeam || '')) ||
      normalize(game1.awayTeam).includes(normalize(game2.AwayTeam || ''))
    );
  }
  
  // Get betting trends from SportsDataIO
  async getBettingTrends(gameId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByGameID/${gameId}?key=${SPORTSDATA_API_KEY}`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Betting trends error:', error);
      return null;
    }
  }
  
  // Get player injuries
  async getInjuries(sport: string): Promise<any[]> {
    try {
      const sportLower = sport.toLowerCase();
      const response = await fetch(
        `https://api.sportsdata.io/v3/${sportLower}/projections/json/InjuredPlayers?key=${SPORTSDATA_API_KEY}`
      );
      
      if (!response.ok) return [];
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Injuries API error:', error);
      return [];
    }
  }
}

export const unifiedApi = new UnifiedApiService();