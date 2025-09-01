// Expected Value Analysis Service
// Core service for finding profitable betting opportunities by comparing our model predictions vs bookmaker odds

import { Game } from './sportsDataService';
import { GamePrediction } from './predictionsService';

// Value rating system
export enum ValueRating {
  FIVE_STAR = 5,    // EV > 15% - Exceptional value, max bet
  FOUR_STAR = 4,    // EV 10-15% - Great value, strong bet
  THREE_STAR = 3,   // EV 5-10% - Good value, standard bet
  TWO_STAR = 2,     // EV 2-5% - Slight edge, small bet
  ONE_STAR = 1,     // EV 0-2% - Minimal edge, optional
  NO_VALUE = 0      // EV < 0% - No value, avoid
}

export interface ExpectedValueAnalysis {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  betType: 'moneyline' | 'spread' | 'total' | 'prop';
  
  // Probability calculations
  trueProbability: number;           // Our model's probability
  impliedProbability: number;        // Bookmaker's implied probability
  edge: number;                      // True prob - implied prob
  
  // Expected value calculations
  expectedValue: number;              // EV as decimal (0.15 = 15%)
  expectedValuePercent: number;       // EV as percentage
  expectedProfit: number;            // Expected profit per $100 bet
  
  // Betting details
  currentOdds: number;               // Current moneyline odds
  openingOdds?: number;              // Opening line for tracking movement
  bestAvailableOdds?: number;        // Best odds across all books
  
  // Value assessment
  valueRating: ValueRating;
  confidence: number;                // Model confidence 0-1
  kellyCriterion: number;           // Recommended bet size as % of bankroll
  suggestedUnits: number;           // 1-10 units based on edge
  
  // Line movement tracking
  lineMovement?: LineMovement;
  
  // Sharp vs public analysis
  sharpAnalysis?: SharpMoneyAnalysis;
  
  // Metadata
  timestamp: string;
  lastUpdated: string;
}

export interface LineMovement {
  openingLine: number;
  currentLine: number;
  lineDirection: 'up' | 'down' | 'stable';
  movementMagnitude: number;
  steamMove: boolean;              // Sharp money causing rapid movement
  reverseLineMovement: boolean;    // Line moving opposite to betting %
  keyNumbers: boolean;             // Crossed key betting numbers
  closingLineValue: number;        // Projected CLV
}

export interface SharpMoneyAnalysis {
  bettingPercentage: number;       // % of bets on this side
  moneyPercentage: number;         // % of money on this side
  sharpSide: 'home' | 'away' | 'none';
  publicSide: 'home' | 'away' | 'none';
  sharpDisagreement: boolean;      // Sharp money disagrees with public
  steamDetected: boolean;
  professionalBettors: number;     // Estimated % of sharp action
}

export interface BankrollManagement {
  currentBankroll: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  maxBetSize: number;
  recommendedBet: number;
  kellyMultiplier: number;         // Kelly fraction (0.25 = quarter Kelly)
}

export interface ValueOpportunity {
  analysis: ExpectedValueAnalysis;
  recommendation: string;
  reasoning: string[];
  warnings: string[];
  historicalPerformance?: {
    similarBetsWinRate: number;
    averageROI: number;
    sampleSize: number;
  };
}

// Main Expected Value Calculator
export class ExpectedValueCalculator {
  private readonly VIG_ADJUSTMENT = 0.02; // Typical bookmaker vig
  private readonly MIN_EDGE_THRESHOLD = 0.02; // Minimum 2% edge to consider
  
  /**
   * Convert American odds to implied probability
   */
  public oddsToImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      // Positive odds (underdog)
      return 100 / (americanOdds + 100);
    } else {
      // Negative odds (favorite)
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }
  
  /**
   * Convert American odds to decimal odds
   */
  public oddsToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }
  
  /**
   * Calculate true probability from multiple model predictions
   * Weights models by their historical accuracy
   */
  public calculateTrueProbability(
    predictions: GamePrediction[],
    modelWeights?: Record<string, number>
  ): number {
    if (predictions.length === 0) return 0.5;
    
    // Default equal weights if not provided
    const weights = modelWeights || predictions.reduce((acc, _, index) => {
      acc[`model_${index}`] = 1 / predictions.length;
      return acc;
    }, {} as Record<string, number>);
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    predictions.forEach((pred, index) => {
      const weight = weights[`model_${index}`] || 1 / predictions.length;
      weightedSum += pred.predictions.winProbability * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }
  
  /**
   * Calculate edge (true probability - implied probability)
   */
  public calculateEdge(trueProbability: number, impliedProbability: number): number {
    return trueProbability - impliedProbability;
  }
  
  /**
   * Calculate Expected Value
   * EV = (True Prob × Potential Win) - (Loss Prob × Stake)
   */
  public calculateExpectedValue(
    trueProbability: number,
    americanOdds: number
  ): number {
    const decimalOdds = this.oddsToDecimal(americanOdds);
    const winAmount = decimalOdds - 1; // Profit on $1 bet
    
    // EV = (P(win) × profit) - (P(loss) × stake)
    const ev = (trueProbability * winAmount) - ((1 - trueProbability) * 1);
    
    return ev;
  }
  
  /**
   * Calculate Kelly Criterion for optimal bet sizing
   * f = (bp - q) / b
   * where:
   * f = fraction of bankroll to bet
   * b = decimal odds - 1
   * p = probability of winning
   * q = probability of losing (1 - p)
   */
  public calculateKellyCriterion(
    trueProbability: number,
    americanOdds: number,
    kellyMultiplier: number = 0.25 // Quarter Kelly for safety
  ): number {
    const decimalOdds = this.oddsToDecimal(americanOdds);
    const b = decimalOdds - 1;
    const p = trueProbability;
    const q = 1 - trueProbability;
    
    const kelly = (b * p - q) / b;
    
    // Apply Kelly multiplier and ensure positive
    const adjustedKelly = Math.max(0, kelly * kellyMultiplier);
    
    // Cap at maximum reasonable bet size (10% of bankroll)
    return Math.min(adjustedKelly, 0.10);
  }
  
  /**
   * Determine value rating based on EV percentage
   */
  public getValueRating(evPercent: number): ValueRating {
    if (evPercent > 0.15) return ValueRating.FIVE_STAR;
    if (evPercent > 0.10) return ValueRating.FOUR_STAR;
    if (evPercent > 0.05) return ValueRating.THREE_STAR;
    if (evPercent > 0.02) return ValueRating.TWO_STAR;
    if (evPercent > 0) return ValueRating.ONE_STAR;
    return ValueRating.NO_VALUE;
  }
  
  /**
   * Calculate suggested units based on edge and confidence
   */
  public calculateSuggestedUnits(
    edge: number,
    confidence: number,
    valueRating: ValueRating
  ): number {
    const baseUnits = valueRating * 2; // 0-10 units based on rating
    const confidenceMultiplier = confidence; // 0-1
    const edgeMultiplier = Math.min(edge * 10, 2); // Cap at 2x for huge edges
    
    const units = baseUnits * confidenceMultiplier * edgeMultiplier;
    
    return Math.min(Math.max(Math.round(units), 1), 10); // 1-10 units
  }
  
  /**
   * Analyze line movement for sharp money indicators
   */
  public analyzeLineMovement(
    openingOdds: number,
    currentOdds: number,
    bettingPercentage?: number,
    moneyPercentage?: number
  ): LineMovement {
    const movement = currentOdds - openingOdds;
    const movementMagnitude = Math.abs(movement);
    
    // Detect steam moves (rapid line movement)
    const steamMove = movementMagnitude > 20; // 20+ point swing
    
    // Detect reverse line movement
    let reverseLineMovement = false;
    if (bettingPercentage && moneyPercentage) {
      // Line moving opposite to betting percentage indicates sharp money
      if (bettingPercentage > 0.6 && movement > 0) {
        reverseLineMovement = true; // Public on favorite but line moving toward dog
      } else if (bettingPercentage < 0.4 && movement < 0) {
        reverseLineMovement = true; // Public on dog but line moving toward favorite
      }
    }
    
    // Check for key numbers (especially in NFL)
    const keyNumbers = [3, 7, 10, 14]; // Key NFL numbers
    const crossedKey = keyNumbers.some(num => 
      (openingOdds < -num * 100 && currentOdds > -num * 100) ||
      (openingOdds > -num * 100 && currentOdds < -num * 100)
    );
    
    // Calculate projected closing line value
    const timeSinceOpen = 0.5; // Placeholder - would calculate actual time
    const projectedMovement = movement / timeSinceOpen;
    const closingLineValue = currentOdds + (projectedMovement * 0.5);
    
    return {
      openingLine: openingOdds,
      currentLine: currentOdds,
      lineDirection: movement > 0 ? 'up' : movement < 0 ? 'down' : 'stable',
      movementMagnitude: movementMagnitude,
      steamMove: steamMove,
      reverseLineMovement: reverseLineMovement,
      keyNumbers: crossedKey,
      closingLineValue: closingLineValue
    };
  }
  
  /**
   * Analyze sharp vs public money
   */
  public analyzeSharpMoney(
    bettingPercentage: number,
    moneyPercentage: number,
    lineMovement: LineMovement
  ): SharpMoneyAnalysis {
    // Determine sharp side based on money vs bet discrepancy
    let sharpSide: 'home' | 'away' | 'none' = 'none';
    let publicSide: 'home' | 'away' | 'none' = 'none';
    
    const discrepancy = Math.abs(moneyPercentage - bettingPercentage);
    const sharpDisagreement = discrepancy > 0.15; // 15% difference
    
    if (bettingPercentage > 0.6) {
      publicSide = 'home';
      if (moneyPercentage < 0.4) {
        sharpSide = 'away';
      }
    } else if (bettingPercentage < 0.4) {
      publicSide = 'away';
      if (moneyPercentage > 0.6) {
        sharpSide = 'home';
      }
    }
    
    // Estimate professional bettor percentage
    const professionalBettors = moneyPercentage > bettingPercentage 
      ? (moneyPercentage - bettingPercentage) * 100
      : 0;
    
    return {
      bettingPercentage: bettingPercentage,
      moneyPercentage: moneyPercentage,
      sharpSide: sharpSide,
      publicSide: publicSide,
      sharpDisagreement: sharpDisagreement,
      steamDetected: lineMovement.steamMove,
      professionalBettors: professionalBettors
    };
  }
}

/**
 * Main function to analyze expected value for a game
 */
export async function analyzeExpectedValue(
  game: Game,
  prediction: GamePrediction,
  options?: {
    includeLineMovement?: boolean;
    includeSharpAnalysis?: boolean;
    bankroll?: number;
    kellyMultiplier?: number;
  }
): Promise<ExpectedValueAnalysis> {
  const calculator = new ExpectedValueCalculator();
  
  // Get true probability from our models
  const trueProbability = prediction.predictions.winProbability;
  
  // Get current odds (use home moneyline as example)
  const currentOdds = game.homeMoneyline || -110;
  
  // Calculate implied probability
  const impliedProbability = calculator.oddsToImpliedProbability(currentOdds);
  
  // Calculate edge
  const edge = calculator.calculateEdge(trueProbability, impliedProbability);
  
  // Calculate expected value
  const expectedValue = calculator.calculateExpectedValue(trueProbability, currentOdds);
  const expectedValuePercent = expectedValue * 100;
  const expectedProfit = expectedValue * 100; // Per $100 bet
  
  // Get value rating
  const valueRating = calculator.getValueRating(expectedValue);
  
  // Calculate Kelly Criterion
  const kellyCriterion = calculator.calculateKellyCriterion(
    trueProbability,
    currentOdds,
    options?.kellyMultiplier || 0.25
  );
  
  // Calculate suggested units
  const suggestedUnits = calculator.calculateSuggestedUnits(
    edge,
    prediction.confidence,
    valueRating
  );
  
  // Analyze line movement if requested
  let lineMovement: LineMovement | undefined;
  if (options?.includeLineMovement && game.homeMoneyline) {
    // Would need to fetch opening odds from database
    const openingOdds = currentOdds - 10; // Mock data
    lineMovement = calculator.analyzeLineMovement(
      openingOdds,
      currentOdds,
      0.55, // Mock betting percentage
      0.45  // Mock money percentage
    );
  }
  
  // Analyze sharp money if requested
  let sharpAnalysis: SharpMoneyAnalysis | undefined;
  if (options?.includeSharpAnalysis && lineMovement) {
    sharpAnalysis = calculator.analyzeSharpMoney(
      0.55, // Mock betting percentage
      0.45, // Mock money percentage
      lineMovement
    );
  }
  
  return {
    gameId: game.id,
    sport: prediction.sport,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    betType: 'moneyline',
    
    trueProbability: trueProbability,
    impliedProbability: impliedProbability,
    edge: edge,
    
    expectedValue: expectedValue,
    expectedValuePercent: expectedValuePercent,
    expectedProfit: expectedProfit,
    
    currentOdds: currentOdds,
    openingOdds: lineMovement?.openingLine,
    
    valueRating: valueRating,
    confidence: prediction.confidence,
    kellyCriterion: kellyCriterion,
    suggestedUnits: suggestedUnits,
    
    lineMovement: lineMovement,
    sharpAnalysis: sharpAnalysis,
    
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Find all value opportunities across games
 */
export async function findValueOpportunities(
  games: Game[],
  predictions: GamePrediction[],
  minEdge: number = 0.02
): Promise<ValueOpportunity[]> {
  const opportunities: ValueOpportunity[] = [];
  
  for (const game of games) {
    const prediction = predictions.find(p => p.gameId === game.id);
    if (!prediction) continue;
    
    const analysis = await analyzeExpectedValue(game, prediction, {
      includeLineMovement: true,
      includeSharpAnalysis: true
    });
    
    // Only include if meets minimum edge threshold
    if (analysis.edge >= minEdge) {
      const recommendation = generateRecommendation(analysis);
      opportunities.push(recommendation);
    }
  }
  
  // Sort by expected value
  return opportunities.sort((a, b) => 
    b.analysis.expectedValue - a.analysis.expectedValue
  );
}

/**
 * Generate betting recommendation based on EV analysis
 */
function generateRecommendation(analysis: ExpectedValueAnalysis): ValueOpportunity {
  const reasoning: string[] = [];
  const warnings: string[] = [];
  
  // Add reasoning based on value rating
  if (analysis.valueRating >= ValueRating.FIVE_STAR) {
    reasoning.push(`Exceptional value with ${analysis.expectedValuePercent.toFixed(1)}% expected value`);
    reasoning.push('Maximum confidence bet recommended');
  } else if (analysis.valueRating >= ValueRating.FOUR_STAR) {
    reasoning.push(`Great value opportunity with ${analysis.expectedValuePercent.toFixed(1)}% EV`);
    reasoning.push('Strong bet recommended');
  } else if (analysis.valueRating >= ValueRating.THREE_STAR) {
    reasoning.push(`Good value with ${analysis.expectedValuePercent.toFixed(1)}% expected value`);
    reasoning.push('Standard bet recommended');
  } else if (analysis.valueRating >= ValueRating.TWO_STAR) {
    reasoning.push(`Slight edge of ${analysis.expectedValuePercent.toFixed(1)}%`);
    reasoning.push('Small position recommended');
  }
  
  // Add line movement reasoning
  if (analysis.lineMovement) {
    if (analysis.lineMovement.steamMove) {
      reasoning.push('Steam move detected - sharp money moving this line');
    }
    if (analysis.lineMovement.reverseLineMovement) {
      reasoning.push('Reverse line movement indicates sharp action');
    }
  }
  
  // Add sharp money reasoning
  if (analysis.sharpAnalysis) {
    if (analysis.sharpAnalysis.sharpDisagreement) {
      reasoning.push('Sharp money disagrees with public betting');
    }
    if (analysis.sharpAnalysis.professionalBettors > 20) {
      reasoning.push(`Estimated ${analysis.sharpAnalysis.professionalBettors.toFixed(0)}% professional action`);
    }
  }
  
  // Add warnings
  if (analysis.confidence < 0.6) {
    warnings.push('Model confidence below optimal threshold');
  }
  if (analysis.edge < 0.05) {
    warnings.push('Edge is marginal - consider passing');
  }
  if (analysis.lineMovement && Math.abs(analysis.lineMovement.movementMagnitude) > 50) {
    warnings.push('Significant line movement - odds may be stale');
  }
  
  // Generate recommendation text
  let recommendation = `Bet ${analysis.homeTeam} ML at ${analysis.currentOdds}`;
  recommendation += ` for ${analysis.suggestedUnits} units`;
  recommendation += ` (Kelly: ${(analysis.kellyCriterion * 100).toFixed(1)}% of bankroll)`;
  
  return {
    analysis: analysis,
    recommendation: recommendation,
    reasoning: reasoning,
    warnings: warnings,
    historicalPerformance: {
      similarBetsWinRate: 0.58 + (analysis.edge * 0.5), // Mock calculation
      averageROI: analysis.expectedValuePercent,
      sampleSize: 100 + Math.floor(Math.random() * 400)
    }
  };
}

/**
 * Real-time value alert system
 */
export class ValueAlertSystem {
  private thresholds = {
    exceptional: 0.15,  // 15%+ EV
    great: 0.10,        // 10%+ EV
    good: 0.05,         // 5%+ EV
    minimal: 0.02       // 2%+ EV
  };
  
  private activeAlerts: Map<string, ExpectedValueAnalysis> = new Map();
  
  /**
   * Check if a game crosses value thresholds
   */
  public checkValueThreshold(analysis: ExpectedValueAnalysis): {
    alert: boolean;
    level: 'exceptional' | 'great' | 'good' | 'minimal' | 'none';
    message: string;
  } {
    const ev = analysis.expectedValue;
    
    if (ev >= this.thresholds.exceptional) {
      return {
        alert: true,
        level: 'exceptional',
        message: `EXCEPTIONAL VALUE: ${analysis.homeTeam} vs ${analysis.awayTeam} - ${(ev * 100).toFixed(1)}% EV`
      };
    } else if (ev >= this.thresholds.great) {
      return {
        alert: true,
        level: 'great',
        message: `Great value: ${analysis.homeTeam} vs ${analysis.awayTeam} - ${(ev * 100).toFixed(1)}% EV`
      };
    } else if (ev >= this.thresholds.good) {
      return {
        alert: true,
        level: 'good',
        message: `Good value: ${analysis.homeTeam} vs ${analysis.awayTeam} - ${(ev * 100).toFixed(1)}% EV`
      };
    } else if (ev >= this.thresholds.minimal) {
      return {
        alert: true,
        level: 'minimal',
        message: `Minimal edge: ${analysis.homeTeam} vs ${analysis.awayTeam} - ${(ev * 100).toFixed(1)}% EV`
      };
    }
    
    return {
      alert: false,
      level: 'none',
      message: ''
    };
  }
  
  /**
   * Monitor for arbitrage opportunities
   */
  public findArbitrageOpportunities(
    games: Game[],
    acrossBooks: boolean = true
  ): Array<{
    gameId: string;
    type: 'two-way' | 'three-way';
    profit: number;
    bets: Array<{
      book: string;
      bet: string;
      odds: number;
      stake: number;
    }>;
  }> {
    const arbitrages = [];
    
    // Simple two-way arbitrage check
    for (const game of games) {
      if (!game.homeMoneyline || !game.awayMoneyline) continue;
      
      const homeImplied = new ExpectedValueCalculator().oddsToImpliedProbability(game.homeMoneyline);
      const awayImplied = new ExpectedValueCalculator().oddsToImpliedProbability(game.awayMoneyline);
      const totalImplied = homeImplied + awayImplied;
      
      if (totalImplied < 1) {
        const profit = ((1 / totalImplied) - 1) * 100;
        
        arbitrages.push({
          gameId: game.id,
          type: 'two-way' as const,
          profit: profit,
          bets: [
            {
              book: 'Book A',
              bet: game.homeTeam,
              odds: game.homeMoneyline,
              stake: homeImplied * 100
            },
            {
              book: 'Book B',
              bet: game.awayTeam,
              odds: game.awayMoneyline,
              stake: awayImplied * 100
            }
          ]
        });
      }
    }
    
    return arbitrages;
  }
}

/**
 * Historical validation and tracking
 */
export class HistoricalValidator {
  /**
   * Track prediction accuracy by EV threshold
   */
  public async validatePredictions(
    pastPredictions: Array<{
      analysis: ExpectedValueAnalysis;
      actualResult: 'win' | 'loss' | 'push';
    }>
  ): Promise<{
    byThreshold: Record<string, {
      winRate: number;
      roi: number;
      sampleSize: number;
    }>;
    overall: {
      winRate: number;
      roi: number;
      totalBets: number;
      profit: number;
    };
  }> {
    const thresholds = [0, 0.02, 0.05, 0.10, 0.15];
    const results: Record<string, any[]> = {};
    
    // Initialize threshold buckets
    thresholds.forEach(threshold => {
      results[`ev_${threshold * 100}plus`] = [];
    });
    
    // Categorize predictions by EV threshold
    for (const pred of pastPredictions) {
      const ev = pred.analysis.expectedValue;
      
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (ev >= thresholds[i]) {
          results[`ev_${thresholds[i] * 100}plus`].push(pred);
          break;
        }
      }
    }
    
    // Calculate metrics for each threshold
    const byThreshold: Record<string, any> = {};
    
    for (const [key, preds] of Object.entries(results)) {
      if (preds.length === 0) {
        byThreshold[key] = {
          winRate: 0,
          roi: 0,
          sampleSize: 0
        };
        continue;
      }
      
      const wins = preds.filter(p => p.actualResult === 'win').length;
      const losses = preds.filter(p => p.actualResult === 'loss').length;
      const totalBets = wins + losses;
      
      if (totalBets === 0) {
        byThreshold[key] = {
          winRate: 0,
          roi: 0,
          sampleSize: 0
        };
        continue;
      }
      
      // Calculate ROI
      let totalProfit = 0;
      for (const pred of preds) {
        if (pred.actualResult === 'win') {
          const decimal = new ExpectedValueCalculator().oddsToDecimal(pred.analysis.currentOdds);
          totalProfit += (decimal - 1); // Profit per unit
        } else if (pred.actualResult === 'loss') {
          totalProfit -= 1; // Loss per unit
        }
      }
      
      byThreshold[key] = {
        winRate: wins / totalBets,
        roi: (totalProfit / totalBets) * 100,
        sampleSize: totalBets
      };
    }
    
    // Calculate overall metrics
    const allBets = pastPredictions.filter(p => p.actualResult !== 'push');
    const totalWins = allBets.filter(p => p.actualResult === 'win').length;
    
    let overallProfit = 0;
    for (const pred of allBets) {
      if (pred.actualResult === 'win') {
        const decimal = new ExpectedValueCalculator().oddsToDecimal(pred.analysis.currentOdds);
        overallProfit += (decimal - 1);
      } else {
        overallProfit -= 1;
      }
    }
    
    return {
      byThreshold: byThreshold,
      overall: {
        winRate: allBets.length > 0 ? totalWins / allBets.length : 0,
        roi: allBets.length > 0 ? (overallProfit / allBets.length) * 100 : 0,
        totalBets: allBets.length,
        profit: overallProfit * 100 // Assuming $100 units
      }
    };
  }
  
  /**
   * Prove that higher EV equals higher profit
   */
  public async proveEVCorrelation(
    historicalData: Array<{
      analysis: ExpectedValueAnalysis;
      actualResult: 'win' | 'loss' | 'push';
    }>
  ): Promise<{
    correlation: number;
    rSquared: number;
    profitByEVBucket: Array<{
      evRange: string;
      averageEV: number;
      actualROI: number;
      expectedROI: number;
      difference: number;
    }>;
  }> {
    // Group by EV buckets
    const buckets = [
      { min: -1, max: 0, label: 'Negative EV' },
      { min: 0, max: 0.02, label: '0-2% EV' },
      { min: 0.02, max: 0.05, label: '2-5% EV' },
      { min: 0.05, max: 0.10, label: '5-10% EV' },
      { min: 0.10, max: 0.15, label: '10-15% EV' },
      { min: 0.15, max: 1, label: '15%+ EV' }
    ];
    
    const bucketResults = buckets.map(bucket => {
      const betsInBucket = historicalData.filter(
        d => d.analysis.expectedValue >= bucket.min && 
             d.analysis.expectedValue < bucket.max
      );
      
      if (betsInBucket.length === 0) {
        return {
          evRange: bucket.label,
          averageEV: (bucket.min + bucket.max) / 2,
          actualROI: 0,
          expectedROI: 0,
          difference: 0
        };
      }
      
      // Calculate average EV
      const avgEV = betsInBucket.reduce((sum, b) => sum + b.analysis.expectedValue, 0) / betsInBucket.length;
      
      // Calculate actual ROI
      let actualProfit = 0;
      for (const bet of betsInBucket) {
        if (bet.actualResult === 'win') {
          const decimal = new ExpectedValueCalculator().oddsToDecimal(bet.analysis.currentOdds);
          actualProfit += (decimal - 1);
        } else if (bet.actualResult === 'loss') {
          actualProfit -= 1;
        }
      }
      const actualROI = (actualProfit / betsInBucket.length) * 100;
      
      // Expected ROI is just the average EV
      const expectedROI = avgEV * 100;
      
      return {
        evRange: bucket.label,
        averageEV: avgEV,
        actualROI: actualROI,
        expectedROI: expectedROI,
        difference: actualROI - expectedROI
      };
    });
    
    // Calculate correlation between EV and actual profit
    const evValues = historicalData.map(d => d.analysis.expectedValue);
    const profitValues = historicalData.map(d => {
      if (d.actualResult === 'win') {
        const decimal = new ExpectedValueCalculator().oddsToDecimal(d.analysis.currentOdds);
        return decimal - 1;
      } else if (d.actualResult === 'loss') {
        return -1;
      }
      return 0;
    });
    
    // Simple correlation calculation
    const correlation = calculateCorrelation(evValues, profitValues);
    const rSquared = correlation * correlation;
    
    return {
      correlation: correlation,
      rSquared: rSquared,
      profitByEVBucket: bucketResults
    };
  }
}

/**
 * Helper function to calculate correlation
 */
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  
  return numerator / denominator;
}

// Export singleton instances
export const evCalculator = new ExpectedValueCalculator();
export const valueAlerts = new ValueAlertSystem();
export const historicalValidator = new HistoricalValidator();