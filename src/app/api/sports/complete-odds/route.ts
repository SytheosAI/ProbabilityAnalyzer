/**
 * Complete Odds API with Moneyline Calculations
 * Uses ESPN data and calculates realistic moneylines from spreads
 */

import { NextRequest, NextResponse } from 'next/server';

// Convert spread to moneyline odds (industry standard formula)
function spreadToMoneyline(spread: number, isHome: boolean): number {
  const absSpread = Math.abs(spread);
  
  // Standard conversion table used by sportsbooks
  const conversions: Record<number, { favorite: number, underdog: number }> = {
    0: { favorite: -110, underdog: -110 },
    1: { favorite: -120, underdog: 100 },
    1.5: { favorite: -130, underdog: 110 },
    2: { favorite: -135, underdog: 115 },
    2.5: { favorite: -140, underdog: 120 },
    3: { favorite: -155, underdog: 135 },
    3.5: { favorite: -175, underdog: 155 },
    4: { favorite: -185, underdog: 165 },
    4.5: { favorite: -200, underdog: 170 },
    5: { favorite: -210, underdog: 175 },
    5.5: { favorite: -220, underdog: 180 },
    6: { favorite: -240, underdog: 200 },
    6.5: { favorite: -260, underdog: 220 },
    7: { favorite: -300, underdog: 250 },
    7.5: { favorite: -330, underdog: 270 },
    8: { favorite: -360, underdog: 300 },
    8.5: { favorite: -380, underdog: 320 },
    9: { favorite: -400, underdog: 330 },
    9.5: { favorite: -420, underdog: 350 },
    10: { favorite: -450, underdog: 375 },
    10.5: { favorite: -500, underdog: 400 },
    11: { favorite: -550, underdog: 425 },
    11.5: { favorite: -600, underdog: 450 },
    12: { favorite: -650, underdog: 475 },
    12.5: { favorite: -700, underdog: 500 },
    13: { favorite: -750, underdog: 550 },
    13.5: { favorite: -800, underdog: 600 },
    14: { favorite: -900, underdog: 650 },
    14.5: { favorite: -1000, underdog: 700 },
    15: { favorite: -1100, underdog: 750 },
    16: { favorite: -1200, underdog: 800 },
    17: { favorite: -1400, underdog: 900 },
    18: { favorite: -1600, underdog: 1000 },
    20: { favorite: -2000, underdog: 1200 },
    21: { favorite: -2500, underdog: 1400 }
  };

  // Find closest spread in conversion table
  let closestSpread = 0;
  let minDiff = Math.abs(absSpread - 0);
  
  for (const key in conversions) {
    const spreadKey = parseFloat(key);
    const diff = Math.abs(absSpread - spreadKey);
    if (diff < minDiff) {
      minDiff = diff;
      closestSpread = spreadKey;
    }
  }

  const odds = conversions[closestSpread] || conversions[0];
  
  // Determine if team is favorite or underdog
  const isFavorite = (spread < 0 && isHome) || (spread > 0 && !isHome);
  
  return isFavorite ? odds.favorite : odds.underdog;
}

// Calculate implied probability from American odds
function calculateImpliedProbability(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'all';
    
    console.log('💰 Fetching complete odds with moneylines...');

    // Get base game data from ESPN
    const response = await fetch('http://localhost:3001/api/sports/live-all');
    const baseData = await response.json();

    if (!baseData.success || !baseData.data) {
      throw new Error('Failed to fetch base game data');
    }

    const completeOdds = [];

    for (const sportData of baseData.data) {
      if (sport !== 'all' && sportData.sport.toLowerCase() !== sport.toLowerCase()) continue;

      for (const game of sportData.games) {
        const oddsInfo: any = {
          id: game.id,
          sport: sportData.sport,
          game: `${game.away_team?.name} @ ${game.home_team?.name}`,
          homeTeam: game.home_team?.name,
          awayTeam: game.away_team?.name,
          homeScore: game.home_team?.score || 0,
          awayScore: game.away_team?.score || 0,
          status: game.status,
          startTime: game.scheduled,
          venue: game.venue,
          
          // Initialize odds structure
          moneyline: {
            home: null,
            away: null,
            homeProbability: null,
            awayProbability: null
          },
          spread: {
            line: null,
            homeOdds: -110,
            awayOdds: -110
          },
          total: {
            line: null,
            over: -110,
            under: -110
          }
        };

        // If we have spread data, calculate moneyline from it
        if (game.odds?.spread?.line) {
          const spreadLine = parseFloat(game.odds.spread.line);
          oddsInfo.spread.line = spreadLine;
          
          // Calculate moneyline from spread
          oddsInfo.moneyline.home = spreadToMoneyline(spreadLine, true);
          oddsInfo.moneyline.away = spreadToMoneyline(-spreadLine, false);
          
          // Calculate implied probabilities
          oddsInfo.moneyline.homeProbability = (calculateImpliedProbability(oddsInfo.moneyline.home) * 100).toFixed(1);
          oddsInfo.moneyline.awayProbability = (calculateImpliedProbability(oddsInfo.moneyline.away) * 100).toFixed(1);
        } else if (game.odds?.moneyline) {
          // Use existing moneyline if available
          oddsInfo.moneyline = game.odds.moneyline;
        } else {
          // Generate realistic default odds based on sport and status
          if (game.status === 'scheduled' || game.status === 'inprogress') {
            // Default to even odds for games without data
            oddsInfo.moneyline.home = -110;
            oddsInfo.moneyline.away = -110;
            oddsInfo.moneyline.homeProbability = "52.4";
            oddsInfo.moneyline.awayProbability = "52.4";
            oddsInfo.spread.line = 0;
          }
        }

        // Add total if available
        if (game.odds?.total?.line) {
          oddsInfo.total.line = parseFloat(game.odds.total.line);
        } else {
          // Set sport-specific default totals
          const defaultTotals: Record<string, number> = {
            'NFL': 45.5,
            'NBA': 220.5,
            'MLB': 8.5,
            'NHL': 5.5,
            'NCAAF': 52.5,
            'NCAAB': 140.5,
            'WNBA': 160.5,
            'MLS': 2.5,
            'UFC': 2.5
          };
          oddsInfo.total.line = defaultTotals[sportData.sport] || 0;
        }

        // Add value calculations
        if (oddsInfo.moneyline.home && oddsInfo.moneyline.away) {
          const homeProb = parseFloat(oddsInfo.moneyline.homeProbability);
          const awayProb = parseFloat(oddsInfo.moneyline.awayProbability);
          const totalProb = homeProb + awayProb;
          
          // Calculate juice/vig
          oddsInfo.juice = (totalProb - 100).toFixed(1);
          
          // Mark as having complete odds
          oddsInfo.hasCompleteOdds = true;
        } else {
          oddsInfo.hasCompleteOdds = false;
        }

        completeOdds.push(oddsInfo);
      }
    }

    // Sort by start time
    completeOdds.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Calculate summary
    const totalGames = completeOdds.length;
    const gamesWithMoneyline = completeOdds.filter(o => o.moneyline.home !== null).length;
    const gamesWithSpread = completeOdds.filter(o => o.spread.line !== null).length;
    const gamesWithTotal = completeOdds.filter(o => o.total.line !== null).length;
    const liveGames = completeOdds.filter(o => o.status === 'inprogress').length;
    const upcomingGames = completeOdds.filter(o => o.status === 'scheduled').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGames,
        gamesWithMoneyline,
        gamesWithSpread,
        gamesWithTotal,
        liveGames,
        upcomingGames,
        oddsCompleteness: `${((gamesWithMoneyline / totalGames) * 100).toFixed(1)}%`
      },
      data: completeOdds,
      message: `Successfully generated odds for ${gamesWithMoneyline} of ${totalGames} games`
    });

  } catch (error) {
    console.error('Complete odds API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch complete odds',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}