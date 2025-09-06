/**
 * Enhanced Live Odds API
 * Fetches real odds data from multiple sources
 */

import { NextRequest, NextResponse } from 'next/server';

// Fetch odds from Action Network API (no auth required for basic data)
async function fetchActionNetworkOdds() {
  try {
    const response = await fetch('https://api.actionnetwork.com/web/v1/scoreboard/nfl', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Action Network error:', error);
  }
  return null;
}

// Fetch from OddsShark (public data)
async function fetchOddsSharkData(sport: string) {
  const sportMap: Record<string, string> = {
    'nfl': 'football/nfl',
    'nba': 'basketball/nba',
    'mlb': 'baseball/mlb',
    'nhl': 'hockey/nhl',
    'ncaaf': 'football/ncaaf',
    'ncaab': 'basketball/ncaab'
  };

  try {
    const endpoint = sportMap[sport.toLowerCase()];
    if (!endpoint) return null;

    const response = await fetch(`https://www.oddsshark.com/api/scores/${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error(`OddsShark ${sport} error:`, error);
  }
  return null;
}

// DraftKings Sportsbook API (public odds feed)
async function fetchDraftKingsOdds(sport: string) {
  const sportMap: Record<string, string> = {
    'nfl': '88808',
    'nba': '42648',
    'mlb': '84240',
    'nhl': '42133',
    'ncaaf': '87637',
    'ncaab': '92483'
  };

  try {
    const sportId = sportMap[sport.toLowerCase()];
    if (!sportId) return null;

    const response = await fetch(
      `https://sportsbook-us-nh.draftkings.com/sites/US-NH-SB/api/v5/eventgroups/${sportId}?format=json`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.eventGroup?.events || [];
    }
  } catch (error) {
    console.error(`DraftKings ${sport} error:`, error);
  }
  return [];
}

// FanDuel Sportsbook API (public data)
async function fetchFanDuelOdds(sport: string) {
  const sportMap: Record<string, string> = {
    'nfl': 'american_football/nfl',
    'nba': 'basketball/nba',
    'mlb': 'baseball/mlb',
    'nhl': 'ice_hockey/nhl'
  };

  try {
    const endpoint = sportMap[sport.toLowerCase()];
    if (!endpoint) return null;

    const response = await fetch(
      `https://sportsbook.fanduel.com/cache/psmg/UK/${endpoint}.json`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.attachments?.events || {};
    }
  } catch (error) {
    console.error(`FanDuel ${sport} error:`, error);
  }
  return {};
}

// BetMGM public API
async function fetchBetMGMOdds(sport: string) {
  try {
    const response = await fetch(
      `https://sports.mi.betmgm.com/cds-api/bettingoffer/fixtures?x-bwin-accessid=MjkzNjZlZjktYmI2Zi00YzQ3LWI5MjQtNWM3ZTA2MDQ1NDY2&lang=en-us&country=US&userCountry=US&subdivision=US-MI&offerMapping=All&sportIds=${sport}&regionIds=9&competitionIds=all&fixtureStates=1,2,3,4,5,6,7,8`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.fixtures || [];
    }
  } catch (error) {
    console.error(`BetMGM ${sport} error:`, error);
  }
  return [];
}

// Combine and normalize odds from all sources
function normalizeOdds(espnGame: any, dkOdds: any, fdOdds: any, mgmOdds: any) {
  const odds: any = {
    moneyline: {},
    spread: {},
    total: {},
    books: []
  };

  // ESPN odds (if available)
  if (espnGame.odds) {
    odds.moneyline.espn = {
      home: espnGame.odds.moneyline?.home || null,
      away: espnGame.odds.moneyline?.away || null
    };
    odds.spread.espn = espnGame.odds.spread;
    odds.total.espn = espnGame.odds.total;
    if (espnGame.odds.moneyline?.home) {
      odds.books.push('ESPN');
    }
  }

  // DraftKings odds
  if (dkOdds) {
    const markets = dkOdds.displayGroups?.[0]?.markets || [];
    const mlMarket = markets.find((m: any) => m.name === 'Moneyline');
    const spreadMarket = markets.find((m: any) => m.name === 'Point Spread');
    const totalMarket = markets.find((m: any) => m.name === 'Total');

    if (mlMarket) {
      odds.moneyline.draftkings = {
        home: mlMarket.outcomes?.[0]?.oddsAmerican || null,
        away: mlMarket.outcomes?.[1]?.oddsAmerican || null
      };
      odds.books.push('DraftKings');
    }

    if (spreadMarket) {
      odds.spread.draftkings = {
        line: spreadMarket.outcomes?.[0]?.line || 0,
        home: spreadMarket.outcomes?.[0]?.oddsAmerican || -110,
        away: spreadMarket.outcomes?.[1]?.oddsAmerican || -110
      };
    }

    if (totalMarket) {
      odds.total.draftkings = {
        line: totalMarket.outcomes?.[0]?.line || 0,
        over: totalMarket.outcomes?.[0]?.oddsAmerican || -110,
        under: totalMarket.outcomes?.[1]?.oddsAmerican || -110
      };
    }
  }

  // Calculate best odds (most favorable for bettor)
  if (Object.keys(odds.moneyline).length > 0) {
    const homeOdds = Object.values(odds.moneyline)
      .map((book: any) => book.home)
      .filter(o => o !== null);
    const awayOdds = Object.values(odds.moneyline)
      .map((book: any) => book.away)
      .filter(o => o !== null);

    if (homeOdds.length > 0) {
      odds.bestLines = {
        home: Math.max(...homeOdds),
        away: Math.max(...awayOdds),
        homeBook: Object.entries(odds.moneyline)
          .find(([_, v]: any) => v.home === Math.max(...homeOdds))?.[0],
        awayBook: Object.entries(odds.moneyline)
          .find(([_, v]: any) => v.away === Math.max(...awayOdds))?.[0]
      };
    }
  }

  return odds;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎲 Fetching enhanced odds data...');

    // First get games from ESPN
    const espnResponse = await fetch('http://localhost:3001/api/sports/live-all');
    const espnData = await espnResponse.json();

    if (!espnData.success || !espnData.data) {
      throw new Error('Failed to fetch base game data');
    }

    // Enhance each game with odds from multiple sources
    const enhancedData = [];

    for (const sportData of espnData.data) {
      const sport = sportData.sport.toLowerCase();
      
      // Fetch odds from multiple sources for this sport
      const [dkOdds, fdOdds, mgmOdds] = await Promise.all([
        fetchDraftKingsOdds(sport),
        fetchFanDuelOdds(sport),
        fetchBetMGMOdds(sport)
      ]);

      const enhancedGames = sportData.games.map((game: any) => {
        // Try to match game in odds data
        let gameOdds = null;
        
        if (Array.isArray(dkOdds)) {
          gameOdds = dkOdds.find((dk: any) => 
            dk.name?.includes(game.home_team?.name) || 
            dk.name?.includes(game.away_team?.name)
          );
        }

        const normalizedOdds = normalizeOdds(game, gameOdds, null, null);

        return {
          ...game,
          odds: {
            ...game.odds,
            ...normalizedOdds,
            hasOdds: normalizedOdds.books.length > 0
          }
        };
      });

      enhancedData.push({
        sport: sportData.sport,
        games: enhancedGames,
        gamesWithOdds: enhancedGames.filter((g: any) => g.odds?.hasOdds).length
      });
    }

    // Calculate statistics
    const totalGames = enhancedData.reduce((sum, s) => sum + s.games.length, 0);
    const gamesWithOdds = enhancedData.reduce((sum, s) => sum + s.gamesWithOdds, 0);
    const oddsPercentage = totalGames > 0 ? (gamesWithOdds / totalGames * 100).toFixed(1) : 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGames,
        gamesWithOdds,
        oddsPercentage: `${oddsPercentage}%`,
        books: ['ESPN', 'DraftKings', 'FanDuel', 'BetMGM'],
        message: `Found odds for ${gamesWithOdds} of ${totalGames} games`
      },
      data: enhancedData
    });

  } catch (error) {
    console.error('Enhanced odds API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch enhanced odds data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}