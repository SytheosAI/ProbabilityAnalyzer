-- Fix Schema Migration Script
-- This script fixes the missing 'scheduled' column error

-- First, check if the games table exists and add the scheduled column if missing
DO $$ 
BEGIN
  -- Check if the scheduled column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'games' 
    AND column_name = 'scheduled'
  ) THEN
    -- Add the scheduled column if it doesn't exist
    ALTER TABLE public.games 
    ADD COLUMN scheduled TIMESTAMPTZ NOT NULL DEFAULT NOW();
    
    RAISE NOTICE 'Added scheduled column to games table';
  ELSE
    RAISE NOTICE 'Scheduled column already exists';
  END IF;
END $$;

-- Alternative: If you want to drop and recreate the tables cleanly, run this instead:
-- WARNING: This will DELETE ALL DATA in these tables!

/*
-- Drop existing tables (if you want to start fresh)
DROP TABLE IF EXISTS public.analysis_results CASCADE;
DROP TABLE IF EXISTS public.user_bets CASCADE;
DROP TABLE IF EXISTS public.performance_metrics CASCADE;
DROP TABLE IF EXISTS public.team_stats CASCADE;
DROP TABLE IF EXISTS public.parlays CASCADE;
DROP TABLE IF EXISTS public.odds CASCADE;
DROP TABLE IF EXISTS public.predictions CASCADE;
DROP TABLE IF EXISTS public.games CASCADE;

-- Then run the full schema creation from supabase_schema.sql
*/

-- Quick fix: If the table exists but is missing columns, add them all:
DO $$ 
BEGIN
  -- Add scheduled column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'scheduled') THEN
    ALTER TABLE public.games ADD COLUMN scheduled TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  -- Add other potentially missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'home_score') THEN
    ALTER TABLE public.games ADD COLUMN home_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'away_score') THEN
    ALTER TABLE public.games ADD COLUMN away_score INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'status') THEN
    ALTER TABLE public.games ADD COLUMN status VARCHAR(50);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'created_at') THEN
    ALTER TABLE public.games ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'updated_at') THEN
    ALTER TABLE public.games ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  RAISE NOTICE 'Schema fix completed';
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_games_scheduled ON public.games(scheduled);