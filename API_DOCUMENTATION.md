# Advanced Sports Prediction API Documentation

## Overview
This is the most comprehensive sports analysis platform ever built, featuring advanced ML-powered parlay optimization, moneyline predictions for ALL sports, weekly learning systems, and real-time pattern recognition.

## Version: 2.0.0

## Features
- ✅ All sports moneyline predictions (NFL, NBA, MLB, NHL, Soccer, NCAAF, NCAAB, Tennis, Golf, Boxing, MMA)
- ✅ ML-powered parlay optimization with correlation analysis
- ✅ Comprehensive cross-reference analysis integrating 14+ data sources
- ✅ Weekly learning system with YOLO-based feedback loops
- ✅ Advanced filtering and risk management
- ✅ Real-time pattern recognition

## Endpoints

### 1. Moneyline Predictions
**POST** `/api/moneyline` or **POST** `/api/main` with `{"type": "moneyline"}`

Get moneyline predictions for ANY sport with edge calculation, Kelly criterion, and value ratings.

#### Request Body:
```json
{
  "type": "moneyline",
  "sport": "nfl",
  "min_edge": 0.03,
  "games": [
    {
      "game_id": "game_1",
      "sport": "nfl",
      "home_team": "Chiefs",
      "away_team": "Bills",
      "home_moneyline": -140,
      "away_moneyline": 120,
      "game_time": "2024-01-15T20:00:00"
    }
  ]
}
```

#### Response:
```json
{
  "success": true,
  "type": "moneyline_predictions",
  "sport": "nfl",
  "total_games": 1,
  "value_bets_found": 2,
  "min_edge_threshold": 0.03,
  "predictions": [
    {
      "game_id": "game_1",
      "team": "Bills",
      "sport": "nfl",
      "american_odds": 120,
      "decimal_odds": 2.2,
      "implied_probability": 0.4545,
      "true_probability": 0.52,
      "expected_value": 8.4,
      "edge": 0.0655,
      "kelly_criterion": 0.035,
      "confidence_score": 0.78,
      "value_rating": "moderate",
      "key_factors": {
        "elo_differential": 25,
        "injury_impact": "Away team healthier",
        "weather_conditions": "Clear"
      }
    }
  ],
  "summary": {
    "avg_expected_value": 8.4,
    "avg_confidence": 0.78,
    "strong_value_count": 0
  }
}
```

### 2. Parlay Optimization
**POST** `/api/parlays` or **POST** `/api/main` with `{"type": "parlays"}`

Generate optimal 3-5 team parlays with ML-based correlation analysis and risk management.

#### Request Body:
```json
{
  "type": "parlays",
  "risk_level": "moderate",
  "max_parlays": 10,
  "sports": ["nfl", "nba", "mlb"],
  "min_confidence": 0.6,
  "min_expected_value": 10.0,
  "max_correlation": 0.3,
  "games": [
    {
      "game_id": "nfl_1",
      "sport": "nfl",
      "home_team": "Chiefs",
      "away_team": "Bills"
    },
    {
      "game_id": "nba_1", 
      "sport": "nba",
      "home_team": "Lakers",
      "away_team": "Warriors"
    }
  ]
}
```

#### Response:
```json
{
  "success": true,
  "type": "parlay_optimization",
  "risk_level": "moderate",
  "parlays_generated": 5,
  "parlays": [
    {
      "parlay_id": "abc123def456",
      "legs": [
        {
          "team": "Bills",
          "bet_type": "moneyline",
          "line": 0,
          "odds": 120,
          "probability": 0.52,
          "sport": "nfl"
        },
        {
          "team": "Lakers",
          "bet_type": "spread",
          "line": -3.5,
          "odds": -110,
          "probability": 0.58,
          "sport": "nba"
        }
      ],
      "combined_odds": 312,
      "total_probability": 0.3016,
      "expected_value": 15.2,
      "risk_score": 0.42,
      "confidence_score": 0.73,
      "correlation_score": 0.15,
      "kelly_stake": 0.025,
      "key_factors": ["Low correlation between legs", "High confidence predictions"],
      "warnings": [],
      "sports_included": ["nfl", "nba"]
    }
  ],
  "recommendations": {
    "best_value": "First parlay with highest EV",
    "safest": "Parlay with lowest risk score",
    "highest_odds": "Parlay with highest payout"
  }
}
```

### 3. Comprehensive Analysis
**POST** `/api/comprehensive` or **POST** `/api/main` with `{"type": "comprehensive"}`

Complete cross-reference analysis integrating all 14+ data sources.

#### Data Sources Integrated:
1. **Statistical** - Advanced team metrics, ELO ratings, efficiency
2. **Weather** - Real-time conditions for outdoor sports
3. **Injuries** - Player impact scores and replacement quality
4. **Historical** - Head-to-head records and trends
5. **Public Betting** - Public percentages and contrarian indicators
6. **Sharp Money** - Professional betting indicators
7. **Line Movement** - Opening vs current lines, steam moves
8. **Team Trends** - Recent form, streaks, momentum
9. **Coaching** - Head-to-head coaching records
10. **Referee** - Official tendencies and impacts
11. **Venue** - Home advantage factors, altitude
12. **Travel** - Rest days, fatigue, time zones
13. **Motivation** - Playoff implications, rivalry games
14. **Media** - Sentiment analysis, expert consensus

#### Request Body:
```json
{
  "type": "comprehensive",
  "games": [
    {
      "game_id": "game_1",
      "sport": "nba",
      "home_team": "Lakers",
      "away_team": "Warriors",
      "game_time": "2024-01-15T22:00:00"
    }
  ],
  "filters": {
    "min_confidence": 0.65,
    "min_expected_value": 8.0
  }
}
```

#### Response:
```json
{
  "success": true,
  "type": "comprehensive_analysis",
  "analysis": [
    {
      "game_id": "game_1",
      "sport": "nba",
      "teams": {
        "home": "Lakers",
        "away": "Warriors"
      },
      "predictions": {
        "moneyline": {
          "home_win_probability": 0.58,
          "away_win_probability": 0.42,
          "confidence": 0.73
        },
        "spread": {
          "expected_margin": 4.2,
          "current_spread": -3.5,
          "home_cover_probability": 0.62,
          "value_side": "home"
        },
        "total": {
          "expected_total": 218.5,
          "current_total": 216.0,
          "over_probability": 0.58,
          "value_side": "over"
        }
      },
      "confidence_scores": {
        "overall": 0.78,
        "moneyline": 0.73,
        "spread": 0.68,
        "total": 0.71
      },
      "key_factors": [
        {
          "type": "injury",
          "description": "Significant injury advantage",
          "impact": 0.12,
          "favors": "home"
        }
      ],
      "value_opportunities": [
        {
          "type": "moneyline",
          "pick": "home",
          "probability": 0.58,
          "confidence": 0.73,
          "edge": 0.08
        }
      ],
      "parlay_suitability": 0.82,
      "best_single_bets": [
        {
          "type": "moneyline",
          "pick": "Lakers",
          "expected_value": 12.5,
          "confidence": 0.73,
          "kelly_stake": 0.04
        }
      ]
    }
  ]
}
```

### 4. Daily Recommendations
**POST** `/api/daily` or **POST** `/api/main` with `{"type": "daily"}`

Get comprehensive daily recommendations with filters.

#### Request Body:
```json
{
  "type": "daily",
  "date": "2024-01-15",
  "sports": ["nfl", "nba"],
  "min_confidence": 0.65,
  "min_expected_value": 8.0
}
```

### 5. Learning System Updates
**POST** `/api/learning/update` or **POST** `/api/main` with `{"type": "learning_update"}`

Trigger learning system updates for continuous improvement.

#### Request Body:
```json
{
  "type": "learning_update",
  "update_type": "weekly"
}
```

#### Update Types:
- `weekly` - Full weekly model updates
- `daily` - Quick daily adjustments
- `pattern` - Real-time pattern detection

### 6. Advanced Filtering
**POST** `/api/filters` or **POST** `/api/main` with `{"type": "filter"}`

Apply comprehensive filters to predictions.

#### Request Body:
```json
{
  "type": "filter",
  "games": [...],
  "filters": {
    "sports": ["nfl", "nba"],
    "start_date": "2024-01-15T00:00:00",
    "end_date": "2024-01-15T23:59:59",
    "min_confidence": 0.65,
    "max_confidence": 0.95,
    "min_expected_value": 8.0,
    "min_parlay_suitability": 0.7,
    "max_correlation": 0.3,
    "risk_levels": ["conservative", "moderate"]
  }
}
```

### 7. Health Check
**GET** `/api/main`

Returns API status and available features.

## Risk Levels for Parlays

### Conservative
- Min probability: 65%
- Max correlation: 20%
- Min confidence: 70%
- Kelly fraction: 10%
- Max legs: 3

### Moderate  
- Min probability: 55%
- Max correlation: 30%
- Min confidence: 60%
- Kelly fraction: 15%
- Max legs: 4

### Aggressive
- Min probability: 45%
- Max correlation: 40%
- Min confidence: 50%
- Kelly fraction: 20%
- Max legs: 5

### YOLO
- Min probability: 35%
- Max correlation: 50%
- Min confidence: 40%
- Kelly fraction: 25%
- Max legs: 6

## Supported Sports

- **NFL** - National Football League
- **NBA** - National Basketball Association  
- **MLB** - Major League Baseball
- **NHL** - National Hockey League
- **Soccer** - International soccer/football
- **NCAAF** - College football
- **NCAAB** - College basketball
- **Tennis** - Professional tennis
- **Golf** - Professional golf
- **Boxing** - Professional boxing
- **MMA** - Mixed martial arts

## Key Features

### 1. Advanced ML Algorithms
- YOLO-inspired neural networks for pattern detection
- Gradient boosting for moneyline predictions
- Random forests for spread predictions
- Multi-layer perceptrons for totals

### 2. Correlation Analysis
- Pairwise correlation calculation between games
- Same-game correlation detection
- Weather correlation analysis
- Time-based correlation factors
- Historical correlation patterns

### 3. Weekly Learning System
- Continuous model improvement
- Pattern recognition and storage
- Performance tracking and optimization
- Real-time feedback integration
- Hyperparameter optimization

### 4. Comprehensive Data Integration
- 14+ different data source types
- Real-time API integration
- Cross-reference validation
- Data quality scoring
- Missing data handling

### 5. Risk Management
- Kelly Criterion position sizing
- Risk score calculation
- Correlation limits
- Confidence thresholds
- Expected value minimums

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error description",
  "message": "Detailed error message"
}
```

## Rate Limiting

- Standard rate limits apply
- Premium features available
- Bulk analysis supported

## Authentication

- API key authentication (when configured)
- Environment variable configuration
- Secure HTTPS endpoints

## Performance

- Async processing for all endpoints
- Parallel data fetching
- Intelligent caching
- Response time optimization
- Scalable architecture

## Getting Started

1. **Basic Moneyline Prediction:**
```bash
curl -X POST https://your-api-url/api/moneyline \
  -H "Content-Type: application/json" \
  -d '{"sport": "nfl", "home_team": "Chiefs", "away_team": "Bills"}'
```

2. **Generate Optimal Parlays:**
```bash
curl -X POST https://your-api-url/api/parlays \
  -H "Content-Type: application/json" \
  -d '{"risk_level": "moderate", "sports": ["nfl", "nba"]}'
```

3. **Comprehensive Analysis:**
```bash
curl -X POST https://your-api-url/api/comprehensive \
  -H "Content-Type: application/json" \
  -d '{"games": [{"sport": "nba", "home_team": "Lakers", "away_team": "Warriors"}]}'
```

## Advanced Usage

### Custom Parlay Optimization
```javascript
const response = await fetch('/api/parlays', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    risk_level: 'aggressive',
    sports: ['nfl', 'nba', 'mlb'],
    min_confidence: 0.7,
    max_correlation: 0.25,
    min_expected_value: 15.0,
    games: yourGamesList
  })
});

const parlays = await response.json();
console.log(`Found ${parlays.parlays_generated} optimal parlays`);
```

### Weekly Learning Updates
```javascript
// Trigger weekly learning update
await fetch('/api/learning/update', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    update_type: 'weekly'
  })
});
```

## Support

This is the most advanced sports prediction API ever created, combining traditional statistical analysis with cutting-edge machine learning, comprehensive data integration, and continuous learning systems.

For technical support or feature requests, please contact the development team.

---

**Built with Claude Code - The ultimate sports prediction platform**