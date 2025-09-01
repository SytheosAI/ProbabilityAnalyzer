'use client'

import React, { useState, useEffect } from 'react'
import { EnhancedAnalytics as EnhancedAnalyticsType } from '@/types/analytics'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Activity,
  Users,
  Shield,
  Target,
  Zap,
  Cloud,
  Clock,
  DollarSign,
  ChevronRight,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  BarChart3,
  Brain,
  Gauge,
  Trophy,
  Flame,
  Crosshair,
  Calendar,
  MapPin,
  PieChart,
  LineChart
} from 'lucide-react'

interface EnhancedAnalyticsProps {
  gameId?: string
  sport?: string
  league?: string
}

export default function EnhancedAnalytics({ gameId, sport = 'football', league = 'nfl' }: EnhancedAnalyticsProps) {
  const [analytics, setAnalytics] = useState<EnhancedAnalyticsType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<string | null>(gameId || null)
  const [games, setGames] = useState<any[]>([])

  // Fetch available games
  useEffect(() => {
    fetchGames()
  }, [sport, league])

  // Fetch analytics when game is selected
  useEffect(() => {
    if (selectedGame) {
      fetchAnalytics(selectedGame)
    }
  }, [selectedGame])

  const fetchGames = async () => {
    try {
      const response = await fetch(`/api/analytics/enhanced?sport=${sport}&league=${league}`)
      const data = await response.json()
      if (data.success) {
        setGames(data.games || [])
      }
    } catch (err) {
      console.error('Error fetching games:', err)
    }
  }

  const fetchAnalytics = async (gameId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/analytics/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport, league, gameId, espnGameId: gameId })
      })
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
      } else {
        setError(data.error || 'Failed to fetch analytics')
      }
    } catch (err) {
      setError('Network error: Unable to fetch analytics')
    } finally {
      setLoading(false)
    }
  }

  const getValueColor = (value: number, reverse = false) => {
    const adjusted = reverse ? -value : value
    if (adjusted > 0) return 'text-green-400'
    if (adjusted < 0) return 'text-red-400'
    return 'text-gray-400'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500'
    if (confidence >= 60) return 'bg-yellow-500'
    if (confidence >= 40) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const renderSharpMoneyIndicator = (indicator: any) => {
    const getIcon = () => {
      if (indicator.reverseLineMovement) return <Zap className="w-5 h-5 text-yellow-400" />
      if (indicator.steamMove) return <TrendingUp className="w-5 h-5 text-green-400" />
      return <Activity className="w-5 h-5 text-blue-400" />
    }

    return (
      <div className="glass-morphism p-4 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="text-sm font-medium capitalize">{indicator.betType}</span>
          </div>
          <Badge className={`${indicator.confidenceLevel === 'high' ? 'bg-green-500' : indicator.confidenceLevel === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'}`}>
            {indicator.confidenceLevel} confidence
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Public %:</span>
            <span className="ml-2 font-medium">{indicator.publicBettingPercentage}%</span>
          </div>
          <div>
            <span className="text-gray-400">Money %:</span>
            <span className="ml-2 font-medium">{indicator.publicMoneyPercentage}%</span>
          </div>
        </div>
        {indicator.sharpSide && (
          <div className="mt-2 pt-2 border-t border-white/10">
            <span className="text-xs text-gray-400">Sharp Side:</span>
            <Badge className="ml-2 bg-purple-500">{indicator.sharpSide.toUpperCase()}</Badge>
          </div>
        )}
        {indicator.signals.length > 0 && (
          <div className="mt-2">
            {indicator.signals.map((signal: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 mt-1">
                <CheckCircle className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-300">{signal.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderInjuryImpact = (injuries: any) => {
    if (!injuries || (injuries.home.length === 0 && injuries.away.length === 0)) {
      return (
        <div className="text-center text-gray-400 py-4">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No significant injuries reported</p>
        </div>
      )
    }

    const renderInjuryCard = (injury: any) => {
      const getStatusColor = () => {
        switch (injury.status) {
          case 'out': return 'bg-red-500'
          case 'doubtful': return 'bg-orange-500'
          case 'questionable': return 'bg-yellow-500'
          case 'probable': return 'bg-green-500'
          default: return 'bg-gray-500'
        }
      }

      return (
        <div className="glass-morphism p-3 rounded-lg border border-white/10">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium">{injury.playerName}</p>
              <p className="text-xs text-gray-400">{injury.position} - {injury.team}</p>
            </div>
            <Badge className={getStatusColor()}>{injury.status}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Play Prob:</span>
              <span className="ml-1 font-medium">{(injury.probabilityToPlay * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-gray-400">Impact:</span>
              <span className="ml-1 font-medium">{(injury.impactScore * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-300">Total Impact</h4>
          <div className={`text-lg font-bold ${getValueColor(injuries.totalImpact)}`}>
            {injuries.totalImpact > 0 ? '+' : ''}{(injuries.totalImpact * 100).toFixed(1)}%
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h5 className="text-xs text-gray-400 mb-2">Home Team</h5>
            <div className="space-y-2">
              {injuries.home.map((injury: any, idx: number) => (
                <div key={idx}>{renderInjuryCard(injury)}</div>
              ))}
            </div>
          </div>
          <div>
            <h5 className="text-xs text-gray-400 mb-2">Away Team</h5>
            <div className="space-y-2">
              {injuries.away.map((injury: any, idx: number) => (
                <div key={idx}>{renderInjuryCard(injury)}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderEnvironmentalFactors = () => {
    if (!analytics) return null

    const factors = []
    
    if (analytics.weather) {
      factors.push({
        icon: <Cloud className="w-5 h-5" />,
        title: 'Weather Impact',
        details: [
          `Temperature: ${analytics.weather.conditions.temperature}°F`,
          `Wind: ${analytics.weather.conditions.windSpeed} mph`,
          `Total Impact: ${(analytics.weather.impact.total * 100).toFixed(0)}%`
        ]
      })
    }

    if (analytics.altitude) {
      factors.push({
        icon: <TrendingUp className="w-5 h-5" />,
        title: 'Altitude Effect',
        details: [
          `Venue: ${analytics.altitude.venue}`,
          `Altitude: ${analytics.altitude.altitude} ft`,
          `Endurance Impact: ${(analytics.altitude.expectedImpact.endurance * 100).toFixed(0)}%`
        ]
      })
    }

    if (analytics.surface) {
      factors.push({
        icon: <Activity className="w-5 h-5" />,
        title: 'Surface Type',
        details: [
          `Type: ${analytics.surface.surfaceType}`,
          `Speed Impact: ${(analytics.surface.speedImpact * 100).toFixed(0)}%`
        ]
      })
    }

    if (factors.length === 0) {
      return (
        <div className="text-center text-gray-400 py-4">
          <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No significant environmental factors</p>
        </div>
      )
    }

    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {factors.map((factor, idx) => (
          <div key={idx} className="glass-morphism p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-3">
              {factor.icon}
              <h4 className="font-medium">{factor.title}</h4>
            </div>
            <div className="space-y-1">
              {factor.details.map((detail, didx) => (
                <p key={didx} className="text-sm text-gray-300">{detail}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderRefereeAnalytics = () => {
    if (!analytics?.referee) return null

    const ref = analytics.referee

    return (
      <div className="glass-morphism p-4 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h4 className="font-medium">Referee Analytics</h4>
          </div>
          <Badge>{ref.headReferee.name}</Badge>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Bias</p>
            <div className="flex items-center gap-2">
              <Progress value={50 + ref.headReferee.totalBias * 50} className="flex-1" />
              <span className="text-sm font-medium">{ref.headReferee.totalBias > 0 ? 'Over' : ref.headReferee.totalBias < 0 ? 'Under' : 'Neutral'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Home Bias</p>
            <div className="flex items-center gap-2">
              <Progress value={50 + ref.headReferee.homeBias * 50} className="flex-1" />
              <span className="text-sm font-medium">{ref.headReferee.homeBias > 0 ? 'Home' : ref.headReferee.homeBias < 0 ? 'Away' : 'Neutral'}</span>
            </div>
          </div>
          
          <div>
            <p className="text-xs text-gray-400 mb-1">Over %</p>
            <div className="flex items-center gap-2">
              <Progress value={ref.headReferee.overPercentage} className="flex-1" />
              <span className="text-sm font-medium">{ref.headReferee.overPercentage}%</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-sm text-gray-300">{ref.matchupFit.expectedImpact}</p>
        </div>
      </div>
    )
  }

  const renderLineMovement = (movement: any) => {
    if (!movement) return null

    const getMovementIcon = () => {
      if (movement.direction.includes('home')) return <TrendingDown className="w-4 h-4 text-red-400" />
      if (movement.direction.includes('away')) return <TrendingUp className="w-4 h-4 text-green-400" />
      return <Activity className="w-4 h-4 text-gray-400" />
    }

    return (
      <div className="glass-morphism p-3 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getMovementIcon()}
            <span className="text-sm font-medium capitalize">{movement.lineType}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {movement.movements.length} moves
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">Open:</span>
            <span className="ml-2 font-medium">{movement.opening.line}</span>
          </div>
          <div>
            <span className="text-gray-400">Current:</span>
            <span className="ml-2 font-medium">{movement.current.line}</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-400">Velocity:</span>
          <Progress value={movement.velocity * 100} className="flex-1 h-2" />
        </div>
      </div>
    )
  }

  const renderRecommendations = () => {
    if (!analytics?.compositeScores?.recommendations) return null

    const getRecommendationIcon = (type: string) => {
      switch (type) {
        case 'spread': return <Target className="w-5 h-5" />
        case 'total': return <BarChart3 className="w-5 h-5" />
        case 'moneyline': return <DollarSign className="w-5 h-5" />
        case 'avoid': return <XCircle className="w-5 h-5" />
        default: return <Info className="w-5 h-5" />
      }
    }

    const getRecommendationColor = (type: string) => {
      switch (type) {
        case 'avoid': return 'border-red-500 bg-red-500/10'
        default: return 'border-green-500 bg-green-500/10'
      }
    }

    return (
      <div className="space-y-4">
        {analytics.compositeScores.recommendations.map((rec, idx) => (
          <div key={idx} className={`glass-morphism p-4 rounded-lg border ${getRecommendationColor(rec.type)}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {getRecommendationIcon(rec.type)}
                <div>
                  <h4 className="font-medium capitalize">{rec.type} Recommendation</h4>
                  <p className="text-sm text-gray-300">{rec.pick}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge className={getConfidenceColor(rec.confidence)}>
                  {rec.confidence}% Confidence
                </Badge>
              </div>
            </div>
            
            {rec.reasoning.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-1">Reasoning:</p>
                <ul className="space-y-1">
                  {rec.reasoning.map((reason, ridx) => (
                    <li key={ridx} className="flex items-center gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-3 h-3" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {rec.keyFactors.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rec.keyFactors.map((factor, fidx) => (
                  <Badge key={fidx} variant="outline" className="text-xs">
                    {factor}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderMomentumFactors = () => {
    if (!analytics) return null

    const factors = []
    
    // Playoff positioning
    if (analytics.playoffPositioning?.home || analytics.playoffPositioning?.away) {
      factors.push({
        icon: <Trophy className="w-5 h-5 text-yellow-400" />,
        title: 'Playoff Positioning',
        urgency: 'high',
        details: [
          `Home: ${analytics.playoffPositioning?.home?.urgencyLevel || 'N/A'} urgency`,
          `Away: ${analytics.playoffPositioning?.away?.urgencyLevel || 'N/A'} urgency`,
          `Playoff probability: ${((analytics.playoffPositioning?.home?.playoffProbability || 0) * 100).toFixed(0)}% vs ${((analytics.playoffPositioning?.away?.playoffProbability || 0) * 100).toFixed(0)}%`
        ]
      })
    }

    // Coaching changes
    if (analytics.coachingChanges?.home?.changeType !== 'none' || analytics.coachingChanges?.away?.changeType !== 'none') {
      factors.push({
        icon: <Users className="w-5 h-5 text-orange-400" />,
        title: 'Coaching Changes',
        urgency: 'medium',
        details: [
          `Home: ${analytics.coachingChanges?.home?.changeType || 'None'}`,
          `Away: ${analytics.coachingChanges?.away?.changeType || 'None'}`,
          `Honeymoon effect: ${analytics.coachingChanges?.home?.honeymoonEffect || analytics.coachingChanges?.away?.honeymoonEffect ? 'Active' : 'None'}`
        ]
      })
    }

    // Revenge game
    if (analytics.revengeGame) {
      factors.push({
        icon: <Flame className="w-5 h-5 text-red-400" />,
        title: 'Revenge Game',
        urgency: 'high',
        details: [
          `Motivation: ${analytics.revengeGame.motivationLevel}`,
          `Context: ${analytics.revengeGame.context}`,
          `Historical impact: +${(analytics.revengeGame.historicalImpact * 100).toFixed(1)}%`
        ]
      })
    }

    // Trap game
    if (analytics.trapGame) {
      factors.push({
        icon: <Crosshair className="w-5 h-5 text-purple-400" />,
        title: 'Trap Game Alert',
        urgency: 'high',
        details: [
          `Trap score: ${(analytics.trapGame.trapScore * 100).toFixed(0)}%`,
          `Look-ahead factor: ${analytics.trapGame.lookAheadFactor}`,
          `Historical rate: ${(analytics.trapGame.historicalRate * 100).toFixed(0)}%`
        ]
      })
    }

    if (factors.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No significant momentum factors detected</p>
        </div>
      )
    }

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'high': return 'border-red-500 bg-red-500/10'
        case 'medium': return 'border-yellow-500 bg-yellow-500/10'
        case 'low': return 'border-green-500 bg-green-500/10'
        default: return 'border-gray-500 bg-gray-500/10'
      }
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {factors.map((factor, idx) => (
          <div key={idx} className={`glass-morphism p-4 rounded-lg border ${getUrgencyColor(factor.urgency)}`}>
            <div className="flex items-center gap-2 mb-3">
              {factor.icon}
              <h4 className="font-medium">{factor.title}</h4>
              <Badge className={factor.urgency === 'high' ? 'bg-red-500' : factor.urgency === 'medium' ? 'bg-yellow-500' : 'bg-green-500'}>
                {factor.urgency} impact
              </Badge>
            </div>
            <div className="space-y-1">
              {factor.details.map((detail, didx) => (
                <p key={didx} className="text-sm text-gray-300">{detail}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderCorrelationAnalysis = () => {
    if (!analytics) return null

    const correlations = []
    
    // Division trends
    if (analytics.divisionTrends) {
      correlations.push({
        icon: <PieChart className="w-5 h-5 text-blue-400" />,
        title: 'Division Trends',
        value: `${analytics.divisionTrends.averageTotal} avg points`,
        trend: analytics.divisionTrends.scoringTrend,
        details: [
          `Over percentage: ${analytics.divisionTrends.overPercentage}%`,
          `Pace of play: ${analytics.divisionTrends.paceOfPlay}`,
          `Divisional games O/U: ${analytics.divisionTrends.divisionalGames.overPercentage}%`
        ]
      })
    }

    // Style matchup
    if (analytics.styleMatchup) {
      const compatibility = analytics.styleMatchup.compatibility
      correlations.push({
        icon: <LineChart className="w-5 h-5 text-green-400" />,
        title: 'Style Matchup',
        value: `${compatibility.styleAdvantage} advantage`,
        trend: compatibility.expectedTotal,
        details: [
          `${analytics.styleMatchup.team1}: ${analytics.styleMatchup.team1Style.pace} pace, ${analytics.styleMatchup.team1Style.offensive}`,
          `${analytics.styleMatchup.team2}: ${analytics.styleMatchup.team2Style.pace} pace, ${analytics.styleMatchup.team2Style.offensive}`,
          `Confidence: ${(compatibility.confidence * 100).toFixed(0)}%`
        ]
      })
    }

    // Day of week patterns
    if (analytics.dayOfWeek?.home || analytics.dayOfWeek?.away) {
      correlations.push({
        icon: <Calendar className="w-5 h-5 text-purple-400" />,
        title: 'Day of Week Pattern',
        value: `${analytics.dayOfWeek?.home?.currentDay || analytics.dayOfWeek?.away?.currentDay} game`,
        trend: 'neutral',
        details: [
          `Home team ${analytics.dayOfWeek?.home?.currentDay} record: ${analytics.dayOfWeek?.home?.patterns[analytics.dayOfWeek.home.currentDay]?.record || 'N/A'}`,
          `Away team ${analytics.dayOfWeek?.away?.currentDay} record: ${analytics.dayOfWeek?.away?.patterns[analytics.dayOfWeek.away.currentDay]?.record || 'N/A'}`,
          `Performance rating: ${((analytics.dayOfWeek?.home?.performanceRating || 0) * 100).toFixed(0)}%`
        ]
      })
    }

    // Public bias
    if (analytics.publicBias) {
      correlations.push({
        icon: <TrendingUp className="w-5 h-5 text-red-400" />,
        title: 'Public Bias Detection',
        value: `${analytics.publicBias.publicPercentage}% on ${analytics.publicBias.publicFavorite}`,
        trend: analytics.publicBias.fadeRecommendation ? 'fade' : 'follow',
        details: [
          `Historical fade record: ${analytics.publicBias.historicalFade.record}`,
          `Fade ROI: ${analytics.publicBias.historicalFade.roi.toFixed(1)}%`,
          `Bias factors: ${analytics.publicBias.biasFactors.join(', ') || 'None'}`
        ]
      })
    }

    if (correlations.length === 0) {
      return (
        <div className="text-center text-gray-400 py-8">
          <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No correlation patterns detected</p>
        </div>
      )
    }

    const getTrendColor = (trend: string) => {
      switch (trend) {
        case 'high': case 'over': case 'bullish': return 'text-green-400'
        case 'low': case 'under': case 'bearish': return 'text-red-400'
        case 'fade': return 'text-orange-400'
        case 'follow': return 'text-blue-400'
        default: return 'text-gray-400'
      }
    }

    return (
      <div className="grid md:grid-cols-2 gap-4">
        {correlations.map((correlation, idx) => (
          <div key={idx} className="glass-morphism p-4 rounded-lg border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {correlation.icon}
                <h4 className="font-medium">{correlation.title}</h4>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{correlation.value}</p>
                <p className={`text-xs ${getTrendColor(correlation.trend)}`}>
                  {correlation.trend}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {correlation.details.map((detail, didx) => (
                <p key={didx} className="text-sm text-gray-300">{detail}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Brain className="w-12 h-12 animate-pulse mx-auto mb-4 text-blue-400" />
          <p className="text-gray-300">Analyzing game data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert className="border-red-500 bg-red-500/10">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Game Selector */}
      {games.length > 0 && (
        <Card className="glass-morphism border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Select Game for Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {games.map((game) => (
                <Button
                  key={game.id}
                  variant={selectedGame === game.id ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setSelectedGame(game.id)}
                >
                  <div className="text-left">
                    <p className="text-sm font-medium">{game.shortName}</p>
                    <p className="text-xs text-gray-400">{game.status}</p>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {analytics && (
        <>
          {/* Header with Composite Scores */}
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-400" />
                  Enhanced Analytics
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{analytics.sport.toUpperCase()}</Badge>
                  <Badge variant="outline">{new Date(analytics.timestamp).toLocaleTimeString()}</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <h3 className="text-lg font-bold">{analytics.teams.home}</h3>
                  <p className="text-sm text-gray-400">Home</p>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold">{analytics.teams.away}</h3>
                  <p className="text-sm text-gray-400">Away</p>
                </div>
              </div>

              {/* Composite Scores */}
              <div className="grid md:grid-cols-4 gap-4">
                <div className="glass-morphism p-3 rounded-lg text-center">
                  <Gauge className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                  <p className="text-xs text-gray-400">Sharp Edge</p>
                  <p className={`text-2xl font-bold ${getValueColor(analytics.compositeScores.sharpEdge)}`}>
                    {analytics.compositeScores.sharpEdge > 0 ? '+' : ''}{analytics.compositeScores.sharpEdge}
                  </p>
                </div>
                <div className="glass-morphism p-3 rounded-lg text-center">
                  <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-400" />
                  <p className="text-xs text-gray-400">Value Rating</p>
                  <p className="text-2xl font-bold text-green-400">{analytics.compositeScores.valueRating}</p>
                </div>
                <div className="glass-morphism p-3 rounded-lg text-center">
                  <Shield className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                  <p className="text-xs text-gray-400">Confidence</p>
                  <p className="text-2xl font-bold text-yellow-400">{analytics.compositeScores.confidence}%</p>
                </div>
                <div className="glass-morphism p-3 rounded-lg text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                  <p className="text-xs text-gray-400">Volatility</p>
                  <p className="text-2xl font-bold text-orange-400">{analytics.compositeScores.volatility}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          {analytics.compositeScores.recommendations.length > 0 && (
            <Card className="glass-morphism border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-400" />
                  Betting Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderRecommendations()}
              </CardContent>
            </Card>
          )}

          {/* Main Analytics Tabs */}
          <Tabs defaultValue="sharp" className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 glass-morphism">
              <TabsTrigger value="sharp">Sharp Money</TabsTrigger>
              <TabsTrigger value="injuries">Injuries</TabsTrigger>
              <TabsTrigger value="environment">Environment</TabsTrigger>
              <TabsTrigger value="referee">Referee</TabsTrigger>
              <TabsTrigger value="momentum">Momentum</TabsTrigger>
              <TabsTrigger value="correlation">Correlation</TabsTrigger>
              <TabsTrigger value="lines">Lines</TabsTrigger>
            </TabsList>

            <TabsContent value="sharp" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    Sharp Money Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.sharpMoney && analytics.sharpMoney.length > 0 ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {analytics.sharpMoney.map((indicator, idx) => (
                        <div key={idx}>{renderSharpMoneyIndicator(indicator)}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 py-4">
                      No sharp money indicators detected
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="injuries" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-400" />
                    Injury Impact Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderInjuryImpact(analytics.injuries)}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="environment" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-blue-400" />
                    Environmental Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderEnvironmentalFactors()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referee" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Referee Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderRefereeAnalytics()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="momentum" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    Momentum Indicators
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderMomentumFactors()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="correlation" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-green-400" />
                    Correlation Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {renderCorrelationAnalysis()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lines" className="space-y-4">
              <Card className="glass-morphism border-white/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-400" />
                    Line Movements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    {renderLineMovement(analytics.lineMovements?.spread)}
                    {renderLineMovement(analytics.lineMovements?.total)}
                    {renderLineMovement(analytics.lineMovements?.moneyline)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Data Quality Indicator */}
          <Card className="glass-morphism border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-400" />
                Data Quality
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Completeness</p>
                  <Progress value={analytics.dataQuality.completeness * 100} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Recency</p>
                  <Progress value={analytics.dataQuality.recency * 100} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Reliability</p>
                  <Progress value={analytics.dataQuality.reliability * 100} />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}