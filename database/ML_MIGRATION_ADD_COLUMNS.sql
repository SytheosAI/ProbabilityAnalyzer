-- Add missing columns to existing tables
-- Run this BEFORE the main migration if tables already exist

-- ============================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add missing columns to players table if it exists
DO $$
BEGIN
    -- Check if players table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        
        -- Add status column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'status') THEN
            ALTER TABLE public.players ADD COLUMN status VARCHAR(50) DEFAULT 'active';
        END IF;
        
        -- Add injury_status column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'injury_status') THEN
            ALTER TABLE public.players ADD COLUMN injury_status VARCHAR(50) DEFAULT 'healthy';
        END IF;
        
        -- Add injury_details column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'injury_details') THEN
            ALTER TABLE public.players ADD COLUMN injury_details TEXT;
        END IF;
        
        -- Add injury_return_date column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'injury_return_date') THEN
            ALTER TABLE public.players ADD COLUMN injury_return_date DATE;
        END IF;
        
        -- Add performance_rating column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'performance_rating') THEN
            ALTER TABLE public.players ADD COLUMN performance_rating DECIMAL(5,2);
        END IF;
        
        -- Add market_value column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'market_value') THEN
            ALTER TABLE public.players ADD COLUMN market_value DECIMAL(12,2);
        END IF;
        
        -- Add embedding_vector column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'embedding_vector') THEN
            ALTER TABLE public.players ADD COLUMN embedding_vector JSONB;
        END IF;
        
        -- Add position column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'position') THEN
            ALTER TABLE public.players ADD COLUMN position VARCHAR(50);
        END IF;
        
        -- Add jersey_number column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'jersey_number') THEN
            ALTER TABLE public.players ADD COLUMN jersey_number INTEGER;
        END IF;
        
        -- Add height_cm column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'height_cm') THEN
            ALTER TABLE public.players ADD COLUMN height_cm INTEGER;
        END IF;
        
        -- Add weight_kg column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'weight_kg') THEN
            ALTER TABLE public.players ADD COLUMN weight_kg INTEGER;
        END IF;
        
        -- Add age column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'age') THEN
            ALTER TABLE public.players ADD COLUMN age INTEGER;
        END IF;
        
        -- Add years_pro column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'years_pro') THEN
            ALTER TABLE public.players ADD COLUMN years_pro INTEGER;
        END IF;
        
        -- Add updated_at column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'updated_at') THEN
            ALTER TABLE public.players ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
        
        RAISE NOTICE 'Players table columns updated successfully';
    END IF;
END $$;

-- Now create indexes on the newly added columns
DO $$ 
BEGIN
    -- Only create indexes after columns are added
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'players' AND column_name = 'status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_players_status') THEN
            CREATE INDEX idx_players_status ON public.players(status);
        END IF;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'players' AND column_name = 'injury_status') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_players_injury') THEN
            CREATE INDEX idx_players_injury ON public.players(injury_status);
        END IF;
    END IF;
    
    RAISE NOTICE 'Players table indexes created successfully';
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    column_count INTEGER;
BEGIN
    -- Count how many expected columns exist in players table
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'players'
    AND column_name IN (
        'player_id', 'sport', 'team_id', 'name', 'position',
        'jersey_number', 'height_cm', 'weight_kg', 'age', 'years_pro',
        'status', 'injury_status', 'injury_details', 'injury_return_date',
        'performance_rating', 'market_value', 'embedding_vector',
        'created_at', 'updated_at'
    );
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'COLUMN MIGRATION RESULTS';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Players table columns: %/19', column_count;
    
    IF column_count >= 17 THEN
        RAISE NOTICE '✅ SUCCESS: Players table structure updated!';
        RAISE NOTICE '✅ Ready to run ML_MIGRATION_SAFE.sql';
    ELSE
        RAISE NOTICE '⚠️  Some columns may be missing';
        RAISE NOTICE '⚠️  Check errors above';
    END IF;
    
    RAISE NOTICE '=================================';
END $$;