/**
 * Advanced Parlay Optimization Engine
 * Uses correlation analysis, Kelly criterion, and risk management for optimal parlays
 */

import { correlationEngine } from './advancedCorrelationEngine';
import { patternRecognition } from './patternRecognition';
import { sharpMoneyTracker } from './sharpMoneyTracker';

export interface OptimizedParlay {
  id: string;
  legs: ParlayLeg[];
  type: ParlayType;
  totalOdds: number;
  impliedProbability: number;
  trueProbability: number;
  expectedValue: number;
  kellyFraction: number;
  correlationMatrix: number[][];
  riskScore: RiskScore;
  hedgeOpportunities: HedgeOpportunity[];
  optimalStake: number;
  confidence: number;
  reasoning: string[];
  warnings: string[];
  projectedReturn: ProjectedReturn;
}

interface ParlayLeg {
  gameId: string;
  team: string;
  opponent: string;
  sport: string;
  betType: 'spread' | 'total' | 'moneyline' | 'prop' | 'alt_spread' | 'alt_total';
  selection: string;
  line: number;
  odds: number;
  trueProbability: number;
  edge: number;
  correlation: number; // Average correlation with other legs
  sharpAction: boolean;
  patternMatch: boolean;
}

type ParlayType = 
  | 'straight'          // Traditional parlay
  | 'correlated'       // Same-game or highly correlated
  | 'hedged'           // Built-in hedge opportunities
  | 'progressive'      // Increasing stakes
  | 'round_robin'      // Multiple smaller parlays
  | 'teaser'           // Adjusted lines
  | 'if_bet'           // Conditional sequence
  | 'reverse';         // All if-bets in sequence

interface RiskScore {
  overall: number; // 0-100
  concentration: number;
  correlation: number;
  variance: number;
  maxDrawdown: number;
  breakpoints: BreakPoint[];
}

interface BreakPoint {
  legIndex: number;
  impact: number;
  description: string;
}

interface HedgeOpportunity {
  timing: 'pregame' | 'live' | 'middle';
  legIndex: number;
  hedgeBet: string;
  hedgeOdds: number;
  guaranteedProfit: number;
  requiredStake: number;
  confidence: number;
}

interface ProjectedReturn {
  bestCase: number;
  expectedCase: number;
  worstCase: number;
  breakEvenProbability: number;
  profitProbability: number;
  roi: number;
}

export class AdvancedParlayOptimizer {
  private readonly MAX_LEGS = 10;
  private readonly MIN_EDGE = 3; // Minimum 3% edge required
  private readonly MAX_CORRELATION = 0.7;
  private readonly KELLY_DIVISOR = 4; // Quarter Kelly for safety

  /**
   * Generate optimal parlays from available games
   */
  async generateOptimalParlays(
    games: any[],
    bankroll: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive',
    preferences?: {
      maxLegs?: number;
      minOdds?: number;
      maxOdds?: number;
      sports?: string[];
      excludeProps?: boolean;
      sameGameOnly?: boolean;
      requireSharp?: boolean;
    }
  ): Promise<OptimizedParlay[]> {
    console.log(`🎯 Generating optimal parlays for ${games.length} games`);

    // Get correlations, patterns, and sharp money data
    const [correlations, patterns, sharpBets] = await Promise.all([
      correlationEngine.analyzeCorrelations(games),
      this.getPatternMatches(games),
      this.getSharpBets(games)
    ]);

    // Generate different types of parlays
    const parlays: OptimizedParlay[] = [];

    // 1. Value parlays (high edge, low correlation)
    const valueParlays = await this.generateValueParlays(
      games,
      correlations,
      patterns,
      sharpBets,
      preferences
    );
    parlays.push(...valueParlays);

    // 2. Correlated parlays (same game, high correlation)
    if (!preferences?.sameGameOnly) {
      const correlatedParlays = await this.generateCorrelatedParlays(
        games,
        correlations,
        preferences
      );
      parlays.push(...correlatedParlays);
    }

    // 3. Hedged parlays (built-in middle opportunities)
    const hedgedParlays = await this.generateHedgedParlays(
      games,
      correlations,
      preferences
    );
    parlays.push(...hedgedParlays);

    // 4. Progressive parlays (if-bet sequences)
    const progressiveParlays = await this.generateProgressiveParlays(
      games,
      correlations,
      sharpBets,
      preferences
    );
    parlays.push(...progressiveParlays);

    // 5. Round robin combinations
    const roundRobins = await this.generateRoundRobins(
      games,
      correlations,
      preferences
    );
    parlays.push(...roundRobins);

    // Filter and optimize based on risk tolerance
    const optimized = this.optimizeForRiskTolerance(
      parlays,
      bankroll,
      riskTolerance
    );

    // Sort by expected value
    return optimized.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Generate value-focused parlays
   */
  private async generateValueParlays(
    games: any[],
    correlations: any,
    patterns: any,
    sharpBets: any,
    preferences?: any
  ): Promise<OptimizedParlay[]> {
    const parlays: OptimizedParlay[] = [];
    const maxLegs = preferences?.maxLegs || 4;

    // Find high-value legs
    const valueLegs = this.findValueLegs(games, patterns, sharpBets);
    
    // Generate combinations with low correlation
    for (let numLegs = 2; numLegs <= Math.min(maxLegs, valueLegs.length); numLegs++) {
      const combinations = this.getCombinations(valueLegs, numLegs);
      
      for (const combo of combinations.slice(0, 50)) { // Limit to 50 combinations per leg count
        const correlationScore = this.calculateAverageCorrelation(combo, correlations);
        
        if (correlationScore < this.MAX_CORRELATION) {
          const parlay = this.createParlay(combo, 'straight', correlations);
          
          if (parlay.expectedValue > this.MIN_EDGE) {
            parlays.push(parlay);
          }
        }
      }
    }

    return parlays;
  }

  /**
   * Generate correlated parlays (same game parlays)
   */
  private async generateCorrelatedParlays(
    games: any[],
    correlations: any,
    preferences?: any
  ): Promise<OptimizedParlay[]> {
    const parlays: OptimizedParlay[] = [];

    for (const game of games) {
      // Find correlated bets within the same game
      const gameLegs = this.findCorrelatedLegs(game);
      
      if (gameLegs.length >= 2) {
        // Create same-game parlay combinations
        const sgpCombos = this.generateSGPCombinations(gameLegs);
        
        for (const combo of sgpCombos) {
          const parlay = this.createParlay(combo, 'correlated', correlations);
          
          // Adjust probability for correlation
          parlay.trueProbability *= this.getCorrelationAdjustment(combo);
          parlay.expectedValue = this.recalculateEV(parlay);
          
          if (parlay.expectedValue > 0) {
            parlays.push(parlay);
          }
        }
      }
    }

    return parlays;
  }

  /**
   * Generate parlays with hedge opportunities
   */
  private async generateHedgedParlays(
    games: any[],
    correlations: any,
    preferences?: any
  ): Promise<OptimizedParlay[]> {
    const parlays: OptimizedParlay[] = [];

    // Find games with middle opportunities
    const middleGames = this.findMiddleOpportunities(games);
    
    for (const opportunity of middleGames) {
      const legs: ParlayLeg[] = [
        this.createLeg(opportunity.game1, opportunity.bet1),
        this.createLeg(opportunity.game2, opportunity.bet2)
      ];

      const parlay = this.createParlay(legs, 'hedged', correlations);
      
      // Add hedge opportunities
      parlay.hedgeOpportunities = [
        {
          timing: 'pregame',
          legIndex: 0,
          hedgeBet: opportunity.hedge,
          hedgeOdds: opportunity.hedgeOdds,
          guaranteedProfit: opportunity.guaranteedProfit,
          requiredStake: opportunity.hedgeStake,
          confidence: opportunity.confidence
        }
      ];

      parlays.push(parlay);
    }

    return parlays;
  }

  /**
   * Generate progressive/if-bet parlays
   */
  private async generateProgressiveParlays(
    games: any[],
    correlations: any,
    sharpBets: any,
    preferences?: any
  ): Promise<OptimizedParlay[]> {
    const parlays: OptimizedParlay[] = [];

    // Sort games by start time
    const sortedGames = games.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    // Find sequences of sharp bets
    const sharpSequences = this.findSharpSequences(sortedGames, sharpBets);
    
    for (const sequence of sharpSequences) {
      if (sequence.length >= 2 && sequence.length <= 4) {
        const legs = sequence.map(s => this.createLegFromSharp(s));
        const parlay = this.createParlay(legs, 'progressive', correlations);
        
        // Adjust for sequential betting
        parlay.reasoning.push('Progressive betting on sharp action sequence');
        parlays.push(parlay);
      }
    }

    return parlays;
  }

  /**
   * Generate round robin combinations
   */
  private async generateRoundRobins(
    games: any[],
    correlations: any,
    preferences?: any
  ): Promise<OptimizedParlay[]> {
    const parlays: OptimizedParlay[] = [];

    // Find best individual bets
    const topBets = this.findTopBets(games).slice(0, 6);
    
    if (topBets.length >= 3) {
      // Generate 2-team and 3-team round robins
      const twoTeamers = this.getCombinations(topBets, 2);
      const threeTeamers = this.getCombinations(topBets, 3);
      
      // Create round robin parlay
      const rrLegs = topBets.map(bet => this.createLeg(bet.game, bet));
      const roundRobin = this.createParlay(rrLegs, 'round_robin', correlations);
      
      // Calculate round robin specifics
      roundRobin.reasoning.push(`${twoTeamers.length} two-teamers, ${threeTeamers.length} three-teamers`);
      roundRobin.optimalStake = roundRobin.optimalStake / (twoTeamers.length + threeTeamers.length);
      
      parlays.push(roundRobin);
    }

    return parlays;
  }

  /**
   * Create a parlay from legs
   */
  private createParlay(
    legs: ParlayLeg[],
    type: ParlayType,
    correlations: any
  ): OptimizedParlay {
    const id = `parlay_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate combined odds
    const totalOdds = this.calculateCombinedOdds(legs);
    const impliedProbability = this.calculateImpliedProbability(totalOdds);
    
    // Calculate true probability
    const trueProbability = this.calculateTrueProbability(legs, correlations);
    
    // Calculate expected value
    const expectedValue = this.calculateExpectedValue(
      trueProbability,
      impliedProbability,
      totalOdds
    );
    
    // Calculate Kelly fraction
    const kellyFraction = this.calculateKellyFraction(
      trueProbability,
      totalOdds
    );
    
    // Build correlation matrix
    const correlationMatrix = this.buildCorrelationMatrix(legs, correlations);
    
    // Calculate risk score
    const riskScore = this.calculateRiskScore(legs, correlationMatrix);
    
    // Find hedge opportunities
    const hedgeOpportunities = this.findHedgeOpportunities(legs);
    
    // Calculate optimal stake (will be adjusted by bankroll later)
    const optimalStake = kellyFraction * 10000; // Assuming $10k bankroll for now
    
    // Generate reasoning
    const reasoning = this.generateReasoning(legs, type, expectedValue);
    
    // Generate warnings
    const warnings = this.generateWarnings(legs, correlationMatrix, riskScore);
    
    // Project returns
    const projectedReturn = this.projectReturns(
      optimalStake,
      totalOdds,
      trueProbability
    );

    return {
      id,
      legs,
      type,
      totalOdds,
      impliedProbability,
      trueProbability,
      expectedValue,
      kellyFraction,
      correlationMatrix,
      riskScore,
      hedgeOpportunities,
      optimalStake,
      confidence: this.calculateConfidence(legs, expectedValue),
      reasoning,
      warnings,
      projectedReturn
    };
  }

  /**
   * Optimize parlays for risk tolerance
   */
  private optimizeForRiskTolerance(
    parlays: OptimizedParlay[],
    bankroll: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive'
  ): OptimizedParlay[] {
    const riskLimits = {
      conservative: { maxRisk: 30, maxStake: 0.02, minEV: 8 },
      moderate: { maxRisk: 50, maxStake: 0.05, minEV: 5 },
      aggressive: { maxRisk: 70, maxStake: 0.1, minEV: 3 }
    };

    const limits = riskLimits[riskTolerance];

    return parlays
      .filter(p => 
        p.riskScore.overall <= limits.maxRisk &&
        p.expectedValue >= limits.minEV
      )
      .map(p => {
        // Adjust stake based on bankroll and risk tolerance
        const maxStake = bankroll * limits.maxStake;
        const kellyStake = bankroll * p.kellyFraction / this.KELLY_DIVISOR;
        p.optimalStake = Math.min(maxStake, kellyStake);
        
        // Recalculate projected returns with actual stake
        p.projectedReturn = this.projectReturns(
          p.optimalStake,
          p.totalOdds,
          p.trueProbability
        );
        
        return p;
      });
  }

  // Helper methods

  private findValueLegs(games: any[], patterns: any, sharpBets: any): ParlayLeg[] {
    const legs: ParlayLeg[] = [];

    for (const game of games) {
      // Check for pattern matches
      const patternMatch = patterns.find((p: any) => p.gameId === game.id);
      
      // Check for sharp action
      const sharpAction = sharpBets.find((s: any) => s.gameId === game.id);
      
      // Calculate edge
      const edge = this.calculateEdge(game, patternMatch, sharpAction);
      
      if (edge > this.MIN_EDGE) {
        legs.push({
          gameId: game.id,
          team: game.pick === 'home' ? game.homeTeam : game.awayTeam,
          opponent: game.pick === 'home' ? game.awayTeam : game.homeTeam,
          sport: game.sport,
          betType: 'spread',
          selection: `${game.pick === 'home' ? game.homeTeam : game.awayTeam} ${game.spread}`,
          line: game.spread,
          odds: game.odds || -110,
          trueProbability: this.calculateGameProbability(game, edge),
          edge,
          correlation: 0,
          sharpAction: !!sharpAction,
          patternMatch: !!patternMatch
        });
      }
    }

    return legs;
  }

  private getCombinations<T>(array: T[], size: number): T[][] {
    const result: T[][] = [];
    
    function combine(start: number, combo: T[]) {
      if (combo.length === size) {
        result.push([...combo]);
        return;
      }
      
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }
    
    combine(0, []);
    return result;
  }

  private calculateAverageCorrelation(legs: ParlayLeg[], correlations: any): number {
    if (legs.length < 2) return 0;
    
    let totalCorrelation = 0;
    let pairs = 0;
    
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        const correlation = this.getCorrelation(
          legs[i].gameId,
          legs[j].gameId,
          correlations
        );
        totalCorrelation += Math.abs(correlation);
        pairs++;
      }
    }
    
    return pairs > 0 ? totalCorrelation / pairs : 0;
  }

  private getCorrelation(gameId1: string, gameId2: string, correlations: any): number {
    const gameCorr = correlations.games.find((c: any) => 
      (c.game1 === gameId1 && c.game2 === gameId2) ||
      (c.game1 === gameId2 && c.game2 === gameId1)
    );
    
    return gameCorr?.correlationScore || 0;
  }

  private findCorrelatedLegs(game: any): ParlayLeg[] {
    const legs: ParlayLeg[] = [];

    // Add main bets
    if (game.spread) {
      legs.push(this.createGameLeg(game, 'spread', 'home'));
    }
    if (game.total) {
      legs.push(this.createGameLeg(game, 'total', 'over'));
    }

    // Add player props if available
    if (game.props) {
      for (const prop of game.props.slice(0, 3)) {
        legs.push(this.createPropLeg(game, prop));
      }
    }

    return legs;
  }

  private generateSGPCombinations(legs: ParlayLeg[]): ParlayLeg[][] {
    const combos: ParlayLeg[][] = [];

    // 2-leg SGPs
    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        combos.push([legs[i], legs[j]]);
      }
    }

    // 3-leg SGPs (limit to reduce combinations)
    if (legs.length >= 3) {
      for (let i = 0; i < Math.min(3, legs.length); i++) {
        for (let j = i + 1; j < Math.min(4, legs.length); j++) {
          for (let k = j + 1; k < Math.min(5, legs.length); k++) {
            combos.push([legs[i], legs[j], legs[k]]);
          }
        }
      }
    }

    return combos;
  }

  private getCorrelationAdjustment(legs: ParlayLeg[]): number {
    // Adjust probability for correlation in same-game parlays
    let adjustment = 1;

    for (let i = 0; i < legs.length; i++) {
      for (let j = i + 1; j < legs.length; j++) {
        if (this.arePositivelyCorrelated(legs[i], legs[j])) {
          adjustment *= 1.1; // Increase probability for positive correlation
        } else if (this.areNegativelyCorrelated(legs[i], legs[j])) {
          adjustment *= 0.9; // Decrease for negative correlation
        }
      }
    }

    return Math.min(1.3, Math.max(0.7, adjustment));
  }

  private arePositivelyCorrelated(leg1: ParlayLeg, leg2: ParlayLeg): boolean {
    // Check for positive correlation patterns
    if (leg1.betType === 'spread' && leg2.betType === 'total') {
      // Favorite and under often correlate
      return leg1.line < 0 && leg2.selection.includes('Under');
    }
    return false;
  }

  private areNegativelyCorrelated(leg1: ParlayLeg, leg2: ParlayLeg): boolean {
    // Check for negative correlation patterns
    if (leg1.betType === 'spread' && leg2.betType === 'total') {
      // Underdog and under rarely hit together
      return leg1.line > 0 && leg2.selection.includes('Under');
    }
    return false;
  }

  private findMiddleOpportunities(games: any[]): any[] {
    const opportunities: any[] = [];

    // Find games with line movement that creates middles
    for (const game of games) {
      if (game.lineMovement && Math.abs(game.lineMovement) > 1.5) {
        opportunities.push({
          game1: game,
          bet1: { type: 'spread', line: game.openingSpread },
          game2: game,
          bet2: { type: 'spread', line: game.currentSpread },
          hedge: `Middle opportunity on ${game.homeTeam} vs ${game.awayTeam}`,
          hedgeOdds: -110,
          guaranteedProfit: this.calculateMiddleProfit(game.openingSpread, game.currentSpread),
          hedgeStake: 100,
          confidence: 0.7
        });
      }
    }

    return opportunities;
  }

  private calculateMiddleProfit(opening: number, current: number): number {
    const gap = Math.abs(current - opening);
    if (gap >= 3) return 50; // Rough estimate
    if (gap >= 2) return 20;
    if (gap >= 1) return 5;
    return 0;
  }

  private findSharpSequences(games: any[], sharpBets: any): any[] {
    const sequences: any[] = [];
    let currentSequence: any[] = [];

    for (const game of games) {
      const sharp = sharpBets.find((s: any) => s.gameId === game.id);
      
      if (sharp && sharp.confidence > 0.7) {
        currentSequence.push({ game, sharp });
      } else if (currentSequence.length >= 2) {
        sequences.push([...currentSequence]);
        currentSequence = [];
      }
    }

    if (currentSequence.length >= 2) {
      sequences.push(currentSequence);
    }

    return sequences;
  }

  private createLegFromSharp(sharpData: any): ParlayLeg {
    const { game, sharp } = sharpData;
    
    return {
      gameId: game.id,
      team: sharp.side === 'home' ? game.homeTeam : game.awayTeam,
      opponent: sharp.side === 'home' ? game.awayTeam : game.homeTeam,
      sport: game.sport,
      betType: sharp.betType,
      selection: `${sharp.side === 'home' ? game.homeTeam : game.awayTeam} ${game.spread}`,
      line: game.spread,
      odds: -110,
      trueProbability: 0.55,
      edge: sharp.edge,
      correlation: 0,
      sharpAction: true,
      patternMatch: false
    };
  }

  private findTopBets(games: any[]): any[] {
    return games
      .map(game => ({
        game,
        value: this.calculateGameValue(game)
      }))
      .sort((a, b) => b.value - a.value)
      .map(item => item.game);
  }

  private calculateGameValue(game: any): number {
    // Simple value calculation
    return Math.random() * 10; // Placeholder
  }

  private createLeg(game: any, bet: any): ParlayLeg {
    return {
      gameId: game.id,
      team: game.homeTeam,
      opponent: game.awayTeam,
      sport: game.sport,
      betType: bet.type || 'spread',
      selection: bet.selection || `${game.homeTeam} ${game.spread}`,
      line: bet.line || game.spread,
      odds: bet.odds || -110,
      trueProbability: 0.52,
      edge: 3,
      correlation: 0,
      sharpAction: false,
      patternMatch: false
    };
  }

  private createGameLeg(game: any, betType: string, side: string): ParlayLeg {
    return {
      gameId: game.id,
      team: side === 'home' ? game.homeTeam : game.awayTeam,
      opponent: side === 'home' ? game.awayTeam : game.homeTeam,
      sport: game.sport,
      betType: betType as any,
      selection: this.formatSelection(game, betType, side),
      line: betType === 'spread' ? game.spread : game.total,
      odds: -110,
      trueProbability: 0.52,
      edge: 3,
      correlation: 0,
      sharpAction: false,
      patternMatch: false
    };
  }

  private createPropLeg(game: any, prop: any): ParlayLeg {
    return {
      gameId: game.id,
      team: game.homeTeam,
      opponent: game.awayTeam,
      sport: game.sport,
      betType: 'prop',
      selection: `${prop.player} ${prop.type} ${prop.line}`,
      line: prop.line,
      odds: prop.odds || -120,
      trueProbability: 0.51,
      edge: 2,
      correlation: 0.3,
      sharpAction: false,
      patternMatch: false
    };
  }

  private formatSelection(game: any, betType: string, side: string): string {
    if (betType === 'spread') {
      return `${side === 'home' ? game.homeTeam : game.awayTeam} ${game.spread}`;
    } else if (betType === 'total') {
      return `${side === 'over' ? 'Over' : 'Under'} ${game.total}`;
    } else {
      return `${side === 'home' ? game.homeTeam : game.awayTeam} ML`;
    }
  }

  private calculateCombinedOdds(legs: ParlayLeg[]): number {
    let decimalOdds = 1;
    
    for (const leg of legs) {
      const decimal = leg.odds > 0 ? 
        (leg.odds / 100) + 1 : 
        (100 / Math.abs(leg.odds)) + 1;
      decimalOdds *= decimal;
    }
    
    // Convert back to American odds
    if (decimalOdds >= 2) {
      return (decimalOdds - 1) * 100;
    } else {
      return -100 / (decimalOdds - 1);
    }
  }

  private calculateImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  private calculateTrueProbability(legs: ParlayLeg[], correlations: any): number {
    let probability = 1;
    
    for (const leg of legs) {
      probability *= leg.trueProbability;
    }
    
    // Adjust for correlations
    const avgCorrelation = this.calculateAverageCorrelation(legs, correlations);
    
    if (avgCorrelation > 0.5) {
      probability *= (1 + avgCorrelation * 0.1); // Positive correlation increases probability
    } else if (avgCorrelation < -0.3) {
      probability *= (1 + avgCorrelation * 0.1); // Negative correlation decreases probability
    }
    
    return Math.min(0.99, Math.max(0.01, probability));
  }

  private calculateExpectedValue(
    trueProbability: number,
    impliedProbability: number,
    americanOdds: number
  ): number {
    const decimalOdds = americanOdds > 0 ? 
      (americanOdds / 100) + 1 : 
      (100 / Math.abs(americanOdds)) + 1;
    
    const ev = (trueProbability * (decimalOdds - 1)) - (1 - trueProbability);
    return ev * 100; // Return as percentage
  }

  private calculateKellyFraction(trueProbability: number, americanOdds: number): number {
    const decimalOdds = americanOdds > 0 ? 
      (americanOdds / 100) + 1 : 
      (100 / Math.abs(americanOdds)) + 1;
    
    const kelly = (trueProbability * decimalOdds - 1) / (decimalOdds - 1);
    return Math.max(0, Math.min(0.25, kelly)); // Cap at 25% of bankroll
  }

  private buildCorrelationMatrix(legs: ParlayLeg[], correlations: any): number[][] {
    const matrix: number[][] = [];
    
    for (let i = 0; i < legs.length; i++) {
      matrix[i] = [];
      for (let j = 0; j < legs.length; j++) {
        if (i === j) {
          matrix[i][j] = 1;
        } else {
          matrix[i][j] = this.getCorrelation(
            legs[i].gameId,
            legs[j].gameId,
            correlations
          );
        }
      }
    }
    
    return matrix;
  }

  private calculateRiskScore(legs: ParlayLeg[], correlationMatrix: number[][]): RiskScore {
    // Calculate concentration risk
    const sportCounts = new Map<string, number>();
    for (const leg of legs) {
      sportCounts.set(leg.sport, (sportCounts.get(leg.sport) || 0) + 1);
    }
    const maxConcentration = Math.max(...sportCounts.values()) / legs.length;
    const concentration = maxConcentration * 100;

    // Calculate correlation risk
    let totalCorrelation = 0;
    let pairs = 0;
    for (let i = 0; i < correlationMatrix.length; i++) {
      for (let j = i + 1; j < correlationMatrix[i].length; j++) {
        totalCorrelation += Math.abs(correlationMatrix[i][j]);
        pairs++;
      }
    }
    const avgCorrelation = pairs > 0 ? totalCorrelation / pairs : 0;
    const correlation = avgCorrelation * 100;

    // Calculate variance
    const probabilities = legs.map(l => l.trueProbability);
    const mean = probabilities.reduce((a, b) => a + b, 0) / probabilities.length;
    const variance = probabilities.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / probabilities.length;
    const varianceScore = Math.sqrt(variance) * 100;

    // Calculate max drawdown
    const maxDrawdown = (1 - Math.min(...probabilities)) * 100;

    // Identify breakpoints
    const breakpoints = this.identifyBreakpoints(legs);

    // Overall risk score
    const overall = (concentration * 0.2 + correlation * 0.3 + varianceScore * 0.2 + maxDrawdown * 0.3);

    return {
      overall,
      concentration,
      correlation,
      variance: varianceScore,
      maxDrawdown,
      breakpoints
    };
  }

  private identifyBreakpoints(legs: ParlayLeg[]): BreakPoint[] {
    const breakpoints: BreakPoint[] = [];

    for (let i = 0; i < legs.length; i++) {
      const impact = (1 / legs.length) * 100;
      
      if (legs[i].trueProbability < 0.45) {
        breakpoints.push({
          legIndex: i,
          impact,
          description: `Weak leg: ${legs[i].selection} (${(legs[i].trueProbability * 100).toFixed(1)}% probability)`
        });
      }
      
      if (legs[i].correlation > 0.6) {
        breakpoints.push({
          legIndex: i,
          impact: impact * 1.5,
          description: `High correlation: ${legs[i].selection}`
        });
      }
    }

    return breakpoints;
  }

  private findHedgeOpportunities(legs: ParlayLeg[]): HedgeOpportunity[] {
    const opportunities: HedgeOpportunity[] = [];

    // Check for pre-game hedges
    for (let i = 0; i < legs.length; i++) {
      if (legs[i].odds < -200) {
        opportunities.push({
          timing: 'pregame',
          legIndex: i,
          hedgeBet: `Opposite side of ${legs[i].selection}`,
          hedgeOdds: Math.abs(legs[i].odds) - 50,
          guaranteedProfit: 10,
          requiredStake: 50,
          confidence: 0.6
        });
      }
    }

    return opportunities;
  }

  private generateReasoning(legs: ParlayLeg[], type: ParlayType, ev: number): string[] {
    const reasoning: string[] = [];

    reasoning.push(`${type.charAt(0).toUpperCase() + type.slice(1)} parlay with ${legs.length} legs`);
    reasoning.push(`Expected value: ${ev.toFixed(1)}%`);

    const sharpLegs = legs.filter(l => l.sharpAction).length;
    if (sharpLegs > 0) {
      reasoning.push(`${sharpLegs} legs with sharp action`);
    }

    const patternLegs = legs.filter(l => l.patternMatch).length;
    if (patternLegs > 0) {
      reasoning.push(`${patternLegs} legs match historical patterns`);
    }

    if (type === 'correlated') {
      reasoning.push('Correlated bets increase hit probability');
    } else if (type === 'hedged') {
      reasoning.push('Built-in hedge opportunities reduce risk');
    } else if (type === 'round_robin') {
      reasoning.push('Multiple ways to win with round robin format');
    }

    return reasoning;
  }

  private generateWarnings(
    legs: ParlayLeg[],
    correlationMatrix: number[][],
    riskScore: RiskScore
  ): string[] {
    const warnings: string[] = [];

    if (legs.length > 5) {
      warnings.push('Large parlay reduces hit probability');
    }

    if (riskScore.correlation > 60) {
      warnings.push('High correlation between selections');
    }

    if (riskScore.concentration > 70) {
      warnings.push('Concentrated exposure to single sport/league');
    }

    const weakLegs = legs.filter(l => l.trueProbability < 0.45);
    if (weakLegs.length > 0) {
      warnings.push(`${weakLegs.length} legs with low probability`);
    }

    if (riskScore.overall > 70) {
      warnings.push('High overall risk - consider smaller stake');
    }

    return warnings;
  }

  private projectReturns(stake: number, odds: number, probability: number): ProjectedReturn {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    
    const bestCase = stake * decimalOdds;
    const worstCase = -stake;
    const expectedCase = (probability * bestCase) + ((1 - probability) * worstCase);
    
    const breakEvenProbability = 1 / decimalOdds;
    const profitProbability = probability;
    const roi = ((expectedCase - stake) / stake) * 100;

    return {
      bestCase,
      expectedCase,
      worstCase,
      breakEvenProbability,
      profitProbability,
      roi
    };
  }

  private calculateConfidence(legs: ParlayLeg[], ev: number): number {
    let confidence = 0.5;

    // Add confidence for positive EV
    confidence += Math.min(0.2, ev / 50);

    // Add confidence for sharp action
    const sharpPercentage = legs.filter(l => l.sharpAction).length / legs.length;
    confidence += sharpPercentage * 0.15;

    // Add confidence for pattern matches
    const patternPercentage = legs.filter(l => l.patternMatch).length / legs.length;
    confidence += patternPercentage * 0.1;

    // Reduce confidence for many legs
    confidence -= (legs.length - 2) * 0.02;

    return Math.min(0.95, Math.max(0.1, confidence));
  }

  private recalculateEV(parlay: OptimizedParlay): number {
    return this.calculateExpectedValue(
      parlay.trueProbability,
      parlay.impliedProbability,
      parlay.totalOdds
    );
  }

  private calculateEdge(game: any, pattern: any, sharp: any): number {
    let edge = 0;

    if (pattern) {
      edge += pattern.confidence * 5;
    }

    if (sharp) {
      edge += sharp.confidence * 7;
    }

    // Add base edge from line value
    if (game.lineValue) {
      edge += game.lineValue;
    }

    return edge;
  }

  private calculateGameProbability(game: any, edge: number): number {
    const baseProb = 0.5238; // Break-even at -110
    return Math.min(0.75, baseProb + (edge / 100));
  }

  private async getPatternMatches(games: any[]): Promise<any[]> {
    // This would integrate with pattern recognition service
    return [];
  }

  private async getSharpBets(games: any[]): Promise<any[]> {
    // This would integrate with sharp money tracker
    return [];
  }
}

// Export singleton instance
export const parlayOptimizer = new AdvancedParlayOptimizer();