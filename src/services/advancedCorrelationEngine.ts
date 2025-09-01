/**
 * Advanced Correlation Analysis Engine
 * Identifies complex relationships between games, teams, and betting patterns
 */

export interface CorrelationMatrix {
  games: GameCorrelation[];
  teams: TeamCorrelation[];
  props: PropCorrelation[];
  parlayOpportunities: ParlayOpportunity[];
  riskAnalysis: RiskAnalysis;
}

interface GameCorrelation {
  game1: string;
  game2: string;
  correlationScore: number; // -1 to 1
  type: 'positive' | 'negative' | 'neutral';
  factors: CorrelationFactor[];
  confidence: number;
}

interface TeamCorrelation {
  team1: string;
  team2: string;
  relationship: 'division' | 'conference' | 'interconference' | 'historical';
  performanceCorrelation: number;
  bettingCorrelation: number;
  sharedFactors: string[];
}

interface PropCorrelation {
  player1: string;
  player2: string;
  prop1: string;
  prop2: string;
  correlation: number;
  type: 'teammate' | 'opponent' | 'similar_role' | 'game_script';
  historicalAccuracy: number;
}

interface CorrelationFactor {
  name: string;
  impact: number;
  description: string;
}

interface ParlayOpportunity {
  id: string;
  legs: ParlayLeg[];
  correlationType: 'positive' | 'negative' | 'mixed';
  expectedValue: number;
  kellyStake: number;
  confidence: number;
  warnings: string[];
  historicalPerformance: {
    similar: number;
    wins: number;
    losses: number;
    roi: number;
  };
}

interface ParlayLeg {
  gameId: string;
  team: string;
  betType: 'spread' | 'total' | 'moneyline' | 'prop';
  selection: string;
  odds: number;
  correlation: number; // With other legs
}

interface RiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high';
  concentrationRisk: number;
  correlationRisk: number;
  volatilityIndex: number;
  recommendations: string[];
}

export class AdvancedCorrelationEngine {
  private historicalData: Map<string, any> = new Map();
  private readonly CORRELATION_THRESHOLD = 0.3;
  private readonly NEGATIVE_CORRELATION_THRESHOLD = -0.3;

  /**
   * Analyze all correlations for today's games
   */
  async analyzeCorrelations(games: any[]): Promise<CorrelationMatrix> {
    console.log(`🔍 Analyzing correlations for ${games.length} games`);

    // Analyze game-to-game correlations
    const gameCorrelations = this.analyzeGameCorrelations(games);

    // Analyze team correlations
    const teamCorrelations = this.analyzeTeamCorrelations(games);

    // Analyze prop correlations
    const propCorrelations = await this.analyzePropCorrelations(games);

    // Find parlay opportunities
    const parlayOpportunities = this.findParlayOpportunities(
      games,
      gameCorrelations,
      teamCorrelations,
      propCorrelations
    );

    // Calculate risk analysis
    const riskAnalysis = this.calculateRiskAnalysis(
      gameCorrelations,
      parlayOpportunities
    );

    return {
      games: gameCorrelations,
      teams: teamCorrelations,
      props: propCorrelations,
      parlayOpportunities,
      riskAnalysis
    };
  }

  /**
   * Analyze correlations between games
   */
  private analyzeGameCorrelations(games: any[]): GameCorrelation[] {
    const correlations: GameCorrelation[] = [];

    for (let i = 0; i < games.length; i++) {
      for (let j = i + 1; j < games.length; j++) {
        const correlation = this.calculateGameCorrelation(games[i], games[j]);
        
        if (Math.abs(correlation.correlationScore) > this.CORRELATION_THRESHOLD) {
          correlations.push(correlation);
        }
      }
    }

    return correlations.sort((a, b) => 
      Math.abs(b.correlationScore) - Math.abs(a.correlationScore)
    );
  }

  /**
   * Calculate correlation between two games
   */
  private calculateGameCorrelation(game1: any, game2: any): GameCorrelation {
    const factors: CorrelationFactor[] = [];
    let totalCorrelation = 0;

    // Same sport correlation
    if (game1.sport === game2.sport) {
      const sportCorr = this.getSportCorrelation(game1.sport);
      factors.push({
        name: 'Same Sport',
        impact: sportCorr,
        description: `Both ${game1.sport} games`
      });
      totalCorrelation += sportCorr;
    }

    // Conference/Division correlation
    if (this.areTeamsRelated(game1, game2)) {
      const relationCorr = 0.4;
      factors.push({
        name: 'Conference/Division',
        impact: relationCorr,
        description: 'Teams from same conference or division'
      });
      totalCorrelation += relationCorr;
    }

    // Time overlap correlation
    const timeCorr = this.calculateTimeCorrelation(game1.startTime, game2.startTime);
    if (Math.abs(timeCorr) > 0.1) {
      factors.push({
        name: 'Time Overlap',
        impact: timeCorr,
        description: 'Games overlap in time'
      });
      totalCorrelation += timeCorr;
    }

    // Weather correlation (for outdoor sports)
    if (this.isOutdoorSport(game1.sport) && this.isOutdoorSport(game2.sport)) {
      const weatherCorr = this.calculateWeatherCorrelation(game1, game2);
      if (weatherCorr > 0) {
        factors.push({
          name: 'Weather Impact',
          impact: weatherCorr,
          description: 'Similar weather conditions'
        });
        totalCorrelation += weatherCorr;
      }
    }

    // Betting pattern correlation
    const bettingCorr = this.calculateBettingCorrelation(game1, game2);
    if (Math.abs(bettingCorr) > 0.2) {
      factors.push({
        name: 'Betting Patterns',
        impact: bettingCorr,
        description: 'Similar betting patterns detected'
      });
      totalCorrelation += bettingCorr;
    }

    // Normalize correlation
    totalCorrelation = Math.max(-1, Math.min(1, totalCorrelation / factors.length));

    return {
      game1: game1.id,
      game2: game2.id,
      correlationScore: totalCorrelation,
      type: totalCorrelation > 0.3 ? 'positive' : 
            totalCorrelation < -0.3 ? 'negative' : 'neutral',
      factors,
      confidence: this.calculateConfidence(factors)
    };
  }

  /**
   * Analyze team-to-team correlations
   */
  private analyzeTeamCorrelations(games: any[]): TeamCorrelation[] {
    const correlations: TeamCorrelation[] = [];
    const teamsAnalyzed = new Set<string>();

    for (const game of games) {
      const teams = [game.homeTeam, game.awayTeam];
      
      for (const team1 of teams) {
        if (teamsAnalyzed.has(team1)) continue;
        
        for (const otherGame of games) {
          if (otherGame.id === game.id) continue;
          
          const otherTeams = [otherGame.homeTeam, otherGame.awayTeam];
          for (const team2 of otherTeams) {
            if (team1 === team2 || teamsAnalyzed.has(`${team1}-${team2}`)) continue;
            
            const correlation = this.calculateTeamCorrelation(team1, team2, games);
            if (correlation.performanceCorrelation > this.CORRELATION_THRESHOLD ||
                correlation.bettingCorrelation > this.CORRELATION_THRESHOLD) {
              correlations.push(correlation);
              teamsAnalyzed.add(`${team1}-${team2}`);
              teamsAnalyzed.add(`${team2}-${team1}`);
            }
          }
        }
        teamsAnalyzed.add(team1);
      }
    }

    return correlations;
  }

  /**
   * Calculate correlation between two teams
   */
  private calculateTeamCorrelation(team1: string, team2: string, games: any[]): TeamCorrelation {
    const relationship = this.getTeamRelationship(team1, team2);
    const sharedFactors: string[] = [];

    // Performance correlation
    const perfCorr = this.calculatePerformanceCorrelation(team1, team2);

    // Betting correlation
    const betCorr = this.calculateTeamBettingCorrelation(team1, team2);

    // Shared factors
    if (this.haveSameCoach(team1, team2)) {
      sharedFactors.push('Coaching tree connection');
    }
    if (this.recentlyTraded(team1, team2)) {
      sharedFactors.push('Recent player trades');
    }
    if (this.similarPlayStyle(team1, team2)) {
      sharedFactors.push('Similar playing style');
    }

    return {
      team1,
      team2,
      relationship,
      performanceCorrelation: perfCorr,
      bettingCorrelation: betCorr,
      sharedFactors
    };
  }

  /**
   * Analyze prop bet correlations
   */
  private async analyzePropCorrelations(games: any[]): Promise<PropCorrelation[]> {
    const correlations: PropCorrelation[] = [];

    for (const game of games) {
      if (!game.props || game.props.length === 0) continue;

      // Analyze same-game prop correlations
      const sameGameCorrs = this.analyzeSameGameProps(game.props, game);
      correlations.push(...sameGameCorrs);

      // Analyze cross-game prop correlations
      for (const otherGame of games) {
        if (otherGame.id === game.id || !otherGame.props) continue;
        
        const crossGameCorrs = this.analyzeCrossGameProps(
          game.props,
          otherGame.props,
          game,
          otherGame
        );
        correlations.push(...crossGameCorrs);
      }
    }

    return correlations.filter(c => Math.abs(c.correlation) > 0.4);
  }

  /**
   * Analyze same-game prop correlations
   */
  private analyzeSameGameProps(props: any[], game: any): PropCorrelation[] {
    const correlations: PropCorrelation[] = [];

    for (let i = 0; i < props.length; i++) {
      for (let j = i + 1; j < props.length; j++) {
        const prop1 = props[i];
        const prop2 = props[j];

        // Teammate correlations
        if (prop1.team === prop2.team) {
          const correlation = this.calculateTeammatePropsCorrelation(prop1, prop2);
          if (Math.abs(correlation) > 0.4) {
            correlations.push({
              player1: prop1.player,
              player2: prop2.player,
              prop1: prop1.type,
              prop2: prop2.type,
              correlation,
              type: 'teammate',
              historicalAccuracy: this.getHistoricalPropAccuracy(prop1, prop2)
            });
          }
        }

        // Game script correlations
        const scriptCorr = this.calculateGameScriptCorrelation(prop1, prop2, game);
        if (Math.abs(scriptCorr) > 0.5) {
          correlations.push({
            player1: prop1.player,
            player2: prop2.player,
            prop1: prop1.type,
            prop2: prop2.type,
            correlation: scriptCorr,
            type: 'game_script',
            historicalAccuracy: this.getHistoricalPropAccuracy(prop1, prop2)
          });
        }
      }
    }

    return correlations;
  }

  /**
   * Analyze cross-game prop correlations
   */
  private analyzeCrossGameProps(
    props1: any[],
    props2: any[],
    game1: any,
    game2: any
  ): PropCorrelation[] {
    const correlations: PropCorrelation[] = [];

    for (const prop1 of props1) {
      for (const prop2 of props2) {
        // Similar role correlations
        if (this.haveSimilarRole(prop1.player, prop2.player)) {
          const correlation = this.calculateSimilarRoleCorrelation(prop1, prop2);
          if (Math.abs(correlation) > 0.3) {
            correlations.push({
              player1: prop1.player,
              player2: prop2.player,
              prop1: prop1.type,
              prop2: prop2.type,
              correlation,
              type: 'similar_role',
              historicalAccuracy: this.getHistoricalPropAccuracy(prop1, prop2)
            });
          }
        }
      }
    }

    return correlations;
  }

  /**
   * Find optimal parlay opportunities based on correlations
   */
  private findParlayOpportunities(
    games: any[],
    gameCorrelations: GameCorrelation[],
    teamCorrelations: TeamCorrelation[],
    propCorrelations: PropCorrelation[]
  ): ParlayOpportunity[] {
    const opportunities: ParlayOpportunity[] = [];

    // Find negative correlation parlays (best for risk reduction)
    const negativeCorrelationParlays = this.findNegativeCorrelationParlays(
      games,
      gameCorrelations
    );
    opportunities.push(...negativeCorrelationParlays);

    // Find same-game parlays with positive correlation
    const sameGameParlays = this.findSameGameParlays(games, propCorrelations);
    opportunities.push(...sameGameParlays);

    // Find cross-sport parlays with low correlation
    const crossSportParlays = this.findCrossSportParlays(games, gameCorrelations);
    opportunities.push(...crossSportParlays);

    // Find value parlays based on sharp action
    const valueParlays = this.findValueParlays(games);
    opportunities.push(...valueParlays);

    // Sort by expected value
    return opportunities
      .sort((a, b) => b.expectedValue - a.expectedValue)
      .slice(0, 20); // Top 20 opportunities
  }

  /**
   * Find parlays with negative correlation (hedge opportunities)
   */
  private findNegativeCorrelationParlays(
    games: any[],
    correlations: GameCorrelation[]
  ): ParlayOpportunity[] {
    const opportunities: ParlayOpportunity[] = [];

    for (const correlation of correlations) {
      if (correlation.type !== 'negative') continue;

      const game1 = games.find(g => g.id === correlation.game1);
      const game2 = games.find(g => g.id === correlation.game2);

      if (!game1 || !game2) continue;

      // Create negative correlation parlay
      const legs: ParlayLeg[] = [
        {
          gameId: game1.id,
          team: game1.homeTeam,
          betType: 'spread',
          selection: `${game1.homeTeam} ${game1.spread > 0 ? '+' : ''}${game1.spread}`,
          odds: -110,
          correlation: correlation.correlationScore
        },
        {
          gameId: game2.id,
          team: game2.awayTeam,
          betType: 'spread',
          selection: `${game2.awayTeam} ${game2.spread < 0 ? '+' : ''}${-game2.spread}`,
          odds: -110,
          correlation: correlation.correlationScore
        }
      ];

      const ev = this.calculateParlayEV(legs);
      const kelly = this.calculateKellyStake(ev, legs);

      opportunities.push({
        id: `neg_corr_${correlation.game1}_${correlation.game2}`,
        legs,
        correlationType: 'negative',
        expectedValue: ev,
        kellyStake: kelly,
        confidence: correlation.confidence,
        warnings: [],
        historicalPerformance: this.getHistoricalParlayPerformance(legs)
      });
    }

    return opportunities;
  }

  /**
   * Find same-game parlays
   */
  private findSameGameParlays(games: any[], propCorrelations: PropCorrelation[]): ParlayOpportunity[] {
    const opportunities: ParlayOpportunity[] = [];

    for (const game of games) {
      // Find correlated props for this game
      const gameProps = propCorrelations.filter(p => 
        p.type === 'teammate' || p.type === 'game_script'
      );

      if (gameProps.length < 2) continue;

      // Build same-game parlay
      const legs: ParlayLeg[] = [];
      
      // Add main bet
      legs.push({
        gameId: game.id,
        team: game.homeTeam,
        betType: 'spread',
        selection: `${game.homeTeam} ${game.spread > 0 ? '+' : ''}${game.spread}`,
        odds: -110,
        correlation: 0.5
      });

      // Add correlated props
      for (const prop of gameProps.slice(0, 2)) {
        legs.push({
          gameId: game.id,
          team: game.homeTeam,
          betType: 'prop',
          selection: `${prop.player1} ${prop.prop1}`,
          odds: -120,
          correlation: prop.correlation
        });
      }

      const ev = this.calculateParlayEV(legs);
      const kelly = this.calculateKellyStake(ev, legs);

      if (ev > 10) {
        opportunities.push({
          id: `sgp_${game.id}`,
          legs,
          correlationType: 'positive',
          expectedValue: ev,
          kellyStake: kelly,
          confidence: 0.65,
          warnings: ['Same game correlation risk'],
          historicalPerformance: this.getHistoricalParlayPerformance(legs)
        });
      }
    }

    return opportunities;
  }

  /**
   * Find cross-sport parlays
   */
  private findCrossSportParlays(
    games: any[],
    correlations: GameCorrelation[]
  ): ParlayOpportunity[] {
    const opportunities: ParlayOpportunity[] = [];
    const sportGroups = this.groupGamesBySport(games);

    if (sportGroups.size < 2) return opportunities;

    // Find games from different sports with low correlation
    for (const [sport1, games1] of sportGroups) {
      for (const [sport2, games2] of sportGroups) {
        if (sport1 === sport2) continue;

        for (const game1 of games1) {
          for (const game2 of games2) {
            const correlation = correlations.find(c => 
              (c.game1 === game1.id && c.game2 === game2.id) ||
              (c.game1 === game2.id && c.game2 === game1.id)
            );

            // Low correlation is good for cross-sport
            if (!correlation || Math.abs(correlation.correlationScore) < 0.2) {
              const legs: ParlayLeg[] = [
                {
                  gameId: game1.id,
                  team: game1.homeTeam,
                  betType: 'moneyline',
                  selection: game1.homeTeam,
                  odds: game1.homeML || -150,
                  correlation: 0
                },
                {
                  gameId: game2.id,
                  team: game2.homeTeam,
                  betType: 'moneyline',
                  selection: game2.homeTeam,
                  odds: game2.homeML || -150,
                  correlation: 0
                }
              ];

              const ev = this.calculateParlayEV(legs);
              const kelly = this.calculateKellyStake(ev, legs);

              if (ev > 8) {
                opportunities.push({
                  id: `cross_${game1.id}_${game2.id}`,
                  legs,
                  correlationType: 'mixed',
                  expectedValue: ev,
                  kellyStake: kelly,
                  confidence: 0.7,
                  warnings: [],
                  historicalPerformance: this.getHistoricalParlayPerformance(legs)
                });
              }
            }
          }
        }
      }
    }

    return opportunities;
  }

  /**
   * Find value parlays based on sharp action and line movement
   */
  private findValueParlays(games: any[]): ParlayOpportunity[] {
    const opportunities: ParlayOpportunity[] = [];
    const sharpGames = games.filter(g => g.sharpAction || g.reverseLineMovement);

    if (sharpGames.length < 2) return opportunities;

    // Combine sharp plays into parlays
    for (let i = 0; i < sharpGames.length; i++) {
      for (let j = i + 1; j < Math.min(i + 4, sharpGames.length); j++) {
        const game1 = sharpGames[i];
        const game2 = sharpGames[j];

        const legs: ParlayLeg[] = [
          {
            gameId: game1.id,
            team: game1.sharpSide === 'home' ? game1.homeTeam : game1.awayTeam,
            betType: 'spread',
            selection: `${game1.sharpSide === 'home' ? game1.homeTeam : game1.awayTeam} ${game1.spread}`,
            odds: -110,
            correlation: 0.1
          },
          {
            gameId: game2.id,
            team: game2.sharpSide === 'home' ? game2.homeTeam : game2.awayTeam,
            betType: 'spread',
            selection: `${game2.sharpSide === 'home' ? game2.homeTeam : game2.awayTeam} ${game2.spread}`,
            odds: -110,
            correlation: 0.1
          }
        ];

        const ev = this.calculateParlayEV(legs);
        const kelly = this.calculateKellyStake(ev, legs);

        if (ev > 12) {
          opportunities.push({
            id: `value_${game1.id}_${game2.id}`,
            legs,
            correlationType: 'mixed',
            expectedValue: ev,
            kellyStake: kelly,
            confidence: 0.75,
            warnings: [],
            historicalPerformance: this.getHistoricalParlayPerformance(legs)
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Calculate risk analysis for all correlations
   */
  private calculateRiskAnalysis(
    correlations: GameCorrelation[],
    parlays: ParlayOpportunity[]
  ): RiskAnalysis {
    // Calculate concentration risk
    const concentrationRisk = this.calculateConcentrationRisk(parlays);

    // Calculate correlation risk
    const correlationRisk = this.calculateCorrelationRisk(correlations);

    // Calculate volatility
    const volatilityIndex = this.calculateVolatilityIndex(parlays);

    // Determine overall risk level
    const overallRisk = 
      concentrationRisk > 0.7 || correlationRisk > 0.7 || volatilityIndex > 0.7 ? 'high' :
      concentrationRisk > 0.4 || correlationRisk > 0.4 || volatilityIndex > 0.4 ? 'medium' :
      'low';

    // Generate recommendations
    const recommendations: string[] = [];

    if (concentrationRisk > 0.5) {
      recommendations.push('Diversify bets across different games and sports');
    }
    if (correlationRisk > 0.5) {
      recommendations.push('Reduce exposure to highly correlated games');
    }
    if (volatilityIndex > 0.5) {
      recommendations.push('Consider smaller bet sizes due to high volatility');
    }
    if (overallRisk === 'low') {
      recommendations.push('Risk levels are acceptable for current portfolio');
    }

    return {
      overallRisk,
      concentrationRisk,
      correlationRisk,
      volatilityIndex,
      recommendations
    };
  }

  // Helper methods

  private getSportCorrelation(sport: string): number {
    const correlations: { [key: string]: number } = {
      'NFL': 0.15,
      'NBA': 0.20,
      'MLB': 0.10,
      'NHL': 0.18,
      'NCAAF': 0.12,
      'NCAAB': 0.22
    };
    return correlations[sport] || 0.1;
  }

  private areTeamsRelated(game1: any, game2: any): boolean {
    // Check if teams share conference/division
    return false; // Placeholder
  }

  private calculateTimeCorrelation(time1: Date, time2: Date): number {
    const diff = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60 * 60); // Hours
    if (diff < 1) return 0.3; // Same time
    if (diff < 3) return 0.1; // Close times
    return 0;
  }

  private isOutdoorSport(sport: string): boolean {
    return ['NFL', 'MLB', 'NCAAF', 'MLS'].includes(sport);
  }

  private calculateWeatherCorrelation(game1: any, game2: any): number {
    if (!game1.weather || !game2.weather) return 0;
    
    // Similar weather conditions increase correlation
    const tempDiff = Math.abs(game1.weather.temp - game2.weather.temp);
    const windDiff = Math.abs(game1.weather.windSpeed - game2.weather.windSpeed);
    
    if (tempDiff < 10 && windDiff < 5) return 0.2;
    if (tempDiff < 20 && windDiff < 10) return 0.1;
    return 0;
  }

  private calculateBettingCorrelation(game1: any, game2: any): number {
    // Similar betting patterns
    if (game1.publicBetting && game2.publicBetting) {
      const diff = Math.abs(game1.publicBetting - game2.publicBetting);
      if (diff < 10) return 0.3;
      if (diff < 20) return 0.1;
    }
    return 0;
  }

  private calculateConfidence(factors: CorrelationFactor[]): number {
    if (factors.length === 0) return 0;
    const avgImpact = factors.reduce((sum, f) => sum + Math.abs(f.impact), 0) / factors.length;
    return Math.min(0.95, 0.5 + avgImpact);
  }

  private getTeamRelationship(team1: string, team2: string): any {
    // Determine relationship between teams
    return 'interconference'; // Placeholder
  }

  private calculatePerformanceCorrelation(team1: string, team2: string): number {
    // Calculate how similarly teams perform
    return Math.random() * 0.5; // Placeholder
  }

  private calculateTeamBettingCorrelation(team1: string, team2: string): number {
    // Calculate how similarly teams perform against the spread
    return Math.random() * 0.5; // Placeholder
  }

  private haveSameCoach(team1: string, team2: string): boolean {
    return false; // Placeholder
  }

  private recentlyTraded(team1: string, team2: string): boolean {
    return false; // Placeholder
  }

  private similarPlayStyle(team1: string, team2: string): boolean {
    return false; // Placeholder
  }

  private calculateTeammatePropsCorrelation(prop1: any, prop2: any): number {
    // Points and assists often correlate for teammates
    if ((prop1.type === 'points' && prop2.type === 'assists') ||
        (prop1.type === 'assists' && prop2.type === 'points')) {
      return 0.6;
    }
    // Rebounds can be negatively correlated between teammates
    if (prop1.type === 'rebounds' && prop2.type === 'rebounds') {
      return -0.3;
    }
    return 0.2;
  }

  private calculateGameScriptCorrelation(prop1: any, prop2: any, game: any): number {
    // Winning team tends to have lower passing props late, higher rushing
    if (game.expectedWinner && prop1.team === game.expectedWinner) {
      if (prop1.type === 'passing_yards' && prop2.type === 'rushing_yards') {
        return -0.4;
      }
    }
    return 0;
  }

  private getHistoricalPropAccuracy(prop1: any, prop2: any): number {
    // Historical accuracy of this prop correlation
    return 0.65; // Placeholder
  }

  private haveSimilarRole(player1: string, player2: string): boolean {
    // Check if players have similar roles on their teams
    return false; // Placeholder
  }

  private calculateSimilarRoleCorrelation(prop1: any, prop2: any): number {
    // QBs tend to have similar passing yards in similar matchups
    if (prop1.type === 'passing_yards' && prop2.type === 'passing_yards') {
      return 0.4;
    }
    return 0.2;
  }

  private calculateParlayEV(legs: ParlayLeg[]): number {
    // Calculate expected value of parlay
    const totalOdds = legs.reduce((acc, leg) => {
      const decimal = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
      return acc * decimal;
    }, 1);
    
    const probability = 0.45; // Placeholder - would use actual model
    const ev = ((probability * totalOdds) - 1) * 100;
    
    return ev;
  }

  private calculateKellyStake(ev: number, legs: ParlayLeg[]): number {
    // Kelly criterion for parlay
    const edge = ev / 100;
    const odds = legs.reduce((acc, leg) => {
      const decimal = leg.odds > 0 ? (leg.odds / 100) + 1 : (100 / Math.abs(leg.odds)) + 1;
      return acc * decimal;
    }, 1);
    
    const kelly = edge / (odds - 1);
    return Math.max(0, Math.min(0.05, kelly * 0.25)); // Quarter Kelly, max 5%
  }

  private getHistoricalParlayPerformance(legs: ParlayLeg[]): any {
    // Get historical performance of similar parlays
    return {
      similar: 100,
      wins: 52,
      losses: 48,
      roi: 8.5
    };
  }

  private groupGamesBySport(games: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();
    
    for (const game of games) {
      if (!groups.has(game.sport)) {
        groups.set(game.sport, []);
      }
      groups.get(game.sport)!.push(game);
    }
    
    return groups;
  }

  private calculateConcentrationRisk(parlays: ParlayOpportunity[]): number {
    // Calculate how concentrated bets are
    if (parlays.length === 0) return 0;
    
    const totalStake = parlays.reduce((sum, p) => sum + p.kellyStake, 0);
    const maxStake = Math.max(...parlays.map(p => p.kellyStake));
    
    return maxStake / totalStake;
  }

  private calculateCorrelationRisk(correlations: GameCorrelation[]): number {
    // Calculate overall correlation risk
    if (correlations.length === 0) return 0;
    
    const highCorrelations = correlations.filter(c => 
      Math.abs(c.correlationScore) > 0.6
    );
    
    return highCorrelations.length / correlations.length;
  }

  private calculateVolatilityIndex(parlays: ParlayOpportunity[]): number {
    // Calculate portfolio volatility
    if (parlays.length === 0) return 0;
    
    const evs = parlays.map(p => p.expectedValue);
    const mean = evs.reduce((sum, ev) => sum + ev, 0) / evs.length;
    const variance = evs.reduce((sum, ev) => sum + Math.pow(ev - mean, 2), 0) / evs.length;
    const stdDev = Math.sqrt(variance);
    
    return Math.min(1, stdDev / mean);
  }
}

// Export singleton instance
export const correlationEngine = new AdvancedCorrelationEngine();