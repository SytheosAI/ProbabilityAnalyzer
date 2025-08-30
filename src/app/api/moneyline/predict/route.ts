/**
 * Moneyline Prediction API Endpoint
 * Processes REAL live game data and generates predictions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTeamStatistics, getInjuries, getH2H } from '@/services/sportsRadarApi';
import { db } from '@/services/database';

// Weather API for outdoor sports
const WEATHER_API_KEY = 'cebea6d73816dccaecbe0dcd99d2471c';

async function getWeatherData(city: string) {
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${WEATHER_API_KEY}&units=imperial`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Weather API error:', error);
  }
  return null;
}

function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

function calculateTrueProbability(
  homeStats: any,
  awayStats: any,
  h2h: any,
  injuries: any[],
  weather: any,
  isHome: boolean
): number {
  let probability = 0.5; // Base probability
  
  // Win percentage factor (30% weight)
  const winPctDiff = homeStats.win_percentage - awayStats.win_percentage;
  probability += winPctDiff * 0.3;
  
  // Points differential factor (20% weight)
  const homePtsDiff = homeStats.points_per_game - homeStats.points_against_per_game;
  const awayPtsDiff = awayStats.points_per_game - awayStats.points_against_per_game;
  const ptsDiffAdvantage = (homePtsDiff - awayPtsDiff) / 20; // Normalize
  probability += (isHome ? ptsDiffAdvantage : -ptsDiffAdvantage) * 0.2;
  
  // Home/Away record factor (15% weight)
  if (isHome && homeStats.home_record) {
    const homeWins = parseInt(homeStats.home_record.split('-')[0]);
    const homeLosses = parseInt(homeStats.home_record.split('-')[1]);
    const homeWinPct = homeWins / (homeWins + homeLosses);
    probability += (homeWinPct - 0.5) * 0.15;
  } else if (!isHome && awayStats.away_record) {
    const awayWins = parseInt(awayStats.away_record.split('-')[0]);
    const awayLosses = parseInt(awayStats.away_record.split('-')[1]);
    const awayWinPct = awayWins / (awayWins + awayLosses);
    probability += (awayWinPct - 0.5) * 0.15;
  }
  
  // Head-to-head factor (15% weight)
  if (h2h && h2h.total_games > 0) {
    const h2hAdvantage = isHome 
      ? (h2h.team1_wins / h2h.total_games) - 0.5
      : (h2h.team2_wins / h2h.total_games) - 0.5;
    probability += h2hAdvantage * 0.15;
  }
  
  // Injury impact (10% weight)
  const homeInjuries = injuries.filter(inj => 
    inj.team === (isHome ? homeStats.team_name : awayStats.team_name) && 
    inj.impact > 0.5
  ).length;
  const awayInjuries = injuries.filter(inj => 
    inj.team === (!isHome ? homeStats.team_name : awayStats.team_name) && 
    inj.impact > 0.5
  ).length;
  const injuryAdvantage = (awayInjuries - homeInjuries) * 0.03;
  probability += (isHome ? injuryAdvantage : -injuryAdvantage);
  
  // Weather impact for outdoor sports (5% weight)
  if (weather && ['NFL', 'MLB'].includes(homeStats.sport)) {
    if (weather.wind?.speed > 20) {
      probability -= 0.02; // Wind favors defense/under
    }
    if (weather.main?.temp < 32) {
      probability -= 0.03; // Cold weather impacts offense
    }
  }
  
  // Recent form (5% weight) - using last 5 games
  if (homeStats.last_5_record && awayStats.last_5_record) {
    const homeRecent = parseInt(homeStats.last_5_record.split('-')[0]) / 5;
    const awayRecent = parseInt(awayStats.last_5_record.split('-')[0]) / 5;
    probability += (isHome ? homeRecent - awayRecent : awayRecent - homeRecent) * 0.05;
  }
  
  // Ensure probability stays within bounds
  return Math.max(0.05, Math.min(0.95, probability));
}

function calculateExpectedValue(
  trueProbability: number,
  americanOdds: number
): number {
  const impliedProb = calculateImpliedProbability(americanOdds);
  const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
  
  // EV = (Probability of Winning × Amount Won) - (Probability of Losing × Amount Lost)
  const ev = (trueProbability * (decimalOdds - 1) * 100) - ((1 - trueProbability) * 100);
  return ev;
}

function calculateKellyCriterion(
  trueProbability: number,
  americanOdds: number
): number {
  const decimalOdds = americanOdds > 0 ? (americanOdds / 100) + 1 : (100 / Math.abs(americanOdds)) + 1;
  const b = decimalOdds - 1;
  const p = trueProbability;
  const q = 1 - trueProbability;
  
  // Kelly formula: f = (bp - q) / b
  const kelly = (b * p - q) / b;
  
  // Use fractional Kelly (25%) for safety
  return Math.max(0, Math.min(kelly * 0.25, 0.1));
}

function getValueRating(expectedValue: number, edge: number): string {
  if (expectedValue > 10 && edge > 0.08) return 'excellent';
  if (expectedValue > 7 && edge > 0.05) return 'good';
  if (expectedValue > 4 && edge > 0.03) return 'moderate';
  return 'poor';
}

export async function POST(request: NextRequest) {
  try {
    const { game } = await request.json();
    
    if (!game) {
      return NextResponse.json({ error: 'Game data required' }, { status: 400 });
    }
    
    // Fetch real team statistics
    const [homeStats, awayStats] = await Promise.all([
      getTeamStatistics(game.sport.toLowerCase(), game.home_team),
      getTeamStatistics(game.sport.toLowerCase(), game.away_team)
    ]);
    
    // Fetch injuries
    const injuries = await getInjuries(game.sport.toLowerCase());
    
    // Fetch head-to-head
    const h2h = await getH2H(
      game.sport.toLowerCase(),
      game.home_team,
      game.away_team
    );
    
    // Get weather for outdoor venues
    let weather = null;
    if (game.venue && ['NFL', 'MLB'].includes(game.sport)) {
      const city = game.venue.split(',')[0];
      weather = await getWeatherData(city);
    }
    
    // Calculate probabilities for both teams
    const homeTrueProb = calculateTrueProbability(
      homeStats,
      awayStats,
      h2h,
      injuries,
      weather,
      true
    );
    
    const awayTrueProb = 1 - homeTrueProb;
    
    // Calculate implied probabilities from odds
    const homeImplied = calculateImpliedProbability(game.home_moneyline);
    const awayImplied = calculateImpliedProbability(game.away_moneyline);
    
    // Determine which side has value
    const homeEdge = homeTrueProb - homeImplied;
    const awayEdge = awayTrueProb - awayImplied;
    
    // Pick the side with better edge
    const pickHome = homeEdge > awayEdge;
    const selectedTeam = pickHome ? game.home_team : game.away_team;
    const selectedOdds = pickHome ? game.home_moneyline : game.away_moneyline;
    const selectedProb = pickHome ? homeTrueProb : awayTrueProb;
    const selectedEdge = pickHome ? homeEdge : awayEdge;
    
    // Calculate metrics
    const expectedValue = calculateExpectedValue(selectedProb, selectedOdds);
    const kelly = calculateKellyCriterion(selectedProb, selectedOdds);
    const confidence = Math.min(0.95, 0.5 + Math.abs(selectedEdge) * 2 + (expectedValue / 50));
    
    // Build key factors
    const keyFactors: any = {};
    
    if (Math.abs(homeStats.win_percentage - awayStats.win_percentage) > 0.1) {
      keyFactors.record_advantage = pickHome 
        ? `${game.home_team} superior record`
        : `${game.away_team} superior record`;
    }
    
    if (injuries.length > 0) {
      const significantInjuries = injuries.filter(inj => inj.impact > 0.5);
      if (significantInjuries.length > 0) {
        keyFactors.injury_report = `${significantInjuries.length} key injuries affecting odds`;
      }
    }
    
    if (h2h && h2h.total_games > 0) {
      keyFactors.head_to_head = `${h2h.team1_wins}-${h2h.team2_wins} in last ${h2h.total_games} matchups`;
    }
    
    if (weather) {
      if (weather.wind?.speed > 15) {
        keyFactors.weather = `Wind ${weather.wind.speed}mph may impact game`;
      }
      if (weather.main?.temp < 40) {
        keyFactors.weather = `Cold weather (${weather.main.temp}°F) factor`;
      }
    }
    
    if (pickHome) {
      keyFactors.home_advantage = 'Playing at home venue';
    }
    
    const prediction = {
      game_id: game.game_id,
      team: selectedTeam,
      sport: game.sport,
      american_odds: selectedOdds,
      decimal_odds: selectedOdds > 0 ? (selectedOdds / 100) + 1 : (100 / Math.abs(selectedOdds)) + 1,
      implied_probability: calculateImpliedProbability(selectedOdds),
      true_probability: selectedProb,
      expected_value: expectedValue,
      edge: selectedEdge,
      kelly_criterion: kelly,
      confidence_score: confidence,
      value_rating: getValueRating(expectedValue, selectedEdge),
      key_factors: keyFactors
    };
    
    // Save to database
    await db.savePrediction({
      game_id: game.game_id,
      prediction_type: 'moneyline',
      predicted_outcome: selectedTeam,
      confidence: confidence,
      probability: selectedProb,
      expected_value: expectedValue
    });
    
    return NextResponse.json(prediction);
    
  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate prediction' },
      { status: 500 }
    );
  }
}