-- SAFE Migration Script - Only adds what's missing
-- Run this FIRST to fix your existing tables

-- Step 1: Check what columns exist in games table and add missing ones
DO $$ 
BEGIN
  -- Add game_id if it doesn't exist (this is critical!)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'game_id') THEN
    ALTER TABLE public.games ADD COLUMN game_id VARCHAR(100);
    -- Try to make it unique if possible (may fail if duplicates exist)
    BEGIN
      ALTER TABLE public.games ADD CONSTRAINT games_game_id_unique UNIQUE (game_id);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not add unique constraint to game_id - duplicates may exist';
    END;
  END IF;

  -- Add sport column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'sport') THEN
    ALTER TABLE public.games ADD COLUMN sport VARCHAR(20) DEFAULT 'NBA';
  END IF;

  -- Add home_team column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'home_team') THEN
    ALTER TABLE public.games ADD COLUMN home_team VARCHAR(100);
  END IF;

  -- Add away_team column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'away_team') THEN
    ALTER TABLE public.games ADD COLUMN away_team VARCHAR(100);
  END IF;

  -- Add scheduled column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'scheduled') THEN
    ALTER TABLE public.games ADD COLUMN scheduled TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add home_score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'home_score') THEN
    ALTER TABLE public.games ADD COLUMN home_score INTEGER;
  END IF;

  -- Add away_score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'away_score') THEN
    ALTER TABLE public.games ADD COLUMN away_score INTEGER;
  END IF;

  -- Add status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'status') THEN
    ALTER TABLE public.games ADD COLUMN status VARCHAR(50);
  END IF;

  -- Add created_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'created_at') THEN
    ALTER TABLE public.games ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'games' AND column_name = 'updated_at') THEN
    ALTER TABLE public.games ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 2: Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_games_game_id ON public.games(game_id);
CREATE INDEX IF NOT EXISTS idx_games_scheduled ON public.games(scheduled);
CREATE INDEX IF NOT EXISTS idx_games_sport ON public.games(sport);

-- Step 3: Show current structure of games table
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'games'
ORDER BY ordinal_position;

-- Step 4: Create other tables ONLY if they don't exist
-- Predictions table
CREATE TABLE IF NOT EXISTS public.predictions (
  id BIGSERIAL PRIMARY KEY,
  game_id VARCHAR(100),
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
  game_id VARCHAR(100),
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

-- User Bets table
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

-- Step 5: List all tables to confirm what exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Success!
SELECT 'Migration completed! Check the output above to see your table structure.' as message;