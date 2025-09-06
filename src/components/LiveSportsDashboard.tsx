'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity,
  TrendingUp,
  DollarSign,
  Target,
  AlertCircle,
  RefreshCw,
  Trophy,
  Zap,
  BarChart3,
  Clock,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Percent
} from 'lucide-react'

interface LiveSportsDashboardProps {
  initialSport?: string
  autoRefresh?: boolean
}

export default function LiveSportsDashboard({ 
  initialSport = 'all',
  autoRefresh = true 
}: LiveSportsDashboardProps) {
  const [selectedSport, setSelectedSport] = useState(initialSport)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState('games')

  const sports = [
    { id: 'all', name: 'All Sports', icon: '🏆' },
    { id: 'NBA', name: 'NBA', icon: '🏀' },
    { id: 'NFL', name: 'NFL', icon: '🏈' },
    { id: 'MLB', name: 'MLB', icon: '⚾' },
    { id: 'NHL', name: 'NHL', icon: '🏒' },
    { id: 'NCAAB', name: 'NCAA Basketball', icon: '🏀' },
    { id: 'NCAAF', name: 'NCAA Football', icon: '🏈' },
    { id: 'TENNIS', name: 'Tennis', icon: '🎾' },
    { id: 'SOCCER', name: 'Soccer', icon: '⚽' }
  ]

  useEffect(() => {
    fetchLiveData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchLiveData, 60000) // Refresh every minute
      return () => clearInterval(interval)
    }
  }, [selectedSport])

  const fetchLiveData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const params = new URLSearchParams({
        analysis: 'true',
        parlays: 'true'
      })
      
      if (selectedSport !== 'all') {
        params.append('sport', selectedSport)
      }
      
      const response = await fetch(`/api/sports/live-data?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastUpdate(new Date())
      } else {
        throw new Error(result.error || 'Failed to fetch data')
      }
    } catch (err) {
      console.error('Error fetching live data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch live data')
    } finally {
      setLoading(false)
    }
  }

  const analyzeGame = async (gameId: string, sport: string) => {
    try {
      const response = await fetch('/api/sports/live-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, sport, action: 'analyze' })
      })
      
      const result = await response.json()
      if (result.success) {
        // Update specific game in state
        console.log('Game analysis:', result.data)
      }
    } catch (err) {
      console.error('Error analyzing game:', err)
    }
  }

  const formatOdds = (odds: number) => {
    if (!odds) return 'N/A'
    return odds > 0 ? `+${odds}` : odds.toString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'text-green-400'
      case 'scheduled': return 'text-blue-400'
      case 'final': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getEdgeColor = (edge: number) => {
    if (edge > 0.10) return 'text-green-400'
    if (edge > 0.05) return 'text-yellow-400'
    return 'text-gray-400'
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-slate-400">Fetching live sports data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="bg-red-500/10 border-red-500/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <Button
              onClick={fetchLiveData}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Sports Analysis</h2>
          <p className="text-slate-400">
            Real-time data from {data?.stats?.sportsActive || 0} active sports
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-400">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            onClick={fetchLiveData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="text-blue-400 border-blue-500/50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sport Selector */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {sports.map(sport => (
          <Button
            key={sport.id}
            onClick={() => setSelectedSport(sport.id)}
            variant={selectedSport === sport.id ? 'default' : 'outline'}
            size="sm"
            className="flex-shrink-0"
          >
            <span className="mr-2">{sport.icon}</span>
            {sport.name}
          </Button>
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Games</p>
                <p className="text-2xl font-bold text-white">
                  {data?.stats?.totalGames || 0}
                </p>
                <p className="text-xs text-green-400">
                  {data?.stats?.liveGames || 0} live
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Value Bets</p>
                <p className="text-2xl font-bold text-white">
                  {data?.stats?.valueBetsFound || 0}
                </p>
                <p className="text-xs text-green-400">
                  Avg {((data?.stats?.avgConfidence || 0) * 100).toFixed(0)}% conf
                </p>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Arbitrage</p>
                <p className="text-2xl font-bold text-white">
                  {data?.stats?.arbitrageOpportunities || 0}
                </p>
                {data?.stats?.bestArbitrage && (
                  <p className="text-xs text-yellow-400">
                    +{data.stats.bestArbitrage.profitPercentage.toFixed(1)}% best
                  </p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Predictions</p>
                <p className="text-2xl font-bold text-white">
                  {data?.stats?.predictionsGenerated || 0}
                </p>
                <p className="text-xs text-blue-400">
                  ML models active
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="games">Live Games</TabsTrigger>
          <TabsTrigger value="value">Value Bets</TabsTrigger>
          <TabsTrigger value="parlays">Parlays</TabsTrigger>
          <TabsTrigger value="arbitrage">Arbitrage</TabsTrigger>
        </TabsList>

        {/* Games Tab */}
        <TabsContent value="games" className="space-y-4">
          {data?.games?.length > 0 ? (
            <div className="grid gap-4">
              {data.games.slice(0, 10).map((game: any) => (
                <Card key={game.id} className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <Badge className={getStatusColor(game.status)}>
                            {game.status.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-slate-400">{game.sport}</span>
                          {game.period && (
                            <span className="text-sm text-slate-400">
                              {game.period} {game.clock && `- ${game.clock}`}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">{game.homeTeam?.name || 'Home Team'}</span>
                              <span className="text-xl font-bold text-white">{game.homeTeam?.score || '-'}</span>
                            </div>
                            {game.prediction && (
                              <div className="text-sm text-slate-400">
                                Win: {((game.prediction?.homeWinProb || 0) * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-white font-medium">{game.awayTeam?.name || 'Away Team'}</span>
                              <span className="text-xl font-bold text-white">{game.awayTeam?.score || '-'}</span>
                            </div>
                            {game.prediction && (
                              <div className="text-sm text-slate-400">
                                Win: {((game.prediction?.awayWinProb || 0) * 100).toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {game.prediction && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-400">Expected Total: {game.prediction.expectedTotal.toFixed(1)}</span>
                              <span className="text-slate-400">Spread: {game.prediction.expectedSpread.toFixed(1)}</span>
                              <span className="text-slate-400">Confidence: {(game.prediction.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => analyzeGame(game.id, game.sport)}
                        variant="ghost"
                        size="sm"
                        className="ml-4"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No games available for selected sport</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Value Bets Tab */}
        <TabsContent value="value" className="space-y-4">
          {data?.valueBets?.length > 0 ? (
            <div className="grid gap-4">
              {data.valueBets.map((bet: any, index: number) => (
                <Card key={index} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge variant="outline" className="text-blue-400 border-blue-500/50">
                            {bet.sport}
                          </Badge>
                          <span className="text-white font-medium">
                            {bet.game?.homeTeam?.name || 'Home Team'} vs {bet.game?.awayTeam?.name || 'Away Team'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400">Bet Type</p>
                            <p className="text-white font-medium">{bet.betType} - {bet.selection}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Current Odds</p>
                            <p className="text-white font-medium">{formatOdds(bet.currentOdds)}</p>
                          </div>
                          <div>
                            <p className="text-slate-400">Edge</p>
                            <p className={`font-medium ${getEdgeColor(bet.edge)}`}>
                              {(bet.edge * 100).toFixed(1)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400">Expected Value</p>
                            <p className="text-green-400 font-medium">
                              +{bet.expectedValue.toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-slate-400">
                              Kelly: {(bet.kellyFraction * 100).toFixed(1)}%
                            </span>
                            <span className="text-slate-400">
                              Confidence: {(bet.confidence * 100).toFixed(0)}%
                            </span>
                            <span className="text-slate-400">
                              Book: {bet.book}
                            </span>
                          </div>
                          {bet.sharpAction && (
                            <Badge 
                              variant="outline" 
                              className={
                                bet.sharpAction === 'agree' 
                                  ? 'text-green-400 border-green-500/50'
                                  : 'text-yellow-400 border-yellow-500/50'
                              }
                            >
                              Sharp: {bet.sharpAction}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No value bets found at this time</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Parlays Tab */}
        <TabsContent value="parlays" className="space-y-4">
          {data?.parlays?.parlays?.length > 0 ? (
            <div className="space-y-4">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Optimal Parlay Strategy</CardTitle>
                  <CardDescription>
                    {data.parlays.type} strategy - Total EV: +{data.parlays.totalExpectedValue.toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {data.parlays.parlays.map((parlay: any, index: number) => (
                      <div key={index} className="p-4 bg-slate-700/50 rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className="text-green-400 border-green-500/50">
                            {parlay.legs.length}-Leg Parlay
                          </Badge>
                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-slate-400">
                              Odds: {formatOdds(parlay.combinedOdds)}
                            </span>
                            <span className="text-green-400">
                              EV: +{parlay.expectedValue.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {parlay.legs.map((leg: any, legIndex: number) => (
                            <div key={legIndex} className="flex items-center justify-between text-sm">
                              <span className="text-white">
                                {leg.sport} - {leg.selection}
                              </span>
                              <span className="text-slate-400">
                                {formatOdds(leg.odds)}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        <div className="pt-2 border-t border-slate-600">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-400">
                              Correlation: {(parlay.correlation * 100).toFixed(0)}%
                            </span>
                            <span className="text-slate-400">
                              Risk: {parlay.risk.toUpperCase()}
                            </span>
                            <span className="text-slate-400">
                              Kelly: {(parlay.kellyStake * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {data.parlays.recommendations && (
                <Card className="bg-blue-500/10 border-blue-500/50">
                  <CardHeader>
                    <CardTitle className="text-blue-400 text-lg">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.parlays.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start space-x-2">
                          <ChevronRight className="h-4 w-4 text-blue-400 mt-0.5" />
                          <span className="text-slate-300 text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">Analyzing parlay opportunities...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Arbitrage Tab */}
        <TabsContent value="arbitrage" className="space-y-4">
          {data?.arbitrage?.length > 0 ? (
            <div className="grid gap-4">
              {data.arbitrage.map((arb: any, index: number) => (
                <Card key={index} className="bg-yellow-500/10 border-yellow-500/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="text-yellow-400 border-yellow-500">
                        ARBITRAGE OPPORTUNITY
                      </Badge>
                      <span className="text-2xl font-bold text-yellow-400">
                        +{arb.profitPercentage.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        {arb.legs.map((leg: any, legIndex: number) => (
                          <div key={legIndex} className="p-3 bg-slate-800/50 rounded">
                            <p className="text-sm text-slate-400">{leg.book}</p>
                            <p className="text-white font-medium">
                              {leg.betType} - {leg.selection}
                            </p>
                            <p className="text-green-400">
                              {formatOdds(leg.odds)} • ${leg.stake.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-700">
                        <span className="text-slate-400">
                          Total Stake: ${arb.totalStake.toFixed(2)}
                        </span>
                        <span className="text-green-400 font-medium">
                          Guaranteed Profit: ${arb.guaranteedProfit.toFixed(2)}
                        </span>
                      </div>
                      
                      {arb.warnings && arb.warnings.length > 0 && (
                        <div className="space-y-1">
                          {arb.warnings.map((warning: string, wIndex: number) => (
                            <div key={wIndex} className="flex items-center space-x-2 text-sm">
                              <AlertCircle className="h-3 w-3 text-yellow-400" />
                              <span className="text-yellow-400">{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-8 text-center">
                <p className="text-slate-400">No arbitrage opportunities detected</p>
                <p className="text-sm text-slate-500 mt-2">
                  Arbitrage opportunities are rare and close quickly
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}