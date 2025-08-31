'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  Target, 
  Calculator, 
  BarChart3, 
  Trophy, 
  Zap,
  DollarSign,
  Activity,
  Eye,
  Percent,
  AlertCircle
} from 'lucide-react'
import LiveSportsDashboard from '@/components/LiveSportsDashboard'
import MoneylineDisplay from '@/components/MoneylineDisplay'
import ParlayOptimizer from '@/components/ParlayOptimizer'
import ProbabilityCalculator from '@/components/ProbabilityCalculator'
import { DashboardStats } from '@/types/sports'

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeType = 'positive',
  description 
}: {
  title: string
  value: string | number
  icon: React.ElementType
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  description?: string
}) => (
  <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 card-glow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {change && (
              <span className={`text-sm font-medium ${
                changeType === 'positive' ? 'text-green-400' : 
                changeType === 'negative' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {change}
              </span>
            )}
          </div>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
        <div className="p-3 bg-blue-500/20 rounded-full">
          <Icon className="h-6 w-6 text-blue-400" />
        </div>
      </div>
    </CardContent>
  </Card>
)

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'moneylines' | 'parlays' | 'calculator'>('dashboard')
  const [liveDataStats, setLiveDataStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    fetchLiveData()
  }, [])

  const fetchLiveData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      const response = await fetch('/api/sports/live-data?analysis=true')
      const result = await response.json()
      
      if (result.success) {
        setLiveDataStats(result.data.stats)
      } else {
        throw new Error(result.error || 'Failed to fetch live data')
      }
    } catch (error) {
      console.error('Error fetching live data:', error)
      setErrorMessage('Unable to fetch live sports data. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="glass border-b border-slate-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Professional Sports Probability Analyzer</h1>
                <p className="text-sm text-slate-400">Real-Time ML Analysis Across 8 Major Sports</p>
              </div>
            </div>
            
            {/* Live Data Indicator */}
            <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium animate-pulse">
              LIVE DATA
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant={activeTab === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('dashboard')}
                className="text-white"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button
                variant={activeTab === 'moneylines' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('moneylines')}
                className="text-white"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Moneylines
              </Button>
              <Button
                variant={activeTab === 'parlays' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('parlays')}
                className="text-white"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Parlays
              </Button>
              <Button
                variant={activeTab === 'calculator' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('calculator')}
                className="text-white"
              >
                <Target className="h-4 w-4 mr-2" />
                Calculator
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Error Message Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <p className="text-yellow-400">{errorMessage}</p>
            </div>
          </div>
        )}


        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Live Games Today"
                value={isLoading ? "..." : liveDataStats?.totalGames || 0}
                icon={Activity}
                change={`${liveDataStats?.liveGames || 0} live`}
                changeType="positive"
                description="Across 8 major sports leagues"
              />
              <StatCard
                title="Value Bets Found"
                value={isLoading ? "..." : liveDataStats?.valueBetsFound || 0}
                icon={Eye}
                change="Live"
                changeType="positive"
                description="ML-identified opportunities"
              />
              <StatCard
                title="Avg Confidence"
                value={isLoading ? "..." : `${Math.round((liveDataStats?.avgConfidence || 0) * 100)}%`}
                icon={Percent}
                change="ML"
                changeType="positive"
                description="Ensemble model confidence"
              />
              <StatCard
                title="Arbitrage Found"
                value={isLoading ? "..." : liveDataStats?.arbitrageOpportunities || 0}
                icon={DollarSign}
                change="Risk-free"
                changeType="positive"
                description="Guaranteed profit opportunities"
              />
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Sports Active"
                value={isLoading ? "..." : liveDataStats?.sportsActive || 0}
                icon={Zap}
                change="All leagues"
                changeType="positive"
                description="NBA, NFL, MLB, NHL, NCAA, Tennis, Soccer"
              />
              <StatCard
                title="Predictions Made"
                value={isLoading ? "..." : liveDataStats?.predictionsGenerated || 0}
                icon={Trophy}
                change="4 models"
                changeType="positive"
                description="ELO, Poisson, Regression, Neural"
              />
              <StatCard
                title="Best Value Bet"
                value={isLoading ? "..." : liveDataStats?.topValueBets?.[0] ? `+${liveDataStats.topValueBets[0].expectedValue.toFixed(1)}%` : 'N/A'}
                icon={TrendingUp}
                change="Top EV"
                changeType="positive"
                description="Highest expected value found"
              />
            </div>

            {/* Main Live Sports Dashboard */}
            <LiveSportsDashboard autoRefresh={true} />
          </div>
        )}

        {activeTab === 'moneylines' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Moneyline Analysis</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Advanced AI-powered moneyline predictions with edge calculation, Kelly criterion, and value ratings across all major sports
              </p>
            </div>
            <MoneylineDisplay />
          </div>
        )}

        {activeTab === 'parlays' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Parlay Optimizer</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                ML-powered parlay optimization with correlation analysis, risk management, and expected value calculations
              </p>
            </div>
            <ParlayOptimizer />
          </div>
        )}

        {activeTab === 'calculator' && (
          <ProbabilityCalculator />
        )}

      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-lg p-8 text-center space-y-6 max-w-md">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-t-4 border-green-400 animate-ping mx-auto opacity-75"></div>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">Initializing Analytics</h3>
              <p className="text-slate-400">Connecting to sports data feeds and calculating probabilities...</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Fetching live sports data</span>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Running ML models</span>
                <div className="w-32 bg-slate-700 rounded-full h-1">
                  <div className="bg-gradient-to-r from-blue-500 to-green-500 h-1 rounded-full animate-pulse" style={{width: '75%'}}></div>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Calculating probabilities</span>
                <div className="w-32 bg-slate-700 rounded-full h-1">
                  <div className="bg-gradient-to-r from-green-500 to-purple-500 h-1 rounded-full animate-pulse" style={{width: '90%'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}