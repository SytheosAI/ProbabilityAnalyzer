/**
 * Unified Odds API - Combines multiple sources for comprehensive coverage
 * - The Odds API: US sportsbooks, moneylines, spreads, totals
 * - API-SPORTS: International coverage, live odds, player props
 * - ESPN: Live scores and basic odds
 */

import { NextRequest, NextResponse } from 'next/server';

const THE_ODDS_API_KEY = process.env.THE_ODDS_API_KEY || '1a82db670eedcd02dbe925e19b695123';
const API_SPORTS_KEY = process.env.API_SPORTS_KEY || '7a9995daa65788404426762b545845f2';

// Fetch from The Odds API
async function fetchTheOddsAPI() {
  const sports = [
    'americanfootball_nfl',
    'americanfootball_ncaaf', 
    'basketball_nba',
    'basketball_ncaab',
    'baseball_mlb',
    'icehockey_nhl'
  ];

  const allOdds = [];

  for (const sport of sports) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${THE_ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const games = await response.json();
      console.log(`✅ The Odds API - ${sport}: ${games.length} games`);
      
      for (const game of games) {
        // Extract best moneyline odds
        let bestHomeML = -999999;
        let bestAwayML = -999999;
        let bestHomeBook = '';
        let bestAwayBook = '';
        
        for (const book of game.bookmakers || []) {
          const mlMarket = book.markets?.find((m: any) => m.key === 'h2h');
          if (mlMarket) {
            const homeOdds = mlMarket.outcomes?.find((o: any) => o.name === game.home_team);
            const awayOdds = mlMarket.outcomes?.find((o: any) => o.name === game.away_team);
            
            if (homeOdds && homeOdds.price > bestHomeML) {
              bestHomeML = homeOdds.price;
              bestHomeBook = book.title;
            }
            if (awayOdds && awayOdds.price > bestAwayML) {
              bestAwayML = awayOdds.price;
              bestAwayBook = book.title;
            }
          }
        }
        
        allOdds.push({
          id: game.id,
          sport: sport.replace('americanfootball_', '').replace('basketball_', '').replace('baseball_', '').replace('icehockey_', '').toUpperCase(),
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          startTime: game.commence_time,
          moneyline: {
            home: bestHomeML > -999999 ? bestHomeML : null,
            away: bestAwayML > -999999 ? bestAwayML : null,
            homeBook: bestHomeBook,
            awayBook: bestAwayBook
          },
          bookmakers: game.bookmakers?.length || 0,
          source: 'the-odds-api'
        });
      }
    } catch (error) {
      console.error(`Error fetching ${sport}:`, error);
    }
  }

  return allOdds;
}

// Fetch from API-SPORTS
async function fetchAPISports() {
  const endpoints = [
    { url: 'https://v1.american-football.api-sports.io/games?league=1&season=2024', sport: 'NFL' },
    { url: 'https://v1.basketball.api-sports.io/games?league=12&season=2024-2025', sport: 'NBA' },
    { url: 'https://v1.baseball.api-sports.io/games?league=1&season=2024', sport: 'MLB' },
    { url: 'https://v1.ice-hockey.api-sports.io/games?league=57&season=2024', sport: 'NHL' }
  ];

  const allOdds = [];

  for (const { url, sport } of endpoints) {
    try {
      const response = await fetch(url, {
        headers: {
          'x-apisports-key': API_SPORTS_KEY
        }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const games = data.response || [];
      
      console.log(`✅ API-SPORTS - ${sport}: ${games.length} games`);
      
      for (const game of games) {
        allOdds.push({
          id: game.game?.id || game.id,
          sport,
          homeTeam: game.teams?.home?.name || game.home?.name,
          awayTeam: game.teams?.away?.name || game.away?.name,
          startTime: game.game?.date || game.date,
          homeScore: game.scores?.home?.total || game.scores?.home,
          awayScore: game.scores?.away?.total || game.scores?.away,
          status: game.game?.status?.long || game.status?.long,
          moneyline: {
            home: null, // API-SPORTS odds are in separate endpoint
            away: null
          },
          source: 'api-sports'
        });
      }
    } catch (error) {
      console.error(`Error fetching API-SPORTS ${sport}:`, error);
    }
  }

  return allOdds;
}

// Fetch from ESPN (no key needed)
async function fetchESPN() {
  const sports = [
    { sport: 'football', league: 'nfl', name: 'NFL' },
    { sport: 'basketball', league: 'nba', name: 'NBA' },
    { sport: 'baseball', league: 'mlb', name: 'MLB' },
    { sport: 'hockey', league: 'nhl', name: 'NHL' }
  ];

  const allOdds = [];

  for (const { sport, league, name } of sports) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
      const response = await fetch(url);
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.events) {
        for (const event of data.events) {
          const competition = event.competitions?.[0];
          const odds = competition?.odds?.[0];
          
          if (odds) {
            const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
            const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
            
            allOdds.push({
              id: event.id,
              sport: name,
              homeTeam: homeTeam?.team?.displayName,
              awayTeam: awayTeam?.team?.displayName,
              startTime: event.date,
              moneyline: {
                home: parseInt(odds.homeMoneyLine) || null,
                away: parseInt(odds.awayMoneyLine) || null,
                book: odds.provider?.name || 'ESPN BET'
              },
              spread: parseFloat(odds.details) || null,
              total: parseFloat(odds.overUnder) || null,
              source: 'espn'
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching ESPN ${name}:`, error);
    }
  }

  return allOdds;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🎯 Fetching unified odds from all sources...');

    // Fetch from all sources in parallel
    const [theOddsData, apiSportsData, espnData] = await Promise.all([
      fetchTheOddsAPI(),
      fetchAPISports(),
      fetchESPN()
    ]);

    // Combine and deduplicate
    const allGames = [...theOddsData];
    
    // Merge API-SPORTS data
    for (const game of apiSportsData) {
      const existing = allGames.find(g => 
        g.homeTeam === game.homeTeam && g.awayTeam === game.awayTeam
      );
      
      if (!existing) {
        allGames.push(game);
      } else if (!existing.moneyline.home && game.moneyline.home) {
        // Update with odds if we have them
        existing.moneyline = game.moneyline;
      }
    }
    
    // Merge ESPN data
    for (const game of espnData) {
      const existing = allGames.find(g => 
        g.homeTeam === game.homeTeam && g.awayTeam === game.awayTeam
      );
      
      if (!existing) {
        allGames.push(game);
      } else if (!existing.moneyline.home && game.moneyline.home) {
        existing.moneyline = game.moneyline;
      }
    }

    // Sort by start time
    allGames.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Calculate statistics
    const totalGames = allGames.length;
    const gamesWithMoneyline = allGames.filter(g => g.moneyline.home && g.moneyline.away).length;
    const sports = [...new Set(allGames.map(g => g.sport))];
    const sources = {
      theOddsAPI: theOddsData.length,
      apiSports: apiSportsData.length,
      espn: espnData.length
    };

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGames,
        gamesWithMoneyline,
        moneylinePercentage: `${((gamesWithMoneyline / totalGames) * 100).toFixed(1)}%`,
        sports,
        sources
      },
      data: allGames,
      message: `Successfully fetched ${totalGames} games (${gamesWithMoneyline} with moneyline odds)`
    });

  } catch (error) {
    console.error('Unified odds API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch unified odds',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}