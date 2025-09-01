import { createClient } from '@supabase/supabase-js';
import { fetchSportsData, SPORT_CONFIGS } from '@/lib/sportsRadar';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface HistoricalGame {
  id: string;
  sport: string;
  league_id: string;
  season_id: string;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number;
  away_score: number;
  status: 'completed' | 'cancelled' | 'postponed';
  venue_id?: string;
  attendance?: number;
  weather_conditions?: any;
  game_metadata?: any;
  statistics?: any;
}

export interface TeamHistoricalStats {
  teamId: string;
  teamName: string;
  sport: string;
  season: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws?: number;
  pointsFor: number;
  pointsAgainst: number;
  homeRecord: { wins: number; losses: number; draws?: number };
  awayRecord: { wins: number; losses: number; draws?: number };
  divisionRecord?: { wins: number; losses: number };
  conferenceRecord?: { wins: number; losses: number };
  last10Games: { wins: number; losses: number; form: string };
  streak: { type: 'W' | 'L' | 'D'; count: number };
  avgPointsScored: number;
  avgPointsAllowed: number;
  offensiveRating?: number;
  defensiveRating?: number;
  pace?: number;
  injuries?: any[];
}

export interface HeadToHeadRecord {
  team1Id: string;
  team2Id: string;
  sport: string;
  totalGames: number;
  team1Wins: number;
  team2Wins: number;
  draws?: number;
  lastMeetings: Array<{
    date: string;
    winner: string;
    score: string;
    location: 'home' | 'away' | 'neutral';
  }>;
  avgPointsTeam1: number;
  avgPointsTeam2: number;
  largestTeam1Win: number;
  largestTeam2Win: number;
  currentStreak: { team: string; count: number };
}

export class HistoricalDataService {
  private cacheExpiry = 3600000; // 1 hour cache
  private cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * Fetch and store historical games for a specific sport and season
   */
  async fetchHistoricalGames(
    sport: keyof typeof SPORT_CONFIGS,
    season: string,
    startDate?: string,
    endDate?: string
  ): Promise<HistoricalGame[]> {
    try {
      console.log(`Fetching historical games for ${sport} - ${season}`);
      
      // Fetch from Sports Radar based on sport
      let games: any[] = [];
      
      switch (sport) {
        case 'nba':
        case 'wnba':
        case 'ncaamb':
          games = await this.fetchBasketballHistory(sport, season);
          break;
        case 'nfl':
        case 'ncaafb':
          games = await this.fetchFootballHistory(sport, season);
          break;
        case 'mlb':
          games = await this.fetchBaseballHistory(season, startDate, endDate);
          break;
        case 'nhl':
          games = await this.fetchHockeyHistory(season, startDate, endDate);
          break;
        case 'soccer':
        case 'mls':
          games = await this.fetchSoccerHistory(sport, season);
          break;
        case 'tennis':
          games = await this.fetchTennisHistory(season);
          break;
        case 'golf':
          games = await this.fetchGolfHistory(season);
          break;
        case 'ufc':
        case 'boxing':
          games = await this.fetchCombatSportsHistory(sport, season);
          break;
      }

      // Store in database
      if (games.length > 0) {
        await this.storeHistoricalGames(games, sport);
      }

      return games;
    } catch (error) {
      console.error(`Error fetching historical games for ${sport}:`, error);
      return [];
    }
  }

  /**
   * Store historical games in the database
   */
  private async storeHistoricalGames(games: any[], sport: string): Promise<void> {
    try {
      const formattedGames = games.map(game => ({
        external_id: game.id,
        sport: sport,
        league_id: this.getLeagueId(sport),
        season_id: game.season?.id || `${sport}_${new Date().getFullYear()}`,
        game_date: game.scheduled || game.date,
        home_team_id: game.home?.id || game.home_team,
        away_team_id: game.away?.id || game.away_team,
        home_score: game.home_points || game.home_score || 0,
        away_score: game.away_points || game.away_score || 0,
        status: game.status === 'closed' ? 'completed' : game.status,
        venue_id: game.venue?.id,
        attendance: game.attendance,
        game_metadata: {
          duration: game.duration,
          periods: game.periods,
          overtime: game.overtime,
          shootout: game.shootout
        }
      }));

      const { error } = await supabase
        .from('historical_games')
        .upsert(formattedGames, { onConflict: 'external_id,sport' });

      if (error) {
        console.error('Error storing historical games:', error);
      } else {
        console.log(`Successfully stored ${formattedGames.length} historical games for ${sport}`);
      }
    } catch (error) {
      console.error('Error in storeHistoricalGames:', error);
    }
  }

  /**
   * Get team historical statistics
   */
  async getTeamHistoricalStats(
    teamId: string,
    sport: string,
    season?: string
  ): Promise<TeamHistoricalStats | null> {
    const cacheKey = `team_stats_${teamId}_${sport}_${season || 'all'}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      // Query historical games
      let query = supabase
        .from('historical_games')
        .select('*')
        .eq('sport', sport)
        .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
        .order('game_date', { ascending: false });

      if (season) {
        query = query.eq('season_id', season);
      }

      const { data: games, error } = await query.limit(100);

      if (error) {
        console.error('Error fetching team historical stats:', error);
        return null;
      }

      if (!games || games.length === 0) {
        return null;
      }

      // Calculate statistics
      const stats = this.calculateTeamStats(games, teamId, sport, season || 'current');
      
      // Cache the result
      this.cache.set(cacheKey, { data: stats, timestamp: Date.now() });
      
      return stats;
    } catch (error) {
      console.error('Error in getTeamHistoricalStats:', error);
      return null;
    }
  }

  /**
   * Get head-to-head record between two teams
   */
  async getHeadToHeadRecord(
    team1Id: string,
    team2Id: string,
    sport: string,
    limit: number = 10
  ): Promise<HeadToHeadRecord | null> {
    const cacheKey = `h2h_${team1Id}_${team2Id}_${sport}`;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      // First check if we have this in the head_to_head_records table
      const { data: h2hRecord } = await supabase
        .from('head_to_head_records')
        .select('*')
        .eq('sport', sport)
        .or(`team1_id.eq.${team1Id},team1_id.eq.${team2Id}`)
        .or(`team2_id.eq.${team1Id},team2_id.eq.${team2Id}`)
        .single();

      if (h2hRecord && h2hRecord.updated_at) {
        const lastUpdate = new Date(h2hRecord.updated_at).getTime();
        if (Date.now() - lastUpdate < this.cacheExpiry) {
          return h2hRecord.record_data as HeadToHeadRecord;
        }
      }

      // Fetch actual games between these teams
      const { data: games, error } = await supabase
        .from('historical_games')
        .select('*')
        .eq('sport', sport)
        .or(
          `and(home_team_id.eq.${team1Id},away_team_id.eq.${team2Id}),` +
          `and(home_team_id.eq.${team2Id},away_team_id.eq.${team1Id})`
        )
        .order('game_date', { ascending: false })
        .limit(limit);

      if (error || !games || games.length === 0) {
        return null;
      }

      const record = this.calculateHeadToHeadRecord(games, team1Id, team2Id, sport);
      
      // Store in database
      await this.storeHeadToHeadRecord(team1Id, team2Id, sport, record);
      
      // Cache the result
      this.cache.set(cacheKey, { data: record, timestamp: Date.now() });
      
      return record;
    } catch (error) {
      console.error('Error in getHeadToHeadRecord:', error);
      return null;
    }
  }

  /**
   * Calculate team statistics from games
   */
  private calculateTeamStats(
    games: any[],
    teamId: string,
    sport: string,
    season: string
  ): TeamHistoricalStats {
    let wins = 0, losses = 0, draws = 0;
    let homeWins = 0, homeLosses = 0, homeDraws = 0;
    let awayWins = 0, awayLosses = 0, awayDraws = 0;
    let pointsFor = 0, pointsAgainst = 0;
    const last10 = games.slice(0, 10);
    let currentStreak = { type: 'W' as 'W' | 'L' | 'D', count: 0 };
    let lastResult = '';

    games.forEach((game, index) => {
      const isHome = game.home_team_id === teamId;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      
      pointsFor += teamScore;
      pointsAgainst += oppScore;

      let result: 'W' | 'L' | 'D';
      if (teamScore > oppScore) {
        wins++;
        result = 'W';
        if (isHome) homeWins++;
        else awayWins++;
      } else if (teamScore < oppScore) {
        losses++;
        result = 'L';
        if (isHome) homeLosses++;
        else awayLosses++;
      } else {
        draws++;
        result = 'D';
        if (isHome) homeDraws++;
        else awayDraws++;
      }

      // Track streak
      if (index === 0) {
        currentStreak = { type: result, count: 1 };
        lastResult = result;
      } else if (result === lastResult) {
        currentStreak.count++;
      }
    });

    const gamesPlayed = wins + losses + draws;
    const last10Form = last10.map(game => {
      const isHome = game.home_team_id === teamId;
      const teamScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      return teamScore > oppScore ? 'W' : teamScore < oppScore ? 'L' : 'D';
    }).join('');

    return {
      teamId,
      teamName: teamId, // Would need to fetch actual name
      sport,
      season,
      gamesPlayed,
      wins,
      losses,
      draws: draws > 0 ? draws : undefined,
      pointsFor,
      pointsAgainst,
      homeRecord: { wins: homeWins, losses: homeLosses, draws: homeDraws > 0 ? homeDraws : undefined },
      awayRecord: { wins: awayWins, losses: awayLosses, draws: awayDraws > 0 ? awayDraws : undefined },
      last10Games: {
        wins: last10Form.split('W').length - 1,
        losses: last10Form.split('L').length - 1,
        form: last10Form
      },
      streak: currentStreak,
      avgPointsScored: gamesPlayed > 0 ? pointsFor / gamesPlayed : 0,
      avgPointsAllowed: gamesPlayed > 0 ? pointsAgainst / gamesPlayed : 0,
      offensiveRating: this.calculateOffensiveRating(pointsFor, gamesPlayed, sport),
      defensiveRating: this.calculateDefensiveRating(pointsAgainst, gamesPlayed, sport)
    };
  }

  /**
   * Calculate head-to-head record
   */
  private calculateHeadToHeadRecord(
    games: any[],
    team1Id: string,
    team2Id: string,
    sport: string
  ): HeadToHeadRecord {
    let team1Wins = 0, team2Wins = 0, draws = 0;
    let team1Points = 0, team2Points = 0;
    let largestTeam1Win = 0, largestTeam2Win = 0;
    const lastMeetings: any[] = [];
    let currentStreakTeam = '';
    let currentStreakCount = 0;

    games.forEach((game, index) => {
      const team1IsHome = game.home_team_id === team1Id;
      const team1Score = team1IsHome ? game.home_score : game.away_score;
      const team2Score = team1IsHome ? game.away_score : game.home_score;
      
      team1Points += team1Score;
      team2Points += team2Score;

      let winner = '';
      if (team1Score > team2Score) {
        team1Wins++;
        winner = team1Id;
        const margin = team1Score - team2Score;
        if (margin > largestTeam1Win) largestTeam1Win = margin;
      } else if (team2Score > team1Score) {
        team2Wins++;
        winner = team2Id;
        const margin = team2Score - team1Score;
        if (margin > largestTeam2Win) largestTeam2Win = margin;
      } else {
        draws++;
        winner = 'draw';
      }

      // Track current streak
      if (index === 0) {
        currentStreakTeam = winner;
        currentStreakCount = 1;
      } else if (winner === currentStreakTeam) {
        currentStreakCount++;
      }

      // Add to last meetings
      if (index < 10) {
        lastMeetings.push({
          date: game.game_date,
          winner,
          score: `${team1Score}-${team2Score}`,
          location: team1IsHome ? 'home' : 'away'
        });
      }
    });

    const totalGames = team1Wins + team2Wins + draws;

    return {
      team1Id,
      team2Id,
      sport,
      totalGames,
      team1Wins,
      team2Wins,
      draws: draws > 0 ? draws : undefined,
      lastMeetings,
      avgPointsTeam1: totalGames > 0 ? team1Points / totalGames : 0,
      avgPointsTeam2: totalGames > 0 ? team2Points / totalGames : 0,
      largestTeam1Win,
      largestTeam2Win,
      currentStreak: {
        team: currentStreakTeam,
        count: currentStreakCount
      }
    };
  }

  /**
   * Store head-to-head record in database
   */
  private async storeHeadToHeadRecord(
    team1Id: string,
    team2Id: string,
    sport: string,
    record: HeadToHeadRecord
  ): Promise<void> {
    try {
      await supabase.from('head_to_head_records').upsert({
        team1_id: team1Id,
        team2_id: team2Id,
        sport,
        total_games: record.totalGames,
        team1_wins: record.team1Wins,
        team2_wins: record.team2Wins,
        draws: record.draws,
        record_data: record,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error storing head-to-head record:', error);
    }
  }

  /**
   * Fetch player historical statistics
   */
  async getPlayerHistoricalStats(
    playerId: string,
    sport: string,
    season?: string
  ): Promise<any> {
    try {
      let query = supabase
        .from('player_game_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('sport', sport)
        .order('game_date', { ascending: false });

      if (season) {
        query = query.eq('season_id', season);
      }

      const { data, error } = await query.limit(50);

      if (error || !data) {
        return null;
      }

      // Calculate averages and trends
      return this.calculatePlayerStats(data, sport);
    } catch (error) {
      console.error('Error fetching player historical stats:', error);
      return null;
    }
  }

  /**
   * Get model prediction accuracy history
   */
  async getModelAccuracyHistory(
    modelName: string,
    sport: string,
    dateRange?: { start: string; end: string }
  ): Promise<any> {
    try {
      let query = supabase
        .from('model_predictions')
        .select('*')
        .eq('model_name', modelName)
        .eq('sport', sport)
        .not('actual_result', 'is', null);

      if (dateRange) {
        query = query
          .gte('prediction_date', dateRange.start)
          .lte('prediction_date', dateRange.end);
      }

      const { data, error } = await query;

      if (error || !data) {
        return null;
      }

      // Calculate accuracy metrics
      const totalPredictions = data.length;
      const correctPredictions = data.filter(p => 
        p.predicted_outcome === p.actual_result
      ).length;
      
      const accuracy = totalPredictions > 0 
        ? (correctPredictions / totalPredictions) * 100 
        : 0;

      // Calculate ROI if betting $100 on each prediction
      let totalProfit = 0;
      data.forEach(prediction => {
        if (prediction.predicted_outcome === prediction.actual_result) {
          const odds = prediction.predicted_odds || 100;
          const profit = odds > 0 ? (100 * odds / 100) : (100 * 100 / Math.abs(odds));
          totalProfit += profit;
        } else {
          totalProfit -= 100;
        }
      });

      const roi = totalPredictions > 0 
        ? (totalProfit / (totalPredictions * 100)) * 100 
        : 0;

      return {
        modelName,
        sport,
        totalPredictions,
        correctPredictions,
        accuracy,
        roi,
        profitLoss: totalProfit,
        predictions: data
      };
    } catch (error) {
      console.error('Error fetching model accuracy history:', error);
      return null;
    }
  }

  // Sport-specific fetching methods
  private async fetchBasketballHistory(sport: string, season: string): Promise<any[]> {
    try {
      const endpoint = SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS].endpoints.games;
      const data = await fetchSportsData(sport as any, endpoint, { season });
      return data?.games || [];
    } catch (error) {
      console.error(`Error fetching ${sport} history:`, error);
      return [];
    }
  }

  private async fetchFootballHistory(sport: string, season: string): Promise<any[]> {
    try {
      const endpoint = SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS].endpoints.games;
      const data = await fetchSportsData(sport as any, endpoint, { season });
      return data?.games || [];
    } catch (error) {
      console.error(`Error fetching ${sport} history:`, error);
      return [];
    }
  }

  private async fetchBaseballHistory(season: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      // MLB requires date-based queries
      const games: any[] = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        
        while (current <= end) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          
          const data = await fetchSportsData('mlb', '/games/{year}/{month}/{day}/schedule.json', {
            year: year.toString(),
            month,
            day
          });
          
          if (data?.games) {
            games.push(...data.games);
          }
          
          current.setDate(current.getDate() + 1);
        }
      }
      return games;
    } catch (error) {
      console.error('Error fetching MLB history:', error);
      return [];
    }
  }

  private async fetchHockeyHistory(season: string, startDate?: string, endDate?: string): Promise<any[]> {
    try {
      // Similar to MLB, NHL uses date-based queries
      const games: any[] = [];
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const current = new Date(start);
        
        while (current <= end) {
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          
          const data = await fetchSportsData('nhl', '/games/{year}/{month}/{day}/schedule.json', {
            year: year.toString(),
            month,
            day
          });
          
          if (data?.games) {
            games.push(...data.games);
          }
          
          current.setDate(current.getDate() + 1);
        }
      }
      return games;
    } catch (error) {
      console.error('Error fetching NHL history:', error);
      return [];
    }
  }

  private async fetchSoccerHistory(sport: string, season: string): Promise<any[]> {
    try {
      const endpoint = '/competitions/{competition_id}/seasons/{season_id}/schedules.json';
      const competitionId = sport === 'mls' ? 'sr:competition:242' : 'sr:competition:17';
      const data = await fetchSportsData(sport as any, endpoint, {
        competition_id: competitionId,
        season_id: season
      });
      return data?.schedules || [];
    } catch (error) {
      console.error(`Error fetching ${sport} history:`, error);
      return [];
    }
  }

  private async fetchTennisHistory(season: string): Promise<any[]> {
    // Tennis tournaments throughout the year
    return [];
  }

  private async fetchGolfHistory(season: string): Promise<any[]> {
    // Golf tournaments throughout the year
    return [];
  }

  private async fetchCombatSportsHistory(sport: string, season: string): Promise<any[]> {
    // UFC/Boxing events
    return [];
  }

  // Helper methods
  private getLeagueId(sport: string): string {
    const leagueMap: Record<string, string> = {
      nba: 'nba',
      nfl: 'nfl',
      mlb: 'mlb',
      nhl: 'nhl',
      soccer: 'premier_league',
      mls: 'mls',
      ncaafb: 'ncaa_football',
      ncaamb: 'ncaa_basketball',
      wnba: 'wnba',
      tennis: 'atp',
      golf: 'pga',
      ufc: 'ufc',
      boxing: 'boxing'
    };
    return leagueMap[sport] || sport;
  }

  private calculateOffensiveRating(points: number, games: number, sport: string): number {
    if (games === 0) return 0;
    const avgPoints = points / games;
    
    // Sport-specific baseline for offensive rating
    const baselines: Record<string, number> = {
      nba: 110,
      nfl: 24,
      mlb: 4.5,
      nhl: 3,
      soccer: 1.5
    };
    
    const baseline = baselines[sport] || 100;
    return (avgPoints / baseline) * 100;
  }

  private calculateDefensiveRating(pointsAgainst: number, games: number, sport: string): number {
    if (games === 0) return 0;
    const avgPointsAgainst = pointsAgainst / games;
    
    // Sport-specific baseline for defensive rating (lower is better)
    const baselines: Record<string, number> = {
      nba: 110,
      nfl: 24,
      mlb: 4.5,
      nhl: 3,
      soccer: 1.5
    };
    
    const baseline = baselines[sport] || 100;
    return (baseline / avgPointsAgainst) * 100;
  }

  private calculatePlayerStats(gameStats: any[], sport: string): any {
    if (gameStats.length === 0) return null;
    
    const recentGames = gameStats.slice(0, 10);
    const seasonGames = gameStats;
    
    // Calculate averages based on sport
    const calculateAverage = (games: any[], stat: string) => {
      const sum = games.reduce((acc, game) => acc + (game.stats?.[stat] || 0), 0);
      return games.length > 0 ? sum / games.length : 0;
    };
    
    return {
      gamesPlayed: seasonGames.length,
      recentForm: {
        games: recentGames.length,
        points: calculateAverage(recentGames, 'points'),
        rebounds: calculateAverage(recentGames, 'rebounds'),
        assists: calculateAverage(recentGames, 'assists'),
        trend: this.calculateTrend(recentGames)
      },
      seasonAverages: {
        points: calculateAverage(seasonGames, 'points'),
        rebounds: calculateAverage(seasonGames, 'rebounds'),
        assists: calculateAverage(seasonGames, 'assists')
      },
      careerHighs: {
        points: Math.max(...seasonGames.map(g => g.stats?.points || 0)),
        rebounds: Math.max(...seasonGames.map(g => g.stats?.rebounds || 0)),
        assists: Math.max(...seasonGames.map(g => g.stats?.assists || 0))
      }
    };
  }

  private calculateTrend(games: any[]): 'improving' | 'declining' | 'stable' {
    if (games.length < 3) return 'stable';
    
    const recent = games.slice(0, 3);
    const previous = games.slice(3, 6);
    
    const recentAvg = recent.reduce((acc, g) => acc + (g.stats?.points || 0), 0) / recent.length;
    const previousAvg = previous.reduce((acc, g) => acc + (g.stats?.points || 0), 0) / previous.length;
    
    const difference = ((recentAvg - previousAvg) / previousAvg) * 100;
    
    if (difference > 10) return 'improving';
    if (difference < -10) return 'declining';
    return 'stable';
  }
}

export const historicalDataService = new HistoricalDataService();