'use client'

import React, { useState, useEffect, Suspense, lazy } from 'react'
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
  AlertCircle,
  Play,
  Flame,
  TrendingDown,
  Map,
  Settings,
  ChevronDown
} from 'lucide-react'
import LiveSportsDashboard from '@/components/LiveSportsDashboard'
import MoneylineDisplay from '@/components/MoneylineDisplay'
import AdvancedMoneylineDisplay from '@/components/advanced/AdvancedMoneylineDisplay'
import ParlayOptimizer from '@/components/ParlayOptimizer'
import AdvancedParlayOptimizer from '@/components/advanced/AdvancedParlayOptimizer'
import ProbabilityCalculator from '@/components/ProbabilityCalculator'
import EnhancedDashboard from '@/components/EnhancedDashboard'
import EnhancedAnalytics from '@/components/EnhancedAnalytics'

// Lazy load heavy components for performance
const ProfessionalAnalytics = lazy(() => import('@/components/analytics/ProfessionalAnalytics'))
const LiveBettingInterface = lazy(() => import('@/components/live/LiveBettingInterface'))
const InteractiveHeatMap = lazy(() => import('@/components/charts/InteractiveHeatMap'))
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'moneylines' | 'parlays' | 'calculator' | 'analytics' | 'live_betting' | 'heatmaps'>('dashboard')
  const [showAdvancedDropdown, setShowAdvancedDropdown] = useState(false)
  const [liveDataStats, setLiveDataStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedDays, setSelectedDays] = useState<1 | 3 | 5>(3)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchLiveData()
  }, [selectedDays])

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAdvancedDropdown(false)
      }
    }

    if (showAdvancedDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAdvancedDropdown])

  const fetchLiveData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    
    try {
      // Try new live games API first
      const response = await fetch(`/api/sports/live-games?days=${selectedDays}`)
      const result = await response.json()
      
      if (result.success && result.data.stats.totalGames > 0) {
        setLiveDataStats(result.data.stats)
        setErrorMessage(null)
        console.log(`✅ Loaded ${result.data.stats.totalGames} real games`)
      } else {
        // NO FAKE DATA - Show the truth
        console.log('No real games available for selected timeframe')
        setLiveDataStats({
          totalGames: 0,
          liveGames: 0,
          sportsActive: 0,
          predictionsGenerated: 0,
          avgConfidence: 0,
          valueBetsFound: 0,
          arbitrageOpportunities: 0,
          topValueBets: []
        })
        setErrorMessage('No real games available for selected timeframe - Try expanding to 5 days or check back during regular season')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      // NO FAKE DATA - Show API error
      setLiveDataStats({
        totalGames: 0,
        liveGames: 0,
        sportsActive: 0,
        predictionsGenerated: 0,
        avgConfidence: 0,
        valueBetsFound: 0,
        arbitrageOpportunities: 0,
        topValueBets: []
      })
      setErrorMessage('API connection failed - Check network connection and try again')
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
                <p className="text-sm text-slate-400">Real-Time ML Analysis Across 12 Major Sports</p>
              </div>
            </div>
            
            {/* Day Filter and Live Data Indicator */}
            <div className="flex items-center space-x-3">
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value) as 1 | 3 | 5)}
                className="bg-slate-800/80 border border-slate-600/50 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value={1}>Next 1 Day</option>
                <option value={3}>Next 3 Days</option>
                <option value={5}>Next 5 Days</option>
              </select>
              <div className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium animate-pulse">
                LIVE DATA
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
                Markets
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
                variant={activeTab === 'analytics' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('analytics')}
                className="text-white"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button
                variant={activeTab === 'enhanced' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('enhanced')}
                className="text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Enhanced
              </Button>
              <Button
                variant={activeTab === 'live_betting' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('live_betting')}
                className="text-white"
              >
                <Play className="h-4 w-4 mr-2" />
                Live Betting
              </Button>
              
              {/* Advanced Features Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant={activeTab === 'heatmaps' || showAdvancedDropdown ? 'default' : 'ghost'}
                  onClick={() => setShowAdvancedDropdown(!showAdvancedDropdown)}
                  className="text-white"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Advanced
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
                
                {showAdvancedDropdown && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setActiveTab('heatmaps')
                          setShowAdvancedDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 transition-colors flex items-center space-x-2"
                      >
                        <Map className="h-4 w-4" />
                        <span>Heat Maps</span>
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('calculator')
                          setShowAdvancedDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 transition-colors flex items-center space-x-2"
                      >
                        <Target className="h-4 w-4" />
                        <span>Probability Calculator</span>
                      </button>
                      <div className="border-t border-slate-600 my-1"></div>
                      <button
                        onClick={() => {
                          window.open('/gpu-training', '_blank')
                          setShowAdvancedDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-slate-700 transition-colors flex items-center space-x-2"
                      >
                        <Zap className="h-4 w-4" />
                        <span>GPU Training</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
          <EnhancedDashboard />
        )}

        {activeTab === 'moneylines' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Advanced Betting Markets</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Professional-grade analysis across moneylines, spreads, totals, and props with sharp money tracking and line movement detection
              </p>
            </div>
            <AdvancedMoneylineDisplay />
          </div>
        )}

        {activeTab === 'parlays' && (
          <AdvancedParlayOptimizer />
        )}

        {activeTab === 'analytics' && (
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
              <p className="ml-4 text-slate-400">Loading Professional Analytics...</p>
            </div>
          }>
            <ProfessionalAnalytics />
          </Suspense>
        )}

        {activeTab === 'calculator' && (
          <ProbabilityCalculator />
        )}

        {activeTab === 'live_betting' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Live In-Game Betting</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Real-time betting opportunities with momentum analysis and sharp money tracking
              </p>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500"></div>
                <p className="ml-4 text-slate-400">Loading Live Betting Interface...</p>
              </div>
            }>
              <LiveBettingInterface />
            </Suspense>
          </div>
        )}

        {activeTab === 'enhanced' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Enhanced Cross-Reference Analytics</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                ESPN + Sports Radar data combined for comprehensive betting intelligence with sharp money indicators, 
                injury impacts, environmental factors, and advanced pattern recognition
              </p>
            </div>
            <EnhancedAnalytics sport="football" league="nfl" />
          </div>
        )}

        {activeTab === 'heatmaps' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-white">Market Visualization</h2>
              <p className="text-slate-400 max-w-2xl mx-auto">
                Interactive heat maps showing value opportunities, volume, sharp money, and line movements across all sports
              </p>
            </div>
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500"></div>
                <p className="ml-4 text-slate-400">Loading Market Visualization...</p>
              </div>
            }>
              <InteractiveHeatMap />
            </Suspense>
          </div>
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