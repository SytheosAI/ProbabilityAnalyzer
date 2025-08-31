/**
 * Advanced Parlay Correlation Analysis System
 * Identifies optimal parlay combinations with correlation analysis
 */

import { UniversalGame, SportType } from './comprehensiveSportsApi';
import { PredictionResult } from './predictionEngine';

export interface ParlayLeg {
  gameId: string;
  sport: SportType;
  betType: 'moneyline' | 'spread' | 'total';
  selection: string; // 'home', 'away', 'over', 'under'
  odds: number;
  probability: number;
  confidence: number;
  game: UniversalGame;
}

export interface ParlayAnalysisResult {
  legs: ParlayLeg[];
  combinedOdds: number;
  combinedProbability: number;
  expectedValue: number;
  correlation: number;
  correlationFactors: {
    sameSport: number;
    sameConference: number;
    sameTime: number;
    weatherImpact: number;
    playerOverlap: number;
    bettingTrends: number;
  };
  risk: 'low' | 'medium' | 'high';
  kellyStake: number;
  confidence: number;
  insights: string[];
  warnings: string[];
}

export interface OptimalParlayRecommendation {
  type: 'conservative' | 'balanced' | 'aggressive';
  parlays: ParlayAnalysisResult[];
  totalExpectedValue: number;
  portfolioKelly: number;
  diversificationScore: number;
  recommendations: string[];
}

class ParlayAnalyzer {
  private readonly correlationMatrix: Map<string, Map<string, number>> = new Map();
  private readonly historicalParlayData: Map<string, any> = new Map();
  
  // Correlation thresholds
  private readonly CORRELATION_THRESHOLDS = {
    acceptable: 0.3,
    moderate: 0.5,
    high: 0.7,
    extreme: 0.85
  };

  // Sport-specific correlation factors
  private readonly sportCorrelations: Record<SportType, any> = {
    NBA: {
      sameDivision: 0.15,
      sameConference: 0.10,
      backToBack: 0.25,
      rivalry: 0.20,
      pace: 0.30
    },
    NFL: {
      sameDivision: 0.20,
      sameConference: 0.12,
      weather: 0.35,
      primetime: 0.15,
      divisionalRound: 0.25
    },
    MLB: {
      sameDivision: 0.10,
      doubleHeader: 0.40,
      samePitcher: 0.30,
      weather: 0.25,
      bullpenUsage: 0.20
    },
    NHL: {
      sameDivision: 0.18,
      backToBack: 0.30,
      goaltender: 0.35,
      rivalry: 0.22,
      timezone: 0.15
    },
    NCAAB: {
      sameConference: 0.25,
      ranking: 0.20,
      style: 0.30,
      motivation: 0.25,
      tournament: 0.35
    },
    NCAAF: {
      sameConference: 0.30,
      ranking: 0.25,
      weather: 0.30,
      rivalry: 0.35,
      bowlGame: 0.40
    },
    TENNIS: {
      sameTournament: 0.45,
      surface: 0.25,
      fatigue: 0.35,
      h2h: 0.20,
      ranking: 0.15
    },
    SOCCER: {
      sameLeague: 0.20,
      sameCountry: 0.15,
      europeanCompetition: 0.30,
      derby: 0.35,
      relegation: 0.25
    }
  };

  /**
   * Analyze a potential parlay combination
   */
  async analyzeParlayy(
    legs: ParlayLeg[],
    predictions: Map<string, PredictionResult>
  ): Promise<ParlayAnalysisResult> {
    // Calculate combined odds and probability
    const combinedOdds = this.calculateCombinedOdds(legs);
    const independentProbability = this.calculateIndependentProbability(legs);
    
    // Calculate correlation between legs
    const correlation = await this.calculateParlayCorrelation(legs, predictions);
    const correlationFactors = await this.analyzeCorrelationFactors(legs);
    
    // Adjust probability for correlation
    const adjustedProbability = this.adjustProbabilityForCorrelation(
      independentProbability,
      correlation
    );
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(
      adjustedProbability,
      combinedOdds
    );
    
    // Determine risk level
    const risk = this.assessRiskLevel(correlation, legs.length, expectedValue);
    
    // Calculate Kelly stake
    const kellyStake = this.calculateKellyStake(
      adjustedProbability,
      combinedOdds,
      correlation
    );
    
    // Calculate confidence
    const confidence = this.calculateParlayConfidence(legs, correlation);
    
    // Generate insights
    const insights = this.generateParlayInsights(
      legs,
      correlation,
      expectedValue,
      risk
    );
    
    // Generate warnings
    const warnings = this.generateParlayWarnings(
      legs,
      correlation,
      correlationFactors
    );

    return {
      legs,
      combinedOdds,
      combinedProbability: adjustedProbability,
      expectedValue,
      correlation,
      correlationFactors,
      risk,
      kellyStake,
      confidence,
      insights,
      warnings
    };
  }

  /**
   * Find optimal parlay combinations from available games
   */
  async findOptimalParlays(
    games: UniversalGame[],
    predictions: Map<string, PredictionResult>,
    strategy: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
  ): Promise<OptimalParlayRecommendation> {
    const potentialLegs = this.extractPotentialLegs(games, predictions);
    const parlaySize = this.getParlaySize(strategy);
    const maxCorrelation = this.getMaxCorrelation(strategy);
    
    // Generate all possible combinations
    const combinations = this.generateCombinations(potentialLegs, parlaySize);
    
    // Analyze each combination
    const analyzedParlays: ParlayAnalysisResult[] = [];
    
    for (const combo of combinations) {
      const analysis = await this.analyzeParlayy(combo, predictions);
      
      // Filter based on strategy
      if (analysis.correlation <= maxCorrelation &&
          analysis.expectedValue > this.getMinExpectedValue(strategy) &&
          this.meetsStrategyRequirements(analysis, strategy)) {
        analyzedParlays.push(analysis);
      }
    }
    
    // Sort by expected value
    analyzedParlays.sort((a, b) => b.expectedValue - a.expectedValue);
    
    // Select top parlays based on strategy
    const selectedParlays = this.selectTopParlays(analyzedParlays, strategy);
    
    // Calculate portfolio metrics
    const totalExpectedValue = selectedParlays.reduce(
      (sum, p) => sum + p.expectedValue,
      0
    );
    
    const portfolioKelly = this.calculatePortfolioKelly(selectedParlays);
    const diversificationScore = this.calculateDiversificationScore(selectedParlays);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      selectedParlays,
      strategy,
      diversificationScore
    );

    return {
      type: strategy,
      parlays: selectedParlays,
      totalExpectedValue,
      portfolioKelly,
      diversificationScore,
      recommendations
    };
  }

  /**
   * Calculate correlation between parlay legs
   */
  private async calculateParlayCorrelation(
    legs: ParlayLeg[],
    predictions: Map<string, PredictionResult>
  ): Promise<number> {
    if (legs.length < 2) return 0;
    
    let totalCorrelation = 0;
    let pairCount = 0;
    
    for (let i = 0; i < legs.length - 1; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        const pairCorrelation = await this.calculatePairCorrelation(
          legs[i],
          legs[j],
          predictions
        );
        totalCorrelation += pairCorrelation;
        pairCount++;
      }
    }
    
    return totalCorrelation / pairCount;
  }

  /**
   * Calculate correlation between two legs
   */
  private async calculatePairCorrelation(
    leg1: ParlayLeg,
    leg2: ParlayLeg,
    predictions: Map<string, PredictionResult>
  ): Promise<number> {
    let correlation = 0;
    
    // Same sport correlation
    if (leg1.sport === leg2.sport) {
      correlation += 0.15;
      
      // Sport-specific correlations
      const sportCorr = this.sportCorrelations[leg1.sport];
      
      // Same game correlation (different bet types)
      if (leg1.gameId === leg2.gameId) {
        correlation += 0.6; // High correlation for same game
        
        // Adjust for bet type combination
        if (leg1.betType === 'total' && leg2.betType === 'moneyline') {
          correlation -= 0.1; // Slightly less correlated
        } else if (leg1.betType === 'spread' && leg2.betType === 'moneyline') {
          correlation += 0.2; // Highly correlated
        }
      }
      
      // Time overlap correlation
      const time1 = new Date(leg1.game.scheduled);
      const time2 = new Date(leg2.game.scheduled);
      const timeDiff = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60 * 60);
      
      if (timeDiff < 1) {
        correlation += 0.1; // Same time slot
      } else if (timeDiff < 3) {
        correlation += 0.05; // Overlapping games
      }
    }
    
    // Cross-sport correlations
    else {
      // Multi-sport same day
      const date1 = new Date(leg1.game.scheduled).toDateString();
      const date2 = new Date(leg2.game.scheduled).toDateString();
      
      if (date1 === date2) {
        correlation += 0.05;
      }
      
      // Venue correlation (same city)
      if (leg1.game.venue?.city === leg2.game.venue?.city) {
        correlation += 0.08;
      }
    }
    
    // Betting pattern correlation
    if (leg1.betType === leg2.betType) {
      if (leg1.betType === 'total') {
        // Totals tend to correlate across games
        correlation += 0.12;
        
        // Same direction (both over or both under)
        if (leg1.selection === leg2.selection) {
          correlation += 0.15;
        }
      } else if (leg1.betType === 'moneyline') {
        // Favorites/underdogs correlation
        const leg1Favorite = leg1.odds < 0;
        const leg2Favorite = leg2.odds < 0;
        
        if (leg1Favorite === leg2Favorite) {
          correlation += 0.08;
        }
      }
    }
    
    // Market movement correlation
    const marketCorr = await this.getMarketCorrelation(leg1, leg2);
    correlation += marketCorr * 0.1;
    
    return Math.min(1, Math.max(0, correlation));
  }

  /**
   * Analyze correlation factors
   */
  private async analyzeCorrelationFactors(legs: ParlayLeg[]): Promise<any> {
    const factors = {
      sameSport: 0,
      sameConference: 0,
      sameTime: 0,
      weatherImpact: 0,
      playerOverlap: 0,
      bettingTrends: 0
    };
    
    // Calculate same sport factor
    const sportCounts = new Map<SportType, number>();
    legs.forEach(leg => {
      sportCounts.set(leg.sport, (sportCounts.get(leg.sport) || 0) + 1);
    });
    
    const maxSportCount = Math.max(...sportCounts.values());
    factors.sameSport = (maxSportCount - 1) / (legs.length - 1);
    
    // Calculate time overlap
    const times = legs.map(leg => new Date(leg.game.scheduled).getTime());
    const timeRange = Math.max(...times) - Math.min(...times);
    factors.sameTime = timeRange < 3600000 ? 1 : Math.max(0, 1 - timeRange / 86400000);
    
    // Weather impact (for outdoor sports)
    const outdoorSports = ['NFL', 'MLB', 'NCAAF', 'SOCCER'];
    const outdoorLegs = legs.filter(leg => outdoorSports.includes(leg.sport));
    factors.weatherImpact = outdoorLegs.length / legs.length;
    
    // Betting trends correlation
    factors.bettingTrends = await this.calculateBettingTrendsCorrelation(legs);
    
    return factors;
  }

  /**
   * Adjust probability for correlation
   */
  private adjustProbabilityForCorrelation(
    independentProb: number,
    correlation: number
  ): number {
    // Positive correlation reduces combined probability
    // Negative correlation increases it (rare in parlays)
    const adjustmentFactor = 1 - (correlation * 0.3);
    return independentProb * adjustmentFactor;
  }

  /**
   * Calculate combined odds for parlay
   */
  private calculateCombinedOdds(legs: ParlayLeg[]): number {
    let decimalOdds = 1;
    
    legs.forEach(leg => {
      const decimal = this.americanToDecimal(leg.odds);
      decimalOdds *= decimal;
    });
    
    return this.decimalToAmerican(decimalOdds);
  }

  /**
   * Calculate independent probability
   */
  private calculateIndependentProbability(legs: ParlayLeg[]): number {
    return legs.reduce((prob, leg) => prob * leg.probability, 1);
  }

  /**
   * Calculate expected value
   */
  private calculateExpectedValue(probability: number, odds: number): number {
    const decimal = this.americanToDecimal(odds);
    return (probability * decimal - 1) * 100;
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(
    correlation: number,
    legCount: number,
    expectedValue: number
  ): 'low' | 'medium' | 'high' {
    if (correlation > this.CORRELATION_THRESHOLDS.high) return 'high';
    if (correlation > this.CORRELATION_THRESHOLDS.moderate && legCount > 3) return 'high';
    if (expectedValue < 0) return 'high';
    if (correlation < this.CORRELATION_THRESHOLDS.acceptable && expectedValue > 10) return 'low';
    return 'medium';
  }

  /**
   * Calculate Kelly stake for parlay
   */
  private calculateKellyStake(
    probability: number,
    odds: number,
    correlation: number
  ): number {
    const decimal = this.americanToDecimal(odds);
    const q = 1 - probability;
    const kelly = (probability * decimal - 1) / (decimal - 1);
    
    // Reduce Kelly for correlation
    const correlationAdjustment = 1 - (correlation * 0.5);
    
    // Apply fractional Kelly (1/4 Kelly for parlays)
    return Math.max(0, Math.min(0.1, kelly * 0.25 * correlationAdjustment));
  }

  /**
   * Calculate parlay confidence
   */
  private calculateParlayConfidence(legs: ParlayLeg[], correlation: number): number {
    const avgConfidence = legs.reduce((sum, leg) => sum + leg.confidence, 0) / legs.length;
    const correlationPenalty = correlation * 0.2;
    return Math.max(0.3, avgConfidence - correlationPenalty);
  }

  /**
   * Generate parlay insights
   */
  private generateParlayInsights(
    legs: ParlayLeg[],
    correlation: number,
    expectedValue: number,
    risk: string
  ): string[] {
    const insights: string[] = [];
    
    // Expected value insight
    if (expectedValue > 15) {
      insights.push(`Strong expected value of ${expectedValue.toFixed(1)}% indicates profitable opportunity`);
    } else if (expectedValue > 5) {
      insights.push(`Positive expected value of ${expectedValue.toFixed(1)}% suggests good value`);
    } else if (expectedValue < 0) {
      insights.push(`Negative expected value - consider avoiding this parlay`);
    }
    
    // Correlation insight
    if (correlation < this.CORRELATION_THRESHOLDS.acceptable) {
      insights.push('Low correlation between legs - good diversification');
    } else if (correlation > this.CORRELATION_THRESHOLDS.high) {
      insights.push('High correlation detected - outcomes are dependent');
    }
    
    // Risk insight
    insights.push(`Risk level: ${risk.toUpperCase()} - ${this.getRiskDescription(risk)}`);
    
    // Leg composition insight
    const betTypes = new Set(legs.map(l => l.betType));
    if (betTypes.size > 1) {
      insights.push('Mixed bet types provide better diversification');
    }
    
    const sports = new Set(legs.map(l => l.sport));
    if (sports.size > 1) {
      insights.push(`Multi-sport parlay across ${sports.size} different sports`);
    }
    
    return insights;
  }

  /**
   * Generate parlay warnings
   */
  private generateParlayWarnings(
    legs: ParlayLeg[],
    correlation: number,
    correlationFactors: any
  ): string[] {
    const warnings: string[] = [];
    
    // High correlation warning
    if (correlation > this.CORRELATION_THRESHOLDS.high) {
      warnings.push('High correlation - consider removing correlated legs');
    }
    
    // Same game warning
    const gameIds = legs.map(l => l.gameId);
    const uniqueGames = new Set(gameIds);
    if (uniqueGames.size < gameIds.length) {
      warnings.push('Multiple bets on same game increase correlation risk');
    }
    
    // Weather warning
    if (correlationFactors.weatherImpact > 0.5) {
      warnings.push('Multiple outdoor games - check weather conditions');
    }
    
    // Time overlap warning
    if (correlationFactors.sameTime > 0.7) {
      warnings.push('Games overlap significantly - cannot hedge if needed');
    }
    
    // Large parlay warning
    if (legs.length > 4) {
      warnings.push(`${legs.length}-leg parlay has low hit rate despite positive EV`);
    }
    
    return warnings;
  }

  /**
   * Extract potential legs from games and predictions
   */
  private extractPotentialLegs(
    games: UniversalGame[],
    predictions: Map<string, PredictionResult>
  ): ParlayLeg[] {
    const legs: ParlayLeg[] = [];
    
    games.forEach(game => {
      const prediction = predictions.get(game.id);
      if (!prediction) return;
      
      // Extract value bets as potential legs
      prediction.valueBets.forEach(valueBet => {
        if (valueBet.edge > 0.05) {
          legs.push({
            gameId: game.id,
            sport: game.sport,
            betType: valueBet.type,
            selection: valueBet.team || valueBet.direction || '',
            odds: valueBet.currentOdds,
            probability: this.americanToImpliedProb(valueBet.fairOdds),
            confidence: valueBet.confidence,
            game
          });
        }
      });
    });
    
    return legs;
  }

  /**
   * Generate combinations of legs
   */
  private generateCombinations(legs: ParlayLeg[], size: number): ParlayLeg[][] {
    const combinations: ParlayLeg[][] = [];
    
    const combine = (start: number, current: ParlayLeg[]) => {
      if (current.length === size) {
        combinations.push([...current]);
        return;
      }
      
      for (let i = start; i < legs.length; i++) {
        current.push(legs[i]);
        combine(i + 1, current);
        current.pop();
      }
    };
    
    combine(0, []);
    return combinations;
  }

  /**
   * Get parlay size based on strategy
   */
  private getParlaySize(strategy: string): number {
    switch (strategy) {
      case 'conservative': return 2;
      case 'balanced': return 3;
      case 'aggressive': return 4;
      default: return 3;
    }
  }

  /**
   * Get max correlation based on strategy
   */
  private getMaxCorrelation(strategy: string): number {
    switch (strategy) {
      case 'conservative': return this.CORRELATION_THRESHOLDS.acceptable;
      case 'balanced': return this.CORRELATION_THRESHOLDS.moderate;
      case 'aggressive': return this.CORRELATION_THRESHOLDS.high;
      default: return this.CORRELATION_THRESHOLDS.moderate;
    }
  }

  /**
   * Get minimum expected value based on strategy
   */
  private getMinExpectedValue(strategy: string): number {
    switch (strategy) {
      case 'conservative': return 5;
      case 'balanced': return 3;
      case 'aggressive': return 0;
      default: return 3;
    }
  }

  /**
   * Check if parlay meets strategy requirements
   */
  private meetsStrategyRequirements(
    analysis: ParlayAnalysisResult,
    strategy: string
  ): boolean {
    switch (strategy) {
      case 'conservative':
        return analysis.risk === 'low' && analysis.confidence > 0.7;
      case 'balanced':
        return analysis.risk !== 'high' && analysis.confidence > 0.6;
      case 'aggressive':
        return analysis.expectedValue > 10;
      default:
        return true;
    }
  }

  /**
   * Select top parlays based on strategy
   */
  private selectTopParlays(
    parlays: ParlayAnalysisResult[],
    strategy: string
  ): ParlayAnalysisResult[] {
    const maxParlays = strategy === 'conservative' ? 3 : strategy === 'balanced' ? 5 : 8;
    return parlays.slice(0, maxParlays);
  }

  /**
   * Calculate portfolio Kelly
   */
  private calculatePortfolioKelly(parlays: ParlayAnalysisResult[]): number {
    const totalKelly = parlays.reduce((sum, p) => sum + p.kellyStake, 0);
    return Math.min(0.25, totalKelly); // Cap at 25% of bankroll
  }

  /**
   * Calculate diversification score
   */
  private calculateDiversificationScore(parlays: ParlayAnalysisResult[]): number {
    const allLegs = parlays.flatMap(p => p.legs);
    const uniqueSports = new Set(allLegs.map(l => l.sport)).size;
    const uniqueGames = new Set(allLegs.map(l => l.gameId)).size;
    const uniqueBetTypes = new Set(allLegs.map(l => l.betType)).size;
    
    const sportScore = uniqueSports / 8; // 8 total sports
    const gameScore = Math.min(1, uniqueGames / (allLegs.length * 0.7));
    const betTypeScore = uniqueBetTypes / 3; // 3 bet types
    
    return (sportScore + gameScore + betTypeScore) / 3;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    parlays: ParlayAnalysisResult[],
    strategy: string,
    diversificationScore: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Strategy-specific recommendations
    switch (strategy) {
      case 'conservative':
        recommendations.push('Focus on 2-leg parlays with low correlation');
        recommendations.push('Stake no more than 2% of bankroll per parlay');
        break;
      case 'balanced':
        recommendations.push('Mix 2 and 3-leg parlays for optimal risk/reward');
        recommendations.push('Consider hedging opportunities on final legs');
        break;
      case 'aggressive':
        recommendations.push('Higher variance expected - manage bankroll carefully');
        recommendations.push('Consider round-robin betting for risk mitigation');
        break;
    }
    
    // Diversification recommendation
    if (diversificationScore > 0.7) {
      recommendations.push('Excellent diversification across sports and bet types');
    } else if (diversificationScore < 0.4) {
      recommendations.push('Consider adding more variety to reduce correlation');
    }
    
    // Timing recommendation
    recommendations.push('Place bets close to game time for best odds');
    
    return recommendations;
  }

  // Helper methods
  private americanToDecimal(odds: number): number {
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  }

  private decimalToAmerican(decimal: number): number {
    if (decimal >= 2) {
      return Math.round((decimal - 1) * 100);
    } else {
      return Math.round(-100 / (decimal - 1));
    }
  }

  private americanToImpliedProb(odds: number): number {
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private async getMarketCorrelation(leg1: ParlayLeg, leg2: ParlayLeg): Promise<number> {
    // Simplified market correlation
    // In production, this would analyze betting patterns and line movements
    return Math.random() * 0.3;
  }

  private async calculateBettingTrendsCorrelation(legs: ParlayLeg[]): Promise<number> {
    // Simplified betting trends correlation
    // In production, this would analyze public betting percentages
    return Math.random() * 0.4;
  }

  private getRiskDescription(risk: string): string {
    switch (risk) {
      case 'low':
        return 'Well-diversified with positive expected value';
      case 'medium':
        return 'Moderate correlation with acceptable expected value';
      case 'high':
        return 'High correlation or negative expected value';
      default:
        return 'Unknown risk level';
    }
  }
}

// Export singleton instance
export const parlayAnalyzer = new ParlayAnalyzer();

// Export convenience functions
export const analyzeParlayy = (legs: ParlayLeg[], predictions: Map<string, PredictionResult>) =>
  parlayAnalyzer.analyzeParlayy(legs, predictions);

export const findOptimalParlays = (
  games: UniversalGame[],
  predictions: Map<string, PredictionResult>,
  strategy?: 'conservative' | 'balanced' | 'aggressive'
) => parlayAnalyzer.findOptimalParlays(games, predictions, strategy);