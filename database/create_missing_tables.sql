-- Migration to create ONLY missing tables that are referenced but don't exist
-- Run this after checking which tables already exist

-- Create coaches table if it doesn't exist
CREATE TABLE IF NOT EXISTS coaches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    team_id INTEGER,
    sport VARCHAR(50),
    coaching_style VARCHAR(100),
    aggression_index DECIMAL(3, 2),
    timeout_efficiency DECIMAL(3, 2),
    challenge_success_rate DECIMAL(3, 2),
    years_experience INTEGER,
    playoff_record JSONB,
    vs_spread_record JSONB,
    tendencies JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create referees table if it doesn't exist
CREATE TABLE IF NOT EXISTS referees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(50) NOT NULL,
    experience_years INTEGER,
    home_team_win_rate DECIMAL(3, 2),
    avg_fouls_called_per_game DECIMAL(5, 2),
    over_under_bias DECIMAL(3, 2), -- Positive means tends toward overs
    technical_foul_rate DECIMAL(4, 3),
    var_usage_rate DECIMAL(3, 2), -- For sports with VAR/replay
    consistency_rating DECIMAL(3, 2),
    controversial_call_rate DECIMAL(3, 2),
    playoff_games_officiated INTEGER,
    tendencies JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create venues table if it doesn't exist  
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(255),
    state VARCHAR(100),
    country VARCHAR(100),
    capacity INTEGER,
    altitude_feet INTEGER,
    surface_type VARCHAR(100), -- grass, turf, court, ice
    roof_type VARCHAR(50), -- dome, retractable, open
    year_built INTEGER,
    coordinates POINT,
    time_zone VARCHAR(50),
    home_field_advantage_rating DECIMAL(3, 2),
    noise_level_rating DECIMAL(3, 2),
    weather_impact_factor DECIMAL(3, 2),
    special_factors JSONB, -- e.g., {"altitude_effect": true, "wind_patterns": "swirling"}
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create player_injuries table if it doesn't exist
CREATE TABLE IF NOT EXISTS player_injuries (
    id SERIAL PRIMARY KEY,
    player_id INTEGER,
    player_name VARCHAR(255),
    team_id INTEGER,
    sport VARCHAR(50),
    injury_date DATE,
    injury_type VARCHAR(255),
    body_part VARCHAR(100),
    severity VARCHAR(50), -- day-to-day, week-to-week, out, IR
    expected_return_date DATE,
    probability_to_play DECIMAL(3, 2),
    impact_on_performance DECIMAL(3, 2), -- 0-1 scale
    status VARCHAR(50), -- active, recovered, recurring
    games_missed INTEGER,
    previous_same_injury BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create sharp_money_tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS sharp_money_tracking (
    id SERIAL PRIMARY KEY,
    game_id INTEGER,
    sport VARCHAR(50),
    bet_type VARCHAR(50), -- spread, moneyline, total
    sharp_side VARCHAR(50), -- home, away, over, under
    sharp_percentage DECIMAL(5, 2),
    public_percentage DECIMAL(5, 2),
    money_percentage DECIMAL(5, 2),
    ticket_percentage DECIMAL(5, 2),
    steam_move BOOLEAN DEFAULT FALSE,
    reverse_line_movement BOOLEAN DEFAULT FALSE,
    line_freeze BOOLEAN DEFAULT FALSE,
    syndicate_bet_detected BOOLEAN DEFAULT FALSE,
    consensus_pick VARCHAR(50),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create line_movements table if it doesn't exist
CREATE TABLE IF NOT EXISTS line_movements (
    id SERIAL PRIMARY KEY,
    game_id INTEGER,
    sport VARCHAR(50),
    bookmaker VARCHAR(100),
    bet_type VARCHAR(50),
    opening_line DECIMAL(8, 2),
    current_line DECIMAL(8, 2),
    closing_line DECIMAL(8, 2),
    opening_odds INTEGER,
    current_odds INTEGER,
    closing_odds INTEGER,
    movement_count INTEGER,
    max_line DECIMAL(8, 2),
    min_line DECIMAL(8, 2),
    steam_moves JSONB, -- Array of steam move events
    key_numbers_crossed INTEGER, -- How many key numbers the line crossed
    movement_history JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create weather_conditions table if it doesn't exist
CREATE TABLE IF NOT EXISTS weather_conditions (
    id SERIAL PRIMARY KEY,
    game_id INTEGER,
    venue_id INTEGER,
    game_time TIMESTAMPTZ,
    temperature_f INTEGER,
    wind_speed_mph INTEGER,
    wind_direction VARCHAR(10),
    humidity_percentage INTEGER,
    precipitation_chance INTEGER,
    precipitation_type VARCHAR(50), -- rain, snow, sleet
    visibility_miles DECIMAL(4, 1),
    pressure_mb DECIMAL(6, 2),
    conditions VARCHAR(100), -- clear, cloudy, rain, snow
    dome_open BOOLEAN,
    impact_on_total DECIMAL(3, 2), -- -1 to 1 scale
    impact_on_passing DECIMAL(3, 2),
    impact_on_kicking DECIMAL(3, 2),
    forecast_confidence DECIMAL(3, 2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create closing_line_value table if it doesn't exist
CREATE TABLE IF NOT EXISTS closing_line_value (
    id SERIAL PRIMARY KEY,
    game_id INTEGER,
    sport VARCHAR(50),
    bet_type VARCHAR(50),
    bet_placed_line DECIMAL(8, 2),
    bet_placed_odds INTEGER,
    closing_line DECIMAL(8, 2),
    closing_odds INTEGER,
    clv_percentage DECIMAL(5, 2), -- Positive means you beat the closing line
    result VARCHAR(20), -- win, loss, push
    profit_loss DECIMAL(10, 2),
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create head_to_head_ml table if it doesn't exist
CREATE TABLE IF NOT EXISTS head_to_head_ml (
    id SERIAL PRIMARY KEY,
    team1_id INTEGER,
    team2_id INTEGER,
    sport VARCHAR(50),
    total_games INTEGER,
    team1_wins INTEGER,
    team2_wins INTEGER,
    team1_home_wins INTEGER,
    team1_away_wins INTEGER,
    team2_home_wins INTEGER,
    team2_away_wins INTEGER,
    avg_total_points DECIMAL(6, 2),
    avg_point_differential DECIMAL(5, 2),
    last_meeting_date DATE,
    last_meeting_winner INTEGER,
    current_streak_team INTEGER,
    current_streak_count INTEGER,
    playoffs_meetings INTEGER,
    overtime_games INTEGER,
    one_possession_games INTEGER,
    blowout_games INTEGER, -- Games decided by 20+ points
    avg_betting_total DECIMAL(6, 2),
    over_percentage DECIMAL(5, 2),
    favorite_cover_percentage DECIMAL(5, 2),
    home_cover_percentage DECIMAL(5, 2),
    recent_meetings JSONB, -- Last 10 meetings details
    notable_trends JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create historical_matchups table if it doesn't exist
CREATE TABLE IF NOT EXISTS historical_matchups (
    id SERIAL PRIMARY KEY,
    game_id INTEGER,
    sport VARCHAR(50),
    team1_id INTEGER,
    team2_id INTEGER,
    game_date DATE,
    team1_score INTEGER,
    team2_score INTEGER,
    winner_id INTEGER,
    spread_result DECIMAL(5, 1),
    total_points INTEGER,
    venue_id INTEGER,
    playoff_game BOOLEAN DEFAULT FALSE,
    overtime BOOLEAN DEFAULT FALSE,
    season VARCHAR(20),
    week_number INTEGER,
    key_injuries JSONB,
    weather_conditions JSONB,
    referee_crew JSONB,
    betting_results JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create patterns table if it doesn't exist
CREATE TABLE IF NOT EXISTS patterns (
    id SERIAL PRIMARY KEY,
    pattern_name VARCHAR(255) NOT NULL,
    pattern_type VARCHAR(100), -- situational, statistical, behavioral
    sport VARCHAR(50),
    description TEXT,
    conditions JSONB, -- Conditions that define the pattern
    expected_outcome JSONB,
    confidence_threshold DECIMAL(3, 2),
    min_sample_size INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create pattern_occurrences table if it doesn't exist
CREATE TABLE IF NOT EXISTS pattern_occurrences (
    id SERIAL PRIMARY KEY,
    pattern_id INTEGER REFERENCES patterns(id),
    game_id INTEGER,
    detected_at TIMESTAMPTZ,
    confidence_score DECIMAL(3, 2),
    pattern_data JSONB,
    outcome_correct BOOLEAN,
    profit_loss DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create parlay_correlations_ml table if it doesn't exist
CREATE TABLE IF NOT EXISTS parlay_correlations_ml (
    id SERIAL PRIMARY KEY,
    sport VARCHAR(50),
    bet_type1 VARCHAR(100),
    bet_type2 VARCHAR(100),
    correlation_coefficient DECIMAL(4, 3), -- -1 to 1
    sample_size INTEGER,
    win_rate_together DECIMAL(5, 2),
    win_rate_separate DECIMAL(5, 2),
    expected_value DECIMAL(5, 2),
    confidence_level DECIMAL(3, 2),
    last_calculated TIMESTAMPTZ,
    season VARCHAR(20),
    notes JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coaches_team ON coaches(team_id);
CREATE INDEX IF NOT EXISTS idx_coaches_sport ON coaches(sport);
CREATE INDEX IF NOT EXISTS idx_referees_sport ON referees(sport);
CREATE INDEX IF NOT EXISTS idx_venues_name ON venues(name);
CREATE INDEX IF NOT EXISTS idx_injuries_player ON player_injuries(player_id);
CREATE INDEX IF NOT EXISTS idx_injuries_status ON player_injuries(status);
CREATE INDEX IF NOT EXISTS idx_sharp_money_game ON sharp_money_tracking(game_id);
CREATE INDEX IF NOT EXISTS idx_line_movements_game ON line_movements(game_id);
CREATE INDEX IF NOT EXISTS idx_weather_game ON weather_conditions(game_id);
CREATE INDEX IF NOT EXISTS idx_clv_game ON closing_line_value(game_id);
CREATE INDEX IF NOT EXISTS idx_h2h_teams ON head_to_head_ml(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_matchups_teams ON historical_matchups(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_pattern_occurrences_pattern ON pattern_occurrences(pattern_id);
CREATE INDEX IF NOT EXISTS idx_parlay_correlations ON parlay_correlations_ml(sport, bet_type1, bet_type2);

-- Add comments for documentation
COMMENT ON TABLE coaches IS 'Coaching staff data with tendencies and performance metrics';
COMMENT ON TABLE referees IS 'Referee tendencies and bias analysis';
COMMENT ON TABLE venues IS 'Stadium/arena information with environmental factors';
COMMENT ON TABLE player_injuries IS 'Player injury tracking with probability to play';
COMMENT ON TABLE sharp_money_tracking IS 'Sharp vs public money movement tracking';
COMMENT ON TABLE line_movements IS 'Detailed line movement history with steam moves';
COMMENT ON TABLE weather_conditions IS 'Weather data and impact on game outcomes';
COMMENT ON TABLE closing_line_value IS 'CLV tracking for bet quality analysis';
COMMENT ON TABLE head_to_head_ml IS 'Historical matchup data for ML predictions';
COMMENT ON TABLE historical_matchups IS 'Detailed game-by-game matchup history';
COMMENT ON TABLE patterns IS 'Betting patterns and situational trends';
COMMENT ON TABLE pattern_occurrences IS 'Pattern detection and outcome tracking';
COMMENT ON TABLE parlay_correlations_ml IS 'Correlation analysis for parlay optimization';