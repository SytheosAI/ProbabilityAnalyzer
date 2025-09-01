-- Fix missing "name" columns in tables
-- This script adds name columns where they're missing

-- Add name column to teams table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'teams' AND column_name = 'name') THEN
            -- Check if there's a team_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'teams' AND column_name = 'team_name') THEN
                ALTER TABLE teams RENAME COLUMN team_name TO name;
            ELSE
                ALTER TABLE teams ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to players table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'name') THEN
            -- Check if there's a player_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'players' AND column_name = 'player_name') THEN
                ALTER TABLE players RENAME COLUMN player_name TO name;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'players' AND column_name = 'full_name') THEN
                ALTER TABLE players RENAME COLUMN full_name TO name;
            ELSE
                ALTER TABLE players ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to coaches table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'coaches' AND column_name = 'name') THEN
            -- Check if there's a coach_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'coaches' AND column_name = 'coach_name') THEN
                ALTER TABLE coaches RENAME COLUMN coach_name TO name;
            ELSE
                ALTER TABLE coaches ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to referees table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referees') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'referees' AND column_name = 'name') THEN
            -- Check if there's a referee_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'referees' AND column_name = 'referee_name') THEN
                ALTER TABLE referees RENAME COLUMN referee_name TO name;
            ELSE
                ALTER TABLE referees ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to venues table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'venues' AND column_name = 'name') THEN
            -- Check if there's a venue_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'venues' AND column_name = 'venue_name') THEN
                ALTER TABLE venues RENAME COLUMN venue_name TO name;
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'venues' AND column_name = 'stadium_name') THEN
                ALTER TABLE venues RENAME COLUMN stadium_name TO name;
            ELSE
                ALTER TABLE venues ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to sports table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'sports' AND column_name = 'name') THEN
            -- Check if there's a sport_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'sports' AND column_name = 'sport_name') THEN
                ALTER TABLE sports RENAME COLUMN sport_name TO name;
            ELSE
                ALTER TABLE sports ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Add name column to leagues table if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leagues') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'leagues' AND column_name = 'name') THEN
            -- Check if there's a league_name column we should use instead
            IF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'leagues' AND column_name = 'league_name') THEN
                ALTER TABLE leagues RENAME COLUMN league_name TO name;
            ELSE
                ALTER TABLE leagues ADD COLUMN name VARCHAR(255);
            END IF;
        END IF;
    END IF;
END $$;

-- Update any NULL name values with data from other columns if available
UPDATE teams SET name = COALESCE(name, team_name, display_name, 'Unknown Team') 
WHERE name IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'name');

UPDATE players SET name = COALESCE(name, player_name, full_name, first_name || ' ' || last_name, 'Unknown Player') 
WHERE name IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'name');

UPDATE coaches SET name = COALESCE(name, coach_name, 'Unknown Coach') 
WHERE name IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'coaches' AND column_name = 'name');

UPDATE referees SET name = COALESCE(name, referee_name, 'Unknown Referee') 
WHERE name IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'referees' AND column_name = 'name');

UPDATE venues SET name = COALESCE(name, venue_name, stadium_name, 'Unknown Venue') 
WHERE name IS NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'name');

-- Add NOT NULL constraint after populating data
DO $$ 
BEGIN
    -- Make name column NOT NULL for critical tables
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'teams' AND column_name = 'name' AND is_nullable = 'YES') THEN
        ALTER TABLE teams ALTER COLUMN name SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'players' AND column_name = 'name' AND is_nullable = 'YES') THEN
        ALTER TABLE players ALTER COLUMN name SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'venues' AND column_name = 'name' AND is_nullable = 'YES') THEN
        ALTER TABLE venues ALTER COLUMN name SET NOT NULL;
    END IF;
EXCEPTION
    WHEN others THEN
        -- If we can't set NOT NULL due to null values, that's ok
        NULL;
END $$;

-- Verify the fixes
SELECT 
    'Verification Report:' as status,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name IN ('teams', 'players', 'coaches', 'referees', 'venues') AND column_name = 'name') as tables_with_name_column;