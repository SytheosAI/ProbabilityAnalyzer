export interface Game {
  game_id: string
  sport: string
  home_team: string
  away_team: string
  home_moneyline?: number
  away_moneyline?: number
  home_spread?: number
  away_spread?: number
  total_points?: number
  game_time: string
  venue?: string
  weather?: WeatherConditions
}

export interface WeatherConditions {
  temperature: number
  humidity: number
  wind_speed: number
  wind_direction: string
  precipitation: number
  conditions: string
}

export interface MoneylinePrediction {
  game_id: string
  team: string
  sport: string
  american_odds: number
  decimal_odds: number
  implied_probability: number
  true_probability: number
  expected_value: number
  edge: number
  kelly_criterion: number
  confidence_score: number
  value_rating: 'excellent' | 'good' | 'moderate' | 'poor'
  key_factors: Record<string, any>
}

export interface ParlayLeg {
  team: string
  bet_type: 'moneyline' | 'spread' | 'total'
  line: number
  odds: number
  probability: number
  sport: string
  game_id: string
}

export interface Parlay {
  parlay_id: string
  legs: ParlayLeg[]
  combined_odds: number
  total_probability: number
  expected_value: number
  risk_score: number
  confidence_score: number
  correlation_score: number
  kelly_stake: number
  key_factors: string[]
  warnings: string[]
  sports_included: string[]
}

export interface ParlayOptimizationRequest {
  type: 'parlays'
  risk_level: 'conservative' | 'moderate' | 'aggressive' | 'yolo'
  max_parlays: number
  sports: string[]
  min_confidence: number
  min_expected_value: number
  max_correlation: number
  games: Game[]
}

export interface ParlayOptimizationResponse {
  success: boolean
  type: 'parlay_optimization'
  risk_level: string
  parlays_generated: number
  parlays: Parlay[]
  recommendations: {
    best_value: string
    safest: string
    highest_odds: string
  }
}

export interface MoneylineRequest {
  type: 'moneyline'
  sport: string
  min_edge: number
  games: Game[]
}

export interface MoneylineResponse {
  success: boolean
  type: 'moneyline_predictions'
  sport: string
  total_games: number
  value_bets_found: number
  min_edge_threshold: number
  predictions: MoneylinePrediction[]
  summary: {
    avg_expected_value: number
    avg_confidence: number
    strong_value_count: number
  }
}

export interface ComprehensiveAnalysis {
  game_id: string
  sport: string
  teams: {
    home: string
    away: string
  }
  predictions: {
    moneyline: {
      home_win_probability: number
      away_win_probability: number
      confidence: number
    }
    spread: {
      expected_margin: number
      current_spread: number
      home_cover_probability: number
      value_side: 'home' | 'away'
    }
    total: {
      expected_total: number
      current_total: number
      over_probability: number
      value_side: 'over' | 'under'
    }
  }
  confidence_scores: {
    overall: number
    moneyline: number
    spread: number
    total: number
  }
  key_factors: Array<{
    type: string
    description: string
    impact: number
    favors: 'home' | 'away'
  }>
  value_opportunities: Array<{
    type: string
    pick: string
    probability: number
    confidence: number
    edge: number
  }>
  parlay_suitability: number
  best_single_bets: Array<{
    type: string
    pick: string
    expected_value: number
    confidence: number
    kelly_stake: number
  }>
}

export interface DashboardStats {
  total_games_analyzed: number
  value_bets_found: number
  avg_expected_value: number
  avg_confidence: number
  parlay_opportunities: number
  arbitrage_opportunities: number
  total_profit_potential: number
}

export interface LiveOdds {
  game_id: string
  sport: string
  bookmaker: string
  home_team: string
  away_team: string
  home_moneyline: number
  away_moneyline: number
  home_spread: number
  away_spread: number
  total_points: number
  last_updated: string
}

export interface ArbitrageOpportunity {
  game_id: string
  sport: string
  home_team: string
  away_team: string
  bookmaker_a: string
  bookmaker_b: string
  profit_margin: number
  bet_a: {
    type: string
    team: string
    odds: number
    stake: number
  }
  bet_b: {
    type: string
    team: string
    odds: number
    stake: number
  }
  guaranteed_profit: number
}

export interface LineMovement {
  game_id: string
  sport: string
  bet_type: 'moneyline' | 'spread' | 'total'
  team: string
  opening_line: number
  current_line: number
  movement: number
  movement_percentage: number
  steam_move: boolean
  reverse_line_movement: boolean
  timestamp: string
}

export interface FilterOptions {
  sports: string[]
  start_date: string
  end_date: string
  min_confidence: number
  max_confidence: number
  min_expected_value: number
  min_parlay_suitability: number
  max_correlation: number
  risk_levels: string[]
  min_odds: number
  max_odds: number
}