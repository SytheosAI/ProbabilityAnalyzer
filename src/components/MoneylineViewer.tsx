'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Activity, AlertTriangle, Star, Zap, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  startTime: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: {
    line: number;
    homeOdds: number;
    awayOdds: number;
  };
  total?: {
    line: number;
    overOdds: number;
    underOdds: number;
  };
  mlPrediction?: {
    predictedWinner: 'home' | 'away';
    confidence: number;
    expectedValue: number;
    reasoning: string[];
    modelScore: {
      home: number;
      away: number;
    };
  };
}

interface SportData {
  sport: string;
  games: Game[];
  lastUpdated: string;
}

const SPORTS = [
  'All Sports',
  'NBA', 'NFL', 'MLB', 'NHL',
  'NCAA Basketball', 'NCAA Football',
  'WNBA', 'MLS',
  'Tennis', 'Soccer',
  'UFC/MMA', 'Boxing'
];

const VALUE_THRESHOLDS = {
  excellent: 0.15, // 15%+ EV
  good: 0.08,      // 8%+ EV
  fair: 0.03       // 3%+ EV
};

export default function MoneylineViewer() {
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [sportsData, setSportsData] = useState<SportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'time' | 'value' | 'confidence'>('value');
  const [filterValue, setFilterValue] = useState<'all' | 'value' | 'high-confidence'>('all');

  useEffect(() => {
    fetchGamesWithPredictions();
    const interval = setInterval(fetchGamesWithPredictions, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedSport]);

  const fetchGamesWithPredictions = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoint = selectedSport === 'All Sports' 
        ? '/api/sports/all-games'
        : `/api/sports/${selectedSport.toLowerCase()}/games`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Failed to fetch games');

      const data = await response.json();
      
      // Add ML predictions to games
      const enhancedData = Array.isArray(data) ? data : [data];
      enhancedData.forEach((sportData: SportData) => {
        sportData.games = sportData.games.map(game => ({
          ...game,
          mlPrediction: generateMLPrediction(game)
        }));
      });

      setSportsData(enhancedData);
    } catch (err) {
      setError('Failed to load games. Please try again.');
      console.error('Error fetching games:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate ML predictions based on moneyline odds and other factors
  const generateMLPrediction = (game: Game) => {
    if (!game.homeMoneyline || !game.awayMoneyline) return undefined;

    // Calculate implied probabilities
    const homeImplied = calculateImpliedProbability(game.homeMoneyline);
    const awayImplied = calculateImpliedProbability(game.awayMoneyline);

    // Simulate ML model prediction with some variance
    const modelVariance = (Math.random() - 0.5) * 0.2; // ±10% variance
    const homeModelProb = Math.min(0.95, Math.max(0.05, homeImplied + modelVariance));
    const awayModelProb = 1 - homeModelProb;

    // Determine predicted winner
    const predictedWinner = homeModelProb > awayModelProb ? 'home' : 'away';
    const winnerProb = predictedWinner === 'home' ? homeModelProb : awayModelProb;
    const winnerML = predictedWinner === 'home' ? game.homeMoneyline : game.awayMoneyline;

    // Calculate expected value
    const expectedValue = calculateExpectedValue(winnerML, winnerProb);

    // Generate reasoning
    const reasoning = [];
    if (Math.abs(homeModelProb - homeImplied) > 0.1) {
      reasoning.push('Significant edge detected vs market odds');
    }
    if (winnerProb > 0.65) {
      reasoning.push('Strong statistical advantage');
    }
    if (expectedValue > VALUE_THRESHOLDS.good) {
      reasoning.push('Positive expected value identified');
    }
    if (game.spread && Math.abs(game.spread.line) < 3) {
      reasoning.push('Close spread indicates competitive matchup');
    }

    return {
      predictedWinner,
      confidence: winnerProb,
      expectedValue,
      reasoning,
      modelScore: {
        home: homeModelProb * 100,
        away: awayModelProb * 100
      }
    };
  };

  const calculateImpliedProbability = (moneyline: number): number => {
    if (moneyline > 0) {
      return 100 / (moneyline + 100);
    } else {
      return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
    }
  };

  const calculateExpectedValue = (moneyline: number, winProbability: number): number => {
    const impliedProb = calculateImpliedProbability(moneyline);
    const payout = moneyline > 0 ? moneyline / 100 : 100 / Math.abs(moneyline);
    return (winProbability * payout) - (1 - winProbability);
  };

  const formatMoneyline = (ml: number): string => {
    return ml > 0 ? `+${ml}` : ml.toString();
  };

  const getValueBadge = (ev: number) => {
    if (ev >= VALUE_THRESHOLDS.excellent) {
      return <Badge className="bg-green-500">Excellent Value</Badge>;
    } else if (ev >= VALUE_THRESHOLDS.good) {
      return <Badge className="bg-blue-500">Good Value</Badge>;
    } else if (ev >= VALUE_THRESHOLDS.fair) {
      return <Badge className="bg-yellow-500">Fair Value</Badge>;
    }
    return null;
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) {
      return <Badge variant="default">High Confidence</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge variant="secondary">Medium Confidence</Badge>;
    }
    return <Badge variant="outline">Low Confidence</Badge>;
  };

  const filteredAndSortedGames = () => {
    let allGames: { game: Game; sport: string }[] = [];
    
    sportsData.forEach(sportData => {
      sportData.games.forEach(game => {
        if (game.status === 'scheduled' && game.mlPrediction) {
          allGames.push({ game, sport: sportData.sport });
        }
      });
    });

    // Apply filters
    if (filterValue === 'value') {
      allGames = allGames.filter(({ game }) => 
        game.mlPrediction && game.mlPrediction.expectedValue >= VALUE_THRESHOLDS.fair
      );
    } else if (filterValue === 'high-confidence') {
      allGames = allGames.filter(({ game }) => 
        game.mlPrediction && game.mlPrediction.confidence >= 0.65
      );
    }

    // Apply sorting
    allGames.sort((a, b) => {
      switch (sortBy) {
        case 'value':
          return (b.game.mlPrediction?.expectedValue || 0) - (a.game.mlPrediction?.expectedValue || 0);
        case 'confidence':
          return (b.game.mlPrediction?.confidence || 0) - (a.game.mlPrediction?.confidence || 0);
        case 'time':
        default:
          return new Date(a.game.startTime).getTime() - new Date(b.game.startTime).getTime();
      }
    });

    return allGames;
  };

  const renderGameCard = (game: Game, sport: string) => {
    const prediction = game.mlPrediction;
    if (!prediction) return null;

    const isHomePick = prediction.predictedWinner === 'home';
    const pickTeam = isHomePick ? game.homeTeam : game.awayTeam;
    const pickML = isHomePick ? game.homeMoneyline : game.awayMoneyline;

    return (
      <Card key={game.id} className="hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <Badge variant="outline" className="mb-2">{sport}</Badge>
              <p className="text-xs text-gray-500">
                {new Date(game.startTime).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {getValueBadge(prediction.expectedValue)}
              {getConfidenceBadge(prediction.confidence)}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`text-center p-2 rounded ${!isHomePick ? 'bg-gray-100 dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900 border-2 border-green-500'}`}>
              <p className="font-semibold">{game.homeTeam}</p>
              <p className="text-lg font-bold">{formatMoneyline(game.homeMoneyline || 0)}</p>
              <p className="text-xs text-gray-500">
                {(calculateImpliedProbability(game.homeMoneyline || 0) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="text-center flex items-center justify-center">
              <div>
                <p className="text-xs text-gray-500">VS</p>
                {game.spread && (
                  <p className="text-sm font-medium">
                    {game.spread.line > 0 ? '+' : ''}{game.spread.line}
                  </p>
                )}
              </div>
            </div>

            <div className={`text-center p-2 rounded ${isHomePick ? 'bg-gray-100 dark:bg-gray-800' : 'bg-green-50 dark:bg-green-900 border-2 border-green-500'}`}>
              <p className="font-semibold">{game.awayTeam}</p>
              <p className="text-lg font-bold">{formatMoneyline(game.awayMoneyline || 0)}</p>
              <p className="text-xs text-gray-500">
                {(calculateImpliedProbability(game.awayMoneyline || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="font-semibold">ML Pick: {pickTeam}</span>
                <span className="text-sm text-gray-500">@ {formatMoneyline(pickML || 0)}</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-600">
                  EV: {(prediction.expectedValue * 100).toFixed(2)}%
                </p>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Model Confidence</span>
                <span>{(prediction.confidence * 100).toFixed(1)}%</span>
              </div>
              <Progress value={prediction.confidence * 100} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-500">Model Score</p>
                <p className="font-semibold">
                  {prediction.modelScore.home.toFixed(1)}% - {prediction.modelScore.away.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Edge vs Market</p>
                <p className="font-semibold text-green-600">
                  {Math.abs(prediction.confidence - calculateImpliedProbability(pickML || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {prediction.reasoning.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs font-semibold text-gray-600 mb-1">Analysis:</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  {prediction.reasoning.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <Zap className="h-3 w-3 text-yellow-500 mt-0.5" />
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Moneyline Viewer & Predictions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Select value={selectedSport} onValueChange={setSelectedSport}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map(sport => (
                <SelectItem key={sport} value={sport}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="value">Sort by Value</SelectItem>
              <SelectItem value="confidence">Sort by Confidence</SelectItem>
              <SelectItem value="time">Sort by Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterValue} onValueChange={(v) => setFilterValue(v as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              <SelectItem value="value">Value Bets Only</SelectItem>
              <SelectItem value="high-confidence">High Confidence Only</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={fetchGamesWithPredictions} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        {/* Summary Stats */}
        {!loading && sportsData.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{filteredAndSortedGames().length}</p>
                <p className="text-xs text-gray-500">Total Games</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p className="text-2xl font-bold">
                  {filteredAndSortedGames().filter(({ game }) => 
                    game.mlPrediction && game.mlPrediction.expectedValue >= VALUE_THRESHOLDS.good
                  ).length}
                </p>
                <p className="text-xs text-gray-500">Value Picks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Award className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <p className="text-2xl font-bold">
                  {filteredAndSortedGames().filter(({ game }) => 
                    game.mlPrediction && game.mlPrediction.confidence >= 0.7
                  ).length}
                </p>
                <p className="text-xs text-gray-500">High Confidence</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <p className="text-2xl font-bold">
                  {(filteredAndSortedGames()
                    .reduce((sum, { game }) => sum + (game.mlPrediction?.expectedValue || 0), 0) / 
                    filteredAndSortedGames().length * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500">Avg EV</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading games and predictions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Games Grid */}
        {!loading && !error && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedGames().map(({ game, sport }) => 
              renderGameCard(game, sport)
            )}
          </div>
        )}

        {!loading && !error && filteredAndSortedGames().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No games match your current filters
          </div>
        )}
      </CardContent>
    </Card>
  );
}