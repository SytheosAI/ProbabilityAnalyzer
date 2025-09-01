/**
 * Cross-Reference Analytics Service
 * Combines ESPN and Sports Radar data for comprehensive betting intelligence
 */

import { espnAPI } from './espnApi';
import { sportsRadarAPI } from './sportsRadarApi';
import { sportsDataIO } from './sportsDataIOApi';
import {
  EnhancedAnalytics,
  InjuryImpact,
  PerformanceTrend,
  MatchupAdvantage,
  RestFatigueFactor,
  LineMovement,
  SharpMoneyIndicator,
  ClosingLineValue,
  HomeAwayPerformance,
  AltitudeEffect,
  WeatherImpact,
  SurfaceEffect,
  TimeZoneImpact,
  RefereeAnalytics,
  PlayoffPositioning,
  CoachingChange,
  RevengeGame,
  TrapGame,
  DivisionTrends,
  StyleMatchup,
  DayOfWeekPattern,
  PublicBias
} from '../types/analytics';

class CrossReferenceAnalyticsService {
  
  /**
   * Main method to generate comprehensive enhanced analytics
   */
  async generateEnhancedAnalytics(
    sport: string,
    league: string,
    gameId: string,
    espnGameId?: string
  ): Promise<EnhancedAnalytics> {
    console.log(`🎯 Generating enhanced analytics for ${sport}/${league} game ${gameId}`);
    
    // Fetch data from all sources in parallel
    const [espnData, sportsRadarData, sportsDataIOInfo] = await Promise.all([
      espnGameId ? this.fetchESPNData(sport, league, espnGameId) : null,
      this.fetchSportsRadarData(sport, gameId),
      this.fetchSportsDataIOData(sport, gameId)
    ]);
    
    // Generate all analytics components
    const [
      injuries,
      performanceTrends,
      matchupAdvantages,
      restFatigue,
      lineMovements,
      sharpMoney,
      closingLineValue,
      homeAwayPerformance,
      environmental,
      referee,
      momentum,
      correlation
    ] = await Promise.all([
      this.analyzeInjuries(espnData, sportsRadarData, sportsDataIOInfo),
      this.analyzePerformanceTrends(espnData, sportsRadarData),
      this.analyzeMatchupAdvantages(espnData, sportsRadarData),
      this.analyzeRestFatigue(espnData, sportsRadarData),
      this.analyzeLineMovements(espnData, sportsRadarData, sportsDataIOInfo),
      this.analyzeSharpMoney(espnData, sportsRadarData, sportsDataIOInfo),
      this.analyzeClosingLineValue(espnData, sportsRadarData),
      this.analyzeHomeAwayPerformance(espnData, sportsRadarData),
      this.analyzeEnvironmentalFactors(espnData, sportsRadarData),
      this.analyzeRefereeImpact(espnData, sportsRadarData, sportsDataIOInfo),
      this.analyzeMomentumFactors(espnData, sportsRadarData, sport, league),
      this.analyzeCorrelationPatterns(espnData, sportsRadarData, sport, league)
    ]);
    
    // Calculate composite scores
    const compositeScores = this.calculateCompositeScores({
      injuries,
      performanceTrends,
      matchupAdvantages,
      restFatigue,
      lineMovements,
      sharpMoney,
      closingLineValue,
      homeAwayPerformance,
      environmental,
      referee,
      momentum,
      correlation
    });
    
    return {
      gameId,
      sport,
      teams: {
        home: espnData?.teams?.home?.team?.displayName || sportsRadarData?.home_team?.name || '',
        away: espnData?.teams?.away?.team?.displayName || sportsRadarData?.away_team?.name || ''
      },
      injuries,
      performanceTrends,
      matchupAdvantages,
      restFatigue,
      lineMovements,
      sharpMoney,
      closingLineValue,
      homeAway: homeAwayPerformance,
      altitude: environmental.altitude,
      weather: environmental.weather,
      surface: environmental.surface,
      timeZone: environmental.timeZone,
      referee,
      playoffPositioning: momentum.playoffPositioning,
      coachingChanges: momentum.coachingChanges,
      revengeGame: momentum.revengeGame,
      trapGame: momentum.trapGame,
      divisionTrends: correlation.divisionTrends,
      styleMatchup: correlation.styleMatchup,
      dayOfWeek: correlation.dayOfWeek,
      publicBias: correlation.publicBias,
      compositeScores,
      timestamp: new Date().toISOString(),
      dataQuality: this.assessDataQuality(espnData, sportsRadarData)
    };
  }
  
  /**
   * Fetch ESPN data
   */
  private async fetchESPNData(sport: string, league: string, gameId: string) {
    try {
      return await espnAPI.getComprehensiveGameData(sport, league, gameId);
    } catch (error) {
      console.error('Error fetching ESPN data:', error);
      return null;
    }
  }
  
  /**
   * Fetch Sports Radar data
   */
  private async fetchSportsRadarData(sport: string, gameId: string) {
    try {
      const [odds, injuries, h2h] = await Promise.all([
        sportsRadarAPI.getGameOdds(sport, gameId),
        sportsRadarAPI.getInjuryReport(sport),
        null // H2H will be fetched if team IDs are available
      ]);
      return { odds, injuries, h2h };
    } catch (error) {
      console.error('Error fetching Sports Radar data:', error);
      return null;
    }
  }
  
  /**
   * Fetch data from SportsDataIO
   */
  private async fetchSportsDataIOData(sport: string, gameId: string) {
    try {
      const [referees, injuries, consensus] = await Promise.all([
        sportsDataIO.getRefereeAnalytics(sport, gameId),
        sportsDataIO.getInjuryReports(sport),
        sportsDataIO.getBettingConsensus(sport, gameId)
      ]);
      return { referees, injuries, consensus };
    } catch (error) {
      console.error('Error fetching SportsDataIO data:', error);
      return { referees: [], injuries: [], consensus: null };
    }
  }

  /**
   * Analyze injuries and their impact (now includes SportsDataIO)
   */
  private async analyzeInjuries(espnData: any, sportsRadarData: any, sportsDataIOInfo?: any) {
    const homeInjuries: InjuryImpact[] = [];
    const awayInjuries: InjuryImpact[] = [];
    
    // Process ESPN injuries
    if (espnData?.teams) {
      // Home team injuries
      for (const player of espnData.teams.home.injuries || []) {
        homeInjuries.push(this.createInjuryImpact(player, espnData.teams.home.team.displayName));
      }
      
      // Away team injuries
      for (const player of espnData.teams.away.injuries || []) {
        awayInjuries.push(this.createInjuryImpact(player, espnData.teams.away.team.displayName));
      }
    }
    
    // Merge with Sports Radar injuries
    if (sportsRadarData?.injuries) {
      for (const injury of sportsRadarData.injuries) {
        const isHome = injury.team === espnData?.teams?.home?.team?.displayName;
        const injuryImpact = this.createInjuryImpactFromSR(injury);
        
        if (isHome) {
          const exists = homeInjuries.find(i => i.playerName === injury.player);
          if (!exists) homeInjuries.push(injuryImpact);
        } else {
          const exists = awayInjuries.find(i => i.playerName === injury.player);
          if (!exists) awayInjuries.push(injuryImpact);
        }
      }
    }
    
    // Add SportsDataIO injury data
    if (sportsDataIOInfo?.injuries) {
      for (const injury of sportsDataIOInfo.injuries) {
        const injuryImpact: InjuryImpact = {
          playerName: injury.playerName,
          team: injury.team,
          injury: injury.injury,
          status: injury.status,
          bodyPart: injury.bodyPart,
          expectedReturn: injury.expectedReturn,
          impactRating: injury.impactRating,
          probabilityToPlay: injury.status === 'Active' ? 1.0 :
                           injury.status === 'Probable' ? 0.75 :
                           injury.status === 'Questionable' ? 0.5 :
                           injury.status === 'Doubtful' ? 0.25 : 0
        };
        
        // Add to appropriate team
        const isHome = injury.team === espnData?.teams?.home?.team?.displayName;
        if (isHome) {
          const exists = homeInjuries.find(i => i.playerName === injury.playerName);
          if (!exists) homeInjuries.push(injuryImpact);
        } else {
          const exists = awayInjuries.find(i => i.playerName === injury.playerName);
          if (!exists) awayInjuries.push(injuryImpact);
        }
      }
    }
    
    const totalImpact = this.calculateTotalInjuryImpact(homeInjuries, awayInjuries);
    
    return {
      home: homeInjuries,
      away: awayInjuries,
      totalImpact
    };
  }
  
  /**
   * Analyze performance trends
   */
  private async analyzePerformanceTrends(espnData: any, sportsRadarData: any) {
    const homeTrends: PerformanceTrend[] = [];
    const awayTrends: PerformanceTrend[] = [];
    
    if (espnData?.teams) {
      // Analyze home team performance
      if (espnData.teams.home.recentPerformance) {
        homeTrends.push(...this.extractPerformanceTrends(
          espnData.teams.home.roster,
          espnData.teams.home.recentPerformance
        ));
      }
      
      // Analyze away team performance
      if (espnData.teams.away.recentPerformance) {
        awayTrends.push(...this.extractPerformanceTrends(
          espnData.teams.away.roster,
          espnData.teams.away.recentPerformance
        ));
      }
    }
    
    return {
      home: homeTrends,
      away: awayTrends
    };
  }
  
  /**
   * Analyze matchup advantages
   */
  private async analyzeMatchupAdvantages(espnData: any, sportsRadarData: any): Promise<MatchupAdvantage> {
    const advantages = [];
    
    if (espnData?.headToHead) {
      // Historical matchup advantage
      const h2hAdvantage = this.calculateH2HAdvantage(espnData.headToHead);
      advantages.push(h2hAdvantage);
    }
    
    if (espnData?.teams) {
      // Style matchup advantage
      const styleAdvantage = this.calculateStyleAdvantage(
        espnData.teams.home,
        espnData.teams.away
      );
      advantages.push(styleAdvantage);
      
      // Experience advantage
      const experienceAdvantage = this.calculateExperienceAdvantage(
        espnData.teams.home,
        espnData.teams.away
      );
      advantages.push(experienceAdvantage);
    }
    
    return {
      team: espnData?.teams?.home?.team?.displayName || '',
      opponent: espnData?.teams?.away?.team?.displayName || '',
      advantages,
      h2hRecord: espnData?.headToHead ? {
        last5: { 
          wins: Math.min(5, espnData.headToHead.statistics.team1.wins),
          losses: Math.min(5, espnData.headToHead.statistics.team1.losses)
        },
        last10: {
          wins: Math.min(10, espnData.headToHead.statistics.team1.wins),
          losses: Math.min(10, espnData.headToHead.statistics.team1.losses)
        },
        allTime: {
          wins: espnData.headToHead.statistics.team1.wins,
          losses: espnData.headToHead.statistics.team1.losses
        }
      } : {
        last5: { wins: 0, losses: 0 },
        last10: { wins: 0, losses: 0 },
        allTime: { wins: 0, losses: 0 }
      },
      averageMargin: {
        last5: this.calculateAverageMargin(espnData?.headToHead?.events?.slice(0, 5)),
        last10: this.calculateAverageMargin(espnData?.headToHead?.events?.slice(0, 10)),
        season: 0
      }
    };
  }
  
  /**
   * Analyze rest and fatigue factors
   */
  private async analyzeRestFatigue(espnData: any, sportsRadarData: any) {
    const home = this.calculateRestFatigue(
      espnData?.teams?.home,
      espnData?.teams?.home?.team?.displayName
    );
    
    const away = this.calculateRestFatigue(
      espnData?.teams?.away,
      espnData?.teams?.away?.team?.displayName
    );
    
    return { home, away };
  }
  
  /**
   * Analyze line movements (now includes SportsDataIO data)
   */
  private async analyzeLineMovements(espnData: any, sportsRadarData: any, sportsDataIOInfo?: any) {
    const movements = {
      spread: this.trackLineMovement('spread', espnData, sportsRadarData),
      total: this.trackLineMovement('total', espnData, sportsRadarData),
      moneyline: this.trackLineMovement('moneyline', espnData, sportsRadarData)
    };
    
    // Enhance with SportsDataIO consensus if available
    if (sportsDataIOInfo?.consensus) {
      const consensus = sportsDataIOInfo.consensus;
      
      // Add consensus-based signals to movements
      if (consensus.spreadConsensus && movements.spread) {
        movements.spread.publicPercentage = consensus.spreadConsensus.homePercentage;
        movements.spread.signals = movements.spread.signals || [];
        if (consensus.spreadConsensus.homePercentage > 70) {
          movements.spread.signals.push('Heavy public backing on home');
        } else if (consensus.spreadConsensus.awayPercentage > 70) {
          movements.spread.signals.push('Heavy public backing on away');
        }
      }
      
      if (consensus.totalConsensus && movements.total) {
        movements.total.publicPercentage = consensus.totalConsensus.overPercentage;
        movements.total.signals = movements.total.signals || [];
        if (consensus.totalConsensus.overPercentage > 70) {
          movements.total.signals.push('Heavy public backing on over');
        } else if (consensus.totalConsensus.underPercentage > 70) {
          movements.total.signals.push('Heavy public backing on under');
        }
      }
      
      if (consensus.moneylineConsensus && movements.moneyline) {
        movements.moneyline.publicPercentage = consensus.moneylineConsensus.homePercentage;
      }
    }
    
    return movements;
  }
  
  /**
   * Analyze sharp money indicators (now includes SportsDataIO consensus)
   */
  private async analyzeSharpMoney(espnData: any, sportsRadarData: any, sportsDataIOInfo?: any): Promise<SharpMoneyIndicator[]> {
    const indicators: SharpMoneyIndicator[] = [];
    
    // Use SportsDataIO consensus data if available
    if (sportsDataIOInfo?.consensus) {
      const consensus = sportsDataIOInfo.consensus;
      
      // Detect sharp money on spread
      if (consensus.spreadConsensus) {
        const spreadSharp = this.detectSharpMoneyFromConsensus('spread', consensus.spreadConsensus);
        if (spreadSharp) indicators.push(spreadSharp);
      }
      
      // Detect sharp money on total
      if (consensus.totalConsensus) {
        const totalSharp = this.detectSharpMoneyFromConsensus('total', consensus.totalConsensus);
        if (totalSharp) indicators.push(totalSharp);
      }
      
      // Detect sharp money on moneyline
      if (consensus.moneylineConsensus) {
        const mlSharp = this.detectSharpMoneyFromConsensus('moneyline', consensus.moneylineConsensus);
        if (mlSharp) indicators.push(mlSharp);
      }
      
      return indicators;
    }
    
    // Analyze spread
    const spreadIndicator = this.detectSharpMoney('spread', espnData, sportsRadarData);
    if (spreadIndicator) indicators.push(spreadIndicator);
    
    // Analyze total
    const totalIndicator = this.detectSharpMoney('total', espnData, sportsRadarData);
    if (totalIndicator) indicators.push(totalIndicator);
    
    // Analyze moneyline
    const moneylineIndicator = this.detectSharpMoney('moneyline', espnData, sportsRadarData);
    if (moneylineIndicator) indicators.push(moneylineIndicator);
    
    return indicators;
  }
  
  /**
   * Analyze closing line value
   */
  private async analyzeClosingLineValue(espnData: any, sportsRadarData: any): Promise<ClosingLineValue[]> {
    const clvs: ClosingLineValue[] = [];
    
    // Calculate CLV for each bet type
    for (const betType of ['spread', 'total', 'moneyline'] as const) {
      const clv = this.calculateCLV(betType, espnData, sportsRadarData);
      if (clv) clvs.push(clv);
    }
    
    return clvs;
  }
  
  /**
   * Analyze home/away performance
   */
  private async analyzeHomeAwayPerformance(espnData: any, sportsRadarData: any) {
    const home = this.calculateHomeAwayStats(
      espnData?.teams?.home,
      espnData?.teams?.home?.team?.displayName
    );
    
    const away = this.calculateHomeAwayStats(
      espnData?.teams?.away,
      espnData?.teams?.away?.team?.displayName
    );
    
    return { home, away };
  }
  
  /**
   * Analyze environmental factors
   */
  private async analyzeEnvironmentalFactors(espnData: any, sportsRadarData: any) {
    const altitude = this.calculateAltitudeEffect(espnData);
    const weather = this.calculateWeatherImpact(espnData);
    const surface = this.calculateSurfaceEffect(espnData);
    const timeZone = {
      home: this.calculateTimeZoneImpact(espnData?.teams?.home, espnData?.competition?.venue),
      away: this.calculateTimeZoneImpact(espnData?.teams?.away, espnData?.competition?.venue)
    };
    
    return { altitude, weather, surface, timeZone };
  }
  
  /**
   * Analyze referee impact (now includes SportsDataIO)
   */
  private async analyzeRefereeImpact(espnData: any, sportsRadarData: any, sportsDataIOInfo?: any): Promise<RefereeAnalytics> {
    const officials = espnData?.competition?.officials || [];
    const headRef = officials.find((o: any) => o.position?.name === 'Referee') || officials[0];
    
    // Use SportsDataIO referee data if available
    if (sportsDataIOInfo?.referees && sportsDataIOInfo.referees.length > 0) {
      const sportsDataIORefs = sportsDataIOInfo.referees;
      const headRefData = sportsDataIORefs[0]; // Primary referee
      
      return {
        gameId: espnData?.event?.id || '',
        officials: sportsDataIORefs.map((ref: any) => ({
          name: ref.name,
          position: ref.position,
          experience: ref.experience
        })),
        headReferee: {
          name: headRefData.name,
          totalBias: headRefData.overUnderTendency === 'over' ? 1 : headRefData.overUnderTendency === 'under' ? -1 : 0,
          homeBias: headRefData.homeTeamAdvantage,
          averageTotal: headRefData.totalAverage,
          overPercentage: headRefData.overUnderTendency === 'over' ? 60 : headRefData.overUnderTendency === 'under' ? 40 : 50,
          homeCoverPercentage: 50 + (headRefData.homeTeamAdvantage * 5),
          foulsPerGame: headRefData.foulsPerGame,
          technicalFoulsPerGame: headRefData.technicalFoulsPerGame || 0
        },
        tendencies: {
          totalTendency: headRefData.overUnderTendency,
          homeTeamAdvantage: headRefData.homeTeamAdvantage,
          avgPenaltiesPerGame: headRefData.foulsPerGame,
          playoffExperience: headRefData.experience > 5
        },
        historicalData: {
          last10Games: {
            avgTotal: headRefData.totalAverage,
            overUnderRecord: headRefData.overUnderTendency === 'over' ? '6-4' :
                            headRefData.overUnderTendency === 'under' ? '4-6' : '5-5',
            homeCoverRecord: headRefData.homeTeamAdvantage > 0 ? '6-4' : '5-5'
          },
          seasonTrends: {
            totalPoints: headRefData.totalAverage,
            overPercentage: headRefData.overUnderTendency === 'over' ? 60 : 40,
            penalties: headRefData.foulsPerGame
          }
        }
      };
    }
    
    // Fallback to ESPN data if no SportsDataIO data
    return {
      gameId: espnData?.event?.id || '',
      officials: officials.map((o: any) => ({
        name: o.fullName || o.displayName,
        position: o.position?.displayName || 'Unknown',
        experience: this.estimateRefereeExperience(o)
      })),
      headReferee: {
        name: headRef?.fullName || 'Unknown',
        totalBias: this.calculateRefereeBias(headRef, 'total'),
        homeBias: this.calculateRefereeBias(headRef, 'home'),
        averageTotal: this.getRefereeTotalAverage(headRef),
        overPercentage: this.getRefereeOverPercentage(headRef),
        homeCoverPercentage: this.getRefereeHomeCoverPercentage(headRef),
        foulsPerGame: this.getRefereeFoulsPerGame(headRef),
        technicalFoulsPerGame: this.getRefereeTechnicalFoulsPerGame(headRef)
      },
      crewTendencies: {
        totalBias: this.calculateCrewBias(officials, 'total'),
        paceBias: this.calculateCrewBias(officials, 'pace'),
        homeAdvantage: this.calculateCrewBias(officials, 'home'),
        whistleTightness: this.calculateWhistleTightness(officials)
      },
      matchupFit: {
        styleCompatibility: this.calculateRefereeStyleFit(officials, espnData),
        expectedImpact: this.describeRefereeImpact(officials, espnData)
      }
    };
  }
  
  /**
   * Analyze momentum factors
   */
  private async analyzeMomentumFactors(espnData: any, sportsRadarData: any, sport: string, league: string) {
    const playoffPositioning = {
      home: await this.calculatePlayoffPositioning(espnData?.teams?.home, sport, league),
      away: await this.calculatePlayoffPositioning(espnData?.teams?.away, sport, league)
    };
    
    const coachingChanges = {
      home: this.detectCoachingChange(espnData?.teams?.home),
      away: this.detectCoachingChange(espnData?.teams?.away)
    };
    
    const revengeGame = this.detectRevengeGame(espnData);
    const trapGame = this.detectTrapGame(espnData);
    
    return {
      playoffPositioning,
      coachingChanges,
      revengeGame,
      trapGame
    };
  }
  
  /**
   * Analyze correlation patterns
   */
  private async analyzeCorrelationPatterns(espnData: any, sportsRadarData: any, sport: string, league: string) {
    const divisionTrends = await this.analyzeDivisionTrends(espnData, sport, league);
    const styleMatchup = this.analyzeStyleMatchup(espnData);
    const dayOfWeek = {
      home: this.analyzeDayOfWeekPattern(espnData?.teams?.home),
      away: this.analyzeDayOfWeekPattern(espnData?.teams?.away)
    };
    const publicBias = this.analyzePublicBias(espnData, sportsRadarData);
    
    return {
      divisionTrends,
      styleMatchup,
      dayOfWeek,
      publicBias
    };
  }
  
  /**
   * Calculate composite scores and recommendations
   */
  private calculateCompositeScores(analytics: any) {
    // Calculate sharp edge
    const sharpEdge = this.calculateSharpEdge(analytics);
    
    // Calculate value rating
    const valueRating = this.calculateValueRating(analytics);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(analytics);
    
    // Calculate volatility
    const volatility = this.calculateVolatility(analytics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(analytics, {
      sharpEdge,
      valueRating,
      confidence,
      volatility
    });
    
    return {
      sharpEdge,
      valueRating,
      confidence,
      volatility,
      recommendations
    };
  }
  
  // Helper methods
  
  private createInjuryImpact(player: any, team: string): InjuryImpact {
    const status = this.normalizeInjuryStatus(player.injuries?.[0]?.status);
    const probabilityToPlay = this.calculateProbabilityToPlay(status);
    
    return {
      playerId: player.id,
      playerName: player.displayName || player.fullName,
      team,
      position: player.position?.abbreviation || 'Unknown',
      status,
      probabilityToPlay,
      impactScore: this.calculatePlayerImpactScore(player),
      replacementLevel: this.estimateReplacementLevel(player),
      historicalImpact: {
        gamesWithout: 0,
        winRateWithout: 0,
        pointsDiffWithout: 0
      }
    };
  }
  
  private createInjuryImpactFromSR(injury: any): InjuryImpact {
    return {
      playerId: '',
      playerName: injury.player,
      team: injury.team,
      position: 'Unknown',
      status: this.normalizeInjuryStatus(injury.status),
      probabilityToPlay: 1 - (injury.impact || 0),
      impactScore: injury.impact || 0,
      replacementLevel: 0.5,
      historicalImpact: {
        gamesWithout: 0,
        winRateWithout: 0,
        pointsDiffWithout: 0
      }
    };
  }
  
  private normalizeInjuryStatus(status: string): InjuryImpact['status'] {
    const normalized = status?.toLowerCase() || '';
    if (normalized.includes('out')) return 'out';
    if (normalized.includes('doubtful')) return 'doubtful';
    if (normalized.includes('questionable')) return 'questionable';
    if (normalized.includes('probable')) return 'probable';
    return 'healthy';
  }
  
  private calculateProbabilityToPlay(status: InjuryImpact['status']): number {
    switch (status) {
      case 'out': return 0;
      case 'doubtful': return 0.25;
      case 'questionable': return 0.5;
      case 'probable': return 0.75;
      case 'healthy': return 1;
    }
  }
  
  private calculatePlayerImpactScore(player: any): number {
    // Simplified impact calculation - would be more sophisticated in production
    const isStarter = player.starter || false;
    const position = player.position?.abbreviation || '';
    
    let baseImpact = isStarter ? 0.6 : 0.3;
    
    // Adjust by position importance
    if (['QB', 'PG', 'C'].includes(position)) baseImpact += 0.2;
    if (['RB', 'WR', 'SG', 'SF'].includes(position)) baseImpact += 0.1;
    
    return Math.min(1, baseImpact);
  }
  
  private estimateReplacementLevel(player: any): number {
    // Simplified - in production would analyze backup quality
    return 0.5;
  }
  
  private calculateTotalInjuryImpact(home: InjuryImpact[], away: InjuryImpact[]): number {
    const homeImpact = home.reduce((sum, injury) => 
      sum + (injury.impactScore * (1 - injury.probabilityToPlay)), 0
    );
    const awayImpact = away.reduce((sum, injury) => 
      sum + (injury.impactScore * (1 - injury.probabilityToPlay)), 0
    );
    
    return homeImpact - awayImpact; // Positive favors away, negative favors home
  }
  
  private extractPerformanceTrends(roster: any[], recentPerf: any): PerformanceTrend[] {
    // Simplified trend extraction
    return [];
  }
  
  private calculateH2HAdvantage(h2h: any) {
    const winRate = h2h.statistics.team1.winPercentage;
    return {
      type: 'h2h' as const,
      description: `Historical win rate: ${(winRate * 100).toFixed(1)}%`,
      magnitude: (winRate - 0.5) * 2
    };
  }
  
  private calculateStyleAdvantage(home: any, away: any) {
    return {
      type: 'style' as const,
      description: 'Style matchup analysis',
      magnitude: 0
    };
  }
  
  private calculateExperienceAdvantage(home: any, away: any) {
    return {
      type: 'experience' as const,
      description: 'Experience differential',
      magnitude: 0
    };
  }
  
  private calculateAverageMargin(games: any[]): number {
    if (!games || games.length === 0) return 0;
    
    const margins = games.map(game => {
      const competition = game.competitions?.[0];
      if (!competition) return 0;
      
      const home = competition.competitors?.find((c: any) => c.homeAway === 'home');
      const away = competition.competitors?.find((c: any) => c.homeAway === 'away');
      
      if (!home?.score || !away?.score) return 0;
      return parseInt(home.score) - parseInt(away.score);
    });
    
    return margins.reduce((sum, m) => sum + m, 0) / margins.length;
  }
  
  private calculateRestFatigue(team: any, teamName: string): RestFatigueFactor {
    // Simplified calculation
    return {
      team: teamName || '',
      daysRest: 2,
      isBackToBack: false,
      gamesInLast7Days: 2,
      travelMiles: 0,
      timeZoneChange: 0,
      fatigueScore: 0.3,
      performance: {
        recordOnRest: '0-0',
        recordOnB2B: '0-0',
        recordAfterTravel: '0-0'
      }
    };
  }
  
  private trackLineMovement(type: string, espnData: any, sportsRadarData: any): LineMovement {
    // Simplified line movement tracking
    return {
      gameId: espnData?.event?.id || '',
      timestamp: new Date().toISOString(),
      lineType: type as any,
      opening: {
        line: 0,
        time: ''
      },
      current: {
        line: 0,
        time: ''
      },
      movements: [],
      direction: 'stable',
      magnitude: 0,
      velocity: 0
    };
  }
  
  private detectSharpMoneyFromConsensus(type: string, consensus: any): SharpMoneyIndicator | null {
    // Detect sharp money from betting consensus data
    let publicBetPct = 50;
    let publicMoneyPct = 50;
    let sharpSide = null;
    let reverseLineMovement = false;
    let signals: string[] = [];
    
    if (type === 'spread') {
      publicBetPct = consensus.homePercentage || 50;
      publicMoneyPct = (consensus.homeBets || 0) * 100 / ((consensus.homeBets || 0) + (consensus.awayBets || 0)) || 50;
      
      // Detect reverse line movement
      if (publicBetPct > 65 && publicMoneyPct < 35) {
        reverseLineMovement = true;
        sharpSide = 'away';
        signals.push('Reverse line movement detected on away');
      } else if (publicBetPct < 35 && publicMoneyPct > 65) {
        reverseLineMovement = true;
        sharpSide = 'home';
        signals.push('Reverse line movement detected on home');
      }
    } else if (type === 'total') {
      publicBetPct = consensus.overPercentage || 50;
      publicMoneyPct = (consensus.overBets || 0) * 100 / ((consensus.overBets || 0) + (consensus.underBets || 0)) || 50;
      
      if (publicBetPct > 65 && publicMoneyPct < 35) {
        reverseLineMovement = true;
        sharpSide = 'under';
        signals.push('Sharp money on under');
      } else if (publicBetPct < 35 && publicMoneyPct > 65) {
        reverseLineMovement = true;
        sharpSide = 'over';
        signals.push('Sharp money on over');
      }
    } else if (type === 'moneyline') {
      publicBetPct = consensus.homePercentage || 50;
      publicMoneyPct = (consensus.homeBets || 0) * 100 / ((consensus.homeBets || 0) + (consensus.awayBets || 0)) || 50;
      
      if (Math.abs(publicBetPct - publicMoneyPct) > 20) {
        reverseLineMovement = true;
        sharpSide = publicBetPct > publicMoneyPct ? 'away' : 'home';
        signals.push(`Sharp money on ${sharpSide}`);
      }
    }
    
    const confidence = reverseLineMovement ? 'high' : Math.abs(publicBetPct - 50) > 15 ? 'medium' : 'low';
    
    return {
      gameId: '',
      betType: type as any,
      publicBettingPercentage: publicBetPct,
      publicMoneyPercentage: publicMoneyPct,
      sharpSide,
      reverseLineMovement,
      steamMove: Math.abs(publicBetPct - publicMoneyPct) > 30,
      confidenceLevel: confidence,
      signals
    };
  }
  
  private detectSharpMoney(type: string, espnData: any, sportsRadarData: any): SharpMoneyIndicator | null {
    // Simplified sharp money detection for fallback
    return {
      gameId: espnData?.event?.id || '',
      betType: type as any,
      publicBettingPercentage: 50,
      publicMoneyPercentage: 50,
      sharpSide: null,
      reverseLineMovement: false,
      steamMove: false,
      confidenceLevel: 'low',
      signals: []
    };
  }
  
  private calculateCLV(betType: string, espnData: any, sportsRadarData: any): ClosingLineValue | null {
    // Simplified CLV calculation
    return {
      gameId: espnData?.event?.id || '',
      betType: betType as any,
      projectedClosingLine: 0,
      currentLine: 0,
      expectedValue: 0,
      confidence: 0,
      factors: []
    };
  }
  
  private calculateHomeAwayStats(team: any, teamName: string): HomeAwayPerformance {
    // Simplified home/away stats
    return {
      team: teamName || '',
      homeSplits: {
        record: '0-0',
        winPercentage: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        atsRecord: '0-0',
        ouRecord: '0-0'
      },
      awaySplits: {
        record: '0-0',
        winPercentage: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        atsRecord: '0-0',
        ouRecord: '0-0'
      },
      differential: {
        winPercentage: 0,
        scoring: 0,
        defense: 0
      }
    };
  }
  
  private calculateAltitudeEffect(espnData: any): AltitudeEffect | undefined {
    const venue = espnData?.competition?.venue;
    if (!venue) return undefined;
    
    // Check for high altitude venues
    const highAltitudeVenues = ['Denver', 'Salt Lake City', 'Mexico City'];
    const isHighAltitude = highAltitudeVenues.some(city => 
      venue.address?.city?.includes(city)
    );
    
    if (!isHighAltitude) return undefined;
    
    return {
      venue: venue.fullName,
      altitude: venue.address?.city?.includes('Denver') ? 5280 : 4500,
      visitingTeam: espnData?.teams?.away?.team?.displayName || '',
      visitingTeamAltitude: 100,
      altitudeDifferential: 5180,
      expectedImpact: {
        endurance: -0.15,
        shootingPercentage: -0.02,
        fieldGoalRange: -5
      },
      historicalPerformance: {
        recordAtAltitude: '0-0',
        averagePointsDiff: 0
      }
    };
  }
  
  private calculateWeatherImpact(espnData: any): WeatherImpact | undefined {
    const weather = espnData?.competition?.weather;
    const venue = espnData?.competition?.venue;
    
    if (!weather || venue?.indoor) return undefined;
    
    return {
      gameId: espnData?.event?.id || '',
      venue: venue?.fullName || '',
      isOutdoor: !venue?.indoor,
      isDome: false,
      conditions: {
        temperature: weather.temperature || 70,
        windSpeed: 0,
        windDirection: 'N',
        precipitation: 0,
        humidity: 50,
        visibility: 10
      },
      impact: {
        passing: 0,
        kicking: 0,
        total: 0,
        turnovers: 0
      },
      historicalData: {
        similarConditionsGames: 0,
        averageTotal: 0,
        underPercentage: 0
      }
    };
  }
  
  private calculateSurfaceEffect(espnData: any): SurfaceEffect | undefined {
    const venue = espnData?.competition?.venue;
    if (!venue) return undefined;
    
    const surface = venue.grass ? 'grass' : 'turf';
    
    return {
      venue: venue.fullName,
      surfaceType: surface as any,
      team: espnData?.teams?.home?.team?.displayName || '',
      homeSurface: surface,
      isSameSurface: true,
      performance: {
        recordOnSurface: '0-0',
        pointsFor: 0,
        pointsAgainst: 0,
        injuryRate: 0
      },
      speedImpact: 0
    };
  }
  
  private calculateTimeZoneImpact(team: any, venue: any): TimeZoneImpact {
    // Simplified time zone calculation
    return {
      team: team?.team?.displayName || '',
      homeTimeZone: 'EST',
      gameTimeZone: 'EST',
      hoursDifference: 0,
      direction: 'none',
      gameTime: '',
      bodyClockTime: '',
      impact: {
        expectedPerformance: 0,
        historicalRecord: '0-0',
        scoringDifferential: 0
      }
    };
  }
  
  private estimateRefereeExperience(official: any): number {
    // Would need actual data - using placeholder
    return 5;
  }
  
  private calculateRefereeBias(ref: any, type: string): number {
    // Would need historical referee data
    return 0;
  }
  
  private getRefereeTotalAverage(ref: any): number {
    // Would need historical data
    return 200;
  }
  
  private getRefereeOverPercentage(ref: any): number {
    // Would need historical data
    return 50;
  }
  
  private getRefereeHomeCoverPercentage(ref: any): number {
    // Would need historical data
    return 50;
  }
  
  private getRefereeFoulsPerGame(ref: any): number {
    // Would need historical data
    return 20;
  }
  
  private getRefereeTechnicalFoulsPerGame(ref: any): number {
    // Would need historical data
    return 0.5;
  }
  
  private calculateCrewBias(officials: any[], type: string): number {
    // Would need historical crew data
    return 0;
  }
  
  private calculateWhistleTightness(officials: any[]): number {
    // Would need historical data
    return 0.5;
  }
  
  private calculateRefereeStyleFit(officials: any[], espnData: any): number {
    // Would analyze team styles vs referee tendencies
    return 0.5;
  }
  
  private describeRefereeImpact(officials: any[], espnData: any): string {
    return 'Neutral referee impact expected';
  }
  
  private async calculatePlayoffPositioning(team: any, sport: string, league: string): Promise<PlayoffPositioning> {
    // Would need standings data
    return {
      team: team?.team?.displayName || '',
      currentSeed: 0,
      conferenceRank: 0,
      playoffProbability: 0,
      seedingScenarios: [],
      urgencyLevel: 'medium',
      remainingSchedule: {
        difficulty: 0.5,
        homeGames: 0,
        awayGames: 0,
        divisionalGames: 0
      }
    };
  }
  
  private detectCoachingChange(team: any): CoachingChange {
    // Would need coaching history data
    return {
      team: team?.team?.displayName || '',
      changeType: 'none',
      daysSinceChange: 0,
      previousCoach: '',
      currentCoach: '',
      recordSinceChange: '0-0',
      performanceChange: {
        scoring: 0,
        defense: 0,
        winPercentage: 0
      },
      honeymoonEffect: false
    };
  }
  
  private detectRevengeGame(espnData: any): RevengeGame | undefined {
    // Would analyze previous matchups and context
    return undefined;
  }
  
  private detectTrapGame(espnData: any): TrapGame | undefined {
    // Would analyze schedule context
    return undefined;
  }
  
  private async analyzeDivisionTrends(espnData: any, sport: string, league: string): Promise<DivisionTrends> {
    // Would need division-wide data
    return {
      division: '',
      scoringTrend: 'average',
      averageTotal: 200,
      overPercentage: 50,
      paceOfPlay: 100,
      commonFactors: [],
      divisionalGames: {
        averageTotal: 200,
        overPercentage: 50
      },
      nonDivisionalGames: {
        averageTotal: 200,
        overPercentage: 50
      }
    };
  }
  
  private analyzeStyleMatchup(espnData: any): StyleMatchup {
    // Would analyze team playing styles
    return {
      team1: espnData?.teams?.home?.team?.displayName || '',
      team2: espnData?.teams?.away?.team?.displayName || '',
      team1Style: {
        pace: 100,
        offensive: 'balanced',
        defensive: 'conservative'
      },
      team2Style: {
        pace: 100,
        offensive: 'balanced',
        defensive: 'conservative'
      },
      compatibility: {
        paceConflict: 0,
        styleAdvantage: 'neutral',
        expectedTotal: 'neutral',
        confidence: 0.5
      }
    };
  }
  
  private analyzeDayOfWeekPattern(team: any): DayOfWeekPattern {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[new Date().getDay()];
    
    // Would need historical day-of-week data
    const patterns: any = {};
    for (const day of days) {
      patterns[day] = {
        record: '0-0',
        ats: '0-0',
        ou: '0-0'
      };
    }
    
    return {
      team: team?.team?.displayName || '',
      patterns,
      currentDay,
      performanceRating: 0
    };
  }
  
  private analyzePublicBias(espnData: any, sportsRadarData: any): PublicBias {
    // Would analyze betting percentages
    return {
      gameId: espnData?.event?.id || '',
      publicFavorite: 'home',
      publicPercentage: 60,
      historicalFade: {
        record: '0-0',
        roi: 0
      },
      biasFactors: [],
      fadeRecommendation: false,
      confidence: 0.5
    };
  }
  
  private calculateSharpEdge(analytics: any): number {
    // Combine sharp money indicators
    let edge = 0;
    
    if (analytics.sharpMoney?.length > 0) {
      for (const indicator of analytics.sharpMoney) {
        if (indicator.sharpSide === 'home') edge += 20;
        if (indicator.sharpSide === 'away') edge -= 20;
      }
    }
    
    // Factor in line movements
    if (analytics.lineMovements?.spread?.direction === 'towards_home') edge -= 10;
    if (analytics.lineMovements?.spread?.direction === 'towards_away') edge += 10;
    
    // Factor in injuries
    edge += analytics.injuries?.totalImpact * 10;
    
    return Math.max(-100, Math.min(100, edge));
  }
  
  private calculateValueRating(analytics: any): number {
    let value = 50; // Base value
    
    // Add CLV value
    if (analytics.closingLineValue?.length > 0) {
      const avgCLV = analytics.closingLineValue.reduce((sum: number, clv: any) => 
        sum + clv.expectedValue, 0
      ) / analytics.closingLineValue.length;
      value += avgCLV * 10;
    }
    
    // Factor in sharp money confidence
    if (analytics.sharpMoney?.length > 0) {
      const highConfidence = analytics.sharpMoney.filter((s: any) => 
        s.confidenceLevel === 'high'
      ).length;
      value += highConfidence * 10;
    }
    
    return Math.max(0, Math.min(100, value));
  }
  
  private calculateConfidence(analytics: any): number {
    let confidence = 50;
    
    // Data quality affects confidence
    if (analytics.dataQuality) {
      confidence = (
        analytics.dataQuality.completeness * 30 +
        analytics.dataQuality.recency * 30 +
        analytics.dataQuality.reliability * 40
      );
    }
    
    return Math.max(0, Math.min(100, confidence));
  }
  
  private calculateVolatility(analytics: any): number {
    let volatility = 0;
    
    // Injuries increase volatility
    const totalInjuries = (analytics.injuries?.home?.length || 0) + 
                         (analytics.injuries?.away?.length || 0);
    volatility += totalInjuries * 5;
    
    // Trap games increase volatility
    if (analytics.trapGame) {
      volatility += analytics.trapGame.trapScore * 30;
    }
    
    // Weather increases volatility
    if (analytics.weather) {
      volatility += Math.abs(analytics.weather.impact.total) * 20;
    }
    
    return Math.max(0, Math.min(100, volatility));
  }
  
  private generateRecommendations(analytics: any, scores: any): any[] {
    const recommendations = [];
    
    // Sharp edge recommendation
    if (Math.abs(scores.sharpEdge) > 30) {
      const side = scores.sharpEdge > 0 ? 'away' : 'home';
      recommendations.push({
        type: 'spread',
        pick: `Take the ${side} team`,
        confidence: Math.abs(scores.sharpEdge),
        reasoning: ['Sharp money indicator', 'Line movement in favor'],
        keyFactors: ['Sharp action detected', 'Reverse line movement']
      });
    }
    
    // Value recommendation
    if (scores.valueRating > 70) {
      recommendations.push({
        type: 'moneyline',
        pick: 'Value bet identified',
        confidence: scores.valueRating,
        reasoning: ['High expected value', 'Closing line value present'],
        keyFactors: ['CLV opportunity', 'Market inefficiency']
      });
    }
    
    // Avoid recommendation
    if (scores.volatility > 70) {
      recommendations.push({
        type: 'avoid',
        pick: 'Avoid this game',
        confidence: scores.volatility,
        reasoning: ['High volatility', 'Unpredictable factors'],
        keyFactors: ['Multiple injuries', 'Weather concerns', 'Trap game potential']
      });
    }
    
    return recommendations;
  }
  
  private assessDataQuality(espnData: any, sportsRadarData: any): any {
    const hasESPN = !!espnData;
    const hasSR = !!sportsRadarData;
    
    const completeness = (hasESPN ? 0.5 : 0) + (hasSR ? 0.5 : 0);
    const recency = 1; // Assuming real-time data
    const reliability = (hasESPN && hasSR) ? 1 : 0.7;
    
    return {
      completeness,
      recency,
      reliability
    };
  }
}

// Export singleton instance
export const crossReferenceAnalytics = new CrossReferenceAnalyticsService();

// Export main function
export const generateEnhancedAnalytics = (
  sport: string,
  league: string,
  gameId: string,
  espnGameId?: string
) => crossReferenceAnalytics.generateEnhancedAnalytics(sport, league, gameId, espnGameId);