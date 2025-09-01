'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Target,
  DollarSign,
  Activity,
  Gauge,
  Clock,
  Award,
  Flame
} from 'lucide-react'

interface AnalyticsSummary {
  gameId: string
  teams: {
    home: string
    away: string
  }
  compositeScores: {
    sharpEdge: number
    valueRating: number
    confidence: number
    volatility: number
    recommendations: Array<{
      type: string
      pick: string
      confidence: number
      reasoning: string[]
      keyFactors: string[]
    }>
  }
  keyInsights: {
    sharpMoney: number
    injuryImpact: number
    weatherImpact: number
    refereeImpact: number
    momentumFactors: number
  }
  dataQuality: {
    completeness: number
    recency: number
    reliability: number
  }
}

interface AnalyticsSummaryWidgetProps {
  gameId?: string
  sport?: string
  league?: string
  compact?: boolean
  showRecommendations?: boolean
}

export default function AnalyticsSummaryWidget({ 
  gameId, 
  sport = 'football', 
  league = 'nfl',
  compact = false,
  showRecommendations = true 
}: AnalyticsSummaryWidgetProps) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (gameId) {
      fetchAnalyticsSummary()
    }
  }, [gameId, sport, league])

  const fetchAnalyticsSummary = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analytics/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport, league, gameId, espnGameId: gameId })
      })
      
      const data = await response.json()
      if (data.success && data.analytics) {
        // Transform full analytics to summary format
        const analytics = data.analytics
        setSummary({
          gameId: gameId || '',
          teams: analytics.teams,
          compositeScores: analytics.compositeScores,
          keyInsights: {
            sharpMoney: analytics.sharpMoney?.length || 0,
            injuryImpact: Math.abs(analytics.injuries?.totalImpact || 0),
            weatherImpact: Math.abs(analytics.weather?.impact?.total || 0),
            refereeImpact: Math.abs(analytics.referee?.headReferee?.totalBias || 0),
            momentumFactors: (
              (analytics.playoffPositioning?.home?.urgencyLevel === 'high' ? 1 : 0) +
              (analytics.coachingChanges?.home?.changeType !== 'none' ? 1 : 0) +
              (analytics.revengeGame ? 1 : 0) +
              (analytics.trapGame ? 1 : 0)
            )
          },
          dataQuality: analytics.dataQuality
        })
      } else {
        setError('Failed to fetch analytics summary')
      }
    } catch (err) {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="glass border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Brain className="w-8 h-8 animate-pulse text-blue-400" />
            <p className="ml-3 text-slate-400">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !summary) {
    return (
      <Card className="glass border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-gray-400">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <p>{error || 'No analytics available'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getScoreColor = (score: number, inverse = false) => {
    const adjusted = inverse ? -score : score
    if (adjusted > 50) return 'text-green-400'
    if (adjusted < -20) return 'text-red-400'
    return 'text-yellow-400'
  }

  const getQualityColor = (quality: number) => {
    if (quality > 0.8) return 'bg-green-500'
    if (quality > 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (compact) {
    return (
      <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-white">Analytics</span>
            </div>
            <Badge className={getScoreColor(summary.compositeScores.confidence)}>
              {summary.compositeScores.confidence}% confidence
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center">
              <p className="text-xs text-slate-400">Sharp Edge</p>
              <p className={`text-lg font-bold ${getScoreColor(summary.compositeScores.sharpEdge)}`}>
                {summary.compositeScores.sharpEdge > 0 ? '+' : ''}{summary.compositeScores.sharpEdge}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400">Value</p>
              <p className="text-lg font-bold text-green-400">
                {summary.compositeScores.valueRating}
              </p>
            </div>
          </div>

          {summary.compositeScores.recommendations.length > 0 && (
            <div className="space-y-2">
              {summary.compositeScores.recommendations.slice(0, 2).map((rec, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{rec.type.toUpperCase()}</span>
                  <Badge className={rec.type === 'avoid' ? 'bg-red-500' : 'bg-green-500'}>
                    {rec.confidence}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="glass border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              <span>Analytics Summary</span>
            </div>
            <Badge variant="outline">
              {summary.teams.away} @ {summary.teams.home}
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* Composite Scores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-morphism p-3 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Sharp Edge</p>
              <p className={`text-xl font-bold ${getScoreColor(summary.compositeScores.sharpEdge)}`}>
                {summary.compositeScores.sharpEdge > 0 ? '+' : ''}{summary.compositeScores.sharpEdge}
              </p>
            </div>
            
            <div className="glass-morphism p-3 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Value Rating</p>
              <p className="text-xl font-bold text-green-400">
                {summary.compositeScores.valueRating}
              </p>
            </div>
            
            <div className="glass-morphism p-3 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Confidence</p>
              <p className="text-xl font-bold text-blue-400">
                {summary.compositeScores.confidence}%
              </p>
            </div>
            
            <div className="glass-morphism p-3 rounded-lg text-center">
              <div className="flex items-center justify-center mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-xs text-gray-400 mb-1">Volatility</p>
              <p className="text-xl font-bold text-orange-400">
                {summary.compositeScores.volatility}%
              </p>
            </div>
          </div>

          {/* Key Insights */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Key Insights</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-400">Sharp Money:</span>
                <Badge className={summary.keyInsights.sharpMoney > 0 ? 'bg-green-600' : 'bg-gray-600'}>
                  {summary.keyInsights.sharpMoney} signals
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="w-4 h-4 text-red-400" />
                <span className="text-gray-400">Injury Impact:</span>
                <Badge className={summary.keyInsights.injuryImpact > 0.1 ? 'bg-red-600' : 'bg-green-600'}>
                  {(summary.keyInsights.injuryImpact * 100).toFixed(0)}%
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-gray-400">Weather:</span>
                <Badge className={summary.keyInsights.weatherImpact > 0.1 ? 'bg-yellow-600' : 'bg-gray-600'}>
                  {(summary.keyInsights.weatherImpact * 100).toFixed(0)}%
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Target className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400">Referee:</span>
                <Badge className={summary.keyInsights.refereeImpact > 0.1 ? 'bg-purple-600' : 'bg-gray-600'}>
                  {(summary.keyInsights.refereeImpact * 100).toFixed(0)}%
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-gray-400">Momentum:</span>
                <Badge className={summary.keyInsights.momentumFactors > 0 ? 'bg-orange-600' : 'bg-gray-600'}>
                  {summary.keyInsights.momentumFactors} factors
                </Badge>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Gauge className="w-4 h-4 text-green-400" />
                <span className="text-gray-400">Data Quality:</span>
                <Badge className={getQualityColor(summary.dataQuality.completeness)}>
                  {(summary.dataQuality.completeness * 100).toFixed(0)}%
                </Badge>
              </div>
            </div>
          </div>

          {/* Data Quality Bars */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Data Quality</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Completeness</span>
                  <span className="text-white">{(summary.dataQuality.completeness * 100).toFixed(0)}%</span>
                </div>
                <Progress value={summary.dataQuality.completeness * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Recency</span>
                  <span className="text-white">{(summary.dataQuality.recency * 100).toFixed(0)}%</span>
                </div>
                <Progress value={summary.dataQuality.recency * 100} className="h-2" />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Reliability</span>
                  <span className="text-white">{(summary.dataQuality.reliability * 100).toFixed(0)}%</span>
                </div>
                <Progress value={summary.dataQuality.reliability * 100} className="h-2" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {showRecommendations && summary.compositeScores.recommendations.length > 0 && (
        <Card className="glass border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-gold-400" />
              AI Recommendations
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {summary.compositeScores.recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${
                  rec.type === 'avoid' ? 'border-red-500 bg-red-500/10' : 'border-green-500 bg-green-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {rec.type === 'avoid' ? (
                        <XCircle className="w-4 h-4 text-red-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <span className="font-medium text-white">
                        {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)} Recommendation
                      </span>
                    </div>
                    <Badge className={rec.type === 'avoid' ? 'bg-red-600' : 'bg-green-600'}>
                      {rec.confidence}% confidence
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-300 mb-2">{rec.pick}</p>
                  
                  <div className="flex flex-wrap gap-1">
                    {rec.keyFactors.slice(0, 3).map((factor, fidx) => (
                      <Badge key={fidx} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}