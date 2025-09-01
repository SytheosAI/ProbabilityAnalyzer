-- Adapt our application to work with your existing database schema
-- Based on the CSV files showing your actual column names

-- Your database uses column names like: player_name, team_name, venue_name
-- Let's create views that provide a consistent interface

-- Create a view for teams with standardized column names
CREATE OR REPLACE VIEW teams_view AS
SELECT 
    *,
    team_name AS name  -- Add 'name' as alias for compatibility
FROM teams;

-- Create a view for players with standardized column names
CREATE OR REPLACE VIEW players_view AS
SELECT 
    *,
    player_name AS name  -- Add 'name' as alias for compatibility
FROM players;

-- Create a view for venues with standardized column names
CREATE OR REPLACE VIEW venues_view AS
SELECT 
    *,
    venue_name AS name  -- Add 'name' as alias for compatibility
FROM venues;

-- Alternative approach: Add the missing columns as computed columns
-- This way the app can use either 'name' or 'team_name' etc.

-- Add 'name' as a generated column that mirrors the existing column
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) 
GENERATED ALWAYS AS (team_name) STORED;

ALTER TABLE players 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) 
GENERATED ALWAYS AS (player_name) STORED;

ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS name VARCHAR(255) 
GENERATED ALWAYS AS (venue_name) STORED;

-- If generated columns aren't supported, use triggers instead
DO $$
BEGIN
    -- Check if we can use generated columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'teams' 
        AND column_name = 'name' 
        AND generation_expression IS NOT NULL
    ) THEN
        -- Fall back to regular columns with triggers
        ALTER TABLE teams DROP COLUMN IF EXISTS name;
        ALTER TABLE teams ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        UPDATE teams SET name = team_name;
        
        ALTER TABLE players DROP COLUMN IF EXISTS name;
        ALTER TABLE players ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        UPDATE players SET name = player_name;
        
        ALTER TABLE venues DROP COLUMN IF EXISTS name;
        ALTER TABLE venues ADD COLUMN IF NOT EXISTS name VARCHAR(255);
        UPDATE venues SET name = venue_name;
        
        -- Create triggers to keep them in sync
        CREATE OR REPLACE FUNCTION sync_team_name() RETURNS TRIGGER AS $$
        BEGIN
            NEW.name := NEW.team_name;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE OR REPLACE FUNCTION sync_player_name() RETURNS TRIGGER AS $$
        BEGIN
            NEW.name := NEW.player_name;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE OR REPLACE FUNCTION sync_venue_name() RETURNS TRIGGER AS $$
        BEGIN
            NEW.name := NEW.venue_name;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        DROP TRIGGER IF EXISTS sync_team_name_trigger ON teams;
        CREATE TRIGGER sync_team_name_trigger
        BEFORE INSERT OR UPDATE ON teams
        FOR EACH ROW EXECUTE FUNCTION sync_team_name();
        
        DROP TRIGGER IF EXISTS sync_player_name_trigger ON players;
        CREATE TRIGGER sync_player_name_trigger
        BEFORE INSERT OR UPDATE ON players
        FOR EACH ROW EXECUTE FUNCTION sync_player_name();
        
        DROP TRIGGER IF EXISTS sync_venue_name_trigger ON venues;
        CREATE TRIGGER sync_venue_name_trigger
        BEFORE INSERT OR UPDATE ON venues
        FOR EACH ROW EXECUTE FUNCTION sync_venue_name();
    END IF;
END $$;

-- Now let's populate some initial data since the tables are empty
-- Sample teams for testing
INSERT INTO teams (team_name) VALUES 
    ('Los Angeles Lakers'),
    ('Golden State Warriors'),
    ('Boston Celtics'),
    ('Miami Heat'),
    ('Kansas City Chiefs'),
    ('Buffalo Bills'),
    ('Dallas Cowboys'),
    ('Green Bay Packers')
ON CONFLICT DO NOTHING;

-- Sample venues for testing
INSERT INTO venues (venue_name) VALUES 
    ('Crypto.com Arena'),
    ('Chase Center'),
    ('TD Garden'),
    ('FTX Arena'),
    ('Arrowhead Stadium'),
    ('Highmark Stadium'),
    ('AT&T Stadium'),
    ('Lambeau Field')
ON CONFLICT DO NOTHING;

-- Sample players for testing
INSERT INTO players (player_name) VALUES 
    ('LeBron James'),
    ('Stephen Curry'),
    ('Jayson Tatum'),
    ('Jimmy Butler'),
    ('Patrick Mahomes'),
    ('Josh Allen'),
    ('Dak Prescott'),
    ('Aaron Rodgers')
ON CONFLICT DO NOTHING;

-- Verify the setup
SELECT 
    'Setup Complete' as status,
    (SELECT COUNT(*) FROM teams) as teams_count,
    (SELECT COUNT(*) FROM players) as players_count,
    (SELECT COUNT(*) FROM venues) as venues_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'name') as teams_has_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'name') as players_has_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'name') as venues_has_name;