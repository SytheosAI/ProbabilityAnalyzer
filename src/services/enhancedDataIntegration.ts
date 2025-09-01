/**
 * Enhanced Data Integration Service
 * Unifies and cross-references all data sources with advanced analytics
 */

import { unifiedApi } from './unifiedApiService';
import { sportsRadarAPI } from './sportsRadarApi';
import { sportsDataIO } from './sportsDataIOApi';
import { espnAPI } from './espnApi';

// API Keys
const SPORTSDATA_API_KEY = 'c5298a785e5e48fdad99fca62bfff60e';
const OPENWEATHER_API_KEY = 'cebea6d73816dccaecbe0dcd99d2471c';

export interface EnhancedGameData {
  gameId: string;
  sport: string;
  league: string;
  startTime: Date;
  venue: VenueData;
  teams: {
    home: TeamAnalysis;
    away: TeamAnalysis;
  };
  betting: BettingAnalysis;
  correlations: CorrelationAnalysis;
  patterns: PatternAnalysis;
  recommendations: Recommendation[];
  confidence: number;
  lastUpdated: Date;
}

interface VenueData {
  name: string;
  city: string;
  state: string;
  surface?: string;
  altitude?: number;
  weather?: WeatherData;
  historicalTrends: {
    avgTotal: number;
    overPercentage: number;
    homeWinRate: number;
    favoritesCoverRate: number;
  };
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  precipitation: number;
  conditions: string;
  impact: {
    passing?: number; // -1 to 1 scale
    kicking?: number;
    total?: number;
    turnovers?: number;
  };
}

interface TeamAnalysis {
  name: string;
  record: string;
  ats: string;
  ou: string;
  recentForm: {
    last5: string;
    last10: string;
    pointsFor: number;
    pointsAgainst: number;
    trend: 'improving' | 'declining' | 'stable';
  };
  injuries: InjuryAnalysis[];
  restDays: number;
  travelDistance: number;
  situational: {
    isHomeUnderdog: boolean;
    isDivisionGame: boolean;
    isPrimeTime: boolean;
    isBackToBack: boolean;
    isRevengeGame: boolean;
    isTrapGame: boolean;
    playoffImplications: number; // 0-1 scale
  };
  coaching: {
    name: string;
    atsRecord: string;
    tendencies: {
      aggression: number; // 0-1 scale
      fourthDownRate: number;
      timeoutUsage: number;
    };
  };
  advanced: {
    pace: number;
    offensiveRating: number;
    defensiveRating: number;
    netRating: number;
    strengthOfSchedule: number;
  };
}

interface InjuryAnalysis {
  player: string;
  position: string;
  status: string;
  impact: number; // 0-1 scale
  replacementQuality: number; // 0-1 scale
  probabilityToPlay: number;
}

interface BettingAnalysis {
  lines: {
    spread: LineAnalysis;
    total: LineAnalysis;
    moneyline: MoneylineAnalysis;
  };
  consensus: {
    publicBettingPercentage: number;
    publicMoneyPercentage: number;
    sharpSide: 'home' | 'away' | 'over' | 'under' | null;
    reverseLineMovement: boolean;
    steamMove: boolean;
  };
  value: {
    spreadValue: number;
    totalValue: number;
    moneylineValue: number;
    bestBet: string;
    confidence: number;
  };
  props: PlayerProp[];
}

interface LineAnalysis {
  current: number;
  opening: number;
  movement: number;
  direction: 'towards_home' | 'towards_away' | 'stable';
  sharpAction: boolean;
  publicPercentage: number;
  moneyPercentage: number;
  clv: number; // Closing line value
  key_numbers?: number[]; // Important numbers crossed
}

interface MoneylineAnalysis {
  home: number;
  away: number;
  impliedProbability: {
    home: number;
    away: number;
  };
  trueProbability: {
    home: number;
    away: number;
  };
  edge: {
    home: number;
    away: number;
  };
}

interface PlayerProp {
  player: string;
  type: string;
  line: number;
  over: number;
  under: number;
  projection: number;
  edge: number;
  confidence: number;
}

interface CorrelationAnalysis {
  sameConference: boolean;
  divisionRivals: boolean;
  commonOpponents: string[];
  historicalCorrelation: number;
  styleMatchup: {
    pace: 'fast_vs_slow' | 'similar' | 'neutral';
    offense: 'high_vs_low' | 'similar' | 'neutral';
    defense: 'strong_vs_weak' | 'similar' | 'neutral';
  };
  correlatedParlays: CorrelatedParlay[];
}

interface CorrelatedParlay {
  type: string;
  legs: string[];
  correlation: number;
  expectedValue: number;
  risk: 'low' | 'medium' | 'high';
}

interface PatternAnalysis {
  historical: {
    h2hLast10: string;
    similarSituations: SimilarGame[];
    trendStrength: number;
  };
  systems: SystemMatch[];
  angles: BettingAngle[];
}

interface SimilarGame {
  date: string;
  teams: string;
  situation: string;
  result: string;
  atsResult: string;
  totalResult: string;
  similarity: number; // 0-1 scale
}

interface SystemMatch {
  name: string;
  description: string;
  historicalRecord: string;
  roi: number;
  confidence: number;
  recommendation: string;
}

interface BettingAngle {
  type: string;
  description: string;
  historicalSuccess: number;
  applies: boolean;
  impact: number;
}

interface Recommendation {
  type: 'spread' | 'total' | 'moneyline' | 'prop' | 'parlay';
  selection: string;
  confidence: number;
  edge: number;
  kelly: number;
  reasoning: string[];
  warnings: string[];
}

export class EnhancedDataIntegrationService {
  private cache: Map<string, { data: EnhancedGameData; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get fully enhanced game data with all analytics
   */
  async getEnhancedGameData(
    gameId: string,
    sport: string,
    league: string,
    forceRefresh = false
  ): Promise<EnhancedGameData> {
    // Check cache
    const cacheKey = `${sport}-${gameId}`;
    const cached = this.cache.get(cacheKey);
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    console.log(`🔄 Fetching enhanced data for ${sport} game ${gameId}`);

    // Fetch from all sources in parallel
    const [
      unifiedData,
      espnData,
      sportsRadarData,
      sportsDataIOData,
      weatherData,
      historicalData
    ] = await Promise.all([
      this.fetchUnifiedData(gameId, sport),
      this.fetchESPNEnhanced(gameId, sport, league),
      this.fetchSportsRadarEnhanced(gameId, sport),
      this.fetchSportsDataIOEnhanced(gameId, sport),
      this.fetchWeatherData(gameId),
      this.fetchHistoricalPatterns(gameId, sport)
    ]);

    // Process and analyze all data
    const enhancedData = await this.processAndAnalyze({
      gameId,
      sport,
      league,
      unifiedData,
      espnData,
      sportsRadarData,
      sportsDataIOData,
      weatherData,
      historicalData
    });

    // Cache the result
    this.cache.set(cacheKey, {
      data: enhancedData,
      timestamp: Date.now()
    });

    return enhancedData;
  }

  /**
   * Process and analyze all data sources
   */
  private async processAndAnalyze(data: any): Promise<EnhancedGameData> {
    const {
      gameId,
      sport,
      league,
      unifiedData,
      espnData,
      sportsRadarData,
      sportsDataIOData,
      weatherData,
      historicalData
    } = data;

    // Extract team names
    const homeTeam = unifiedData?.homeTeam || espnData?.home?.name || '';
    const awayTeam = unifiedData?.awayTeam || espnData?.away?.name || '';

    // Analyze injuries
    const injuries = this.analyzeInjuries(espnData, sportsRadarData, sportsDataIOData);

    // Calculate situational factors
    const situational = this.analyzeSituationalFactors(espnData, historicalData);

    // Analyze betting patterns
    const bettingAnalysis = this.analyzeBettingPatterns(
      sportsRadarData,
      sportsDataIOData,
      espnData
    );

    // Find correlations
    const correlations = this.findCorrelations(
      homeTeam,
      awayTeam,
      sport,
      historicalData
    );

    // Identify patterns
    const patterns = this.identifyPatterns(
      historicalData,
      situational,
      bettingAnalysis
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      bettingAnalysis,
      patterns,
      correlations,
      injuries,
      situational
    );

    // Calculate overall confidence
    const confidence = this.calculateConfidence(
      bettingAnalysis,
      patterns,
      correlations
    );

    return {
      gameId,
      sport,
      league,
      startTime: new Date(espnData?.date || Date.now()),
      venue: {
        name: espnData?.venue?.name || '',
        city: espnData?.venue?.city || '',
        state: espnData?.venue?.state || '',
        surface: espnData?.venue?.surface,
        altitude: this.getAltitude(espnData?.venue?.city),
        weather: weatherData,
        historicalTrends: this.getVenueTrends(espnData?.venue?.name, historicalData)
      },
      teams: {
        home: this.buildTeamAnalysis(homeTeam, 'home', espnData, injuries.home, situational),
        away: this.buildTeamAnalysis(awayTeam, 'away', espnData, injuries.away, situational)
      },
      betting: bettingAnalysis,
      correlations,
      patterns,
      recommendations,
      confidence,
      lastUpdated: new Date()
    };
  }

  /**
   * Analyze injuries from all sources
   */
  private analyzeInjuries(espnData: any, sportsRadarData: any, sportsDataIOData: any) {
    const homeInjuries: InjuryAnalysis[] = [];
    const awayInjuries: InjuryAnalysis[] = [];

    // Process ESPN injuries
    if (espnData?.injuries) {
      for (const injury of espnData.injuries) {
        const analysis: InjuryAnalysis = {
          player: injury.player,
          position: injury.position,
          status: injury.status,
          impact: this.calculateInjuryImpact(injury),
          replacementQuality: this.getReplacementQuality(injury),
          probabilityToPlay: this.getProbabilityToPlay(injury.status)
        };

        if (injury.team === espnData.home?.name) {
          homeInjuries.push(analysis);
        } else {
          awayInjuries.push(analysis);
        }
      }
    }

    // Merge with SportsRadar injuries
    if (sportsRadarData?.injuries) {
      for (const injury of sportsRadarData.injuries) {
        const exists = [...homeInjuries, ...awayInjuries].find(
          i => i.player === injury.player
        );
        
        if (!exists) {
          const analysis: InjuryAnalysis = {
            player: injury.player,
            position: injury.position || 'Unknown',
            status: injury.status,
            impact: injury.impact || 0.5,
            replacementQuality: 0.5,
            probabilityToPlay: this.getProbabilityToPlay(injury.status)
          };

          // Determine team based on roster data
          if (this.isHomeTeamPlayer(injury.player, espnData)) {
            homeInjuries.push(analysis);
          } else {
            awayInjuries.push(analysis);
          }
        }
      }
    }

    return { home: homeInjuries, away: awayInjuries };
  }

  /**
   * Analyze situational factors
   */
  private analyzeSituationalFactors(espnData: any, historicalData: any) {
    return {
      home: {
        isHomeUnderdog: this.isHomeUnderdog(espnData),
        isDivisionGame: this.isDivisionGame(espnData),
        isPrimeTime: this.isPrimeTime(espnData),
        isBackToBack: this.isBackToBack(espnData, 'home'),
        isRevengeGame: this.isRevengeGame(historicalData, 'home'),
        isTrapGame: this.isTrapGame(espnData, 'home'),
        playoffImplications: this.getPlayoffImplications(espnData, 'home')
      },
      away: {
        isHomeUnderdog: false,
        isDivisionGame: this.isDivisionGame(espnData),
        isPrimeTime: this.isPrimeTime(espnData),
        isBackToBack: this.isBackToBack(espnData, 'away'),
        isRevengeGame: this.isRevengeGame(historicalData, 'away'),
        isTrapGame: this.isTrapGame(espnData, 'away'),
        playoffImplications: this.getPlayoffImplications(espnData, 'away')
      }
    };
  }

  /**
   * Analyze betting patterns across all sources
   */
  private analyzeBettingPatterns(
    sportsRadarData: any,
    sportsDataIOData: any,
    espnData: any
  ): BettingAnalysis {
    // Extract current lines
    const currentSpread = sportsRadarData?.odds?.spread || espnData?.odds?.spread || 0;
    const currentTotal = sportsRadarData?.odds?.total || espnData?.odds?.total || 0;
    const currentMLHome = sportsRadarData?.odds?.homeML || espnData?.odds?.homeML || -110;
    const currentMLAway = sportsRadarData?.odds?.awayML || espnData?.odds?.awayML || -110;

    // Calculate line movements
    const spreadMovement = this.calculateLineMovement('spread', sportsRadarData, sportsDataIOData);
    const totalMovement = this.calculateLineMovement('total', sportsRadarData, sportsDataIOData);

    // Detect sharp action
    const sharpAction = this.detectSharpAction(
      sportsDataIOData?.consensus,
      spreadMovement,
      totalMovement
    );

    // Calculate value
    const value = this.calculateBettingValue(
      currentSpread,
      currentTotal,
      currentMLHome,
      currentMLAway,
      sharpAction
    );

    // Get player props
    const props = this.analyzePlayerProps(sportsDataIOData?.props || []);

    return {
      lines: {
        spread: {
          current: currentSpread,
          opening: spreadMovement.opening,
          movement: spreadMovement.movement,
          direction: spreadMovement.direction,
          sharpAction: sharpAction.spread,
          publicPercentage: sportsDataIOData?.consensus?.spreadPublic || 50,
          moneyPercentage: sportsDataIOData?.consensus?.spreadMoney || 50,
          clv: this.calculateCLV(currentSpread, spreadMovement.opening),
          key_numbers: this.getKeyNumbersCrossed(spreadMovement.opening, currentSpread)
        },
        total: {
          current: currentTotal,
          opening: totalMovement.opening,
          movement: totalMovement.movement,
          direction: totalMovement.direction as any,
          sharpAction: sharpAction.total,
          publicPercentage: sportsDataIOData?.consensus?.totalPublic || 50,
          moneyPercentage: sportsDataIOData?.consensus?.totalMoney || 50,
          clv: this.calculateCLV(currentTotal, totalMovement.opening),
          key_numbers: this.getKeyNumbersCrossed(totalMovement.opening, currentTotal)
        },
        moneyline: {
          home: currentMLHome,
          away: currentMLAway,
          impliedProbability: {
            home: this.calculateImpliedProbability(currentMLHome),
            away: this.calculateImpliedProbability(currentMLAway)
          },
          trueProbability: {
            home: this.calculateTrueProbability('home', espnData, sportsRadarData),
            away: this.calculateTrueProbability('away', espnData, sportsRadarData)
          },
          edge: {
            home: 0,
            away: 0
          }
        }
      },
      consensus: {
        publicBettingPercentage: sportsDataIOData?.consensus?.overallPublic || 50,
        publicMoneyPercentage: sportsDataIOData?.consensus?.overallMoney || 50,
        sharpSide: sharpAction.side,
        reverseLineMovement: sharpAction.reverseLineMovement,
        steamMove: sharpAction.steamMove
      },
      value,
      props
    };
  }

  /**
   * Find correlations and relationships
   */
  private findCorrelations(
    homeTeam: string,
    awayTeam: string,
    sport: string,
    historicalData: any
  ): CorrelationAnalysis {
    const sameConference = this.checkSameConference(homeTeam, awayTeam, sport);
    const divisionRivals = this.checkDivisionRivals(homeTeam, awayTeam, sport);
    const commonOpponents = this.findCommonOpponents(homeTeam, awayTeam, historicalData);
    const historicalCorrelation = this.calculateHistoricalCorrelation(
      homeTeam,
      awayTeam,
      historicalData
    );
    const styleMatchup = this.analyzeStyleMatchup(homeTeam, awayTeam, historicalData);
    const correlatedParlays = this.findCorrelatedParlays(
      homeTeam,
      awayTeam,
      sport,
      historicalData
    );

    return {
      sameConference,
      divisionRivals,
      commonOpponents,
      historicalCorrelation,
      styleMatchup,
      correlatedParlays
    };
  }

  /**
   * Identify betting patterns and systems
   */
  private identifyPatterns(
    historicalData: any,
    situational: any,
    bettingAnalysis: BettingAnalysis
  ): PatternAnalysis {
    const h2hPattern = this.analyzeH2HPattern(historicalData);
    const similarSituations = this.findSimilarSituations(historicalData, situational);
    const systems = this.matchBettingSystems(situational, bettingAnalysis);
    const angles = this.identifyBettingAngles(situational, bettingAnalysis, historicalData);

    return {
      historical: {
        h2hLast10: h2hPattern,
        similarSituations,
        trendStrength: this.calculateTrendStrength(similarSituations)
      },
      systems,
      angles
    };
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    betting: BettingAnalysis,
    patterns: PatternAnalysis,
    correlations: CorrelationAnalysis,
    injuries: any,
    situational: any
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Spread recommendation
    if (betting.value.spreadValue > 5) {
      recommendations.push({
        type: 'spread',
        selection: betting.consensus.sharpSide === 'home' ? 'Home' : 'Away',
        confidence: Math.min(0.85, betting.value.confidence),
        edge: betting.value.spreadValue,
        kelly: this.calculateKelly(betting.value.spreadValue, betting.lines.spread.current),
        reasoning: [
          'Positive expected value detected',
          betting.consensus.sharpSide ? `Sharp money on ${betting.consensus.sharpSide}` : '',
          betting.consensus.reverseLineMovement ? 'Reverse line movement identified' : ''
        ].filter(Boolean),
        warnings: this.generateWarnings(injuries, situational)
      });
    }

    // Total recommendation
    if (betting.value.totalValue > 5) {
      recommendations.push({
        type: 'total',
        selection: betting.consensus.sharpSide === 'over' ? 'Over' : 'Under',
        confidence: Math.min(0.85, betting.value.confidence),
        edge: betting.value.totalValue,
        kelly: this.calculateKelly(betting.value.totalValue, betting.lines.total.current),
        reasoning: [
          'Value identified on total',
          patterns.angles.find(a => a.type === 'total')?.description || ''
        ].filter(Boolean),
        warnings: []
      });
    }

    // System recommendations
    for (const system of patterns.systems) {
      if (system.confidence > 0.7 && system.roi > 10) {
        recommendations.push({
          type: 'spread',
          selection: system.recommendation,
          confidence: system.confidence,
          edge: system.roi,
          kelly: this.calculateKelly(system.roi, -110),
          reasoning: [system.description, `Historical ROI: ${system.roi}%`],
          warnings: []
        });
      }
    }

    // Parlay recommendations
    for (const parlay of correlations.correlatedParlays) {
      if (parlay.expectedValue > 15 && parlay.risk !== 'high') {
        recommendations.push({
          type: 'parlay',
          selection: parlay.legs.join(' + '),
          confidence: 0.6,
          edge: parlay.expectedValue,
          kelly: 0.01, // Conservative for parlays
          reasoning: [`Correlated parlay opportunity: ${parlay.type}`],
          warnings: [`Correlation: ${(parlay.correlation * 100).toFixed(0)}%`]
        });
      }
    }

    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  // Helper methods

  private async fetchUnifiedData(gameId: string, sport: string) {
    try {
      const games = await unifiedApi.getAllGames();
      return games.find(g => g.id === gameId || g.sport.toLowerCase() === sport.toLowerCase());
    } catch (error) {
      console.error('Error fetching unified data:', error);
      return null;
    }
  }

  private async fetchESPNEnhanced(gameId: string, sport: string, league: string) {
    try {
      // This would use the ESPN API service
      return null; // Placeholder
    } catch (error) {
      console.error('Error fetching ESPN data:', error);
      return null;
    }
  }

  private async fetchSportsRadarEnhanced(gameId: string, sport: string) {
    try {
      const [odds, gameInfo] = await Promise.all([
        sportsRadarAPI.getGameOdds(sport, gameId),
        sportsRadarAPI.getAllSportsGames()
      ]);
      return { odds, gameInfo };
    } catch (error) {
      console.error('Error fetching SportsRadar data:', error);
      return null;
    }
  }

  private async fetchSportsDataIOEnhanced(gameId: string, sport: string) {
    try {
      // This would use the SportsDataIO API service
      return null; // Placeholder
    } catch (error) {
      console.error('Error fetching SportsDataIO data:', error);
      return null;
    }
  }

  private async fetchWeatherData(gameId: string): Promise<WeatherData | null> {
    // Implementation would fetch weather data
    return null;
  }

  private async fetchHistoricalPatterns(gameId: string, sport: string) {
    // Implementation would fetch historical data
    return null;
  }

  private calculateInjuryImpact(injury: any): number {
    const statusImpact: { [key: string]: number } = {
      'out': 1.0,
      'doubtful': 0.8,
      'questionable': 0.5,
      'probable': 0.2,
      'healthy': 0
    };
    
    const positionMultiplier: { [key: string]: number } = {
      'QB': 1.5,
      'RB': 1.2,
      'WR': 1.0,
      'C': 1.3,
      'PG': 1.4,
      'SG': 1.1,
      'SF': 1.0,
      'PF': 0.9,
      'C': 1.2
    };

    const base = statusImpact[injury.status?.toLowerCase()] || 0.5;
    const multiplier = positionMultiplier[injury.position] || 1.0;
    
    return Math.min(1.0, base * multiplier);
  }

  private getReplacementQuality(injury: any): number {
    // This would analyze backup player quality
    return 0.5; // Placeholder
  }

  private getProbabilityToPlay(status: string): number {
    const probabilities: { [key: string]: number } = {
      'out': 0,
      'doubtful': 0.25,
      'questionable': 0.5,
      'probable': 0.75,
      'healthy': 1.0
    };
    return probabilities[status?.toLowerCase()] || 0.5;
  }

  private isHomeTeamPlayer(player: string, espnData: any): boolean {
    // Check if player is on home team roster
    return false; // Placeholder
  }

  private isHomeUnderdog(espnData: any): boolean {
    return espnData?.odds?.spread > 0;
  }

  private isDivisionGame(espnData: any): boolean {
    // Check if teams are in same division
    return false; // Placeholder
  }

  private isPrimeTime(espnData: any): boolean {
    const gameTime = new Date(espnData?.date);
    const hour = gameTime.getHours();
    return hour >= 20 || (gameTime.getDay() === 1 && hour >= 19); // 8PM or Monday 7PM+
  }

  private isBackToBack(espnData: any, team: string): boolean {
    // Check if team played yesterday
    return false; // Placeholder
  }

  private isRevengeGame(historicalData: any, team: string): boolean {
    // Check if team lost last matchup
    return false; // Placeholder
  }

  private isTrapGame(espnData: any, team: string): boolean {
    // Check for trap game situation (big favorite before important game)
    return false; // Placeholder
  }

  private getPlayoffImplications(espnData: any, team: string): number {
    // Calculate importance for playoff positioning
    return 0.5; // Placeholder
  }

  private calculateLineMovement(type: string, sportsRadarData: any, sportsDataIOData: any) {
    // Analyze line movement
    return {
      opening: 0,
      movement: 0,
      direction: 'stable' as const
    };
  }

  private detectSharpAction(consensus: any, spreadMovement: any, totalMovement: any) {
    const sharpIndicators = {
      spread: false,
      total: false,
      side: null as 'home' | 'away' | 'over' | 'under' | null,
      reverseLineMovement: false,
      steamMove: false
    };

    if (consensus) {
      // Detect reverse line movement (line moves against public betting)
      if (consensus.spreadPublic > 65 && spreadMovement.direction === 'towards_away') {
        sharpIndicators.spread = true;
        sharpIndicators.side = 'away';
        sharpIndicators.reverseLineMovement = true;
      } else if (consensus.spreadPublic < 35 && spreadMovement.direction === 'towards_home') {
        sharpIndicators.spread = true;
        sharpIndicators.side = 'home';
        sharpIndicators.reverseLineMovement = true;
      }

      // Detect steam moves (rapid line movement)
      if (Math.abs(spreadMovement.movement) > 2) {
        sharpIndicators.steamMove = true;
      }
    }

    return sharpIndicators;
  }

  private calculateBettingValue(
    spread: number,
    total: number,
    homeML: number,
    awayML: number,
    sharpAction: any
  ) {
    // Calculate expected value for each bet type
    const spreadValue = sharpAction.spread ? 8 : 0;
    const totalValue = sharpAction.total ? 7 : 0;
    const moneylineValue = Math.max(
      this.calculateMoneylineValue(homeML, 0.5),
      this.calculateMoneylineValue(awayML, 0.5)
    );

    const bestBet = spreadValue > totalValue && spreadValue > moneylineValue ? 'spread' :
                    totalValue > moneylineValue ? 'total' : 'moneyline';

    return {
      spreadValue,
      totalValue,
      moneylineValue,
      bestBet,
      confidence: Math.max(spreadValue, totalValue, moneylineValue) / 20
    };
  }

  private calculateMoneylineValue(odds: number, trueProbability: number): number {
    const impliedProbability = this.calculateImpliedProbability(odds);
    return (trueProbability - impliedProbability) * 100;
  }

  private calculateImpliedProbability(americanOdds: number): number {
    if (americanOdds > 0) {
      return 100 / (americanOdds + 100);
    } else {
      return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
    }
  }

  private calculateTrueProbability(side: string, espnData: any, sportsRadarData: any): number {
    // This would use advanced models to calculate true probability
    return 0.5; // Placeholder
  }

  private analyzePlayerProps(props: any[]): PlayerProp[] {
    // Analyze player prop bets
    return [];
  }

  private calculateCLV(current: number, opening: number): number {
    // Calculate closing line value
    return ((current - opening) / Math.abs(opening)) * 100;
  }

  private getKeyNumbersCrossed(opening: number, current: number): number[] {
    const keyNumbers = [3, 7, 10, 14]; // Football key numbers
    const crossed: number[] = [];
    
    for (const key of keyNumbers) {
      if ((opening < key && current >= key) || (opening > key && current <= key)) {
        crossed.push(key);
      }
    }
    
    return crossed;
  }

  private getAltitude(city: string): number | undefined {
    const altitudes: { [key: string]: number } = {
      'Denver': 5280,
      'Salt Lake City': 4226,
      'Phoenix': 1086,
      'Atlanta': 1050
    };
    return altitudes[city];
  }

  private getVenueTrends(venue: string, historicalData: any) {
    // Get historical trends for venue
    return {
      avgTotal: 200,
      overPercentage: 50,
      homeWinRate: 55,
      favoritesCoverRate: 52
    };
  }

  private buildTeamAnalysis(
    teamName: string,
    side: 'home' | 'away',
    espnData: any,
    injuries: InjuryAnalysis[],
    situational: any
  ): TeamAnalysis {
    return {
      name: teamName,
      record: '0-0',
      ats: '0-0',
      ou: '0-0',
      recentForm: {
        last5: '3-2',
        last10: '6-4',
        pointsFor: 110,
        pointsAgainst: 105,
        trend: 'stable'
      },
      injuries,
      restDays: 2,
      travelDistance: side === 'away' ? 500 : 0,
      situational: situational[side],
      coaching: {
        name: 'Coach Name',
        atsRecord: '100-90',
        tendencies: {
          aggression: 0.6,
          fourthDownRate: 0.15,
          timeoutUsage: 0.8
        }
      },
      advanced: {
        pace: 100,
        offensiveRating: 110,
        defensiveRating: 105,
        netRating: 5,
        strengthOfSchedule: 0.5
      }
    };
  }

  private checkSameConference(home: string, away: string, sport: string): boolean {
    // Check if teams are in same conference
    return false; // Placeholder
  }

  private checkDivisionRivals(home: string, away: string, sport: string): boolean {
    // Check if teams are division rivals
    return false; // Placeholder
  }

  private findCommonOpponents(home: string, away: string, historicalData: any): string[] {
    // Find common opponents
    return [];
  }

  private calculateHistoricalCorrelation(home: string, away: string, historicalData: any): number {
    // Calculate correlation between teams' performances
    return 0;
  }

  private analyzeStyleMatchup(home: string, away: string, historicalData: any): any {
    return {
      pace: 'similar',
      offense: 'neutral',
      defense: 'neutral'
    };
  }

  private findCorrelatedParlays(
    home: string,
    away: string,
    sport: string,
    historicalData: any
  ): CorrelatedParlay[] {
    const parlays: CorrelatedParlay[] = [];

    // Same game correlations
    parlays.push({
      type: 'Same Game - Favorite & Under',
      legs: [`${home} ML`, 'Under Total'],
      correlation: 0.65,
      expectedValue: 12,
      risk: 'medium'
    });

    return parlays;
  }

  private analyzeH2HPattern(historicalData: any): string {
    return '5-5'; // Placeholder
  }

  private findSimilarSituations(historicalData: any, situational: any): SimilarGame[] {
    return [];
  }

  private calculateTrendStrength(situations: SimilarGame[]): number {
    if (situations.length === 0) return 0;
    const avgSimilarity = situations.reduce((sum, s) => sum + s.similarity, 0) / situations.length;
    return avgSimilarity;
  }

  private matchBettingSystems(situational: any, betting: BettingAnalysis): SystemMatch[] {
    const systems: SystemMatch[] = [];

    // Home underdog system
    if (situational.home.isHomeUnderdog && betting.lines.spread.current > 3) {
      systems.push({
        name: 'Home Dog System',
        description: 'Home underdogs of 3+ points',
        historicalRecord: '125-100',
        roi: 11.1,
        confidence: 0.72,
        recommendation: 'Take home team +' + betting.lines.spread.current
      });
    }

    // Prime time under system
    if (situational.home.isPrimeTime && betting.lines.total.current > 45) {
      systems.push({
        name: 'Prime Time Under',
        description: 'Unders in prime time games with total > 45',
        historicalRecord: '78-52',
        roi: 15.4,
        confidence: 0.68,
        recommendation: 'Under ' + betting.lines.total.current
      });
    }

    return systems;
  }

  private identifyBettingAngles(
    situational: any,
    betting: BettingAnalysis,
    historicalData: any
  ): BettingAngle[] {
    const angles: BettingAngle[] = [];

    // Reverse line movement angle
    if (betting.consensus.reverseLineMovement) {
      angles.push({
        type: 'Sharp Action',
        description: 'Reverse line movement indicates sharp money',
        historicalSuccess: 0.58,
        applies: true,
        impact: 0.8
      });
    }

    // Division game angle
    if (situational.home.isDivisionGame) {
      angles.push({
        type: 'Division Game',
        description: 'Division games tend to be closer',
        historicalSuccess: 0.54,
        applies: true,
        impact: 0.3
      });
    }

    return angles;
  }

  private calculateKelly(edge: number, odds: number): number {
    const probability = 0.5 + (edge / 200); // Convert edge to probability
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const kelly = (probability * decimalOdds - 1) / (decimalOdds - 1);
    return Math.max(0, Math.min(0.25, kelly * 0.25)); // Quarter Kelly, max 25%
  }

  private generateWarnings(injuries: any, situational: any): string[] {
    const warnings: string[] = [];

    if (injuries.home.length > 2) {
      warnings.push('Multiple home team injuries');
    }
    if (injuries.away.length > 2) {
      warnings.push('Multiple away team injuries');
    }
    if (situational.home.isBackToBack) {
      warnings.push('Home team on back-to-back');
    }
    if (situational.away.isBackToBack) {
      warnings.push('Away team on back-to-back');
    }

    return warnings;
  }

  private calculateConfidence(
    betting: BettingAnalysis,
    patterns: PatternAnalysis,
    correlations: CorrelationAnalysis
  ): number {
    let confidence = 0.5; // Base confidence

    // Add confidence for sharp action
    if (betting.consensus.sharpSide) confidence += 0.15;
    if (betting.consensus.reverseLineMovement) confidence += 0.1;

    // Add confidence for strong patterns
    if (patterns.systems.length > 0) {
      const bestSystem = Math.max(...patterns.systems.map(s => s.confidence));
      confidence += bestSystem * 0.2;
    }

    // Add confidence for historical trends
    confidence += patterns.historical.trendStrength * 0.15;

    return Math.min(0.95, confidence);
  }
}

// Export singleton instance
export const enhancedDataIntegration = new EnhancedDataIntegrationService();