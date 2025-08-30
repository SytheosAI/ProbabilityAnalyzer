# Comprehensive Database Schema Documentation
## Probability Analyzer System

---

## Executive Summary

This document provides comprehensive documentation for the Probability Analyzer database schema, designed to support all identified data requirements from the codebase analysis. The schema is optimized for PostgreSQL and includes support for time-series data, partitioning strategies, and high-performance querying.

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Data Categories](#data-categories)
3. [Key Design Decisions](#key-design-decisions)
4. [Table Descriptions](#table-descriptions)
5. [Partitioning Strategy](#partitioning-strategy)
6. [Performance Optimization](#performance-optimization)
7. [Data Relationships](#data-relationships)
8. [Implementation Guidelines](#implementation-guidelines)

---

## Schema Overview

The database schema is organized into 18 major categories covering all aspects of sports betting analysis:

### Data Volume Estimates
- **Daily Records**: ~1-5 million (odds updates, line movements)
- **Historical Data**: ~500 million records (2+ years)
- **Real-time Updates**: ~10,000 per minute during peak
- **ML Predictions**: ~100,000 per day

---

## Data Categories

### 1. Sports Entities (Core Data)
**Tables**: `sports`, `teams`, `players`, `venues`

**Purpose**: Store fundamental sports data including teams, players, and venue information.

**Key Features**:
- UUID primary keys for distributed systems
- JSONB metadata fields for flexibility
- Comprehensive rating systems (ELO, power, offensive, defensive)
- Support for all major sports leagues

### 2. Games and Schedules
**Tables**: `games` (partitioned)

**Purpose**: Track all game information including schedules, scores, and context.

**Key Features**:
- Partitioned by date for performance
- Links to teams, venues, and weather
- Importance factors for playoff/rivalry games
- Support for various game types and statuses

### 3. Odds and Betting Data
**Tables**: `bookmakers`, `odds_history` (partitioned), `line_movements`, `public_betting`

**Purpose**: Comprehensive tracking of all betting-related data.

**Key Features**:
- Sub-second granularity for odds tracking
- Partitioned by timestamp for efficient queries
- Sharp vs public money indicators
- Steam move and RLM detection

### 4. Statistical Data
**Tables**: `player_stats` (partitioned), `team_stats`, `historical_matchups`

**Purpose**: Store detailed statistical information for analysis.

**Key Features**:
- Sport-specific stat columns
- Advanced metrics and efficiency ratings
- Historical matchup tracking
- Fantasy points calculation

### 5. Weather Data
**Tables**: `weather_conditions`

**Purpose**: Track weather impact on outdoor sports.

**Key Features**:
- Comprehensive weather metrics
- Field condition tracking
- Indoor/outdoor differentiation
- Historical weather patterns

### 6. ML Model Data
**Tables**: `ml_models`, `ml_predictions`, `ml_features`, `ml_training_data`

**Purpose**: Support machine learning operations.

**Key Features**:
- Model versioning and registry
- Feature store for reusability
- Prediction tracking with confidence scores
- Training data management

### 7. Pattern Recognition
**Tables**: `betting_patterns`, `pattern_occurrences`

**Purpose**: Store identified betting patterns and their occurrences.

**Key Features**:
- Pattern classification and ROI tracking
- Confidence scoring
- Historical performance metrics
- Active pattern monitoring

### 8. Arbitrage and Value Betting
**Tables**: `arbitrage_opportunities`, `expected_value_bets`

**Purpose**: Track arbitrage and positive EV opportunities.

**Key Features**:
- Multi-bookmaker arbitrage detection
- Kelly criterion calculations
- Risk assessment
- Time-sensitive opportunity tracking

### 9. Parlay Optimization
**Tables**: `parlay_combinations`, `correlation_matrix`

**Purpose**: Support parlay analysis and optimization.

**Key Features**:
- Correlation tracking between legs
- Risk scoring
- Expected value calculations
- Multiple parlay types support

### 10. Learning and Feedback
**Tables**: `prediction_feedback`, `learning_metrics`

**Purpose**: Enable continuous learning and improvement.

**Key Features**:
- Prediction outcome tracking
- Performance metrics over time
- Model improvement tracking
- Feedback loop implementation

### 11. System and Configuration
**Tables**: `system_config`, `api_usage`, `audit_log`

**Purpose**: System administration and monitoring.

**Key Features**:
- Dynamic configuration management
- API rate limit tracking
- Comprehensive audit logging
- Usage analytics

### 12. Cache and Performance
**Tables**: `query_cache`, `performance_metrics`

**Purpose**: Optimize system performance.

**Key Features**:
- Query result caching
- Performance monitoring
- Resource usage tracking
- Cache invalidation strategies

---

## Key Design Decisions

### 1. UUID vs Serial IDs
- **Decision**: Use UUIDs for primary keys
- **Rationale**: 
  - Support for distributed systems
  - No central sequence bottleneck
  - Easier data migration and replication
  - Prevents ID enumeration attacks

### 2. Partitioning Strategy
- **Decision**: Range partitioning for time-series data
- **Rationale**:
  - Improved query performance for date ranges
  - Easier data archival and cleanup
  - Parallel query execution
  - Reduced index size per partition

### 3. JSONB for Metadata
- **Decision**: Use JSONB columns for flexible metadata
- **Rationale**:
  - Schema flexibility for evolving requirements
  - Efficient storage and querying
  - Support for varied sport-specific data
  - Native PostgreSQL indexing support

### 4. Materialized Views
- **Decision**: Implement materialized views for common aggregations
- **Rationale**:
  - Reduced query complexity
  - Improved read performance
  - Predictable query times
  - Background refresh capabilities

---

## Partitioning Strategy

### Time-Based Partitioning

#### Games Table
- **Strategy**: Monthly partitions
- **Naming**: `games_YYYY_MM`
- **Retention**: 2 years active, archive older

#### Odds History Table
- **Strategy**: Daily partitions
- **Naming**: `odds_history_YYYY_MM_DD`
- **Retention**: 90 days active, archive older

#### Benefits:
1. **Query Performance**: 10-100x faster for date-range queries
2. **Maintenance**: Easy to drop old partitions
3. **Parallel Processing**: Queries can scan partitions in parallel
4. **Storage**: Better compression ratios per partition

### Implementation Example:
```sql
-- Automatic partition creation
CREATE OR REPLACE FUNCTION create_daily_partition()
RETURNS void AS $$
DECLARE
    partition_date date := CURRENT_DATE + interval '1 day';
    partition_name text := 'odds_history_' || 
                          to_char(partition_date, 'YYYY_MM_DD');
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I 
                   PARTITION OF odds_history 
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_name, 
                   partition_date,
                   partition_date + interval '1 day');
END;
$$ LANGUAGE plpgsql;
```

---

## Performance Optimization

### Index Strategy

#### Primary Indexes
1. **B-tree indexes** for exact lookups and range queries
2. **BRIN indexes** for time-series data
3. **GIN indexes** for JSONB columns
4. **Hash indexes** for equality comparisons only

#### Composite Indexes
```sql
-- Frequently queried combinations
CREATE INDEX idx_odds_game_market_time 
ON odds_history(game_id, market_type, timestamp);

CREATE INDEX idx_stats_player_date 
ON player_stats(player_id, game_date);
```

### Query Optimization

#### Use of CTEs (Common Table Expressions)
```sql
WITH recent_games AS (
    SELECT * FROM games 
    WHERE game_date > CURRENT_DATE - INTERVAL '7 days'
),
team_performance AS (
    SELECT team_id, AVG(points_scored) as avg_points
    FROM team_stats
    WHERE game_id IN (SELECT id FROM recent_games)
    GROUP BY team_id
)
SELECT * FROM team_performance;
```

#### Parallel Query Execution
```sql
-- Enable parallel queries for large scans
SET max_parallel_workers_per_gather = 4;
SET parallel_setup_cost = 100;
SET parallel_tuple_cost = 0.01;
```

---

## Data Relationships

### Entity Relationship Diagram (Key Relationships)

```
sports (1) ----< (N) teams
teams (1) ----< (N) players
teams (1) ----< (N) games (home)
teams (1) ----< (N) games (away)
games (1) ----< (N) odds_history
games (1) ----< (N) line_movements
games (1) ----< (N) player_stats
games (1) ----< (N) team_stats
games (1) ----< (N) ml_predictions
bookmakers (1) ----< (N) odds_history
ml_models (1) ----< (N) ml_predictions
```

### Foreign Key Constraints
- All foreign keys have CASCADE on DELETE for child records
- UPDATE operations restricted to maintain referential integrity
- Deferrable constraints for bulk operations

---

## Implementation Guidelines

### 1. Initial Setup
```bash
# Create database
createdb probability_analyzer

# Connect and run schema
psql -d probability_analyzer -f database_schema_comprehensive.sql

# Create initial partitions
psql -d probability_analyzer -c "SELECT create_monthly_partitions();"
```

### 2. Connection Pooling
```python
# Recommended connection pool settings
from sqlalchemy import create_engine

engine = create_engine(
    'postgresql://user:pass@localhost/probability_analyzer',
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

### 3. Backup Strategy
```bash
# Daily backup with compression
pg_dump -Fc -d probability_analyzer > backup_$(date +%Y%m%d).dump

# Point-in-time recovery setup
archive_mode = on
archive_command = 'cp %p /backup/archive/%f'
```

### 4. Monitoring Queries
```sql
-- Check partition sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'odds_history_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC;
```

### 5. Maintenance Tasks
```sql
-- Weekly maintenance
VACUUM ANALYZE;
REINDEX DATABASE probability_analyzer;
REFRESH MATERIALIZED VIEW CONCURRENTLY current_odds;
REFRESH MATERIALIZED VIEW CONCURRENTLY team_performance_summary;

-- Monthly maintenance
SELECT archive_old_data();
SELECT create_monthly_partitions();
```

---

## Security Considerations

### 1. Row-Level Security
```sql
-- Enable RLS for sensitive tables
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY read_own_data ON api_usage
    FOR SELECT
    USING (user_id = current_user_id());
```

### 2. Encryption
- Use SSL/TLS for connections
- Encrypt sensitive columns (API keys, passwords)
- Implement column-level encryption for PII

### 3. Access Control
```sql
-- Create application roles
CREATE ROLE app_read LOGIN PASSWORD 'secure_password';
CREATE ROLE app_write LOGIN PASSWORD 'secure_password';
CREATE ROLE app_admin LOGIN PASSWORD 'secure_password';

-- Grant appropriate permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_read;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app_write;
GRANT ALL PRIVILEGES ON DATABASE probability_analyzer TO app_admin;
```

---

## Scaling Considerations

### Horizontal Scaling Options

1. **Read Replicas**
   - Offload read queries to replicas
   - Use connection pooler for load balancing
   - Async replication for near-real-time data

2. **Sharding**
   - Shard by sport or date range
   - Use foreign data wrappers for cross-shard queries
   - Implement application-level sharding logic

3. **Time-Series Database Integration**
   - Use TimescaleDB for odds_history
   - Implement continuous aggregates
   - Automatic data retention policies

### Vertical Scaling Recommendations

- **Memory**: 32GB minimum for production
- **CPU**: 8+ cores for parallel query execution
- **Storage**: NVMe SSDs for optimal I/O
- **PostgreSQL Tuning**:
  ```
  shared_buffers = 8GB
  effective_cache_size = 24GB
  maintenance_work_mem = 2GB
  work_mem = 128MB
  max_connections = 200
  ```

---

## Migration Strategy

### From Existing System
1. **Data Export**: Export existing data to CSV/JSON
2. **Schema Mapping**: Map old fields to new schema
3. **Data Validation**: Verify data integrity
4. **Incremental Migration**: Migrate in batches
5. **Parallel Run**: Run both systems temporarily
6. **Cutover**: Switch to new system

### Version Control
```sql
-- Track schema versions
CREATE TABLE schema_versions (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_versions (version, description)
VALUES ('1.0.0', 'Initial schema implementation');
```

---

## Conclusion

This comprehensive database schema provides a robust foundation for the Probability Analyzer system, supporting:

- High-volume real-time data ingestion
- Complex analytical queries
- Machine learning operations
- Pattern recognition and arbitrage detection
- Scalability for millions of records
- Data integrity and consistency
- Performance optimization through partitioning and indexing

The schema is designed to be maintainable, scalable, and performant while providing the flexibility needed for evolving requirements in sports betting analysis.