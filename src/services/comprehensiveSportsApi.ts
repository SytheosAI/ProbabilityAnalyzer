/**
 * Comprehensive Sports Data API Service
 * Supports: NBA, NFL, MLB, NHL, NCAA Basketball, NCAA Football, Tennis, Soccer
 * Real-time data fetching with Sports Radar API integration
 */

const SPORTS_RADAR_API_KEY = '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd';
const BASE_URL = 'https://api.sportradar.com';

export type SportType = 'NBA' | 'NFL' | 'MLB' | 'NHL' | 'NCAAB' | 'NCAAF' | 'TENNIS' | 'SOCCER';

export interface UniversalGame {
  id: string;
  sport: SportType;
  status: 'scheduled' | 'live' | 'final' | 'postponed' | 'cancelled';
  scheduled: Date;
  homeTeam: {
    id: string;
    name: string;
    score?: number;
    moneyline?: number;
    spread?: number;
    spreadOdds?: number;
    totalOver?: number;
    totalUnder?: number;
    winProbability?: number;
    logo?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    score?: number;
    moneyline?: number;
    spread?: number;
    spreadOdds?: number;
    totalOver?: number;
    totalUnder?: number;
    winProbability?: number;
    logo?: string;
  };
  venue?: {
    name: string;
    city: string;
    country?: string;
  };
  period?: string;
  clock?: string;
  possession?: string;
  lastUpdate?: Date;
  predictions?: {
    model: string;
    homeWinProb: number;
    awayWinProb: number;
    expectedTotal: number;
    confidence: number;
    edge?: number;
    valueBet?: boolean;
  };
  weather?: {
    temperature?: number;
    conditions?: string;
    wind?: string;
  };
}

export interface TeamStatistics {
  teamId: string;
  teamName: string;
  sport: SportType;
  season: string;
  wins: number;
  losses: number;
  draws?: number;
  winPercentage: number;
  homeRecord: string;
  awayRecord: string;
  lastGames: {
    count: number;
    wins: number;
    losses: number;
    draws?: number;
    pointsFor: number;
    pointsAgainst: number;
  };
  offense: {
    pointsPerGame: number;
    yardsPerGame?: number;
    fieldGoalPercentage?: number;
    threePointPercentage?: number;
    goalsPerGame?: number;
  };
  defense: {
    pointsAllowedPerGame: number;
    yardsAllowedPerGame?: number;
    opponentFieldGoalPercentage?: number;
    goalsAllowedPerGame?: number;
  };
  trends: {
    atsRecord: string;
    overUnderRecord: string;
    restDays?: number;
    streak?: string;
  };
  keyPlayers?: {
    name: string;
    position: string;
    stats: any;
    injuryStatus?: string;
  }[];
}

export interface OddsComparison {
  gameId: string;
  sport: SportType;
  books: {
    name: string;
    lastUpdate: Date;
    moneyline: {
      home: number;
      away: number;
    };
    spread: {
      home: number;
      away: number;
      line: number;
    };
    total: {
      over: number;
      under: number;
      line: number;
    };
  }[];
  bestOdds: {
    homeMoneyline: { book: string; odds: number };
    awayMoneyline: { book: string; odds: number };
    homeSpread: { book: string; line: number; odds: number };
    awaySpread: { book: string; line: number; odds: number };
    over: { book: string; line: number; odds: number };
    under: { book: string; line: number; odds: number };
  };
  consensus?: {
    moneylineBets: { home: number; away: number };
    spreadBets: { home: number; away: number };
    totalBets: { over: number; under: number };
  };
}

class ComprehensiveSportsAPI {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 30000; // 30 seconds cache
  private rateLimitDelay = 1000; // 1 second between API calls
  private lastApiCall = 0;

  // Sport-specific endpoints configuration
  private readonly sportEndpoints = {
    NBA: {
      schedule: '/nba/trial/v8/en/games/{date}/schedule.json',
      odds: '/odds/v2/nba/games/{date}/odds.json',
      standings: '/nba/trial/v8/en/seasons/{season}/REG/standings.json',
      statistics: '/nba/trial/v8/en/teams/{teamId}/profile.json'
    },
    NFL: {
      schedule: '/nfl/official/trial/v7/en/games/{year}/{week}/schedule.json',
      odds: '/odds/v2/nfl/games/{week}/odds.json',
      standings: '/nfl/official/trial/v7/en/seasons/{season}/standings.json',
      statistics: '/nfl/official/trial/v7/en/teams/{teamId}/profile.json'
    },
    MLB: {
      schedule: '/mlb/trial/v7/en/games/{date}/schedule.json',
      odds: '/odds/v2/mlb/games/{date}/odds.json',
      standings: '/mlb/trial/v7/en/seasons/{season}/REG/standings.json',
      statistics: '/mlb/trial/v7/en/teams/{teamId}/profile.json'
    },
    NHL: {
      schedule: '/nhl/trial/v7/en/games/{date}/schedule.json',
      odds: '/odds/v2/nhl/games/{date}/odds.json',
      standings: '/nhl/trial/v7/en/seasons/{season}/REG/standings.json',
      statistics: '/nhl/trial/v7/en/teams/{teamId}/profile.json'
    },
    NCAAB: {
      schedule: '/ncaamb/trial/v8/en/games/{date}/schedule.json',
      odds: '/odds/v2/ncaamb/games/{date}/odds.json',
      standings: '/ncaamb/trial/v8/en/seasons/{season}/REG/standings.json',
      statistics: '/ncaamb/trial/v8/en/teams/{teamId}/profile.json'
    },
    NCAAF: {
      schedule: '/ncaafb/trial/v7/en/games/{year}/{week}/schedule.json',
      odds: '/odds/v2/ncaafb/games/{week}/odds.json',
      standings: '/ncaafb/trial/v7/en/seasons/{season}/standings.json',
      statistics: '/ncaafb/trial/v7/en/teams/{teamId}/profile.json'
    },
    TENNIS: {
      schedule: '/tennis/trial/v3/en/schedules/{date}/schedule.json',
      odds: '/odds/v2/tennis/competitions/{date}/odds.json',
      rankings: '/tennis/trial/v3/en/rankings/wta.json',
      statistics: '/tennis/trial/v3/en/players/{playerId}/profile.json'
    },
    SOCCER: {
      schedule: '/soccer/trial/v4/en/competitions/{league}/matches/{date}/schedule.json',
      odds: '/odds/v2/soccer/matches/{date}/odds.json',
      standings: '/soccer/trial/v4/en/competitions/{league}/standings.json',
      statistics: '/soccer/trial/v4/en/teams/{teamId}/profile.json'
    }
  };

  private async fetchWithRateLimit(url: string): Promise<any> {
    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    if (timeSinceLastCall < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastCall));
    }
    this.lastApiCall = Date.now();

    try {
      const fullUrl = `${BASE_URL}${url}?api_key=${SPORTS_RADAR_API_KEY}`;
      console.log(`Fetching: ${fullUrl}`);
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limit hit, waiting 5 seconds...');
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.fetchWithRateLimit(url);
        }
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  }

  /**
   * Get games for all supported sports
   */
  async getAllSportsGames(date?: Date): Promise<UniversalGame[]> {
    const targetDate = date || new Date();
    const games: UniversalGame[] = [];

    // Fetch games for each sport in parallel with error handling
    const sportPromises = Object.keys(this.sportEndpoints).map(async (sport) => {
      try {
        const sportGames = await this.getSportGames(sport as SportType, targetDate);
        return sportGames;
      } catch (error) {
        console.error(`Error fetching ${sport} games:`, error);
        return [];
      }
    });

    const results = await Promise.all(sportPromises);
    results.forEach(sportGames => games.push(...sportGames));

    return games;
  }

  /**
   * Get games for a specific sport
   */
  async getSportGames(sport: SportType, date?: Date): Promise<UniversalGame[]> {
    const targetDate = date || new Date();
    const endpoint = this.buildScheduleEndpoint(sport, targetDate);
    
    try {
      const data = await this.fetchWithRateLimit(endpoint);
      return this.parseGamesToUniversalFormat(data, sport);
    } catch (error) {
      console.error(`Error fetching ${sport} games:`, error);
      return [];
    }
  }

  /**
   * Get team statistics
   */
  async getTeamStatistics(sport: SportType, teamId: string, season?: string): Promise<TeamStatistics> {
    const currentSeason = season || this.getCurrentSeason(sport);
    const endpoint = this.sportEndpoints[sport].statistics.replace('{teamId}', teamId);
    
    try {
      const data = await this.fetchWithRateLimit(endpoint);
      return this.parseTeamStatistics(data, sport);
    } catch (error) {
      console.error(`Error fetching team statistics:`, error);
      throw error;
    }
  }

  /**
   * Get odds comparison for a game
   */
  async getOddsComparison(sport: SportType, gameId: string): Promise<OddsComparison> {
    const date = new Date();
    const endpoint = this.buildOddsEndpoint(sport, date);
    
    try {
      const data = await this.fetchWithRateLimit(endpoint);
      return this.parseOddsData(data, gameId, sport);
    } catch (error) {
      console.error(`Error fetching odds:`, error);
      throw error;
    }
  }

  /**
   * Get injury reports for a sport
   */
  async getInjuryReports(sport: SportType): Promise<any[]> {
    const injuryEndpoints: Record<SportType, string> = {
      NBA: '/nba/trial/v8/en/league/injuries.json',
      NFL: '/nfl/official/trial/v7/en/league/injuries.json',
      MLB: '/mlb/trial/v7/en/league/injuries.json',
      NHL: '/nhl/trial/v7/en/league/injuries.json',
      NCAAB: '/ncaamb/trial/v8/en/league/injuries.json',
      NCAAF: '/ncaafb/trial/v7/en/league/injuries.json',
      TENNIS: '/tennis/trial/v3/en/sport_events/withdrawals.json',
      SOCCER: '/soccer/trial/v4/en/teams/injuries.json'
    };

    try {
      const data = await this.fetchWithRateLimit(injuryEndpoints[sport]);
      return this.parseInjuryReports(data, sport);
    } catch (error) {
      console.error(`Error fetching injuries:`, error);
      return [];
    }
  }

  /**
   * Get standings/rankings
   */
  async getStandings(sport: SportType, season?: string): Promise<any> {
    const currentSeason = season || this.getCurrentSeason(sport);
    let endpoint = '';

    if (sport === 'TENNIS') {
      endpoint = this.sportEndpoints[sport].rankings;
    } else {
      endpoint = this.sportEndpoints[sport].standings.replace('{season}', currentSeason);
      if (sport === 'SOCCER') {
        endpoint = endpoint.replace('{league}', 'sr:competition:17'); // Premier League
      }
    }

    try {
      const data = await this.fetchWithRateLimit(endpoint);
      return this.parseStandings(data, sport);
    } catch (error) {
      console.error(`Error fetching standings:`, error);
      throw error;
    }
  }

  // Helper methods
  private buildScheduleEndpoint(sport: SportType, date: Date): string {
    const dateStr = this.formatDate(date);
    let endpoint = this.sportEndpoints[sport].schedule;

    switch (sport) {
      case 'NBA':
      case 'MLB':
      case 'NHL':
      case 'NCAAB':
      case 'TENNIS':
        endpoint = endpoint.replace('{date}', dateStr);
        break;
      case 'NFL':
      case 'NCAAF':
        const week = this.getCurrentWeek(sport, date);
        const year = date.getFullYear();
        endpoint = endpoint.replace('{year}', year.toString()).replace('{week}', week.toString());
        break;
      case 'SOCCER':
        endpoint = endpoint.replace('{league}', 'sr:competition:17').replace('{date}', dateStr);
        break;
    }

    return endpoint;
  }

  private buildOddsEndpoint(sport: SportType, date: Date): string {
    const dateStr = this.formatDate(date);
    let endpoint = this.sportEndpoints[sport].odds;

    switch (sport) {
      case 'NBA':
      case 'MLB':
      case 'NHL':
      case 'NCAAB':
      case 'TENNIS':
      case 'SOCCER':
        endpoint = endpoint.replace('{date}', dateStr);
        break;
      case 'NFL':
      case 'NCAAF':
        const week = this.getCurrentWeek(sport, date);
        endpoint = endpoint.replace('{week}', week.toString());
        break;
    }

    return endpoint;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentSeason(sport: SportType): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    switch (sport) {
      case 'NBA':
      case 'NHL':
        return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      case 'NFL':
      case 'MLB':
        return year.toString();
      case 'NCAAB':
        return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
      case 'NCAAF':
        return year.toString();
      case 'TENNIS':
      case 'SOCCER':
        return year.toString();
      default:
        return year.toString();
    }
  }

  private getCurrentWeek(sport: 'NFL' | 'NCAAF', date: Date): number {
    const seasonStarts = {
      NFL: new Date('2024-09-05'),
      NCAAF: new Date('2024-08-24')
    };

    const start = seasonStarts[sport];
    const daysDiff = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.floor(daysDiff / 7) + 1;
    
    return Math.max(1, Math.min(week, sport === 'NFL' ? 18 : 15));
  }

  private parseGamesToUniversalFormat(data: any, sport: SportType): UniversalGame[] {
    const games: UniversalGame[] = [];
    let gamesList = [];

    // Extract games list based on sport data structure
    switch (sport) {
      case 'NBA':
      case 'MLB':
      case 'NHL':
      case 'NCAAB':
        gamesList = data.games || [];
        break;
      case 'NFL':
      case 'NCAAF':
        gamesList = data.week?.games || [];
        break;
      case 'TENNIS':
        gamesList = data.sport_events || [];
        break;
      case 'SOCCER':
        gamesList = data.sport_events || [];
        break;
    }

    gamesList.forEach((game: any) => {
      try {
        const universalGame = this.convertToUniversalGame(game, sport);
        if (universalGame) {
          games.push(universalGame);
        }
      } catch (error) {
        console.error(`Error parsing game:`, error);
      }
    });

    return games;
  }

  private convertToUniversalGame(game: any, sport: SportType): UniversalGame | null {
    try {
      // Handle tennis differently (individual sport)
      if (sport === 'TENNIS') {
        return {
          id: game.id,
          sport,
          status: this.mapGameStatus(game.status),
          scheduled: new Date(game.scheduled || game.start_time),
          homeTeam: {
            id: game.competitors?.[0]?.id || '',
            name: game.competitors?.[0]?.name || 'TBD',
            score: game.sport_event_status?.home_score
          },
          awayTeam: {
            id: game.competitors?.[1]?.id || '',
            name: game.competitors?.[1]?.name || 'TBD',
            score: game.sport_event_status?.away_score
          },
          venue: game.venue,
          period: game.sport_event_status?.match_status,
          lastUpdate: new Date()
        };
      }

      // Team sports
      return {
        id: game.id,
        sport,
        status: this.mapGameStatus(game.status || game.sport_event_status?.status),
        scheduled: new Date(game.scheduled || game.start_time),
        homeTeam: {
          id: game.home?.id || game.home_team?.id || '',
          name: game.home?.name || game.home_team?.name || 'TBD',
          score: game.home_points || game.home_score || game.sport_event_status?.home_score
        },
        awayTeam: {
          id: game.away?.id || game.away_team?.id || '',
          name: game.away?.name || game.away_team?.name || 'TBD',
          score: game.away_points || game.away_score || game.sport_event_status?.away_score
        },
        venue: game.venue,
        period: game.period || game.sport_event_status?.period,
        clock: game.clock || game.sport_event_status?.clock,
        possession: game.possession,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('Error converting game:', error);
      return null;
    }
  }

  private mapGameStatus(status: string): UniversalGame['status'] {
    const statusMap: Record<string, UniversalGame['status']> = {
      'scheduled': 'scheduled',
      'created': 'scheduled',
      'inprogress': 'live',
      'live': 'live',
      'halftime': 'live',
      'closed': 'final',
      'complete': 'final',
      'ended': 'final',
      'postponed': 'postponed',
      'cancelled': 'cancelled',
      'suspended': 'postponed'
    };

    return statusMap[status?.toLowerCase()] || 'scheduled';
  }

  private parseTeamStatistics(data: any, sport: SportType): TeamStatistics {
    const team = data.team || data;
    const season = data.season || {};
    const statistics = data.statistics || season.statistics || {};

    return {
      teamId: team.id,
      teamName: team.name,
      sport,
      season: this.getCurrentSeason(sport),
      wins: statistics.wins || 0,
      losses: statistics.losses || 0,
      draws: statistics.draws,
      winPercentage: statistics.win_pct || (statistics.wins / (statistics.wins + statistics.losses)) || 0,
      homeRecord: `${statistics.home_wins || 0}-${statistics.home_losses || 0}`,
      awayRecord: `${statistics.away_wins || 0}-${statistics.away_losses || 0}`,
      lastGames: {
        count: 10,
        wins: statistics.last_10_wins || 0,
        losses: statistics.last_10_losses || 0,
        draws: statistics.last_10_draws,
        pointsFor: statistics.points_for || 0,
        pointsAgainst: statistics.points_against || 0
      },
      offense: {
        pointsPerGame: statistics.points_per_game || statistics.average_points || 0,
        yardsPerGame: statistics.yards_per_game,
        fieldGoalPercentage: statistics.field_goal_pct,
        threePointPercentage: statistics.three_point_pct,
        goalsPerGame: statistics.goals_per_game
      },
      defense: {
        pointsAllowedPerGame: statistics.opponent_points_per_game || 0,
        yardsAllowedPerGame: statistics.opponent_yards_per_game,
        opponentFieldGoalPercentage: statistics.opponent_field_goal_pct,
        goalsAllowedPerGame: statistics.goals_against_per_game
      },
      trends: {
        atsRecord: statistics.ats_record || 'N/A',
        overUnderRecord: statistics.over_under_record || 'N/A',
        restDays: statistics.rest_days,
        streak: statistics.streak
      },
      keyPlayers: data.players?.slice(0, 5).map((player: any) => ({
        name: player.full_name || player.name,
        position: player.position,
        stats: player.statistics,
        injuryStatus: player.injuries?.[0]?.status
      }))
    };
  }

  private parseOddsData(data: any, gameId: string, sport: SportType): OddsComparison {
    const gameOdds = data.sport_events?.find((event: any) => event.id === gameId) || {};
    const markets = gameOdds.markets || [];
    
    const books: OddsComparison['books'] = [];
    const bestOdds: OddsComparison['bestOdds'] = {
      homeMoneyline: { book: '', odds: -99999 },
      awayMoneyline: { book: '', odds: -99999 },
      homeSpread: { book: '', line: 0, odds: -99999 },
      awaySpread: { book: '', line: 0, odds: -99999 },
      over: { book: '', line: 0, odds: -99999 },
      under: { book: '', line: 0, odds: -99999 }
    };

    markets.forEach((market: any) => {
      market.books?.forEach((book: any) => {
        const bookData = {
          name: book.name,
          lastUpdate: new Date(book.last_updated),
          moneyline: {
            home: book.outcomes?.find((o: any) => o.type === 'home')?.odds || 0,
            away: book.outcomes?.find((o: any) => o.type === 'away')?.odds || 0
          },
          spread: {
            home: book.outcomes?.find((o: any) => o.type === 'spread_home')?.odds || 0,
            away: book.outcomes?.find((o: any) => o.type === 'spread_away')?.odds || 0,
            line: book.outcomes?.find((o: any) => o.type === 'spread_home')?.spread || 0
          },
          total: {
            over: book.outcomes?.find((o: any) => o.type === 'total_over')?.odds || 0,
            under: book.outcomes?.find((o: any) => o.type === 'total_under')?.odds || 0,
            line: book.outcomes?.find((o: any) => o.type === 'total_over')?.total || 0
          }
        };

        books.push(bookData);

        // Track best odds
        if (bookData.moneyline.home > bestOdds.homeMoneyline.odds) {
          bestOdds.homeMoneyline = { book: bookData.name, odds: bookData.moneyline.home };
        }
        if (bookData.moneyline.away > bestOdds.awayMoneyline.odds) {
          bestOdds.awayMoneyline = { book: bookData.name, odds: bookData.moneyline.away };
        }
        if (bookData.spread.home > bestOdds.homeSpread.odds) {
          bestOdds.homeSpread = { book: bookData.name, line: bookData.spread.line, odds: bookData.spread.home };
        }
        if (bookData.spread.away > bestOdds.awaySpread.odds) {
          bestOdds.awaySpread = { book: bookData.name, line: bookData.spread.line, odds: bookData.spread.away };
        }
        if (bookData.total.over > bestOdds.over.odds) {
          bestOdds.over = { book: bookData.name, line: bookData.total.line, odds: bookData.total.over };
        }
        if (bookData.total.under > bestOdds.under.odds) {
          bestOdds.under = { book: bookData.name, line: bookData.total.line, odds: bookData.total.under };
        }
      });
    });

    return {
      gameId,
      sport,
      books,
      bestOdds,
      consensus: gameOdds.consensus
    };
  }

  private parseInjuryReports(data: any, sport: SportType): any[] {
    const injuries: any[] = [];

    if (sport === 'TENNIS') {
      data.withdrawals?.forEach((withdrawal: any) => {
        injuries.push({
          player: withdrawal.competitor?.name,
          reason: withdrawal.reason,
          tournament: withdrawal.tournament?.name,
          date: withdrawal.created_at
        });
      });
    } else {
      data.teams?.forEach((team: any) => {
        team.injuries?.forEach((injury: any) => {
          injuries.push({
            team: team.name,
            player: injury.player?.full_name || injury.player?.name,
            status: injury.status,
            description: injury.description,
            updateDate: injury.update_date
          });
        });
      });
    }

    return injuries;
  }

  private parseStandings(data: any, sport: SportType): any {
    if (sport === 'TENNIS') {
      return {
        rankings: data.rankings?.map((ranking: any) => ({
          rank: ranking.rank,
          player: ranking.competitor?.name,
          country: ranking.competitor?.country,
          points: ranking.points,
          tournamentsPlayed: ranking.tournaments_played
        }))
      };
    }

    return {
      standings: data.standings?.map((standing: any) => ({
        position: standing.rank,
        team: standing.team?.name,
        wins: standing.wins,
        losses: standing.losses,
        draws: standing.draws,
        points: standing.points,
        gamesPlayed: standing.games_played,
        winPercentage: standing.win_percentage
      }))
    };
  }
}

// Export singleton instance
export const comprehensiveSportsAPI = new ComprehensiveSportsAPI();

// Export convenience functions
export const getAllSportsGames = (date?: Date) => comprehensiveSportsAPI.getAllSportsGames(date);
export const getSportGames = (sport: SportType, date?: Date) => comprehensiveSportsAPI.getSportGames(sport, date);
export const getTeamStatistics = (sport: SportType, teamId: string) => comprehensiveSportsAPI.getTeamStatistics(sport, teamId);
export const getOddsComparison = (sport: SportType, gameId: string) => comprehensiveSportsAPI.getOddsComparison(sport, gameId);
export const getInjuryReports = (sport: SportType) => comprehensiveSportsAPI.getInjuryReports(sport);
export const getStandings = (sport: SportType) => comprehensiveSportsAPI.getStandings(sport);