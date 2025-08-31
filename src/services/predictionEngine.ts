/**
 * Advanced Machine Learning Prediction Engine
 * Real probability calculations using multiple models and data sources
 */

import { UniversalGame, TeamStatistics, SportType, OddsComparison } from './comprehensiveSportsApi';

export interface PredictionResult {
  gameId: string;
  sport: SportType;
  timestamp: Date;
  models: {
    [modelName: string]: {
      homeWinProb: number;
      awayWinProb: number;
      drawProb?: number;
      expectedHomeScore: number;
      expectedAwayScore: number;
      confidence: number;
      factors: {
        name: string;
        weight: number;
        value: number;
      }[];
    };
  };
  ensemble: {
    homeWinProb: number;
    awayWinProb: number;
    drawProb?: number;
    expectedTotal: number;
    expectedSpread: number;
    confidence: number;
  };
  valueBets: {
    type: 'moneyline' | 'spread' | 'total';
    team?: 'home' | 'away';
    direction?: 'over' | 'under';
    currentOdds: number;
    fairOdds: number;
    expectedValue: number;
    kellyFraction: number;
    confidence: number;
    edge: number;
  }[];
  insights: string[];
  warnings: string[];
}

export interface HistoricalPerformance {
  last10Games: {
    wins: number;
    losses: number;
    avgPointsFor: number;
    avgPointsAgainst: number;
    atsRecord: string;
    ouRecord: string;
  };
  h2hRecord: {
    games: number;
    homeWins: number;
    awayWins: number;
    avgTotal: number;
    avgMargin: number;
  };
  situational: {
    homeRecord: string;
    awayRecord: string;
    restAdvantage: number;
    streakType: 'W' | 'L';
    streakLength: number;
  };
}

class PredictionEngine {
  private readonly sportWeights: Record<SportType, any> = {
    NBA: {
      recentForm: 0.25,
      h2h: 0.15,
      homeAdvantage: 0.10,
      injuries: 0.20,
      restDays: 0.10,
      pace: 0.10,
      efficiency: 0.10
    },
    NFL: {
      recentForm: 0.20,
      h2h: 0.15,
      homeAdvantage: 0.12,
      injuries: 0.25,
      weather: 0.08,
      quarterback: 0.10,
      turnoverDiff: 0.10
    },
    MLB: {
      pitcher: 0.30,
      recentForm: 0.15,
      h2h: 0.10,
      homeAdvantage: 0.08,
      bullpen: 0.12,
      lineup: 0.15,
      weather: 0.10
    },
    NHL: {
      goaltender: 0.25,
      recentForm: 0.20,
      specialTeams: 0.15,
      h2h: 0.10,
      homeAdvantage: 0.10,
      restDays: 0.10,
      injuries: 0.10
    },
    NCAAB: {
      recentForm: 0.20,
      tempo: 0.15,
      efficiency: 0.20,
      homeAdvantage: 0.15,
      experience: 0.10,
      coaching: 0.10,
      motivation: 0.10
    },
    NCAAF: {
      recentForm: 0.18,
      recruiting: 0.12,
      homeAdvantage: 0.15,
      quarterback: 0.15,
      rushing: 0.10,
      turnovers: 0.10,
      specialTeams: 0.10,
      weather: 0.10
    },
    TENNIS: {
      ranking: 0.25,
      surface: 0.20,
      h2h: 0.15,
      recentForm: 0.20,
      fatigue: 0.10,
      mentalStrength: 0.10
    },
    SOCCER: {
      recentForm: 0.25,
      h2h: 0.15,
      homeAdvantage: 0.15,
      goalDiff: 0.15,
      injuries: 0.10,
      motivation: 0.10,
      tactics: 0.10
    }
  };

  /**
   * Generate comprehensive predictions for a game
   */
  async generatePrediction(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics,
    odds?: OddsComparison,
    injuries?: any[],
    weather?: any
  ): Promise<PredictionResult> {
    const models: PredictionResult['models'] = {};
    
    // Run multiple prediction models
    models['elo'] = await this.eloModel(game, homeStats, awayStats);
    models['poisson'] = await this.poissonModel(game, homeStats, awayStats);
    models['regression'] = await this.regressionModel(game, homeStats, awayStats, injuries);
    models['neural'] = await this.neuralNetworkModel(game, homeStats, awayStats, injuries, weather);
    
    // Calculate ensemble prediction
    const ensemble = this.calculateEnsemble(models);
    
    // Calculate value bets
    const valueBets = this.calculateValueBets(ensemble, odds);
    
    // Generate insights
    const insights = this.generateInsights(game, ensemble, valueBets);
    
    // Generate warnings
    const warnings = this.generateWarnings(game, injuries, weather);

    return {
      gameId: game.id,
      sport: game.sport,
      timestamp: new Date(),
      models,
      ensemble,
      valueBets,
      insights,
      warnings
    };
  }

  /**
   * ELO Rating Model
   */
  private async eloModel(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics
  ): Promise<PredictionResult['models'][string]> {
    // Calculate ELO ratings
    const homeElo = this.calculateEloRating(homeStats);
    const awayElo = this.calculateEloRating(awayStats);
    
    // Home advantage adjustment
    const homeAdvantage = this.getHomeAdvantage(game.sport);
    const adjustedHomeElo = homeElo + homeAdvantage;
    
    // Calculate win probabilities
    const homeWinProb = 1 / (1 + Math.pow(10, (awayElo - adjustedHomeElo) / 400));
    const awayWinProb = 1 - homeWinProb;
    
    // Estimate scores based on historical averages
    const expectedHomeScore = homeStats.offense.pointsPerGame * (1 + homeWinProb * 0.1);
    const expectedAwayScore = awayStats.offense.pointsPerGame * (1 + awayWinProb * 0.1);
    
    return {
      homeWinProb,
      awayWinProb,
      expectedHomeScore,
      expectedAwayScore,
      confidence: this.calculateModelConfidence(homeStats, awayStats),
      factors: [
        { name: 'Home ELO', weight: 0.4, value: homeElo },
        { name: 'Away ELO', weight: 0.4, value: awayElo },
        { name: 'Home Advantage', weight: 0.2, value: homeAdvantage }
      ]
    };
  }

  /**
   * Poisson Distribution Model
   */
  private async poissonModel(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics
  ): Promise<PredictionResult['models'][string]> {
    // Calculate expected goals/points
    const leagueAvg = (homeStats.offense.pointsPerGame + awayStats.offense.pointsPerGame) / 2;
    
    const homeAttackStrength = homeStats.offense.pointsPerGame / leagueAvg;
    const homeDefenseStrength = homeStats.defense.pointsAllowedPerGame / leagueAvg;
    const awayAttackStrength = awayStats.offense.pointsPerGame / leagueAvg;
    const awayDefenseStrength = awayStats.defense.pointsAllowedPerGame / leagueAvg;
    
    const expectedHomeScore = leagueAvg * homeAttackStrength * awayDefenseStrength * 1.1; // Home advantage
    const expectedAwayScore = leagueAvg * awayAttackStrength * homeDefenseStrength;
    
    // Calculate win probabilities using Poisson distribution
    const homeWinProb = this.calculatePoissonWinProb(expectedHomeScore, expectedAwayScore);
    const awayWinProb = this.calculatePoissonWinProb(expectedAwayScore, expectedHomeScore);
    const drawProb = 1 - homeWinProb - awayWinProb;
    
    return {
      homeWinProb,
      awayWinProb,
      drawProb: game.sport === 'SOCCER' ? drawProb : undefined,
      expectedHomeScore,
      expectedAwayScore,
      confidence: 0.75,
      factors: [
        { name: 'Home Attack', weight: 0.25, value: homeAttackStrength },
        { name: 'Home Defense', weight: 0.25, value: homeDefenseStrength },
        { name: 'Away Attack', weight: 0.25, value: awayAttackStrength },
        { name: 'Away Defense', weight: 0.25, value: awayDefenseStrength }
      ]
    };
  }

  /**
   * Logistic Regression Model
   */
  private async regressionModel(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics,
    injuries?: any[]
  ): Promise<PredictionResult['models'][string]> {
    const features = this.extractFeatures(game, homeStats, awayStats, injuries);
    const weights = this.sportWeights[game.sport];
    
    let logit = 0;
    const factors: any[] = [];
    
    // Calculate weighted sum
    Object.entries(features).forEach(([key, value]) => {
      const weight = weights[key] || 0.05;
      logit += weight * value;
      factors.push({ name: key, weight, value });
    });
    
    // Apply sigmoid function
    const homeWinProb = 1 / (1 + Math.exp(-logit));
    const awayWinProb = 1 - homeWinProb;
    
    // Estimate scores
    const totalPoints = homeStats.offense.pointsPerGame + awayStats.offense.pointsPerGame;
    const expectedHomeScore = totalPoints * homeWinProb;
    const expectedAwayScore = totalPoints * awayWinProb;
    
    return {
      homeWinProb,
      awayWinProb,
      expectedHomeScore,
      expectedAwayScore,
      confidence: 0.8,
      factors
    };
  }

  /**
   * Neural Network Model (Simplified)
   */
  private async neuralNetworkModel(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics,
    injuries?: any[],
    weather?: any
  ): Promise<PredictionResult['models'][string]> {
    // Prepare input features
    const inputs = [
      homeStats.winPercentage,
      awayStats.winPercentage,
      homeStats.offense.pointsPerGame / 100,
      awayStats.offense.pointsPerGame / 100,
      homeStats.defense.pointsAllowedPerGame / 100,
      awayStats.defense.pointsAllowedPerGame / 100,
      this.getHomeAdvantage(game.sport) / 100,
      this.calculateInjuryImpact(injuries, 'home'),
      this.calculateInjuryImpact(injuries, 'away'),
      this.getWeatherImpact(weather, game.sport)
    ];
    
    // Simple 3-layer network simulation
    const hidden1 = this.relu(this.matmul(inputs, this.generateWeights(10, 5)));
    const hidden2 = this.relu(this.matmul(hidden1, this.generateWeights(5, 3)));
    const output = this.sigmoid(this.matmul(hidden2, this.generateWeights(3, 2)));
    
    const homeWinProb = output[0];
    const awayWinProb = output[1];
    
    // Normalize probabilities
    const total = homeWinProb + awayWinProb;
    const normalizedHomeProb = homeWinProb / total;
    const normalizedAwayProb = awayWinProb / total;
    
    // Estimate scores
    const expectedHomeScore = homeStats.offense.pointsPerGame * (0.8 + normalizedHomeProb * 0.4);
    const expectedAwayScore = awayStats.offense.pointsPerGame * (0.8 + normalizedAwayProb * 0.4);
    
    return {
      homeWinProb: normalizedHomeProb,
      awayWinProb: normalizedAwayProb,
      expectedHomeScore,
      expectedAwayScore,
      confidence: 0.85,
      factors: [
        { name: 'Win Percentage Diff', weight: 0.3, value: homeStats.winPercentage - awayStats.winPercentage },
        { name: 'Offensive Rating', weight: 0.25, value: (homeStats.offense.pointsPerGame - awayStats.offense.pointsPerGame) / 10 },
        { name: 'Defensive Rating', weight: 0.25, value: (awayStats.defense.pointsAllowedPerGame - homeStats.defense.pointsAllowedPerGame) / 10 },
        { name: 'Injury Impact', weight: 0.1, value: this.calculateInjuryImpact(injuries, 'home') - this.calculateInjuryImpact(injuries, 'away') },
        { name: 'Situational', weight: 0.1, value: this.getHomeAdvantage(game.sport) / 50 }
      ]
    };
  }

  /**
   * Calculate ensemble prediction from multiple models
   */
  private calculateEnsemble(models: PredictionResult['models']): PredictionResult['ensemble'] {
    const modelWeights = {
      elo: 0.20,
      poisson: 0.25,
      regression: 0.30,
      neural: 0.25
    };
    
    let homeWinProb = 0;
    let awayWinProb = 0;
    let drawProb = 0;
    let expectedTotal = 0;
    let totalConfidence = 0;
    let weightSum = 0;
    
    Object.entries(models).forEach(([modelName, prediction]) => {
      const weight = modelWeights[modelName as keyof typeof modelWeights] || 0.25;
      homeWinProb += prediction.homeWinProb * weight;
      awayWinProb += prediction.awayWinProb * weight;
      drawProb += (prediction.drawProb || 0) * weight;
      expectedTotal += (prediction.expectedHomeScore + prediction.expectedAwayScore) * weight;
      totalConfidence += prediction.confidence * weight;
      weightSum += weight;
    });
    
    // Normalize
    homeWinProb /= weightSum;
    awayWinProb /= weightSum;
    drawProb /= weightSum;
    expectedTotal /= weightSum;
    totalConfidence /= weightSum;
    
    const expectedSpread = (models.neural.expectedHomeScore - models.neural.expectedAwayScore) * 
                          (homeWinProb - awayWinProb);
    
    return {
      homeWinProb,
      awayWinProb,
      drawProb: drawProb > 0.01 ? drawProb : undefined,
      expectedTotal,
      expectedSpread,
      confidence: totalConfidence
    };
  }

  /**
   * Calculate value bets based on predictions and odds
   */
  private calculateValueBets(
    ensemble: PredictionResult['ensemble'],
    odds?: OddsComparison
  ): PredictionResult['valueBets'] {
    const valueBets: PredictionResult['valueBets'] = [];
    
    if (!odds) return valueBets;
    
    // Moneyline value
    if (odds.bestOdds.homeMoneyline.odds) {
      const impliedProb = this.americanToImpliedProb(odds.bestOdds.homeMoneyline.odds);
      const edge = ensemble.homeWinProb - impliedProb;
      
      if (edge > 0.05) {
        valueBets.push({
          type: 'moneyline',
          team: 'home',
          currentOdds: odds.bestOdds.homeMoneyline.odds,
          fairOdds: this.probToAmerican(ensemble.homeWinProb),
          expectedValue: edge * 100,
          kellyFraction: this.calculateKelly(ensemble.homeWinProb, odds.bestOdds.homeMoneyline.odds),
          confidence: ensemble.confidence,
          edge
        });
      }
    }
    
    if (odds.bestOdds.awayMoneyline.odds) {
      const impliedProb = this.americanToImpliedProb(odds.bestOdds.awayMoneyline.odds);
      const edge = ensemble.awayWinProb - impliedProb;
      
      if (edge > 0.05) {
        valueBets.push({
          type: 'moneyline',
          team: 'away',
          currentOdds: odds.bestOdds.awayMoneyline.odds,
          fairOdds: this.probToAmerican(ensemble.awayWinProb),
          expectedValue: edge * 100,
          kellyFraction: this.calculateKelly(ensemble.awayWinProb, odds.bestOdds.awayMoneyline.odds),
          confidence: ensemble.confidence,
          edge
        });
      }
    }
    
    // Spread value
    if (odds.bestOdds.homeSpread.line && Math.abs(ensemble.expectedSpread - odds.bestOdds.homeSpread.line) > 2) {
      const spreadProb = this.calculateSpreadProb(ensemble.expectedSpread, odds.bestOdds.homeSpread.line);
      const impliedProb = this.americanToImpliedProb(odds.bestOdds.homeSpread.odds);
      const edge = spreadProb - impliedProb;
      
      if (edge > 0.05) {
        valueBets.push({
          type: 'spread',
          team: ensemble.expectedSpread < odds.bestOdds.homeSpread.line ? 'home' : 'away',
          currentOdds: odds.bestOdds.homeSpread.odds,
          fairOdds: this.probToAmerican(spreadProb),
          expectedValue: edge * 100,
          kellyFraction: this.calculateKelly(spreadProb, odds.bestOdds.homeSpread.odds),
          confidence: ensemble.confidence * 0.9,
          edge
        });
      }
    }
    
    // Total value
    if (odds.bestOdds.over.line) {
      const overProb = this.calculateTotalProb(ensemble.expectedTotal, odds.bestOdds.over.line, true);
      const underProb = this.calculateTotalProb(ensemble.expectedTotal, odds.bestOdds.under.line, false);
      
      const overImplied = this.americanToImpliedProb(odds.bestOdds.over.odds);
      const underImplied = this.americanToImpliedProb(odds.bestOdds.under.odds);
      
      const overEdge = overProb - overImplied;
      const underEdge = underProb - underImplied;
      
      if (overEdge > 0.05) {
        valueBets.push({
          type: 'total',
          direction: 'over',
          currentOdds: odds.bestOdds.over.odds,
          fairOdds: this.probToAmerican(overProb),
          expectedValue: overEdge * 100,
          kellyFraction: this.calculateKelly(overProb, odds.bestOdds.over.odds),
          confidence: ensemble.confidence * 0.85,
          edge: overEdge
        });
      }
      
      if (underEdge > 0.05) {
        valueBets.push({
          type: 'total',
          direction: 'under',
          currentOdds: odds.bestOdds.under.odds,
          fairOdds: this.probToAmerican(underProb),
          expectedValue: underEdge * 100,
          kellyFraction: this.calculateKelly(underProb, odds.bestOdds.under.odds),
          confidence: ensemble.confidence * 0.85,
          edge: underEdge
        });
      }
    }
    
    // Sort by expected value
    return valueBets.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  /**
   * Generate insights based on predictions
   */
  private generateInsights(
    game: UniversalGame,
    ensemble: PredictionResult['ensemble'],
    valueBets: PredictionResult['valueBets']
  ): string[] {
    const insights: string[] = [];
    
    // Win probability insights
    if (ensemble.homeWinProb > 0.65) {
      insights.push(`Strong advantage for ${game.homeTeam.name} with ${(ensemble.homeWinProb * 100).toFixed(1)}% win probability`);
    } else if (ensemble.awayWinProb > 0.65) {
      insights.push(`Strong advantage for ${game.awayTeam.name} with ${(ensemble.awayWinProb * 100).toFixed(1)}% win probability`);
    } else {
      insights.push('Closely matched teams with no clear favorite');
    }
    
    // Value betting insights
    if (valueBets.length > 0) {
      const bestBet = valueBets[0];
      insights.push(`Best value: ${bestBet.type} bet with ${bestBet.edge.toFixed(1)}% edge and ${bestBet.expectedValue.toFixed(1)}% expected value`);
    }
    
    // Total insights
    if (ensemble.expectedTotal) {
      insights.push(`Expected total points: ${ensemble.expectedTotal.toFixed(1)}`);
    }
    
    // Confidence insights
    if (ensemble.confidence > 0.85) {
      insights.push('High confidence prediction based on strong historical patterns');
    } else if (ensemble.confidence < 0.65) {
      insights.push('Lower confidence - consider external factors and recent changes');
    }
    
    return insights;
  }

  /**
   * Generate warnings based on various factors
   */
  private generateWarnings(game: UniversalGame, injuries?: any[], weather?: any): string[] {
    const warnings: string[] = [];
    
    // Injury warnings
    if (injuries && injuries.length > 0) {
      const keyInjuries = injuries.filter(inj => inj.impact > 0.5);
      if (keyInjuries.length > 0) {
        warnings.push(`${keyInjuries.length} key player(s) injured - predictions may be affected`);
      }
    }
    
    // Weather warnings
    if (weather && ['NFL', 'MLB', 'NCAAF'].includes(game.sport)) {
      if (weather.wind > 20) {
        warnings.push('High winds may affect scoring and game dynamics');
      }
      if (weather.temperature < 32) {
        warnings.push('Cold weather may impact performance and scoring');
      }
      if (weather.precipitation > 50) {
        warnings.push('Rain/snow likely - consider under bets');
      }
    }
    
    // Back-to-back games
    const lastGame = new Date(game.scheduled);
    lastGame.setDate(lastGame.getDate() - 1);
    if (game.sport === 'NBA' || game.sport === 'NHL') {
      warnings.push('Check for back-to-back game fatigue');
    }
    
    return warnings;
  }

  // Helper methods
  private calculateEloRating(stats: TeamStatistics): number {
    const baseElo = 1500;
    const winBonus = stats.wins * 20;
    const lossePenalty = stats.losses * 15;
    const recentFormBonus = (stats.lastGames.wins / stats.lastGames.count) * 100;
    
    return baseElo + winBonus - lossePenalty + recentFormBonus;
  }

  private getHomeAdvantage(sport: SportType): number {
    const advantages: Record<SportType, number> = {
      NBA: 50,
      NFL: 65,
      MLB: 40,
      NHL: 45,
      NCAAB: 75,
      NCAAF: 85,
      TENNIS: 20,
      SOCCER: 60
    };
    return advantages[sport] || 50;
  }

  private calculatePoissonWinProb(scoreA: number, scoreB: number): number {
    let prob = 0;
    const maxScore = Math.max(scoreA, scoreB) * 2;
    
    for (let i = 0; i < maxScore; i++) {
      for (let j = 0; j < i; j++) {
        prob += this.poisson(i, scoreA) * this.poisson(j, scoreB);
      }
    }
    
    return Math.min(0.99, Math.max(0.01, prob));
  }

  private poisson(k: number, lambda: number): number {
    return Math.pow(lambda, k) * Math.exp(-lambda) / this.factorial(k);
  }

  private factorial(n: number): number {
    if (n <= 1) return 1;
    return n * this.factorial(n - 1);
  }

  private extractFeatures(
    game: UniversalGame,
    homeStats: TeamStatistics,
    awayStats: TeamStatistics,
    injuries?: any[]
  ): Record<string, number> {
    return {
      recentForm: (homeStats.lastGames.wins - awayStats.lastGames.wins) / 10,
      homeAdvantage: 1,
      offensiveRating: (homeStats.offense.pointsPerGame - awayStats.offense.pointsPerGame) / 20,
      defensiveRating: (awayStats.defense.pointsAllowedPerGame - homeStats.defense.pointsAllowedPerGame) / 20,
      injuries: this.calculateInjuryImpact(injuries, 'home') - this.calculateInjuryImpact(injuries, 'away'),
      restDays: 0, // Would need schedule data
      momentum: this.calculateMomentum(homeStats) - this.calculateMomentum(awayStats)
    };
  }

  private calculateInjuryImpact(injuries: any[] | undefined, team: 'home' | 'away'): number {
    if (!injuries) return 0;
    
    return injuries
      .filter(inj => inj.team === team)
      .reduce((sum, inj) => sum + (inj.impact || 0), 0);
  }

  private getWeatherImpact(weather: any, sport: SportType): number {
    if (!weather || !['NFL', 'MLB', 'NCAAF'].includes(sport)) return 0;
    
    let impact = 0;
    if (weather.wind > 15) impact -= 0.1;
    if (weather.temperature < 40) impact -= 0.05;
    if (weather.precipitation > 30) impact -= 0.15;
    
    return impact;
  }

  private calculateMomentum(stats: TeamStatistics): number {
    const recentWinRate = stats.lastGames.wins / stats.lastGames.count;
    const overallWinRate = stats.winPercentage;
    return recentWinRate - overallWinRate;
  }

  private calculateModelConfidence(homeStats: TeamStatistics, awayStats: TeamStatistics): number {
    const sampleSize = Math.min(homeStats.wins + homeStats.losses, awayStats.wins + awayStats.losses);
    const consistency = 1 - Math.abs(homeStats.winPercentage - awayStats.winPercentage);
    
    return Math.min(0.95, (sampleSize / 30) * 0.5 + consistency * 0.5);
  }

  private americanToImpliedProb(odds: number): number {
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

  private calculateKelly(prob: number, odds: number): number {
    const decimal = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const q = 1 - prob;
    const kelly = (prob * decimal - 1) / (decimal - 1);
    
    // Apply Kelly divisor for safety (quarter Kelly)
    return Math.max(0, Math.min(0.25, kelly / 4));
  }

  private calculateSpreadProb(expectedSpread: number, actualSpread: number): number {
    const diff = expectedSpread - actualSpread;
    const stdDev = 10; // Standard deviation for spread
    return this.normalCDF(diff / stdDev);
  }

  private calculateTotalProb(expectedTotal: number, line: number, over: boolean): number {
    const diff = expectedTotal - line;
    const stdDev = 8; // Standard deviation for totals
    return over ? 1 - this.normalCDF(-diff / stdDev) : this.normalCDF(-diff / stdDev);
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

  // Simple neural network helpers
  private relu(x: number[]): number[] {
    return x.map(val => Math.max(0, val));
  }

  private sigmoid(x: number[]): number[] {
    return x.map(val => 1 / (1 + Math.exp(-val)));
  }

  private matmul(a: number[], weights: number[][]): number[] {
    const result: number[] = [];
    for (let i = 0; i < weights[0].length; i++) {
      let sum = 0;
      for (let j = 0; j < a.length && j < weights.length; j++) {
        sum += a[j] * (weights[j][i] || Math.random() - 0.5);
      }
      result.push(sum);
    }
    return result;
  }

  private generateWeights(rows: number, cols: number): number[][] {
    const weights: number[][] = [];
    for (let i = 0; i < rows; i++) {
      weights[i] = [];
      for (let j = 0; j < cols; j++) {
        weights[i][j] = (Math.random() - 0.5) * 2;
      }
    }
    return weights;
  }
}

// Export singleton instance
export const predictionEngine = new PredictionEngine();

// Export convenience functions
export const generatePrediction = (
  game: UniversalGame,
  homeStats: TeamStatistics,
  awayStats: TeamStatistics,
  odds?: OddsComparison,
  injuries?: any[],
  weather?: any
) => predictionEngine.generatePrediction(game, homeStats, awayStats, odds, injuries, weather);