-- Inspect existing tables to understand their structure
-- This will show us exactly what columns exist

-- Show all tables in the database
SELECT 
    'EXISTING TABLES:' as info;

SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Show structure of teams table (if it exists)
SELECT 
    '
TEAMS TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'teams'
ORDER BY ordinal_position;

-- Show structure of players table (if it exists)
SELECT 
    '
PLAYERS TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'players'
ORDER BY ordinal_position;

-- Show structure of games table (if it exists)
SELECT 
    '
GAMES TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'games'
ORDER BY ordinal_position;

-- Show any table that might have team-related data
SELECT 
    '
TABLES WITH TEAM-RELATED COLUMNS:' as info;

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name LIKE '%team%'
ORDER BY table_name, column_name;

-- Show any table that might have name-related columns
SELECT 
    '
TABLES WITH NAME-RELATED COLUMNS:' as info;

SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_name LIKE '%name%'
ORDER BY table_name, column_name;

-- Count records in main tables
SELECT 
    '
RECORD COUNTS:' as info;

SELECT 
    'teams' as table_name,
    COUNT(*) as record_count
FROM teams
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
UNION ALL
SELECT 
    'players' as table_name,
    COUNT(*) as record_count
FROM players
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players')
UNION ALL
SELECT 
    'games' as table_name,
    COUNT(*) as record_count
FROM games
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'games');