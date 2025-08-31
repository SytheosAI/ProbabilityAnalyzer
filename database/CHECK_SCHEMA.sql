-- Check current database schema
-- Run this in Supabase to see what tables and columns currently exist

-- List all tables in public schema
SELECT 'EXISTING TABLES:' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check structure of players table if it exists
SELECT 'PLAYERS TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'players'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check structure of games table
SELECT 'GAMES TABLE COLUMNS:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'games'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all existing indexes
SELECT 'EXISTING INDEXES:' as info;
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check existing constraints
SELECT 'EXISTING CONSTRAINTS:' as info;
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
ORDER BY table_name, constraint_name;