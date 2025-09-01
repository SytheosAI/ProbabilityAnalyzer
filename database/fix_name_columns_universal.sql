-- Universal fix for missing "name" columns - handles any table structure
-- This version checks for various ID column names and handles all cases

-- Helper function to get the primary key column name
CREATE OR REPLACE FUNCTION get_pk_column(table_name_param TEXT) 
RETURNS TEXT AS $$
DECLARE
    pk_column TEXT;
BEGIN
    -- Try to find primary key column
    SELECT a.attname INTO pk_column
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = table_name_param::regclass
    AND i.indisprimary
    LIMIT 1;
    
    -- If no primary key, look for common ID column names
    IF pk_column IS NULL THEN
        SELECT column_name INTO pk_column
        FROM information_schema.columns
        WHERE table_name = table_name_param
        AND column_name IN ('id', 'venue_id', 'team_id', 'player_id', 'coach_id', 'referee_id', 
                           'game_id', 'external_id', 'uuid', 'guid')
        LIMIT 1;
    END IF;
    
    RETURN pk_column;
END;
$$ LANGUAGE plpgsql;

-- Fix teams table
DO $$ 
DECLARE
    pk_col TEXT;
    sql_query TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'name') THEN
            ALTER TABLE teams ADD COLUMN name VARCHAR(255);
            
            -- Get primary key column
            pk_col := get_pk_column('teams');
            
            -- Try to populate from existing columns
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_name') THEN
                UPDATE teams SET name = team_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_code') THEN
                UPDATE teams SET name = team_code WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'display_name') THEN
                UPDATE teams SET name = display_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'full_name') THEN
                UPDATE teams SET name = full_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'abbreviation') THEN
                UPDATE teams SET name = abbreviation WHERE name IS NULL;
            ELSIF pk_col IS NOT NULL THEN
                -- Use primary key if available
                sql_query := format('UPDATE teams SET name = ''Team '' || COALESCE(%I::TEXT, ''Unknown'') WHERE name IS NULL', pk_col);
                EXECUTE sql_query;
            ELSE
                -- Last resort - use row number
                UPDATE teams SET name = 'Team ' || row_number() OVER () WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix players table
DO $$ 
DECLARE
    pk_col TEXT;
    sql_query TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'name') THEN
            ALTER TABLE players ADD COLUMN name VARCHAR(255);
            
            -- Get primary key column
            pk_col := get_pk_column('players');
            
            -- Try to populate from existing columns
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'player_name') THEN
                UPDATE players SET name = player_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'full_name') THEN
                UPDATE players SET name = full_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'display_name') THEN
                UPDATE players SET name = display_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' 
                     AND column_name = 'first_name' 
                     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'last_name')) THEN
                UPDATE players SET name = CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) WHERE name IS NULL;
            ELSIF pk_col IS NOT NULL THEN
                sql_query := format('UPDATE players SET name = ''Player '' || COALESCE(%I::TEXT, ''Unknown'') WHERE name IS NULL', pk_col);
                EXECUTE sql_query;
            ELSE
                UPDATE players SET name = 'Player ' || row_number() OVER () WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix venues table
DO $$ 
DECLARE
    pk_col TEXT;
    sql_query TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'name') THEN
            ALTER TABLE venues ADD COLUMN name VARCHAR(255);
            
            -- Get primary key column
            pk_col := get_pk_column('venues');
            
            -- Try to populate from existing columns
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'venue_name') THEN
                UPDATE venues SET name = venue_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'stadium_name') THEN
                UPDATE venues SET name = stadium_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'arena_name') THEN
                UPDATE venues SET name = arena_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'facility_name') THEN
                UPDATE venues SET name = facility_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'location') THEN
                UPDATE venues SET name = location WHERE name IS NULL;
            ELSIF pk_col IS NOT NULL THEN
                sql_query := format('UPDATE venues SET name = ''Venue '' || COALESCE(%I::TEXT, ''Unknown'') WHERE name IS NULL', pk_col);
                EXECUTE sql_query;
            ELSE
                UPDATE venues SET name = 'Venue ' || row_number() OVER () WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix coaches table
DO $$ 
DECLARE
    pk_col TEXT;
    sql_query TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'name') THEN
            ALTER TABLE coaches ADD COLUMN name VARCHAR(255);
            
            pk_col := get_pk_column('coaches');
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'coach_name') THEN
                UPDATE coaches SET name = coach_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'full_name') THEN
                UPDATE coaches SET name = full_name WHERE name IS NULL;
            ELSIF pk_col IS NOT NULL THEN
                sql_query := format('UPDATE coaches SET name = ''Coach '' || COALESCE(%I::TEXT, ''Unknown'') WHERE name IS NULL', pk_col);
                EXECUTE sql_query;
            ELSE
                UPDATE coaches SET name = 'Coach ' || row_number() OVER () WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix referees table
DO $$ 
DECLARE
    pk_col TEXT;
    sql_query TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referees') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referees' AND column_name = 'name') THEN
            ALTER TABLE referees ADD COLUMN name VARCHAR(255);
            
            pk_col := get_pk_column('referees');
            
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referees' AND column_name = 'referee_name') THEN
                UPDATE referees SET name = referee_name WHERE name IS NULL;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referees' AND column_name = 'official_name') THEN
                UPDATE referees SET name = official_name WHERE name IS NULL;
            ELSIF pk_col IS NOT NULL THEN
                sql_query := format('UPDATE referees SET name = ''Referee '' || COALESCE(%I::TEXT, ''Unknown'') WHERE name IS NULL', pk_col);
                EXECUTE sql_query;
            ELSE
                UPDATE referees SET name = 'Referee ' || row_number() OVER () WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Clean up the helper function
DROP FUNCTION IF EXISTS get_pk_column(TEXT);

-- Final report
DO $$
BEGIN
    RAISE NOTICE 'Name column fix completed. Checking results...';
END $$;

-- Show what we accomplished
SELECT 
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN '✓ Has name column'
        ELSE '✗ Missing name column'
    END as name_column_status,
    COUNT(cols.column_name) as total_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND c.column_name = 'name'
    AND c.table_schema = 'public'
LEFT JOIN information_schema.columns cols
    ON t.table_name = cols.table_name
    AND cols.table_schema = 'public'
WHERE t.table_schema = 'public'
    AND t.table_name IN ('teams', 'players', 'coaches', 'referees', 'venues')
GROUP BY t.table_name, c.column_name
ORDER BY t.table_name;