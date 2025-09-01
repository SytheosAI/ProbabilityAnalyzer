'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp,
  TrendingDown,
  Filter,
  Settings,
  Eye,
  Target,
  Flame,
  Zap,
  Award,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeatMapData {
  sport: string
  market: string
  value: number
  volume: number
  label: string
  description: string
  trend: 'up' | 'down' | 'stable'
  confidence: number
}

interface ValueHeatMapProps {
  title: string
  subtitle: string
  data: HeatMapData[]
  valueType: 'ev' | 'volume' | 'sharp_money' | 'steam' | 'roi'
  onCellClick?: (data: HeatMapData) => void
}

const ValueHeatMap: React.FC<ValueHeatMapProps> = ({
  title,
  subtitle,
  data,
  valueType,
  onCellClick
}) => {
  const [selectedCell, setSelectedCell] = useState<HeatMapData | null>(null)
  const [filterSport, setFilterSport] = useState<string>('all')
  const [filterMarket, setFilterMarket] = useState<string>('all')

  const getValueColor = (value: number, type: string) => {
    const intensity = Math.min(100, Math.abs(value * 10))
    
    switch (type) {
      case 'ev':
        if (value > 15) return `bg-green-500/${Math.min(100, intensity + 40)}`
        if (value > 8) return `bg-blue-500/${Math.min(100, intensity + 20)}`
        if (value > 3) return `bg-yellow-500/${Math.min(100, intensity)}`
        return `bg-slate-500/${Math.min(100, intensity)}`
      
      case 'volume':
        return `bg-purple-500/${Math.min(100, intensity)}`
      
      case 'sharp_money':
        if (value > 70) return `bg-red-500/${Math.min(100, intensity + 30)}`
        return `bg-orange-500/${Math.min(100, intensity)}`
      
      case 'steam':
        return value > 5 ? `bg-red-500/${Math.min(100, intensity + 50)}` : `bg-slate-500/20`
      
      case 'roi':
        return value > 0 ? `bg-green-500/${Math.min(100, intensity)}` : `bg-red-500/${Math.min(100, intensity)}`
      
      default:
        return `bg-blue-500/${Math.min(100, intensity)}`
    }
  }

  const getValueIcon = (value: number, type: string) => {
    switch (type) {
      case 'ev':
        if (value > 15) return <Award className="h-3 w-3 text-green-200" />
        if (value > 8) return <Target className="h-3 w-3 text-blue-200" />
        return null
      
      case 'steam':
        return value > 5 ? <Flame className="h-3 w-3 text-red-200" /> : null
      
      case 'sharp_money':
        return value > 70 ? <Zap className="h-3 w-3 text-red-200" /> : null
      
      default:
        return null
    }
  }

  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'ev':
      case 'roi':
        return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
      case 'volume':
        return `${(value / 1000).toFixed(0)}K`
      case 'sharp_money':
        return `${value.toFixed(0)}%`
      case 'steam':
        return value > 0 ? `${value.toFixed(1)}pt` : 'Stable'
      default:
        return value.toString()
    }
  }

  const filteredData = data.filter(item => 
    (filterSport === 'all' || item.sport === filterSport) &&
    (filterMarket === 'all' || item.market === filterMarket)
  )

  const sports = [...new Set(data.map(item => item.sport))]
  const markets = [...new Set(data.map(item => item.market))]

  const maxValue = Math.max(...filteredData.map(item => Math.abs(item.value)))

  return (
    <Card className="glass border-slate-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <Eye className="h-5 w-5 text-blue-400" />
              <span>{title}</span>
            </CardTitle>
            <CardDescription className="text-slate-400">{subtitle}</CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Sports</option>
              {sports.map(sport => (
                <option key={sport} value={sport}>{sport}</option>
              ))}
            </select>
            
            <select
              value={filterMarket}
              onChange={(e) => setFilterMarket(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Markets</option>
              {markets.map(market => (
                <option key={market} value={market}>{market}</option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {filteredData.map((item, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedCell(item)
                onCellClick?.(item)
              }}
              className={cn(
                "relative p-3 rounded-lg border border-slate-600/30 cursor-pointer transition-all duration-300 hover:scale-105 hover:border-blue-500/50",
                getValueColor(item.value, valueType),
                selectedCell?.label === item.label ? "ring-2 ring-blue-500" : ""
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white truncate">
                  {item.sport}
                </span>
                {getValueIcon(item.value, valueType)}
              </div>
              
              <div className="text-xs text-slate-300 mb-1 truncate">
                {item.market}
              </div>
              
              <div className="text-sm font-bold text-white mb-1">
                {formatValue(item.value, valueType)}
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {item.confidence > 0.8 ? 'High' : item.confidence > 0.6 ? 'Med' : 'Low'}
                </span>
                
                {item.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-400" />}
                {item.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-400" />}
              </div>

              {/* Intensity indicator */}
              <div className="absolute bottom-1 right-1">
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  item.value > maxValue * 0.8 ? "bg-white" :
                  item.value > maxValue * 0.6 ? "bg-slate-300" :
                  item.value > maxValue * 0.4 ? "bg-slate-400" : "bg-slate-500"
                )} />
              </div>
            </div>
          ))}
        </div>
        
        {selectedCell && (
          <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600/50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-white font-medium mb-1">
                  {selectedCell.sport} - {selectedCell.market}
                </h4>
                <p className="text-slate-300 text-sm mb-2">
                  {selectedCell.description}
                </p>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400">Value</p>
                    <p className="text-white font-medium">
                      {formatValue(selectedCell.value, valueType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Volume</p>
                    <p className="text-white font-medium">
                      {(selectedCell.volume / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Confidence</p>
                    <p className="text-white font-medium">
                      {(selectedCell.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => setSelectedCell(null)}
                variant="ghost"
                className="text-slate-400 hover:text-white"
              >
                ×
              </Button>
            </div>
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-700/50">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500/60 rounded"></div>
              <span className="text-slate-400">High Value</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-500/60 rounded"></div>
              <span className="text-slate-400">Medium Value</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-slate-500/60 rounded"></div>
              <span className="text-slate-400">Low Value</span>
            </div>
          </div>
          
          <div className="text-xs text-slate-400">
            {filteredData.length} opportunities shown
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const MultiHeatMapDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'ev' | 'volume' | 'sharp_money' | 'steam'>('ev')
  const [heatMapData, setHeatMapData] = useState<{[key: string]: HeatMapData[]}>({
    ev: [],
    volume: [],
    sharp_money: [],
    steam: []
  })

  // Fetch real heat map data from API
  useEffect(() => {
    const fetchHeatMapData = async () => {
      try {
        const response = await fetch('/api/sports/heatmap-data')
        const result = await response.json()
        
        if (result.success && result.data) {
          setHeatMapData(result.data)
        } else {
          // If no real data available, show empty state
          setHeatMapData({
            ev: [],
            volume: [],
            sharp_money: [],
            steam: []
          })
        }
      } catch (error) {
        console.error('Error fetching heat map data:', error)
        setHeatMapData({
          ev: [],
          volume: [],
          sharp_money: [],
          steam: []
        })
      }
    }

    fetchHeatMapData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHeatMapData, 30000)
    return () => clearInterval(interval)
  }, [])

  const evData = heatMapData.ev
  const volumeData = heatMapData.volume
  const sharpMoneyData = heatMapData.sharp_money
  const steamData = heatMapData.steam

  const handleCellClick = (data: HeatMapData) => {
    console.log('Heat map cell clicked:', data)
    // Handle cell click - could navigate to detailed view, show more info, etc.
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="flex items-center space-x-2 bg-slate-800/50 p-1 rounded-lg w-fit">
        <Button
          variant={activeView === 'ev' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('ev')}
          className="text-white"
        >
          <Target className="h-4 w-4 mr-1" />
          Expected Value
        </Button>
        <Button
          variant={activeView === 'volume' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('volume')}
          className="text-white"
        >
          <TrendingUp className="h-4 w-4 mr-1" />
          Volume
        </Button>
        <Button
          variant={activeView === 'sharp_money' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('sharp_money')}
          className="text-white"
        >
          <Zap className="h-4 w-4 mr-1" />
          Sharp Money
        </Button>
        <Button
          variant={activeView === 'steam' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveView('steam')}
          className="text-white"
        >
          <Flame className="h-4 w-4 mr-1" />
          Steam Moves
        </Button>
      </div>

      {/* Heat Maps */}
      {activeView === 'ev' && (
        <ValueHeatMap
          title="Expected Value Heat Map"
          subtitle="Live expected value analysis across all sports and markets"
          data={evData}
          valueType="ev"
          onCellClick={handleCellClick}
        />
      )}

      {activeView === 'volume' && (
        <ValueHeatMap
          title="Betting Volume Heat Map"
          subtitle="Real-time betting volume across markets"
          data={volumeData}
          valueType="volume"
          onCellClick={handleCellClick}
        />
      )}

      {activeView === 'sharp_money' && (
        <ValueHeatMap
          title="Sharp Money Heat Map"
          subtitle="Professional money distribution analysis"
          data={sharpMoneyData}
          valueType="sharp_money"
          onCellClick={handleCellClick}
        />
      )}

      {activeView === 'steam' && (
        <ValueHeatMap
          title="Steam Move Heat Map"
          subtitle="Line movement and steam detection"
          data={steamData}
          valueType="steam"
          onCellClick={handleCellClick}
        />
      )}
    </div>
  )
}

export default MultiHeatMapDashboard