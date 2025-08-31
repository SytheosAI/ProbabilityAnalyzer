/**
 * Live Games API - Direct Sports Radar Integration
 * Fetches live game data directly from Sports Radar API
 * No database dependency - pure live data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllSportsGames, getGameOdds, getTeamStatistics, getInjuries } from '@/services/sportsRadarApi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const includeOdds = searchParams.get('includeOdds') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';
    
    console.log('Fetching live games...', { sport, includeOdds, includeStats });
    
    // Fetch all live games
    const sportsData = await getAllSportsGames();
    console.log('Raw sports data:', sportsData);
    
    // Filter by sport if specified
    const filteredData = sport 
      ? sportsData.filter(s => s.sport.toLowerCase() === sport.toLowerCase())
      : sportsData;
    
    // Enhance with odds and stats if requested
    if (includeOdds || includeStats) {
      for (const sportData of filteredData) {
        for (const game of sportData.games) {
          try {
            if (includeOdds) {
              const odds = await getGameOdds(sportData.sport.toLowerCase(), game.id);
              game.odds = odds;
            }
            
            if (includeStats && game.home_team?.id && game.away_team?.id) {
              const [homeStats, awayStats] = await Promise.all([
                getTeamStatistics(sportData.sport.toLowerCase(), game.home_team.id),
                getTeamStatistics(sportData.sport.toLowerCase(), game.away_team.id)
              ]);
              game.home_team_stats = homeStats;
              game.away_team_stats = awayStats;
            }
          } catch (error) {
            console.warn(`Failed to fetch additional data for game ${game.id}:`, error);
          }
        }
      }
    }
    
    // Calculate summary statistics
    const totalGames = filteredData.reduce((sum, sport) => sum + sport.games.length, 0);
    const sportBreakdown = filteredData.map(s => ({
      sport: s.sport,
      games: s.games.length
    }));
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total_games: totalGames,
        sports_active: filteredData.length,
        breakdown: sportBreakdown
      },
      data: filteredData,
      message: totalGames > 0 
        ? `Found ${totalGames} live games across ${filteredData.length} sports`
        : 'No live games available at this time'
    });
    
  } catch (error) {
    console.error('Live games API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch live games',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for analyzing specific games
 */
export async function POST(request: NextRequest) {
  try {
    const { gameId, sport, analysisType } = await request.json();
    
    if (!gameId || !sport) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameters: gameId and sport'
        },
        { status: 400 }
      );
    }
    
    // Fetch game odds
    const odds = await getGameOdds(sport.toLowerCase(), gameId);
    
    // Fetch injury reports for the sport
    const injuries = await getInjuries(sport.toLowerCase());
    
    // Simple probability calculation based on odds
    let analysis = {
      game_id: gameId,
      sport: sport,
      odds: odds,
      injuries: injuries,
      predictions: {}
    };
    
    if (odds?.markets) {
      const moneylineMarket = odds.markets.find(m => m.name === 'moneyline');
      if (moneylineMarket?.books?.[0]?.outcomes) {
        const outcomes = moneylineMarket.books[0].outcomes;
        const homeOdds = outcomes.find(o => o.type === 'home');
        const awayOdds = outcomes.find(o => o.type === 'away');
        
        if (homeOdds && awayOdds) {
          const homeImplied = calculateImpliedProbability(parseInt(homeOdds.odds.american));
          const awayImplied = calculateImpliedProbability(parseInt(awayOdds.odds.american));
          
          analysis.predictions = {
            moneyline: {
              home_probability: homeImplied,
              away_probability: awayImplied,
              suggested_pick: homeImplied > awayImplied ? 'home' : 'away',
              confidence: Math.abs(homeImplied - awayImplied),
              value_rating: calculateValueRating(homeImplied, awayImplied)
            }
          };
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Game analysis error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to analyze game',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

function calculateValueRating(homeProb: number, awayProb: number): number {
  const totalImplied = homeProb + awayProb;
  const juice = totalImplied - 1;
  
  // Lower juice = better value
  if (juice < 0.05) return 5; // Excellent value
  if (juice < 0.08) return 4; // Good value
  if (juice < 0.12) return 3; // Average value
  if (juice < 0.15) return 2; // Below average
  return 1; // Poor value
}