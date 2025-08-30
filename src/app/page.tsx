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
  Percent
} from 'lucide-react'
import SportsAnalyticsDashboard from '@/components/SportsAnalyticsDashboard'
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
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    total_games_analyzed: 0,
    value_bets_found: 0,
    avg_expected_value: 0,
    avg_confidence: 0,
    parlay_opportunities: 0,
    arbitrage_opportunities: 0,
    total_profit_potential: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading and fetching initial stats
    const timer = setTimeout(() => {
      setDashboardStats({
        total_games_analyzed: 156,
        value_bets_found: 23,
        avg_expected_value: 8.7,
        avg_confidence: 0.742,
        parlay_opportunities: 12,
        arbitrage_opportunities: 3,
        total_profit_potential: 2847.50
      })
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

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
                <h1 className="text-xl font-bold text-white">Sports Probability Analyzer</h1>
                <p className="text-sm text-slate-400">AI-Powered Sports Betting Intelligence</p>
              </div>
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
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Games Analyzed Today"
                value={isLoading ? "..." : dashboardStats.total_games_analyzed}
                icon={Activity}
                change="+12%"
                changeType="positive"
                description="Across all major sports leagues"
              />
              <StatCard
                title="Value Bets Found"
                value={isLoading ? "..." : dashboardStats.value_bets_found}
                icon={Eye}
                change="+5"
                changeType="positive"
                description="High-confidence opportunities"
              />
              <StatCard
                title="Average Expected Value"
                value={isLoading ? "..." : `${dashboardStats.avg_expected_value}%`}
                icon={Percent}
                change="+2.3%"
                changeType="positive"
                description="Based on true probability analysis"
              />
              <StatCard
                title="Profit Potential"
                value={isLoading ? "..." : `$${dashboardStats.total_profit_potential.toLocaleString()}`}
                icon={DollarSign}
                change="+$486"
                changeType="positive"
                description="Theoretical max with optimal staking"
              />
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Average Confidence"
                value={isLoading ? "..." : `${Math.round(dashboardStats.avg_confidence * 100)}%`}
                icon={Zap}
                change="+3.2%"
                changeType="positive"
                description="Model prediction confidence"
              />
              <StatCard
                title="Parlay Opportunities"
                value={isLoading ? "..." : dashboardStats.parlay_opportunities}
                icon={Trophy}
                change="+2"
                changeType="positive"
                description="Low correlation, high EV parlays"
              />
              <StatCard
                title="Arbitrage Detected"
                value={isLoading ? "..." : dashboardStats.arbitrage_opportunities}
                icon={TrendingUp}
                change="New!"
                changeType="positive"
                description="Risk-free profit opportunities"
              />
            </div>

            {/* Main Dashboard Component */}
            <SportsAnalyticsDashboard />
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
          <div className="glass rounded-lg p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <h3 className="text-xl font-semibold text-white">Loading Sports Data</h3>
            <p className="text-slate-400">Analyzing current games and generating predictions...</p>
          </div>
        </div>
      )}
    </div>
  )
}