import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { game_id, sport, team_data, player_data, historical_data, market_data } = body;

    if (!game_id || !sport) {
      return NextResponse.json(
        { error: 'Missing required parameters: game_id and sport' },
        { status: 400 }
      );
    }

    // For now, return enhanced mock predictions until Python integration is fully set up
    const mockPrediction = await generateEnhancedMLPrediction({
      game_id,
      sport,
      team_data,
      player_data,
      historical_data,
      market_data
    });

    return NextResponse.json({
      success: true,
      prediction: mockPrediction,
      timestamp: new Date().toISOString(),
      model_version: '2.1.0'
    });

  } catch (error) {
    console.error('ML Prediction API Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate ML prediction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'nba';
    const game_id = searchParams.get('game_id');
    const model_type = searchParams.get('model') || 'ensemble';

    if (!game_id) {
      return NextResponse.json(
        { error: 'game_id parameter is required' },
        { status: 400 }
      );
    }

    // Generate ML prediction for the specific game
    const prediction = await generateEnhancedMLPrediction({
      game_id,
      sport,
      model_type
    });

    return NextResponse.json({
      success: true,
      prediction,
      sport,
      game_id,
      model_type,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('ML Prediction GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ML prediction' },
      { status: 500 }
    );
  }
}

// Enhanced ML prediction generator with realistic modeling
async function generateEnhancedMLPrediction(params: any) {
  const { game_id, sport, team_data, model_type = 'ensemble' } = params;

  // Simulate different model contributions
  const modelContributions = {
    transformer: 0.25,
    lstm: 0.20,
    gnn: 0.20,
    xgboost: 0.20,
    lightgbm: 0.15
  };

  // Generate base predictions with some sport-specific logic
  const sportFactors = getSportSpecificFactors(sport);
  const baseProbability = 0.45 + (Math.random() * 0.1); // 45-55% base range
  
  // Apply sport-specific adjustments
  const homeProbability = Math.min(0.95, Math.max(0.05, 
    baseProbability + sportFactors.homeAdvantage + (Math.random() * 0.1 - 0.05)
  ));

  // Calculate other predictions based on home probability
  const awayProbability = 1 - homeProbability;
  
  // Generate spread and total predictions
  const spread = generateSpreadPrediction(homeProbability, sport);
  const total = generateTotalPrediction(sport);
  
  // Generate individual scores
  const scores = generateScorePredictions(sport, total, spread);

  // Calculate confidence based on model agreement
  const confidence = calculateModelConfidence(homeProbability, modelContributions);
  
  // Generate Kelly criterion and expected value calculations
  const bettingAnalysis = generateBettingAnalysis(homeProbability, confidence, sport);

  // Generate feature importance
  const featureImportance = generateFeatureImportance(sport);

  return {
    game_id,
    sport,
    model_type,
    predictions: {
      home_win_probability: homeProbability,
      away_win_probability: awayProbability,
      spread: spread,
      total: total,
      home_score: scores.home,
      away_score: scores.away,
      confidence_intervals: {
        home_probability: [homeProbability - 0.08, homeProbability + 0.08],
        spread: [spread - 2.5, spread + 2.5],
        total: [total - 8, total + 8]
      }
    },
    confidence: confidence,
    model_contributions: modelContributions,
    betting_analysis: bettingAnalysis,
    feature_importance: featureImportance,
    risk_assessment: {
      variance: Math.random() * 0.15 + 0.05, // 5-20% variance
      uncertainty: 1 - confidence,
      recommendation_strength: confidence > 0.7 ? 'strong' : confidence > 0.6 ? 'moderate' : 'weak'
    },
    advanced_metrics: {
      sharpe_ratio: 0.8 + Math.random() * 0.6,
      information_ratio: 0.5 + Math.random() * 0.4,
      maximum_drawdown: Math.random() * 0.15,
      win_rate_historical: 0.65 + Math.random() * 0.15
    },
    timestamp: new Date().toISOString(),
    next_update: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
  };
}

function getSportSpecificFactors(sport: string) {
  const factors: Record<string, any> = {
    nba: { homeAdvantage: 0.06, paceVariance: 0.12, scoring: { min: 200, max: 260 } },
    nfl: { homeAdvantage: 0.08, weatherImpact: 0.05, scoring: { min: 35, max: 65 } },
    mlb: { homeAdvantage: 0.04, pitchingImpact: 0.15, scoring: { min: 6, max: 18 } },
    nhl: { homeAdvantage: 0.05, goalieImpact: 0.20, scoring: { min: 4, max: 10 } },
    ncaamb: { homeAdvantage: 0.10, upsetFactor: 0.08, scoring: { min: 120, max: 180 } },
    ncaafb: { homeAdvantage: 0.12, motivationFactor: 0.10, scoring: { min: 35, max: 75 } },
    wnba: { homeAdvantage: 0.05, fatigueFactor: 0.06, scoring: { min: 140, max: 200 } },
    tennis: { homeAdvantage: 0.02, surfaceImpact: 0.12, scoring: { min: 2, max: 5 } },
    soccer: { homeAdvantage: 0.08, tacticalImpact: 0.15, scoring: { min: 1, max: 6 } },
    mls: { homeAdvantage: 0.07, travelImpact: 0.08, scoring: { min: 2, max: 5 } },
    ufc: { homeAdvantage: 0.03, styleMatchup: 0.20, scoring: { min: 1, max: 3 } },
    boxing: { homeAdvantage: 0.04, reachAdvantage: 0.15, scoring: { min: 1, max: 12 } }
  };

  return factors[sport] || factors['nba'];
}

function generateSpreadPrediction(homeProbability: number, sport: string): number {
  // Convert probability to spread
  const impliedSpread = (homeProbability - 0.5) * 20; // Scale to realistic spread range
  
  // Add some sport-specific adjustments
  const sportMultipliers: Record<string, number> = {
    nba: 1.2, nfl: 1.0, mlb: 0.3, nhl: 0.8, ncaamb: 1.5, ncaafb: 1.8,
    tennis: 0.4, soccer: 0.2, ufc: 0.1
  };
  
  const multiplier = sportMultipliers[sport] || 1.0;
  return Math.round((impliedSpread * multiplier) * 2) / 2; // Round to nearest 0.5
}

function generateTotalPrediction(sport: string): number {
  const factors = getSportSpecificFactors(sport);
  const { min, max } = factors.scoring;
  
  // Generate total within sport-specific range
  const baseLine = min + (max - min) * (0.4 + Math.random() * 0.2); // 40-60% of range
  return Math.round(baseLine * 2) / 2; // Round to nearest 0.5
}

function generateScorePredictions(sport: string, total: number, spread: number) {
  const homeScore = (total + spread) / 2;
  const awayScore = (total - spread) / 2;
  
  return {
    home: Math.round(homeScore * 10) / 10,
    away: Math.round(awayScore * 10) / 10
  };
}

function calculateModelConfidence(probability: number, contributions: any): number {
  // Confidence based on how far probability is from 50/50
  const edgeConfidence = Math.abs(probability - 0.5) * 2;
  
  // Add some randomness for model uncertainty
  const modelVariance = Math.random() * 0.15;
  
  // Combine factors
  const confidence = Math.min(0.95, Math.max(0.35, 
    edgeConfidence * 0.7 + 0.3 - modelVariance
  ));
  
  return Math.round(confidence * 100) / 100;
}

function generateBettingAnalysis(probability: number, confidence: number, sport: string) {
  // Generate realistic moneyline odds
  const homeOdds = probability > 0.5 
    ? -(probability / (1 - probability) * 100)
    : ((1 - probability) / probability * 100);
  
  const awayOdds = probability < 0.5
    ? -((1 - probability) / probability * 100)
    : (probability / (1 - probability) * 100);

  // Kelly Criterion calculation
  const kellyHome = probability > 0.52 
    ? Math.max(0, (probability * (Math.abs(homeOdds) / 100) - (1 - probability)) / (Math.abs(homeOdds) / 100))
    : 0;
  
  const kellyAway = (1 - probability) > 0.52
    ? Math.max(0, ((1 - probability) * (Math.abs(awayOdds) / 100) - probability) / (Math.abs(awayOdds) / 100))
    : 0;

  // Expected Value calculation
  const evHome = probability > 0.5 
    ? (probability - (100 / (Math.abs(homeOdds) + 100))) * 100
    : 0;
  
  const evAway = (1 - probability) > 0.5
    ? ((1 - probability) - (100 / (Math.abs(awayOdds) + 100))) * 100
    : 0;

  return {
    recommended_bets: [],
    kelly_criterion: {
      home_fraction: kellyHome > 0.01 ? Math.min(kellyHome, 0.25) : 0,
      away_fraction: kellyAway > 0.01 ? Math.min(kellyAway, 0.25) : 0
    },
    expected_value: {
      home: evHome,
      away: evAway,
      spread: Math.random() * 10 - 5, // Mock spread EV
      total: Math.random() * 8 - 4    // Mock total EV
    },
    implied_odds: {
      home: Math.round(homeOdds),
      away: Math.round(awayOdds)
    },
    market_efficiency: 0.85 + Math.random() * 0.1, // 85-95%
    value_rating: confidence > 0.7 && (evHome > 5 || evAway > 5) ? 'excellent' : 
                  confidence > 0.6 && (evHome > 2 || evAway > 2) ? 'good' : 'fair'
  };
}

function generateFeatureImportance(sport: string): Record<string, number> {
  const features: Record<string, Record<string, number>> = {
    nba: {
      'offensive_rating': 0.18,
      'defensive_rating': 0.16,
      'pace': 0.12,
      'rest_days': 0.08,
      'home_advantage': 0.07,
      'recent_form': 0.10,
      'player_health': 0.09,
      'head_to_head': 0.06,
      'motivation': 0.08,
      'referee_bias': 0.06
    },
    nfl: {
      'point_differential': 0.20,
      'turnover_margin': 0.15,
      'injury_report': 0.12,
      'weather': 0.08,
      'home_advantage': 0.10,
      'rest_days': 0.07,
      'divisional_game': 0.08,
      'coaching': 0.09,
      'motivation': 0.06,
      'travel_distance': 0.05
    }
  };

  return features[sport] || features['nba'];
}