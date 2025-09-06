'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Play,
  Pause,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Eye,
  Flame,
  RefreshCw,
  Volume2,
  VolumeX,
  Settings,
  Maximize2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface LiveGame {
  id: string
  sport: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  quarter: string
  timeRemaining: string
  status: 'live' | 'halftime' | 'timeout'
  possession?: 'home' | 'away'
  momentum: number // -100 to 100
  lastPlay: string
  keyPlayers: {
    name: string
    stats: string
    status: 'hot' | 'cold' | 'normal'
  }[]
}

interface LiveOdds {
  gameId: string
  moneyline: { home: number, away: number }
  spread: { line: number, home: number, away: number }
  total: { line: number, over: number, under: number }
  props: Array<{
    type: string
    line: number
    over: number
    under: number
    player?: string
  }>
  lastUpdate: string
  movement: {
    ml: 'up' | 'down' | 'stable'
    spread: 'up' | 'down' | 'stable'
    total: 'up' | 'down' | 'stable'
  }
}

interface LiveBet {
  id: string
  gameId: string
  type: 'ml' | 'spread' | 'total' | 'prop'
  selection: string
  odds: number
  probability: number
  expectedValue: number
  confidence: number
  timeLeft: number // seconds
  momentum: 'with' | 'against' | 'neutral'
  recommendation: 'strong_buy' | 'buy' | 'hold' | 'avoid'
}

const MomentumIndicator = ({ value, size = 'normal' }: { value: number, size?: 'small' | 'normal' | 'large' }) => {
  const getColor = () => {
    if (value > 30) return 'text-green-400 bg-green-500/20'
    if (value > 0) return 'text-yellow-400 bg-yellow-500/20'
    if (value > -30) return 'text-orange-400 bg-orange-500/20'
    return 'text-red-400 bg-red-500/20'
  }

  const getIcon = () => {
    if (Math.abs(value) > 50) return <Flame className={cn("text-current", 
      size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4')} />
    if (value > 15) return <TrendingUp className={cn("text-current", 
      size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4')} />
    if (value < -15) return <TrendingDown className={cn("text-current", 
      size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4')} />
    return <Activity className={cn("text-current", 
      size === 'small' ? 'h-3 w-3' : size === 'large' ? 'h-6 w-6' : 'h-4 w-4')} />
  }

  return (
    <div className={cn(
      "flex items-center space-x-1 px-2 py-1 rounded-full",
      getColor(),
      size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-sm'
    )}>
      {getIcon()}
      <span className="font-medium">{Math.abs(value).toFixed(0)}</span>
    </div>
  )
}

const LiveGameCard = ({ 
  game, 
  odds, 
  liveBets,
  onPlaceBet 
}: { 
  game: LiveGame
  odds: LiveOdds | null
  liveBets: LiveBet[]
  onPlaceBet: (bet: LiveBet) => void
}) => {
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return 'text-green-400 bg-green-500/20 border-green-500/50'
      case 'buy': return 'text-blue-400 bg-blue-500/20 border-blue-500/50'
      case 'hold': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/50'
      case 'avoid': return 'text-red-400 bg-red-500/20 border-red-500/50'
      default: return 'text-slate-400 bg-slate-500/20 border-slate-500/50'
    }
  }

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return <Target className="h-3 w-3" />
      case 'buy': return <CheckCircle className="h-3 w-3" />
      case 'hold': return <Clock className="h-3 w-3" />
      case 'avoid': return <AlertTriangle className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  return (
    <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white mb-2">
              {game.awayTeam} @ {game.homeTeam}
            </CardTitle>
            
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Activity className="h-3 w-3 text-green-400" />
                <span className="text-green-400">LIVE</span>
              </div>
              <span className="text-slate-400">{game.quarter} - {game.timeRemaining}</span>
              <span className="text-slate-400">{game.sport}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <MomentumIndicator value={game.momentum} size="small" />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-slate-400 hover:text-white"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Live Score */}
        <div className="grid grid-cols-2 gap-4">
          <div className={cn(
            "text-center p-3 rounded-lg border",
            game.possession === 'away' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700'
          )}>
            <p className="text-slate-400 text-sm">{game.awayTeam}</p>
            <p className="text-3xl font-bold text-white">{game.awayScore}</p>
          </div>
          
          <div className={cn(
            "text-center p-3 rounded-lg border",
            game.possession === 'home' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700'
          )}>
            <p className="text-slate-400 text-sm">{game.homeTeam}</p>
            <p className="text-3xl font-bold text-white">{game.homeScore}</p>
          </div>
        </div>

        {/* Last Play */}
        <div className="bg-slate-700/50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Play className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-slate-400">LAST PLAY</span>
          </div>
          <p className="text-sm text-white">{game.lastPlay}</p>
        </div>

        {/* Live Betting Options */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-white flex items-center space-x-2">
            <Target className="h-4 w-4 text-green-400" />
            <span>Live Betting Opportunities</span>
            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
              {liveBets.length} available
            </span>
          </h4>
          
          {liveBets.slice(0, expanded ? liveBets.length : 3).map((bet) => (
            <div key={bet.id} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">{bet.selection}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-blue-400 font-medium">{formatOdds(bet.odds)}</span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-green-400 text-xs">
                      {bet.expectedValue > 0 ? '+' : ''}{bet.expectedValue.toFixed(1)}% EV
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-yellow-400 text-xs">
                      {(bet.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    "flex items-center space-x-1 px-2 py-1 rounded border text-xs",
                    getRecommendationColor(bet.recommendation)
                  )}>
                    {getRecommendationIcon(bet.recommendation)}
                    <span className="uppercase font-medium">{bet.recommendation.replace('_', ' ')}</span>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Time Left</p>
                    <p className="text-white font-medium text-sm">
                      {Math.floor(bet.timeLeft / 60)}:{(bet.timeLeft % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">Momentum:</span>
                    <span className={cn(
                      "font-medium",
                      bet.momentum === 'with' ? 'text-green-400' :
                      bet.momentum === 'against' ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {bet.momentum}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <span className="text-slate-400">True Prob:</span>
                    <span className="text-white font-medium">
                      {(bet.probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onPlaceBet(bet)}
                  disabled={bet.recommendation === 'avoid'}
                  variant={bet.recommendation === 'strong_buy' ? 'default' : 'outline'}
                  className={cn(
                    "text-white",
                    bet.recommendation === 'strong_buy' ? 
                      'bg-green-600 hover:bg-green-700' :
                      'border-slate-700'
                  )}
                >
                  <DollarSign className="h-3 w-3 mr-1" />
                  Bet Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Player Performance (if expanded) */}
        {expanded && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-white">Key Player Performance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Array.isArray(game.keyPlayers) && game.keyPlayers.length > 0 ? game.keyPlayers.map((player, index) => (
                <div key={index} className="bg-slate-700/30 rounded p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium">{player?.name || 'Unknown Player'}</span>
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      player?.status === 'hot' ? 'bg-green-400' :
                      player?.status === 'cold' ? 'bg-red-400' : 'bg-slate-400'
                    )} />
                  </div>
                  <p className="text-xs text-slate-400">{player?.stats || 'No stats available'}</p>
                </div>
              )) : (
                <div className="col-span-2 text-center text-slate-400 text-sm py-4">
                  No player performance data available
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Odds Movement */}
        {odds && odds.movement && odds.moneyline && odds.spread && odds.total && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/50">
          <div className="text-center">
            <p className="text-xs text-slate-400">ML Movement</p>
            <div className="flex items-center justify-center space-x-1">
              {odds.movement?.ml === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
              {odds.movement?.ml === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
              {odds.movement?.ml === 'stable' && <Activity className="h-3 w-3 text-slate-400" />}
              <span className="text-xs text-white">
                {formatOdds(odds.moneyline?.home || 0)} / {formatOdds(odds.moneyline?.away || 0)}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-400">Spread</p>
            <div className="flex items-center justify-center space-x-1">
              {odds.movement?.spread === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
              {odds.movement?.spread === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
              {odds.movement?.spread === 'stable' && <Activity className="h-3 w-3 text-slate-400" />}
              <span className="text-xs text-white">
                {(odds.spread?.line || 0) > 0 ? '+' : ''}{odds.spread?.line || 0}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-slate-400">Total</p>
            <div className="flex items-center justify-center space-x-1">
              {odds.movement?.total === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
              {odds.movement?.total === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
              {odds.movement?.total === 'stable' && <Activity className="h-3 w-3 text-slate-400" />}
              <span className="text-xs text-white">{odds.total?.line || 0}</span>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function LiveBettingInterface() {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([])
  const [liveOdds, setLiveOdds] = useState<{ [gameId: string]: LiveOdds }>({})
  const [liveBets, setLiveBets] = useState<{ [gameId: string]: LiveBet[] }>({})
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(5) // seconds
  const [filter, setFilter] = useState<'all' | 'high_value' | 'momentum' | 'closing'>('all')

  useEffect(() => {
    const fetchLiveGames = async () => {
      try {
        const response = await fetch('/api/live-games?includeOdds=true&includeStats=true')
        const data = await response.json()
        
        if (data.success && data.data) {
          const games: LiveGame[] = []
          const odds: { [gameId: string]: LiveOdds } = {}
          const bets: { [gameId: string]: LiveBet[] } = {}
          
          // Process real live games data
          for (const sportData of data.data) {
            for (const game of sportData.games) {
              if (game.status === 'inprogress') {
                const gameId = game.id
                
                // Create live game object from real data
                const liveGame: LiveGame = {
                  id: gameId,
                  sport: sportData.sport,
                  homeTeam: game.home_team?.name || 'Home Team',
                  awayTeam: game.away_team?.name || 'Away Team',
                  homeScore: Number(game.home_points) || 0,
                  awayScore: Number(game.away_points) || 0,
                  quarter: String(game.quarter || 'Unknown'),
                  timeRemaining: String(game.clock || 'Unknown'),
                  status: 'live',
                  possession: game.possession,
                  momentum: Number(game.momentum) || 0,
                  lastPlay: String(game.lastPlay || 'Live game in progress'),
                  keyPlayers: Array.isArray(game.players) ? game.players.map(player => ({
                    name: player?.name || 'Unknown Player',
                    stats: player?.stats || 'No stats available',
                    status: (player?.status === 'hot' || player?.status === 'cold') ? player.status : 'normal'
                  })) : []
                }
                
                games.push(liveGame)
                
                // Process odds if available
                if (game.odds) {
                  odds[gameId] = {
                    gameId,
                    moneyline: game.odds.moneyline || { home: 0, away: 0 },
                    spread: game.odds.spread || { line: 0, home: -110, away: -110 },
                    total: game.odds.total || { line: 0, over: -110, under: -110 },
                    props: Array.isArray(game.odds.props) ? game.odds.props : [],
                    lastUpdate: new Date().toISOString(),
                    movement: game.odds.movement || { ml: 'stable', spread: 'stable', total: 'stable' }
                  }
                  
                  // Create betting opportunities from real odds
                  bets[gameId] = []
                  // Add real betting opportunities here based on odds analysis
                }
              }
            }
          }
          
          setLiveGames(games)
          setLiveOdds(odds)
          setLiveBets(bets)
        } else {
          // No live games available - set empty states
          setLiveGames([])
          setLiveOdds({})
          setLiveBets({})
        }
      } catch (error) {
        console.error('Failed to fetch live games:', error)
        // Set empty states on error
        setLiveGames([])
        setLiveOdds({})
        setLiveBets({})
      }
    }

    fetchLiveGames()

    // Auto refresh
    if (autoRefresh) {
      const interval = setInterval(fetchLiveGames, refreshInterval * 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  const handlePlaceBet = (bet: LiveBet) => {
    console.log('Placing live bet:', bet)
    // Handle bet placement
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live In-Game Betting</h2>
          <p className="text-slate-400">Real-time opportunities with momentum analysis</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Auto Refresh:</span>
            <Button
              size="sm"
              variant={autoRefresh ? 'default' : 'outline'}
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="text-white"
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", autoRefresh && "animate-spin")} />
              {autoRefresh ? 'ON' : 'OFF'}
            </Button>
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value={3}>3s</option>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={30}>30s</option>
          </select>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Games</option>
            <option value="high_value">High Value</option>
            <option value="momentum">Strong Momentum</option>
            <option value="closing">Closing Soon</option>
          </select>
        </div>
      </div>

      {/* Live Games Grid */}
      <div className="space-y-6">
        {liveGames.map(game => (
          <LiveGameCard
            key={game.id}
            game={game}
            odds={liveOdds[game.id] || null}
            liveBets={liveBets[game.id] || []}
            onPlaceBet={handlePlaceBet}
          />
        ))}
      </div>

      {liveGames.length === 0 && (
        <Card className="glass border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Live Games</h3>
            <p className="text-slate-400">
              Check back when games are in progress for live betting opportunities
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}