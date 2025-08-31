-- Supabase Schema for Sports Probability Analyzer
-- Run this SQL in your Supabase SQL Editor to create all necessary tables

-- Enable Row Level Security (recommended for production)
-- We'll disable it for now to keep things simple during development

-- Games table
CREATE TABLE IF NOT EXISTS public.games (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(100) UNIQUE NOT NULL,
  sport VARCHAR(20) NOT NULL,
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  scheduled TIMESTAMPTZ NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on game_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_games_game_id ON public.games(game_id);
CREATE INDEX IF NOT EXISTS idx_games_scheduled ON public.games(scheduled);
CREATE INDEX IF NOT EXISTS idx_games_sport ON public.games(sport);

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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_predictions_game_id FOREIGN KEY (game_id) REFERENCES public.games(game_id) ON DELETE CASCADE
);

-- Create indexes for predictions
CREATE INDEX IF NOT EXISTS idx_predictions_game_id ON public.predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_type ON public.predictions(prediction_type);

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
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_odds_game_id FOREIGN KEY (game_id) REFERENCES public.games(game_id) ON DELETE CASCADE
);

-- Create indexes for odds
CREATE INDEX IF NOT EXISTS idx_odds_game_id ON public.odds(game_id);
CREATE INDEX IF NOT EXISTS idx_odds_book_name ON public.odds(book_name);
CREATE INDEX IF NOT EXISTS idx_odds_timestamp ON public.odds(timestamp);

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

-- Create index on parlay_id
CREATE INDEX IF NOT EXISTS idx_parlays_parlay_id ON public.parlays(parlay_id);
CREATE INDEX IF NOT EXISTS idx_parlays_recommended ON public.parlays(recommended);
CREATE INDEX IF NOT EXISTS idx_parlays_created_at ON public.parlays(created_at);

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
  ats_record VARCHAR(20),
  over_under_record VARCHAR(20),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_team_season UNIQUE(team_id, sport, season)
);

-- Create indexes for team stats
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON public.team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_sport ON public.team_stats(sport);
CREATE INDEX IF NOT EXISTS idx_team_stats_season ON public.team_stats(season);

-- Analysis Results table
CREATE TABLE IF NOT EXISTS public.analysis_results (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(100) NOT NULL,
  analysis_type VARCHAR(50),
  moneyline_pick VARCHAR(100),
  moneyline_confidence DECIMAL(5,4),
  spread_pick VARCHAR(100),
  spread_confidence DECIMAL(5,4),
  total_pick VARCHAR(20),
  total_confidence DECIMAL(5,4),
  best_bet VARCHAR(200),
  risk_assessment JSONB,
  value_opportunities JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_analysis_game_id FOREIGN KEY (game_id) REFERENCES public.games(game_id) ON DELETE CASCADE
);

-- Create indexes for analysis results
CREATE INDEX IF NOT EXISTS idx_analysis_game_id ON public.analysis_results(game_id);
CREATE INDEX IF NOT EXISTS idx_analysis_type ON public.analysis_results(analysis_type);
CREATE INDEX IF NOT EXISTS idx_analysis_created_at ON public.analysis_results(created_at);

-- User Bets Tracking table
CREATE TABLE IF NOT EXISTS public.user_bets (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(100),
  bet_type VARCHAR(50),
  game_id VARCHAR(100),
  selection VARCHAR(200),
  odds INTEGER,
  stake DECIMAL(10,2),
  potential_payout DECIMAL(10,2),
  actual_payout DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'pending',
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create indexes for user bets
CREATE INDEX IF NOT EXISTS idx_user_bets_user_id ON public.user_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_game_id ON public.user_bets(game_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_status ON public.user_bets(status);
CREATE INDEX IF NOT EXISTS idx_user_bets_placed_at ON public.user_bets(placed_at);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  sport VARCHAR(20),
  total_predictions INTEGER,
  correct_predictions INTEGER,
  accuracy DECIMAL(5,4),
  total_value DECIMAL(10,2),
  roi DECIMAL(5,4),
  best_performing_model VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_date_sport UNIQUE(date, sport)
);

-- Create indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_date ON public.performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_performance_sport ON public.performance_metrics(sport);
CREATE INDEX IF NOT EXISTS idx_performance_accuracy ON public.performance_metrics(accuracy);

-- Create a function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_games_updated_at 
  BEFORE UPDATE ON public.games 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_predictions_updated_at 
  BEFORE UPDATE ON public.predictions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some useful views for common queries
CREATE OR REPLACE VIEW public.games_with_predictions AS
SELECT 
  g.*,
  COUNT(p.id) as prediction_count,
  AVG(p.confidence) as avg_confidence,
  MAX(p.created_at) as latest_prediction
FROM public.games g
LEFT JOIN public.predictions p ON g.game_id = p.game_id
GROUP BY g.id, g.game_id, g.sport, g.home_team, g.away_team, g.scheduled, g.home_score, g.away_score, g.status, g.created_at, g.updated_at;

CREATE OR REPLACE VIEW public.recent_performance AS
SELECT 
  sport,
  COUNT(*) as total_predictions,
  SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct_predictions,
  ROUND(AVG(CASE WHEN is_correct = true THEN 1.0 ELSE 0.0 END) * 100, 2) as accuracy_percentage,
  AVG(confidence) as avg_confidence,
  AVG(expected_value) as avg_expected_value
FROM public.predictions p
JOIN public.games g ON p.game_id = g.game_id
WHERE p.created_at >= NOW() - INTERVAL '30 days'
  AND p.is_correct IS NOT NULL
GROUP BY sport;

-- Grant necessary permissions (adjust as needed for your security requirements)
-- For development, we'll grant all permissions to authenticated users
-- In production, you should be more restrictive

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parlays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - adjust for production)
CREATE POLICY "Allow all operations on games" ON public.games FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on predictions" ON public.predictions FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on odds" ON public.odds FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on parlays" ON public.parlays FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on team_stats" ON public.team_stats FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on analysis_results" ON public.analysis_results FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on user_bets" ON public.user_bets FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all operations on performance_metrics" ON public.performance_metrics FOR ALL TO authenticated USING (true);

-- For service role access (bypass RLS)
CREATE POLICY "Service role bypass" ON public.games FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.predictions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.odds FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.parlays FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.team_stats FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.analysis_results FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.user_bets FOR ALL TO service_role USING (true);
CREATE POLICY "Service role bypass" ON public.performance_metrics FOR ALL TO service_role USING (true);

-- Insert some sample data for testing (optional)
-- Uncomment the lines below if you want some test data

-- INSERT INTO public.games (game_id, sport, home_team, away_team, scheduled, status) VALUES
-- ('test_game_1', 'NFL', 'Kansas City Chiefs', 'Denver Broncos', NOW() + INTERVAL '1 day', 'scheduled'),
-- ('test_game_2', 'NBA', 'Los Angeles Lakers', 'Boston Celtics', NOW() + INTERVAL '2 days', 'scheduled'),
-- ('test_game_3', 'NHL', 'Tampa Bay Lightning', 'Detroit Red Wings', NOW() + INTERVAL '3 days', 'scheduled');

-- INSERT INTO public.predictions (game_id, prediction_type, predicted_outcome, confidence, probability, expected_value) VALUES
-- ('test_game_1', 'moneyline', 'Kansas City Chiefs', 0.75, 0.65, 12.50),
-- ('test_game_2', 'spread', 'Los Angeles Lakers -5.5', 0.68, 0.58, 8.75),
-- ('test_game_3', 'total', 'Over 6.5', 0.72, 0.61, 15.25);

COMMIT;