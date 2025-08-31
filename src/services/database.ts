/**
 * Supabase Database Service
 * Real database for real data storage using Supabase!
 */

import { supabaseAdmin } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';

type GameRow = Database['public']['Tables']['games']['Row'];
type GameInsert = Database['public']['Tables']['games']['Insert'];
type PredictionRow = Database['public']['Tables']['predictions']['Row'];
type PredictionInsert = Database['public']['Tables']['predictions']['Insert'];
type OddsInsert = Database['public']['Tables']['odds']['Insert'];
type ParlayInsert = Database['public']['Tables']['parlays']['Insert'];
type TeamStatsInsert = Database['public']['Tables']['team_stats']['Insert'];
type AnalysisResultInsert = Database['public']['Tables']['analysis_results']['Insert'];
type UserBetInsert = Database['public']['Tables']['user_bets']['Insert'];
type PerformanceMetricInsert = Database['public']['Tables']['performance_metrics']['Insert'];

class DatabaseService {
  private initialized: boolean = false;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // Test connection
      const { data, error } = await supabaseAdmin.from('games').select('count').limit(1);
      if (error) {
        console.log('Database tables may need to be created:', error.message);
      }
      this.initialized = true;
      console.log('Supabase database service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database service:', error);
    }
  }

  // Save game data
  async saveGame(gameData: any): Promise<void> {
    const gameRecord: GameInsert = {
      game_id: gameData.game_id,
      sport: gameData.sport,
      home_team: gameData.home_team,
      away_team: gameData.away_team,
      scheduled: gameData.scheduled,
      home_score: gameData.home_score || null,
      away_score: gameData.away_score || null,
      status: gameData.status || null,
    };

    const { error } = await supabaseAdmin
      .from('games')
      .upsert(gameRecord, {
        onConflict: 'game_id',
      });

    if (error) {
      throw new Error(`Failed to save game: ${error.message}`);
    }
  }

  // Save prediction
  async savePrediction(prediction: any): Promise<void> {
    const predictionRecord: PredictionInsert = {
      game_id: prediction.game_id,
      prediction_type: prediction.prediction_type,
      predicted_outcome: prediction.predicted_outcome || null,
      confidence: prediction.confidence || null,
      probability: prediction.probability || null,
      expected_value: prediction.expected_value || null,
    };

    const { error } = await supabaseAdmin
      .from('predictions')
      .insert(predictionRecord);

    if (error) {
      throw new Error(`Failed to save prediction: ${error.message}`);
    }
  }

  // Save odds data
  async saveOdds(oddsData: any): Promise<void> {
    const oddsRecord: OddsInsert = {
      game_id: oddsData.game_id,
      book_name: oddsData.book_name || null,
      market_type: oddsData.market_type || null,
      home_odds: oddsData.home_odds || null,
      away_odds: oddsData.away_odds || null,
      spread: oddsData.spread || null,
      total: oddsData.total || null,
      over_odds: oddsData.over_odds || null,
      under_odds: oddsData.under_odds || null,
    };

    const { error } = await supabaseAdmin
      .from('odds')
      .insert(oddsRecord);

    if (error) {
      throw new Error(`Failed to save odds: ${error.message}`);
    }
  }

  // Save parlay
  async saveParlay(parlay: any): Promise<void> {
    const parlayRecord: ParlayInsert = {
      parlay_id: parlay.parlay_id,
      legs: parlay.legs,
      combined_odds: parlay.combined_odds || null,
      total_probability: parlay.total_probability || null,
      expected_value: parlay.expected_value || null,
      risk_level: parlay.risk_level || null,
      correlation_score: parlay.correlation_score || null,
      recommended: parlay.recommended || false,
    };

    const { error } = await supabaseAdmin
      .from('parlays')
      .upsert(parlayRecord, {
        onConflict: 'parlay_id',
      });

    if (error) {
      throw new Error(`Failed to save parlay: ${error.message}`);
    }
  }

  // Save team statistics
  async saveTeamStats(stats: any): Promise<void> {
    const teamStatsRecord: TeamStatsInsert = {
      team_id: stats.team_id,
      sport: stats.sport,
      season: stats.season || '2024',
      wins: stats.wins || null,
      losses: stats.losses || null,
      win_percentage: stats.win_percentage || null,
      points_per_game: stats.points_per_game || null,
      points_against_per_game: stats.points_against_per_game || null,
      home_record: stats.home_record || null,
      away_record: stats.away_record || null,
      ats_record: stats.ats_record || null,
      over_under_record: stats.over_under_record || null,
    };

    const { error } = await supabaseAdmin
      .from('team_stats')
      .upsert(teamStatsRecord, {
        onConflict: 'team_id,sport,season',
      });

    if (error) {
      throw new Error(`Failed to save team stats: ${error.message}`);
    }
  }

  // Get recent predictions
  async getRecentPredictions(limit: number = 10): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select(`
        *,
        games (
          home_team,
          away_team,
          sport,
          scheduled
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent predictions: ${error.message}`);
    }

    return data || [];
  }

  // Get performance metrics
  async getPerformanceMetrics(sport?: string, days: number = 30): Promise<any[]> {
    let query = supabaseAdmin
      .from('performance_metrics')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (sport) {
      query = query.eq('sport', sport);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get performance metrics: ${error.message}`);
    }

    return data || [];
  }

  // Update prediction outcome
  async updatePredictionOutcome(gameId: string, actualOutcome: string): Promise<void> {
    // First get all predictions for this game
    const { data: predictions, error: fetchError } = await supabaseAdmin
      .from('predictions')
      .select('id, predicted_outcome')
      .eq('game_id', gameId);

    if (fetchError) {
      throw new Error(`Failed to fetch predictions: ${fetchError.message}`);
    }

    // Update each prediction with the actual outcome and correctness
    for (const prediction of predictions || []) {
      const { error } = await supabaseAdmin
        .from('predictions')
        .update({
          actual_outcome: actualOutcome,
          is_correct: prediction.predicted_outcome === actualOutcome,
          updated_at: new Date().toISOString(),
        })
        .eq('id', prediction.id);

      if (error) {
        throw new Error(`Failed to update prediction ${prediction.id}: ${error.message}`);
      }
    }
  }

  // Get upcoming games with predictions
  async getUpcomingGamesWithPredictions(): Promise<any[]> {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select(`
        *,
        predictions (
          prediction_type,
          predicted_outcome,
          confidence,
          probability,
          expected_value
        )
      `)
      .gt('scheduled', new Date().toISOString())
      .order('scheduled', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Failed to get upcoming games with predictions: ${error.message}`);
    }

    return data || [];
  }

  // Calculate and save daily performance
  async calculateDailyPerformance(date: Date, sport?: string): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];

    // First, get the prediction stats for the day
    let query = supabaseAdmin
      .from('predictions')
      .select('is_correct, expected_value, games!inner(sport)')
      .gte('created_at', `${dateStr}T00:00:00`)
      .lt('created_at', `${dateStr}T23:59:59`);

    if (sport) {
      query = query.eq('games.sport', sport);
    }

    const { data: predictions, error: predError } = await query;

    if (predError) {
      throw new Error(`Failed to get prediction stats: ${predError.message}`);
    }

    if (predictions && predictions.length > 0) {
      const total = predictions.length;
      const correct = predictions.filter(p => p.is_correct === true).length;
      const accuracy = total > 0 ? correct / total : 0;
      const avgValue = predictions.reduce((sum, p) => sum + (p.expected_value || 0), 0) / total;
      const roi = (accuracy * 100 - 50); // Simple ROI calculation

      const performanceRecord: PerformanceMetricInsert = {
        date: dateStr,
        sport: sport || 'ALL',
        total_predictions: total,
        correct_predictions: correct,
        accuracy,
        total_value: avgValue,
        roi,
      };

      const { error } = await supabaseAdmin
        .from('performance_metrics')
        .upsert(performanceRecord, {
          onConflict: 'date,sport',
        });

      if (error) {
        throw new Error(`Failed to save performance metrics: ${error.message}`);
      }
    }
  }

  // Save analysis results
  async saveAnalysisResults(analysis: any): Promise<void> {
    const analysisRecord: AnalysisResultInsert = {
      game_id: analysis.game_id,
      analysis_type: analysis.analysis_type || null,
      moneyline_pick: analysis.moneyline_pick || null,
      moneyline_confidence: analysis.moneyline_confidence || null,
      spread_pick: analysis.spread_pick || null,
      spread_confidence: analysis.spread_confidence || null,
      total_pick: analysis.total_pick || null,
      total_confidence: analysis.total_confidence || null,
      best_bet: analysis.best_bet || null,
      risk_assessment: analysis.risk_assessment || null,
      value_opportunities: analysis.value_opportunities || null,
    };

    const { error } = await supabaseAdmin
      .from('analysis_results')
      .insert(analysisRecord);

    if (error) {
      throw new Error(`Failed to save analysis results: ${error.message}`);
    }
  }

  // Save user bet
  async saveUserBet(bet: any): Promise<void> {
    const userBetRecord: UserBetInsert = {
      user_id: bet.user_id || null,
      bet_type: bet.bet_type || null,
      game_id: bet.game_id || null,
      selection: bet.selection || null,
      odds: bet.odds || null,
      stake: bet.stake || null,
      potential_payout: bet.potential_payout || null,
      actual_payout: bet.actual_payout || null,
      status: bet.status || 'pending',
    };

    const { error } = await supabaseAdmin
      .from('user_bets')
      .insert(userBetRecord);

    if (error) {
      throw new Error(`Failed to save user bet: ${error.message}`);
    }
  }

  // Get games by date range
  async getGamesByDateRange(startDate: string, endDate: string): Promise<GameRow[]> {
    const { data, error } = await supabaseAdmin
      .from('games')
      .select('*')
      .gte('scheduled', startDate)
      .lte('scheduled', endDate)
      .order('scheduled', { ascending: true });

    if (error) {
      throw new Error(`Failed to get games by date range: ${error.message}`);
    }

    return data || [];
  }

  // Get predictions by game
  async getPredictionsByGame(gameId: string): Promise<PredictionRow[]> {
    const { data, error } = await supabaseAdmin
      .from('predictions')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get predictions for game: ${error.message}`);
    }

    return data || [];
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const { data, error } = await supabaseAdmin
        .from('games')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Export types for backward compatibility
export interface GameRecord {
  game_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  scheduled: Date;
  home_score?: number;
  away_score?: number;
  status: string;
}

export interface PredictionRecord {
  game_id: string;
  prediction_type: string;
  predicted_outcome: string;
  confidence: number;
  probability: number;
  expected_value: number;
  actual_outcome?: string;
  is_correct?: boolean;
}

export interface ParlayRecord {
  parlay_id: string;
  legs: any[];
  combined_odds: number;
  total_probability: number;
  expected_value: number;
  risk_level: string;
  correlation_score: number;
  recommended: boolean;
}