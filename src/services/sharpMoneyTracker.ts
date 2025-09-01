/**
 * Sharp vs Public Money Tracking System
 * Identifies sharp betting patterns and tracks smart money movements
 */

export interface SharpMoneyData {
  gameId: string;
  sport: string;
  timestamp: Date;
  publicMoney: PublicMoneyFlow;
  sharpMoney: SharpMoneyFlow;
  lineMovement: LineMovementData;
  steamMoves: SteamMove[];
  reverseLineMovement: ReverseLineMovement | null;
  syndicateActivity: SyndicateIndicator[];
  confidenceLevel: 'high' | 'medium' | 'low';
  recommendation: BettingRecommendation;
}

interface PublicMoneyFlow {
  spreadPercentage: number;
  totalPercentage: number;
  moneylinePercentage: number;
  ticketCount: number;
  averageBetSize: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface SharpMoneyFlow {
  side: 'home' | 'away' | 'over' | 'under' | 'none';
  betType: 'spread' | 'total' | 'moneyline';
  percentage: number;
  timing: 'early' | 'middle' | 'late';
  confidence: number;
  indicators: SharpIndicator[];
}

interface SharpIndicator {
  type: 'line_move' | 'steam' | 'reverse' | 'limit_bet' | 'syndicate';
  description: string;
  strength: number; // 0-1
  timestamp: Date;
}

interface LineMovementData {
  spread: {
    opening: number;
    current: number;
    movements: Movement[];
    keyNumbersCrossed: number[];
  };
  total: {
    opening: number;
    current: number;
    movements: Movement[];
  };
  moneyline: {
    homeOpening: number;
    homeCurrent: number;
    awayOpening: number;
    awayCurrent: number;
    movements: Movement[];
  };
}

interface Movement {
  from: number;
  to: number;
  timestamp: Date;
  trigger: 'sharp' | 'public' | 'injury' | 'weather' | 'unknown';
  significance: 'major' | 'minor';
}

interface SteamMove {
  timestamp: Date;
  betType: 'spread' | 'total' | 'moneyline';
  direction: 'home' | 'away' | 'over' | 'under';
  magnitude: number;
  books: string[];
  confidence: number;
}

interface ReverseLineMovement {
  detected: boolean;
  betType: 'spread' | 'total' | 'moneyline';
  publicSide: string;
  publicPercentage: number;
  lineDirection: string;
  sharpSide: string;
  confidence: number;
}

interface SyndicateIndicator {
  groupId: string;
  confidence: number;
  previousHits: number;
  successRate: number;
  estimatedSize: 'small' | 'medium' | 'large';
}

interface BettingRecommendation {
  action: 'bet' | 'fade' | 'wait' | 'avoid';
  side: string;
  betType: 'spread' | 'total' | 'moneyline';
  confidence: number;
  edgePercentage: number;
  suggestedUnit: number; // 1-5 units
  reasoning: string[];
  warnings: string[];
}

export class SharpMoneyTracker {
  private readonly SHARP_THRESHOLD = 0.7;
  private readonly STEAM_THRESHOLD = 1.5;
  private readonly RLM_THRESHOLD = 0.6;
  private historicalSharps: Map<string, SharpMoneyData[]> = new Map();
  private knownSyndicates: Map<string, SyndicateProfile> = new Map();

  constructor() {
    this.initializeKnownSyndicates();
  }

  /**
   * Initialize known betting syndicate patterns
   */
  private initializeKnownSyndicates() {
    // Known syndicate patterns (mock data for demonstration)
    this.knownSyndicates.set('billy_walters_pattern', {
      id: 'billy_walters_pattern',
      name: 'Las Vegas Syndicate Pattern',
      indicators: ['early_line_move', 'multi_book_hit', 'round_number_bets'],
      successRate: 0.58,
      avgBetSize: 'large',
      preferredSports: ['NFL', 'NCAAF'],
      timePattern: 'early_week'
    });

    this.knownSyndicates.set('euro_soccer_group', {
      id: 'euro_soccer_group',
      name: 'European Soccer Syndicate',
      indicators: ['overnight_movement', 'pinnacle_lead', 'total_focus'],
      successRate: 0.56,
      avgBetSize: 'medium',
      preferredSports: ['Soccer'],
      timePattern: 'overnight'
    });
  }

  /**
   * Analyze sharp vs public money for a game
   */
  async analyzeSharpMoney(game: any, odds: any, consensus: any): Promise<SharpMoneyData> {
    console.log(`💰 Analyzing sharp money for game ${game.id}`);

    // Analyze public money flow
    const publicMoney = this.analyzePublicMoney(consensus);

    // Detect sharp money indicators
    const sharpMoney = this.detectSharpMoney(odds, consensus, publicMoney);

    // Track line movements
    const lineMovement = this.trackLineMovements(odds);

    // Detect steam moves
    const steamMoves = this.detectSteamMoves(odds, lineMovement);

    // Check for reverse line movement
    const reverseLineMovement = this.detectReverseLineMovement(
      publicMoney,
      lineMovement,
      consensus
    );

    // Detect syndicate activity
    const syndicateActivity = this.detectSyndicateActivity(
      lineMovement,
      steamMoves,
      game
    );

    // Calculate confidence level
    const confidenceLevel = this.calculateConfidence(
      sharpMoney,
      reverseLineMovement,
      syndicateActivity
    );

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      sharpMoney,
      publicMoney,
      reverseLineMovement,
      syndicateActivity,
      confidenceLevel,
      game
    );

    const sharpMoneyData: SharpMoneyData = {
      gameId: game.id,
      sport: game.sport,
      timestamp: new Date(),
      publicMoney,
      sharpMoney,
      lineMovement,
      steamMoves,
      reverseLineMovement,
      syndicateActivity,
      confidenceLevel,
      recommendation
    };

    // Store for historical tracking
    if (!this.historicalSharps.has(game.id)) {
      this.historicalSharps.set(game.id, []);
    }
    this.historicalSharps.get(game.id)!.push(sharpMoneyData);

    return sharpMoneyData;
  }

  /**
   * Analyze public money flow
   */
  private analyzePublicMoney(consensus: any): PublicMoneyFlow {
    const spreadPct = consensus?.spreadBets?.publicPercentage || 50;
    const totalPct = consensus?.totalBets?.publicPercentage || 50;
    const mlPct = consensus?.moneylineBets?.publicPercentage || 50;

    // Determine trend
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (consensus?.trend) {
      trend = consensus.trend > 0 ? 'increasing' : 
              consensus.trend < 0 ? 'decreasing' : 'stable';
    }

    return {
      spreadPercentage: spreadPct,
      totalPercentage: totalPct,
      moneylinePercentage: mlPct,
      ticketCount: consensus?.totalTickets || 0,
      averageBetSize: consensus?.avgBetSize || 100,
      trend
    };
  }

  /**
   * Detect sharp money indicators
   */
  private detectSharpMoney(
    odds: any,
    consensus: any,
    publicMoney: PublicMoneyFlow
  ): SharpMoneyFlow {
    const indicators: SharpIndicator[] = [];
    let sharpSide: 'home' | 'away' | 'over' | 'under' | 'none' = 'none';
    let betType: 'spread' | 'total' | 'moneyline' = 'spread';
    let confidence = 0;

    // Check for limit bets
    if (consensus?.limitBets) {
      const limitSide = this.analyzeLimitBets(consensus.limitBets);
      if (limitSide.confidence > 0.7) {
        indicators.push({
          type: 'limit_bet',
          description: `Heavy limit betting on ${limitSide.side}`,
          strength: limitSide.confidence,
          timestamp: new Date()
        });
        sharpSide = limitSide.side as any;
        confidence += 0.3;
      }
    }

    // Check for professional percentage
    const proPct = consensus?.professionalPercentage;
    if (proPct && Math.abs(proPct - 50) > 20) {
      const proSide = proPct > 50 ? 'home' : 'away';
      indicators.push({
        type: 'syndicate',
        description: `${proPct}% professional money on ${proSide}`,
        strength: Math.abs(proPct - 50) / 50,
        timestamp: new Date()
      });
      if (sharpSide === 'none') sharpSide = proSide as any;
      confidence += 0.25;
    }

    // Check money vs ticket discrepancy
    const moneyVsTickets = this.analyzeMoneyVsTickets(consensus);
    if (moneyVsTickets.discrepancy > 15) {
      indicators.push({
        type: 'reverse',
        description: `Money/ticket discrepancy: ${moneyVsTickets.discrepancy}%`,
        strength: moneyVsTickets.discrepancy / 30,
        timestamp: new Date()
      });
      if (sharpSide === 'none') sharpSide = moneyVsTickets.side as any;
      confidence += 0.2;
    }

    // Determine timing
    const timing = this.determineSharpTiming(odds);

    return {
      side: sharpSide,
      betType,
      percentage: consensus?.sharpPercentage || 0,
      timing,
      confidence: Math.min(1, confidence),
      indicators
    };
  }

  /**
   * Track line movements
   */
  private trackLineMovements(odds: any): LineMovementData {
    const movements: LineMovementData = {
      spread: {
        opening: odds?.opening?.spread || 0,
        current: odds?.current?.spread || 0,
        movements: [],
        keyNumbersCrossed: []
      },
      total: {
        opening: odds?.opening?.total || 0,
        current: odds?.current?.total || 0,
        movements: []
      },
      moneyline: {
        homeOpening: odds?.opening?.homeML || -110,
        homeCurrent: odds?.current?.homeML || -110,
        awayOpening: odds?.opening?.awayML || -110,
        awayCurrent: odds?.current?.awayML || -110,
        movements: []
      }
    };

    // Track spread movements
    if (odds?.spreadHistory) {
      for (let i = 0; i < odds.spreadHistory.length - 1; i++) {
        const move: Movement = {
          from: odds.spreadHistory[i].line,
          to: odds.spreadHistory[i + 1].line,
          timestamp: new Date(odds.spreadHistory[i + 1].timestamp),
          trigger: this.identifyMovementTrigger(odds.spreadHistory[i], odds.spreadHistory[i + 1]),
          significance: Math.abs(odds.spreadHistory[i + 1].line - odds.spreadHistory[i].line) >= 1 ? 'major' : 'minor'
        };
        movements.spread.movements.push(move);
      }
    }

    // Identify key numbers crossed
    movements.spread.keyNumbersCrossed = this.identifyKeyNumbersCrossed(
      movements.spread.opening,
      movements.spread.current
    );

    // Track total movements
    if (odds?.totalHistory) {
      for (let i = 0; i < odds.totalHistory.length - 1; i++) {
        const move: Movement = {
          from: odds.totalHistory[i].line,
          to: odds.totalHistory[i + 1].line,
          timestamp: new Date(odds.totalHistory[i + 1].timestamp),
          trigger: this.identifyMovementTrigger(odds.totalHistory[i], odds.totalHistory[i + 1]),
          significance: Math.abs(odds.totalHistory[i + 1].line - odds.totalHistory[i].line) >= 2 ? 'major' : 'minor'
        };
        movements.total.movements.push(move);
      }
    }

    return movements;
  }

  /**
   * Detect steam moves
   */
  private detectSteamMoves(odds: any, lineMovement: LineMovementData): SteamMove[] {
    const steamMoves: SteamMove[] = [];

    // Check spread steam
    for (const movement of lineMovement.spread.movements) {
      if (Math.abs(movement.to - movement.from) >= this.STEAM_THRESHOLD) {
        steamMoves.push({
          timestamp: movement.timestamp,
          betType: 'spread',
          direction: movement.to > movement.from ? 'away' : 'home',
          magnitude: Math.abs(movement.to - movement.from),
          books: this.getAffectedBooks(movement.timestamp),
          confidence: this.calculateSteamConfidence(movement)
        });
      }
    }

    // Check total steam
    for (const movement of lineMovement.total.movements) {
      if (Math.abs(movement.to - movement.from) >= this.STEAM_THRESHOLD * 2) {
        steamMoves.push({
          timestamp: movement.timestamp,
          betType: 'total',
          direction: movement.to > movement.from ? 'over' : 'under',
          magnitude: Math.abs(movement.to - movement.from),
          books: this.getAffectedBooks(movement.timestamp),
          confidence: this.calculateSteamConfidence(movement)
        });
      }
    }

    return steamMoves;
  }

  /**
   * Detect reverse line movement
   */
  private detectReverseLineMovement(
    publicMoney: PublicMoneyFlow,
    lineMovement: LineMovementData,
    consensus: any
  ): ReverseLineMovement | null {
    // Check spread RLM
    const spreadMove = lineMovement.spread.current - lineMovement.spread.opening;
    const publicOnHome = publicMoney.spreadPercentage > 50;
    
    if (publicOnHome && spreadMove > 0.5) {
      // Public on home but line moving toward away
      return {
        detected: true,
        betType: 'spread',
        publicSide: 'home',
        publicPercentage: publicMoney.spreadPercentage,
        lineDirection: 'away',
        sharpSide: 'away',
        confidence: this.calculateRLMConfidence(publicMoney.spreadPercentage, spreadMove)
      };
    } else if (!publicOnHome && spreadMove < -0.5) {
      // Public on away but line moving toward home
      return {
        detected: true,
        betType: 'spread',
        publicSide: 'away',
        publicPercentage: 100 - publicMoney.spreadPercentage,
        lineDirection: 'home',
        sharpSide: 'home',
        confidence: this.calculateRLMConfidence(100 - publicMoney.spreadPercentage, Math.abs(spreadMove))
      };
    }

    // Check total RLM
    const totalMove = lineMovement.total.current - lineMovement.total.opening;
    const publicOnOver = publicMoney.totalPercentage > 50;
    
    if (publicOnOver && totalMove < -1) {
      return {
        detected: true,
        betType: 'total',
        publicSide: 'over',
        publicPercentage: publicMoney.totalPercentage,
        lineDirection: 'under',
        sharpSide: 'under',
        confidence: this.calculateRLMConfidence(publicMoney.totalPercentage, Math.abs(totalMove))
      };
    } else if (!publicOnOver && totalMove > 1) {
      return {
        detected: true,
        betType: 'total',
        publicSide: 'under',
        publicPercentage: 100 - publicMoney.totalPercentage,
        lineDirection: 'over',
        sharpSide: 'over',
        confidence: this.calculateRLMConfidence(100 - publicMoney.totalPercentage, totalMove)
      };
    }

    return null;
  }

  /**
   * Detect syndicate betting activity
   */
  private detectSyndicateActivity(
    lineMovement: LineMovementData,
    steamMoves: SteamMove[],
    game: any
  ): SyndicateIndicator[] {
    const indicators: SyndicateIndicator[] = [];

    for (const [syndicateId, profile] of this.knownSyndicates) {
      let matchScore = 0;
      let matchCount = 0;

      // Check for pattern matches
      if (profile.preferredSports.includes(game.sport)) {
        matchScore += 0.2;
        matchCount++;
      }

      // Check for timing patterns
      if (this.matchesTimePattern(profile.timePattern, new Date())) {
        matchScore += 0.3;
        matchCount++;
      }

      // Check for betting patterns
      if (steamMoves.length > 0 && profile.indicators.includes('multi_book_hit')) {
        matchScore += 0.3;
        matchCount++;
      }

      // Check for line movement patterns
      if (this.matchesMovementPattern(lineMovement, profile)) {
        matchScore += 0.2;
        matchCount++;
      }

      if (matchScore > 0.5) {
        indicators.push({
          groupId: syndicateId,
          confidence: matchScore,
          previousHits: this.getSyndicateHitCount(syndicateId),
          successRate: profile.successRate,
          estimatedSize: profile.avgBetSize
        });
      }
    }

    return indicators;
  }

  /**
   * Calculate overall confidence level
   */
  private calculateConfidence(
    sharpMoney: SharpMoneyFlow,
    rlm: ReverseLineMovement | null,
    syndicates: SyndicateIndicator[]
  ): 'high' | 'medium' | 'low' {
    let totalConfidence = 0;
    let factors = 0;

    if (sharpMoney.confidence > 0) {
      totalConfidence += sharpMoney.confidence;
      factors++;
    }

    if (rlm && rlm.confidence > 0) {
      totalConfidence += rlm.confidence;
      factors++;
    }

    if (syndicates.length > 0) {
      const maxSyndicateConf = Math.max(...syndicates.map(s => s.confidence));
      totalConfidence += maxSyndicateConf;
      factors++;
    }

    const avgConfidence = factors > 0 ? totalConfidence / factors : 0;

    if (avgConfidence > 0.7) return 'high';
    if (avgConfidence > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Generate betting recommendation
   */
  private generateRecommendation(
    sharpMoney: SharpMoneyFlow,
    publicMoney: PublicMoneyFlow,
    rlm: ReverseLineMovement | null,
    syndicates: SyndicateIndicator[],
    confidence: 'high' | 'medium' | 'low',
    game: any
  ): BettingRecommendation {
    const reasoning: string[] = [];
    const warnings: string[] = [];
    let action: 'bet' | 'fade' | 'wait' | 'avoid' = 'wait';
    let side = '';
    let betType: 'spread' | 'total' | 'moneyline' = 'spread';
    let edgePercentage = 0;
    let suggestedUnit = 1;

    // Strong sharp indicators
    if (sharpMoney.side !== 'none' && sharpMoney.confidence > 0.7) {
      action = 'bet';
      side = sharpMoney.side;
      betType = sharpMoney.betType;
      edgePercentage = sharpMoney.confidence * 10;
      reasoning.push(`Sharp money detected on ${side}`);
      
      for (const indicator of sharpMoney.indicators) {
        reasoning.push(indicator.description);
      }
    }

    // Reverse line movement
    if (rlm && rlm.confidence > 0.6) {
      action = 'bet';
      side = rlm.sharpSide;
      betType = rlm.betType;
      edgePercentage = Math.max(edgePercentage, rlm.confidence * 12);
      reasoning.push(`Reverse line movement: ${rlm.publicPercentage}% public on ${rlm.publicSide} but line moving toward ${rlm.lineDirection}`);
    }

    // Syndicate activity
    if (syndicates.length > 0) {
      const bestSyndicate = syndicates.sort((a, b) => b.confidence - a.confidence)[0];
      if (bestSyndicate.confidence > 0.6) {
        if (action === 'wait') {
          action = 'bet';
          side = sharpMoney.side !== 'none' ? sharpMoney.side : 'follow_syndicate';
        }
        reasoning.push(`Syndicate pattern detected (${(bestSyndicate.successRate * 100).toFixed(1)}% historical success)`);
        edgePercentage = Math.max(edgePercentage, bestSyndicate.successRate * 20);
      }
    }

    // Calculate suggested unit size
    if (confidence === 'high' && edgePercentage > 10) {
      suggestedUnit = Math.min(5, Math.floor(edgePercentage / 3));
    } else if (confidence === 'medium' && edgePercentage > 5) {
      suggestedUnit = Math.min(3, Math.floor(edgePercentage / 4));
    } else {
      suggestedUnit = 1;
    }

    // Add warnings
    if (publicMoney.spreadPercentage > 75 && side === 'home') {
      warnings.push('Heavy public backing on same side');
    }
    if (publicMoney.trend === 'increasing' && action === 'fade') {
      warnings.push('Public money still coming in');
    }
    if (confidence === 'low') {
      warnings.push('Low confidence in sharp indicators');
    }

    // Default to avoid if no clear edge
    if (action === 'wait' && edgePercentage < 3) {
      action = 'avoid';
      reasoning.push('No clear sharp money indicators');
    }

    return {
      action,
      side,
      betType,
      confidence: confidence === 'high' ? 0.8 : confidence === 'medium' ? 0.6 : 0.4,
      edgePercentage,
      suggestedUnit,
      reasoning,
      warnings
    };
  }

  // Helper methods

  private analyzeLimitBets(limitBets: any): { side: string; confidence: number } {
    // Analyze where limit bets are placed
    if (!limitBets) return { side: 'none', confidence: 0 };
    
    const homeLimits = limitBets.home || 0;
    const awayLimits = limitBets.away || 0;
    const total = homeLimits + awayLimits;
    
    if (total === 0) return { side: 'none', confidence: 0 };
    
    const homePercentage = homeLimits / total;
    const side = homePercentage > 0.6 ? 'home' : homePercentage < 0.4 ? 'away' : 'none';
    const confidence = Math.abs(homePercentage - 0.5) * 2;
    
    return { side, confidence };
  }

  private analyzeMoneyVsTickets(consensus: any): { side: string; discrepancy: number } {
    if (!consensus) return { side: 'none', discrepancy: 0 };
    
    const ticketPct = consensus.spreadBets?.publicPercentage || 50;
    const moneyPct = consensus.spreadMoney?.percentage || 50;
    const discrepancy = Math.abs(moneyPct - ticketPct);
    
    const side = moneyPct > ticketPct ? 
      (ticketPct > 50 ? 'away' : 'home') : 
      (ticketPct > 50 ? 'home' : 'away');
    
    return { side, discrepancy };
  }

  private determineSharpTiming(odds: any): 'early' | 'middle' | 'late' {
    const now = new Date();
    const gameTime = new Date(odds.gameTime);
    const hoursUntilGame = (gameTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilGame > 48) return 'early';
    if (hoursUntilGame > 6) return 'middle';
    return 'late';
  }

  private identifyMovementTrigger(before: any, after: any): Movement['trigger'] {
    // Logic to identify what triggered the line movement
    const timeDiff = new Date(after.timestamp).getTime() - new Date(before.timestamp).getTime();
    const moveSize = Math.abs(after.line - before.line);
    
    if (timeDiff < 60000 && moveSize > 1) return 'sharp'; // Quick large move
    if (after.publicPercentage > 70) return 'public';
    if (after.injury) return 'injury';
    if (after.weather) return 'weather';
    return 'unknown';
  }

  private identifyKeyNumbersCrossed(opening: number, current: number): number[] {
    const keyNumbers = [3, 7, 10, 14]; // Football key numbers
    const crossed: number[] = [];
    
    for (const key of keyNumbers) {
      if ((opening < key && current >= key) || 
          (opening > key && current <= key) ||
          (opening < -key && current >= -key) ||
          (opening > -key && current <= -key)) {
        crossed.push(key);
      }
    }
    
    return crossed;
  }

  private getAffectedBooks(timestamp: Date): string[] {
    // Mock implementation - would track which books moved
    return ['Pinnacle', 'Bookmaker', 'Circa', 'DraftKings', 'FanDuel'];
  }

  private calculateSteamConfidence(movement: Movement): number {
    const magnitude = Math.abs(movement.to - movement.from);
    const significance = movement.significance === 'major' ? 0.3 : 0.1;
    const trigger = movement.trigger === 'sharp' ? 0.4 : 0.2;
    
    return Math.min(1, magnitude / 10 + significance + trigger);
  }

  private calculateRLMConfidence(publicPercentage: number, lineMovement: number): number {
    const publicExtreme = Math.abs(publicPercentage - 50) / 50;
    const moveSize = Math.min(1, lineMovement / 3);
    
    return (publicExtreme + moveSize) / 2;
  }

  private matchesTimePattern(pattern: string, time: Date): boolean {
    const hour = time.getHours();
    const day = time.getDay();
    
    switch (pattern) {
      case 'early_week':
        return day >= 1 && day <= 3 && hour < 18;
      case 'overnight':
        return hour < 6 || hour > 22;
      case 'sunday_morning':
        return day === 0 && hour >= 8 && hour < 13;
      default:
        return false;
    }
  }

  private matchesMovementPattern(lineMovement: LineMovementData, profile: SyndicateProfile): boolean {
    // Check if line movement matches known syndicate patterns
    const totalMoves = lineMovement.spread.movements.length + lineMovement.total.movements.length;
    const majorMoves = [...lineMovement.spread.movements, ...lineMovement.total.movements]
      .filter(m => m.significance === 'major').length;
    
    return majorMoves > 0 && (majorMoves / totalMoves) > 0.3;
  }

  private getSyndicateHitCount(syndicateId: string): number {
    // Track historical hits for this syndicate
    return Math.floor(Math.random() * 50) + 10; // Mock implementation
  }

  /**
   * Get sharp betting summary for display
   */
  getSharpSummary(gameId: string): any {
    const history = this.historicalSharps.get(gameId);
    if (!history || history.length === 0) return null;

    const latest = history[history.length - 1];
    
    return {
      sharpSide: latest.sharpMoney.side,
      confidence: latest.confidenceLevel,
      publicFade: latest.reverseLineMovement?.detected || false,
      steamDetected: latest.steamMoves.length > 0,
      syndicateActivity: latest.syndicateActivity.length > 0,
      recommendation: latest.recommendation.action,
      suggestedBet: `${latest.recommendation.side} ${latest.recommendation.betType}`,
      units: latest.recommendation.suggestedUnit,
      edge: `${latest.recommendation.edgePercentage.toFixed(1)}%`
    };
  }

  /**
   * Track sharp bet result for model improvement
   */
  trackResult(gameId: string, result: 'win' | 'loss' | 'push') {
    const history = this.historicalSharps.get(gameId);
    if (!history || history.length === 0) return;

    const sharpPick = history[history.length - 1];
    
    // Update syndicate tracking if applicable
    for (const syndicate of sharpPick.syndicateActivity) {
      const profile = this.knownSyndicates.get(syndicate.groupId);
      if (profile) {
        // Update success rate (simplified)
        if (result === 'win') {
          profile.successRate = (profile.successRate * 0.95) + (1 * 0.05);
        } else if (result === 'loss') {
          profile.successRate = (profile.successRate * 0.95) + (0 * 0.05);
        }
      }
    }
  }
}

interface SyndicateProfile {
  id: string;
  name: string;
  indicators: string[];
  successRate: number;
  avgBetSize: 'small' | 'medium' | 'large';
  preferredSports: string[];
  timePattern: string;
}

// Export singleton instance
export const sharpMoneyTracker = new SharpMoneyTracker();