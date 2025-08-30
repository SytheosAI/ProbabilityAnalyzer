import React from 'react'
import { 
  MoneylineRequest, 
  MoneylineResponse,
  ParlayOptimizationRequest,
  ParlayOptimizationResponse,
  ComprehensiveAnalysis,
  Game
} from '@/types/sports'

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : 'http://localhost:3000/api'

export class SportsAnalyzerAPI {
  private static instance: SportsAnalyzerAPI
  private apiKey: string | null = null

  private constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_SPORTRADAR_API_KEY || null
  }

  public static getInstance(): SportsAnalyzerAPI {
    if (!SportsAnalyzerAPI.instance) {
      SportsAnalyzerAPI.instance = new SportsAnalyzerAPI()
    }
    return SportsAnalyzerAPI.instance
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Moneyline Analysis
  async getMoneylinePredictions(request: MoneylineRequest): Promise<MoneylineResponse> {
    return this.makeRequest<MoneylineResponse>('/moneyline', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Parlay Optimization
  async optimizeParlays(request: ParlayOptimizationRequest): Promise<ParlayOptimizationResponse> {
    return this.makeRequest<ParlayOptimizationResponse>('/parlays', {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  // Comprehensive Analysis
  async getComprehensiveAnalysis(games: Game[]): Promise<{ analysis: ComprehensiveAnalysis[] }> {
    return this.makeRequest<{ analysis: ComprehensiveAnalysis[] }>('/comprehensive', {
      method: 'POST',
      body: JSON.stringify({
        type: 'comprehensive',
        games,
        filters: {
          min_confidence: 0.6,
          min_expected_value: 5.0
        }
      }),
    })
  }

  // Daily Recommendations
  async getDailyRecommendations(
    date: string, 
    sports: string[] = ['nfl', 'nba', 'mlb', 'nhl'],
    minConfidence: number = 0.65,
    minExpectedValue: number = 8.0
  ) {
    return this.makeRequest('/daily', {
      method: 'POST',
      body: JSON.stringify({
        type: 'daily',
        date,
        sports,
        min_confidence: minConfidence,
        min_expected_value: minExpectedValue,
      }),
    })
  }

  // Live Odds Data
  async getLiveOdds(sport?: string) {
    const endpoint = sport ? `/odds/${sport}` : '/odds'
    return this.makeRequest(endpoint)
  }

  // Line Movement Tracking
  async getLineMovement(gameId: string) {
    return this.makeRequest(`/line-movement/${gameId}`)
  }

  // Arbitrage Opportunities
  async getArbitrageOpportunities() {
    return this.makeRequest('/arbitrage')
  }

  // Historical Analysis
  async getHistoricalAnalysis(
    sport: string,
    startDate: string,
    endDate: string
  ) {
    return this.makeRequest(`/historical/${sport}`, {
      method: 'POST',
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate,
      }),
    })
  }

  // Learning System Updates
  async triggerLearningUpdate(updateType: 'weekly' | 'daily' | 'pattern' = 'weekly') {
    return this.makeRequest('/learning/update', {
      method: 'POST',
      body: JSON.stringify({
        type: 'learning_update',
        update_type: updateType,
      }),
    })
  }

  // Health Check
  async healthCheck() {
    return this.makeRequest('/health')
  }

  // Sports Radar Integration
  async getSportsRadarData(endpoint: string) {
    if (!this.apiKey) {
      throw new Error('Sports Radar API key not configured')
    }
    
    const response = await fetch(`https://api.sportradar.us${endpoint}?api_key=${this.apiKey}`)
    
    if (!response.ok) {
      throw new Error(`Sports Radar API error: ${response.status}`)
    }
    
    return response.json()
  }

  // NFL Data
  async getNFLSchedule(season: number = new Date().getFullYear()) {
    return this.getSportsRadarData(`/nfl/official/trial/v7/en/games/${season}/REG/schedule.json`)
  }

  async getNFLGameBoxScore(gameId: string) {
    return this.getSportsRadarData(`/nfl/official/trial/v7/en/games/${gameId}/boxscore.json`)
  }

  // NBA Data
  async getNBASchedule(season: number = new Date().getFullYear()) {
    return this.getSportsRadarData(`/nba/trial/v8/en/games/${season}/schedule.json`)
  }

  async getNBAGameBoxScore(gameId: string) {
    return this.getSportsRadarData(`/nba/trial/v8/en/games/${gameId}/boxscore.json`)
  }

  // MLB Data
  async getMLBSchedule(season: number = new Date().getFullYear()) {
    return this.getSportsRadarData(`/mlb/trial/v7/en/games/${season}/schedule.json`)
  }

  // NHL Data
  async getNHLSchedule(season: number = new Date().getFullYear()) {
    return this.getSportsRadarData(`/nhl/trial/v7/en/games/${season}/schedule.json`)
  }
}

// Utility functions for common operations
export const sportsAPI = SportsAnalyzerAPI.getInstance()

export async function fetchTodaysGames(sports: string[] = ['nfl', 'nba', 'mlb', 'nhl']): Promise<Game[]> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const response = await sportsAPI.getDailyRecommendations(today, sports)
    return response.games || []
  } catch (error) {
    console.error('Error fetching today\'s games:', error)
    return []
  }
}

export async function fetchMoneylineAnalysis(games: Game[], minEdge: number = 0.03): Promise<MoneylineResponse> {
  try {
    const request: MoneylineRequest = {
      type: 'moneyline',
      sport: 'all',
      min_edge: minEdge,
      games
    }
    return await sportsAPI.getMoneylinePredictions(request)
  } catch (error) {
    console.error('Error fetching moneyline analysis:', error)
    throw error
  }
}

export async function optimizeParlays(
  games: Game[],
  riskLevel: 'conservative' | 'moderate' | 'aggressive' | 'yolo' = 'moderate',
  maxParlays: number = 10
): Promise<ParlayOptimizationResponse> {
  try {
    const sports = [...new Set(games.map(g => g.sport.toLowerCase()))]
    
    const request: ParlayOptimizationRequest = {
      type: 'parlays',
      risk_level: riskLevel,
      max_parlays: maxParlays,
      sports,
      min_confidence: riskLevel === 'conservative' ? 0.7 : 
                     riskLevel === 'moderate' ? 0.6 : 
                     riskLevel === 'aggressive' ? 0.5 : 0.4,
      min_expected_value: riskLevel === 'conservative' ? 10 : 
                         riskLevel === 'moderate' ? 8 : 
                         riskLevel === 'aggressive' ? 5 : 3,
      max_correlation: riskLevel === 'conservative' ? 0.2 : 
                      riskLevel === 'moderate' ? 0.3 : 
                      riskLevel === 'aggressive' ? 0.4 : 0.5,
      games
    }
    
    return await sportsAPI.optimizeParlays(request)
  } catch (error) {
    console.error('Error optimizing parlays:', error)
    throw error
  }
}

// Real-time data hooks for React components
export function useRealTimeData(refreshInterval: number = 30000) {
  const [data, setData] = React.useState(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    let interval: NodeJS.Timeout

    const fetchData = async () => {
      try {
        setLoading(true)
        const games = await fetchTodaysGames()
        const moneylines = await fetchMoneylineAnalysis(games)
        const arbitrage = await sportsAPI.getArbitrageOpportunities()
        
        setData({
          games,
          moneylines,
          arbitrage,
          lastUpdated: new Date().toISOString()
        })
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    interval = setInterval(fetchData, refreshInterval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [refreshInterval])

  return { data, loading, error }
}