-- Add ALL missing columns to existing games table
-- Run this in Supabase SQL Editor to fix the missing columns error

-- Add sport column if it doesn't exist
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS sport VARCHAR(20) NOT NULL DEFAULT 'NBA';

-- Add other missing columns
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS game_id VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS home_team VARCHAR(100),
ADD COLUMN IF NOT EXISTS away_team VARCHAR(100),
ADD COLUMN IF NOT EXISTS scheduled TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS home_score INTEGER,
ADD COLUMN IF NOT EXISTS away_score INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_game_id ON public.games(game_id);
CREATE INDEX IF NOT EXISTS idx_games_scheduled ON public.games(scheduled);
CREATE INDEX IF NOT EXISTS idx_games_sport ON public.games(sport);

-- Now create the other missing tables if they don't exist

-- Predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(100) NOT NULL,
  prediction_type VARCHAR(50) NOT NULL,
  predicted_outcome VARCHAR(100),
  confidence DECIMAL(5,4),
  probability DECIMAL(5,4),
  expected_value DECIMAL(10,2),
  actual_outcome VARCHAR(100),
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Odds table
CREATE TABLE IF NOT EXISTS public.odds (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(100) NOT NULL,
  book_name VARCHAR(100),
  market_type VARCHAR(50),
  home_odds INTEGER,
  away_odds INTEGER,
  spread DECIMAL(5,2),
  total DECIMAL(5,2),
  over_odds INTEGER,
  under_odds INTEGER,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Parlays table
CREATE TABLE IF NOT EXISTS public.parlays (
  id BIGSERIAL PRIMARY KEY,
  parlay_id VARCHAR(100) UNIQUE NOT NULL,
  legs JSONB NOT NULL,
  combined_odds INTEGER,
  total_probability DECIMAL(5,4),
  expected_value DECIMAL(10,2),
  risk_level VARCHAR(20),
  correlation_score DECIMAL(5,4),
  recommended BOOLEAN DEFAULT false,
  actual_outcome VARCHAR(20),
  payout DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team Stats table
CREATE TABLE IF NOT EXISTS public.team_stats (
  id BIGSERIAL PRIMARY KEY,
  team_id VARCHAR(100) NOT NULL,
  sport VARCHAR(20) NOT NULL,
  season VARCHAR(20) NOT NULL,
  wins INTEGER,
  losses INTEGER,
  win_percentage DECIMAL(5,4),
  points_per_game DECIMAL(5,2),
  points_against_per_game DECIMAL(5,2),
  home_record VARCHAR(20),
  away_record VARCHAR(20),
  last_10_record VARCHAR(20),
  streak VARCHAR(20),
  ats_record VARCHAR(20),
  over_under_record VARCHAR(20),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis Results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id BIGSERIAL PRIMARY KEY,
  analysis_id VARCHAR(100) UNIQUE NOT NULL,
  analysis_type VARCHAR(50) NOT NULL,
  sport VARCHAR(20),
  data JSONB NOT NULL,
  confidence_score DECIMAL(5,4),
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Bets table (for tracking)
CREATE TABLE IF NOT EXISTS public.user_bets (
  id BIGSERIAL PRIMARY KEY,
  bet_id VARCHAR(100) UNIQUE NOT NULL,
  game_id VARCHAR(100),
  parlay_id VARCHAR(100),
  bet_type VARCHAR(50),
  stake DECIMAL(10,2),
  odds INTEGER,
  potential_payout DECIMAL(10,2),
  actual_payout DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create indexes for all tables
CREATE INDEX IF NOT EXISTS idx_predictions_game_id ON public.predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_odds_game_id ON public.odds(game_id);
CREATE INDEX IF NOT EXISTS idx_parlays_recommended ON public.parlays(recommended);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON public.team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_status ON public.user_bets(status);

-- Grant permissions (for Row Level Security if needed later)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Success message
SELECT 'Schema migration completed successfully!' as message;