/**
 * Live Sports Data API Route
 * Fetches real-time data from all 8 sports with predictions and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllSportsGames, 
  getSportGames, 
  getTeamStatistics,
  getOddsComparison,
  SportType,
  UniversalGame
} from '@/services/comprehensiveSportsApi';
import { generatePrediction, PredictionResult } from '@/services/predictionEngine';
import { calculateValueBets, findArbitrageOpportunities } from '@/services/valueBettingCalculator';
import { findOptimalParlays } from '@/services/parlayAnalyzer';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') as SportType | null;
    const date = searchParams.get('date');
    const includeAnalysis = searchParams.get('analysis') === 'true';
    const includeParlays = searchParams.get('parlays') === 'true';
    
    // Fetch games
    const targetDate = date ? new Date(date) : new Date();
    const games = sport 
      ? await getSportGames(sport, targetDate)
      : await getAllSportsGames(targetDate);
    
    // Process games with analysis if requested
    let processedGames = games;
    const predictions = new Map<string, PredictionResult>();
    const valueBets: any[] = [];
    const arbitrageOpportunities: any[] = [];
    
    if (includeAnalysis && games.length > 0) {
      // Limit analysis to first 20 games for performance
      const gamesToAnalyze = games.slice(0, 20);
      
      for (const game of gamesToAnalyze) {
        try {
          // Skip if game is already finished
          if (game.status === 'final') continue;
          
          // Fetch team statistics
          const [homeStats, awayStats] = await Promise.all([
            getTeamStatistics(game.sport, game.homeTeam.id),
            getTeamStatistics(game.sport, game.awayTeam.id)
          ]);
          
          // Generate prediction
          const prediction = await generatePrediction(
            game,
            homeStats,
            awayStats
          );
          
          predictions.set(game.id, prediction);
          
          // Try to get odds and calculate value bets
          try {
            const odds = await getOddsComparison(game.sport, game.id);
            
            if (odds) {
              // Calculate value bets
              const gameValueBets = calculateValueBets(prediction, odds, game);
              valueBets.push(...gameValueBets);
              
              // Find arbitrage opportunities
              const arbOps = findArbitrageOpportunities(odds, game);
              arbitrageOpportunities.push(...arbOps);
            }
          } catch (oddsError) {
            console.log(`No odds available for game ${game.id}`);
          }
          
          // Add prediction to game object
          (game as any).prediction = {
            homeWinProb: prediction.ensemble.homeWinProb,
            awayWinProb: prediction.ensemble.awayWinProb,
            expectedTotal: prediction.ensemble.expectedTotal,
            expectedSpread: prediction.ensemble.expectedSpread,
            confidence: prediction.ensemble.confidence,
            insights: prediction.insights,
            warnings: prediction.warnings
          };
        } catch (analysisError) {
          console.error(`Error analyzing game ${game.id}:`, analysisError);
        }
      }
    }
    
    // Find optimal parlays if requested
    let optimalParlays = null;
    if (includeParlays && predictions.size > 0) {
      try {
        optimalParlays = await findOptimalParlays(
          games.slice(0, 20),
          predictions,
          'balanced'
        );
      } catch (parlayError) {
        console.error('Error finding optimal parlays:', parlayError);
      }
    }
    
    // Sort value bets by expected value
    valueBets.sort((a, b) => b.expectedValue - a.expectedValue);
    
    // Calculate summary statistics
    const stats = {
      totalGames: games.length,
      liveGames: games.filter(g => g.status === 'live').length,
      upcomingGames: games.filter(g => g.status === 'scheduled').length,
      sportsActive: [...new Set(games.map(g => g.sport))].length,
      predictionsGenerated: predictions.size,
      valueBetsFound: valueBets.length,
      arbitrageOpportunities: arbitrageOpportunities.length,
      avgConfidence: predictions.size > 0 
        ? Array.from(predictions.values()).reduce((sum, p) => sum + p.ensemble.confidence, 0) / predictions.size
        : 0,
      topValueBets: valueBets.slice(0, 5),
      bestArbitrage: arbitrageOpportunities.sort((a, b) => b.profitPercentage - a.profitPercentage)[0]
    };
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        games: processedGames,
        stats,
        valueBets: valueBets.slice(0, 20), // Top 20 value bets
        arbitrage: arbitrageOpportunities.slice(0, 5), // Top 5 arbitrage
        parlays: optimalParlays
      }
    });
  } catch (error) {
    console.error('Live data API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch live sports data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameId, sport, action } = body;
    
    if (!gameId || !sport) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    switch (action) {
      case 'analyze': {
        // Deep analysis of a specific game
        const games = await getSportGames(sport as SportType);
        const game = games.find(g => g.id === gameId);
        
        if (!game) {
          return NextResponse.json(
            { success: false, error: 'Game not found' },
            { status: 404 }
          );
        }
        
        // Fetch detailed statistics
        const [homeStats, awayStats] = await Promise.all([
          getTeamStatistics(sport as SportType, game.homeTeam.id),
          getTeamStatistics(sport as SportType, game.awayTeam.id)
        ]);
        
        // Generate comprehensive prediction
        const prediction = await generatePrediction(
          game,
          homeStats,
          awayStats
        );
        
        // Get odds if available
        let valueBets = [];
        let arbitrage = [];
        
        try {
          const odds = await getOddsComparison(sport as SportType, gameId);
          valueBets = calculateValueBets(prediction, odds, game);
          arbitrage = findArbitrageOpportunities(odds, game);
        } catch (oddsError) {
          console.log('No odds available');
        }
        
        return NextResponse.json({
          success: true,
          data: {
            game,
            homeStats,
            awayStats,
            prediction,
            valueBets,
            arbitrage
          }
        });
      }
      
      case 'refresh': {
        // Refresh data for a specific game
        const games = await getSportGames(sport as SportType);
        const game = games.find(g => g.id === gameId);
        
        return NextResponse.json({
          success: true,
          data: { game }
        });
      }
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Live data POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process request',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}