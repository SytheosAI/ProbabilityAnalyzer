/**
 * The Odds API Integration
 * Free tier: 500 requests/month
 * Provides real moneyline, spread, and total odds from 50+ sportsbooks
 */

import { NextRequest, NextResponse } from 'next/server';

// Get your free key at: https://the-odds-api.com/
const API_KEY = process.env.THE_ODDS_API_KEY || 'demo_key';
const BASE_URL = 'https://api.the-odds-api.com/v4';

// Sport mappings for The Odds API
const SPORT_KEYS = {
  'NFL': 'americanfootball_nfl',
  'NCAAF': 'americanfootball_ncaaf',
  'NBA': 'basketball_nba',
  'NCAAB': 'basketball_ncaab',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'MMA': 'mma_mixed_martial_arts',
  'SOCCER': 'soccer_usa_mls',
  'TENNIS': 'tennis_atp_australian_open'
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'all';
    const markets = searchParams.get('markets') || 'h2h,spreads,totals'; // moneyline, spreads, totals
    
    console.log('🎲 Fetching real odds from The Odds API...');

    // Check API key
    if (API_KEY === 'demo_key' || !API_KEY || API_KEY === 'YOUR_FREE_KEY_HERE') {
      console.warn('⚠️ No API key configured - using fallback data');
      return NextResponse.json({
        success: false,
        message: 'Please get a free API key from https://the-odds-api.com/',
        instructions: [
          '1. Go to https://the-odds-api.com/',
          '2. Click "Get API Key" (free tier available)',
          '3. Add key to .env as THE_ODDS_API_KEY=your_key_here',
          '4. Restart the server'
        ],
        fallbackData: await getFallbackOdds()
      });
    }

    const allOdds = [];
    const sportsToFetch = sport === 'all' ? Object.entries(SPORT_KEYS) : [[sport.toUpperCase(), SPORT_KEYS[sport.toUpperCase()]]];

    for (const [sportName, sportKey] of sportsToFetch) {
      if (!sportKey) continue;

      try {
        // Fetch odds for this sport
        const url = `${BASE_URL}/sports/${sportKey}/odds/?apiKey=${API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
        console.log(`Fetching ${sportName} odds...`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key - please check your THE_ODDS_API_KEY in .env');
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded - free tier allows 500 requests/month');
          }
          console.warn(`Failed to fetch ${sportName}: ${response.status}`);
          continue;
        }

        const games = await response.json();
        
        // Check remaining requests in header
        const requestsRemaining = response.headers.get('x-requests-remaining');
        const requestsUsed = response.headers.get('x-requests-used');
        
        console.log(`✅ ${sportName}: Found ${games.length} games (${requestsRemaining} requests remaining)`);

        // Process each game
        for (const game of games) {
          const processedGame = {
            id: game.id,
            sport: sportName,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            commenceTime: game.commence_time,
            
            // Process bookmaker odds
            odds: processBookmakerOdds(game.bookmakers),
            
            // Best lines across all books
            bestLines: findBestLines(game.bookmakers),
            
            // Consensus lines (average)
            consensus: calculateConsensus(game.bookmakers),
            
            bookmakers: game.bookmakers.length,
            lastUpdate: new Date().toISOString()
          };
          
          allOdds.push(processedGame);
        }
      } catch (error) {
        console.error(`Error fetching ${sportName}:`, error);
      }
    }

    // Sort by commence time
    allOdds.sort((a, b) => new Date(a.commenceTime).getTime() - new Date(b.commenceTime).getTime());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGames: allOdds.length,
        sports: [...new Set(allOdds.map(g => g.sport))],
        message: `Found ${allOdds.length} games with real odds from The Odds API`
      },
      data: allOdds
    });

  } catch (error) {
    console.error('The Odds API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch odds',
        message: error instanceof Error ? error.message : 'Unknown error',
        fallbackData: await getFallbackOdds()
      },
      { status: 500 }
    );
  }
}

// Process odds from multiple bookmakers
function processBookmakerOdds(bookmakers: any[]) {
  const oddsData: any = {
    moneyline: {},
    spread: {},
    total: {}
  };

  for (const book of bookmakers) {
    const bookName = book.key;
    
    for (const market of book.markets) {
      if (market.key === 'h2h') {
        // Moneyline odds
        const homeOutcome = market.outcomes.find((o: any) => o.name === book.home_team);
        const awayOutcome = market.outcomes.find((o: any) => o.name === book.away_team);
        
        oddsData.moneyline[bookName] = {
          home: homeOutcome?.price || null,
          away: awayOutcome?.price || null
        };
      } else if (market.key === 'spreads') {
        // Spread odds
        const homeSpread = market.outcomes.find((o: any) => o.name === book.home_team);
        const awaySpread = market.outcomes.find((o: any) => o.name === book.away_team);
        
        oddsData.spread[bookName] = {
          homeSpread: homeSpread?.point || null,
          homeOdds: homeSpread?.price || null,
          awaySpread: awaySpread?.point || null,
          awayOdds: awaySpread?.price || null
        };
      } else if (market.key === 'totals') {
        // Total odds
        const over = market.outcomes.find((o: any) => o.name === 'Over');
        const under = market.outcomes.find((o: any) => o.name === 'Under');
        
        oddsData.total[bookName] = {
          line: over?.point || under?.point || null,
          overOdds: over?.price || null,
          underOdds: under?.price || null
        };
      }
    }
  }

  return oddsData;
}

// Find best lines across all bookmakers
function findBestLines(bookmakers: any[]) {
  let bestML = { home: -999999, homeBook: '', away: -999999, awayBook: '' };
  let bestSpread = { home: -999999, homeBook: '', away: -999999, awayBook: '' };
  let bestTotal = { over: -999999, overBook: '', under: -999999, underBook: '' };

  for (const book of bookmakers) {
    for (const market of book.markets) {
      if (market.key === 'h2h') {
        const home = market.outcomes.find((o: any) => o.name !== book.away_team);
        const away = market.outcomes.find((o: any) => o.name !== book.home_team);
        
        if (home?.price > bestML.home) {
          bestML.home = home.price;
          bestML.homeBook = book.title;
        }
        if (away?.price > bestML.away) {
          bestML.away = away.price;
          bestML.awayBook = book.title;
        }
      }
    }
  }

  return {
    moneyline: bestML,
    spread: bestSpread,
    total: bestTotal
  };
}

// Calculate consensus (average) lines
function calculateConsensus(bookmakers: any[]) {
  const mlHome: number[] = [];
  const mlAway: number[] = [];
  const spreads: number[] = [];
  const totals: number[] = [];

  for (const book of bookmakers) {
    for (const market of book.markets) {
      if (market.key === 'h2h') {
        market.outcomes.forEach((o: any) => {
          if (o.name === book.home_team) mlHome.push(o.price);
          else mlAway.push(o.price);
        });
      } else if (market.key === 'spreads') {
        const spread = market.outcomes[0]?.point;
        if (spread) spreads.push(spread);
      } else if (market.key === 'totals') {
        const total = market.outcomes[0]?.point;
        if (total) totals.push(total);
      }
    }
  }

  return {
    moneyline: {
      home: mlHome.length > 0 ? Math.round(mlHome.reduce((a, b) => a + b, 0) / mlHome.length) : null,
      away: mlAway.length > 0 ? Math.round(mlAway.reduce((a, b) => a + b, 0) / mlAway.length) : null
    },
    spread: spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : null,
    total: totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
  };
}

// Fallback data using SportsDataIO
async function getFallbackOdds() {
  try {
    const SPORTSDATAIO_KEY = process.env.SPORTSDATAIO_API_KEY;
    if (!SPORTSDATAIO_KEY) return [];

    const response = await fetch(
      `https://api.sportsdata.io/v3/nfl/odds/json/GameOddsByWeek/2024/17?key=${SPORTSDATAIO_KEY}`
    );
    
    if (response.ok) {
      const data = await response.json();
      return data.map((game: any) => ({
        homeTeam: game.HomeTeamName,
        awayTeam: game.AwayTeamName,
        moneyline: {
          home: game.HomeMoneyLine,
          away: game.AwayMoneyLine
        },
        spread: {
          line: game.PointSpread,
          homeOdds: -110,
          awayOdds: -110
        },
        total: {
          line: game.OverUnder,
          over: game.OverPayout || -110,
          under: game.UnderPayout || -110
        }
      }));
    }
  } catch (error) {
    console.error('Fallback odds error:', error);
  }
  return [];
}