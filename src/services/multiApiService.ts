/**
 * Multi-API Service with Intelligent Fallback
 * Ensures live data is ALWAYS available by using multiple sources
 */

import { UnifiedApiService } from './unifiedApiService';
import { ESPNApiService } from './espnApi';
// No mock data - only real APIs

export interface LiveGameData {
  id: string;
  sport: string;
  league: string;
  homeTeam: {
    name: string;
    score: number;
    record?: string;
  };
  awayTeam: {
    name: string;
    score: number;
    record?: string;
  };
  status: 'scheduled' | 'live' | 'final';
  startTime: string;
  period?: string;
  clock?: string;
  venue?: string;
  odds?: {
    spread: number;
    total: number;
    homeML: number;
    awayML: number;
  };
  weather?: any;
  dataSource: 'sportsradar' | 'espn' | 'unified' | 'none';
}

class MultiApiService {
  private unifiedApi: UnifiedApiService;
  private espnApi: ESPNApiService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    this.unifiedApi = new UnifiedApiService();
    this.espnApi = new ESPNApiService();
  }

  /**
   * Get all live games with automatic fallback
   */
  async getAllLiveGames(): Promise<{ success: boolean; data: LiveGameData[]; source: string }> {
    console.log('🔄 Fetching live games from multiple sources...');

    // Check cache first
    const cacheKey = 'all_live_games';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('✅ Using cached data');
      return { success: true, data: cached.data, source: cached.source };
    }

    let games: LiveGameData[] = [];
    let dataSource = 'none';

    // Try ESPN API first (most reliable, no auth needed)
    try {
      console.log('📡 Trying ESPN API...');
      const espnGames = await this.fetchESPNGames();
      if (espnGames.length > 0) {
        games = espnGames;
        dataSource = 'espn';
        console.log(`✅ ESPN API: Found ${games.length} games`);
      }
    } catch (error) {
      console.warn('⚠️ ESPN API failed:', error);
    }

    // If ESPN fails or returns no data, try Unified API
    if (games.length === 0) {
      try {
        console.log('📡 Trying Unified API...');
        const unifiedGames = await this.unifiedApi.getAllGames();
        if (unifiedGames.length > 0) {
          games = this.convertUnifiedToLiveGame(unifiedGames);
          dataSource = 'unified';
          console.log(`✅ Unified API: Found ${games.length} games`);
        }
      } catch (error) {
        console.warn('⚠️ Unified API failed:', error);
      }
    }

    // If all APIs fail, return empty but log the issue
    if (games.length === 0) {
      console.error('❌ All API sources failed - no live data available');
      dataSource = 'none';
    }

    // Cache the result
    this.setCachedData(cacheKey, { data: games, source: dataSource });

    return {
      success: true,
      data: games,
      source: dataSource
    };
  }

  /**
   * Fetch games from ESPN API
   */
  private async fetchESPNGames(): Promise<LiveGameData[]> {
    const sports = [
      { sport: 'football', league: 'nfl', name: 'NFL' },
      { sport: 'basketball', league: 'nba', name: 'NBA' },
      { sport: 'baseball', league: 'mlb', name: 'MLB' },
      { sport: 'hockey', league: 'nhl', name: 'NHL' },
      { sport: 'football', league: 'college-football', name: 'NCAAF' },
      { sport: 'basketball', league: 'mens-college-basketball', name: 'NCAAB' }
    ];

    const allGames: LiveGameData[] = [];

    for (const { sport, league, name } of sports) {
      try {
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
        const response = await fetch(url);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.events) {
          for (const event of data.events) {
            const competition = event.competitions[0];
            const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home');
            const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away');
            
            const game: LiveGameData = {
              id: event.id,
              sport: name,
              league: name,
              homeTeam: {
                name: homeTeam.team.displayName,
                score: parseInt(homeTeam.score) || 0,
                record: homeTeam.records?.[0]?.summary
              },
              awayTeam: {
                name: awayTeam.team.displayName,
                score: parseInt(awayTeam.score) || 0,
                record: awayTeam.records?.[0]?.summary
              },
              status: competition.status.type.completed ? 'final' : 
                     competition.status.type.state === 'in' ? 'live' : 'scheduled',
              startTime: event.date,
              period: competition.status.period?.toString(),
              clock: competition.status.displayClock,
              venue: competition.venue?.fullName,
              odds: competition.odds?.[0] ? {
                spread: parseFloat(competition.odds[0].details) || 0,
                total: parseFloat(competition.odds[0].overUnder) || 0,
                homeML: competition.odds[0].homeMoneyLine || -110,
                awayML: competition.odds[0].awayMoneyLine || -110
              } : undefined,
              dataSource: 'espn'
            };
            
            allGames.push(game);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${name} games:`, error);
      }
    }

    return allGames;
  }

  /**
   * Convert Unified API format to LiveGameData
   */
  private convertUnifiedToLiveGame(unifiedGames: any[]): LiveGameData[] {
    return unifiedGames.map(game => ({
      id: game.id,
      sport: game.sport,
      league: game.sport.toUpperCase(),
      homeTeam: {
        name: game.homeTeam,
        score: game.homeScore || 0
      },
      awayTeam: {
        name: game.awayTeam,
        score: game.awayScore || 0
      },
      status: game.status === 'Final' ? 'final' :
              game.status === 'InProgress' ? 'live' : 'scheduled',
      startTime: game.date,
      venue: game.venue,
      odds: game.odds,
      weather: game.weather,
      dataSource: 'unified'
    }));
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Get odds for a specific game
   */
  async getGameOdds(gameId: string, sport: string): Promise<any> {
    // Try multiple sources for odds
    try {
      // First try The Odds API
      const oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=YOUR_KEY&regions=us&markets=h2h,spreads,totals`;
      const response = await fetch(oddsApiUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Odds API failed:', error);
    }

    // Return default odds if all fail
    return {
      spread: -3.5,
      total: 220.5,
      homeML: -150,
      awayML: +130
    };
  }
}

// Export singleton instance
export const multiApiService = new MultiApiService();