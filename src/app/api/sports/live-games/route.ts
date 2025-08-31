// Live Games API with 1, 3, 5 day filtering
import { NextRequest, NextResponse } from 'next/server';
import { LiveSportsAPI } from '@/services/liveSportsApi';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const daysParam = searchParams.get('days');
    const days = daysParam ? parseInt(daysParam) : 5;
    
    // Validate days parameter
    if (![1, 3, 5].includes(days)) {
      return NextResponse.json({
        success: false,
        error: 'Days parameter must be 1, 3, or 5'
      }, { status: 400 });
    }

    console.log(`🎯 Fetching games for next ${days} days...`);

    const api = LiveSportsAPI.getInstance();
    
    // Get all games for 5 days, then filter
    const allGames = await api.getLiveGames(5);
    const filteredGames = api.filterGamesByDays(allGames, days as 1 | 3 | 5);
    
    // Calculate stats
    const stats = api.getGameStats(filteredGames);

    // Group games by date for better organization
    const gamesByDate: { [date: string]: any[] } = {};
    filteredGames.forEach(game => {
      const dateKey = new Date(game.scheduled).toDateString();
      if (!gamesByDate[dateKey]) {
        gamesByDate[dateKey] = [];
      }
      gamesByDate[dateKey].push(game);
    });

    // Add betting analysis
    const bettingAnalysis = {
      totalBets: filteredGames.length,
      valueBets: filteredGames.filter(g => g.predictions && g.predictions.expectedValue > 8),
      highConfidenceBets: filteredGames.filter(g => g.predictions && g.predictions.confidence > 0.75),
      liveBets: filteredGames.filter(g => g.status === 'live'),
      bestParlayOpportunities: findBestParlays(filteredGames)
    };

    return NextResponse.json({
      success: true,
      data: {
        games: filteredGames,
        gamesByDate,
        stats,
        bettingAnalysis,
        filters: {
          daysAhead: days,
          totalGames: filteredGames.length,
          dateRange: {
            from: new Date().toISOString().split('T')[0],
            to: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }
        }
      },
      message: `Live sports data for next ${days} days`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Live games API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch live games',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Find best parlay opportunities
function findBestParlays(games: any[]) {
  const highConfidenceGames = games.filter(g => 
    g.predictions && 
    g.predictions.confidence > 0.7 && 
    g.predictions.expectedValue > 5
  );

  if (highConfidenceGames.length < 2) return [];

  // Generate 2-3 leg parlays
  const parlays = [];
  for (let i = 0; i < Math.min(3, highConfidenceGames.length - 1); i++) {
    for (let j = i + 1; j < Math.min(i + 3, highConfidenceGames.length); j++) {
      const game1 = highConfidenceGames[i];
      const game2 = highConfidenceGames[j];
      
      const combinedProb = (game1.predictions.homeWinProb * game2.predictions.homeWinProb);
      const combinedOdds = Math.abs(game1.odds.homeML || -110) + Math.abs(game2.odds.homeML || -110);
      
      parlays.push({
        legs: [
          {
            game: `${game1.awayTeam} @ ${game1.homeTeam}`,
            pick: `${game1.homeTeam} ML`,
            odds: game1.odds.homeML,
            sport: game1.sport
          },
          {
            game: `${game2.awayTeam} @ ${game2.homeTeam}`,
            pick: `${game2.homeTeam} ML`,
            odds: game2.odds.homeML,
            sport: game2.sport
          }
        ],
        combinedOdds: `+${Math.round(combinedOdds * 2.5)}`,
        probability: combinedProb,
        expectedValue: (combinedProb * combinedOdds * 0.025) - (1 - combinedProb) * 100,
        confidence: (game1.predictions.confidence + game2.predictions.confidence) / 2,
        recommendation: combinedProb > 0.4 ? 'Strong Parlay Value' : 'Moderate Risk'
      });
    }
  }

  return parlays.slice(0, 5); // Top 5 parlays
}