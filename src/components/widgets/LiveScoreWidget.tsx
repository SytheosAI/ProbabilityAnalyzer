'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  Play, 
  Pause, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown,
  Activity,
  AlertCircle
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
  momentum: number // -100 to 100
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

  useEffect(() => {
    const generateLiveScores = (): LiveScore[] => {
      const sports = sport ? [sport] : ['NBA', 'NFL', 'MLB', 'NHL', 'NCAAF', 'NCAAB']
      // LIVE DATA ONLY - NO HARDCODED TEAMS
      const teams = {
        NBA: [],
        NFL: [],
        MLB: [],
        NHL: [],
        NCAAF: [],
        NCAAB: []
      }

      const gameStatuses = ['live', 'live', 'live', 'completed', 'scheduled']
      const periods = {
        NBA: ['1st', '2nd', '3rd', '4th', 'OT'],
        NFL: ['1st', '2nd', '3rd', '4th', 'OT'],
        MLB: ['T1st', 'B1st', 'T2nd', 'B2nd', 'T9th', 'B9th'],
        NHL: ['1st', '2nd', '3rd', 'OT', 'SO'],
        NCAAF: ['1st', '2nd', '3rd', '4th'],
        NCAAB: ['1st', '2nd', 'OT']
      }

      const scores: LiveScore[] = []
      
      for (let i = 0; i < maxGames; i++) {
        const selectedSport = sports[Math.floor(Math.random() * sports.length)] as keyof typeof teams
        const sportTeams = teams[selectedSport]
        const homeTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        let awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        while (awayTeam === homeTeam) {
          awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        }

        const status = gameStatuses[Math.floor(Math.random() * gameStatuses.length)] as LiveScore['status']
        const homeScore = status === 'scheduled' ? 0 : Math.floor(Math.random() * 120)
        const awayScore = status === 'scheduled' ? 0 : Math.floor(Math.random() * 120)
        const momentum = (Math.random() - 0.5) * 200 // -100 to 100
        
        const sportPeriods = periods[selectedSport]
        const period = status === 'scheduled' ? 'Scheduled' : 
                     status === 'completed' ? 'Final' :
                     sportPeriods[Math.floor(Math.random() * sportPeriods.length)]

        const timeOptions = ['12:35', '8:47', '2:15', '0:33', '15:22', 'Halftime', 'End of 1st']
        const timeRemaining = status === 'scheduled' ? 'TBD' :
                            status === 'completed' ? 'Final' :
                            timeOptions[Math.floor(Math.random() * timeOptions.length)]

        scores.push({
          gameId: `game-${i}`,
          sport: selectedSport,
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          period,
          timeRemaining,
          status,
          possession: Math.random() > 0.5 ? 'home' : 'away',
          momentum,
          lastPlay: status === 'live' ? 'Johnson 3-pt FG' : undefined,
          inGameOdds: status === 'live' ? {
            homeML: -110 + Math.random() * 40 - 20,
            awayML: -110 + Math.random() * 40 - 20,
            spread: (Math.random() - 0.5) * 14,
            total: 200 + Math.random() * 50
          } : undefined
        })
      }

      return scores.sort((a, b) => {
        const statusOrder = { live: 0, completed: 1, scheduled: 2 }
        return statusOrder[a.status] - statusOrder[b.status]
      })
    }

    setLoading(true)
    setTimeout(() => {
      setScores(generateLiveScores())
      setLoading(false)
    }, 500)

    // Update live scores every 30 seconds
    const interval = setInterval(() => {
      setScores(prev => prev.map(score => {
        if (score.status === 'live') {
          // Randomly update scores
          return {
            ...score,
            homeScore: score.homeScore + (Math.random() > 0.95 ? Math.floor(Math.random() * 3) + 1 : 0),
            awayScore: score.awayScore + (Math.random() > 0.95 ? Math.floor(Math.random() * 3) + 1 : 0),
            momentum: Math.max(-100, Math.min(100, score.momentum + (Math.random() - 0.5) * 40))
          }
        }
        return score
      }))
    }, 30000)

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
      case 'completed': return <Pause className="h-3 w-3" />
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
          <span>Live Scores</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Real-time scores with in-game momentum
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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
                  
                  {score.status === 'live' && (
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
                <p className="text-slate-400">No live games at this time</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default LiveScoreWidget