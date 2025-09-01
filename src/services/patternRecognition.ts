/**
 * Historical Pattern Recognition System
 * Identifies and tracks betting patterns, trends, and profitable systems
 */

export interface Pattern {
  id: string;
  name: string;
  type: PatternType;
  description: string;
  conditions: PatternCondition[];
  historicalPerformance: HistoricalPerformance;
  currentMatches: PatternMatch[];
  confidence: number;
  profitability: number;
  lastUpdated: Date;
}

type PatternType = 
  | 'situational'
  | 'technical'
  | 'fundamental'
  | 'seasonal'
  | 'psychological'
  | 'referee'
  | 'weather'
  | 'schedule';

interface PatternCondition {
  field: string;
  operator: 'equals' | 'greater' | 'less' | 'between' | 'contains';
  value: any;
  weight: number;
}

interface HistoricalPerformance {
  totalGames: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  avgOdds: number;
  profitUnits: number;
  last30Days: {
    games: number;
    winRate: number;
    roi: number;
  };
  byYear: YearlyPerformance[];
  trend: 'improving' | 'declining' | 'stable';
}

interface YearlyPerformance {
  year: number;
  games: number;
  winRate: number;
  roi: number;
}

interface PatternMatch {
  gameId: string;
  matchScore: number; // 0-100
  conditions Met: string[];
  recommendation: string;
  confidence: number;
}

export class PatternRecognitionSystem {
  private patterns: Map<string, Pattern> = new Map();
  private historicalData: Map<string, any> = new Map();
  private readonly MIN_SAMPLE_SIZE = 50;
  private readonly MIN_WIN_RATE = 0.53;
  private readonly MIN_ROI = 5;

  constructor() {
    this.initializePatterns();
  }

  /**
   * Initialize known profitable patterns
   */
  private initializePatterns() {
    // Home Underdog Pattern
    this.addPattern({
      id: 'home_dog_primetime',
      name: 'Prime Time Home Underdog',
      type: 'situational',
      description: 'Home underdogs in prime time games tend to overperform',
      conditions: [
        { field: 'isHomeTeam', operator: 'equals', value: true, weight: 1 },
        { field: 'spread', operator: 'greater', value: 2.5, weight: 1 },
        { field: 'gameTime', operator: 'greater', value: '20:00', weight: 0.8 },
        { field: 'nationalTV', operator: 'equals', value: true, weight: 0.5 }
      ],
      historicalPerformance: this.createMockPerformance(245, 0.565, 12.3),
      currentMatches: [],
      confidence: 0.78,
      profitability: 12.3,
      lastUpdated: new Date()
    });

    // Fade the Public Pattern
    this.addPattern({
      id: 'fade_public_heavy',
      name: 'Fade Heavy Public Action',
      type: 'psychological',
      description: 'Bet against teams with >75% public backing',
      conditions: [
        { field: 'publicBetting', operator: 'greater', value: 75, weight: 1 },
        { field: 'lineMovement', operator: 'equals', value: 'against_public', weight: 0.9 },
        { field: 'sharpMoney', operator: 'equals', value: 'opposite', weight: 0.8 }
      ],
      historicalPerformance: this.createMockPerformance(892, 0.547, 8.7),
      currentMatches: [],
      confidence: 0.72,
      profitability: 8.7,
      lastUpdated: new Date()
    });

    // Division Rivalry Unders
    this.addPattern({
      id: 'division_rivalry_under',
      name: 'Division Rivalry Unders',
      type: 'situational',
      description: 'Division games tend to go under the total',
      conditions: [
        { field: 'isDivisionGame', operator: 'equals', value: true, weight: 1 },
        { field: 'totalLine', operator: 'greater', value: 45, weight: 0.7 },
        { field: 'defensiveRating', operator: 'greater', value: 'average', weight: 0.5 }
      ],
      historicalPerformance: this.createMockPerformance(567, 0.541, 7.2),
      currentMatches: [],
      confidence: 0.68,
      profitability: 7.2,
      lastUpdated: new Date()
    });

    // Back-to-Back Fatigue
    this.addPattern({
      id: 'b2b_fatigue_fade',
      name: 'Back-to-Back Fatigue Fade',
      type: 'schedule',
      description: 'Fade teams on second night of back-to-back',
      conditions: [
        { field: 'isBackToBack', operator: 'equals', value: true, weight: 1 },
        { field: 'travelDistance', operator: 'greater', value: 500, weight: 0.7 },
        { field: 'restDaysOpponent', operator: 'greater', value: 1, weight: 0.6 }
      ],
      historicalPerformance: this.createMockPerformance(423, 0.558, 10.1),
      currentMatches: [],
      confidence: 0.71,
      profitability: 10.1,
      lastUpdated: new Date()
    });

    // Weather Impact Pattern
    this.addPattern({
      id: 'wind_under_pattern',
      name: 'High Wind Unders',
      type: 'weather',
      description: 'Games with 15+ mph winds tend to go under',
      conditions: [
        { field: 'windSpeed', operator: 'greater', value: 15, weight: 1 },
        { field: 'isOutdoor', operator: 'equals', value: true, weight: 1 },
        { field: 'sport', operator: 'equals', value: 'NFL', weight: 0.8 }
      ],
      historicalPerformance: this.createMockPerformance(189, 0.571, 13.8),
      currentMatches: [],
      confidence: 0.75,
      profitability: 13.8,
      lastUpdated: new Date()
    });

    // Referee Tendency Pattern
    this.addPattern({
      id: 'referee_over_tendency',
      name: 'High-Scoring Referee',
      type: 'referee',
      description: 'Certain referees consistently see higher scoring games',
      conditions: [
        { field: 'refereeOverRate', operator: 'greater', value: 0.58, weight: 1 },
        { field: 'totalLine', operator: 'less', value: 'average', weight: 0.5 }
      ],
      historicalPerformance: this.createMockPerformance(312, 0.551, 9.3),
      currentMatches: [],
      confidence: 0.69,
      profitability: 9.3,
      lastUpdated: new Date()
    });

    // Revenge Game Pattern
    this.addPattern({
      id: 'revenge_game_motivation',
      name: 'Revenge Game Motivation',
      type: 'psychological',
      description: 'Teams perform better in revenge games after recent loss',
      conditions: [
        { field: 'isRevengeGame', operator: 'equals', value: true, weight: 1 },
        { field: 'lastMeetingMargin', operator: 'greater', value: 10, weight: 0.7 },
        { field: 'dayssSinceLastMeeting', operator: 'less', value: 60, weight: 0.5 }
      ],
      historicalPerformance: this.createMockPerformance(234, 0.556, 10.8),
      currentMatches: [],
      confidence: 0.70,
      profitability: 10.8,
      lastUpdated: new Date()
    });

    // Line Movement Pattern
    this.addPattern({
      id: 'reverse_line_movement',
      name: 'Reverse Line Movement',
      type: 'technical',
      description: 'Line moves against public betting percentage',
      conditions: [
        { field: 'lineMovement', operator: 'greater', value: 1.5, weight: 1 },
        { field: 'publicBetting', operator: 'less', value: 40, weight: 0.9 },
        { field: 'sharpAction', operator: 'equals', value: true, weight: 0.8 }
      ],
      historicalPerformance: this.createMockPerformance(678, 0.563, 11.7),
      currentMatches: [],
      confidence: 0.76,
      profitability: 11.7,
      lastUpdated: new Date()
    });
  }

  /**
   * Scan current games for pattern matches
   */
  async scanForPatterns(games: any[]): Promise<PatternMatch[]> {
    console.log(`🔍 Scanning ${games.length} games for pattern matches`);
    
    const allMatches: PatternMatch[] = [];

    for (const game of games) {
      const gameData = await this.enrichGameData(game);
      
      for (const [patternId, pattern] of this.patterns) {
        const matchScore = this.calculateMatchScore(gameData, pattern);
        
        if (matchScore > 70) { // 70% threshold for pattern match
          const match: PatternMatch = {
            gameId: game.id,
            matchScore,
            conditionsMet: this.getMetConditions(gameData, pattern),
            recommendation: this.generateRecommendation(pattern, gameData),
            confidence: (matchScore / 100) * pattern.confidence
          };
          
          allMatches.push(match);
          pattern.currentMatches.push(match);
        }
      }
    }

    // Sort by confidence
    return allMatches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Identify emerging patterns from historical data
   */
  async identifyEmergingPatterns(historicalGames: any[]): Promise<Pattern[]> {
    console.log(`🔬 Analyzing ${historicalGames.length} historical games for new patterns`);
    
    const emergingPatterns: Pattern[] = [];
    
    // Analyze different aspects
    const situationalPatterns = this.analyzeSituationalPatterns(historicalGames);
    const technicalPatterns = this.analyzeTechnicalPatterns(historicalGames);
    const schedulePatterns = this.analyzeSchedulePatterns(historicalGames);
    
    emergingPatterns.push(...situationalPatterns);
    emergingPatterns.push(...technicalPatterns);
    emergingPatterns.push(...schedulePatterns);
    
    // Filter for profitable patterns
    return emergingPatterns.filter(p => 
      p.historicalPerformance.totalGames >= this.MIN_SAMPLE_SIZE &&
      p.historicalPerformance.winRate >= this.MIN_WIN_RATE &&
      p.historicalPerformance.roi >= this.MIN_ROI
    );
  }

  /**
   * Analyze situational patterns
   */
  private analyzeSituationalPatterns(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Look for home/away performance patterns
    const homePerformance = this.analyzeHomeAwayTrends(games);
    if (homePerformance.profitable) {
      patterns.push(this.createPatternFromAnalysis('home_away', homePerformance));
    }
    
    // Look for favorite/underdog patterns
    const dogPatterns = this.analyzeUnderdogTrends(games);
    if (dogPatterns.profitable) {
      patterns.push(this.createPatternFromAnalysis('underdog', dogPatterns));
    }
    
    // Look for specific situation patterns
    const situations = [
      { condition: 'playoff_implications', field: 'playoffImplications' },
      { condition: 'elimination_game', field: 'isEliminationGame' },
      { condition: 'season_opener', field: 'isSeasonOpener' },
      { condition: 'rivalry_game', field: 'isRivalryGame' }
    ];
    
    for (const situation of situations) {
      const analysis = this.analyzeSituation(games, situation);
      if (analysis.profitable) {
        patterns.push(this.createPatternFromAnalysis(situation.condition, analysis));
      }
    }
    
    return patterns;
  }

  /**
   * Analyze technical patterns (betting lines, movements)
   */
  private analyzeTechnicalPatterns(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Line movement patterns
    const linePatterns = this.analyzeLineMovements(games);
    patterns.push(...linePatterns);
    
    // Key number patterns
    const keyNumbers = [3, 7, 10, 14]; // Football key numbers
    for (const key of keyNumbers) {
      const keyPattern = this.analyzeKeyNumber(games, key);
      if (keyPattern) patterns.push(keyPattern);
    }
    
    // Closing line value patterns
    const clvPattern = this.analyzeClosingLineValue(games);
    if (clvPattern) patterns.push(clvPattern);
    
    return patterns.filter(p => p !== null);
  }

  /**
   * Analyze schedule-based patterns
   */
  private analyzeSchedulePatterns(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Rest advantage patterns
    const restPatterns = this.analyzeRestAdvantage(games);
    patterns.push(...restPatterns);
    
    // Travel patterns
    const travelPatterns = this.analyzeTravelImpact(games);
    patterns.push(...travelPatterns);
    
    // Time zone patterns
    const timeZonePatterns = this.analyzeTimeZoneImpact(games);
    patterns.push(...timeZonePatterns);
    
    // Day of week patterns
    const dayPatterns = this.analyzeDayOfWeekTrends(games);
    patterns.push(...dayPatterns);
    
    return patterns.filter(p => p !== null);
  }

  /**
   * Calculate how well a game matches a pattern
   */
  private calculateMatchScore(gameData: any, pattern: Pattern): number {
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const condition of pattern.conditions) {
      const met = this.evaluateCondition(gameData, condition);
      if (met) {
        totalScore += condition.weight;
      }
      totalWeight += condition.weight;
    }
    
    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * Evaluate if a condition is met
   */
  private evaluateCondition(data: any, condition: PatternCondition): boolean {
    const value = this.getNestedValue(data, condition.field);
    
    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'greater':
        return value > condition.value;
      case 'less':
        return value < condition.value;
      case 'between':
        return value >= condition.value[0] && value <= condition.value[1];
      case 'contains':
        return String(value).includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Get list of conditions met for a pattern
   */
  private getMetConditions(gameData: any, pattern: Pattern): string[] {
    const met: string[] = [];
    
    for (const condition of pattern.conditions) {
      if (this.evaluateCondition(gameData, condition)) {
        met.push(`${condition.field} ${condition.operator} ${condition.value}`);
      }
    }
    
    return met;
  }

  /**
   * Generate betting recommendation based on pattern
   */
  private generateRecommendation(pattern: Pattern, gameData: any): string {
    let recommendation = `Pattern: ${pattern.name}\n`;
    recommendation += `Historical Win Rate: ${(pattern.historicalPerformance.winRate * 100).toFixed(1)}%\n`;
    recommendation += `ROI: ${pattern.historicalPerformance.roi.toFixed(1)}%\n`;
    
    // Specific recommendation based on pattern type
    if (pattern.type === 'situational' && pattern.id.includes('underdog')) {
      recommendation += `Bet: ${gameData.underdog} +${gameData.spread}`;
    } else if (pattern.type === 'weather' && pattern.id.includes('under')) {
      recommendation += `Bet: Under ${gameData.total}`;
    } else if (pattern.type === 'psychological' && pattern.id.includes('fade')) {
      const fade = gameData.publicBetting > 50 ? gameData.awayTeam : gameData.homeTeam;
      recommendation += `Bet: ${fade} ${gameData.spread}`;
    } else {
      recommendation += `Review pattern conditions for specific bet`;
    }
    
    return recommendation;
  }

  /**
   * Enrich game data with additional analytics
   */
  private async enrichGameData(game: any): Promise<any> {
    // Add calculated fields
    return {
      ...game,
      isHomeTeam: true, // Placeholder
      isDivisionGame: this.checkDivisionGame(game),
      isBackToBack: this.checkBackToBack(game),
      isRevengeGame: this.checkRevengeGame(game),
      publicBetting: this.getPublicBetting(game),
      lineMovement: this.getLineMovement(game),
      sharpAction: this.detectSharpAction(game),
      refereeOverRate: this.getRefereeOverRate(game),
      windSpeed: game.weather?.windSpeed || 0,
      isOutdoor: this.checkOutdoor(game),
      playoffImplications: this.checkPlayoffImplications(game),
      restDays: this.calculateRestDays(game),
      travelDistance: this.calculateTravelDistance(game)
    };
  }

  // Analysis helper methods

  private analyzeHomeAwayTrends(games: any[]): any {
    const homeGames = games.filter(g => g.isHome);
    const homeWinRate = homeGames.filter(g => g.covered).length / homeGames.length;
    
    return {
      profitable: homeWinRate > this.MIN_WIN_RATE,
      winRate: homeWinRate,
      sampleSize: homeGames.length,
      conditions: [
        { field: 'isHome', operator: 'equals', value: true, weight: 1 }
      ]
    };
  }

  private analyzeUnderdogTrends(games: any[]): any {
    const underdogs = games.filter(g => g.spread > 0);
    const dogWinRate = underdogs.filter(g => g.covered).length / underdogs.length;
    
    return {
      profitable: dogWinRate > this.MIN_WIN_RATE,
      winRate: dogWinRate,
      sampleSize: underdogs.length,
      conditions: [
        { field: 'spread', operator: 'greater', value: 0, weight: 1 }
      ]
    };
  }

  private analyzeSituation(games: any[], situation: any): any {
    const situationGames = games.filter(g => g[situation.field]);
    if (situationGames.length < this.MIN_SAMPLE_SIZE) {
      return { profitable: false };
    }
    
    const winRate = situationGames.filter(g => g.covered).length / situationGames.length;
    
    return {
      profitable: winRate > this.MIN_WIN_RATE,
      winRate,
      sampleSize: situationGames.length,
      conditions: [
        { field: situation.field, operator: 'equals', value: true, weight: 1 }
      ]
    };
  }

  private analyzeLineMovements(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    // Analyze different line movement scenarios
    const scenarios = [
      { movement: 'steam', threshold: 2 },
      { movement: 'reverse', threshold: -1.5 },
      { movement: 'late', threshold: 1 }
    ];
    
    for (const scenario of scenarios) {
      const filtered = games.filter(g => 
        Math.abs(g.lineMovement) > Math.abs(scenario.threshold)
      );
      
      if (filtered.length >= this.MIN_SAMPLE_SIZE) {
        const winRate = filtered.filter(g => g.covered).length / filtered.length;
        
        if (winRate > this.MIN_WIN_RATE) {
          patterns.push(this.createLineMovementPattern(scenario, winRate, filtered.length));
        }
      }
    }
    
    return patterns;
  }

  private analyzeKeyNumber(games: any[], keyNumber: number): Pattern | null {
    const nearKey = games.filter(g => 
      Math.abs(g.spread - keyNumber) < 0.5 || 
      Math.abs(g.spread + keyNumber) < 0.5
    );
    
    if (nearKey.length < this.MIN_SAMPLE_SIZE) return null;
    
    const winRate = nearKey.filter(g => g.covered).length / nearKey.length;
    
    if (winRate > this.MIN_WIN_RATE) {
      return this.createKeyNumberPattern(keyNumber, winRate, nearKey.length);
    }
    
    return null;
  }

  private analyzeClosingLineValue(games: any[]): Pattern | null {
    const clvGames = games.filter(g => g.closingLineValue > 0);
    
    if (clvGames.length < this.MIN_SAMPLE_SIZE) return null;
    
    const winRate = clvGames.filter(g => g.covered).length / clvGames.length;
    
    if (winRate > this.MIN_WIN_RATE) {
      return this.createCLVPattern(winRate, clvGames.length);
    }
    
    return null;
  }

  private analyzeRestAdvantage(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    const restAdvantage = games.filter(g => g.restDays > g.opponentRestDays + 1);
    
    if (restAdvantage.length >= this.MIN_SAMPLE_SIZE) {
      const winRate = restAdvantage.filter(g => g.covered).length / restAdvantage.length;
      
      if (winRate > this.MIN_WIN_RATE) {
        patterns.push(this.createRestPattern(winRate, restAdvantage.length));
      }
    }
    
    return patterns;
  }

  private analyzeTravelImpact(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    const longTravel = games.filter(g => g.travelDistance > 1500);
    
    if (longTravel.length >= this.MIN_SAMPLE_SIZE) {
      const fadeWinRate = longTravel.filter(g => !g.covered).length / longTravel.length;
      
      if (fadeWinRate > this.MIN_WIN_RATE) {
        patterns.push(this.createTravelPattern(fadeWinRate, longTravel.length));
      }
    }
    
    return patterns;
  }

  private analyzeTimeZoneImpact(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    
    const timeZoneGames = games.filter(g => Math.abs(g.timeZoneDiff) >= 2);
    
    if (timeZoneGames.length >= this.MIN_SAMPLE_SIZE) {
      const winRate = timeZoneGames.filter(g => g.covered).length / timeZoneGames.length;
      
      if (winRate > this.MIN_WIN_RATE) {
        patterns.push(this.createTimeZonePattern(winRate, timeZoneGames.length));
      }
    }
    
    return patterns;
  }

  private analyzeDayOfWeekTrends(games: any[]): Pattern[] {
    const patterns: Pattern[] = [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const day of days) {
      const dayGames = games.filter(g => g.dayOfWeek === day);
      
      if (dayGames.length >= this.MIN_SAMPLE_SIZE) {
        const winRate = dayGames.filter(g => g.covered).length / dayGames.length;
        
        if (winRate > this.MIN_WIN_RATE) {
          patterns.push(this.createDayPattern(day, winRate, dayGames.length));
        }
      }
    }
    
    return patterns;
  }

  // Pattern creation helpers

  private createPatternFromAnalysis(name: string, analysis: any): Pattern {
    return {
      id: `auto_${name}_${Date.now()}`,
      name: `Auto-detected ${name} pattern`,
      type: 'situational',
      description: `Pattern detected from historical analysis`,
      conditions: analysis.conditions,
      historicalPerformance: {
        totalGames: analysis.sampleSize,
        wins: Math.round(analysis.sampleSize * analysis.winRate),
        losses: Math.round(analysis.sampleSize * (1 - analysis.winRate)),
        pushes: 0,
        winRate: analysis.winRate,
        roi: (analysis.winRate - 0.5238) * 100 / 0.5238 * 100, // Assuming -110 odds
        avgOdds: -110,
        profitUnits: 0,
        last30Days: { games: 0, winRate: 0, roi: 0 },
        byYear: [],
        trend: 'stable'
      },
      currentMatches: [],
      confidence: Math.min(0.9, 0.5 + (analysis.sampleSize / 1000)),
      profitability: (analysis.winRate - 0.5238) * 100,
      lastUpdated: new Date()
    };
  }

  private createLineMovementPattern(scenario: any, winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis(`line_movement_${scenario.movement}`, {
      winRate,
      sampleSize,
      conditions: [
        { 
          field: 'lineMovement', 
          operator: scenario.threshold > 0 ? 'greater' : 'less', 
          value: Math.abs(scenario.threshold), 
          weight: 1 
        }
      ]
    });
  }

  private createKeyNumberPattern(keyNumber: number, winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis(`key_number_${keyNumber}`, {
      winRate,
      sampleSize,
      conditions: [
        { field: 'spread', operator: 'between', value: [keyNumber - 0.5, keyNumber + 0.5], weight: 1 }
      ]
    });
  }

  private createCLVPattern(winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis('closing_line_value', {
      winRate,
      sampleSize,
      conditions: [
        { field: 'closingLineValue', operator: 'greater', value: 0, weight: 1 }
      ]
    });
  }

  private createRestPattern(winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis('rest_advantage', {
      winRate,
      sampleSize,
      conditions: [
        { field: 'restAdvantage', operator: 'greater', value: 1, weight: 1 }
      ]
    });
  }

  private createTravelPattern(winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis('travel_fatigue', {
      winRate,
      sampleSize,
      conditions: [
        { field: 'travelDistance', operator: 'greater', value: 1500, weight: 1 }
      ]
    });
  }

  private createTimeZonePattern(winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis('time_zone', {
      winRate,
      sampleSize,
      conditions: [
        { field: 'timeZoneDiff', operator: 'greater', value: 2, weight: 1 }
      ]
    });
  }

  private createDayPattern(day: string, winRate: number, sampleSize: number): Pattern {
    return this.createPatternFromAnalysis(`day_${day.toLowerCase()}`, {
      winRate,
      sampleSize,
      conditions: [
        { field: 'dayOfWeek', operator: 'equals', value: day, weight: 1 }
      ]
    });
  }

  // Helper methods for data checks

  private checkDivisionGame(game: any): boolean {
    // Implementation would check if teams are in same division
    return false;
  }

  private checkBackToBack(game: any): boolean {
    // Implementation would check if team played yesterday
    return false;
  }

  private checkRevengeGame(game: any): boolean {
    // Implementation would check recent matchup history
    return false;
  }

  private getPublicBetting(game: any): number {
    return game.publicBetting || 50;
  }

  private getLineMovement(game: any): number {
    return game.lineMovement || 0;
  }

  private detectSharpAction(game: any): boolean {
    return game.sharpAction || false;
  }

  private getRefereeOverRate(game: any): number {
    return game.refereeOverRate || 0.5;
  }

  private checkOutdoor(game: any): boolean {
    return game.venue?.outdoor || false;
  }

  private checkPlayoffImplications(game: any): boolean {
    return game.playoffImplications || false;
  }

  private calculateRestDays(game: any): number {
    return game.restDays || 3;
  }

  private calculateTravelDistance(game: any): number {
    return game.travelDistance || 0;
  }

  private createMockPerformance(games: number, winRate: number, roi: number): HistoricalPerformance {
    return {
      totalGames: games,
      wins: Math.round(games * winRate),
      losses: Math.round(games * (1 - winRate)),
      pushes: 0,
      winRate,
      roi,
      avgOdds: -110,
      profitUnits: games * roi / 100,
      last30Days: {
        games: Math.round(games * 0.1),
        winRate: winRate + (Math.random() * 0.1 - 0.05),
        roi: roi + (Math.random() * 5 - 2.5)
      },
      byYear: [
        { year: 2023, games: Math.round(games * 0.3), winRate, roi },
        { year: 2022, games: Math.round(games * 0.35), winRate: winRate - 0.02, roi: roi - 1 },
        { year: 2021, games: Math.round(games * 0.35), winRate: winRate - 0.01, roi: roi - 0.5 }
      ],
      trend: roi > 10 ? 'improving' : roi > 5 ? 'stable' : 'declining'
    };
  }

  private addPattern(pattern: Pattern) {
    this.patterns.set(pattern.id, pattern);
  }

  /**
   * Get all active patterns
   */
  getActivePatterns(): Pattern[] {
    return Array.from(this.patterns.values())
      .filter(p => p.currentMatches.length > 0)
      .sort((a, b) => b.profitability - a.profitability);
  }

  /**
   * Get pattern by ID
   */
  getPattern(id: string): Pattern | undefined {
    return this.patterns.get(id);
  }

  /**
   * Update pattern performance
   */
  updatePatternPerformance(patternId: string, result: 'win' | 'loss' | 'push') {
    const pattern = this.patterns.get(patternId);
    if (!pattern) return;

    pattern.historicalPerformance.totalGames++;
    
    if (result === 'win') {
      pattern.historicalPerformance.wins++;
    } else if (result === 'loss') {
      pattern.historicalPerformance.losses++;
    } else {
      pattern.historicalPerformance.pushes++;
    }

    // Recalculate metrics
    pattern.historicalPerformance.winRate = 
      pattern.historicalPerformance.wins / pattern.historicalPerformance.totalGames;
    
    pattern.lastUpdated = new Date();
  }
}

// Export singleton instance
export const patternRecognition = new PatternRecognitionSystem();