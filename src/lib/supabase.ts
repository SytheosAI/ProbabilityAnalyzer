/**
 * Supabase Client Configuration
 * Configured for both client-side and server-side usage
 */

import { createClient } from '@supabase/supabase-js';

// Use dummy values if environment variables are not set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

// Check if we have valid Supabase credentials
const hasValidSupabaseConfig = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-anon-key' &&
  supabaseServiceRoleKey !== 'placeholder-service-key';

// Client-side Supabase client (uses anon key)
export const supabase = hasValidSupabaseConfig 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any; // Fallback when no valid config

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = hasValidSupabaseConfig
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null as any; // Fallback when no valid config

// Export a flag to check if Supabase is configured
export const isSupabaseConfigured = hasValidSupabaseConfig;

console.log('Supabase configuration status:', {
  configured: hasValidSupabaseConfig,
  url: supabaseUrl.substring(0, 30) + '...',
  hasAnonKey: supabaseAnonKey !== 'placeholder-anon-key',
  hasServiceKey: supabaseServiceRoleKey !== 'placeholder-service-key'
});

// Database table types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: number;
          game_id: string;
          sport: string;
          home_team: string;
          away_team: string;
          scheduled: string;
          home_score: number | null;
          away_score: number | null;
          status: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          sport: string;
          home_team: string;
          away_team: string;
          scheduled: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          sport?: string;
          home_team?: string;
          away_team?: string;
          scheduled?: string;
          home_score?: number | null;
          away_score?: number | null;
          status?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      predictions: {
        Row: {
          id: number;
          game_id: string;
          prediction_type: string;
          predicted_outcome: string | null;
          confidence: number | null;
          probability: number | null;
          expected_value: number | null;
          actual_outcome: string | null;
          is_correct: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          prediction_type: string;
          predicted_outcome?: string | null;
          confidence?: number | null;
          probability?: number | null;
          expected_value?: number | null;
          actual_outcome?: string | null;
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          prediction_type?: string;
          predicted_outcome?: string | null;
          confidence?: number | null;
          probability?: number | null;
          expected_value?: number | null;
          actual_outcome?: string | null;
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      odds: {
        Row: {
          id: number;
          game_id: string;
          book_name: string | null;
          market_type: string | null;
          home_odds: number | null;
          away_odds: number | null;
          spread: number | null;
          total: number | null;
          over_odds: number | null;
          under_odds: number | null;
          timestamp: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          book_name?: string | null;
          market_type?: string | null;
          home_odds?: number | null;
          away_odds?: number | null;
          spread?: number | null;
          total?: number | null;
          over_odds?: number | null;
          under_odds?: number | null;
          timestamp?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          book_name?: string | null;
          market_type?: string | null;
          home_odds?: number | null;
          away_odds?: number | null;
          spread?: number | null;
          total?: number | null;
          over_odds?: number | null;
          under_odds?: number | null;
          timestamp?: string;
        };
      };
      parlays: {
        Row: {
          id: number;
          parlay_id: string;
          legs: any;
          combined_odds: number | null;
          total_probability: number | null;
          expected_value: number | null;
          risk_level: string | null;
          correlation_score: number | null;
          recommended: boolean;
          actual_outcome: string | null;
          payout: number | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          parlay_id: string;
          legs: any;
          combined_odds?: number | null;
          total_probability?: number | null;
          expected_value?: number | null;
          risk_level?: string | null;
          correlation_score?: number | null;
          recommended?: boolean;
          actual_outcome?: string | null;
          payout?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          parlay_id?: string;
          legs?: any;
          combined_odds?: number | null;
          total_probability?: number | null;
          expected_value?: number | null;
          risk_level?: string | null;
          correlation_score?: number | null;
          recommended?: boolean;
          actual_outcome?: string | null;
          payout?: number | null;
          created_at?: string;
        };
      };
      team_stats: {
        Row: {
          id: number;
          team_id: string;
          sport: string;
          season: string;
          wins: number | null;
          losses: number | null;
          win_percentage: number | null;
          points_per_game: number | null;
          points_against_per_game: number | null;
          home_record: string | null;
          away_record: string | null;
          ats_record: string | null;
          over_under_record: string | null;
          last_updated: string;
        };
        Insert: {
          id?: number;
          team_id: string;
          sport: string;
          season: string;
          wins?: number | null;
          losses?: number | null;
          win_percentage?: number | null;
          points_per_game?: number | null;
          points_against_per_game?: number | null;
          home_record?: string | null;
          away_record?: string | null;
          ats_record?: string | null;
          over_under_record?: string | null;
          last_updated?: string;
        };
        Update: {
          id?: number;
          team_id?: string;
          sport?: string;
          season?: string;
          wins?: number | null;
          losses?: number | null;
          win_percentage?: number | null;
          points_per_game?: number | null;
          points_against_per_game?: number | null;
          home_record?: string | null;
          away_record?: string | null;
          ats_record?: string | null;
          over_under_record?: string | null;
          last_updated?: string;
        };
      };
      analysis_results: {
        Row: {
          id: number;
          game_id: string;
          analysis_type: string | null;
          moneyline_pick: string | null;
          moneyline_confidence: number | null;
          spread_pick: string | null;
          spread_confidence: number | null;
          total_pick: string | null;
          total_confidence: number | null;
          best_bet: string | null;
          risk_assessment: any | null;
          value_opportunities: any | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          analysis_type?: string | null;
          moneyline_pick?: string | null;
          moneyline_confidence?: number | null;
          spread_pick?: string | null;
          spread_confidence?: number | null;
          total_pick?: string | null;
          total_confidence?: number | null;
          best_bet?: string | null;
          risk_assessment?: any | null;
          value_opportunities?: any | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          analysis_type?: string | null;
          moneyline_pick?: string | null;
          moneyline_confidence?: number | null;
          spread_pick?: string | null;
          spread_confidence?: number | null;
          total_pick?: string | null;
          total_confidence?: number | null;
          best_bet?: string | null;
          risk_assessment?: any | null;
          value_opportunities?: any | null;
          created_at?: string;
        };
      };
      user_bets: {
        Row: {
          id: number;
          user_id: string | null;
          bet_type: string | null;
          game_id: string | null;
          selection: string | null;
          odds: number | null;
          stake: number | null;
          potential_payout: number | null;
          actual_payout: number | null;
          status: string | null;
          placed_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          bet_type?: string | null;
          game_id?: string | null;
          selection?: string | null;
          odds?: number | null;
          stake?: number | null;
          potential_payout?: number | null;
          actual_payout?: number | null;
          status?: string | null;
          placed_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          bet_type?: string | null;
          game_id?: string | null;
          selection?: string | null;
          odds?: number | null;
          stake?: number | null;
          potential_payout?: number | null;
          actual_payout?: number | null;
          status?: string | null;
          placed_at?: string;
          resolved_at?: string | null;
        };
      };
      performance_metrics: {
        Row: {
          id: number;
          date: string;
          sport: string | null;
          total_predictions: number | null;
          correct_predictions: number | null;
          accuracy: number | null;
          total_value: number | null;
          roi: number | null;
          best_performing_model: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          date: string;
          sport?: string | null;
          total_predictions?: number | null;
          correct_predictions?: number | null;
          accuracy?: number | null;
          total_value?: number | null;
          roi?: number | null;
          best_performing_model?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          date?: string;
          sport?: string | null;
          total_predictions?: number | null;
          correct_predictions?: number | null;
          accuracy?: number | null;
          total_value?: number | null;
          roi?: number | null;
          best_performing_model?: string | null;
          created_at?: string;
        };
      };
    };
  };
}