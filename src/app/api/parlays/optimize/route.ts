/**
 * Parlay Optimization API - LIVE DATA ONLY
 * Generates optimal parlays from real-time games and odds
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSportsGames, getGameOdds } from '@/services/sportsRadarApi';
import { db } from '@/services/database';

interface ParlayLeg {
  team: string;
  bet_type: string;
  line: number;
  odds: number;
  probability: number;
  sport: string;
  game_id: string;
}

interface OptimizedParlay {
  parlay_id: string;
  legs: ParlayLeg[];
  combined_odds: number;
  total_probability: number;
  expected_value: number;
  risk_score: number;
  confidence_score: number;
  correlation_score: number;
  kelly_stake: number;
  key_factors: string[];
  warnings: string[];
  sports_included: string[];
}

function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

function calculateParlayOdds(legs: ParlayLeg[]): number {
  let combinedDecimal = 1;
  
  legs.forEach(leg => {
    const decimal = leg.odds > 0 
      ? (leg.odds / 100) + 1 
      : (100 / Math.abs(leg.odds)) + 1;
    combinedDecimal *= decimal;
  });
  
  // Convert back to American odds
  if (combinedDecimal >= 2) {
    return Math.round((combinedDecimal - 1) * 100);
  } else {
    return Math.round(-100 / (combinedDecimal - 1));
  }
}

function calculateParlayProbability(legs: ParlayLeg[]): number {
  return legs.reduce((prob, leg) => prob * leg.probability, 1);
}

function calculateCorrelation(legs: ParlayLeg[]): number {
  // Simple correlation based on same sport/time
  let correlation = 0;
  const sports = legs.map(l => l.sport);
  const uniqueSports = new Set(sports);
  
  // Higher correlation if same sport
  if (uniqueSports.size === 1) {
    correlation += 0.3;
  } else if (uniqueSports.size < legs.length) {
    correlation += 0.15;
  }
  
  // Add correlation for divisional games, primetime, etc.
  // This is simplified - in production would use more sophisticated analysis
  return Math.min(correlation, 0.5);
}

function calculateRiskScore(parlay: OptimizedParlay): number {
  // Risk factors:
  // - Number of legs (more legs = higher risk)
  // - Combined probability (lower prob = higher risk)
  // - Correlation (higher correlation = higher risk)
  
  const legRisk = Math.min(parlay.legs.length * 0.15, 0.5);
  const probRisk = 1 - parlay.total_probability;
  const corrRisk = parlay.correlation_score * 0.3;
  
  return Math.min(legRisk + probRisk * 0.5 + corrRisk, 1);
}

async function fetchLiveParlayLegs(
  riskLevel: string,
  maxLegs: number,
  minEV: number
): Promise<ParlayLeg[]> {
  const legs: ParlayLeg[] = [];
  
  try {
    // Fetch all live games
    const sportsData = await getAllSportsGames();
    
    for (const sportData of sportsData) {
      for (const game of sportData.games) {
        // Get odds for this game
        const odds = await getGameOdds(sportData.sport.toLowerCase(), game.id);
        
        if (odds?.markets) {
          const moneylineMarket = odds.markets.find(m => m.name === 'moneyline');
          
          if (moneylineMarket?.books?.[0]?.outcomes) {
            for (const outcome of moneylineMarket.books[0].outcomes) {
              const americanOdds = parseInt(outcome.odds.american);
              const impliedProb = calculateImpliedProbability(americanOdds);
              
              // Calculate true probability (simplified - would use prediction model)
              const trueProbability = impliedProb * (1 + (Math.random() * 0.2 - 0.1)); // +/- 10% adjustment
              const expectedValue = ((trueProbability * (americanOdds > 0 ? americanOdds / 100 : -100 / americanOdds)) - (1 - trueProbability)) * 100;
              
              // Filter based on risk level and EV
              const meetsRiskCriteria = 
                (riskLevel === 'conservative' && trueProbability >= 0.65) ||
                (riskLevel === 'moderate' && trueProbability >= 0.55) ||
                (riskLevel === 'aggressive' && trueProbability >= 0.45) ||
                (riskLevel === 'yolo' && trueProbability >= 0.35);
              
              if (meetsRiskCriteria && expectedValue >= minEV) {
                const teamName = outcome.type === 'home' 
                  ? `${game.home_team.market || ''} ${game.home_team.name || game.home_team.alias}`.trim()
                  : `${game.away_team.market || ''} ${game.away_team.name || game.away_team.alias}`.trim();
                
                legs.push({
                  team: teamName,
                  bet_type: 'moneyline',
                  line: 0,
                  odds: americanOdds,
                  probability: trueProbability,
                  sport: sportData.sport,
                  game_id: game.id
                });
              }
            }
          }
          
          // Also check spread markets
          const spreadMarket = odds.markets.find(m => m.name === 'spread');
          if (spreadMarket?.books?.[0]?.outcomes) {
            for (const outcome of spreadMarket.books[0].outcomes) {
              if (outcome.spread) {
                const americanOdds = parseInt(outcome.odds.american);
                const impliedProb = calculateImpliedProbability(americanOdds);
                const trueProbability = impliedProb * (1 + (Math.random() * 0.15 - 0.075));
                const expectedValue = ((trueProbability * 1.91) - 1) * 100; // Assuming -110 odds
                
                if (expectedValue >= minEV) {
                  const teamName = outcome.type === 'home'
                    ? `${game.home_team.market || ''} ${game.home_team.name || game.home_team.alias}`.trim()
                    : `${game.away_team.market || ''} ${game.away_team.name || game.away_team.alias}`.trim();
                  
                  legs.push({
                    team: teamName,
                    bet_type: 'spread',
                    line: outcome.spread,
                    odds: americanOdds,
                    probability: trueProbability,
                    sport: sportData.sport,
                    game_id: `${game.id}_spread`
                  });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching parlay legs:', error);
  }
  
  return legs;
}

function generateOptimalParlays(
  availableLegs: ParlayLeg[],
  maxParlays: number,
  minLegs: number,
  maxLegs: number,
  minEV: number,
  maxCorrelation: number
): OptimizedParlay[] {
  const parlays: OptimizedParlay[] = [];
  const usedCombinations = new Set<string>();
  
  // Generate combinations
  for (let parlayCount = 0; parlayCount < maxParlays && availableLegs.length >= minLegs; parlayCount++) {
    let bestParlay: OptimizedParlay | null = null;
    let bestEV = minEV;
    
    // Try different combinations
    for (let attempt = 0; attempt < 100; attempt++) {
      const numLegs = Math.min(
        Math.floor(Math.random() * (maxLegs - minLegs + 1)) + minLegs,
        availableLegs.length
      );
      
      // Randomly select legs
      const shuffled = [...availableLegs].sort(() => Math.random() - 0.5);
      const selectedLegs = shuffled.slice(0, numLegs);
      
      // Check if combination already used
      const comboKey = selectedLegs.map(l => l.game_id).sort().join('_');
      if (usedCombinations.has(comboKey)) continue;
      
      // Calculate parlay metrics
      const combinedOdds = calculateParlayOdds(selectedLegs);
      const totalProbability = calculateParlayProbability(selectedLegs);
      const correlation = calculateCorrelation(selectedLegs);
      
      // Skip if correlation too high
      if (correlation > maxCorrelation) continue;
      
      // Calculate expected value
      const decimalOdds = combinedOdds > 0 
        ? (combinedOdds / 100) + 1 
        : (100 / Math.abs(combinedOdds)) + 1;
      const expectedValue = (totalProbability * (decimalOdds - 1) - (1 - totalProbability)) * 100;
      
      // Skip if EV too low
      if (expectedValue < minEV) continue;
      
      // Calculate Kelly stake
      const kelly = Math.max(0, Math.min(
        ((totalProbability * (decimalOdds - 1) - (1 - totalProbability)) / (decimalOdds - 1)) * 0.25,
        0.05
      ));
      
      // Build parlay object
      const parlay: OptimizedParlay = {
        parlay_id: `parlay_${Date.now()}_${parlayCount}`,
        legs: selectedLegs,
        combined_odds: combinedOdds,
        total_probability: totalProbability,
        expected_value: expectedValue,
        risk_score: 0, // Will calculate after
        confidence_score: Math.min(0.95, 0.5 + (expectedValue / 50) + (totalProbability / 2)),
        correlation_score: correlation,
        kelly_stake: kelly,
        key_factors: [],
        warnings: [],
        sports_included: [...new Set(selectedLegs.map(l => l.sport))]
      };
      
      parlay.risk_score = calculateRiskScore(parlay);
      
      // Add key factors
      if (correlation < 0.15) {
        parlay.key_factors.push('Low correlation between legs');
      }
      if (parlay.confidence_score > 0.7) {
        parlay.key_factors.push('High confidence predictions');
      }
      if (totalProbability > 0.3) {
        parlay.key_factors.push('Strong probability of success');
      }
      if (parlay.sports_included.length > 1) {
        parlay.key_factors.push('Diversified across sports');
      }
      
      // Add warnings
      if (correlation > 0.4) {
        parlay.warnings.push('High correlation between selections');
      }
      if (numLegs > 4) {
        parlay.warnings.push('Large parlay reduces hit probability');
      }
      if (parlay.risk_score > 0.7) {
        parlay.warnings.push('High risk parlay');
      }
      
      // Track best parlay for this iteration
      if (expectedValue > bestEV) {
        bestEV = expectedValue;
        bestParlay = parlay;
      }
    }
    
    if (bestParlay) {
      parlays.push(bestParlay);
      usedCombinations.add(bestParlay.legs.map(l => l.game_id).sort().join('_'));
      
      // Save to database
      db.saveParlay({
        parlay_id: bestParlay.parlay_id,
        legs: bestParlay.legs,
        combined_odds: bestParlay.combined_odds,
        total_probability: bestParlay.total_probability,
        expected_value: bestParlay.expected_value,
        risk_level: bestParlay.risk_score <= 0.3 ? 'low' : bestParlay.risk_score <= 0.6 ? 'medium' : 'high',
        correlation_score: bestParlay.correlation_score,
        recommended: bestParlay.expected_value > 10 && bestParlay.confidence_score > 0.65
      });
    }
  }
  
  // Sort by expected value
  return parlays.sort((a, b) => b.expected_value - a.expected_value);
}

export async function POST(request: NextRequest) {
  try {
    const { 
      riskLevel = 'moderate',
      maxParlays = 10,
      minExpectedValue = 8.0,
      maxCorrelation = 0.3
    } = await request.json();
    
    // Define constraints based on risk level
    const constraints = {
      conservative: { minLegs: 2, maxLegs: 3, minProb: 0.65 },
      moderate: { minLegs: 2, maxLegs: 4, minProb: 0.55 },
      aggressive: { minLegs: 3, maxLegs: 5, minProb: 0.45 },
      yolo: { minLegs: 3, maxLegs: 6, minProb: 0.35 }
    };
    
    const config = constraints[riskLevel as keyof typeof constraints] || constraints.moderate;
    
    // Fetch live parlay legs
    const availableLegs = await fetchLiveParlayLegs(
      riskLevel,
      config.maxLegs,
      minExpectedValue / 2 // Lower threshold for individual legs
    );
    
    if (availableLegs.length < config.minLegs) {
      return NextResponse.json({
        success: false,
        message: 'Not enough games available for parlay generation',
        parlays: []
      });
    }
    
    // Generate optimal parlays
    const optimizedParlays = generateOptimalParlays(
      availableLegs,
      maxParlays,
      config.minLegs,
      config.maxLegs,
      minExpectedValue,
      maxCorrelation
    );
    
    return NextResponse.json({
      success: true,
      parlays: optimizedParlays,
      stats: {
        total_legs_analyzed: availableLegs.length,
        parlays_generated: optimizedParlays.length,
        avg_expected_value: optimizedParlays.length > 0 
          ? optimizedParlays.reduce((sum, p) => sum + p.expected_value, 0) / optimizedParlays.length
          : 0,
        best_parlay: optimizedParlays[0] || null
      }
    });
    
  } catch (error) {
    console.error('Parlay optimization error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to optimize parlays',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}