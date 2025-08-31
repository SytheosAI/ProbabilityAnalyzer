'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calculator,
  RefreshCw,
  Filter,
  Eye,
  DollarSign,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle,
  Loader2,
  BarChart3,
  LineChart,
  PieChart,
  Users,
  Brain,
  Clock,
  Activity,
  Star,
  Shield,
  Flame
} from 'lucide-react'
import { cn, formatPercentage, formatOdds, getValueRating, getConfidenceColor } from '@/lib/utils'
import { MoneylinePrediction, Game } from '@/types/sports'
import { LiveGame } from '@/services/liveSportsApi'
import OddsMovementChart from '../widgets/OddsMovementChart'

// Enhanced prediction interface
interface AdvancedMoneylinePrediction extends MoneylinePrediction {
  markets: {
    spread: { line: number, odds: number, probability: number }
    total: { line: number, overOdds: number, underOdds: number, overProb: number, underProb: number }
    props: Array<{ type: string, line: number, odds: number, probability: number }>
  }
  sharpMoney: {
    percentage: number
    direction: 'home' | 'away'
    volume: number
  }
  publicBetting: {
    percentage: number
    tickets: number
    direction: 'home' | 'away'
  }
  lineMovement: {
    opening: number
    current: number
    direction: 'up' | 'down' | 'stable'
    steamMove: boolean
  }
  closingLineValue: number
  modelAgreement: number
  historicalPerformance: {
    winRate: number
    avgOdds: number
    roi: number
  }
}

const AdvancedValueIndicator = ({ 
  rating, 
  expectedValue, 
  confidence 
}: { 
  rating: string
  expectedValue: number
  confidence: number 
}) => {
  const getIndicatorConfig = () => {
    if (expectedValue > 15 && confidence > 0.8) {
      return { 
        color: 'text-green-400', 
        bg: 'bg-green-500/20 border-green-500/50', 
        icon: Star,
        label: 'Premium',
        pulse: true
      }
    } else if (expectedValue > 10 && confidence > 0.7) {
      return { 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20 border-blue-500/50', 
        icon: Award,
        label: 'Excellent',
        pulse: false
      }
    } else if (expectedValue > 5) {
      return { 
        color: 'text-yellow-400', 
        bg: 'bg-yellow-500/20 border-yellow-500/50', 
        icon: CheckCircle,
        label: 'Good',
        pulse: false
      }
    } else {
      return { 
        color: 'text-red-400', 
        bg: 'bg-red-500/20 border-red-500/50', 
        icon: AlertTriangle,
        label: 'Poor',
        pulse: false
      }
    }
  }
  
  const config = getIndicatorConfig()
  const { color, bg, icon: Icon, label, pulse } = config
  
  return (
    <div className={cn(
      "flex items-center space-x-2 px-3 py-2 rounded-lg border",
      bg,
      pulse ? "animate-pulse" : ""
    )}>
      <Icon className={cn("h-4 w-4", color)} />
      <div className="flex flex-col">
        <span className={cn("text-sm font-bold", color)}>{label}</span>
        <span className="text-xs text-slate-400">
          {expectedValue.toFixed(1)}% EV • {(confidence * 100).toFixed(0)}% conf
        </span>
      </div>
    </div>
  )
}

const MarketCard = ({ 
  title, 
  icon: Icon, 
  data, 
  color = "blue" 
}: { 
  title: string
  icon: React.ElementType
  data: any
  color?: string 
}) => (
  <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
    <div className="flex items-center space-x-2 mb-3">
      <Icon className={cn("h-4 w-4", {
        'text-blue-400': color === 'blue',
        'text-green-400': color === 'green',
        'text-yellow-400': color === 'yellow',
        'text-purple-400': color === 'purple'
      })} />
      <span className="text-sm font-medium text-white">{title}</span>
    </div>
    {data}
  </div>
)

const AdvancedMoneylineCard = ({ 
  prediction, 
  game, 
  expanded = false,
  onToggleExpand 
}: { 
  prediction: AdvancedMoneylinePrediction
  game: LiveGame
  expanded?: boolean
  onToggleExpand?: () => void
}) => {
  const [activeMarket, setActiveMarket] = useState<'ml' | 'spread' | 'total' | 'props'>('ml')
  
  return (
    <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 card-glow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white flex items-center space-x-2 mb-2">
              <span>{game.awayTeam} @ {game.homeTeam}</span>
              <div className="text-xs bg-slate-700 px-2 py-1 rounded">
                {prediction.sport.toUpperCase()}
              </div>
              {prediction.lineMovement.steamMove && (
                <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded">
                  <Flame className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">STEAM</span>
                </div>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span>{new Date(game.scheduled).toLocaleDateString()}</span>
              <span>•</span>
              <span>{game.venue}</span>
              <span>•</span>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>Live</span>
              </div>
            </div>
          </div>
          
          <AdvancedValueIndicator 
            rating={prediction.value_rating}
            expectedValue={prediction.expected_value}
            confidence={prediction.confidence_score}
          />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Market Tabs */}
        <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg">
          {[
            { key: 'ml', label: 'Moneyline', icon: Target },
            { key: 'spread', label: 'Spread', icon: BarChart3 },
            { key: 'total', label: 'Total', icon: TrendingUp },
            { key: 'props', label: 'Props', icon: Star }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveMarket(key as any)}
              className={cn(
                "flex-1 flex items-center justify-center space-x-1 py-2 px-3 rounded-md text-xs font-medium transition-colors",
                activeMarket === key 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Market Content */}
        {activeMarket === 'ml' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-400 mb-1">Recommended Bet</p>
                <p className="text-xl font-bold text-white mb-1">{prediction.team}</p>
                <p className="text-blue-400 font-medium text-lg">{formatOdds(prediction.american_odds)}</p>
                <div className="mt-2 pt-2 border-t border-slate-700/50">
                  <p className="text-xs text-slate-400">Implied: {formatPercentage(prediction.implied_probability)}</p>
                  <p className="text-xs text-green-400">True: {formatPercentage(prediction.true_probability)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-slate-400">Expected Value</p>
                    <p className="text-green-400 font-bold text-lg">{prediction.expected_value.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Confidence</p>
                    <p className={cn("font-bold text-lg", getConfidenceColor(prediction.confidence_score))}>
                      {formatPercentage(prediction.confidence_score)}
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Kelly Stake</span>
                    <Calculator className="h-3 w-3 text-yellow-400" />
                  </div>
                  <p className="text-lg font-bold text-yellow-400">
                    {formatPercentage(prediction.kelly_criterion)}
                  </p>
                  <p className="text-xs text-slate-500">of bankroll</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeMarket === 'spread' && (
          <MarketCard
            title="Point Spread Analysis"
            icon={BarChart3}
            color="green"
            data={
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-700/30 rounded p-3">
                  <div>
                    <p className="text-white font-medium">{game.homeTeam}</p>
                    <p className="text-green-400 text-lg font-bold">
                      {prediction.markets.spread.line > 0 ? '+' : ''}{prediction.markets.spread.line}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm">Odds</p>
                    <p className="text-white font-medium">{formatOdds(prediction.markets.spread.odds)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Cover Probability</p>
                    <p className="text-green-400 font-medium">{formatPercentage(prediction.markets.spread.probability)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Edge</p>
                    <p className="text-blue-400 font-medium">+{((prediction.markets.spread.probability - prediction.implied_probability) * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            }
          />
        )}

        {activeMarket === 'total' && (
          <MarketCard
            title="Over/Under Analysis"
            icon={TrendingUp}
            color="yellow"
            data={
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-700/30 rounded p-3 text-center">
                    <p className="text-slate-400 text-xs">Over {prediction.markets.total.line}</p>
                    <p className="text-green-400 font-bold">{formatOdds(prediction.markets.total.overOdds)}</p>
                    <p className="text-xs text-slate-500">{formatPercentage(prediction.markets.total.overProb)}</p>
                  </div>
                  <div className="bg-slate-700/30 rounded p-3 text-center">
                    <p className="text-slate-400 text-xs">Under {prediction.markets.total.line}</p>
                    <p className="text-blue-400 font-bold">{formatOdds(prediction.markets.total.underOdds)}</p>
                    <p className="text-xs text-slate-500">{formatPercentage(prediction.markets.total.underProb)}</p>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                  <p className="text-xs text-yellow-400 text-center">
                    Weather Impact: Light winds favor UNDER
                  </p>
                </div>
              </div>
            }
          />
        )}

        {activeMarket === 'props' && (
          <MarketCard
            title="Player Props"
            icon={Star}
            color="purple"
            data={
              <div className="space-y-2">
                {prediction.markets.props.slice(0, 3).map((prop, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-700/30 rounded p-2">
                    <div>
                      <p className="text-white text-sm font-medium">{prop.type}</p>
                      <p className="text-xs text-slate-400">O/U {prop.line}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-400 font-medium">{formatOdds(prop.odds)}</p>
                      <p className="text-xs text-slate-500">{formatPercentage(prop.probability)}</p>
                    </div>
                  </div>
                ))}
              </div>
            }
          />
        )}

        {/* Advanced Analytics */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t border-slate-700">
            {/* Sharp vs Public */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Sharp Money</span>
                </div>
                <p className="text-2xl font-bold text-purple-400">
                  {prediction.sharpMoney.percentage.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-400">
                  ${(prediction.sharpMoney.volume / 1000).toFixed(0)}K on {prediction.sharpMoney.direction}
                </p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">Public Betting</span>
                </div>
                <p className="text-2xl font-bold text-blue-400">
                  {prediction.publicBetting.percentage.toFixed(0)}%
                </p>
                <p className="text-xs text-slate-400">
                  {(prediction.publicBetting.tickets / 1000).toFixed(0)}K tickets on {prediction.publicBetting.direction}
                </p>
              </div>
            </div>

            {/* Line Movement */}
            <div className="bg-slate-800/30 rounded-lg p-3">
              <h5 className="text-sm font-medium text-white mb-3">Line Movement Analysis</h5>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-slate-400">Opening</p>
                  <p className="text-white font-medium">{formatOdds(prediction.lineMovement.opening)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current</p>
                  <p className="text-white font-medium">{formatOdds(prediction.lineMovement.current)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Direction</p>
                  <div className="flex items-center justify-center space-x-1">
                    {prediction.lineMovement.direction === 'up' ? (
                      <TrendingUp className="h-3 w-3 text-green-400" />
                    ) : prediction.lineMovement.direction === 'down' ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Activity className="h-3 w-3 text-slate-400" />
                    )}
                    <span className={cn("text-xs font-medium", {
                      'text-green-400': prediction.lineMovement.direction === 'up',
                      'text-red-400': prediction.lineMovement.direction === 'down',
                      'text-slate-400': prediction.lineMovement.direction === 'stable'
                    })}>
                      {prediction.lineMovement.direction}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Performance */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-400">Model Agreement</p>
                <p className="text-lg font-bold text-green-400">
                  {formatPercentage(prediction.modelAgreement)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">Historical ROI</p>
                <p className="text-lg font-bold text-blue-400">
                  +{prediction.historicalPerformance.roi.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-400">CLV</p>
                <p className="text-lg font-bold text-yellow-400">
                  +{prediction.closingLineValue.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 pt-4 border-t border-slate-700/50">
          <Button 
            className="flex-1" 
            variant={prediction.expected_value > 10 ? 'default' : 'secondary'}
          >
            <Target className="h-4 w-4 mr-2" />
            Place Bet
          </Button>
          <Button 
            variant="outline" 
            className="text-white border-slate-700"
            onClick={onToggleExpand}
          >
            {expanded ? 'Less' : 'More'}
          </Button>
          <Button variant="outline" className="text-white border-slate-700">
            <Calculator className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdvancedMoneylineDisplay() {
  const [predictions, setPredictions] = useState<AdvancedMoneylinePrediction[]>([])
  const [games, setGames] = useState<LiveGame[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState({
    sport: 'all',
    minEV: 5,
    days: 3 as 1 | 3 | 5,
    valueRating: 'all',
    market: 'all'
  })

  useEffect(() => {
    generateAdvancedPredictions()
  }, [filters.days, filters.sport])

  const generateAdvancedPredictions = () => {
    setLoading(true)
    
    // Simulate advanced prediction generation
    setTimeout(() => {
      const mockPredictions: AdvancedMoneylinePrediction[] = [
        {
          game_id: 'game-1',
          sport: 'nba',
          team: 'Lakers',
          american_odds: -140,
          decimal_odds: 1.71,
          implied_probability: 0.583,
          true_probability: 0.687,
          confidence_score: 0.847,
          expected_value: 17.8,
          edge: 0.178,
          kelly_criterion: 0.045,
          value_rating: 'excellent' as const,
          key_factors: {
            recent_form: 'Strong',
            head_to_head: 'Favorable',
            injury_impact: 'Minimal',
            weather: 'Dome',
            public_betting: '73% on Lakers'
          },
          markets: {
            spread: { line: -4.5, odds: -110, probability: 0.65 },
            total: { line: 225.5, overOdds: -108, underOdds: -112, overProb: 0.52, underProb: 0.48 },
            props: [
              { type: 'LeBron Points', line: 27.5, odds: -115, probability: 0.54 },
              { type: 'AD Rebounds', line: 11.5, odds: +105, probability: 0.47 },
              { type: 'Lakers 3PT Made', line: 12.5, odds: -120, probability: 0.55 }
            ]
          },
          sharpMoney: { percentage: 67, direction: 'home', volume: 125000 },
          publicBetting: { percentage: 73, direction: 'home', tickets: 8750 },
          lineMovement: { opening: -125, current: -140, direction: 'down', steamMove: true },
          closingLineValue: 8.7,
          modelAgreement: 0.89,
          historicalPerformance: { winRate: 0.642, avgOdds: -132, roi: 14.3 }
        }
        // Add more mock predictions...
      ]
      
      const mockGames: LiveGame[] = [
        {
          id: 'game-1',
          sport: 'NBA',
          league: 'NBA',
          homeTeam: 'Lakers',
          awayTeam: 'Warriors',
          scheduled: new Date().toISOString(),
          venue: 'Crypto.com Arena',
          odds: { homeML: -140, awayML: +115, spread: -4.5, total: 225.5 },
          predictions: {
            homeWinProb: 0.687,
            confidence: 0.847,
            expectedValue: 17.8
          }
        }
      ]
      
      setPredictions(mockPredictions)
      setGames(mockGames)
      setLoading(false)
    }, 1000)
  }

  const toggleCardExpansion = (gameId: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId)
    } else {
      newExpanded.add(gameId)
    }
    setExpandedCards(newExpanded)
  }

  const filteredPredictions = predictions.filter(pred => {
    return (
      (filters.sport === 'all' || pred.sport === filters.sport) &&
      pred.expected_value >= filters.minEV &&
      (filters.valueRating === 'all' || pred.value_rating === filters.valueRating)
    )
  })

  return (
    <div className="space-y-6">
      {/* Enhanced Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <select
          value={filters.days}
          onChange={(e) => setFilters(prev => ({ ...prev, days: Number(e.target.value) as 1 | 3 | 5 }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={1}>Next 1 Day</option>
          <option value={3}>Next 3 Days</option>
          <option value={5}>Next 5 Days</option>
        </select>
        
        <select
          value={filters.sport}
          onChange={(e) => setFilters(prev => ({ ...prev, sport: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Sports</option>
          <option value="nfl">NFL</option>
          <option value="nba">NBA</option>
          <option value="mlb">MLB</option>
          <option value="nhl">NHL</option>
        </select>
        
        <select
          value={filters.minEV}
          onChange={(e) => setFilters(prev => ({ ...prev, minEV: Number(e.target.value) }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value={0}>Any EV</option>
          <option value={3}>3%+ EV</option>
          <option value={5}>5%+ EV</option>
          <option value={10}>10%+ EV</option>
          <option value={15}>15%+ EV</option>
        </select>
        
        <select
          value={filters.valueRating}
          onChange={(e) => setFilters(prev => ({ ...prev, valueRating: e.target.value }))}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Ratings</option>
          <option value="excellent">Excellent Only</option>
          <option value="good">Good+</option>
          <option value="moderate">Moderate+</option>
        </select>
        
        <Button
          onClick={generateAdvancedPredictions}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Advanced Cards Grid */}
      <div className="space-y-6">
        {filteredPredictions.map(prediction => {
          const game = games.find(g => g.id === prediction.game_id)
          return game ? (
            <AdvancedMoneylineCard
              key={prediction.game_id}
              prediction={prediction}
              game={game}
              expanded={expandedCards.has(prediction.game_id)}
              onToggleExpand={() => toggleCardExpansion(prediction.game_id)}
            />
          ) : null
        })}
      </div>

      {loading && (
        <Card className="glass border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-white mb-2">Loading Advanced Analysis...</h3>
            <p className="text-slate-400">
              Processing market data, line movements, and sharp money indicators
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}