-- Safe fix for missing "name" columns - checks what actually exists first
-- This version won't fail if columns don't exist

-- First, let's see what columns the teams table actually has
DO $$ 
DECLARE
    has_teams_table BOOLEAN;
    has_name_column BOOLEAN;
    has_team_code BOOLEAN;
    has_team_name BOOLEAN;
    has_display_name BOOLEAN;
BEGIN
    -- Check if teams table exists
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') INTO has_teams_table;
    
    IF has_teams_table THEN
        -- Check what columns exist
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'name') INTO has_name_column;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_code') INTO has_team_code;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_name') INTO has_team_name;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'display_name') INTO has_display_name;
        
        -- Add name column if it doesn't exist
        IF NOT has_name_column THEN
            ALTER TABLE teams ADD COLUMN name VARCHAR(255);
            
            -- Update with available data
            IF has_team_name THEN
                UPDATE teams SET name = team_name WHERE name IS NULL;
            ELSIF has_team_code THEN
                UPDATE teams SET name = team_code WHERE name IS NULL;
            ELSIF has_display_name THEN
                UPDATE teams SET name = display_name WHERE name IS NULL;
            ELSE
                UPDATE teams SET name = 'Team ' || COALESCE(id::TEXT, 'Unknown') WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix players table
DO $$ 
DECLARE
    has_players_table BOOLEAN;
    has_name_column BOOLEAN;
    has_player_name BOOLEAN;
    has_full_name BOOLEAN;
    has_first_name BOOLEAN;
    has_last_name BOOLEAN;
BEGIN
    -- Check if players table exists
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') INTO has_players_table;
    
    IF has_players_table THEN
        -- Check what columns exist
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'name') INTO has_name_column;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'player_name') INTO has_player_name;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'full_name') INTO has_full_name;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'first_name') INTO has_first_name;
        SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'last_name') INTO has_last_name;
        
        -- Add name column if it doesn't exist
        IF NOT has_name_column THEN
            ALTER TABLE players ADD COLUMN name VARCHAR(255);
            
            -- Update with available data
            IF has_player_name THEN
                UPDATE players SET name = player_name WHERE name IS NULL;
            ELSIF has_full_name THEN
                UPDATE players SET name = full_name WHERE name IS NULL;
            ELSIF has_first_name AND has_last_name THEN
                UPDATE players SET name = CONCAT(first_name, ' ', last_name) WHERE name IS NULL;
            ELSE
                UPDATE players SET name = 'Player ' || COALESCE(id::TEXT, 'Unknown') WHERE name IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- Fix coaches table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'name') THEN
            ALTER TABLE coaches ADD COLUMN name VARCHAR(255);
            UPDATE coaches SET name = 'Coach ' || COALESCE(id::TEXT, 'Unknown') WHERE name IS NULL;
        END IF;
    END IF;
END $$;

-- Fix referees table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referees') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referees' AND column_name = 'name') THEN
            ALTER TABLE referees ADD COLUMN name VARCHAR(255);
            UPDATE referees SET name = 'Referee ' || COALESCE(id::TEXT, 'Unknown') WHERE name IS NULL;
        END IF;
    END IF;
END $$;

-- Fix venues table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'name') THEN
            ALTER TABLE venues ADD COLUMN name VARCHAR(255);
            UPDATE venues SET name = 'Venue ' || COALESCE(id::TEXT, 'Unknown') WHERE name IS NULL;
        END IF;
    END IF;
END $$;

-- Report what was done
SELECT 
    t.table_name,
    CASE 
        WHEN c.column_name IS NOT NULL THEN 'Has name column'
        ELSE 'Missing name column'
    END as status,
    array_agg(DISTINCT cols.column_name ORDER BY cols.column_name) as all_columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND c.column_name = 'name'
    AND c.table_schema = 'public'
LEFT JOIN information_schema.columns cols
    ON t.table_name = cols.table_name
    AND cols.table_schema = 'public'
WHERE t.table_schema = 'public'
    AND t.table_name IN ('teams', 'players', 'coaches', 'referees', 'venues', 'sports', 'leagues')
GROUP BY t.table_name, c.column_name
ORDER BY t.table_name;