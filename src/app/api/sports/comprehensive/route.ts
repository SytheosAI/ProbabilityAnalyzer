// Comprehensive Sports API
// Returns all sports data with games, statistics, and predictions

import { NextRequest, NextResponse } from 'next/server';
import { getAllSportsGames } from '@/services/sportsDataService';
import { getSportPredictions, getBestBetsAllSports } from '@/services/predictionsService';
import { getTopPlayers } from '@/services/playerStatsService';
import { getLeagueStandings } from '@/services/teamStatsService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePredictions = searchParams.get('predictions') !== 'false';
    const includeStats = searchParams.get('stats') !== 'false';
    const sport = searchParams.get('sport'); // Optional filter for specific sport
    
    console.log('Fetching comprehensive sports data...');
    
    // Fetch all sports games
    const allSportsData = await getAllSportsGames();
    
    // Filter by sport if specified
    const sportsData = sport 
      ? allSportsData.filter(s => s.sport.toLowerCase() === sport.toLowerCase())
      : allSportsData;
    
    // Build comprehensive response
    const comprehensiveData = await Promise.all(
      sportsData.map(async (sportData) => {
        const result: any = {
          sport: sportData.sport,
          games: sportData.games,
          gameCount: sportData.games.length,
          liveGames: sportData.games.filter(g => g.status === 'in_progress').length,
          upcomingGames: sportData.games.filter(g => g.status === 'scheduled').length,
          dataSource: sportData.dataSource,
          lastUpdated: sportData.lastUpdated
        };
        
        // Add predictions if requested
        if (includePredictions && sportData.games.length > 0) {
          try {
            const predictions = await getSportPredictions(sportData.sport.toLowerCase());
            result.predictions = {
              available: predictions.games.length > 0,
              gameCount: predictions.games.length,
              topPicks: predictions.topPicks.slice(0, 3),
              modelAccuracy: predictions.modelAccuracy
            };
          } catch (error) {
            console.error(`Error fetching predictions for ${sportData.sport}:`, error);
            result.predictions = { available: false, error: 'Failed to fetch predictions' };
          }
        }
        
        // Add stats if requested
        if (includeStats) {
          try {
            // Get top players
            const topPlayers = await getTopPlayers(sportData.sport.toLowerCase(), 'overall', 5);
            result.topPlayers = topPlayers.map(p => ({
              name: p.name,
              team: p.team,
              position: p.position,
              keyStats: p.stats
            }));
            
            // Get standings (for team sports)
            if (!['tennis', 'golf', 'ufc', 'boxing'].includes(sportData.sport.toLowerCase())) {
              const standings = await getLeagueStandings(sportData.sport.toLowerCase());
              result.standings = {
                available: !!standings,
                topTeams: standings?.standings?.slice(0, 5) || []
              };
            }
          } catch (error) {
            console.error(`Error fetching stats for ${sportData.sport}:`, error);
            result.stats = { available: false, error: 'Failed to fetch statistics' };
          }
        }
        
        return result;
      })
    );
    
    // Get best bets across all sports
    let bestBets = [];
    if (includePredictions) {
      try {
        bestBets = await getBestBetsAllSports();
      } catch (error) {
        console.error('Error fetching best bets:', error);
      }
    }
    
    // Calculate summary statistics
    const summary = {
      totalSports: comprehensiveData.length,
      totalGames: comprehensiveData.reduce((sum, s) => sum + s.gameCount, 0),
      liveGames: comprehensiveData.reduce((sum, s) => sum + s.liveGames, 0),
      upcomingGames: comprehensiveData.reduce((sum, s) => sum + s.upcomingGames, 0),
      sportsWithData: comprehensiveData.filter(s => s.gameCount > 0).length,
      sportsWithPredictions: comprehensiveData.filter(s => s.predictions?.available).length,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      success: true,
      summary,
      sports: comprehensiveData,
      bestBets: bestBets.slice(0, 10),
      features: {
        allSportsActive: true,
        predictionsEnabled: includePredictions,
        statisticsEnabled: includeStats,
        realTimeData: true,
        mlModelsActive: true
      }
    });
    
  } catch (error) {
    console.error('Comprehensive API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch comprehensive sports data',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Get predictions for specific games
export async function POST(request: NextRequest) {
  try {
    const { sport, gameIds } = await request.json();
    
    if (!sport || !gameIds || !Array.isArray(gameIds)) {
      return NextResponse.json(
        { error: 'Invalid request. Provide sport and gameIds array.' },
        { status: 400 }
      );
    }
    
    // Get sport data
    const sportsData = await getAllSportsGames();
    const sportData = sportsData.find(s => s.sport.toLowerCase() === sport.toLowerCase());
    
    if (!sportData) {
      return NextResponse.json(
        { error: `Sport ${sport} not found` },
        { status: 404 }
      );
    }
    
    // Get games by IDs
    const games = sportData.games.filter(g => gameIds.includes(g.id));
    
    if (games.length === 0) {
      return NextResponse.json(
        { error: 'No games found with provided IDs' },
        { status: 404 }
      );
    }
    
    // Generate predictions for each game
    const { getGamePrediction } = await import('@/services/predictionsService');
    const predictions = await Promise.all(
      games.map(game => getGamePrediction(sport, game))
    );
    
    return NextResponse.json({
      success: true,
      sport,
      predictions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Prediction API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate predictions'
      },
      { status: 500 }
    );
  }
}