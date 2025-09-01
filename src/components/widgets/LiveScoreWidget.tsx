'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  Play, 
  Activity,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Target
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveScore {
  gameId: string
  sport: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  period: string
  timeRemaining: string
  status: 'live' | 'completed' | 'scheduled'
  possession?: 'home' | 'away'
  momentum: number
  lastPlay?: string
  inGameOdds?: {
    homeML: number
    awayML: number
    spread: number
    total: number
  }
}

interface LiveScoreWidgetProps {
  maxGames?: number
  sport?: string
  showInGameOdds?: boolean
}

const LiveScoreWidget: React.FC<LiveScoreWidgetProps> = ({ 
  maxGames = 6, 
  sport,
  showInGameOdds = true
}) => {
  const [scores, setScores] = useState<LiveScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRealScores = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch REAL scores from ESPN API
        const sportEndpoint = sport?.toLowerCase() || 'football/nfl'
        const response = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${sportEndpoint}/scoreboard`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch scores')
        }
        
        const data = await response.json()
        
        // Transform ESPN data to our format
        const transformedScores: LiveScore[] = data.events?.slice(0, maxGames).map((game: any) => {
          const competition = game.competitions[0]
          const homeTeam = competition.competitors.find((c: any) => c.homeAway === 'home')
          const awayTeam = competition.competitors.find((c: any) => c.homeAway === 'away')
          
          let status: 'live' | 'completed' | 'scheduled' = 'scheduled'
          if (competition.status.type.completed) {
            status = 'completed'
          } else if (competition.status.type.state === 'in') {
            status = 'live'
          }
          
          // Calculate momentum based on recent scoring
          let momentum = 0
          if (status === 'live' && competition.situation) {
            const situation = competition.situation
            if (situation.lastPlay?.team?.id === homeTeam.id) {
              momentum = 50
            } else if (situation.lastPlay?.team?.id === awayTeam.id) {
              momentum = -50
            }
          }
          
          return {
            gameId: game.id,
            sport: sport || 'NFL',
            homeTeam: homeTeam.team.displayName,
            awayTeam: awayTeam.team.displayName,
            homeScore: parseInt(homeTeam.score) || 0,
            awayScore: parseInt(awayTeam.score) || 0,
            period: competition.status.period || '1st',
            timeRemaining: competition.status.displayClock || competition.status.type.shortDetail || 'TBD',
            status,
            possession: competition.situation?.possession?.id === homeTeam.id ? 'home' : 
                       competition.situation?.possession?.id === awayTeam.id ? 'away' : undefined,
            momentum,
            lastPlay: competition.situation?.lastPlay?.text,
            inGameOdds: status === 'live' && competition.odds ? {
              homeML: competition.odds[0]?.homeTeamOdds?.moneyLine || 0,
              awayML: competition.odds[0]?.awayTeamOdds?.moneyLine || 0,
              spread: parseFloat(competition.odds[0]?.spread) || 0,
              total: parseFloat(competition.odds[0]?.overUnder) || 0
            } : undefined
          }
        }) || []
        
        setScores(transformedScores)
      } catch (err) {
        console.error('Error fetching scores:', err)
        setError('Unable to fetch live scores')
        setScores([])
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchRealScores()
    
    // Refresh every 30 seconds for live games
    const interval = setInterval(fetchRealScores, 30000)
    
    return () => clearInterval(interval)
  }, [maxGames, sport])

  const getStatusColor = (status: LiveScore['status']) => {
    switch (status) {
      case 'live': return 'text-green-400'
      case 'completed': return 'text-slate-400'
      case 'scheduled': return 'text-blue-400'
    }
  }

  const getStatusIcon = (status: LiveScore['status']) => {
    switch (status) {
      case 'live': return <Activity className="h-3 w-3" />
      case 'completed': return <Clock className="h-3 w-3" />
      case 'scheduled': return <Clock className="h-3 w-3" />
    }
  }

  const getMomentumColor = (momentum: number) => {
    if (momentum > 30) return 'text-green-400'
    if (momentum < -30) return 'text-red-400'
    return 'text-yellow-400'
  }

  const getMomentumIcon = (momentum: number) => {
    if (momentum > 30) return <TrendingUp className="h-3 w-3" />
    if (momentum < -30) return <TrendingDown className="h-3 w-3" />
    return <Activity className="h-3 w-3" />
  }

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${Math.round(odds)}` : `${Math.round(odds)}`
  }

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center space-x-2">
          <Play className="h-5 w-5 text-green-400" />
          <span>Live Scores - REAL DATA</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Live scores from ESPN API
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {scores.map((score) => (
              <div key={score.gameId} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                      {score.sport}
                    </span>
                    <div className={cn("flex items-center space-x-1 text-xs", getStatusColor(score.status))}>
                      {getStatusIcon(score.status)}
                      <span>{score.period} - {score.timeRemaining}</span>
                    </div>
                  </div>
                  
                  {score.status === 'live' && score.momentum !== 0 && (
                    <div className={cn("flex items-center space-x-1", getMomentumColor(score.momentum))}>
                      {getMomentumIcon(score.momentum)}
                      <span className="text-xs">Momentum</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className={cn("flex items-center justify-between", 
                    score.possession === 'away' ? 'bg-blue-500/10 px-2 py-1 rounded' : ''
                  )}>
                    <span className="text-white font-medium">{score.awayTeam}</span>
                    <span className="text-xl font-bold text-white">{score.awayScore}</span>
                  </div>
                  
                  <div className={cn("flex items-center justify-between",
                    score.possession === 'home' ? 'bg-blue-500/10 px-2 py-1 rounded' : ''
                  )}>
                    <span className="text-white font-medium">{score.homeTeam}</span>
                    <span className="text-xl font-bold text-white">{score.homeScore}</span>
                  </div>
                </div>

                {score.lastPlay && (
                  <div className="bg-slate-700/50 rounded px-2 py-1 mb-3">
                    <p className="text-xs text-slate-300">{score.lastPlay}</p>
                  </div>
                )}

                {showInGameOdds && score.inGameOdds && score.status === 'live' && (
                  <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-700/50">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">ML</p>
                      <p className="text-xs font-medium text-blue-400">
                        {formatOdds(score.inGameOdds.awayML)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">ML</p>
                      <p className="text-xs font-medium text-blue-400">
                        {formatOdds(score.inGameOdds.homeML)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">Spread</p>
                      <p className="text-xs font-medium text-green-400">
                        {score.inGameOdds.spread > 0 ? '+' : ''}{score.inGameOdds.spread.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">O/U</p>
                      <p className="text-xs font-medium text-yellow-400">
                        {score.inGameOdds.total.toFixed(1)}
                      </p>
                    </div>
                  </div>
                )}

                {score.status === 'live' && (
                  <div className="flex justify-end mt-2">
                    <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                      <Target className="h-3 w-3 inline mr-1" />
                      Live Betting
                    </button>
                  </div>
                )}
              </div>
            ))}

            {scores.length === 0 && (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400">No games available</p>
                <p className="text-xs text-slate-500 mt-1">Check back during game time</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default LiveScoreWidget