/**
 * Advanced Value Betting Calculator
 * Identifies profitable betting opportunities using real odds and predictions
 */

import { OddsComparison, SportType, UniversalGame } from './comprehensiveSportsApi';
import { PredictionResult } from './predictionEngine';

export interface ValueBet {
  gameId: string;
  sport: SportType;
  game: UniversalGame;
  betType: 'moneyline' | 'spread' | 'total' | 'prop';
  selection: string;
  book: string;
  currentOdds: number;
  fairOdds: number;
  impliedProbability: number;
  trueProbability: number;
  edge: number;
  expectedValue: number;
  kellyFraction: number;
  suggestedStake: number;
  confidence: number;
  breakEvenWinRate: number;
  roi: number;
  sharpAction?: 'agree' | 'disagree' | 'neutral';
  lineMovement?: 'toward' | 'away' | 'stable';
  publicBetting?: number;
  timestamp: Date;
}

export interface ArbitrageOpportunity {
  gameId: string;
  sport: SportType;
  type: 'two-way' | 'three-way' | 'middle';
  legs: {
    book: string;
    betType: string;
    selection: string;
    odds: number;
    stake: number;
  }[];
  totalStake: number;
  guaranteedProfit: number;
  profitPercentage: number;
  expirationTime?: Date;
  warnings: string[];
}

export interface BankrollStrategy {
  currentBankroll: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  unitSize: number;
  maxExposure: number;
  currentExposure: number;
  recommendations: {
    bet: ValueBet;
    suggestedUnits: number;
    reason: string;
  }[];
  projectedGrowth: {
    oneWeek: number;
    oneMonth: number;
    threemonths: number;
  };
}

export interface LiveOddsUpdate {
  gameId: string;
  timestamp: Date;
  changes: {
    betType: string;
    previousOdds: number;
    currentOdds: number;
    direction: 'up' | 'down';
    magnitude: number;
  }[];
  triggers: string[];
}

class ValueBettingCalculator {
  private readonly MIN_EDGE_THRESHOLD = 0.03; // 3% minimum edge
  private readonly KELLY_DIVISOR = 4; // Quarter Kelly for safety
  private readonly SHARP_BOOKS = ['Pinnacle', 'Bet365', 'Bookmaker'];
  private readonly PUBLIC_BOOKS = ['DraftKings', 'FanDuel', 'BetMGM'];
  
  /**
   * Calculate value bets from predictions and odds
   */
  calculateValueBets(
    prediction: PredictionResult,
    odds: OddsComparison,
    game: UniversalGame,
    bankroll?: number
  ): ValueBet[] {
    const valueBets: ValueBet[] = [];
    
    // Analyze moneyline value
    odds.books.forEach(book => {
      // Home moneyline
      const homeValue = this.analyzeMoneylineValue(
        book.name,
        book.moneyline.home,
        prediction.ensemble.homeWinProb,
        'home',
        game,
        bankroll
      );
      
      if (homeValue && homeValue.edge > this.MIN_EDGE_THRESHOLD) {
        valueBets.push({
          ...homeValue,
          gameId: game.id,
          sport: game.sport,
          game,
          sharpAction: this.analyzeSharpAction(book.name, odds.books),
          lineMovement: this.analyzeLineMovement(book.moneyline.home, odds.books),
          timestamp: new Date()
        });
      }
      
      // Away moneyline
      const awayValue = this.analyzeMoneylineValue(
        book.name,
        book.moneyline.away,
        prediction.ensemble.awayWinProb,
        'away',
        game,
        bankroll
      );
      
      if (awayValue && awayValue.edge > this.MIN_EDGE_THRESHOLD) {
        valueBets.push({
          ...awayValue,
          gameId: game.id,
          sport: game.sport,
          game,
          sharpAction: this.analyzeSharpAction(book.name, odds.books),
          lineMovement: this.analyzeLineMovement(book.moneyline.away, odds.books),
          timestamp: new Date()
        });
      }
      
      // Spread value
      const spreadValue = this.analyzeSpreadValue(
        book,
        prediction.ensemble.expectedSpread,
        prediction.ensemble.confidence,
        game,
        bankroll
      );
      
      spreadValue.forEach(bet => {
        if (bet.edge > this.MIN_EDGE_THRESHOLD) {
          valueBets.push({
            ...bet,
            gameId: game.id,
            sport: game.sport,
            game,
            timestamp: new Date()
          });
        }
      });
      
      // Total value
      const totalValue = this.analyzeTotalValue(
        book,
        prediction.ensemble.expectedTotal,
        prediction.ensemble.confidence,
        game,
        bankroll
      );
      
      totalValue.forEach(bet => {
        if (bet.edge > this.MIN_EDGE_THRESHOLD) {
          valueBets.push({
            ...bet,
            gameId: game.id,
            sport: game.sport,
            game,
            timestamp: new Date()
          });
        }
      });
    });
    
    // Sort by expected value
    return valueBets.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Find arbitrage opportunities
   */
  findArbitrageOpportunities(
    odds: OddsComparison,
    game: UniversalGame
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Two-way arbitrage (moneyline)
    const bestHome = odds.bestOdds.homeMoneyline;
    const bestAway = odds.bestOdds.awayMoneyline;
    
    if (bestHome && bestAway) {
      const homeDecimal = this.americanToDecimal(bestHome.odds);
      const awayDecimal = this.americanToDecimal(bestAway.odds);
      const arbPercentage = (1 / homeDecimal) + (1 / awayDecimal);
      
      if (arbPercentage < 1) {
        const totalStake = 1000; // Standard unit
        const homeStake = totalStake / (homeDecimal * arbPercentage);
        const awayStake = totalStake / (awayDecimal * arbPercentage);
        const profit = totalStake * (1 - arbPercentage);
        
        opportunities.push({
          gameId: game.id,
          sport: game.sport,
          type: 'two-way',
          legs: [
            {
              book: bestHome.book,
              betType: 'moneyline',
              selection: 'home',
              odds: bestHome.odds,
              stake: homeStake
            },
            {
              book: bestAway.book,
              betType: 'moneyline',
              selection: 'away',
              odds: bestAway.odds,
              stake: awayStake
            }
          ],
          totalStake,
          guaranteedProfit: profit,
          profitPercentage: (profit / totalStake) * 100,
          warnings: this.generateArbitrageWarnings(bestHome.book, bestAway.book)
        });
      }
    }
    
    // Middle opportunities (spread/total)
    const middleOps = this.findMiddleOpportunities(odds, game);
    opportunities.push(...middleOps);
    
    return opportunities;
  }

  /**
   * Create bankroll management strategy
   */
  createBankrollStrategy(
    valueBets: ValueBet[],
    currentBankroll: number,
    riskTolerance: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ): BankrollStrategy {
    const unitSize = this.calculateUnitSize(currentBankroll, riskTolerance);
    const maxExposure = this.getMaxExposure(currentBankroll, riskTolerance);
    
    // Filter and rank bets based on strategy
    const qualifiedBets = this.filterBetsByStrategy(valueBets, riskTolerance);
    
    // Calculate optimal stake for each bet
    const recommendations = qualifiedBets.map(bet => {
      const units = this.calculateOptimalUnits(bet, unitSize, riskTolerance);
      return {
        bet,
        suggestedUnits: units,
        reason: this.getStakeReason(bet, units, riskTolerance)
      };
    });
    
    // Calculate current exposure
    const currentExposure = recommendations.reduce(
      (sum, rec) => sum + (rec.suggestedUnits * unitSize),
      0
    );
    
    // Adjust if over max exposure
    if (currentExposure > maxExposure) {
      const scaleFactor = maxExposure / currentExposure;
      recommendations.forEach(rec => {
        rec.suggestedUnits *= scaleFactor;
      });
    }
    
    // Project growth
    const projectedGrowth = this.projectBankrollGrowth(
      currentBankroll,
      recommendations,
      unitSize
    );
    
    return {
      currentBankroll,
      riskTolerance,
      unitSize,
      maxExposure,
      currentExposure: Math.min(currentExposure, maxExposure),
      recommendations: recommendations.slice(0, 10), // Top 10 bets
      projectedGrowth
    };
  }

  /**
   * Track live odds updates
   */
  trackLiveOddsUpdates(
    previousOdds: OddsComparison,
    currentOdds: OddsComparison,
    gameId: string
  ): LiveOddsUpdate {
    const changes: LiveOddsUpdate['changes'] = [];
    const triggers: string[] = [];
    
    // Compare moneyline odds
    previousOdds.books.forEach(prevBook => {
      const currBook = currentOdds.books.find(b => b.name === prevBook.name);
      if (!currBook) return;
      
      // Home moneyline change
      if (prevBook.moneyline.home !== currBook.moneyline.home) {
        const magnitude = Math.abs(prevBook.moneyline.home - currBook.moneyline.home);
        changes.push({
          betType: 'home_moneyline',
          previousOdds: prevBook.moneyline.home,
          currentOdds: currBook.moneyline.home,
          direction: currBook.moneyline.home > prevBook.moneyline.home ? 'up' : 'down',
          magnitude
        });
        
        if (magnitude > 20) {
          triggers.push(`Significant line movement on home moneyline (${magnitude} points)`);
        }
      }
      
      // Away moneyline change
      if (prevBook.moneyline.away !== currBook.moneyline.away) {
        const magnitude = Math.abs(prevBook.moneyline.away - currBook.moneyline.away);
        changes.push({
          betType: 'away_moneyline',
          previousOdds: prevBook.moneyline.away,
          currentOdds: currBook.moneyline.away,
          direction: currBook.moneyline.away > prevBook.moneyline.away ? 'up' : 'down',
          magnitude
        });
        
        if (magnitude > 20) {
          triggers.push(`Significant line movement on away moneyline (${magnitude} points)`);
        }
      }
      
      // Spread changes
      if (prevBook.spread.line !== currBook.spread.line) {
        triggers.push(`Spread moved from ${prevBook.spread.line} to ${currBook.spread.line}`);
      }
      
      // Total changes
      if (prevBook.total.line !== currBook.total.line) {
        triggers.push(`Total moved from ${prevBook.total.line} to ${currBook.total.line}`);
      }
    });
    
    // Analyze steam moves
    if (this.detectSteamMove(changes)) {
      triggers.push('STEAM MOVE DETECTED - Sharp money coming in');
    }
    
    // Analyze reverse line movement
    if (this.detectReverseLineMovement(changes)) {
      triggers.push('Reverse line movement - Possible sharp action against public');
    }
    
    return {
      gameId,
      timestamp: new Date(),
      changes,
      triggers
    };
  }

  /**
   * Calculate closing line value
   */
  calculateClosingLineValue(
    betOdds: number,
    closingOdds: number,
    betType: 'moneyline' | 'spread' | 'total'
  ): number {
    const betProb = this.americanToImpliedProb(betOdds);
    const closingProb = this.americanToImpliedProb(closingOdds);
    
    // Positive CLV means we beat the closing line
    const clv = betProb - closingProb;
    
    return clv * 100; // Return as percentage
  }

  // Private helper methods
  private analyzeMoneylineValue(
    book: string,
    odds: number,
    trueProbability: number,
    selection: string,
    game: UniversalGame,
    bankroll?: number
  ): Omit<ValueBet, 'gameId' | 'sport' | 'game' | 'timestamp'> | null {
    if (!odds || odds === 0) return null;
    
    const impliedProbability = this.americanToImpliedProb(odds);
    const edge = trueProbability - impliedProbability;
    
    if (edge <= 0) return null;
    
    const fairOdds = this.probToAmerican(trueProbability);
    const expectedValue = this.calculateExpectedValue(trueProbability, odds);
    const kellyFraction = this.calculateKellyFraction(trueProbability, odds);
    const suggestedStake = bankroll ? this.calculateSuggestedStake(kellyFraction, bankroll) : 0;
    const roi = (expectedValue / 100) * 100;
    
    return {
      betType: 'moneyline',
      selection,
      book,
      currentOdds: odds,
      fairOdds,
      impliedProbability,
      trueProbability,
      edge,
      expectedValue,
      kellyFraction,
      suggestedStake,
      confidence: 0.75,
      breakEvenWinRate: impliedProbability,
      roi
    };
  }

  private analyzeSpreadValue(
    book: any,
    expectedSpread: number,
    confidence: number,
    game: UniversalGame,
    bankroll?: number
  ): Omit<ValueBet, 'gameId' | 'sport' | 'game' | 'timestamp'>[] {
    const valueBets: Omit<ValueBet, 'gameId' | 'sport' | 'game' | 'timestamp'>[] = [];
    
    if (!book.spread.line || !book.spread.home || !book.spread.away) return valueBets;
    
    const spreadDiff = expectedSpread - book.spread.line;
    const threshold = 1.5; // Points threshold for value
    
    // Home spread value
    if (spreadDiff < -threshold) {
      const coverProb = this.calculateSpreadCoverProbability(spreadDiff);
      const impliedProb = this.americanToImpliedProb(book.spread.home);
      const edge = coverProb - impliedProb;
      
      if (edge > 0) {
        valueBets.push({
          betType: 'spread',
          selection: `home ${book.spread.line}`,
          book: book.name,
          currentOdds: book.spread.home,
          fairOdds: this.probToAmerican(coverProb),
          impliedProbability: impliedProb,
          trueProbability: coverProb,
          edge,
          expectedValue: this.calculateExpectedValue(coverProb, book.spread.home),
          kellyFraction: this.calculateKellyFraction(coverProb, book.spread.home),
          suggestedStake: bankroll ? this.calculateSuggestedStake(
            this.calculateKellyFraction(coverProb, book.spread.home),
            bankroll
          ) : 0,
          confidence: confidence * 0.9,
          breakEvenWinRate: impliedProb,
          roi: (this.calculateExpectedValue(coverProb, book.spread.home) / 100) * 100
        });
      }
    }
    
    // Away spread value
    if (spreadDiff > threshold) {
      const coverProb = this.calculateSpreadCoverProbability(-spreadDiff);
      const impliedProb = this.americanToImpliedProb(book.spread.away);
      const edge = coverProb - impliedProb;
      
      if (edge > 0) {
        valueBets.push({
          betType: 'spread',
          selection: `away ${-book.spread.line}`,
          book: book.name,
          currentOdds: book.spread.away,
          fairOdds: this.probToAmerican(coverProb),
          impliedProbability: impliedProb,
          trueProbability: coverProb,
          edge,
          expectedValue: this.calculateExpectedValue(coverProb, book.spread.away),
          kellyFraction: this.calculateKellyFraction(coverProb, book.spread.away),
          suggestedStake: bankroll ? this.calculateSuggestedStake(
            this.calculateKellyFraction(coverProb, book.spread.away),
            bankroll
          ) : 0,
          confidence: confidence * 0.9,
          breakEvenWinRate: impliedProb,
          roi: (this.calculateExpectedValue(coverProb, book.spread.away) / 100) * 100
        });
      }
    }
    
    return valueBets;
  }

  private analyzeTotalValue(
    book: any,
    expectedTotal: number,
    confidence: number,
    game: UniversalGame,
    bankroll?: number
  ): Omit<ValueBet, 'gameId' | 'sport' | 'game' | 'timestamp'>[] {
    const valueBets: Omit<ValueBet, 'gameId' | 'sport' | 'game' | 'timestamp'>[] = [];
    
    if (!book.total.line || !book.total.over || !book.total.under) return valueBets;
    
    const totalDiff = expectedTotal - book.total.line;
    const threshold = this.getTotalThreshold(game.sport);
    
    // Over value
    if (totalDiff > threshold) {
      const overProb = this.calculateTotalProbability(totalDiff, true);
      const impliedProb = this.americanToImpliedProb(book.total.over);
      const edge = overProb - impliedProb;
      
      if (edge > 0) {
        valueBets.push({
          betType: 'total',
          selection: `over ${book.total.line}`,
          book: book.name,
          currentOdds: book.total.over,
          fairOdds: this.probToAmerican(overProb),
          impliedProbability: impliedProb,
          trueProbability: overProb,
          edge,
          expectedValue: this.calculateExpectedValue(overProb, book.total.over),
          kellyFraction: this.calculateKellyFraction(overProb, book.total.over),
          suggestedStake: bankroll ? this.calculateSuggestedStake(
            this.calculateKellyFraction(overProb, book.total.over),
            bankroll
          ) : 0,
          confidence: confidence * 0.85,
          breakEvenWinRate: impliedProb,
          roi: (this.calculateExpectedValue(overProb, book.total.over) / 100) * 100
        });
      }
    }
    
    // Under value
    if (totalDiff < -threshold) {
      const underProb = this.calculateTotalProbability(-totalDiff, false);
      const impliedProb = this.americanToImpliedProb(book.total.under);
      const edge = underProb - impliedProb;
      
      if (edge > 0) {
        valueBets.push({
          betType: 'total',
          selection: `under ${book.total.line}`,
          book: book.name,
          currentOdds: book.total.under,
          fairOdds: this.probToAmerican(underProb),
          impliedProbability: impliedProb,
          trueProbability: underProb,
          edge,
          expectedValue: this.calculateExpectedValue(underProb, book.total.under),
          kellyFraction: this.calculateKellyFraction(underProb, book.total.under),
          suggestedStake: bankroll ? this.calculateSuggestedStake(
            this.calculateKellyFraction(underProb, book.total.under),
            bankroll
          ) : 0,
          confidence: confidence * 0.85,
          breakEvenWinRate: impliedProb,
          roi: (this.calculateExpectedValue(underProb, book.total.under) / 100) * 100
        });
      }
    }
    
    return valueBets;
  }

  private calculateSpreadCoverProbability(spreadDiff: number): number {
    // Use normal distribution to estimate cover probability
    const stdDev = 10; // Standard deviation for spread
    const zScore = spreadDiff / stdDev;
    return this.normalCDF(zScore);
  }

  private calculateTotalProbability(totalDiff: number, isOver: boolean): number {
    const stdDev = 8; // Standard deviation for totals
    const zScore = totalDiff / stdDev;
    return isOver ? 1 - this.normalCDF(-zScore) : this.normalCDF(-zScore);
  }

  private getTotalThreshold(sport: SportType): number {
    const thresholds: Record<SportType, number> = {
      NBA: 4,
      NFL: 3,
      MLB: 0.5,
      NHL: 0.5,
      NCAAB: 5,
      NCAAF: 4,
      TENNIS: 2,
      SOCCER: 0.25
    };
    return thresholds[sport] || 3;
  }

  private analyzeSharpAction(bookName: string, allBooks: any[]): 'agree' | 'disagree' | 'neutral' {
    const isSharp = this.SHARP_BOOKS.includes(bookName);
    if (!isSharp) return 'neutral';
    
    // Compare sharp book odds to public books
    const sharpOdds = allBooks.find(b => b.name === bookName);
    const publicOdds = allBooks.filter(b => this.PUBLIC_BOOKS.includes(b.name));
    
    if (!sharpOdds || publicOdds.length === 0) return 'neutral';
    
    // Simplified sharp action analysis
    return 'neutral';
  }

  private analyzeLineMovement(currentOdds: number, allBooks: any[]): 'toward' | 'away' | 'stable' {
    // Simplified line movement analysis
    return 'stable';
  }

  private findMiddleOpportunities(odds: OddsComparison, game: UniversalGame): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Find spread middles
    const spreads = odds.books.map(b => ({
      book: b.name,
      line: b.spread.line,
      homeOdds: b.spread.home,
      awayOdds: b.spread.away
    })).filter(s => s.line);
    
    for (let i = 0; i < spreads.length - 1; i++) {
      for (let j = i + 1; j < spreads.length; j++) {
        const diff = Math.abs(spreads[i].line - spreads[j].line);
        if (diff >= 1) {
          // Potential middle opportunity
          const totalStake = 1000;
          const stake1 = totalStake / 2;
          const stake2 = totalStake / 2;
          
          opportunities.push({
            gameId: game.id,
            sport: game.sport,
            type: 'middle',
            legs: [
              {
                book: spreads[i].book,
                betType: 'spread',
                selection: `home ${spreads[i].line}`,
                odds: spreads[i].homeOdds,
                stake: stake1
              },
              {
                book: spreads[j].book,
                betType: 'spread',
                selection: `away ${-spreads[j].line}`,
                odds: spreads[j].awayOdds,
                stake: stake2
              }
            ],
            totalStake,
            guaranteedProfit: 0, // Depends on outcome
            profitPercentage: diff * 10, // Rough estimate
            warnings: ['Middle opportunity - profit depends on final score']
          });
        }
      }
    }
    
    return opportunities;
  }

  private generateArbitrageWarnings(book1: string, book2: string): string[] {
    const warnings: string[] = [];
    
    if (book1 === book2) {
      warnings.push('Same book - may not allow both sides');
    }
    
    if (!this.SHARP_BOOKS.includes(book1) && !this.SHARP_BOOKS.includes(book2)) {
      warnings.push('Both books are recreational - higher limit risk');
    }
    
    warnings.push('Act quickly - arbitrage windows close fast');
    warnings.push('Verify odds before placing bets');
    
    return warnings;
  }

  private calculateUnitSize(bankroll: number, riskTolerance: string): number {
    const percentages = {
      conservative: 0.01,
      moderate: 0.02,
      aggressive: 0.03
    };
    return bankroll * (percentages[riskTolerance as keyof typeof percentages] || 0.02);
  }

  private getMaxExposure(bankroll: number, riskTolerance: string): number {
    const percentages = {
      conservative: 0.05,
      moderate: 0.10,
      aggressive: 0.20
    };
    return bankroll * (percentages[riskTolerance as keyof typeof percentages] || 0.10);
  }

  private filterBetsByStrategy(bets: ValueBet[], riskTolerance: string): ValueBet[] {
    switch (riskTolerance) {
      case 'conservative':
        return bets.filter(b => b.edge > 0.05 && b.confidence > 0.7);
      case 'moderate':
        return bets.filter(b => b.edge > 0.03 && b.confidence > 0.6);
      case 'aggressive':
        return bets.filter(b => b.edge > 0.02);
      default:
        return bets;
    }
  }

  private calculateOptimalUnits(bet: ValueBet, unitSize: number, riskTolerance: string): number {
    const kellyMultiplier = {
      conservative: 0.25,
      moderate: 0.5,
      aggressive: 0.75
    };
    
    const multiplier = kellyMultiplier[riskTolerance as keyof typeof kellyMultiplier] || 0.5;
    const kellyUnits = bet.kellyFraction * multiplier * (bet.suggestedStake / unitSize);
    
    // Cap at maximum units based on confidence
    const maxUnits = bet.confidence > 0.8 ? 3 : bet.confidence > 0.6 ? 2 : 1;
    
    return Math.min(kellyUnits, maxUnits);
  }

  private getStakeReason(bet: ValueBet, units: number, riskTolerance: string): string {
    if (bet.edge > 0.10) {
      return `Strong edge of ${(bet.edge * 100).toFixed(1)}% warrants ${units.toFixed(1)} units`;
    } else if (bet.confidence > 0.8) {
      return `High confidence (${(bet.confidence * 100).toFixed(0)}%) supports ${units.toFixed(1)} units`;
    } else {
      return `${riskTolerance} strategy suggests ${units.toFixed(1)} units`;
    }
  }

  private projectBankrollGrowth(
    bankroll: number,
    recommendations: any[],
    unitSize: number
  ): any {
    // Simplified growth projection
    const avgEdge = recommendations.reduce((sum, r) => sum + r.bet.edge, 0) / recommendations.length;
    const weeklyBets = recommendations.length * 7;
    const monthlyBets = recommendations.length * 30;
    const quarterlyBets = recommendations.length * 90;
    
    return {
      oneWeek: bankroll * (1 + avgEdge * weeklyBets * 0.01),
      oneMonth: bankroll * (1 + avgEdge * monthlyBets * 0.01),
      threeMonths: bankroll * (1 + avgEdge * quarterlyBets * 0.01)
    };
  }

  private detectSteamMove(changes: any[]): boolean {
    // Detect coordinated line movement across multiple books
    const significantMoves = changes.filter(c => c.magnitude > 15);
    const sameDirection = significantMoves.every(c => c.direction === significantMoves[0]?.direction);
    return significantMoves.length > 2 && sameDirection;
  }

  private detectReverseLineMovement(changes: any[]): boolean {
    // Simplified RLM detection
    return false;
  }

  // Utility methods
  private americanToDecimal(odds: number): number {
    if (odds > 0) {
      return (odds / 100) + 1;
    } else {
      return (100 / Math.abs(odds)) + 1;
    }
  }

  private americanToImpliedProb(odds: number): number {
    if (!odds || odds === 0) return 0;
    if (odds > 0) {
      return 100 / (odds + 100);
    } else {
      return Math.abs(odds) / (Math.abs(odds) + 100);
    }
  }

  private probToAmerican(prob: number): number {
    if (prob >= 0.5) {
      return -Math.round((prob / (1 - prob)) * 100);
    } else {
      return Math.round(((1 - prob) / prob) * 100);
    }
  }

  private calculateExpectedValue(prob: number, odds: number): number {
    const decimal = this.americanToDecimal(odds);
    return (prob * decimal - 1) * 100;
  }

  private calculateKellyFraction(prob: number, odds: number): number {
    const decimal = this.americanToDecimal(odds);
    const q = 1 - prob;
    const kelly = (prob * decimal - 1) / (decimal - 1);
    return Math.max(0, Math.min(0.25, kelly / this.KELLY_DIVISOR));
  }

  private calculateSuggestedStake(kelly: number, bankroll: number): number {
    return Math.round(kelly * bankroll);
  }

  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return 0.5 * (1.0 + sign * y);
  }
}

// Export singleton instance
export const valueBettingCalculator = new ValueBettingCalculator();

// Export convenience functions
export const calculateValueBets = (
  prediction: PredictionResult,
  odds: OddsComparison,
  game: UniversalGame,
  bankroll?: number
) => valueBettingCalculator.calculateValueBets(prediction, odds, game, bankroll);

export const findArbitrageOpportunities = (odds: OddsComparison, game: UniversalGame) =>
  valueBettingCalculator.findArbitrageOpportunities(odds, game);

export const createBankrollStrategy = (
  valueBets: ValueBet[],
  bankroll: number,
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive'
) => valueBettingCalculator.createBankrollStrategy(valueBets, bankroll, riskTolerance);

export const trackLiveOddsUpdates = (
  previousOdds: OddsComparison,
  currentOdds: OddsComparison,
  gameId: string
) => valueBettingCalculator.trackLiveOddsUpdates(previousOdds, currentOdds, gameId);

export const calculateClosingLineValue = (
  betOdds: number,
  closingOdds: number,
  betType: 'moneyline' | 'spread' | 'total'
) => valueBettingCalculator.calculateClosingLineValue(betOdds, closingOdds, betType);