-- Check what tables actually exist in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if specific tables we need exist
SELECT 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'coaches') as coaches_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams') as teams_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') as players_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'games') as games_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'odds_history') as odds_history_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ml_predictions') as ml_predictions_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referees') as referees_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'venues') as venues_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_conditions') as weather_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_injuries') as injuries_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sharp_money_tracking') as sharp_money_exists,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'line_movements') as line_movements_exists;