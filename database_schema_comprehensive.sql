-- ========================================
-- COMPREHENSIVE DATABASE SCHEMA FOR PROBABILITY ANALYZER
-- ========================================
-- This schema covers ALL data requirements identified in the codebase
-- Designed for PostgreSQL with support for time-series data and partitioning

-- ========================================
-- 1. SPORTS ENTITIES (Core Sports Data)
-- ========================================

-- Sports table
CREATE TABLE sports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL UNIQUE,
    category VARCHAR(50), -- 'team', 'individual', 'racing'
    season_type VARCHAR(20), -- 'regular', 'playoff', 'tournament'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sports_code ON sports(code);
CREATE INDEX idx_sports_active ON sports(is_active);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID REFERENCES sports(id),
    name VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10),
    city VARCHAR(100),
    venue_id UUID,
    conference VARCHAR(50),
    division VARCHAR(50),
    elo_rating DECIMAL(10,2),
    power_rating DECIMAL(10,2),
    offensive_rating DECIMAL(10,2),
    defensive_rating DECIMAL(10,2),
    pace_rating DECIMAL(10,2),
    current_form DECIMAL(5,2), -- 0-100 scale
    rest_days INTEGER,
    travel_distance DECIMAL(10,2),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_teams_sport ON teams(sport_id);
CREATE INDEX idx_teams_name ON teams(name);
CREATE INDEX idx_teams_abbreviation ON teams(abbreviation);
CREATE INDEX idx_teams_ratings ON teams(elo_rating, power_rating);

-- Players table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    sport_id UUID REFERENCES sports(id),
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50),
    jersey_number VARCHAR(10),
    age INTEGER,
    experience_years INTEGER,
    injury_status VARCHAR(50), -- 'healthy', 'questionable', 'doubtful', 'out'
    injury_details TEXT,
    form_rating DECIMAL(5,2), -- 0-100 current form
    salary DECIMAL(15,2),
    contract_years INTEGER,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_players_team ON players(team_id);
CREATE INDEX idx_players_sport ON players(sport_id);
CREATE INDEX idx_players_name ON players(name);
CREATE INDEX idx_players_injury ON players(injury_status);

-- Venues table
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50),
    capacity INTEGER,
    surface_type VARCHAR(50), -- 'grass', 'turf', 'court', 'ice'
    indoor BOOLEAN DEFAULT false,
    altitude DECIMAL(10,2),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    timezone VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_venues_location ON venues(city, state);
CREATE INDEX idx_venues_coords ON venues(latitude, longitude);

-- ========================================
-- 2. GAMES AND SCHEDULES
-- ========================================

-- Games table (partitioned by date)
CREATE TABLE games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID REFERENCES sports(id),
    home_team_id UUID REFERENCES teams(id),
    away_team_id UUID REFERENCES teams(id),
    venue_id UUID REFERENCES venues(id),
    game_date TIMESTAMP NOT NULL,
    season VARCHAR(20),
    week INTEGER,
    game_type VARCHAR(20), -- 'regular', 'playoff', 'championship'
    status VARCHAR(20), -- 'scheduled', 'in_progress', 'completed', 'postponed'
    home_score INTEGER,
    away_score INTEGER,
    overtime BOOLEAN DEFAULT false,
    attendance INTEGER,
    weather_id UUID,
    referee VARCHAR(100),
    importance_factor DECIMAL(5,2), -- Playoff multiplier, rivalry factor
    national_tv BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (game_date);

-- Create partitions for each month
CREATE TABLE games_2024_01 PARTITION OF games FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE games_2024_02 PARTITION OF games FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- Continue for all months...

CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_teams ON games(home_team_id, away_team_id);
CREATE INDEX idx_games_sport_date ON games(sport_id, game_date);
CREATE INDEX idx_games_status ON games(status);

-- ========================================
-- 3. ODDS AND BETTING DATA
-- ========================================

-- Bookmakers table
CREATE TABLE bookmakers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    region VARCHAR(50),
    commission_rate DECIMAL(5,4),
    max_bet_limit DECIMAL(15,2),
    min_bet_limit DECIMAL(15,2),
    trust_score DECIMAL(3,2), -- 0-10 scale
    is_sharp BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    api_endpoint VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookmakers_code ON bookmakers(code);
CREATE INDEX idx_bookmakers_sharp ON bookmakers(is_sharp);

-- Odds history table (partitioned by timestamp)
CREATE TABLE odds_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    bookmaker_id UUID REFERENCES bookmakers(id),
    market_type VARCHAR(50) NOT NULL, -- 'moneyline', 'spread', 'total', 'prop'
    outcome VARCHAR(100) NOT NULL,
    odds_american INTEGER,
    odds_decimal DECIMAL(10,4),
    line_value DECIMAL(10,2),
    implied_probability DECIMAL(5,4),
    timestamp TIMESTAMP NOT NULL,
    is_opening BOOLEAN DEFAULT false,
    is_closing BOOLEAN DEFAULT false,
    volume_indicator DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- Create partitions for each day
CREATE TABLE odds_history_2024_01_01 PARTITION OF odds_history 
    FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');
-- Continue for all days...

CREATE INDEX idx_odds_game_time ON odds_history(game_id, timestamp);
CREATE INDEX idx_odds_bookmaker ON odds_history(bookmaker_id, timestamp);
CREATE INDEX idx_odds_market ON odds_history(market_type, timestamp);

-- Line movements table
CREATE TABLE line_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    bookmaker_id UUID REFERENCES bookmakers(id),
    market_type VARCHAR(50),
    outcome VARCHAR(100),
    old_line DECIMAL(10,2),
    new_line DECIMAL(10,2),
    old_odds INTEGER,
    new_odds INTEGER,
    movement_percentage DECIMAL(10,4),
    movement_direction VARCHAR(10), -- 'up', 'down', 'stable'
    velocity DECIMAL(10,4), -- Rate of change
    acceleration DECIMAL(10,4),
    steam_move BOOLEAN DEFAULT false,
    reverse_line_movement BOOLEAN DEFAULT false,
    sharp_action BOOLEAN DEFAULT false,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movements_game ON line_movements(game_id, timestamp);
CREATE INDEX idx_movements_sharp ON line_movements(sharp_action, timestamp);
CREATE INDEX idx_movements_steam ON line_movements(steam_move, timestamp);

-- Public betting percentages
CREATE TABLE public_betting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    market_type VARCHAR(50),
    outcome VARCHAR(100),
    bet_percentage DECIMAL(5,2),
    money_percentage DECIMAL(5,2),
    bet_count INTEGER,
    total_volume DECIMAL(15,2),
    sharp_percentage DECIMAL(5,2),
    public_percentage DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_public_game ON public_betting(game_id, timestamp);
CREATE INDEX idx_public_volume ON public_betting(total_volume);

-- ========================================
-- 4. STATISTICAL DATA
-- ========================================

-- Player statistics (partitioned by game_date)
CREATE TABLE player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id),
    game_id UUID REFERENCES games(id),
    game_date TIMESTAMP NOT NULL,
    minutes_played DECIMAL(5,2),
    -- Basketball stats
    points INTEGER,
    rebounds INTEGER,
    assists INTEGER,
    steals INTEGER,
    blocks INTEGER,
    turnovers INTEGER,
    field_goals_made INTEGER,
    field_goals_attempted INTEGER,
    three_pointers_made INTEGER,
    three_pointers_attempted INTEGER,
    free_throws_made INTEGER,
    free_throws_attempted INTEGER,
    -- Football stats
    passing_yards INTEGER,
    passing_touchdowns INTEGER,
    interceptions INTEGER,
    rushing_yards INTEGER,
    rushing_touchdowns INTEGER,
    receiving_yards INTEGER,
    receptions INTEGER,
    receiving_touchdowns INTEGER,
    -- Baseball stats
    at_bats INTEGER,
    hits INTEGER,
    home_runs INTEGER,
    rbis INTEGER,
    stolen_bases INTEGER,
    batting_average DECIMAL(4,3),
    -- Universal stats
    fantasy_points DECIMAL(10,2),
    usage_rate DECIMAL(5,2),
    efficiency_rating DECIMAL(10,2),
    plus_minus DECIMAL(10,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (game_date);

CREATE INDEX idx_player_stats_player ON player_stats(player_id, game_date);
CREATE INDEX idx_player_stats_game ON player_stats(game_id);

-- Team statistics
CREATE TABLE team_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id),
    game_id UUID REFERENCES games(id),
    game_date TIMESTAMP NOT NULL,
    points_scored INTEGER,
    points_allowed INTEGER,
    -- Offensive stats
    total_yards INTEGER,
    passing_yards INTEGER,
    rushing_yards INTEGER,
    turnovers INTEGER,
    time_of_possession INTERVAL,
    third_down_pct DECIMAL(5,2),
    red_zone_pct DECIMAL(5,2),
    -- Defensive stats
    sacks INTEGER,
    interceptions INTEGER,
    forced_fumbles INTEGER,
    -- Advanced metrics
    offensive_rating DECIMAL(10,2),
    defensive_rating DECIMAL(10,2),
    pace DECIMAL(10,2),
    true_shooting_pct DECIMAL(5,2),
    effective_fg_pct DECIMAL(5,2),
    turnover_pct DECIMAL(5,2),
    offensive_rebound_pct DECIMAL(5,2),
    defensive_rebound_pct DECIMAL(5,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_team_stats_team ON team_stats(team_id, game_date);
CREATE INDEX idx_team_stats_game ON team_stats(game_id);

-- Historical matchups
CREATE TABLE historical_matchups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team1_id UUID REFERENCES teams(id),
    team2_id UUID REFERENCES teams(id),
    games_played INTEGER,
    team1_wins INTEGER,
    team2_wins INTEGER,
    avg_total_points DECIMAL(10,2),
    avg_margin DECIMAL(10,2),
    cover_rate_team1 DECIMAL(5,2),
    cover_rate_team2 DECIMAL(5,2),
    over_rate DECIMAL(5,2),
    under_rate DECIMAL(5,2),
    last_meeting_date TIMESTAMP,
    recent_trend VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_matchups_teams ON historical_matchups(team1_id, team2_id);

-- ========================================
-- 5. WEATHER DATA
-- ========================================

CREATE TABLE weather_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    venue_id UUID REFERENCES venues(id),
    observation_time TIMESTAMP NOT NULL,
    temperature DECIMAL(5,2),
    feels_like DECIMAL(5,2),
    humidity DECIMAL(5,2),
    wind_speed DECIMAL(5,2),
    wind_direction INTEGER,
    precipitation DECIMAL(5,2),
    precipitation_type VARCHAR(20), -- 'rain', 'snow', 'sleet'
    visibility DECIMAL(5,2),
    pressure DECIMAL(6,2),
    cloud_cover DECIMAL(5,2),
    uv_index INTEGER,
    field_condition VARCHAR(50), -- 'dry', 'wet', 'muddy', 'frozen'
    indoor_temp DECIMAL(5,2), -- For domed stadiums
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_weather_game ON weather_conditions(game_id);
CREATE INDEX idx_weather_venue ON weather_conditions(venue_id, observation_time);

-- ========================================
-- 6. ML MODEL DATA
-- ========================================

-- ML models registry
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50), -- 'xgboost', 'lightgbm', 'neural_network', etc.
    sport_id UUID REFERENCES sports(id),
    target_variable VARCHAR(100),
    version VARCHAR(20),
    accuracy DECIMAL(5,4),
    precision DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    auc_roc DECIMAL(5,4),
    training_date TIMESTAMP,
    training_samples INTEGER,
    feature_importance JSONB,
    hyperparameters JSONB,
    model_path VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_sport ON ml_models(sport_id);
CREATE INDEX idx_models_active ON ml_models(is_active);

-- ML predictions
CREATE TABLE ml_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id),
    game_id UUID REFERENCES games(id),
    prediction_type VARCHAR(50), -- 'winner', 'spread', 'total', 'player_prop'
    entity_id UUID, -- Could be team_id or player_id
    predicted_value DECIMAL(15,4),
    confidence DECIMAL(5,4),
    probability DECIMAL(5,4),
    expected_value DECIMAL(15,4),
    features_used JSONB,
    prediction_timestamp TIMESTAMP NOT NULL,
    actual_value DECIMAL(15,4),
    error DECIMAL(15,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_predictions_model ON ml_predictions(model_id, prediction_timestamp);
CREATE INDEX idx_predictions_game ON ml_predictions(game_id);
CREATE INDEX idx_predictions_entity ON ml_predictions(entity_id);

-- Feature store for ML
CREATE TABLE ml_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_set_name VARCHAR(100),
    entity_type VARCHAR(50), -- 'player', 'team', 'game'
    entity_id UUID,
    feature_date TIMESTAMP NOT NULL,
    features JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_features_entity ON ml_features(entity_type, entity_id, feature_date);
CREATE INDEX idx_features_name ON ml_features(feature_set_name);

-- Training data
CREATE TABLE ml_training_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id),
    data_type VARCHAR(50), -- 'train', 'validation', 'test'
    features JSONB,
    target DECIMAL(15,4),
    weight DECIMAL(5,4) DEFAULT 1.0,
    timestamp TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_training_model ON ml_training_data(model_id);
CREATE INDEX idx_training_type ON ml_training_data(data_type);

-- ========================================
-- 7. PATTERN RECOGNITION DATA
-- ========================================

-- Betting patterns
CREATE TABLE betting_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern_type VARCHAR(50), -- 'line_movement', 'arbitrage', 'value', 'sharp'
    sport_id UUID REFERENCES sports(id),
    conditions JSONB,
    roi DECIMAL(10,4),
    win_rate DECIMAL(5,4),
    sample_size INTEGER,
    confidence DECIMAL(5,4),
    frequency INTEGER,
    last_occurrence TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patterns_sport ON betting_patterns(sport_id);
CREATE INDEX idx_patterns_type ON betting_patterns(pattern_type);
CREATE INDEX idx_patterns_roi ON betting_patterns(roi DESC);

-- Pattern occurrences
CREATE TABLE pattern_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID REFERENCES betting_patterns(id),
    game_id UUID REFERENCES games(id),
    occurrence_time TIMESTAMP NOT NULL,
    confidence DECIMAL(5,4),
    expected_value DECIMAL(15,4),
    actual_outcome VARCHAR(50),
    profit_loss DECIMAL(15,4),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_occurrences_pattern ON pattern_occurrences(pattern_id, occurrence_time);
CREATE INDEX idx_occurrences_game ON pattern_occurrences(game_id);

-- ========================================
-- 8. ARBITRAGE AND VALUE BETTING
-- ========================================

-- Arbitrage opportunities
CREATE TABLE arbitrage_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    market_type VARCHAR(50),
    bookmaker_combination JSONB, -- Array of bookmaker_id -> outcome mappings
    total_implied_probability DECIMAL(5,4),
    profit_margin DECIMAL(10,4),
    minimum_stake DECIMAL(15,2),
    recommended_stakes JSONB,
    expected_profit DECIMAL(15,2),
    risk_level VARCHAR(20),
    confidence_score DECIMAL(5,4),
    time_sensitivity VARCHAR(20),
    detected_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_arbitrage_game ON arbitrage_opportunities(game_id);
CREATE INDEX idx_arbitrage_profit ON arbitrage_opportunities(profit_margin DESC);
CREATE INDEX idx_arbitrage_active ON arbitrage_opportunities(is_active, expires_at);

-- Expected value calculations
CREATE TABLE expected_value_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES games(id),
    bookmaker_id UUID REFERENCES bookmakers(id),
    market_type VARCHAR(50),
    outcome VARCHAR(100),
    offered_odds DECIMAL(10,4),
    fair_odds DECIMAL(10,4),
    implied_probability DECIMAL(5,4),
    true_probability DECIMAL(5,4),
    expected_value DECIMAL(10,4),
    edge_percentage DECIMAL(10,4),
    kelly_fraction DECIMAL(5,4),
    confidence_interval_low DECIMAL(5,4),
    confidence_interval_high DECIMAL(5,4),
    model_confidence DECIMAL(5,4),
    recommendation VARCHAR(50),
    factors_considered JSONB,
    calculated_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ev_game ON expected_value_bets(game_id);
CREATE INDEX idx_ev_value ON expected_value_bets(expected_value DESC);
CREATE INDEX idx_ev_edge ON expected_value_bets(edge_percentage DESC);

-- ========================================
-- 9. PARLAY OPTIMIZATION
-- ========================================

-- Parlay combinations
CREATE TABLE parlay_combinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parlay_type VARCHAR(50), -- 'standard', 'round_robin', 'teaser'
    legs JSONB, -- Array of game_id, market_type, outcome, odds
    combined_odds DECIMAL(15,4),
    total_probability DECIMAL(5,4),
    expected_value DECIMAL(15,4),
    correlation_score DECIMAL(5,4),
    risk_score DECIMAL(5,4),
    confidence_score DECIMAL(5,4),
    kelly_stake DECIMAL(5,4),
    risk_level VARCHAR(20),
    recommended_stake DECIMAL(15,2),
    potential_payout DECIMAL(15,2),
    key_factors JSONB,
    warnings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_parlay_ev ON parlay_combinations(expected_value DESC);
CREATE INDEX idx_parlay_confidence ON parlay_combinations(confidence_score DESC);

-- Correlation matrix for parlays
CREATE TABLE correlation_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity1_type VARCHAR(50), -- 'team', 'player', 'market'
    entity1_id UUID,
    entity2_type VARCHAR(50),
    entity2_id UUID,
    correlation_coefficient DECIMAL(5,4),
    sample_size INTEGER,
    confidence_interval DECIMAL(5,4),
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_correlation_entities ON correlation_matrix(entity1_id, entity2_id);

-- ========================================
-- 10. LEARNING AND FEEDBACK SYSTEM
-- ========================================

-- Prediction feedback
CREATE TABLE prediction_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID,
    prediction_type VARCHAR(50),
    predicted_outcome JSONB,
    actual_outcome JSONB,
    confidence DECIMAL(5,4),
    odds DECIMAL(10,4),
    stake DECIMAL(15,2),
    profit_loss DECIMAL(15,2),
    factors JSONB,
    feedback_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_prediction ON prediction_feedback(prediction_id);
CREATE INDEX idx_feedback_timestamp ON prediction_feedback(feedback_timestamp);

-- Learning metrics
CREATE TABLE learning_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ml_models(id),
    metric_date DATE NOT NULL,
    accuracy DECIMAL(5,4),
    precision DECIMAL(5,4),
    recall DECIMAL(5,4),
    f1_score DECIMAL(5,4),
    roi DECIMAL(10,4),
    sharpe_ratio DECIMAL(10,4),
    max_drawdown DECIMAL(10,4),
    win_rate DECIMAL(5,4),
    avg_odds DECIMAL(10,4),
    kelly_performance DECIMAL(10,4),
    total_predictions INTEGER,
    profitable_predictions INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_learning_model ON learning_metrics(model_id, metric_date);

-- ========================================
-- 11. USER AND SYSTEM DATA
-- ========================================

-- System configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value JSONB,
    category VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_config_key ON system_config(config_key);
CREATE INDEX idx_config_category ON system_config(category);

-- API rate limits and usage
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_name VARCHAR(100),
    endpoint VARCHAR(255),
    request_count INTEGER DEFAULT 0,
    rate_limit INTEGER,
    reset_time TIMESTAMP,
    last_request TIMESTAMP,
    credits_used INTEGER DEFAULT 0,
    credits_remaining INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_name ON api_usage(api_name);
CREATE INDEX idx_api_reset ON api_usage(reset_time);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    user_id UUID,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- ========================================
-- 12. CACHE AND PERFORMANCE
-- ========================================

-- Query cache
CREATE TABLE query_cache (
    cache_key VARCHAR(255) PRIMARY KEY,
    query_hash VARCHAR(64),
    result_data JSONB,
    hit_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cache_expires ON query_cache(expires_at);
CREATE INDEX idx_cache_accessed ON query_cache(last_accessed);

-- Performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(50),
    metric_name VARCHAR(100),
    metric_value DECIMAL(15,4),
    execution_time_ms INTEGER,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    timestamp TIMESTAMP NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_perf_type ON performance_metrics(metric_type, timestamp);
CREATE INDEX idx_perf_name ON performance_metrics(metric_name, timestamp);

-- ========================================
-- 13. MATERIALIZED VIEWS FOR PERFORMANCE
-- ========================================

-- Current odds view
CREATE MATERIALIZED VIEW current_odds AS
SELECT DISTINCT ON (game_id, bookmaker_id, market_type, outcome)
    game_id,
    bookmaker_id,
    market_type,
    outcome,
    odds_american,
    odds_decimal,
    line_value,
    implied_probability,
    timestamp
FROM odds_history
ORDER BY game_id, bookmaker_id, market_type, outcome, timestamp DESC;

CREATE INDEX idx_current_odds_game ON current_odds(game_id);

-- Team performance summary
CREATE MATERIALIZED VIEW team_performance_summary AS
SELECT 
    t.id as team_id,
    t.name as team_name,
    t.sport_id,
    COUNT(CASE WHEN g.home_team_id = t.id AND g.home_score > g.away_score THEN 1
               WHEN g.away_team_id = t.id AND g.away_score > g.home_score THEN 1 END) as wins,
    COUNT(CASE WHEN g.home_team_id = t.id AND g.home_score < g.away_score THEN 1
               WHEN g.away_team_id = t.id AND g.away_score < g.home_score THEN 1 END) as losses,
    AVG(CASE WHEN g.home_team_id = t.id THEN g.home_score
             WHEN g.away_team_id = t.id THEN g.away_score END) as avg_points_scored,
    AVG(CASE WHEN g.home_team_id = t.id THEN g.away_score
             WHEN g.away_team_id = t.id THEN g.home_score END) as avg_points_allowed,
    COUNT(*) as games_played
FROM teams t
LEFT JOIN games g ON (g.home_team_id = t.id OR g.away_team_id = t.id)
WHERE g.status = 'completed'
GROUP BY t.id, t.name, t.sport_id;

CREATE INDEX idx_team_perf_team ON team_performance_summary(team_id);

-- ========================================
-- 14. TRIGGERS AND FUNCTIONS
-- ========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sports_updated_at BEFORE UPDATE ON sports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate implied probability
CREATE OR REPLACE FUNCTION calculate_implied_probability(odds_american INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF odds_american > 0 THEN
        RETURN 100.0 / (odds_american + 100.0);
    ELSE
        RETURN ABS(odds_american) / (ABS(odds_american) + 100.0);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to detect arbitrage
CREATE OR REPLACE FUNCTION detect_arbitrage(game_id UUID)
RETURNS TABLE(
    market_type VARCHAR,
    total_implied_prob DECIMAL,
    profit_margin DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        co.market_type,
        SUM(co.implied_probability) as total_implied_prob,
        (1 - 1/SUM(1/co.odds_decimal)) * 100 as profit_margin
    FROM current_odds co
    WHERE co.game_id = detect_arbitrage.game_id
    GROUP BY co.market_type, co.game_id
    HAVING SUM(co.implied_probability) < 1.0;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 15. PARTITIONING MAINTENANCE
-- ========================================

-- Function to automatically create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    -- Create partitions for next 3 months
    FOR i IN 0..2 LOOP
        start_date := DATE_TRUNC('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := start_date + '1 month'::interval;
        
        -- For games table
        partition_name := 'games_' || TO_CHAR(start_date, 'YYYY_MM');
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF games FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
        
        -- For odds_history table (daily partitions)
        FOR j IN 0..30 LOOP
            partition_name := 'odds_history_' || TO_CHAR(start_date + (j || ' days')::interval, 'YYYY_MM_DD');
            EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF odds_history FOR VALUES FROM (%L) TO (%L)',
                          partition_name, 
                          start_date + (j || ' days')::interval,
                          start_date + ((j+1) || ' days')::interval);
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Schedule partition creation (using pg_cron or similar)
-- SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_monthly_partitions()');

-- ========================================
-- 16. INDEXES FOR TIME-SERIES QUERIES
-- ========================================

-- BRIN indexes for time-series data
CREATE INDEX idx_odds_history_timestamp_brin ON odds_history USING BRIN (timestamp);
CREATE INDEX idx_games_date_brin ON games USING BRIN (game_date);
CREATE INDEX idx_player_stats_date_brin ON player_stats USING BRIN (game_date);

-- ========================================
-- 17. SECURITY AND PERMISSIONS
-- ========================================

-- Create roles
CREATE ROLE probability_analyzer_read;
CREATE ROLE probability_analyzer_write;
CREATE ROLE probability_analyzer_admin;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO probability_analyzer_read;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO probability_analyzer_write;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO probability_analyzer_admin;

-- Row-level security for sensitive data
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 18. BACKUP AND MAINTENANCE POLICIES
-- ========================================

-- Create backup schema
CREATE SCHEMA IF NOT EXISTS backup;

-- Archive old data function
CREATE OR REPLACE FUNCTION archive_old_data()
RETURNS void AS $$
BEGIN
    -- Move data older than 1 year to backup schema
    INSERT INTO backup.odds_history 
    SELECT * FROM odds_history 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 year';
    
    DELETE FROM odds_history 
    WHERE timestamp < CURRENT_DATE - INTERVAL '1 year';
    
    -- Vacuum and analyze
    VACUUM ANALYZE odds_history;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- END OF SCHEMA
-- ========================================