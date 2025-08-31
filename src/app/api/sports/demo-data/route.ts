// Fallback demo data API for when live APIs are unavailable
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // DISABLED - No more fake demo data
  return NextResponse.json({
    success: false,
    error: 'Demo data endpoint permanently disabled',
    message: 'Use real Sports Radar API only - no more fake games'
  }, { status: 410 });
  
  try {
    // OLD FAKE DATA BELOW - DISABLED
    const demoGames = [
      {
        id: 'demo_nba_1',
        sport: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Boston Celtics',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.67,
          confidence: 0.85,
          expectedValue: 12.5,
          recommendation: 'Strong Value on Lakers ML'
        },
        odds: {
          homeML: -150,
          awayML: 130,
          spread: -3.5,
          total: 225.5
        }
      },
      {
        id: 'demo_nfl_1',
        sport: 'NFL',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'Buffalo Bills',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.58,
          confidence: 0.72,
          expectedValue: 8.3,
          recommendation: 'Moderate Value on Chiefs'
        },
        odds: {
          homeML: -110,
          awayML: -110,
          spread: -2.5,
          total: 52.5
        }
      },
      {
        id: 'demo_mlb_1',
        sport: 'MLB',
        homeTeam: 'New York Yankees',
        awayTeam: 'Houston Astros',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.61,
          confidence: 0.78,
          expectedValue: 15.2,
          recommendation: 'High Value on Yankees ML'
        },
        odds: {
          homeML: -125,
          awayML: 105,
          spread: -1.5,
          total: 8.5
        }
      },
      {
        id: 'demo_nhl_1',
        sport: 'NHL',
        homeTeam: 'Tampa Bay Lightning',
        awayTeam: 'Colorado Avalanche',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 14400000).toISOString(), // 4 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.54,
          confidence: 0.69,
          expectedValue: 6.7,
          recommendation: 'Fair Value - Consider Props'
        },
        odds: {
          homeML: -105,
          awayML: -115,
          spread: 0,
          total: 6.5
        }
      },
      {
        id: 'demo_ncaab_1',
        sport: 'NCAAB',
        homeTeam: 'Duke Blue Devils',
        awayTeam: 'North Carolina Tar Heels',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 18000000).toISOString(), // 5 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.73,
          confidence: 0.91,
          expectedValue: 18.9,
          recommendation: 'Excellent Value on Duke'
        },
        odds: {
          homeML: -180,
          awayML: 155,
          spread: -4.5,
          total: 142.5
        }
      },
      {
        id: 'demo_soccer_1',
        sport: 'SOCCER',
        homeTeam: 'Manchester City',
        awayTeam: 'Liverpool',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 21600000).toISOString(), // 6 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.49,
          confidence: 0.66,
          expectedValue: 4.1,
          recommendation: 'Slight Edge on Draw'
        },
        odds: {
          homeML: 180,
          awayML: 165,
          draw: 210,
          total: 2.5
        }
      },
      {
        id: 'demo_tennis_1',
        sport: 'TENNIS',
        homeTeam: 'Novak Djokovic',
        awayTeam: 'Rafael Nadal',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 25200000).toISOString(), // 7 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.64,
          confidence: 0.87,
          expectedValue: 13.7,
          recommendation: 'Strong Value on Djokovic'
        },
        odds: {
          homeML: -140,
          awayML: 120,
          sets: 3.5,
          games: 22.5
        }
      },
      {
        id: 'demo_wnba_1',
        sport: 'WNBA',
        homeTeam: 'Las Vegas Aces',
        awayTeam: 'New York Liberty',
        homeScore: null,
        awayScore: null,
        scheduled: new Date(Date.now() + 28800000).toISOString(), // 8 hours from now
        status: 'scheduled',
        predictions: {
          homeWinProbability: 0.71,
          confidence: 0.83,
          expectedValue: 16.4,
          recommendation: 'High Value on Aces'
        },
        odds: {
          homeML: -165,
          awayML: 145,
          spread: -3.5,
          total: 165.5
        }
      }
    ];

    // Calculate demo stats
    const stats = {
      totalGames: demoGames.length,
      liveGames: 0,
      sportsActive: 8,
      predictionsGenerated: demoGames.length * 4, // 4 models per game
      avgConfidence: demoGames.reduce((sum, game) => sum + game.predictions.confidence, 0) / demoGames.length,
      valueBetsFound: demoGames.filter(g => g.predictions.expectedValue > 10).length,
      arbitrageOpportunities: 2,
      topValueBets: demoGames
        .sort((a, b) => b.predictions.expectedValue - a.predictions.expectedValue)
        .slice(0, 3)
        .map(g => ({
          game: `${g.awayTeam} @ ${g.homeTeam}`,
          expectedValue: g.predictions.expectedValue,
          sport: g.sport
        }))
    };

    return NextResponse.json({
      success: true,
      data: {
        games: demoGames,
        stats: stats,
        message: 'Demo data - Live APIs currently unavailable',
        dataSource: 'demo'
      }
    });

  } catch (error) {
    console.error('Demo data API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate demo data'
    }, { status: 500 });
  }
}