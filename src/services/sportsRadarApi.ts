/**
 * Sports Radar API Service - REAL LIVE DATA INTEGRATION
 * No more mocks, no more demos - this is the REAL deal
 */

const SPORTS_RADAR_API_KEY = '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd';
const BASE_URL = 'https://api.sportradar.us';

export interface LiveGame {
  id: string;
  status: string;
  scheduled: string;
  home_team: {
    id: string;
    name: string;
    market?: string;
    alias?: string;
  };
  away_team: {
    id: string;
    name: string;
    market?: string;
    alias?: string;
  };
  home_points?: number;
  away_points?: number;
  period?: number;
  clock?: string;
  venue?: {
    name: string;
    city: string;
    state: string;
  };
}

export interface OddsData {
  id: string;
  sport: string;
  markets: Array<{
    id: string;
    name: string;
    books: Array<{
      id: string;
      name: string;
      outcomes: Array<{
        type: string;
        odds: {
          american: string;
          decimal: number;
          fractional: string;
        };
        spread?: number;
        total?: number;
      }>;
    }>;
  }>;
}

export interface TeamStats {
  wins: number;
  losses: number;
  win_percentage: number;
  points_per_game: number;
  points_against_per_game: number;
  last_5_record: string;
  home_record?: string;
  away_record?: string;
  ats_record?: string;
  over_under_record?: string;
}

class SportsRadarAPI {
  private apiKey: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache for rate limiting

  constructor() {
    this.apiKey = SPORTS_RADAR_API_KEY;
  }

  private getCacheKey(endpoint: string): string {
    return endpoint;
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTimeout;
  }

  private async fetchWithCache(endpoint: string): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint);
    const cached = this.cache.get(cacheKey);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log(`Using cached data for ${endpoint}`);
      return cached.data;
    }

    const url = `${endpoint}?api_key=${this.apiKey}`;
    console.log(`Fetching LIVE data from: ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Sports Radar API Error:', error);
      throw error;
    }
  }

  // NBA Live Games
  async getNBAGamesToday(): Promise<LiveGame[]> {
    const endpoint = `${BASE_URL}/nba/trial/v8/en/games/2024/REG/schedule.json`;
    const data = await this.fetchWithCache(endpoint);
    
    const today = new Date().toISOString().split('T')[0];
    const todaysGames = data.games?.filter((game: any) => 
      game.scheduled.startsWith(today)
    ) || [];
    
    return todaysGames;
  }

  // NFL Live Games  
  async getNFLGamesThisWeek(): Promise<LiveGame[]> {
    const currentWeek = this.getCurrentNFLWeek();
    const endpoint = `${BASE_URL}/nfl/official/trial/v7/en/games/2024/REG/${currentWeek}/schedule.json`;
    const data = await this.fetchWithCache(endpoint);
    return data.week?.games || [];
  }

  // MLB Live Games
  async getMLBGamesToday(): Promise<LiveGame[]> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const endpoint = `${BASE_URL}/mlb/trial/v7/en/games/${dateStr}/schedule.json`;
    const data = await this.fetchWithCache(endpoint);
    return data.games || [];
  }

  // NHL Live Games
  async getNHLGamesToday(): Promise<LiveGame[]> {
    const today = new Date();
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;
    const endpoint = `${BASE_URL}/nhl/trial/v7/en/games/${dateStr}/schedule.json`;
    const data = await this.fetchWithCache(endpoint);
    return data.games || [];
  }

  // Get Live Odds for a specific game
  async getGameOdds(sport: string, gameId: string): Promise<OddsData> {
    const sportMap: Record<string, string> = {
      'nba': 'basketball_nba',
      'nfl': 'americanfootball_nfl',
      'mlb': 'baseball_mlb',
      'nhl': 'icehockey_nhl'
    };
    
    const oddsApiSport = sportMap[sport.toLowerCase()] || sport;
    const endpoint = `${BASE_URL}/oddscomparison-us/trial/v2/en/sports/${oddsApiSport}/odds.json`;
    
    const data = await this.fetchWithCache(endpoint);
    const gameOdds = data.sport_events?.find((event: any) => 
      event.sport_event.id === gameId
    );
    
    return gameOdds || null;
  }

  // Get Team Statistics
  async getTeamStats(sport: string, teamId: string, season: string = '2024'): Promise<TeamStats> {
    let endpoint = '';
    
    switch(sport.toLowerCase()) {
      case 'nba':
        endpoint = `${BASE_URL}/nba/trial/v8/en/seasons/${season}/REG/teams/${teamId}/statistics.json`;
        break;
      case 'nfl':
        endpoint = `${BASE_URL}/nfl/official/trial/v7/en/seasons/${season}/REG/teams/${teamId}/statistics.json`;
        break;
      case 'mlb':
        endpoint = `${BASE_URL}/mlb/trial/v7/en/seasons/${season}/REG/teams/${teamId}/statistics.json`;
        break;
      case 'nhl':
        endpoint = `${BASE_URL}/nhl/trial/v7/en/seasons/${season}/REG/teams/${teamId}/statistics.json`;
        break;
      default:
        throw new Error(`Unsupported sport: ${sport}`);
    }
    
    const data = await this.fetchWithCache(endpoint);
    return this.formatTeamStats(data, sport);
  }

  // Get Player Injuries
  async getInjuryReport(sport: string): Promise<any[]> {
    let endpoint = '';
    
    switch(sport.toLowerCase()) {
      case 'nba':
        endpoint = `${BASE_URL}/nba/trial/v8/en/league/injuries.json`;
        break;
      case 'nfl':
        endpoint = `${BASE_URL}/nfl/official/trial/v7/en/league/injuries.json`;
        break;
      case 'mlb':
        endpoint = `${BASE_URL}/mlb/trial/v7/en/league/injuries.json`;
        break;
      case 'nhl':
        endpoint = `${BASE_URL}/nhl/trial/v7/en/league/injuries.json`;
        break;
      default:
        return [];
    }
    
    const data = await this.fetchWithCache(endpoint);
    return data.teams?.flatMap((team: any) => 
      team.players?.map((player: any) => ({
        team: team.name,
        player: player.full_name,
        status: player.injuries?.[0]?.status || 'Unknown',
        description: player.injuries?.[0]?.desc || 'No details',
        impact: this.calculateInjuryImpact(player)
      })) || []
    ) || [];
  }

  // Get Historical Head-to-Head
  async getHeadToHead(sport: string, team1Id: string, team2Id: string): Promise<any> {
    // This would need a specific endpoint based on sport
    // For now, returning recent matchups
    const season = '2024';
    let endpoint = '';
    
    switch(sport.toLowerCase()) {
      case 'nba':
        endpoint = `${BASE_URL}/nba/trial/v8/en/seasons/${season}/REG/teams/${team1Id}/schedule.json`;
        break;
      case 'nfl':
        endpoint = `${BASE_URL}/nfl/official/trial/v7/en/seasons/${season}/REG/teams/${team1Id}/schedule.json`;
        break;
      default:
        return { matchups: [] };
    }
    
    const data = await this.fetchWithCache(endpoint);
    const matchups = data.games?.filter((game: any) => 
      game.home?.id === team2Id || game.away?.id === team2Id
    ) || [];
    
    return {
      total_games: matchups.length,
      matchups: matchups.slice(0, 5),
      team1_wins: matchups.filter((g: any) => this.getWinner(g) === team1Id).length,
      team2_wins: matchups.filter((g: any) => this.getWinner(g) === team2Id).length
    };
  }

  // Get All Games Across Sports
  async getAllLiveGames(): Promise<{ sport: string; games: LiveGame[] }[]> {
    const [nba, nfl, mlb, nhl] = await Promise.allSettled([
      this.getNBAGamesToday(),
      this.getNFLGamesThisWeek(),
      this.getMLBGamesToday(),
      this.getNHLGamesToday()
    ]);

    const results = [];
    
    if (nba.status === 'fulfilled' && nba.value.length > 0) {
      results.push({ sport: 'NBA', games: nba.value });
    }
    if (nfl.status === 'fulfilled' && nfl.value.length > 0) {
      results.push({ sport: 'NFL', games: nfl.value });
    }
    if (mlb.status === 'fulfilled' && mlb.value.length > 0) {
      results.push({ sport: 'MLB', games: mlb.value });
    }
    if (nhl.status === 'fulfilled' && nhl.value.length > 0) {
      results.push({ sport: 'NHL', games: nhl.value });
    }

    return results;
  }

  // Helper Methods
  private getCurrentNFLWeek(): number {
    const seasonStart = new Date('2024-09-05');
    const now = new Date();
    const weeksPassed = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.min(Math.max(1, weeksPassed + 1), 18);
  }

  private formatTeamStats(data: any, sport: string): TeamStats {
    // Format stats based on sport-specific structure
    const record = data.record || data.own_record || {};
    return {
      wins: record.wins || 0,
      losses: record.losses || 0,
      win_percentage: record.win_pct || (record.wins / (record.wins + record.losses)) || 0,
      points_per_game: data.average?.points || 0,
      points_against_per_game: data.average?.points_against || 0,
      last_5_record: this.calculateLast5(data.games || []),
      home_record: `${record.home_wins || 0}-${record.home_losses || 0}`,
      away_record: `${record.away_wins || 0}-${record.away_losses || 0}`,
      ats_record: data.ats_record || 'N/A',
      over_under_record: data.ou_record || 'N/A'
    };
  }

  private calculateLast5(games: any[]): string {
    const last5 = games.slice(-5);
    const wins = last5.filter((g: any) => g.win).length;
    const losses = 5 - wins;
    return `${wins}-${losses}`;
  }

  private calculateInjuryImpact(player: any): number {
    // Calculate impact based on player importance
    const status = player.injuries?.[0]?.status?.toLowerCase() || '';
    if (status.includes('out')) return 1.0;
    if (status.includes('doubtful')) return 0.75;
    if (status.includes('questionable')) return 0.5;
    if (status.includes('probable')) return 0.25;
    return 0;
  }

  private getWinner(game: any): string {
    if (!game.home_points || !game.away_points) return '';
    return game.home_points > game.away_points ? game.home.id : game.away.id;
  }
}

// Export singleton instance
export const sportsRadarAPI = new SportsRadarAPI();

// Export convenience functions
export const getLiveNBAGames = () => sportsRadarAPI.getNBAGamesToday();
export const getLiveNFLGames = () => sportsRadarAPI.getNFLGamesThisWeek();
export const getLiveMLBGames = () => sportsRadarAPI.getMLBGamesToday();
export const getLiveNHLGames = () => sportsRadarAPI.getNHLGamesToday();
export const getAllSportsGames = () => sportsRadarAPI.getAllLiveGames();
export const getGameOdds = (sport: string, gameId: string) => sportsRadarAPI.getGameOdds(sport, gameId);
export const getTeamStatistics = (sport: string, teamId: string) => sportsRadarAPI.getTeamStats(sport, teamId);
export const getInjuries = (sport: string) => sportsRadarAPI.getInjuryReport(sport);
export const getH2H = (sport: string, team1: string, team2: string) => sportsRadarAPI.getHeadToHead(sport, team1, team2);