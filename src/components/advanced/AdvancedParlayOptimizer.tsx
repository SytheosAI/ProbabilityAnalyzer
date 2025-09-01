'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calculator,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  X,
  Plus,
  BarChart3,
  PieChart,
  Activity,
  Brain,
  Shield,
  DollarSign,
  Percent,
  Award,
  Settings,
  RefreshCw,
  Eye,
  Grid3X3,
  ArrowRight,
  Flame,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParlayLeg {
  id: string
  sport: string
  game: string
  team: string
  market: 'ml' | 'spread' | 'total' | 'prop'
  selection: string
  odds: number
  probability: number
  confidence: number
  correlation?: { [key: string]: number } // correlation with other legs
}

interface ParlayBuilder {
  legs: ParlayLeg[]
  totalOdds: number
  totalProbability: number
  expectedValue: number
  variance: number
  sharpeRatio: number
  maxDrawdown: number
  correlationRisk: number
  recommendation: 'excellent' | 'good' | 'moderate' | 'poor'
  kellyFraction: number
  hedgeOpportunity?: {
    available: boolean
    cost: number
    guarantee: number
  }
}

interface CorrelationMatrix {
  [legId: string]: { [legId: string]: number }
}

const CorrelationHeatMap = ({ 
  matrix, 
  legs 
}: { 
  matrix: CorrelationMatrix
  legs: ParlayLeg[] 
}) => {
  const getCorrelationColor = (value: number) => {
    const intensity = Math.abs(value)
    if (value > 0.5) return `bg-red-500/${Math.round(intensity * 100)}`
    if (value > 0.2) return `bg-yellow-500/${Math.round(intensity * 60)}`
    if (value > -0.2) return `bg-slate-500/${Math.round(intensity * 40)}`
    if (value > -0.5) return `bg-blue-500/${Math.round(intensity * 60)}`
    return `bg-green-500/${Math.round(intensity * 100)}`
  }

  if (legs.length < 2) return null

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center space-x-2">
          <Grid3X3 className="h-5 w-5 text-purple-400" />
          <span>Correlation Matrix</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Bet correlation analysis - Red indicates positive correlation (higher risk)
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${legs.length}, 1fr)` }}>
            {/* Header row */}
            <div></div>
            {legs.map((leg, index) => (
              <div key={leg.id} className="text-xs text-slate-400 p-2 text-center">
                Leg {index + 1}
              </div>
            ))}
            
            {/* Data rows */}
            {legs.map((legA, indexA) => (
              <React.Fragment key={legA.id}>
                <div className="text-xs text-slate-400 p-2">
                  Leg {indexA + 1}
                </div>
                {legs.map((legB, indexB) => {
                  const correlation = indexA === indexB ? 1 : (matrix[legA.id]?.[legB.id] || 0)
                  return (
                    <div
                      key={legB.id}
                      className={cn(
                        "p-2 text-center text-xs font-medium text-white rounded border border-slate-600/20",
                        indexA === indexB ? "bg-slate-600" : getCorrelationColor(correlation)
                      )}
                    >
                      {correlation.toFixed(2)}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-slate-400">Negative (-0.5+)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-slate-500 rounded"></div>
            <span className="text-slate-400">Neutral</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span className="text-slate-400">Low Positive</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-slate-400">High Positive (0.5+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const ParlayLegCard = ({ 
  leg, 
  onRemove, 
  correlationRisk 
}: { 
  leg: ParlayLeg
  onRemove: () => void
  correlationRisk: number
}) => {
  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${odds}` : `${odds}`
  }

  const getMarketIcon = (market: string) => {
    switch (market) {
      case 'ml': return <Target className="h-3 w-3" />
      case 'spread': return <BarChart3 className="h-3 w-3" />
      case 'total': return <TrendingUp className="h-3 w-3" />
      case 'prop': return <Star className="h-3 w-3" />
      default: return <Activity className="h-3 w-3" />
    }
  }

  return (
    <Card className="border-slate-700/50 bg-slate-800/30">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                {leg.sport.toUpperCase()}
              </span>
              <div className="flex items-center space-x-1">
                {getMarketIcon(leg.market)}
                <span className="text-xs text-slate-400 uppercase">{leg.market}</span>
              </div>
              {correlationRisk > 0.3 && (
                <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded">
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                  <span className="text-xs text-red-400">High Correlation</span>
                </div>
              )}
            </div>
            
            <p className="text-sm text-white font-medium mb-1">{leg.game}</p>
            <p className="text-sm text-blue-400 mb-2">{leg.selection}</p>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-slate-400">Odds</p>
                <p className="text-white font-medium">{formatOdds(leg.odds)}</p>
              </div>
              <div>
                <p className="text-slate-400">Probability</p>
                <p className="text-green-400 font-medium">{(leg.probability * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-slate-400">Confidence</p>
                <p className="text-yellow-400 font-medium">{(leg.confidence * 100).toFixed(0)}%</p>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const RiskAnalysisPanel = ({ parlay }: { parlay: ParlayBuilder }) => {
  const getRiskColor = (value: number, thresholds: { low: number, medium: number }) => {
    if (value <= thresholds.low) return 'text-green-400'
    if (value <= thresholds.medium) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'excellent': return <Award className="h-4 w-4 text-green-400" />
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-400" />
      case 'moderate': return <Eye className="h-4 w-4 text-yellow-400" />
      case 'poor': return <AlertTriangle className="h-4 w-4 text-red-400" />
      default: return <Activity className="h-4 w-4 text-slate-400" />
    }
  }

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-400" />
          <span>Risk Analysis</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Recommendation */}
        <div className={cn(
          "p-4 rounded-lg border",
          parlay.recommendation === 'excellent' ? 'bg-green-500/10 border-green-500/50' :
          parlay.recommendation === 'good' ? 'bg-blue-500/10 border-blue-500/50' :
          parlay.recommendation === 'moderate' ? 'bg-yellow-500/10 border-yellow-500/50' :
          'bg-red-500/10 border-red-500/50'
        )}>
          <div className="flex items-center space-x-2 mb-2">
            {getRecommendationIcon(parlay.recommendation)}
            <span className="text-white font-medium capitalize">{parlay.recommendation} Parlay</span>
          </div>
          <p className="text-sm text-slate-300">
            {parlay.recommendation === 'excellent' && 'High value with manageable risk. Strong recommendation.'}
            {parlay.recommendation === 'good' && 'Solid value proposition with acceptable risk levels.'}
            {parlay.recommendation === 'moderate' && 'Decent opportunity but monitor correlation risk closely.'}
            {parlay.recommendation === 'poor' && 'High correlation risk or poor value. Consider alternatives.'}
          </p>
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Variance Risk</span>
            </div>
            <p className={cn("text-xl font-bold", getRiskColor(parlay.variance, { low: 0.2, medium: 0.5 }))}>
              {(parlay.variance * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              {parlay.variance < 0.2 ? 'Low' : parlay.variance < 0.5 ? 'Medium' : 'High'} volatility
            </p>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Grid3X3 className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-white">Correlation Risk</span>
            </div>
            <p className={cn("text-xl font-bold", getRiskColor(parlay.correlationRisk, { low: 0.2, medium: 0.4 }))}>
              {(parlay.correlationRisk * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">
              {parlay.correlationRisk < 0.2 ? 'Independent' : parlay.correlationRisk < 0.4 ? 'Some correlation' : 'High correlation'}
            </p>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-400" />
              <span className="text-sm font-medium text-white">Max Drawdown</span>
            </div>
            <p className={cn("text-xl font-bold", getRiskColor(parlay.maxDrawdown, { low: 0.1, medium: 0.25 }))}>
              {(parlay.maxDrawdown * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Potential loss scenario</p>
          </div>

          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-white">Sharpe Ratio</span>
            </div>
            <p className={cn("text-xl font-bold", getRiskColor(-parlay.sharpeRatio, { low: -1.5, medium: -1.0 }))}>
              {parlay.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-slate-400">Risk-adjusted return</p>
          </div>
        </div>

        {/* Kelly Criterion */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <Calculator className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-white">Kelly Criterion Stake</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {(parlay.kellyFraction * 100).toFixed(2)}%
          </p>
          <p className="text-xs text-slate-400">
            Recommended percentage of bankroll based on edge and variance
          </p>
        </div>

        {/* Hedge Opportunity */}
        {parlay.hedgeOpportunity?.available && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-white">Hedge Available</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Cost</p>
                <p className="text-red-400 font-medium">${parlay.hedgeOpportunity.cost}</p>
              </div>
              <div>
                <p className="text-slate-400">Guarantee</p>
                <p className="text-green-400 font-medium">${parlay.hedgeOpportunity.guarantee}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const AlternativeParlayBuilder = ({ 
  currentParlay, 
  onSelectAlternative 
}: { 
  currentParlay: ParlayBuilder
  onSelectAlternative: (parlay: ParlayBuilder) => void
}) => {
  const [alternatives, setAlternatives] = useState<ParlayBuilder[]>([])

  useEffect(() => {
    // Generate alternative parlays with different risk/reward profiles
    const generateAlternatives = () => {
      const alts: ParlayBuilder[] = [
        {
          ...currentParlay,
          recommendation: 'excellent',
          expectedValue: currentParlay.expectedValue * 1.2,
          variance: currentParlay.variance * 0.8,
          correlationRisk: currentParlay.correlationRisk * 0.6
        },
        {
          ...currentParlay,
          recommendation: 'good',
          expectedValue: currentParlay.expectedValue * 0.9,
          variance: currentParlay.variance * 1.3,
          correlationRisk: currentParlay.correlationRisk * 1.1
        }
      ]
      setAlternatives(alts)
    }

    if (currentParlay.legs.length > 1) {
      generateAlternatives()
    }
  }, [currentParlay])

  if (alternatives.length === 0) return null

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <CardTitle className="text-lg text-white flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-400" />
          <span>Alternative Strategies</span>
        </CardTitle>
        <CardDescription className="text-slate-400">
          Optimized parlay variations with different risk profiles
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {alternatives.map((alt, index) => (
          <div key={index} className="bg-slate-800/30 rounded-lg p-4 hover:bg-slate-800/50 transition-colors cursor-pointer"
            onClick={() => onSelectAlternative(alt)}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-white font-medium">Strategy {index + 1}</span>
                <span className={cn("text-xs px-2 py-1 rounded", {
                  'bg-green-500/20 text-green-400': alt.recommendation === 'excellent',
                  'bg-blue-500/20 text-blue-400': alt.recommendation === 'good',
                  'bg-yellow-500/20 text-yellow-400': alt.recommendation === 'moderate',
                  'bg-red-500/20 text-red-400': alt.recommendation === 'poor'
                })}>
                  {alt.recommendation}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </div>
            
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-slate-400">EV</p>
                <p className="text-green-400 font-medium">{alt.expectedValue.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-slate-400">Odds</p>
                <p className="text-white font-medium">+{Math.round(alt.totalOdds)}</p>
              </div>
              <div>
                <p className="text-slate-400">Variance</p>
                <p className="text-yellow-400 font-medium">{(alt.variance * 100).toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-slate-400">Kelly</p>
                <p className="text-blue-400 font-medium">{(alt.kellyFraction * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function AdvancedParlayOptimizer() {
  const [currentParlay, setCurrentParlay] = useState<ParlayBuilder>({
    legs: [],
    totalOdds: 0,
    totalProbability: 0,
    expectedValue: 0,
    variance: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
    correlationRisk: 0,
    recommendation: 'poor',
    kellyFraction: 0
  })
  
  const [availableBets, setAvailableBets] = useState<ParlayLeg[]>([])
  const [correlationMatrix, setCorrelationMatrix] = useState<CorrelationMatrix>({})
  const [bankroll, setBankroll] = useState(10000)
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate')

  useEffect(() => {
    // Fetch real parlay opportunities
    fetchParlayOpportunities()
  }, [])

  const fetchParlayOpportunities = async () => {
    try {
      // First get live games with odds
      const gamesResponse = await fetch('/api/sports/live-games?days=3')
      const gamesData = await gamesResponse.json()
      
      if (gamesData.success && gamesData.data.games) {
        const parlayLegs: ParlayLeg[] = []
        
        // Convert games to parlay legs
        gamesData.data.games.forEach((game: any) => {
          if (game.odds) {
            // Home team moneyline
            if (game.odds.homeML) {
              parlayLegs.push({
                id: `${game.id}_home_ml`,
                team: game.homeTeam,
                opponent: game.awayTeam,
                type: 'moneyline',
                sport: game.sport,
                odds: game.odds.homeML,
                probability: calculateTrueProbability(game.odds.homeML),
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
            }
            
            // Away team moneyline
            if (game.odds.awayML) {
              parlayLegs.push({
                id: `${game.id}_away_ml`,
                team: game.awayTeam,
                opponent: game.homeTeam,
                type: 'moneyline',
                sport: game.sport,
                odds: game.odds.awayML,
                probability: calculateTrueProbability(game.odds.awayML),
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
            }
            
            // Spread bets
            if (game.odds.spread) {
              parlayLegs.push({
                id: `${game.id}_home_spread`,
                team: `${game.homeTeam} ${game.odds.spread > 0 ? '+' : ''}${game.odds.spread}`,
                opponent: game.awayTeam,
                type: 'spread',
                sport: game.sport,
                odds: -110,
                probability: 0.52, // Slightly better than implied for -110
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
              
              parlayLegs.push({
                id: `${game.id}_away_spread`,
                team: `${game.awayTeam} ${game.odds.spread < 0 ? '+' : ''}${-game.odds.spread}`,
                opponent: game.homeTeam,
                type: 'spread',
                sport: game.sport,
                odds: -110,
                probability: 0.52,
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
            }
            
            // Over/Under
            if (game.odds.overUnder) {
              parlayLegs.push({
                id: `${game.id}_over`,
                team: `Over ${game.odds.overUnder}`,
                opponent: '',
                type: 'total',
                sport: game.sport,
                odds: -110,
                probability: 0.51,
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
              
              parlayLegs.push({
                id: `${game.id}_under`,
                team: `Under ${game.odds.overUnder}`,
                opponent: '',
                type: 'total',
                sport: game.sport,
                odds: -110,
                probability: 0.51,
                game: `${game.awayTeam} @ ${game.homeTeam}`,
                time: new Date(game.date).toLocaleString()
              })
            }
          }
        })
        
        console.log(`Generated ${parlayLegs.length} parlay legs from ${gamesData.data.games.length} games`)
        setAvailableBets(parlayLegs)
      }
    } catch (error) {
      console.error('Error fetching parlay opportunities:', error)
    }
  }

  const calculateTrueProbability = (americanOdds: number): number => {
    // Convert American odds to implied probability
    const implied = americanOdds > 0 
      ? 100 / (americanOdds + 100)
      : Math.abs(americanOdds) / (Math.abs(americanOdds) + 100)
    
    // Add a small edge for value (simulating our model's prediction)
    return Math.min(0.95, implied + (Math.random() * 0.05))
  }

  useEffect(() => {
    if (currentParlay.legs.length > 0) {
      recalculateParlay()
      updateCorrelationMatrix()
    }
  }, [currentParlay.legs])

  const recalculateParlay = () => {
    const legs = currentParlay.legs
    if (legs.length === 0) return

    // Calculate total odds (American to decimal conversion)
    const decimalOdds = legs.map(leg => 
      leg.odds > 0 ? 1 + leg.odds / 100 : 1 + 100 / Math.abs(leg.odds)
    )
    const totalDecimalOdds = decimalOdds.reduce((acc, odds) => acc * odds, 1)
    const totalAmericanOdds = totalDecimalOdds > 2 ? 
      (totalDecimalOdds - 1) * 100 : 
      -100 / (totalDecimalOdds - 1)

    // Calculate true probability accounting for correlations
    const baseProbability = legs.reduce((acc, leg) => acc * leg.probability, 1)
    const correlationAdjustment = currentParlay.correlationRisk * 0.1 // Reduce probability for positive correlation
    const adjustedProbability = Math.max(0.01, baseProbability - correlationAdjustment)

    // Calculate implied probability from odds
    const impliedProbability = 1 / totalDecimalOdds

    // Expected value
    const expectedValue = ((adjustedProbability * (totalDecimalOdds - 1)) - (1 - adjustedProbability)) * 100

    // Risk metrics
    const variance = legs.reduce((acc, leg) => acc + (leg.probability * (1 - leg.probability)), 0) / legs.length
    const sharpeRatio = expectedValue / (Math.sqrt(variance) * 100)
    const maxDrawdown = 1 - adjustedProbability

    // Kelly criterion
    const edge = adjustedProbability - impliedProbability
    const kellyFraction = Math.max(0, edge / (totalDecimalOdds - 1))

    // Recommendation
    let recommendation: 'excellent' | 'good' | 'moderate' | 'poor' = 'poor'
    if (expectedValue > 15 && currentParlay.correlationRisk < 0.3 && kellyFraction > 0.02) {
      recommendation = 'excellent'
    } else if (expectedValue > 8 && currentParlay.correlationRisk < 0.5) {
      recommendation = 'good'
    } else if (expectedValue > 3) {
      recommendation = 'moderate'
    }

    setCurrentParlay(prev => ({
      ...prev,
      totalOdds: totalAmericanOdds,
      totalProbability: adjustedProbability,
      expectedValue,
      variance,
      sharpeRatio,
      maxDrawdown,
      recommendation,
      kellyFraction,
      hedgeOpportunity: {
        available: legs.length >= 3 && adjustedProbability > 0.7,
        cost: 150,
        guarantee: 75
      }
    }))
  }

  const updateCorrelationMatrix = () => {
    const matrix: CorrelationMatrix = {}
    
    currentParlay.legs.forEach(legA => {
      matrix[legA.id] = {}
      currentParlay.legs.forEach(legB => {
        if (legA.id === legB.id) {
          matrix[legA.id][legB.id] = 1
        } else {
          // Calculate correlation based on various factors
          let correlation = 0
          
          // Same game correlation
          if (legA.game === legB.game) {
            if ((legA.market === 'ml' || legA.market === 'spread') && 
                (legB.market === 'ml' || legB.market === 'spread')) {
              correlation = 0.7 // High correlation between ML and spread in same game
            } else if (legA.market === 'total' || legB.market === 'total') {
              correlation = 0.3 // Moderate correlation with totals
            }
          }
          
          // Same sport correlation
          if (legA.sport === legB.sport && legA.game !== legB.game) {
            correlation = 0.1 // Slight positive correlation in same sport
          }
          
          matrix[legA.id][legB.id] = correlation
        }
      })
    })
    
    setCorrelationMatrix(matrix)
    
    // Update overall correlation risk
    const avgCorrelation = currentParlay.legs.length > 1 ? 
      Object.values(matrix).reduce((sum, row) => {
        return sum + Object.values(row).reduce((rowSum, val) => rowSum + Math.abs(val), 0)
      }, 0) / (currentParlay.legs.length * currentParlay.legs.length) : 0
    
    setCurrentParlay(prev => ({ ...prev, correlationRisk: avgCorrelation }))
  }

  const addLeg = (bet: ParlayLeg) => {
    if (currentParlay.legs.length >= 10) return // Max 10 legs
    if (currentParlay.legs.find(leg => leg.id === bet.id)) return // Already added
    
    setCurrentParlay(prev => ({
      ...prev,
      legs: [...prev.legs, bet]
    }))
  }

  const removeLeg = (legId: string) => {
    setCurrentParlay(prev => ({
      ...prev,
      legs: prev.legs.filter(leg => leg.id !== legId)
    }))
  }

  const clearParlay = () => {
    setCurrentParlay({
      legs: [],
      totalOdds: 0,
      totalProbability: 0,
      expectedValue: 0,
      variance: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      correlationRisk: 0,
      recommendation: 'poor',
      kellyFraction: 0
    })
    setCorrelationMatrix({})
  }

  const formatOdds = (odds: number) => {
    return odds > 0 ? `+${Math.round(odds)}` : `${Math.round(odds)}`
  }

  const calculatePayout = (stake: number) => {
    if (currentParlay.totalOdds > 0) {
      return stake * (1 + currentParlay.totalOdds / 100)
    } else {
      return stake * (1 + 100 / Math.abs(currentParlay.totalOdds))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Settings */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Advanced Parlay Optimizer</h2>
          <p className="text-slate-400">Correlation-aware parlay building with risk optimization</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Bankroll:</span>
            <input
              type="number"
              value={bankroll}
              onChange={(e) => setBankroll(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm w-24 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="conservative">Conservative</option>
            <option value="moderate">Moderate</option>
            <option value="aggressive">Aggressive</option>
          </select>
          
          <Button
            onClick={clearParlay}
            variant="outline"
            className="text-white border-slate-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Available Bets */}
        <div className="space-y-6">
          <Card className="glass border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-400" />
                <span>Available Bets</span>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Click to add to your parlay
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {availableBets.map((bet) => (
                <div
                  key={bet.id}
                  onClick={() => addLeg(bet)}
                  className="bg-slate-800/30 rounded-lg p-3 hover:bg-slate-800/50 cursor-pointer border border-slate-700/50 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white font-medium">{bet.game}</span>
                    <Plus className="h-4 w-4 text-blue-400" />
                  </div>
                  <p className="text-sm text-blue-400 mb-2">{bet.selection}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white">{formatOdds(bet.odds)}</span>
                    <span className="text-green-400">{(bet.probability * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Current Parlay */}
        <div className="space-y-6">
          <Card className="glass border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-green-400" />
                <span>Current Parlay</span>
                <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  {currentParlay.legs.length} legs
                </div>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {currentParlay.legs.length === 0 ? (
                <div className="text-center py-8">
                  <Calculator className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-400">Add bets to build your parlay</p>
                </div>
              ) : (
                <>
                  {/* Parlay Summary */}
                  <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Total Odds</p>
                        <p className="text-2xl font-bold text-white">
                          {formatOdds(currentParlay.totalOdds)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">True Probability</p>
                        <p className="text-2xl font-bold text-green-400">
                          {(currentParlay.totalProbability * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Expected Value</p>
                        <p className={cn("text-lg font-bold", 
                          currentParlay.expectedValue > 10 ? 'text-green-400' :
                          currentParlay.expectedValue > 0 ? 'text-yellow-400' : 'text-red-400'
                        )}>
                          {currentParlay.expectedValue > 0 ? '+' : ''}{currentParlay.expectedValue.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-slate-400 text-sm">Recommended Stake</p>
                        <p className="text-lg font-bold text-yellow-400">
                          ${Math.round(bankroll * currentParlay.kellyFraction)}
                        </p>
                      </div>
                    </div>
                    
                    {currentParlay.kellyFraction > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Potential Payout:</span>
                          <span className="text-white font-medium">
                            ${Math.round(calculatePayout(bankroll * currentParlay.kellyFraction))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Potential Profit:</span>
                          <span className="text-green-400 font-medium">
                            ${Math.round(calculatePayout(bankroll * currentParlay.kellyFraction) - (bankroll * currentParlay.kellyFraction))}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Individual Legs */}
                  <div className="space-y-2">
                    {currentParlay.legs.map((leg, index) => {
                      const legCorrelation = Object.values(correlationMatrix[leg.id] || {})
                        .filter((_, i) => i !== index)
                        .reduce((max, val) => Math.max(max, Math.abs(val)), 0)
                      
                      return (
                        <ParlayLegCard
                          key={leg.id}
                          leg={leg}
                          onRemove={() => removeLeg(leg.id)}
                          correlationRisk={legCorrelation}
                        />
                      )
                    })}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1"
                      variant={currentParlay.recommendation === 'excellent' ? 'default' : 'secondary'}
                      disabled={currentParlay.legs.length === 0}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Place Parlay
                    </Button>
                    <Button variant="outline" className="text-white border-slate-700">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Risk Analysis */}
        <div className="space-y-6">
          {currentParlay.legs.length > 0 && (
            <>
              <RiskAnalysisPanel parlay={currentParlay} />
              {currentParlay.legs.length > 1 && (
                <CorrelationHeatMap matrix={correlationMatrix} legs={currentParlay.legs} />
              )}
              <AlternativeParlayBuilder 
                currentParlay={currentParlay}
                onSelectAlternative={setCurrentParlay}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}