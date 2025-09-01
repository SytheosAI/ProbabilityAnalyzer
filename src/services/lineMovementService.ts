// Line Movement Tracking Service
// Monitors odds changes, detects sharp money movements, and tracks closing line value

import { Game } from './sportsDataService';
import { ExpectedValueAnalysis } from './expectedValueService';

export interface OddsSnapshot {
  gameId: string;
  timestamp: string;
  book: string;
  homeMoneyline: number;
  awayMoneyline: number;
  spread: {
    line: number;
    homeOdds: number;
    awayOdds: number;
  };
  total: {
    line: number;
    overOdds: number;
    underOdds: number;
  };
}

export interface LineHistory {
  gameId: string;
  sport: string;
  openingLines: OddsSnapshot;
  currentLines: OddsSnapshot;
  movements: LineMovement[];
  keyMoments: KeyMoment[];
  sharpAction: SharpAction[];
  publicBetting: PublicBetting;
  closingLineProjection: ClosingLineProjection;
}

export interface LineMovement {
  timestamp: string;
  type: 'moneyline' | 'spread' | 'total';
  previousValue: number;
  newValue: number;
  change: number;
  percentageChange: number;
  trigger?: 'sharp' | 'public' | 'news' | 'limit';
  significance: 'minor' | 'moderate' | 'major' | 'steam';
}

export interface KeyMoment {
  timestamp: string;
  type: 'steam_move' | 'reverse_line' | 'key_number_cross' | 'limit_raise' | 'injury_news';
  description: string;
  impact: 'low' | 'medium' | 'high';
  lineBefo: number;
  lineAfter: number;
}

export interface SharpAction {
  timestamp: string;
  side: 'home' | 'away' | 'over' | 'under';
  betType: 'moneyline' | 'spread' | 'total';
  estimatedAmount: number;
  lineValue: number;
  respected: boolean; // Whether books moved on this action
  syndicateInvolved: boolean;
}

export interface PublicBetting {
  bettingPercentage: {
    home: number;
    away: number;
  };
  moneyPercentage: {
    home: number;
    away: number;
  };
  ticketCount: number;
  averageBetSize: number;
  publicSide: 'home' | 'away' | 'balanced';
  liabilityExposure: 'low' | 'medium' | 'high';
}

export interface ClosingLineProjection {
  projectedMoneyline: {
    home: number;
    away: number;
  };
  projectedSpread: number;
  projectedTotal: number;
  confidence: number;
  factors: string[];
  expectedCLV: number; // Closing Line Value percentage
}

export interface SteamMove {
  gameId: string;
  timestamp: string;
  sport: string;
  type: 'moneyline' | 'spread' | 'total';
  direction: 'home' | 'away' | 'over' | 'under';
  startLine: number;
  endLine: number;
  movementPoints: number;
  timespan: number; // minutes
  booksInvolved: string[];
  synchronized: boolean; // All books moved together
  estimatedSharpMoney: number;
}

export interface ReverseLineMovement {
  gameId: string;
  timestamp: string;
  bettingPercentage: number;
  moneyPercentage: number;
  publicSide: string;
  lineDirection: 'toward_public' | 'against_public';
  significance: number; // 0-1 scale
  sharpSideConfirmed: boolean;
}

// Line Movement Tracker
export class LineMovementTracker {
  private lineHistory: Map<string, LineHistory> = new Map();
  private steamMoves: SteamMove[] = [];
  private reverseMovements: ReverseLineMovement[] = [];
  
  // Key numbers for different sports
  private readonly keyNumbers: Record<string, number[]> = {
    nfl: [3, 4, 6, 7, 10, 14],
    nba: [5, 7, 10],
    mlb: [1.5],
    nhl: [1.5],
    ncaafb: [3, 7, 10, 14, 17],
    ncaamb: [5, 7, 10],
    soccer: [0.5, 1, 1.5, 2.5],
    mls: [0.5, 1, 1.5, 2.5]
  };
  
  // Steam move thresholds by sport (points)
  private readonly steamThresholds: Record<string, number> = {
    nfl: 1,      // 1 point spread move
    nba: 2,      // 2 point spread move
    mlb: 20,     // 20 cents on moneyline
    nhl: 20,     // 20 cents on moneyline
    ncaafb: 1.5, // 1.5 point spread move
    ncaamb: 2.5, // 2.5 point spread move
    soccer: 0.25, // 0.25 goal line move
    mls: 0.25    // 0.25 goal line move
  };
  
  /**
   * Track line movement for a game
   */
  public trackLineMovement(
    game: Game,
    previousSnapshot?: OddsSnapshot
  ): LineMovement[] {
    const movements: LineMovement[] = [];
    const currentSnapshot = this.createSnapshot(game);
    
    if (!previousSnapshot) {
      // Initialize tracking for this game
      this.initializeLineHistory(game, currentSnapshot);
      return movements;
    }
    
    // Check moneyline movement
    if (currentSnapshot.homeMoneyline !== previousSnapshot.homeMoneyline) {
      const change = currentSnapshot.homeMoneyline - previousSnapshot.homeMoneyline;
      const percentageChange = Math.abs(change / previousSnapshot.homeMoneyline) * 100;
      
      movements.push({
        timestamp: new Date().toISOString(),
        type: 'moneyline',
        previousValue: previousSnapshot.homeMoneyline,
        newValue: currentSnapshot.homeMoneyline,
        change: change,
        percentageChange: percentageChange,
        trigger: this.detectMovementTrigger(change, percentageChange),
        significance: this.categorizeSignificance(Math.abs(change), 'moneyline')
      });
    }
    
    // Check spread movement
    if (currentSnapshot.spread && previousSnapshot.spread &&
        currentSnapshot.spread.line !== previousSnapshot.spread.line) {
      const change = currentSnapshot.spread.line - previousSnapshot.spread.line;
      const percentageChange = Math.abs(change / (previousSnapshot.spread.line || 1)) * 100;
      
      movements.push({
        timestamp: new Date().toISOString(),
        type: 'spread',
        previousValue: previousSnapshot.spread.line,
        newValue: currentSnapshot.spread.line,
        change: change,
        percentageChange: percentageChange,
        trigger: this.detectMovementTrigger(change, percentageChange),
        significance: this.categorizeSignificance(Math.abs(change), 'spread')
      });
      
      // Check for key number crossing
      this.checkKeyNumberCrossing(game, previousSnapshot.spread.line, currentSnapshot.spread.line);
    }
    
    // Check total movement
    if (currentSnapshot.total && previousSnapshot.total &&
        currentSnapshot.total.line !== previousSnapshot.total.line) {
      const change = currentSnapshot.total.line - previousSnapshot.total.line;
      const percentageChange = Math.abs(change / previousSnapshot.total.line) * 100;
      
      movements.push({
        timestamp: new Date().toISOString(),
        type: 'total',
        previousValue: previousSnapshot.total.line,
        newValue: currentSnapshot.total.line,
        change: change,
        percentageChange: percentageChange,
        trigger: this.detectMovementTrigger(change, percentageChange),
        significance: this.categorizeSignificance(Math.abs(change), 'total')
      });
    }
    
    // Update line history
    if (movements.length > 0) {
      this.updateLineHistory(game.id, movements);
    }
    
    return movements;
  }
  
  /**
   * Detect steam moves (synchronized sharp action across books)
   */
  public detectSteamMove(
    gameId: string,
    sport: string,
    movements: LineMovement[],
    timeWindowMinutes: number = 5
  ): SteamMove | null {
    // Check if movements meet steam criteria
    const threshold = this.steamThresholds[sport.toLowerCase()] || 2;
    
    for (const movement of movements) {
      if (Math.abs(movement.change) >= threshold &&
          movement.significance === 'steam') {
        
        const steamMove: SteamMove = {
          gameId: gameId,
          timestamp: movement.timestamp,
          sport: sport,
          type: movement.type,
          direction: movement.change > 0 ? 'home' : 'away',
          startLine: movement.previousValue,
          endLine: movement.newValue,
          movementPoints: Math.abs(movement.change),
          timespan: timeWindowMinutes,
          booksInvolved: ['Book A', 'Book B', 'Book C'], // Would track actual books
          synchronized: true,
          estimatedSharpMoney: this.estimateSharpMoney(movement.change, sport)
        };
        
        this.steamMoves.push(steamMove);
        return steamMove;
      }
    }
    
    return null;
  }
  
  /**
   * Detect reverse line movement
   */
  public detectReverseLineMovement(
    gameId: string,
    bettingPercentage: number,
    moneyPercentage: number,
    lineMovement: LineMovement
  ): ReverseLineMovement | null {
    // Reverse line movement: line moves opposite to public betting
    const publicOnHome = bettingPercentage > 0.5;
    const lineMovingTowardHome = lineMovement.change < 0; // Negative odds getting more negative
    
    // Check if line is moving against public
    if ((publicOnHome && !lineMovingTowardHome) ||
        (!publicOnHome && lineMovingTowardHome)) {
      
      const reverseMovement: ReverseLineMovement = {
        gameId: gameId,
        timestamp: new Date().toISOString(),
        bettingPercentage: bettingPercentage,
        moneyPercentage: moneyPercentage,
        publicSide: publicOnHome ? 'home' : 'away',
        lineDirection: 'against_public',
        significance: Math.abs(bettingPercentage - 0.5) * 2, // 0-1 scale
        sharpSideConfirmed: Math.abs(moneyPercentage - bettingPercentage) > 0.15
      };
      
      this.reverseMovements.push(reverseMovement);
      return reverseMovement;
    }
    
    return null;
  }
  
  /**
   * Check if line crossed key numbers
   */
  private checkKeyNumberCrossing(
    game: Game,
    previousLine: number,
    currentLine: number
  ): KeyMoment | null {
    const sport = game.id.split('-')[0]; // Extract sport from game ID
    const keyNums = this.keyNumbers[sport.toLowerCase()] || [];
    
    for (const keyNum of keyNums) {
      // Check if we crossed this key number
      if ((previousLine < keyNum && currentLine >= keyNum) ||
          (previousLine > keyNum && currentLine <= keyNum) ||
          (previousLine < -keyNum && currentLine >= -keyNum) ||
          (previousLine > -keyNum && currentLine <= -keyNum)) {
        
        const keyMoment: KeyMoment = {
          timestamp: new Date().toISOString(),
          type: 'key_number_cross',
          description: `Line crossed key number ${keyNum}`,
          impact: 'high',
          lineBefo: previousLine,
          lineAfter: currentLine
        };
        
        // Add to line history
        const history = this.lineHistory.get(game.id);
        if (history) {
          history.keyMoments.push(keyMoment);
        }
        
        return keyMoment;
      }
    }
    
    return null;
  }
  
  /**
   * Analyze sharp vs public money
   */
  public analyzeSharpVsPublic(
    gameId: string,
    bettingData: {
      bettingPercentage: { home: number; away: number };
      moneyPercentage: { home: number; away: number };
      ticketCount: number;
    }
  ): {
    sharpSide: 'home' | 'away' | 'none';
    publicSide: 'home' | 'away' | 'none';
    discrepancy: number;
    liabilityRisk: 'low' | 'medium' | 'high';
    recommendation: string;
  } {
    const betPctHome = bettingData.bettingPercentage.home;
    const moneyPctHome = bettingData.moneyPercentage.home;
    const discrepancy = Math.abs(moneyPctHome - betPctHome);
    
    // Determine sides
    let sharpSide: 'home' | 'away' | 'none' = 'none';
    let publicSide: 'home' | 'away' | 'none' = 'none';
    
    if (betPctHome > 0.65) {
      publicSide = 'home';
      if (moneyPctHome < 0.5) {
        sharpSide = 'away'; // Sharp money on away despite public on home
      }
    } else if (betPctHome < 0.35) {
      publicSide = 'away';
      if (moneyPctHome > 0.5) {
        sharpSide = 'home'; // Sharp money on home despite public on away
      }
    }
    
    // If no extreme public betting, look for money discrepancy
    if (sharpSide === 'none' && discrepancy > 0.15) {
      if (moneyPctHome > betPctHome) {
        sharpSide = 'home'; // More money than tickets on home
      } else {
        sharpSide = 'away'; // More money than tickets on away
      }
    }
    
    // Assess liability risk for books
    let liabilityRisk: 'low' | 'medium' | 'high' = 'low';
    if (betPctHome > 0.75 || betPctHome < 0.25) {
      liabilityRisk = 'high';
    } else if (betPctHome > 0.65 || betPctHome < 0.35) {
      liabilityRisk = 'medium';
    }
    
    // Generate recommendation
    let recommendation = '';
    if (sharpSide !== 'none') {
      recommendation = `Follow sharp money on ${sharpSide}`;
      if (discrepancy > 0.20) {
        recommendation += ' (STRONG sharp indication)';
      }
    } else if (publicSide !== 'none' && liabilityRisk === 'high') {
      recommendation = `Consider fading heavy public side (${publicSide})`;
    } else {
      recommendation = 'No clear sharp/public split';
    }
    
    return {
      sharpSide,
      publicSide,
      discrepancy,
      liabilityRisk,
      recommendation
    };
  }
  
  /**
   * Project closing line value
   */
  public projectClosingLine(
    gameId: string,
    currentLine: number,
    hoursUntilGame: number,
    recentMovements: LineMovement[],
    sharpAction?: SharpAction[]
  ): ClosingLineProjection {
    // Calculate movement velocity
    const movementVelocity = this.calculateMovementVelocity(recentMovements);
    
    // Project based on time decay and velocity
    const timeDecayFactor = Math.exp(-hoursUntilGame / 24); // Exponential decay
    const projectedMovement = movementVelocity * hoursUntilGame * timeDecayFactor;
    
    // Adjust for sharp action
    let sharpAdjustment = 0;
    if (sharpAction && sharpAction.length > 0) {
      const recentSharp = sharpAction.filter(s => s.respected);
      sharpAdjustment = recentSharp.length * 0.5; // 0.5 points per respected sharp bet
    }
    
    const projectedLine = currentLine + projectedMovement + sharpAdjustment;
    
    // Calculate expected CLV
    const currentDecimal = this.oddsToDecimal(currentLine);
    const projectedDecimal = this.oddsToDecimal(projectedLine);
    const expectedCLV = ((projectedDecimal / currentDecimal) - 1) * 100;
    
    // Determine confidence based on factors
    let confidence = 0.5;
    if (recentMovements.length > 5) confidence += 0.2;
    if (sharpAction && sharpAction.length > 0) confidence += 0.2;
    if (hoursUntilGame < 6) confidence += 0.1; // More accurate closer to game
    
    return {
      projectedMoneyline: {
        home: projectedLine,
        away: -projectedLine // Simplified
      },
      projectedSpread: projectedLine,
      projectedTotal: 0, // Would calculate separately
      confidence: Math.min(confidence, 0.9),
      factors: [
        `Movement velocity: ${movementVelocity.toFixed(2)} points/hour`,
        `Sharp action detected: ${sharpAction?.length || 0} moves`,
        `Time until game: ${hoursUntilGame} hours`
      ],
      expectedCLV: expectedCLV
    };
  }
  
  /**
   * Get best entry point for a bet
   */
  public findBestEntryPoint(
    gameId: string,
    targetSide: 'home' | 'away',
    lineHistory: LineHistory
  ): {
    currentLine: number;
    bestHistoricalLine: number;
    projectedBestLine: number;
    recommendation: 'bet_now' | 'wait' | 'missed_value';
    reasoning: string;
  } {
    const current = lineHistory.currentLines.homeMoneyline;
    
    // Find best historical line for target side
    let bestHistorical = current;
    for (const movement of lineHistory.movements) {
      if (movement.type === 'moneyline') {
        if (targetSide === 'home' && movement.previousValue < bestHistorical) {
          bestHistorical = movement.previousValue;
        } else if (targetSide === 'away' && movement.previousValue > bestHistorical) {
          bestHistorical = movement.previousValue;
        }
      }
    }
    
    // Project future line
    const projection = this.projectClosingLine(
      gameId,
      current,
      6, // Assume 6 hours to game
      lineHistory.movements,
      lineHistory.sharpAction
    );
    
    const projectedBest = targetSide === 'home' 
      ? Math.min(current, projection.projectedMoneyline.home)
      : Math.max(current, projection.projectedMoneyline.away);
    
    // Determine recommendation
    let recommendation: 'bet_now' | 'wait' | 'missed_value';
    let reasoning: string;
    
    if (Math.abs(current - bestHistorical) < 5) {
      recommendation = 'bet_now';
      reasoning = 'Current line is near best available value';
    } else if (projectedBest === current) {
      recommendation = 'bet_now';
      reasoning = 'Line expected to move against you';
    } else if (Math.abs(projectedBest - current) > 10) {
      recommendation = 'wait';
      reasoning = `Better line projected: ${projectedBest}`;
    } else {
      recommendation = 'missed_value';
      reasoning = `Best line was ${bestHistorical}, unlikely to return`;
    }
    
    return {
      currentLine: current,
      bestHistoricalLine: bestHistorical,
      projectedBestLine: projectedBest,
      recommendation,
      reasoning
    };
  }
  
  // Helper methods
  
  private createSnapshot(game: Game): OddsSnapshot {
    return {
      gameId: game.id,
      timestamp: new Date().toISOString(),
      book: 'aggregate',
      homeMoneyline: game.homeMoneyline || -110,
      awayMoneyline: game.awayMoneyline || -110,
      spread: game.spread || { line: 0, homeOdds: -110, awayOdds: -110 },
      total: game.total || { line: 0, overOdds: -110, underOdds: -110 }
    };
  }
  
  private initializeLineHistory(game: Game, snapshot: OddsSnapshot): void {
    this.lineHistory.set(game.id, {
      gameId: game.id,
      sport: game.id.split('-')[0],
      openingLines: snapshot,
      currentLines: snapshot,
      movements: [],
      keyMoments: [],
      sharpAction: [],
      publicBetting: {
        bettingPercentage: { home: 0.5, away: 0.5 },
        moneyPercentage: { home: 0.5, away: 0.5 },
        ticketCount: 0,
        averageBetSize: 0,
        publicSide: 'balanced',
        liabilityExposure: 'low'
      },
      closingLineProjection: {
        projectedMoneyline: { home: snapshot.homeMoneyline, away: snapshot.awayMoneyline },
        projectedSpread: snapshot.spread.line,
        projectedTotal: snapshot.total.line,
        confidence: 0.5,
        factors: [],
        expectedCLV: 0
      }
    });
  }
  
  private updateLineHistory(gameId: string, movements: LineMovement[]): void {
    const history = this.lineHistory.get(gameId);
    if (history) {
      history.movements.push(...movements);
      history.currentLines = this.createSnapshot({ id: gameId } as Game);
    }
  }
  
  private detectMovementTrigger(
    change: number,
    percentageChange: number
  ): 'sharp' | 'public' | 'news' | 'limit' | undefined {
    // Simple heuristics - would be more sophisticated in production
    if (Math.abs(percentageChange) > 10) return 'sharp';
    if (Math.abs(percentageChange) > 5) return 'limit';
    if (Math.abs(percentageChange) > 2) return 'public';
    return undefined;
  }
  
  private categorizeSignificance(
    change: number,
    type: 'moneyline' | 'spread' | 'total'
  ): 'minor' | 'moderate' | 'major' | 'steam' {
    const thresholds = {
      moneyline: { minor: 10, moderate: 25, major: 50, steam: 100 },
      spread: { minor: 0.5, moderate: 1, major: 2, steam: 3 },
      total: { minor: 1, moderate: 2, major: 4, steam: 6 }
    };
    
    const t = thresholds[type];
    if (change >= t.steam) return 'steam';
    if (change >= t.major) return 'major';
    if (change >= t.moderate) return 'moderate';
    return 'minor';
  }
  
  private estimateSharpMoney(change: number, sport: string): number {
    // Rough estimation based on typical bet sizes
    const multipliers: Record<string, number> = {
      nfl: 50000,
      nba: 30000,
      mlb: 20000,
      nhl: 15000,
      ncaafb: 25000,
      ncaamb: 15000,
      soccer: 10000,
      mls: 5000
    };
    
    return Math.abs(change) * (multipliers[sport.toLowerCase()] || 10000);
  }
  
  private calculateMovementVelocity(movements: LineMovement[]): number {
    if (movements.length < 2) return 0;
    
    const recentMovements = movements.slice(-5); // Last 5 movements
    let totalChange = 0;
    let totalTime = 0;
    
    for (let i = 1; i < recentMovements.length; i++) {
      totalChange += recentMovements[i].change;
      // Would calculate actual time difference
      totalTime += 1; // Assume 1 hour between movements
    }
    
    return totalTime > 0 ? totalChange / totalTime : 0;
  }
  
  private oddsToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }
  
  /**
   * Get all steam moves for display
   */
  public getSteamMoves(sport?: string): SteamMove[] {
    if (sport) {
      return this.steamMoves.filter(s => s.sport.toLowerCase() === sport.toLowerCase());
    }
    return this.steamMoves;
  }
  
  /**
   * Get reverse line movements
   */
  public getReverseMovements(): ReverseLineMovement[] {
    return this.reverseMovements;
  }
  
  /**
   * Clear old data
   */
  public clearOldData(hoursToKeep: number = 24): void {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    
    // Clear old steam moves
    this.steamMoves = this.steamMoves.filter(
      s => new Date(s.timestamp) > cutoffTime
    );
    
    // Clear old reverse movements
    this.reverseMovements = this.reverseMovements.filter(
      r => new Date(r.timestamp) > cutoffTime
    );
    
    // Clear old line histories
    for (const [gameId, history] of this.lineHistory.entries()) {
      if (new Date(history.currentLines.timestamp) < cutoffTime) {
        this.lineHistory.delete(gameId);
      }
    }
  }
}

// Export singleton instance
export const lineMovementTracker = new LineMovementTracker();