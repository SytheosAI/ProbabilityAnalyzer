# Probability Analyzer Database Schema Documentation

## Overview
This comprehensive database schema is designed to support all functionalities of the Probability Analyzer system, including sports analytics, betting analysis, machine learning predictions, pattern recognition, and continuous learning systems.

## Database Technology Stack
- **Primary Database**: PostgreSQL 14+
- **Time-Series Extension**: TimescaleDB
- **Additional Extensions**: 
  - uuid-ossp (UUID generation)
  - pg_trgm (Fuzzy text search)
  - btree_gin (Composite indexes)

## Schema Categories

### 1. Core Sports Data (7 tables)
Stores fundamental sports information including teams, players, venues, and game schedules.

**Key Tables:**
- `sports`: Master sports registry (NFL, NBA, MLB, NHL, Soccer, etc.)
- `teams`: Team information with ratings and metrics
- `players`: Player roster with physical attributes and ratings
- `venues`: Stadium/arena information with location and conditions
- `games`: Game schedules and results (partitioned by month)
- `team_statistics`: Comprehensive team performance metrics
- `player_statistics`: Detailed player statistics across all sports

**Design Decisions:**
- UUIDs for primary keys to support distributed systems
- JSONB fields for flexible metadata storage
- Partitioning games by month for query performance
- Comprehensive statistics covering all major sports

### 2. Betting and Odds Data (6 tables)
Manages bookmaker information, odds history, line movements, and public betting data.

**Key Tables:**
- `bookmakers`: Bookmaker registry with credibility scores
- `odds_history`: Historical odds data (partitioned daily, ~10M+ records/day)
- `current_odds`: Real-time odds snapshot
- `line_movements`: Tracks all line changes with triggers
- `public_betting`: Public betting percentages and sharp money indicators

**Design Decisions:**
- Daily partitioning for odds_history due to high volume
- TimescaleDB hypertables for optimal time-series queries
- Separate current_odds table for real-time performance
- BRIN indexes for efficient timestamp queries

### 3. Machine Learning Infrastructure (5 tables)
Supports ML model management, predictions, feature engineering, and training data.

**Key Tables:**
- `ml_models`: Model registry with versioning and metrics
- `ml_predictions`: All predictions with confidence scores
- `ml_features`: Feature store for ML pipelines
- `ml_training_data`: Training data for continuous learning
- `correlation_matrix`: Entity correlations for parlay optimization

**Design Decisions:**
- JSONB for flexible feature and prediction storage
- Model versioning for A/B testing
- Separate feature store for reusable feature engineering
- Correlation matrix for advanced parlay analysis

### 4. Pattern Recognition (2 tables)
Manages pattern detection and historical pattern performance.

**Key Tables:**
- `patterns`: Pattern library with accuracy metrics
- `pattern_occurrences`: Individual pattern detections

**Design Decisions:**
- JSONB pattern definitions for flexibility
- Historical accuracy tracking for pattern validation
- Profit/loss tracking per occurrence

### 5. Value Betting and Arbitrage (3 tables)
Identifies and tracks betting opportunities with positive expected value.

**Key Tables:**
- `arbitrage_opportunities`: Detected arbitrage situations
- `expected_value_bets`: Positive EV betting opportunities
- `parlay_combinations`: Optimized parlay suggestions

**Design Decisions:**
- Execution tracking for arbitrage opportunities
- Kelly Criterion calculations built-in
- Risk assessment for all opportunities

### 6. Weather and Environmental (2 tables)
Tracks weather conditions and their impact on game outcomes.

**Key Tables:**
- `weather_conditions`: Real-time weather data
- `weather_impacts`: Statistical weather impact analysis

**Design Decisions:**
- Venue-based weather tracking
- Sport-specific impact analysis
- Integration with game predictions

### 7. Learning System (2 tables)
Implements weekly learning cycles and feedback mechanisms.

**Key Tables:**
- `learning_cycles`: Weekly performance summaries
- `learning_feedback`: Improvement suggestions and tracking

**Design Decisions:**
- Weekly aggregation for trend analysis
- Feedback loop for continuous improvement
- ROI and accuracy tracking

### 8. System Management (6 tables)
Handles configuration, caching, auditing, and monitoring.

**Key Tables:**
- `system_configuration`: Application settings
- `api_configurations`: API keys and rate limits
- `audit_logs`: Complete audit trail
- `query_cache`: Performance caching layer
- `performance_metrics`: System performance tracking
- `system_alerts`: Alert and monitoring system

**Design Decisions:**
- Encrypted storage for sensitive configuration
- Built-in rate limiting for APIs
- Comprehensive audit logging
- TTL-based cache expiration

## Performance Optimizations

### Indexing Strategy
1. **B-tree indexes**: Primary keys and foreign keys
2. **BRIN indexes**: Time-series data (odds_history, line_movements)
3. **GIN indexes**: JSONB columns for flexible queries
4. **Partial indexes**: Common query patterns (upcoming games, active models)
5. **Composite indexes**: Multi-column queries

### Partitioning Strategy
1. **Games**: Monthly partitions (manageable size, efficient queries)
2. **Odds History**: Daily partitions (high volume, 10M+ records/day)
3. **Line Movements**: Daily partitions (frequent updates)

### Materialized Views
- `team_performance_summary`: Pre-calculated team statistics
- `bookmaker_accuracy`: Bookmaker performance metrics

### TimescaleDB Hypertables
- Automatic chunk management for time-series data
- Optimized compression for historical data
- Parallel query execution

## Data Volume Estimates

| Table | Daily Records | Total Size (1 Year) |
|-------|--------------|-------------------|
| odds_history | 10-15M | 500GB+ |
| line_movements | 2-3M | 100GB+ |
| ml_predictions | 50-100K | 20GB |
| games | 100-200 | 1GB |
| team_statistics | 500-1000 | 5GB |
| player_statistics | 5-10K | 50GB |

**Total Estimated Storage**: 700GB-1TB for first year

## Security Considerations

1. **Row-Level Security**: Implemented for sensitive tables
2. **Encrypted Fields**: API keys and sensitive configuration
3. **Audit Logging**: Complete trail of all modifications
4. **Role-Based Access**: Separate roles for read/write operations
5. **Connection Pooling**: PgBouncer recommended for production

## Scaling Strategy

### Vertical Scaling
- Start with 16GB RAM, 4 CPU cores
- Scale to 64GB RAM, 16 CPU cores as needed

### Horizontal Scaling
1. **Read Replicas**: For analytics queries
2. **Partitioning**: Already implemented for large tables
3. **Sharding**: Can shard by sport_id if needed
4. **Caching Layer**: Redis for hot data

### Archive Strategy
- Move odds_history older than 6 months to archive tables
- Compress archived data with TimescaleDB compression
- Keep aggregated summaries in main database

## Maintenance Procedures

### Daily Tasks
- Clean expired cache entries
- Update materialized views
- Vacuum analyze high-update tables

### Weekly Tasks
- Reindex heavily updated tables
- Archive old odds data
- Generate performance reports

### Monthly Tasks
- Create new partitions for upcoming month
- Drop old partitions beyond retention period
- Full database backup

## Migration Plan

### Phase 1: Core Tables (Week 1)
- Create sports, teams, players, venues
- Import initial data
- Verify relationships

### Phase 2: Game Data (Week 2)
- Create games and statistics tables
- Set up partitioning
- Import historical data

### Phase 3: Betting Data (Week 3)
- Create odds and betting tables
- Set up TimescaleDB
- Begin real-time data ingestion

### Phase 4: ML Infrastructure (Week 4)
- Create ML tables
- Import existing models
- Set up prediction pipeline

### Phase 5: Optimization (Week 5)
- Create indexes and materialized views
- Implement caching
- Performance testing

## Monitoring and Alerts

### Key Metrics to Monitor
1. Query performance (p95 < 100ms)
2. Table sizes and growth rates
3. Index usage and bloat
4. Cache hit rates (> 80%)
5. API rate limit usage

### Alert Thresholds
- Disk usage > 80%
- Query time > 1 second
- Failed predictions > 10%
- Arbitrage opportunities missed
- API rate limit exceeded

## Backup and Recovery

### Backup Strategy
- **Continuous archiving**: WAL archiving to S3
- **Daily snapshots**: Full backup at 3 AM
- **Point-in-time recovery**: Up to 7 days
- **Cross-region replication**: For disaster recovery

### Recovery Time Objectives
- RTO: 1 hour for full recovery
- RPO: 5 minutes maximum data loss

## Future Enhancements

1. **GraphQL API layer** for flexible querying
2. **Real-time streaming** with Kafka integration
3. **Machine learning pipeline** with Apache Airflow
4. **Elasticsearch** for advanced text search
5. **Time-series forecasting** with additional ML models
6. **Blockchain integration** for bet verification
7. **Mobile app support** with optimized endpoints

## Conclusion

This comprehensive schema provides a robust foundation for the Probability Analyzer system, supporting current requirements while allowing for future growth. The design prioritizes performance, scalability, and maintainability, with careful consideration for the unique requirements of sports betting analysis and machine learning systems.