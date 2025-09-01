/**
 * Enhanced Analytics Types for Cross-Reference System
 */

import { ESPNTeam, ESPNAthlete, ESPNEvent, ESPNOdds } from '../services/espnApi';
import { LiveGame, TeamStats, OddsData } from '../services/sportsRadarApi';

// Player-Level Analytics
export interface InjuryImpact {
  playerId: string;
  playerName: string;
  team: string;
  position: string;
  status: 'out' | 'doubtful' | 'questionable' | 'probable' | 'healthy';
  probabilityToPlay: number;
  impactScore: number; // 0-1 scale of impact on team performance
  replacementLevel: number; // Quality of backup (0-1)
  historicalImpact: {
    gamesWithout: number;
    winRateWithout: number;
    pointsDiffWithout: number;
  };
}

export interface PerformanceTrend {
  playerId: string;
  playerName: string;
  trend: 'hot' | 'cold' | 'neutral';
  last5Games: {
    averagePoints: number;
    averageRebounds?: number;
    averageAssists?: number;
    efficiency: number;
    vsExpectation: number; // Actual vs expected performance
  };
  last10Games: {
    averagePoints: number;
    efficiency: number;
    consistency: number; // Standard deviation
  };
  streakInfo: {
    type: 'scoring' | 'assists' | 'rebounds' | 'mixed';
    games: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface MatchupAdvantage {
  team: string;
  opponent: string;
  advantages: Array<{
    type: 'pace' | 'style' | 'size' | 'experience' | 'coaching';
    description: string;
    magnitude: number; // -1 to 1, negative favors opponent
  }>;
  h2hRecord: {
    last5: { wins: number; losses: number };
    last10: { wins: number; losses: number };
    allTime: { wins: number; losses: number };
  };
  averageMargin: {
    last5: number;
    last10: number;
    season: number;
  };
}

export interface RestFatigueFactor {
  team: string;
  daysRest: number;
  isBackToBack: boolean;
  gamesInLast7Days: number;
  travelMiles: number;
  timeZoneChange: number;
  fatigueScore: number; // 0-1, higher is more fatigued
  performance: {
    recordOnRest: string;
    recordOnB2B: string;
    recordAfterTravel: string;
  };
}

// Market Intelligence
export interface LineMovement {
  gameId: string;
  timestamp: string;
  lineType: 'spread' | 'total' | 'moneyline';
  opening: {
    line: number;
    odds?: number;
    time: string;
  };
  current: {
    line: number;
    odds?: number;
    time: string;
  };
  movements: Array<{
    from: number;
    to: number;
    odds?: number;
    timestamp: string;
    trigger?: 'sharp' | 'public' | 'news' | 'injury';
  }>;
  direction: 'towards_home' | 'towards_away' | 'towards_over' | 'towards_under' | 'stable';
  magnitude: number; // Size of movement
  velocity: number; // Speed of movement
}

export interface SharpMoneyIndicator {
  gameId: string;
  betType: 'spread' | 'total' | 'moneyline';
  publicBettingPercentage: number;
  publicMoneyPercentage: number;
  sharpSide: 'home' | 'away' | 'over' | 'under' | null;
  reverseLineMovement: boolean;
  steamMove: boolean;
  confidenceLevel: 'high' | 'medium' | 'low';
  signals: Array<{
    type: 'rlm' | 'steam' | 'contrarian' | 'respected_play';
    description: string;
    strength: number;
  }>;
}

export interface ClosingLineValue {
  gameId: string;
  betType: 'spread' | 'total' | 'moneyline';
  projectedClosingLine: number;
  currentLine: number;
  expectedValue: number;
  confidence: number;
  factors: Array<{
    name: string;
    impact: number;
    direction: 'positive' | 'negative';
  }>;
}

// Environmental Factors
export interface HomeAwayPerformance {
  team: string;
  homeSplits: {
    record: string;
    winPercentage: number;
    pointsFor: number;
    pointsAgainst: number;
    atsRecord: string;
    ouRecord: string;
  };
  awaySplits: {
    record: string;
    winPercentage: number;
    pointsFor: number;
    pointsAgainst: number;
    atsRecord: string;
    ouRecord: string;
  };
  differential: {
    winPercentage: number;
    scoring: number;
    defense: number;
  };
}

export interface AltitudeEffect {
  venue: string;
  altitude: number; // in feet
  visitingTeam: string;
  visitingTeamAltitude: number;
  altitudeDifferential: number;
  expectedImpact: {
    endurance: number; // -1 to 1
    shootingPercentage?: number; // for basketball
    fieldGoalRange?: number; // for football
  };
  historicalPerformance: {
    recordAtAltitude: string;
    averagePointsDiff: number;
  };
}

export interface WeatherImpact {
  gameId: string;
  venue: string;
  isOutdoor: boolean;
  isDome: boolean;
  conditions: {
    temperature: number;
    windSpeed: number;
    windDirection: string;
    precipitation: number;
    humidity: number;
    visibility: number;
  };
  impact: {
    passing: number; // -1 to 1
    kicking: number;
    total: number; // Expected impact on total score
    turnovers: number;
  };
  historicalData: {
    similarConditionsGames: number;
    averageTotal: number;
    underPercentage: number;
  };
}

export interface SurfaceEffect {
  venue: string;
  surfaceType: 'grass' | 'turf' | 'hardwood' | 'ice';
  team: string;
  homeSurface: string;
  isSameSurface: boolean;
  performance: {
    recordOnSurface: string;
    pointsFor: number;
    pointsAgainst: number;
    injuryRate: number;
  };
  speedImpact: number; // -1 to 1, impact on game pace
}

export interface TimeZoneImpact {
  team: string;
  homeTimeZone: string;
  gameTimeZone: string;
  hoursDifference: number;
  direction: 'east' | 'west' | 'none';
  gameTime: string;
  bodyClockTime: string; // What time it feels like for the team
  impact: {
    expectedPerformance: number; // -1 to 1
    historicalRecord: string;
    scoringDifferential: number;
  };
}

// Referee Analytics
export interface RefereeAnalytics {
  gameId: string;
  officials: Array<{
    name: string;
    position: string;
    experience: number; // years
  }>;
  headReferee: {
    name: string;
    totalBias: number; // -1 (under) to 1 (over)
    homeBias: number; // -1 (away) to 1 (home)
    averageTotal: number;
    overPercentage: number;
    homeCoverPercentage: number;
    foulsPerGame: number;
    technicalFoulsPerGame: number;
  };
  crewTendencies: {
    totalBias: number;
    paceBias: number; // -1 (slow) to 1 (fast)
    homeAdvantage: number;
    whistleTightness: number; // 0 (loose) to 1 (tight)
  };
  matchupFit: {
    styleCompatibility: number; // How well ref style fits the teams
    expectedImpact: string;
  };
}

// Momentum Indicators
export interface PlayoffPositioning {
  team: string;
  currentSeed: number;
  conferenceRank: number;
  playoffProbability: number;
  seedingScenarios: Array<{
    seed: number;
    probability: number;
    requirement: string;
  }>;
  urgencyLevel: 'must-win' | 'high' | 'medium' | 'low' | 'eliminated';
  remainingSchedule: {
    difficulty: number;
    homeGames: number;
    awayGames: number;
    divisionalGames: number;
  };
}

export interface CoachingChange {
  team: string;
  changeType: 'head-coach' | 'coordinator' | 'none';
  daysSinceChange: number;
  previousCoach: string;
  currentCoach: string;
  recordSinceChange: string;
  performanceChange: {
    scoring: number;
    defense: number;
    winPercentage: number;
  };
  honeymoonEffect: boolean;
}

export interface RevengeGame {
  team: string;
  opponent: string;
  revengeFactors: Array<{
    type: 'previous-loss' | 'playoff-elimination' | 'former-team' | 'division-rival';
    description: string;
    intensity: number; // 0-1
    daysSince: number;
  }>;
  historicalRevenge: {
    record: string;
    averageMargin: number;
    coverPercentage: number;
  };
  motivationScore: number; // 0-1
}

export interface TrapGame {
  team: string;
  factors: Array<{
    type: 'sandwich' | 'lookahead' | 'letdown' | 'travel';
    description: string;
    severity: number; // 0-1
  }>;
  trapScore: number; // 0-1, higher means more likely trap
  historicalPerformance: {
    recordInTrapSpots: string;
    atsRecordInTrapSpots: string;
  };
  mitigatingFactors: string[];
}

// Correlation Analysis
export interface DivisionTrends {
  division: string;
  scoringTrend: 'high' | 'low' | 'average';
  averageTotal: number;
  overPercentage: number;
  paceOfPlay: number;
  commonFactors: string[];
  divisionalGames: {
    averageTotal: number;
    overPercentage: number;
  };
  nonDivisionalGames: {
    averageTotal: number;
    overPercentage: number;
  };
}

export interface StyleMatchup {
  team1: string;
  team2: string;
  team1Style: {
    pace: number;
    offensive: 'balanced' | 'pass-heavy' | 'run-heavy' | 'perimeter' | 'paint';
    defensive: 'aggressive' | 'conservative' | 'zone' | 'man';
  };
  team2Style: {
    pace: number;
    offensive: 'balanced' | 'pass-heavy' | 'run-heavy' | 'perimeter' | 'paint';
    defensive: 'aggressive' | 'conservative' | 'zone' | 'man';
  };
  compatibility: {
    paceConflict: number; // -1 to 1
    styleAdvantage: 'team1' | 'team2' | 'neutral';
    expectedTotal: 'over' | 'under' | 'neutral';
    confidence: number;
  };
}

export interface DayOfWeekPattern {
  team: string;
  patterns: {
    monday: { record: string; ats: string; ou: string };
    tuesday: { record: string; ats: string; ou: string };
    wednesday: { record: string; ats: string; ou: string };
    thursday: { record: string; ats: string; ou: string };
    friday: { record: string; ats: string; ou: string };
    saturday: { record: string; ats: string; ou: string };
    sunday: { record: string; ats: string; ou: string };
  };
  currentDay: string;
  performanceRating: number; // -1 to 1 for current day
}

export interface PublicBias {
  gameId: string;
  publicFavorite: 'home' | 'away';
  publicPercentage: number;
  historicalFade: {
    record: string;
    roi: number;
  };
  biasFactors: Array<{
    type: 'popular-team' | 'primetime' | 'streak' | 'narrative';
    description: string;
    strength: number;
  }>;
  fadeRecommendation: boolean;
  confidence: number;
}

// Main Enhanced Analytics Response
export interface EnhancedAnalytics {
  gameId: string;
  sport: string;
  teams: {
    home: string;
    away: string;
  };
  
  // Player Analytics
  injuries: {
    home: InjuryImpact[];
    away: InjuryImpact[];
    totalImpact: number;
  };
  
  performanceTrends: {
    home: PerformanceTrend[];
    away: PerformanceTrend[];
  };
  
  matchupAdvantages: MatchupAdvantage;
  
  restFatigue: {
    home: RestFatigueFactor;
    away: RestFatigueFactor;
  };
  
  // Market Intelligence
  lineMovements: {
    spread: LineMovement;
    total: LineMovement;
    moneyline: LineMovement;
  };
  
  sharpMoney: SharpMoneyIndicator[];
  closingLineValue: ClosingLineValue[];
  
  // Environmental
  homeAway: {
    home: HomeAwayPerformance;
    away: HomeAwayPerformance;
  };
  
  altitude?: AltitudeEffect;
  weather?: WeatherImpact;
  surface?: SurfaceEffect;
  timeZone: {
    home: TimeZoneImpact;
    away: TimeZoneImpact;
  };
  
  // Referee
  referee: RefereeAnalytics;
  
  // Momentum
  playoffPositioning: {
    home: PlayoffPositioning;
    away: PlayoffPositioning;
  };
  
  coachingChanges: {
    home: CoachingChange;
    away: CoachingChange;
  };
  
  revengeGame?: RevengeGame;
  trapGame?: TrapGame;
  
  // Correlation
  divisionTrends: DivisionTrends;
  styleMatchup: StyleMatchup;
  dayOfWeek: {
    home: DayOfWeekPattern;
    away: DayOfWeekPattern;
  };
  publicBias: PublicBias;
  
  // Composite Scores
  compositeScores: {
    sharpEdge: number; // -100 to 100, negative favors away
    valueRating: number; // 0 to 100
    confidence: number; // 0 to 100
    volatility: number; // 0 to 100
    recommendations: Array<{
      type: 'spread' | 'total' | 'moneyline' | 'prop' | 'avoid';
      pick: string;
      confidence: number;
      reasoning: string[];
      keyFactors: string[];
    }>;
  };
  
  // Meta Information
  timestamp: string;
  dataQuality: {
    completeness: number; // 0-1
    recency: number; // 0-1
    reliability: number; // 0-1
  };
}