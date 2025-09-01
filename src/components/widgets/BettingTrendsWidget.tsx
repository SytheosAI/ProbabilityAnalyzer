'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Eye, 
  Brain,
  Target,
  Zap,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BettingTrend {
  gameId: string
  homeTeam: string
  awayTeam: string
  sport: string
  publicPercentage: {
    homeML: number
    awayML: number
    homeSpread: number
    awaySpread: number
    over: number
    under: number
  }
  sharpPercentage: {
    homeML: number
    awayML: number
    homeSpread: number
    awaySpread: number
    over: number
    under: number
  }
  ticketCount: number
  moneyPercentage: {
    home: number
    away: number
  }
  reverseLineMovement: boolean
  steamMove: boolean
  contrarian: boolean
}

interface BettingTrendsWidgetProps {
  maxGames?: number
  sport?: string
}

const BettingTrendsWidget: React.FC<BettingTrendsWidgetProps> = ({ 
  maxGames = 8, 
  sport 
}) => {
  const [trends, setTrends] = useState<BettingTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [viewType, setViewType] = useState<'overview' | 'detailed'>('overview')

  useEffect(() => {
    const generateBettingTrends = (): BettingTrend[] => {
      // NO FAKE DATA - RETURN EMPTY ARRAY
      return []

      const trends: BettingTrend[] = []
      
      for (let i = 0; i < maxGames; i++) {
        const selectedSport = sports[Math.floor(Math.random() * sports.length)] as keyof typeof teams
        const sportTeams = teams[selectedSport]
        const homeTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        let awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        while (awayTeam === homeTeam) {
          awayTeam = sportTeams[Math.floor(Math.random() * sportTeams.length)]
        }

        // Generate realistic betting percentages
        const publicHomeBias = Math.random() * 40 + 30 // 30-70%
        const sharpHomeBias = Math.random() * 60 + 20 // 20-80%
        const overBias = Math.random() * 30 + 35 // 35-65%
        
        const reverseLineMovement = Math.random() > 0.85 // 15% chance
        const steamMove = Math.random() > 0.90 // 10% chance
        const contrarian = Math.abs(publicHomeBias - sharpHomeBias) > 20 // Significant difference

        trends.push({
          gameId: `trend-${i}`,
          homeTeam,
          awayTeam,
          sport: selectedSport,
          publicPercentage: {
            homeML: publicHomeBias,
            awayML: 100 - publicHomeBias,
            homeSpread: publicHomeBias + Math.random() * 10 - 5,
            awaySpread: 100 - (publicHomeBias + Math.random() * 10 - 5),
            over: overBias,
            under: 100 - overBias
          },
          sharpPercentage: {
            homeML: sharpHomeBias,
            awayML: 100 - sharpHomeBias,
            homeSpread: sharpHomeBias + Math.random() * 10 - 5,
            awaySpread: 100 - (sharpHomeBias + Math.random() * 10 - 5),
            over: overBias + Math.random() * 20 - 10,
            under: 100 - (overBias + Math.random() * 20 - 10)
          },
          ticketCount: Math.floor(Math.random() * 50000) + 10000,
          moneyPercentage: {
            home: sharpHomeBias + Math.random() * 10 - 5,
            away: 100 - (sharpHomeBias + Math.random() * 10 - 5)
          },
          reverseLineMovement,
          steamMove,
          contrarian
        })
      }

      return trends.sort((a, b) => {
        if (a.steamMove && !b.steamMove) return -1
        if (!a.steamMove && b.steamMove) return 1
        if (a.contrarian && !b.contrarian) return -1
        if (!a.contrarian && b.contrarian) return 1
        return b.ticketCount - a.ticketCount
      })
    }

    setLoading(true)
    setTimeout(() => {
      setTrends(generateBettingTrends())
      setLoading(false)
    }, 500)

    // Update trends every 2 minutes
    const interval = setInterval(() => {
      setTrends(prev => prev.map(trend => ({
        ...trend,
        publicPercentage: {
          ...trend.publicPercentage,
          homeML: Math.max(10, Math.min(90, trend.publicPercentage.homeML + (Math.random() - 0.5) * 10))
        },
        sharpPercentage: {
          ...trend.sharpPercentage,
          homeML: Math.max(10, Math.min(90, trend.sharpPercentage.homeML + (Math.random() - 0.5) * 8))
        }
      })))
    }, 120000)

    return () => clearInterval(interval)
  }, [maxGames, sport])

  const getPercentageColor = (percentage: number, isSharp: boolean = false) => {
    if (isSharp) {
      if (percentage > 70) return 'text-purple-400'
      if (percentage > 55) return 'text-blue-400'
      return 'text-slate-400'
    }
    
    if (percentage > 75) return 'text-green-400'
    if (percentage > 60) return 'text-yellow-400'
    if (percentage < 25) return 'text-red-400'
    return 'text-slate-300'
  }

  const getPercentageWidth = (percentage: number) => {
    return `${Math.max(5, Math.min(95, percentage))}%`
  }

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <span>Betting Trends</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Public vs Sharp money analysis
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewType('overview')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewType === 'overview' 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-700 text-slate-400 hover:text-white"
              )}
            >
              Overview
            </button>
            <button
              onClick={() => setViewType('detailed')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewType === 'detailed' 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-700 text-slate-400 hover:text-white"
              )}
            >
              Detailed
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {trends.map((trend) => (
              <div key={trend.gameId} className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                      {trend.sport}
                    </span>
                    <span className="text-white font-medium">
                      {trend.awayTeam} @ {trend.homeTeam}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {trend.steamMove && (
                      <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded">
                        <Zap className="h-3 w-3 text-red-400" />
                        <span className="text-xs text-red-400">Steam</span>
                      </div>
                    )}
                    {trend.contrarian && (
                      <div className="flex items-center space-x-1 bg-purple-500/20 px-2 py-1 rounded">
                        <Brain className="h-3 w-3 text-purple-400" />
                        <span className="text-xs text-purple-400">Contrarian</span>
                      </div>
                    )}
                    {trend.reverseLineMovement && (
                      <div className="flex items-center space-x-1 bg-yellow-500/20 px-2 py-1 rounded">
                        <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        <span className="text-xs text-yellow-400">RLM</span>
                      </div>
                    )}
                  </div>
                </div>

                {viewType === 'overview' ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Public Betting */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-blue-400" />
                          <span className="text-xs text-slate-400">Public</span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {(trend.ticketCount / 1000).toFixed(0)}K tickets
                        </span>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{trend.homeTeam}</span>
                          <span className={getPercentageColor(trend.publicPercentage.homeML)}>
                            {trend.publicPercentage.homeML.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getPercentageWidth(trend.publicPercentage.homeML) }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-slate-400">{trend.awayTeam}</span>
                          <span className={getPercentageColor(trend.publicPercentage.awayML)}>
                            {trend.publicPercentage.awayML.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getPercentageWidth(trend.publicPercentage.awayML) }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sharp Money */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <Brain className="h-3 w-3 text-purple-400" />
                          <span className="text-xs text-slate-400">Sharp</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-3 w-3 text-green-400" />
                          <span className="text-xs text-green-400">Money</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{trend.homeTeam}</span>
                          <span className={getPercentageColor(trend.sharpPercentage.homeML, true)}>
                            {trend.sharpPercentage.homeML.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getPercentageWidth(trend.sharpPercentage.homeML) }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs mt-1">
                          <span className="text-slate-400">{trend.awayTeam}</span>
                          <span className={getPercentageColor(trend.sharpPercentage.awayML, true)}>
                            {trend.sharpPercentage.awayML.toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: getPercentageWidth(trend.sharpPercentage.awayML) }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Detailed View - Moneyline */}
                    <div className="bg-slate-700/30 rounded p-3">
                      <h5 className="text-sm font-medium text-white mb-2">Moneyline Distribution</h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 mb-1">Public Tickets</p>
                          <p className="text-blue-400">{trend.homeTeam}: {trend.publicPercentage.homeML.toFixed(0)}%</p>
                          <p className="text-red-400">{trend.awayTeam}: {trend.publicPercentage.awayML.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">Sharp Money</p>
                          <p className="text-purple-400">{trend.homeTeam}: {trend.sharpPercentage.homeML.toFixed(0)}%</p>
                          <p className="text-yellow-400">{trend.awayTeam}: {trend.sharpPercentage.awayML.toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Over/Under */}
                    <div className="bg-slate-700/30 rounded p-3">
                      <h5 className="text-sm font-medium text-white mb-2">Total Betting</h5>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400 mb-1">Public</p>
                          <p className="text-green-400">Over: {trend.publicPercentage.over.toFixed(0)}%</p>
                          <p className="text-blue-400">Under: {trend.publicPercentage.under.toFixed(0)}%</p>
                        </div>
                        <div>
                          <p className="text-slate-400 mb-1">Sharp</p>
                          <p className="text-green-400">Over: {trend.sharpPercentage.over.toFixed(0)}%</p>
                          <p className="text-blue-400">Under: {trend.sharpPercentage.under.toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="text-xs text-slate-400">
                    <span>Tickets: {(trend.ticketCount / 1000).toFixed(0)}K</span>
                    <span className="mx-2">•</span>
                    <span>Money Split: {trend.moneyPercentage.home.toFixed(0)}% / {trend.moneyPercentage.away.toFixed(0)}%</span>
                  </div>
                  
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-1">
                    <Target className="h-3 w-3" />
                    <span>View Odds</span>
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default BettingTrendsWidget