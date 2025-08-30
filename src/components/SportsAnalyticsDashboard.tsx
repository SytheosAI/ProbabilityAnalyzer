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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

const mockProfitData = [
  { time: '9:00', profit: 0, bets: 0 },
  { time: '10:00', profit: 245, bets: 3 },
  { time: '11:00', profit: 423, bets: 7 },
  { time: '12:00', profit: 578, bets: 12 },
  { time: '13:00', profit: 734, bets: 18 },
  { time: '14:00', profit: 1124, bets: 23 },
  { time: '15:00', profit: 1567, bets: 31 },
  { time: '16:00', profit: 1823, bets: 38 },
]

const mockSportsData = [
  { sport: 'NFL', games: 12, value_bets: 5, avg_ev: 12.3 },
  { sport: 'NBA', games: 8, value_bets: 3, avg_ev: 8.7 },
  { sport: 'MLB', games: 15, value_bets: 7, avg_ev: 6.2 },
  { sport: 'NHL', games: 6, value_bets: 2, avg_ev: 9.1 },
  { sport: 'Soccer', games: 10, value_bets: 4, avg_ev: 11.8 },
]

const mockRiskDistribution = [
  { name: 'Conservative', value: 35, count: 12 },
  { name: 'Moderate', value: 45, count: 18 },
  { name: 'Aggressive', value: 15, count: 7 },
  { name: 'High Risk', value: 5, count: 3 },
]

const mockRecentBets = [
  {
    id: 1,
    game: 'Chiefs vs Bills',
    bet: 'Bills ML',
    odds: +120,
    probability: 0.58,
    ev: 8.4,
    status: 'pending',
    confidence: 0.78
  },
  {
    id: 2,
    game: 'Lakers vs Warriors',
    bet: 'Lakers -3.5',
    odds: -110,
    probability: 0.62,
    ev: 5.2,
    status: 'won',
    confidence: 0.71
  },
  {
    id: 3,
    game: 'Yankees vs Red Sox',
    bet: 'Over 8.5',
    odds: -105,
    probability: 0.55,
    ev: 3.8,
    status: 'lost',
    confidence: 0.64
  },
  {
    id: 4,
    game: 'Cowboys vs Giants',
    bet: 'Cowboys ML',
    odds: -150,
    probability: 0.68,
    ev: 6.7,
    status: 'pending',
    confidence: 0.82
  }
]

const ValueBetCard = ({ bet }: { bet: typeof mockRecentBets[0] }) => (
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

  const handleRefresh = async () => {
    setRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
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
              <AreaChart data={mockProfitData}>
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
              <BarChart data={mockSportsData}>
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
                  data={mockRiskDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {mockRiskDistribution.map((entry, index) => (
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
                {mockRecentBets.map(bet => (
                  <ValueBetCard key={bet.id} bet={bet} />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Alert Banner */}
      <Card className="glass border-green-500/50 bg-green-500/10">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-green-400 font-medium">New Arbitrage Opportunity Detected!</p>
              <p className="text-slate-400 text-sm">Lakers vs Warriors - 2.3% guaranteed profit margin across DraftKings and FanDuel</p>
            </div>
            <Button variant="success" size="sm" className="ml-auto">
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}