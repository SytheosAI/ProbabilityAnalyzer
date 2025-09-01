-- Check which tables exist and what columns they have
-- This will help identify where the "name" column is missing

-- List all tables in the public schema
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- Check for tables that should have a "name" column
SELECT 
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'public'
    AND c.table_name IN ('teams', 'players', 'coaches', 'referees', 'venues', 'sports', 'leagues')
    AND c.column_name = 'name'
ORDER BY c.table_name;

-- Check structure of teams table (if it exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'teams'
ORDER BY ordinal_position;

-- Check structure of players table (if it exists)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'players'
ORDER BY ordinal_position;

-- Find all columns named "name" in any table
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name = 'name'
ORDER BY table_name;

-- Find tables that might need a name column but use different naming
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name IN ('team_name', 'player_name', 'coach_name', 'referee_name', 'venue_name', 'full_name', 'display_name')
ORDER BY table_name, column_name;