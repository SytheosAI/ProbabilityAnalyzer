-- Comprehensive Database Schema for Probability Analyzer (FIXED)
-- Designed for PostgreSQL 14+ 
-- Fixed partitioning issues - partition key included in all primary keys

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- For composite indexes

-- =====================================================
-- CORE SPORTS DATA TABLES
-- =====================================================

-- Sports master table
CREATE TABLE sports (
    sport_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_name VARCHAR(50) UNIQUE NOT NULL,
    sport_code VARCHAR(10) UNIQUE NOT NULL, -- NFL, NBA, MLB, NHL, etc.
    season_type VARCHAR(20), -- regular, playoff, preseason
    active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sports_code ON sports(sport_code);
CREATE INDEX idx_sports_active ON sports(active) WHERE active = true;

-- Teams master table
CREATE TABLE teams (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_id UUID REFERENCES sports(sport_id),
    team_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(10),
    city VARCHAR(100),
    conference VARCHAR(50),
    division VARCHAR(50),
    venue_id UUID,
    elo_rating DECIMAL(10,2),
    power_rating DECIMAL(10,2),
    offensive_rating DECIMAL(10,2),
    defensive_rating DECIMAL(10,2),
    pace_rating DECIMAL(10,2),
    home_field_advantage DECIMAL(5,2),
    metadata JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sport_id, team_code)
);

CREATE INDEX idx_teams_sport ON teams(sport_id);
CREATE INDEX idx_teams_code ON teams(team_code);
CREATE INDEX idx_teams_active ON teams(sport_id, active) WHERE active = true;

-- Players master table
CREATE TABLE players (
    player_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(team_id),
    sport_id UUID REFERENCES sports(sport_id),
    player_name VARCHAR(100) NOT NULL,
    jersey_number VARCHAR(5),
    position VARCHAR(20),
    height_cm INTEGER,
    weight_kg INTEGER,
    birth_date DATE,
    years_pro INTEGER,
    injury_status VARCHAR(50),
    injury_details TEXT,
    player_rating DECIMAL(5,2),
    metadata JSONB,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_sport ON players(sport_id);
CREATE INDEX idx_players_name ON players(player_name);
CREATE INDEX idx_players_active ON players(team_id, active) WHERE active = true;

-- Venues table
CREATE TABLE venues (
    venue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    capacity INTEGER,
    surface_type VARCHAR(50), -- grass, turf, court, ice
    indoor BOOLEAN,
    altitude_meters INTEGER,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venues_location ON venues(city, state);

-- =====================================================
-- GAMES AND SCHEDULES (PARTITIONED BY DATE)
-- =====================================================

-- Games table (partitioned by month for optimal performance)
-- FIXED: Primary key now includes the partition key (game_date)
CREATE TABLE games (
    game_id UUID DEFAULT uuid_generate_v4(),
    game_date DATE NOT NULL,
    sport_id UUID REFERENCES sports(sport_id),
    season_year INTEGER NOT NULL,
    season_type VARCHAR(20), -- regular, playoff, preseason
    week_number INTEGER,
    game_time TIMESTAMP WITH TIME ZONE NOT NULL,
    home_team_id UUID REFERENCES teams(team_id),
    away_team_id UUID REFERENCES teams(team_id),
    venue_id UUID REFERENCES venues(venue_id),
    home_score INTEGER,
    away_score INTEGER,
    game_status VARCHAR(20), -- scheduled, in_progress, completed, postponed
    quarter_period INTEGER,
    time_remaining VARCHAR(10),
    weather_game_id UUID,
    attendance INTEGER,
    game_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, game_date)  -- Partition key included
) PARTITION BY RANGE (game_date);

-- Create partitions for games (example for 2024-2025)
CREATE TABLE games_2024_01 PARTITION OF games FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE games_2024_02 PARTITION OF games FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE games_2024_03 PARTITION OF games FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE games_2024_04 PARTITION OF games FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE games_2024_05 PARTITION OF games FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE games_2024_06 PARTITION OF games FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE games_2024_07 PARTITION OF games FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE games_2024_08 PARTITION OF games FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE games_2024_09 PARTITION OF games FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE games_2024_10 PARTITION OF games FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE games_2024_11 PARTITION OF games FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE games_2024_12 PARTITION OF games FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE games_2025_01 PARTITION OF games FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id, game_date);
CREATE INDEX idx_games_sport_date ON games(sport_id, game_date);
CREATE INDEX idx_games_status ON games(game_status) WHERE game_status IN ('scheduled', 'in_progress');

-- =====================================================
-- COMPREHENSIVE STATISTICS TABLES
-- =====================================================

-- Team statistics table
CREATE TABLE team_statistics (
    stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(team_id),
    game_id UUID,
    game_date DATE NOT NULL,
    opponent_id UUID REFERENCES teams(team_id),
    is_home BOOLEAN,
    -- Universal stats
    points_scored INTEGER,
    points_allowed INTEGER,
    -- NFL specific
    total_yards INTEGER,
    passing_yards INTEGER,
    rushing_yards INTEGER,
    turnovers INTEGER,
    time_of_possession INTERVAL,
    third_down_pct DECIMAL(5,2),
    red_zone_pct DECIMAL(5,2),
    -- NBA specific
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    three_pointers_made INTEGER,
    three_pointers_attempted INTEGER,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    rebounds_total INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    -- MLB specific
    hits INTEGER,
    runs INTEGER,
    errors INTEGER,
    innings_pitched DECIMAL(5,2),
    strikeouts INTEGER,
    walks INTEGER,
    -- NHL specific
    goals INTEGER,
    shots_on_goal INTEGER,
    power_play_goals INTEGER,
    penalty_minutes INTEGER,
    faceoff_win_pct DECIMAL(5,2),
    -- Advanced metrics
    efficiency_rating DECIMAL(10,2),
    pace DECIMAL(10,2),
    true_shooting_pct DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_stats_team_date ON team_statistics(team_id, game_date DESC);
CREATE INDEX idx_team_stats_game ON team_statistics(game_id);

-- Player statistics table
CREATE TABLE player_statistics (
    stat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player_id UUID REFERENCES players(player_id),
    team_id UUID REFERENCES teams(team_id),
    game_id UUID,
    game_date DATE NOT NULL,
    minutes_played DECIMAL(5,2),
    -- NFL QB stats
    passing_attempts INTEGER,
    passing_completions INTEGER,
    passing_yards INTEGER,
    passing_touchdowns INTEGER,
    interceptions INTEGER,
    qb_rating DECIMAL(5,2),
    -- NFL RB/WR stats
    rushing_attempts INTEGER,
    rushing_yards INTEGER,
    rushing_touchdowns INTEGER,
    receptions INTEGER,
    receiving_yards INTEGER,
    receiving_touchdowns INTEGER,
    targets INTEGER,
    -- NFL Defense stats
    tackles INTEGER,
    sacks DECIMAL(5,2),
    forced_fumbles INTEGER,
    -- NBA stats
    points INTEGER,
    rebounds INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    three_pointers_made INTEGER,
    three_pointers_attempted INTEGER,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    plus_minus INTEGER,
    -- MLB Batting stats
    at_bats INTEGER,
    hits INTEGER,
    runs INTEGER,
    rbis INTEGER,
    home_runs INTEGER,
    stolen_bases INTEGER,
    batting_average DECIMAL(4,3),
    -- MLB Pitching stats
    innings_pitched DECIMAL(5,2),
    strikeouts INTEGER,
    walks INTEGER,
    earned_runs INTEGER,
    era DECIMAL(5,2),
    whip DECIMAL(5,2),
    -- NHL stats
    goals INTEGER,
    hockey_assists INTEGER,
    shots INTEGER,
    penalty_minutes INTEGER,
    plus_minus_hockey INTEGER,
    faceoffs_won INTEGER,
    faceoffs_lost INTEGER,
    -- Universal advanced
    usage_rate DECIMAL(5,2),
    fantasy_points DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_stats_player_date ON player_statistics(player_id, game_date DESC);
CREATE INDEX idx_player_stats_game ON player_statistics(game_id);
CREATE INDEX idx_player_stats_team ON player_statistics(team_id, game_date DESC);

-- =====================================================
-- BETTING AND ODDS DATA (HEAVY TIME-SERIES)
-- =====================================================

-- Bookmakers table
CREATE TABLE bookmakers (
    bookmaker_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bookmaker_name VARCHAR(100) UNIQUE NOT NULL,
    bookmaker_code VARCHAR(20) UNIQUE NOT NULL,
    api_endpoint VARCHAR(255),
    credibility_score DECIMAL(5,2),
    average_margin DECIMAL(5,2),
    active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookmakers_active ON bookmakers(active) WHERE active = true;

-- Odds history table (partitioned by day for high-volume data)
-- FIXED: Primary key includes partition key
CREATE TABLE odds_history (
    odds_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    game_id UUID,
    bookmaker_id UUID REFERENCES bookmakers(bookmaker_id),
    market_type VARCHAR(50) NOT NULL, -- moneyline, spread, total, prop
    -- Moneyline
    home_moneyline INTEGER,
    away_moneyline INTEGER,
    -- Spread
    home_spread DECIMAL(5,1),
    home_spread_odds INTEGER,
    away_spread DECIMAL(5,1),
    away_spread_odds INTEGER,
    -- Totals
    total_points DECIMAL(5,1),
    over_odds INTEGER,
    under_odds INTEGER,
    -- Props
    prop_type VARCHAR(100),
    prop_value DECIMAL(10,2),
    prop_odds INTEGER,
    -- Meta
    is_live BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (odds_id, timestamp)  -- Partition key included
) PARTITION BY RANGE (timestamp);

-- Create daily partitions for odds (example for January 2025)
CREATE TABLE odds_history_2025_01_01 PARTITION OF odds_history 
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-01-02 00:00:00+00');
CREATE TABLE odds_history_2025_01_02 PARTITION OF odds_history 
    FOR VALUES FROM ('2025-01-02 00:00:00+00') TO ('2025-01-03 00:00:00+00');
CREATE TABLE odds_history_2025_01_03 PARTITION OF odds_history 
    FOR VALUES FROM ('2025-01-03 00:00:00+00') TO ('2025-01-04 00:00:00+00');
-- Continue creating daily partitions as needed...

CREATE INDEX idx_odds_game_time ON odds_history(game_id, timestamp DESC);
CREATE INDEX idx_odds_bookmaker ON odds_history(bookmaker_id, timestamp DESC);
CREATE INDEX idx_odds_market ON odds_history(market_type, timestamp DESC);

-- Current odds table (real-time snapshot)
CREATE TABLE current_odds (
    game_id UUID,
    bookmaker_id UUID REFERENCES bookmakers(bookmaker_id),
    market_type VARCHAR(50) NOT NULL,
    home_moneyline INTEGER,
    away_moneyline INTEGER,
    home_spread DECIMAL(5,1),
    home_spread_odds INTEGER,
    away_spread DECIMAL(5,1),
    away_spread_odds INTEGER,
    total_points DECIMAL(5,1),
    over_odds INTEGER,
    under_odds INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, bookmaker_id, market_type)
);

CREATE INDEX idx_current_odds_game ON current_odds(game_id);
CREATE INDEX idx_current_odds_updated ON current_odds(last_updated DESC);

-- Line movements tracking (partitioned)
-- FIXED: Primary key includes partition key
CREATE TABLE line_movements (
    movement_id UUID DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    game_id UUID,
    bookmaker_id UUID REFERENCES bookmakers(bookmaker_id),
    market_type VARCHAR(50),
    old_value DECIMAL(10,2),
    new_value DECIMAL(10,2),
    old_odds INTEGER,
    new_odds INTEGER,
    movement_size DECIMAL(10,2),
    movement_direction VARCHAR(10), -- up, down, neutral
    trigger_type VARCHAR(50), -- sharp_money, public_betting, injury, weather
    sharp_action BOOLEAN,
    steam_move BOOLEAN,
    reverse_line_movement BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movement_id, timestamp)  -- Partition key included
) PARTITION BY RANGE (timestamp);

-- Create daily partitions for line movements
CREATE TABLE line_movements_2025_01_01 PARTITION OF line_movements 
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-01-02 00:00:00+00');
CREATE TABLE line_movements_2025_01_02 PARTITION OF line_movements 
    FOR VALUES FROM ('2025-01-02 00:00:00+00') TO ('2025-01-03 00:00:00+00');

CREATE INDEX idx_line_movements_game ON line_movements(game_id, timestamp DESC);
CREATE INDEX idx_line_movements_sharp ON line_movements(sharp_action, timestamp DESC) 
    WHERE sharp_action = true;
CREATE INDEX idx_line_movements_steam ON line_movements(steam_move, timestamp DESC) 
    WHERE steam_move = true;

-- Public betting percentages
CREATE TABLE public_betting (
    game_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    bet_type VARCHAR(50), -- moneyline, spread, total
    home_percentage DECIMAL(5,2),
    away_percentage DECIMAL(5,2),
    over_percentage DECIMAL(5,2),
    under_percentage DECIMAL(5,2),
    total_bets INTEGER,
    total_money DECIMAL(15,2),
    sharp_side VARCHAR(20),
    public_side VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (game_id, timestamp, bet_type)
);

CREATE INDEX idx_public_betting_game ON public_betting(game_id, timestamp DESC);

-- =====================================================
-- MACHINE LEARNING AND PREDICTIONS
-- =====================================================

-- ML models registry
CREATE TABLE ml_models (
    model_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50), -- xgboost, lightgbm, neural_network, ensemble
    sport_id UUID REFERENCES sports(sport_id),
    version VARCHAR(20),
    accuracy DECIMAL(5,2),
    precision_score DECIMAL(5,2),
    recall_score DECIMAL(5,2),
    f1_score DECIMAL(5,2),
    auc_roc DECIMAL(5,2),
    training_date TIMESTAMP WITH TIME ZONE,
    training_samples INTEGER,
    feature_importance JSONB,
    hyperparameters JSONB,
    model_path VARCHAR(255),
    active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_models_active ON ml_models(sport_id, active) WHERE active = true;
CREATE INDEX idx_ml_models_type ON ml_models(model_type, active);

-- ML predictions
CREATE TABLE ml_predictions (
    prediction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID REFERENCES ml_models(model_id),
    game_id UUID,
    prediction_type VARCHAR(50), -- winner, spread, total, prop
    prediction_value JSONB, -- Flexible structure for different prediction types
    probability DECIMAL(5,2),
    confidence DECIMAL(5,2),
    expected_value DECIMAL(10,2),
    kelly_criterion DECIMAL(5,2),
    features_used JSONB,
    prediction_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actual_result JSONB,
    is_correct BOOLEAN,
    profit_loss DECIMAL(10,2),
    metadata JSONB
);

CREATE INDEX idx_ml_predictions_game ON ml_predictions(game_id);
CREATE INDEX idx_ml_predictions_model ON ml_predictions(model_id, prediction_timestamp DESC);
CREATE INDEX idx_ml_predictions_correct ON ml_predictions(is_correct, prediction_timestamp DESC);

-- Feature store for ML
CREATE TABLE ml_features (
    feature_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50), -- team, player, game, matchup
    entity_id UUID,
    feature_name VARCHAR(100),
    feature_value DECIMAL(20,6),
    feature_timestamp TIMESTAMP WITH TIME ZONE,
    calculation_method VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_features_entity ON ml_features(entity_type, entity_id, feature_timestamp DESC);
CREATE INDEX idx_ml_features_name ON ml_features(feature_name, feature_timestamp DESC);

-- Training data for continuous learning
CREATE TABLE ml_training_data (
    training_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_type VARCHAR(50),
    sport_id UUID REFERENCES sports(sport_id),
    features JSONB NOT NULL,
    target JSONB NOT NULL,
    game_id UUID,
    game_date DATE,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_training_sport ON ml_training_data(sport_id, created_at DESC);
CREATE INDEX idx_ml_training_unused ON ml_training_data(is_used, created_at) WHERE is_used = false;

-- =====================================================
-- PATTERN RECOGNITION AND ANALYSIS
-- =====================================================

-- Patterns library
CREATE TABLE patterns (
    pattern_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50), -- price_movement, team_performance, weather_impact
    sport_id UUID REFERENCES sports(sport_id),
    pattern_definition JSONB,
    min_confidence DECIMAL(5,2),
    historical_accuracy DECIMAL(5,2),
    total_occurrences INTEGER,
    profitable_occurrences INTEGER,
    average_roi DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patterns_type ON patterns(pattern_type, sport_id);
CREATE INDEX idx_patterns_active ON patterns(active) WHERE active = true;

-- Pattern occurrences
CREATE TABLE pattern_occurrences (
    occurrence_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID REFERENCES patterns(pattern_id),
    game_id UUID,
    detection_timestamp TIMESTAMP WITH TIME ZONE,
    confidence_score DECIMAL(5,2),
    pattern_data JSONB,
    outcome JSONB,
    profit_loss DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pattern_occ_pattern ON pattern_occurrences(pattern_id, detection_timestamp DESC);
CREATE INDEX idx_pattern_occ_game ON pattern_occurrences(game_id);

-- =====================================================
-- ARBITRAGE AND VALUE BETTING
-- =====================================================

-- Arbitrage opportunities
CREATE TABLE arbitrage_opportunities (
    arbitrage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID,
    detection_timestamp TIMESTAMP WITH TIME ZONE,
    market_type VARCHAR(50),
    bookmaker_1_id UUID REFERENCES bookmakers(bookmaker_id),
    bookmaker_1_odds DECIMAL(10,2),
    bookmaker_1_side VARCHAR(50),
    bookmaker_2_id UUID REFERENCES bookmakers(bookmaker_id),
    bookmaker_2_odds DECIMAL(10,2),
    bookmaker_2_side VARCHAR(50),
    bookmaker_3_id UUID REFERENCES bookmakers(bookmaker_id),
    bookmaker_3_odds DECIMAL(10,2),
    bookmaker_3_side VARCHAR(50),
    arbitrage_percentage DECIMAL(5,2),
    profit_margin DECIMAL(5,2),
    total_stake_required DECIMAL(10,2),
    stake_distribution JSONB,
    guaranteed_profit DECIMAL(10,2),
    execution_window_seconds INTEGER,
    is_executed BOOLEAN DEFAULT false,
    execution_result JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_arbitrage_game ON arbitrage_opportunities(game_id, detection_timestamp DESC);
CREATE INDEX idx_arbitrage_profit ON arbitrage_opportunities(profit_margin DESC);
CREATE INDEX idx_arbitrage_unexecuted ON arbitrage_opportunities(is_executed, detection_timestamp DESC) 
    WHERE is_executed = false;

-- Expected value calculations
CREATE TABLE expected_value_bets (
    ev_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID,
    bookmaker_id UUID REFERENCES bookmakers(bookmaker_id),
    calculation_timestamp TIMESTAMP WITH TIME ZONE,
    market_type VARCHAR(50),
    bet_side VARCHAR(50),
    odds DECIMAL(10,2),
    true_probability DECIMAL(5,2),
    implied_probability DECIMAL(5,2),
    expected_value DECIMAL(10,2),
    kelly_percentage DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    model_consensus JSONB,
    is_bet_placed BOOLEAN DEFAULT false,
    bet_result VARCHAR(20),
    actual_profit_loss DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ev_game ON expected_value_bets(game_id, calculation_timestamp DESC);
CREATE INDEX idx_ev_positive ON expected_value_bets(expected_value, calculation_timestamp DESC) 
    WHERE expected_value > 0;

-- =====================================================
-- PARLAY OPTIMIZATION
-- =====================================================

-- Parlay combinations
CREATE TABLE parlay_combinations (
    parlay_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creation_timestamp TIMESTAMP WITH TIME ZONE,
    sport_mix JSONB, -- {NFL: 2, NBA: 1, MLB: 0}
    total_legs INTEGER,
    game_ids UUID[],
    selections JSONB, -- Detailed selection for each leg
    combined_odds DECIMAL(10,2),
    total_probability DECIMAL(5,2),
    correlation_factor DECIMAL(5,2),
    expected_value DECIMAL(10,2),
    kelly_stake DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    risk_level VARCHAR(20), -- low, medium, high
    is_recommended BOOLEAN,
    recommendation_reason TEXT,
    actual_result VARCHAR(20),
    profit_loss DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parlay_legs ON parlay_combinations(total_legs);
CREATE INDEX idx_parlay_ev ON parlay_combinations(expected_value DESC);
CREATE INDEX idx_parlay_recommended ON parlay_combinations(is_recommended, creation_timestamp DESC) 
    WHERE is_recommended = true;

-- Correlation matrix for parlay optimization
-- FIXED: Removed duplicate PRIMARY KEY specification
CREATE TABLE correlation_matrix (
    entity_1_type VARCHAR(50), -- team, player, market
    entity_1_id VARCHAR(100),
    entity_2_type VARCHAR(50),
    entity_2_id VARCHAR(100),
    correlation_coefficient DECIMAL(5,4),
    sample_size INTEGER,
    confidence_interval_lower DECIMAL(5,4),
    confidence_interval_upper DECIMAL(5,4),
    last_updated TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    PRIMARY KEY (entity_1_type, entity_1_id, entity_2_type, entity_2_id)
);

CREATE INDEX idx_correlation_entities ON correlation_matrix(entity_1_id, entity_2_id);

-- =====================================================
-- WEATHER AND ENVIRONMENTAL DATA
-- =====================================================

-- Weather conditions
CREATE TABLE weather_conditions (
    weather_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID,
    venue_id UUID REFERENCES venues(venue_id),
    observation_time TIMESTAMP WITH TIME ZONE,
    temperature_celsius DECIMAL(5,2),
    feels_like_celsius DECIMAL(5,2),
    humidity_percentage DECIMAL(5,2),
    wind_speed_kmh DECIMAL(5,2),
    wind_direction_degrees INTEGER,
    precipitation_mm DECIMAL(5,2),
    precipitation_type VARCHAR(20), -- rain, snow, sleet
    visibility_km DECIMAL(5,2),
    pressure_hpa DECIMAL(6,2),
    cloud_coverage_percentage DECIMAL(5,2),
    weather_condition VARCHAR(50),
    weather_impact_score DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weather_game ON weather_conditions(game_id);
CREATE INDEX idx_weather_venue ON weather_conditions(venue_id, observation_time DESC);

-- Weather impact analysis
CREATE TABLE weather_impacts (
    impact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sport_id UUID REFERENCES sports(sport_id),
    weather_condition VARCHAR(50),
    impact_type VARCHAR(50), -- scoring, turnovers, injuries
    impact_magnitude DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    sample_size INTEGER,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weather_impacts_sport ON weather_impacts(sport_id, weather_condition);

-- =====================================================
-- WEEKLY LEARNING SYSTEM
-- =====================================================

-- Weekly learning cycles
CREATE TABLE learning_cycles (
    cycle_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE,
    week_end_date DATE,
    sport_id UUID REFERENCES sports(sport_id),
    total_predictions INTEGER,
    correct_predictions INTEGER,
    accuracy DECIMAL(5,2),
    total_ev_bets INTEGER,
    profitable_ev_bets INTEGER,
    total_profit_loss DECIMAL(10,2),
    roi_percentage DECIMAL(5,2),
    patterns_discovered INTEGER,
    model_updates INTEGER,
    key_insights JSONB,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_cycles_week ON learning_cycles(week_start_date DESC);
CREATE INDEX idx_learning_cycles_sport ON learning_cycles(sport_id, week_start_date DESC);

-- Learning feedback
CREATE TABLE learning_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cycle_id UUID REFERENCES learning_cycles(cycle_id),
    feedback_type VARCHAR(50), -- model_performance, pattern_accuracy, strategy_effectiveness
    entity_id UUID,
    entity_type VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value DECIMAL(20,6),
    improvement_suggestion TEXT,
    is_implemented BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_feedback_cycle ON learning_feedback(cycle_id);
CREATE INDEX idx_learning_feedback_type ON learning_feedback(feedback_type, created_at DESC);

-- =====================================================
-- USER AND SYSTEM MANAGEMENT
-- =====================================================

-- System configuration
CREATE TABLE system_configuration (
    config_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB,
    config_type VARCHAR(50),
    is_encrypted BOOLEAN DEFAULT false,
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    modified_by VARCHAR(100)
);

CREATE INDEX idx_system_config_key ON system_configuration(config_key);

-- API keys and rate limits
CREATE TABLE api_configurations (
    api_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_name VARCHAR(100) UNIQUE NOT NULL,
    api_key_encrypted TEXT,
    base_url VARCHAR(255),
    rate_limit_per_minute INTEGER,
    rate_limit_per_day INTEGER,
    current_usage_minute INTEGER DEFAULT 0,
    current_usage_day INTEGER DEFAULT 0,
    last_reset_minute TIMESTAMP WITH TIME ZONE,
    last_reset_day DATE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_config_active ON api_configurations(is_active) WHERE is_active = true;

-- Audit logs
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    user_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- =====================================================
-- CACHING AND PERFORMANCE
-- =====================================================

-- Query cache
CREATE TABLE query_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    cache_value JSONB,
    expiry_time TIMESTAMP WITH TIME ZONE,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_query_cache_expiry ON query_cache(expiry_time);

-- Performance metrics
CREATE TABLE performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value DECIMAL(20,6),
    measurement_timestamp TIMESTAMP WITH TIME ZONE,
    metadata JSONB
);

CREATE INDEX idx_performance_metrics ON performance_metrics(metric_type, measurement_timestamp DESC);

-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =====================================================

-- Team performance summary
CREATE MATERIALIZED VIEW team_performance_summary AS
SELECT 
    t.team_id,
    t.team_name,
    t.sport_id,
    COUNT(DISTINCT CASE WHEN g.home_team_id = t.team_id THEN g.game_id END) as home_games,
    COUNT(DISTINCT CASE WHEN g.away_team_id = t.team_id THEN g.game_id END) as away_games,
    AVG(CASE WHEN g.home_team_id = t.team_id THEN g.home_score 
             WHEN g.away_team_id = t.team_id THEN g.away_score END) as avg_points_scored,
    AVG(CASE WHEN g.home_team_id = t.team_id THEN g.away_score 
             WHEN g.away_team_id = t.team_id THEN g.home_score END) as avg_points_allowed,
    COUNT(DISTINCT CASE WHEN g.home_team_id = t.team_id AND g.home_score > g.away_score THEN g.game_id
                        WHEN g.away_team_id = t.team_id AND g.away_score > g.home_score THEN g.game_id END) as wins,
    COUNT(DISTINCT CASE WHEN g.home_team_id = t.team_id AND g.home_score < g.away_score THEN g.game_id
                        WHEN g.away_team_id = t.team_id AND g.away_score < g.home_score THEN g.game_id END) as losses
FROM teams t
LEFT JOIN games g ON (g.home_team_id = t.team_id OR g.away_team_id = t.team_id)
WHERE g.game_status = 'completed'
GROUP BY t.team_id, t.team_name, t.sport_id;

CREATE UNIQUE INDEX idx_team_perf_summary ON team_performance_summary(team_id);

-- Bookmaker accuracy summary
CREATE MATERIALIZED VIEW bookmaker_accuracy AS
SELECT 
    b.bookmaker_id,
    b.bookmaker_name,
    COUNT(DISTINCT oh.game_id) as total_games,
    AVG(ABS(oh.home_spread)) as avg_spread_accuracy,
    AVG(oh.home_moneyline) as avg_moneyline_juice,
    b.credibility_score
FROM bookmakers b
JOIN odds_history oh ON oh.bookmaker_id = b.bookmaker_id
GROUP BY b.bookmaker_id, b.bookmaker_name, b.credibility_score;

CREATE UNIQUE INDEX idx_bookmaker_accuracy ON bookmaker_accuracy(bookmaker_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON sports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate ROI
CREATE OR REPLACE FUNCTION calculate_roi(
    total_profit DECIMAL,
    total_stake DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    IF total_stake = 0 THEN
        RETURN 0;
    END IF;
    RETURN (total_profit / total_stake) * 100;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate Kelly Criterion
CREATE OR REPLACE FUNCTION calculate_kelly_criterion(
    probability DECIMAL,
    odds DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    q DECIMAL;
    b DECIMAL;
    kelly DECIMAL;
BEGIN
    q := 1 - probability;
    b := odds - 1;
    kelly := (probability * b - q) / b;
    
    -- Cap Kelly at 25% for risk management
    IF kelly > 0.25 THEN
        kelly := 0.25;
    ELSIF kelly < 0 THEN
        kelly := 0;
    END IF;
    
    RETURN kelly;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- PARTITION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to automatically create monthly game partitions
CREATE OR REPLACE FUNCTION create_monthly_game_partitions(start_date DATE, end_date DATE)
RETURNS void AS $$
DECLARE
    partition_date DATE;
    partition_name TEXT;
    start_range DATE;
    end_range DATE;
BEGIN
    partition_date := start_date;
    
    WHILE partition_date < end_date LOOP
        partition_name := 'games_' || to_char(partition_date, 'YYYY_MM');
        start_range := partition_date;
        end_range := partition_date + INTERVAL '1 month';
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF games FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_range, end_range);
        
        partition_date := end_range;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create daily odds partitions
CREATE OR REPLACE FUNCTION create_daily_odds_partitions(start_date TIMESTAMP WITH TIME ZONE, num_days INTEGER)
RETURNS void AS $$
DECLARE
    partition_date TIMESTAMP WITH TIME ZONE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..num_days-1 LOOP
        partition_date := start_date + (i * INTERVAL '1 day');
        partition_name := 'odds_history_' || to_char(partition_date, 'YYYY_MM_DD');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF odds_history FOR VALUES FROM (%L) TO (%L)',
            partition_name, partition_date, partition_date + INTERVAL '1 day');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create daily line movement partitions  
CREATE OR REPLACE FUNCTION create_daily_line_movement_partitions(start_date TIMESTAMP WITH TIME ZONE, num_days INTEGER)
RETURNS void AS $$
DECLARE
    partition_date TIMESTAMP WITH TIME ZONE;
    partition_name TEXT;
    i INTEGER;
BEGIN
    FOR i IN 0..num_days-1 LOOP
        partition_date := start_date + (i * INTERVAL '1 day');
        partition_name := 'line_movements_' || to_char(partition_date, 'YYYY_MM_DD');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF line_movements FOR VALUES FROM (%L) TO (%L)',
            partition_name, partition_date, partition_date + INTERVAL '1 day');
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create partitions for the next 3 months
SELECT create_monthly_game_partitions('2025-01-01'::DATE, '2025-04-01'::DATE);

-- Create partitions for the next 30 days of odds
SELECT create_daily_odds_partitions('2025-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE, 30);

-- Create partitions for the next 30 days of line movements
SELECT create_daily_line_movement_partitions('2025-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE, 30);

-- =====================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================

-- BRIN indexes for time-series data (more efficient for large tables)
CREATE INDEX idx_odds_history_timestamp_brin ON odds_history USING BRIN(timestamp);
CREATE INDEX idx_line_movements_timestamp_brin ON line_movements USING BRIN(timestamp);

-- GIN indexes for JSONB columns
CREATE INDEX idx_games_metadata_gin ON games USING GIN(game_metadata);
CREATE INDEX idx_ml_predictions_features_gin ON ml_predictions USING GIN(features_used);
CREATE INDEX idx_patterns_definition_gin ON patterns USING GIN(pattern_definition);

-- Partial indexes for common queries
-- Note: For upcoming games, use a static date or remove the date filter from the partial index
CREATE INDEX idx_games_upcoming ON games(game_date, game_time) 
    WHERE game_status = 'scheduled';

CREATE INDEX idx_ml_models_best ON ml_models(sport_id, accuracy DESC) 
    WHERE active = true;

-- =====================================================
-- PERMISSIONS AND SECURITY
-- =====================================================

-- Create read-only role for analytics
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_reader') THEN
        CREATE ROLE analytics_reader;
    END IF;
END
$$;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;

-- Create application role with necessary permissions
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user;
    END IF;
END
$$;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Row-level security policies (example)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Procedure to clean old cache entries
CREATE OR REPLACE PROCEDURE clean_expired_cache()
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM query_cache WHERE expiry_time < CURRENT_TIMESTAMP;
    COMMIT;
END;
$$;

-- Procedure to refresh materialized views
CREATE OR REPLACE PROCEDURE refresh_materialized_views()
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY team_performance_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY bookmaker_accuracy;
    COMMIT;
END;
$$;

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert sports
INSERT INTO sports (sport_name, sport_code, season_type) VALUES
    ('National Football League', 'NFL', 'regular'),
    ('National Basketball Association', 'NBA', 'regular'),
    ('Major League Baseball', 'MLB', 'regular'),
    ('National Hockey League', 'NHL', 'regular'),
    ('Soccer', 'SOCCER', 'regular'),
    ('College Football', 'NCAAF', 'regular'),
    ('College Basketball', 'NCAAB', 'regular');

-- Insert bookmakers
INSERT INTO bookmakers (bookmaker_name, bookmaker_code, credibility_score) VALUES
    ('DraftKings', 'DK', 95.0),
    ('FanDuel', 'FD', 95.0),
    ('BetMGM', 'MGM', 93.0),
    ('Caesars', 'CZR', 92.0),
    ('PointsBet', 'PB', 90.0),
    ('BetRivers', 'BR', 88.0),
    ('Unibet', 'UB', 87.0),
    ('Bet365', 'B365', 96.0);

-- =====================================================
-- MONITORING AND ALERTS
-- =====================================================

-- Table for system alerts
CREATE TABLE system_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50),
    severity VARCHAR(20), -- info, warning, error, critical
    message TEXT,
    details JSONB,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_unresolved ON system_alerts(severity, created_at DESC) 
    WHERE is_resolved = false;

-- Comments for documentation
COMMENT ON TABLE games IS 'Core table storing all sports games/matches with partitioning by date';
COMMENT ON TABLE odds_history IS 'Time-series table for historical odds data, partitioned daily for performance';
COMMENT ON TABLE ml_predictions IS 'Stores all ML model predictions with confidence scores and actual results';
COMMENT ON TABLE arbitrage_opportunities IS 'Detected arbitrage opportunities across bookmakers';
COMMENT ON TABLE parlay_combinations IS 'Optimized parlay suggestions with correlation analysis';
COMMENT ON TABLE learning_cycles IS 'Weekly learning system tracking and improvements';

-- =====================================================
-- END OF SCHEMA
-- =====================================================