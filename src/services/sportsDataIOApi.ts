/**
 * SportsDataIO API Service
 * Provides referee analytics, advanced stats, and additional betting data
 */

import { format } from 'date-fns'

const BASE_URL = 'https://api.sportsdata.io/v3'
const API_KEY = process.env.SPORTSDATAIO_API_KEY || 'c5298a785e5e48fdad99fca62bfff60e'

interface RefereeData {
  refereeId: number
  name: string
  position: string
  experience: number
  homeTeamAdvantage: number
  totalAverage: number
  overUnderTendency: 'over' | 'under' | 'neutral'
  foulsPerGame: number
  technicalFoulsPerGame?: number
  ejections?: number
}

interface InjuryReport {
  playerId: number
  playerName: string
  team: string
  injury: string
  status: 'Out' | 'Doubtful' | 'Questionable' | 'Probable' | 'Active'
  bodyPart: string
  expectedReturn?: string
  impactRating: number // 1-10 scale
}

interface TeamTrends {
  teamId: number
  teamName: string
  atsRecord: string
  overUnderRecord: string
  homeRecord: string
  awayRecord: string
  lastTenRecord: string
  restDaysImpact: {
    zeroRest: string
    oneDay: string
    twoDays: string
    threePlusDays: string
  }
}

interface AdvancedStats {
  offensiveEfficiency: number
  defensiveEfficiency: number
  pace: number
  turnoverRate: number
  reboundRate: number
  freeThrowRate: number
  threePointRate: number
  effectiveFieldGoalPercentage: number
}

class SportsDataIOService {
  private headers = {
    'Ocp-Apim-Subscription-Key': API_KEY
  }

  /**
   * Get referee data and tendencies for a specific game
   */
  async getRefereeAnalytics(sport: string, gameId: string): Promise<RefereeData[]> {
    try {
      const endpoint = `${BASE_URL}/${sport}/scores/json/Referees/${gameId}`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch referee data: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Process referee data with tendencies
      return data.map((ref: any) => ({
        refereeId: ref.RefereeID,
        name: ref.Name,
        position: ref.Position,
        experience: ref.Experience || 0,
        homeTeamAdvantage: this.calculateHomeAdvantage(ref),
        totalAverage: ref.TotalPointsAverage || 0,
        overUnderTendency: this.determineOverUnderTendency(ref),
        foulsPerGame: ref.FoulsPerGame || 0,
        technicalFoulsPerGame: ref.TechnicalFoulsPerGame,
        ejections: ref.Ejections
      }))
    } catch (error) {
      console.error('Error fetching referee analytics:', error)
      return []
    }
  }

  /**
   * Get comprehensive injury reports with impact ratings
   */
  async getInjuryReports(sport: string): Promise<InjuryReport[]> {
    try {
      const endpoint = `${BASE_URL}/${sport}/scores/json/Injuries`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch injury reports: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return data.map((injury: any) => ({
        playerId: injury.PlayerID,
        playerName: injury.Name,
        team: injury.Team,
        injury: injury.Injury,
        status: injury.Status,
        bodyPart: injury.BodyPart,
        expectedReturn: injury.ExpectedReturn,
        impactRating: this.calculateInjuryImpact(injury)
      }))
    } catch (error) {
      console.error('Error fetching injury reports:', error)
      return []
    }
  }

  /**
   * Get team trends and ATS records
   */
  async getTeamTrends(sport: string, teamId: string): Promise<TeamTrends> {
    try {
      const endpoint = `${BASE_URL}/${sport}/scores/json/TeamTrends/${teamId}`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch team trends: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        teamId: data.TeamID,
        teamName: data.Name,
        atsRecord: `${data.ATSWins}-${data.ATSLosses}`,
        overUnderRecord: `${data.OverWins}-${data.UnderWins}`,
        homeRecord: `${data.HomeWins}-${data.HomeLosses}`,
        awayRecord: `${data.AwayWins}-${data.AwayLosses}`,
        lastTenRecord: `${data.LastTenWins}-${data.LastTenLosses}`,
        restDaysImpact: {
          zeroRest: data.ZeroRestRecord || 'N/A',
          oneDay: data.OneDayRestRecord || 'N/A',
          twoDays: data.TwoDayRestRecord || 'N/A',
          threePlusDays: data.ThreePlusRestRecord || 'N/A'
        }
      }
    } catch (error) {
      console.error('Error fetching team trends:', error)
      throw error
    }
  }

  /**
   * Get advanced team statistics
   */
  async getAdvancedStats(sport: string, teamId: string): Promise<AdvancedStats> {
    try {
      const endpoint = `${BASE_URL}/${sport}/stats/json/TeamSeasonStats/2024`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch advanced stats: ${response.statusText}`)
      }
      
      const data = await response.json()
      const teamStats = data.find((team: any) => team.TeamID === parseInt(teamId))
      
      if (!teamStats) {
        throw new Error('Team stats not found')
      }
      
      return {
        offensiveEfficiency: teamStats.OffensiveRating || 0,
        defensiveEfficiency: teamStats.DefensiveRating || 0,
        pace: teamStats.Pace || 0,
        turnoverRate: teamStats.TurnoverPercentage || 0,
        reboundRate: teamStats.ReboundingPercentage || 0,
        freeThrowRate: teamStats.FreeThrowRate || 0,
        threePointRate: teamStats.ThreePointRate || 0,
        effectiveFieldGoalPercentage: teamStats.EffectiveFieldGoalPercentage || 0
      }
    } catch (error) {
      console.error('Error fetching advanced stats:', error)
      throw error
    }
  }

  /**
   * Get player props and betting trends
   */
  async getPlayerProps(sport: string, gameId: string): Promise<any[]> {
    try {
      const endpoint = `${BASE_URL}/${sport}/odds/json/PlayerPropsByGameID/${gameId}`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch player props: ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching player props:', error)
      return []
    }
  }

  /**
   * Get consensus betting percentages
   */
  async getBettingConsensus(sport: string, gameId: string): Promise<any> {
    try {
      const endpoint = `${BASE_URL}/${sport}/odds/json/BettingTrendsByGameID/${gameId}`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch betting consensus: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        moneylineConsensus: {
          homePercentage: data.HomeMoneylinePercentage,
          awayPercentage: data.AwayMoneylinePercentage,
          homeBets: data.HomeMoneylineBets,
          awayBets: data.AwayMoneylineBets
        },
        spreadConsensus: {
          homePercentage: data.HomeSpreadPercentage,
          awayPercentage: data.AwaySpreadPercentage,
          homeBets: data.HomeSpreadBets,
          awayBets: data.AwaySpreadBets
        },
        totalConsensus: {
          overPercentage: data.OverPercentage,
          underPercentage: data.UnderPercentage,
          overBets: data.OverBets,
          underBets: data.UnderBets
        }
      }
    } catch (error) {
      console.error('Error fetching betting consensus:', error)
      return null
    }
  }

  /**
   * Get venue and weather data
   */
  async getVenueData(sport: string, stadiumId: string): Promise<any> {
    try {
      const endpoint = `${BASE_URL}/${sport}/scores/json/Stadiums`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch venue data: ${response.statusText}`)
      }
      
      const stadiums = await response.json()
      return stadiums.find((stadium: any) => stadium.StadiumID === parseInt(stadiumId))
    } catch (error) {
      console.error('Error fetching venue data:', error)
      return null
    }
  }

  /**
   * Get historical matchup data
   */
  async getHeadToHead(sport: string, team1: string, team2: string): Promise<any[]> {
    try {
      const endpoint = `${BASE_URL}/${sport}/scores/json/TeamGameStatsByDate/2024-01-01`
      const response = await fetch(`${endpoint}?key=${API_KEY}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch head to head data: ${response.statusText}`)
      }
      
      const games = await response.json()
      
      // Filter for games between these teams
      return games.filter((game: any) => 
        (game.Team === team1 && game.Opponent === team2) ||
        (game.Team === team2 && game.Opponent === team1)
      )
    } catch (error) {
      console.error('Error fetching head to head data:', error)
      return []
    }
  }

  // Helper methods
  private calculateHomeAdvantage(referee: any): number {
    if (!referee.HomeWinPercentage) return 0
    return (referee.HomeWinPercentage - 50) / 10 // Convert to -5 to +5 scale
  }

  private determineOverUnderTendency(referee: any): 'over' | 'under' | 'neutral' {
    if (!referee.OverPercentage) return 'neutral'
    if (referee.OverPercentage > 55) return 'over'
    if (referee.OverPercentage < 45) return 'under'
    return 'neutral'
  }

  private calculateInjuryImpact(injury: any): number {
    // Calculate impact based on player importance and injury severity
    const severityMap: Record<string, number> = {
      'Out': 10,
      'Doubtful': 7,
      'Questionable': 5,
      'Probable': 3,
      'Active': 0
    }
    
    const baseSeverity = severityMap[injury.Status] || 5
    const positionMultiplier = this.getPositionImportance(injury.Position)
    
    return Math.min(10, baseSeverity * positionMultiplier)
  }

  private getPositionImportance(position: string): number {
    // Position importance multipliers
    const importanceMap: Record<string, number> = {
      'QB': 1.5,
      'RB': 1.2,
      'WR': 1.1,
      'C': 1.3,
      'PG': 1.4,
      'SF': 1.2,
      'SP': 1.5,
      'CP': 1.4
    }
    
    return importanceMap[position] || 1.0
  }
}

export const sportsDataIO = new SportsDataIOService()

export type {
  RefereeData,
  InjuryReport,
  TeamTrends,
  AdvancedStats
}