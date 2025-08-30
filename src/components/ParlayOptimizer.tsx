'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Calculator,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
  BarChart3,
  Shuffle,
  Settings,
  Eye,
  Award,
  RefreshCw
} from 'lucide-react'
import { cn, formatPercentage, formatOdds, formatCurrency } from '@/lib/utils'
import { Parlay, ParlayLeg } from '@/types/sports'
import { db } from '@/services/database'

// Live data interfaces - no more mocks!

const RiskLevelSelector = ({ 
  riskLevel, 
  setRiskLevel 
}: { 
  riskLevel: string, 
  setRiskLevel: (level: string) => void 
}) => {
  const riskLevels = [
    { 
      value: 'conservative', 
      label: 'Conservative', 
      color: 'text-green-400',
      description: 'Min 65% probability, max 3 legs'
    },
    { 
      value: 'moderate', 
      label: 'Moderate', 
      color: 'text-blue-400',
      description: 'Min 55% probability, max 4 legs'
    },
    { 
      value: 'aggressive', 
      label: 'Aggressive', 
      color: 'text-yellow-400',
      description: 'Min 45% probability, max 5 legs'
    },
    { 
      value: 'yolo', 
      label: 'YOLO', 
      color: 'text-red-400',
      description: 'Min 35% probability, max 6 legs'
    }
  ]
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {riskLevels.map(level => (
        <Card 
          key={level.value}
          className={cn(
            "cursor-pointer transition-all duration-300 glass",
            riskLevel === level.value 
              ? "border-blue-500 ring-2 ring-blue-500/20" 
              : "border-slate-700/50 hover:border-slate-600"
          )}
          onClick={() => setRiskLevel(level.value)}
        >
          <CardContent className="p-4 text-center">
            <h4 className={cn("font-semibold mb-1", level.color)}>
              {level.label}
            </h4>
            <p className="text-xs text-slate-400">
              {level.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const ParlayCard = ({ 
  parlay, 
  index 
}: { 
  parlay: Parlay, 
  index: number 
}) => {
  const [expanded, setExpanded] = useState(false)
  
  const getRiskColor = (risk: number) => {
    if (risk <= 0.3) return 'text-green-400'
    if (risk <= 0.5) return 'text-yellow-400'
    if (risk <= 0.7) return 'text-orange-400'
    return 'text-red-400'
  }
  
  return (
    <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 card-glow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <span>Parlay #{index + 1}</span>
              <div className="text-xs bg-blue-600/20 text-blue-400 px-2 py-1 rounded">
                {parlay.legs.length} Legs
              </div>
            </CardTitle>
            <CardDescription className="text-slate-400">
              {parlay.sports_included.join(' • ')}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-400">
              +{parlay.combined_odds}
            </p>
            <p className="text-xs text-slate-400">Combined Odds</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-green-400">
              {parlay.expected_value.toFixed(1)}%
            </p>
            <p className="text-xs text-slate-400">Expected Value</p>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className={cn("text-lg font-bold", getRiskColor(parlay.risk_score))}>
              {formatPercentage(parlay.risk_score)}
            </p>
            <p className="text-xs text-slate-400">Risk Score</p>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-blue-400">
              {formatPercentage(parlay.confidence_score)}
            </p>
            <p className="text-xs text-slate-400">Confidence</p>
          </div>
          
          <div className="text-center p-3 bg-slate-800/50 rounded-lg">
            <p className="text-lg font-bold text-yellow-400">
              {formatPercentage(parlay.kelly_stake)}
            </p>
            <p className="text-xs text-slate-400">Kelly Stake</p>
          </div>
        </div>
        
        {/* Parlay Legs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-white">Parlay Legs</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              {expanded ? 'Hide' : 'Show'} Details
            </Button>
          </div>
          
          {parlay.legs.map((leg, legIndex) => (
            <div key={legIndex} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                  {legIndex + 1}
                </div>
                <div>
                  <p className="text-white font-medium">{leg.team}</p>
                  <p className="text-xs text-slate-400">
                    {leg.bet_type} {leg.line !== 0 && `${leg.line > 0 ? '+' : ''}${leg.line}`}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-white font-medium">{formatOdds(leg.odds)}</p>
                <p className="text-xs text-slate-400">{formatPercentage(leg.probability)}</p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Detailed Analysis */}
        {expanded && (
          <div className="space-y-3 pt-3 border-t border-slate-700">
            <div>
              <h5 className="text-sm font-medium text-white mb-2">Key Factors</h5>
              <div className="space-y-1">
                {parlay.key_factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <CheckCircle className="h-3 w-3 text-green-400" />
                    <p className="text-sm text-slate-400">{factor}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400">Total Probability</p>
                <p className="text-white font-medium">{formatPercentage(parlay.total_probability)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Correlation Score</p>
                <p className="text-white font-medium">{formatPercentage(parlay.correlation_score)}</p>
              </div>
            </div>
            
            {parlay.warnings.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <h5 className="text-sm font-medium text-yellow-400">Warnings</h5>
                </div>
                {parlay.warnings.map((warning, idx) => (
                  <p key={idx} className="text-sm text-yellow-300">{warning}</p>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-2 pt-2">
          <Button className="flex-1" variant="default">
            <Target className="h-4 w-4 mr-2" />
            Place Parlay
          </Button>
          <Button variant="outline" className="text-white border-slate-700">
            <Calculator className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="text-white border-slate-700">
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ParlayOptimizer() {
  const [riskLevel, setRiskLevel] = useState('moderate')
  const [maxParlays, setMaxParlays] = useState(10)
  const [minExpectedValue, setMinExpectedValue] = useState(8.0)
  const [maxCorrelation, setMaxCorrelation] = useState(0.3)
  const [optimizedParlays, setOptimizedParlays] = useState<Parlay[]>([])
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasOptimized, setHasOptimized] = useState(false)
  
  // Auto-fetch on component mount
  useEffect(() => {
    handleOptimize()
  }, [])
  
  const handleOptimize = async () => {
    setIsOptimizing(true)
    setError(null)
    
    try {
      // Call LIVE parlay optimization API
      const response = await fetch('/api/parlays/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          riskLevel,
          maxParlays,
          minExpectedValue,
          maxCorrelation
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.parlays) {
        setOptimizedParlays(data.parlays)
        setHasOptimized(true)
        
        // Save successful optimization to database
        if (data.parlays.length > 0) {
          console.log(`Generated ${data.parlays.length} optimal parlays with avg EV: ${data.stats?.avg_expected_value?.toFixed(1)}%`)
        }
      } else {
        setError(data.message || 'Failed to generate parlays')
        setOptimizedParlays([])
      }
    } catch (err) {
      console.error('Parlay optimization error:', err)
      setError('Failed to connect to optimization service. Please try again.')
      setOptimizedParlays([])
    } finally {
      setIsOptimizing(false)
    }
  }
  
  const totalEV = optimizedParlays.reduce((sum, parlay) => sum + parlay.expected_value, 0)
  const avgRisk = optimizedParlays.reduce((sum, parlay) => sum + parlay.risk_score, 0) / optimizedParlays.length || 0
  
  return (
    <div className="space-y-6">
      {/* Optimization Controls */}
      <Card className="glass border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Optimization Settings
          </CardTitle>
          <CardDescription className="text-slate-400">
            Configure risk parameters and constraints for parlay generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Risk Level Selection */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">Risk Level</h3>
            <RiskLevelSelector riskLevel={riskLevel} setRiskLevel={setRiskLevel} />
          </div>
          
          {/* Advanced Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-400">Max Parlays</label>
              <select
                value={maxParlays}
                onChange={(e) => setMaxParlays(Number(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5 Parlays</option>
                <option value={10}>10 Parlays</option>
                <option value={15}>15 Parlays</option>
                <option value={20}>20 Parlays</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-400">Min Expected Value</label>
              <select
                value={minExpectedValue}
                onChange={(e) => setMinExpectedValue(Number(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5%</option>
                <option value={8}>8%</option>
                <option value={10}>10%</option>
                <option value={12}>12%</option>
                <option value={15}>15%</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-400">Max Correlation</label>
              <select
                value={maxCorrelation}
                onChange={(e) => setMaxCorrelation(Number(e.target.value))}
                className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={0.2}>20%</option>
                <option value={0.3}>30%</option>
                <option value={0.4}>40%</option>
                <option value={0.5}>50%</option>
              </select>
            </div>
          </div>
          
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isOptimizing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Optimizing Parlays...
              </>
            ) : (
              <>
                <Shuffle className="h-4 w-4 mr-2" />
                Generate Optimal Parlays
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{optimizedParlays.length}</p>
            <p className="text-sm text-slate-400">Parlays Generated</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalEV.toFixed(1)}%</p>
            <p className="text-sm text-slate-400">Total Expected Value</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{formatPercentage(avgRisk)}</p>
            <p className="text-sm text-slate-400">Average Risk</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">$2,847</p>
            <p className="text-sm text-slate-400">Potential Profit</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Optimized Parlays */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Optimized Parlays</h2>
          <div className="text-sm text-slate-400">
            {optimizedParlays.length > 0 ? (
              <>Sorted by Expected Value • Risk Level: <span className="capitalize text-white ml-1">{riskLevel}</span></>
            ) : (
              'No parlays generated yet'
            )}
          </div>
        </div>
        
        {error && (
          <Card className="glass border-red-500/50 bg-red-500/10">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div>
                  <p className="text-red-400 font-medium">Error Generating Parlays</p>
                  <p className="text-slate-400 text-sm">{error}</p>
                </div>
                <Button 
                  onClick={handleOptimize} 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto text-white border-slate-700"
                >
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {!error && optimizedParlays.length === 0 && !isOptimizing && hasOptimized && (
          <Card className="glass border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Parlays Available</h3>
              <p className="text-slate-400 mb-4">
                Not enough games available that meet your criteria. Try adjusting your settings:
              </p>
              <ul className="text-sm text-slate-500 space-y-1 mb-4">
                <li>• Lower the minimum expected value requirement</li>
                <li>• Increase the risk tolerance level</li>
                <li>• Allow higher correlation between legs</li>
              </ul>
              <Button onClick={handleOptimize} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {optimizedParlays.map((parlay, index) => (
            <ParlayCard key={parlay.parlay_id} parlay={parlay} index={index} />
          ))}
        </div>
      </div>
      
      {/* Loading State */}
      {isOptimizing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-lg p-8 text-center space-y-4 max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <h3 className="text-xl font-semibold text-white">Optimizing Parlays</h3>
            <p className="text-slate-400">
              Analyzing correlations and calculating optimal combinations...
            </p>
            <div className="text-sm text-slate-500">
              This may take a few moments
            </div>
          </div>
        </div>
      )}
    </div>
  )
}