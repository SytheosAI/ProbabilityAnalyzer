'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calculator,
  RefreshCw,
  Filter,
  Eye,
  DollarSign,
  Zap,
  Award,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn, formatPercentage, formatOdds, getValueRating, getConfidenceColor } from '@/lib/utils'
import { MoneylinePrediction, Game } from '@/types/sports'
import { getAllSportsGames, getGameOdds, getTeamStatistics } from '@/services/sportsRadarApi'

// Real-time data fetching functions
const fetchLiveGames = async (): Promise<Game[]> => {
  try {
    const sportsData = await getAllSportsGames();
    const allGames: Game[] = [];
    
    for (const sportData of sportsData) {
      for (const game of sportData.games) {
        const formattedGame: Game = {
          game_id: game.id,
          sport: sportData.sport,
          home_team: game.home_team.name || `${game.home_team.market} ${game.home_team.alias}`,
          away_team: game.away_team.name || `${game.away_team.market} ${game.away_team.alias}`,
          home_moneyline: -110, // Will be updated with real odds
          away_moneyline: -110, // Will be updated with real odds
          game_time: game.scheduled,
          venue: game.venue?.name || 'TBD'
        };
        
        // Fetch real odds for this game
        try {
          const odds = await getGameOdds(sportData.sport.toLowerCase(), game.id);
          if (odds?.markets) {
            const moneylineMarket = odds.markets.find(m => m.name === 'moneyline');
            if (moneylineMarket?.books?.[0]?.outcomes) {
              const homeOdds = moneylineMarket.books[0].outcomes.find(o => o.type === 'home');
              const awayOdds = moneylineMarket.books[0].outcomes.find(o => o.type === 'away');
              
              if (homeOdds?.odds?.american) {
                formattedGame.home_moneyline = parseInt(homeOdds.odds.american);
              }
              if (awayOdds?.odds?.american) {
                formattedGame.away_moneyline = parseInt(awayOdds.odds.american);
              }
            }
          }
        } catch (oddsError) {
          console.warn('Could not fetch odds for game:', game.id);
        }
        
        allGames.push(formattedGame);
        
        // Save to database via API
        await fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: formattedGame.game_id,
            sport: formattedGame.sport,
            home_team: formattedGame.home_team,
            away_team: formattedGame.away_team,
            scheduled: new Date(formattedGame.game_time),
            status: game.status
          })
        });
      }
    }
    
    return allGames;
  } catch (error) {
    console.error('Error fetching live games:', error);
    return [];
  }
};

const generatePredictions = async (games: Game[]): Promise<MoneylinePrediction[]> => {
  const predictions: MoneylinePrediction[] = [];
  
  for (const game of games) {
    try {
      // Call Python prediction API
      const response = await fetch('/api/moneyline/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game })
      });
      
      if (response.ok) {
        const prediction = await response.json();
        predictions.push(prediction);
        
        // Save to database via API
        await fetch('/api/predictions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            game_id: game.game_id,
            prediction_type: 'moneyline',
            predicted_outcome: prediction.team,
            confidence: prediction.confidence_score,
            probability: prediction.true_probability,
            expected_value: prediction.expected_value
          })
        });
      }
    } catch (error) {
      console.error('Error generating prediction for game:', game.game_id, error);
    }
  }
  
  return predictions;
};

const ValueIndicator = ({ rating }: { rating: 'excellent' | 'good' | 'moderate' | 'poor' }) => {
  const config = {
    excellent: { color: 'text-green-400', bg: 'bg-green-500/20', icon: Award },
    good: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle },
    moderate: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', icon: Eye },
    poor: { color: 'text-red-400', bg: 'bg-red-500/20', icon: AlertTriangle }
  }
  
  const { color, bg, icon: Icon } = config[rating]
  
  return (
    <div className={cn("flex items-center space-x-1 px-2 py-1 rounded-full", bg)}>
      <Icon className={cn("h-3 w-3", color)} />
      <span className={cn("text-xs font-medium capitalize", color)}>
        {rating}
      </span>
    </div>
  )
}

const MoneylineCard = ({ prediction, game }: { prediction: MoneylinePrediction, game: Game }) => {
  const [showDetails, setShowDetails] = useState(false)
  
  return (
    <Card className="glass border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 card-glow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg text-white flex items-center space-x-2">
              <span>{game.away_team} @ {game.home_team}</span>
              <div className="text-xs bg-slate-700 px-2 py-1 rounded">
                {prediction.sport.toUpperCase()}
              </div>
            </CardTitle>
            <CardDescription className="text-slate-400 mt-1">
              {new Date(game.game_time).toLocaleDateString()} • {game.venue}
            </CardDescription>
          </div>
          <ValueIndicator rating={prediction.value_rating} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Prediction Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-center p-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm text-slate-400">Recommended Bet</p>
              <p className="text-lg font-bold text-white">{prediction.team}</p>
              <p className="text-blue-400 font-medium">{formatOdds(prediction.american_odds)}</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-400">Expected Value</p>
                <p className="text-green-400 font-bold">{prediction.expected_value.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-slate-400">Confidence</p>
                <p className={cn("font-bold", getConfidenceColor(prediction.confidence_score))}>
                  {formatPercentage(prediction.confidence_score)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">True Prob</p>
                <p className="text-white font-medium">{formatPercentage(prediction.true_probability)}</p>
              </div>
              <div>
                <p className="text-slate-400">Edge</p>
                <p className="text-blue-400 font-medium">{formatPercentage(prediction.edge)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Kelly Criterion & Stake */}
        <div className="bg-slate-800/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Kelly Criterion Stake</p>
              <p className="text-lg font-bold text-yellow-400">
                {formatPercentage(prediction.kelly_criterion)} of bankroll
              </p>
            </div>
            <Calculator className="h-5 w-5 text-yellow-400" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Optimal bet size based on edge and bankroll management
          </p>
        </div>
        
        {/* Key Factors Toggle */}
        <Button
          variant="ghost"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full text-slate-400 hover:text-white"
        >
          {showDetails ? 'Hide' : 'Show'} Key Factors
          <Eye className="h-4 w-4 ml-2" />
        </Button>
        
        {/* Detailed Analysis */}
        {showDetails && (
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <h4 className="text-sm font-medium text-white">Analysis Factors</h4>
            <div className="space-y-2">
              {Object.entries(prediction.key_factors).map(([key, value]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-700">
              <div>
                <p className="text-xs text-slate-400">Implied Probability</p>
                <p className="text-red-400 font-medium">{formatPercentage(prediction.implied_probability)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Decimal Odds</p>
                <p className="text-white font-medium">{prediction.decimal_odds.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-2">
          <Button 
            className="flex-1" 
            variant={prediction.value_rating === 'excellent' ? 'success' : 'default'}
          >
            <Target className="h-4 w-4 mr-2" />
            Place Bet
          </Button>
          <Button variant="outline" className="text-white border-slate-700">
            <Calculator className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MoneylineDisplay() {
  const [predictions, setPredictions] = useState<MoneylinePrediction[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSport, setFilterSport] = useState<string>('all')
  const [minExpectedValue, setMinExpectedValue] = useState(5)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch live data on component mount
  useEffect(() => {
    fetchRealData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRealData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [])
  
  const fetchRealData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch REAL live games from Sports Radar API
      const liveGames = await fetchLiveGames();
      setGames(liveGames);
      
      // Generate predictions based on real games
      if (liveGames.length > 0) {
        const livePredictions = await generatePredictions(liveGames);
        setPredictions(livePredictions);
      } else {
        console.log('No live games available at this time');
      }
    } catch (err) {
      console.error('Error fetching real data:', err);
      setError('Failed to fetch live data. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  
  const filteredPredictions = predictions.filter(pred => {
    const matchesSport = filterSport === 'all' || pred.sport.toLowerCase() === filterSport
    const matchesEV = pred.expected_value >= minExpectedValue
    return matchesSport && matchesEV
  })
  
  const handleRefresh = async () => {
    await fetchRealData();
  }
  
  const totalEV = filteredPredictions.reduce((sum, pred) => sum + pred.expected_value, 0)
  const avgConfidence = filteredPredictions.reduce((sum, pred) => sum + pred.confidence_score, 0) / filteredPredictions.length || 0
  
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{filteredPredictions.length}</p>
            <p className="text-sm text-slate-400">Value Bets Found</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{totalEV.toFixed(1)}%</p>
            <p className="text-sm text-slate-400">Total Expected Value</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Zap className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">{formatPercentage(avgConfidence)}</p>
            <p className="text-sm text-slate-400">Avg Confidence</p>
          </CardContent>
        </Card>
        
        <Card className="glass border-slate-700/50">
          <CardContent className="p-4 text-center">
            <Award className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              {filteredPredictions.filter(p => p.value_rating === 'excellent').length}
            </p>
            <p className="text-sm text-slate-400">Excellent Ratings</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Sports</option>
              <option value="nfl">NFL</option>
              <option value="nba">NBA</option>
              <option value="mlb">MLB</option>
              <option value="nhl">NHL</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-400">Min EV:</span>
            <select
              value={minExpectedValue}
              onChange={(e) => setMinExpectedValue(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value={0}>0%</option>
              <option value={3}>3%</option>
              <option value={5}>5%</option>
              <option value={8}>8%</option>
              <option value={10}>10%</option>
            </select>
          </div>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="outline"
          className="text-white border-slate-700"
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          {loading ? 'Updating...' : 'Refresh Odds'}
        </Button>
      </div>
      
      {/* Moneyline Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPredictions.map(prediction => {
          const game = games.find(g => g.game_id === prediction.game_id)
          return game ? (
            <MoneylineCard
              key={prediction.game_id}
              prediction={prediction}
              game={game}
            />
          ) : null
        })}
      </div>
      
      {loading && (
        <Card className="glass border-slate-700/50">
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-white mb-2">Fetching Live Data...</h3>
            <p className="text-slate-400">
              Connecting to Sports Radar API for real-time games and odds
            </p>
          </CardContent>
        </Card>
      )}
      
      {error && (
        <Card className="glass border-slate-700/50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Error Loading Data</h3>
            <p className="text-slate-400 mb-4">{error}</p>
            <Button onClick={handleRefresh} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
      
      {!loading && !error && filteredPredictions.length === 0 && (
        <Card className="glass border-slate-700/50">
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Value Bets Found</h3>
            <p className="text-slate-400 mb-4">
              {games.length === 0 
                ? 'No live games available at this time. Check back later for upcoming games.'
                : 'Try adjusting your filters or refresh to get the latest odds and analysis.'}
            </p>
            <Button onClick={handleRefresh} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}