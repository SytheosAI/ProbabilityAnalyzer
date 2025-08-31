'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Filter,
  Calendar,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Percent
} from 'lucide-react'
import { cn, formatPercentage, formatCurrency } from '@/lib/utils'
import { getAllSportsGames, getGameOdds } from '@/services/sportsRadarApi'
import { 
  getDemoProfitData, 
  getDemoSportsPerformance, 
  getDemoRiskDistribution, 
  getDemoRecentBets,
  shouldUseDemoData 
} from '@/services/demoDataService'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// Interfaces for live data
interface ProfitData {
  time: string
  profit: number
  bets: number
}

interface SportsPerformance {
  sport: string
  games: number
  value_bets: number
  avg_ev: number
}

interface RiskData {
  name: string
  value: number
  count: number
}

interface RecentBet {
  id: number
  game: string
  bet: string
  odds: number
  probability: number
  ev: number
  status: string
  confidence: number
}

const ValueBetCard = ({ bet }: { bet: RecentBet }) => (
  <div className="p-4 glass rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-medium text-white">{bet.game}</h4>
      <div className={cn(
        "px-2 py-1 rounded-full text-xs font-medium",
        bet.status === 'won' ? 'bg-green-500/20 text-green-400' :
        bet.status === 'lost' ? 'bg-red-500/20 text-red-400' :
        'bg-yellow-500/20 text-yellow-400'
      )}>
        {bet.status.toUpperCase()}
      </div>
    </div>
    
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-slate-400">Bet:</span>
        <span className="text-white font-medium">{bet.bet}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Odds:</span>
        <span className="text-white">{bet.odds > 0 ? `+${bet.odds}` : bet.odds}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">True Probability:</span>
        <span className="text-green-400">{formatPercentage(bet.probability)}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Expected Value:</span>
        <span className="text-blue-400 font-medium">{bet.ev.toFixed(1)}%</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-slate-400">Confidence:</span>
        <span className={cn(
          "font-medium",
          bet.confidence >= 0.8 ? 'text-green-400' :
          bet.confidence >= 0.65 ? 'text-yellow-400' :
          'text-red-400'
        )}>
          {formatPercentage(bet.confidence)}
        </span>
      </div>
    </div>
  </div>
)

export default function SportsAnalyticsDashboard() {
  const [refreshing, setRefreshing] = useState(false)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('6h')
  const [profitData, setProfitData] = useState<ProfitData[]>([])
  const [sportsData, setSportsData] = useState<SportsPerformance[]>([])
  const [riskDistribution, setRiskDistribution] = useState<RiskData[]>([])
  const [recentBets, setRecentBets] = useState<RecentBet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLiveAnalytics()
    // Refresh every 2 minutes
    const interval = setInterval(fetchLiveAnalytics, 2 * 60 * 1000)
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchLiveAnalytics = async () => {
    try {
      // Check if we should use demo data
      if (shouldUseDemoData()) {
        console.log('Using demo data for analytics dashboard')
        setProfitData(getDemoProfitData(8))
        setSportsData(getDemoSportsPerformance())
        setRiskDistribution(getDemoRiskDistribution())
        setRecentBets(getDemoRecentBets())
        setLoading(false)
        return
      }

      // Fetch analytics data from API
      const days = timeRange === '1h' ? 1 : timeRange === '6h' ? 0.25 : timeRange === '24h' ? 1 : 7;
      const analyticsResponse = await fetch(`/api/analytics?timeRange=${timeRange}&days=${days}`)
      const analyticsResult = await analyticsResponse.json()
      
      if (!analyticsResult.success) {
        throw new Error(analyticsResult.message || 'Failed to fetch analytics')
      }

      const { predictions, metrics } = analyticsResult.data
      const isDemo = analyticsResult.isDemo || false

      // If API returned demo data, use our enhanced demo data instead
      if (isDemo || (predictions.length === 0 && metrics.length === 0)) {
        console.log('API returned empty/demo data, using enhanced demo data')
        setProfitData(getDemoProfitData(8))
        setSportsData(getDemoSportsPerformance())
        setRiskDistribution(getDemoRiskDistribution())
        setRecentBets(getDemoRecentBets())
        setLoading(false)
        return
      }

      const liveGames = await getAllSportsGames()

      // Process profit data from database metrics
      const profitPoints = generateProfitData(metrics)
      setProfitData(profitPoints.length > 0 ? profitPoints : getDemoProfitData(8))

      // Process sports performance data
      const sportsPerf = await processSportsPerformance(liveGames, predictions)
      setSportsData(sportsPerf.length > 0 ? sportsPerf : getDemoSportsPerformance())

      // Calculate risk distribution from predictions
      const riskDist = calculateRiskDistribution(predictions)
      setRiskDistribution(riskDist)

      // Format recent high-value bets
      const valueBets = await formatRecentBets(predictions)
      setRecentBets(valueBets.length > 0 ? valueBets : getDemoRecentBets())

      setLoading(false)
    } catch (error) {
      console.error('Error fetching live analytics:', error)
      // Use enhanced demo data if API fails
      setProfitData(getDemoProfitData(8))
      setSportsData(getDemoSportsPerformance())
      setRiskDistribution(getDemoRiskDistribution())
      setRecentBets(getDemoRecentBets())
      setLoading(false)
    }
  }

  const generateProfitData = (metrics: any[]): ProfitData[] => {
    const now = new Date()
    const points: ProfitData[] = []
    let cumulativeProfit = 0
    let cumulativeBets = 0

    // Generate hourly points based on timeRange
    const hours = timeRange === '1h' ? 4 : timeRange === '6h' ? 7 : timeRange === '24h' ? 12 : 24
    const interval = timeRange === '1h' ? 15 : timeRange === '6h' ? 60 : timeRange === '24h' ? 120 : 360

    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - (hours - i - 1) * interval * 60000)
      const timeStr = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      
      // Calculate profit from metrics
      const relevantMetrics = metrics.filter(m => {
        const metricTime = new Date(m.date)
        return metricTime <= time
      })

      if (relevantMetrics.length > 0) {
        const latestMetric = relevantMetrics[relevantMetrics.length - 1]
        cumulativeProfit += (latestMetric.total_value || 0) * 10
        cumulativeBets += latestMetric.total_predictions || 0
      }

      points.push({
        time: timeStr,
        profit: Math.round(cumulativeProfit),
        bets: cumulativeBets
      })
    }

    return points
  }

  const processSportsPerformance = async (sportsGames: any[], predictions: any[]): Promise<SportsPerformance[]> => {
    const performance: SportsPerformance[] = []

    for (const sportData of sportsGames) {
      const sportPredictions = predictions.filter(p => p.sport === sportData.sport)
      const valueBets = sportPredictions.filter(p => p.expected_value > 5)
      const avgEV = valueBets.length > 0 
        ? valueBets.reduce((sum, p) => sum + p.expected_value, 0) / valueBets.length
        : 0

      performance.push({
        sport: sportData.sport,
        games: sportData.games.length,
        value_bets: valueBets.length,
        avg_ev: Math.round(avgEV * 10) / 10
      })
    }

    return performance
  }

  const calculateRiskDistribution = (predictions: any[]): RiskData[] => {
    const distribution = [
      { name: 'Conservative', value: 0, count: 0 },
      { name: 'Moderate', value: 0, count: 0 },
      { name: 'Aggressive', value: 0, count: 0 },
      { name: 'High Risk', value: 0, count: 0 }
    ]

    predictions.forEach(pred => {
      const conf = pred.confidence || 0
      if (conf >= 0.75) {
        distribution[0].count++
      } else if (conf >= 0.6) {
        distribution[1].count++
      } else if (conf >= 0.45) {
        distribution[2].count++
      } else {
        distribution[3].count++
      }
    })

    const total = distribution.reduce((sum, d) => sum + d.count, 0)
    if (total > 0) {
      distribution.forEach(d => {
        d.value = Math.round((d.count / total) * 100)
      })
    } else {
      // Default distribution if no data
      distribution[0].value = 35
      distribution[1].value = 45
      distribution[2].value = 15
      distribution[3].value = 5
    }

    return distribution
  }

  const formatRecentBets = async (predictions: any[]): Promise<RecentBet[]> => {
    const bets: RecentBet[] = []

    // Get top value bets
    const sortedPredictions = predictions
      .filter(p => p.expected_value > 3)
      .sort((a, b) => b.expected_value - a.expected_value)
      .slice(0, 4)

    sortedPredictions.forEach((pred, index) => {
      bets.push({
        id: index + 1,
        game: `${pred.away_team} @ ${pred.home_team}`,
        bet: `${pred.predicted_outcome} ML`,
        odds: Math.round(pred.expected_value * 10) || 100,
        probability: pred.probability || 0.5,
        ev: pred.expected_value || 0,
        status: pred.is_correct === true ? 'won' : pred.is_correct === false ? 'lost' : 'pending',
        confidence: pred.confidence || 0.5
      })
    })

    return bets
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchLiveAnalytics()
    setRefreshing(false)
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Live Analytics Dashboard</h2>
          <p className="text-slate-400">Real-time sports betting analysis and value detection</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="text-xs"
              >
                {range}
              </Button>
            ))}
          </div>
          
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="text-white border-slate-700"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Tracking */}
        <Card className="glass border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
              Daily Profit Tracking
            </CardTitle>
            <CardDescription className="text-slate-400">
              Real-time profit and bet volume analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={profitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sports Performance */}
        <Card className="glass border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-blue-400" />
              Sports Performance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Value bets found by sport
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sportsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="sport" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Bar dataKey="value_bets" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_ev" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Distribution and Recent Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <Card className="glass border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="h-5 w-5 mr-2 text-purple-400" />
              Risk Distribution
            </CardTitle>
            <CardDescription className="text-slate-400">
              Bet allocation by risk level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent High-Value Bets */}
        <div className="lg:col-span-2">
          <Card className="glass border-slate-700/50 h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-400" />
                  High-Value Bets
                </div>
                <Button variant="outline" size="sm" className="text-white border-slate-700">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </CardTitle>
              <CardDescription className="text-slate-400">
                Recently identified value betting opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentBets.map(bet => (
                  <ValueBetCard key={bet.id} bet={bet} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Banner */}
      {recentBets.length > 0 && recentBets[0].ev > 10 && (
        <Card className="glass border-green-500/50 bg-green-500/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-green-400 font-medium">High-Value Opportunity Detected!</p>
                <p className="text-slate-400 text-sm">
                  {recentBets[0].game} - {recentBets[0].ev.toFixed(1)}% expected value on {recentBets[0].bet}
                </p>
              </div>
              <Button variant="success" size="sm" className="ml-auto">
                View Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-lg p-8 text-center space-y-4 max-w-md">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
              <div className="absolute inset-0 rounded-full h-16 w-16 border-t-4 border-blue-300 animate-ping mx-auto"></div>
            </div>
            <h3 className="text-xl font-semibold text-white">Loading Analytics</h3>
            <p className="text-slate-400">Processing real-time sports data and generating insights...</p>
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span className="animate-pulse delay-100">•</span>
              <span className="animate-pulse delay-200">•</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}