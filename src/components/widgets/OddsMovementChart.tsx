'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OddsMovement {
  timestamp: string
  homeOdds: number
  awayOdds: number
  volume: number
  sharpMoney: number
}

interface OddsMovementChartProps {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
}

const OddsMovementChart: React.FC<OddsMovementChartProps> = ({ 
  gameId, 
  homeTeam, 
  awayTeam, 
  sport 
}) => {
  const [movements, setMovements] = useState<OddsMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'1h' | '6h' | '24h' | '7d'>('6h')

  useEffect(() => {
    // Fetch real odds movement data from API
    const fetchOddsMovement = async () => {
      if (!gameId) {
        setMovements([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const response = await fetch(`/api/sports/odds-movement/${gameId}?timeframe=${timeframe}`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setMovements(result.data)
        } else {
          setMovements([])
        }
      } catch (error) {
        console.error('Error fetching odds movement:', error)
        setMovements([])
      } finally {
        setLoading(false)
      }
    }

    fetchOddsMovement()
  }, [timeframe, gameId])

  const latestMovement = movements[movements.length - 1]
  const previousMovement = movements[movements.length - 2]
  
  const homeOddsTrend = latestMovement && previousMovement 
    ? latestMovement.homeOdds - previousMovement.homeOdds 
    : 0
    
  const awayOddsTrend = latestMovement && previousMovement 
    ? latestMovement.awayOdds - previousMovement.awayOdds 
    : 0

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-400" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-400" />
    return <Clock className="h-4 w-4 text-slate-400" />
  }

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-400'
    if (trend < 0) return 'text-red-400'
    return 'text-slate-400'
  }

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">Line Movement</CardTitle>
            <CardDescription className="text-slate-400">
              {awayTeam} @ {homeTeam}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as '1h' | '6h' | '24h' | '7d')}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="1h">1H</option>
              <option value="6h">6H</option>
              <option value="24h">24H</option>
              <option value="7d">7D</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Current Odds */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{homeTeam}</span>
                  {getTrendIcon(homeOddsTrend)}
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-xl font-bold text-white">
                    {latestMovement ? formatOdds(latestMovement.homeOdds) : 'N/A'}
                  </span>
                  {homeOddsTrend !== 0 && (
                    <span className={cn("text-sm font-medium", getTrendColor(homeOddsTrend))}>
                      {homeOddsTrend > 0 ? '+' : ''}{homeOddsTrend}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">{awayTeam}</span>
                  {getTrendIcon(awayOddsTrend)}
                </div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-xl font-bold text-white">
                    {latestMovement ? formatOdds(latestMovement.awayOdds) : 'N/A'}
                  </span>
                  {awayOddsTrend !== 0 && (
                    <span className={cn("text-sm font-medium", getTrendColor(awayOddsTrend))}>
                      {awayOddsTrend > 0 ? '+' : ''}{awayOddsTrend}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mini Chart Visualization */}
            <div className="relative h-24 bg-slate-800/30 rounded-lg p-2">
              <div className="flex items-end justify-between h-full space-x-1">
                {movements.slice(-20).map((movement, index) => {
                  const homeHeight = Math.abs(movement.homeOdds) / 3 // Scale for visualization
                  const awayHeight = Math.abs(movement.awayOdds) / 3
                  
                  return (
                    <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                      <div
                        className="bg-blue-500/60 rounded-sm w-full"
                        style={{ height: `${Math.min(homeHeight, 100)}%` }}
                      />
                      <div
                        className="bg-red-500/60 rounded-sm w-full"
                        style={{ height: `${Math.min(awayHeight, 100)}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              
              {/* Legend */}
              <div className="absolute bottom-0 right-2 flex space-x-3 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-sm"></div>
                  <span className="text-slate-400">{homeTeam}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-sm"></div>
                  <span className="text-slate-400">{awayTeam}</span>
                </div>
              </div>
            </div>

            {/* Volume & Sharp Money */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-700">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-slate-400">Betting Volume</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${latestMovement ? (latestMovement.volume / 1000).toFixed(0) : '0'}K
                </p>
              </div>
              
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-slate-400">Sharp Money</span>
                </div>
                <p className="text-lg font-bold text-white">
                  ${latestMovement ? (latestMovement.sharpMoney / 1000).toFixed(0) : '0'}K
                </p>
              </div>
            </div>

            {/* Steam Move Alert */}
            {Math.abs(homeOddsTrend) > 5 || Math.abs(awayOddsTrend) > 5 && (
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">Steam Move Detected</span>
                </div>
                <p className="text-xs text-yellow-300 mt-1">
                  Significant line movement indicates sharp action on {Math.abs(homeOddsTrend) > Math.abs(awayOddsTrend) ? homeTeam : awayTeam}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default OddsMovementChart