import { NextRequest, NextResponse } from 'next/server';
import { getAllSportsGames, getSportGames } from '@/services/sportsDataService';

// Get games for all sports or specific sport
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const includeCompleted = searchParams.get('includeCompleted') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const days = parseInt(searchParams.get('days') || '1'); // Default to 1 day
    const fromDate = searchParams.get('from_date'); // Allow custom date range
    const toDate = searchParams.get('to_date');

    let sportsData;

    if (sport && sport !== 'all') {
      // Get games for specific sport
      const sportData = await getSportGames(sport);
      sportsData = [sportData];
    } else {
      // Get games for all sports
      sportsData = await getAllSportsGames();
    }

    // Filter games by date range
    const now = new Date();
    let startDate: Date, endDate: Date;

    if (fromDate && toDate) {
      startDate = new Date(fromDate);
      endDate = new Date(toDate);
    } else {
      startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    sportsData = sportsData.map(sportData => ({
      ...sportData,
      games: sportData.games.filter(game => {
        const gameDate = new Date(game.startTime);
        const isInDateRange = gameDate >= startDate && gameDate <= endDate;
        const statusFilter = includeCompleted ? true : 
          (game.status === 'scheduled' || game.status === 'in_progress');
        return isInDateRange && statusFilter;
      })
    }));

    // Apply limit if specified
    if (limit > 0) {
      sportsData = sportsData.map(sportData => ({
        ...sportData,
        games: sportData.games.slice(0, limit)
      }));
    }

    // Calculate summary statistics
    const totalGames = sportsData.reduce((sum, sport) => sum + sport.games.length, 0);
    const liveGames = sportsData.reduce((sum, sport) => 
      sum + sport.games.filter(g => g.status === 'in_progress').length, 0
    );
    const scheduledGames = sportsData.reduce((sum, sport) => 
      sum + sport.games.filter(g => g.status === 'scheduled').length, 0
    );
    const completedGames = sportsData.reduce((sum, sport) => 
      sum + sport.games.filter(g => g.status === 'completed').length, 0
    );

    // Count games with moneylines (betting opportunities)
    const gamesWithMoneylines = sportsData.reduce((sum, sport) => 
      sum + sport.games.filter(g => g.homeMoneyline && g.awayMoneyline).length, 0
    );

    const summary = {
      totalSports: sportsData.length,
      totalGames,
      liveGames,
      scheduledGames,
      completedGames,
      gamesWithMoneylines,
      lastUpdated: new Date().toISOString(),
      filters: {
        sport: sport || 'all',
        includeCompleted,
        limit: limit > 0 ? limit : 'none'
      }
    };

    return NextResponse.json({
      summary,
      sports: sportsData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('All Games API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch games',
        summary: {
          totalSports: 0,
          totalGames: 0,
          liveGames: 0,
          scheduledGames: 0,
          completedGames: 0,
          gamesWithMoneylines: 0
        },
        sports: []
      },
      { status: 500 }
    );
  }
}

// Get live games only
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sports, action } = body;

    if (action === 'live') {
      // Get only live/in-progress games
      const sportsToFetch = sports || Object.keys(await getAllSportsGames());
      const allSportsData = await getAllSportsGames();
      
      const liveData = allSportsData
        .filter(sportData => !sports || sports.includes(sportData.sport.toLowerCase()))
        .map(sportData => ({
          ...sportData,
          games: sportData.games.filter(game => game.status === 'in_progress')
        }))
        .filter(sportData => sportData.games.length > 0);

      return NextResponse.json({
        action: 'live',
        sportsCount: liveData.length,
        totalLiveGames: liveData.reduce((sum, sport) => sum + sport.games.length, 0),
        sports: liveData,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'moneylines') {
      // Get games with moneylines for betting analysis
      const allSportsData = await getAllSportsGames();
      
      const bettingData = allSportsData
        .map(sportData => ({
          ...sportData,
          games: sportData.games.filter(game => 
            (game.status === 'scheduled' || game.status === 'in_progress') &&
            game.homeMoneyline && 
            game.awayMoneyline
          )
        }))
        .filter(sportData => sportData.games.length > 0);

      // Add value betting analysis
      const valueBets = [];
      bettingData.forEach(sportData => {
        sportData.games.forEach(game => {
          if (game.homeMoneyline && game.awayMoneyline) {
            const homeImplied = game.homeMoneyline > 0 
              ? 100 / (game.homeMoneyline + 100)
              : Math.abs(game.homeMoneyline) / (Math.abs(game.homeMoneyline) + 100);
            
            const awayImplied = game.awayMoneyline > 0 
              ? 100 / (game.awayMoneyline + 100)
              : Math.abs(game.awayMoneyline) / (Math.abs(game.awayMoneyline) + 100);

            // Simple value detection (in real implementation, would use ML models)
            const totalImplied = homeImplied + awayImplied;
            if (totalImplied < 0.95) { // Market inefficiency detected
              valueBets.push({
                gameId: game.id,
                sport: sportData.sport,
                homeTeam: game.homeTeam,
                awayTeam: game.awayTeam,
                startTime: game.startTime,
                homeMoneyline: game.homeMoneyline,
                awayMoneyline: game.awayMoneyline,
                marketGap: (1 - totalImplied) * 100,
                suggestedBet: homeImplied < awayImplied ? 'away' : 'home'
              });
            }
          }
        });
      });

      return NextResponse.json({
        action: 'moneylines',
        sportsCount: bettingData.length,
        totalBettingGames: bettingData.reduce((sum, sport) => sum + sport.games.length, 0),
        valueBetsFound: valueBets.length,
        sports: bettingData,
        valueBets: valueBets.sort((a, b) => b.marketGap - a.marketGap).slice(0, 10),
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "live" or "moneylines"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('All Games POST API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Request failed'
      },
      { status: 500 }
    );
  }
}