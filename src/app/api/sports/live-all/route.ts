/**
 * Live All Sports API Route
 * Server-side fetching to avoid CORS issues
 * Uses multiple real API sources with fallback
 */

import { NextRequest, NextResponse } from 'next/server';

// ESPN API - No authentication required
async function fetchESPNData() {
  const sports = [
    { sport: 'football', league: 'nfl', name: 'NFL' },
    { sport: 'basketball', league: 'nba', name: 'NBA' },
    { sport: 'baseball', league: 'mlb', name: 'MLB' },
    { sport: 'hockey', league: 'nhl', name: 'NHL' },
    { sport: 'football', league: 'college-football', name: 'NCAAF' },
    { sport: 'basketball', league: 'mens-college-basketball', name: 'NCAAB' },
    { sport: 'basketball', league: 'womens-college-basketball', name: 'NCAAWB' },
    { sport: 'basketball', league: 'wnba', name: 'WNBA' },
    { sport: 'soccer', league: 'usa.1', name: 'MLS' },
    { sport: 'mma', league: 'ufc', name: 'UFC' }
  ];

  const allGames = [];

  for (const { sport, league, name } of sports) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
      console.log(`Fetching ${name} from ESPN...`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.warn(`ESPN ${name} returned ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.events && Array.isArray(data.events)) {
        for (const event of data.events) {
          const competition = event.competitions?.[0];
          if (!competition) continue;
          
          const homeCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'home');
          const awayCompetitor = competition.competitors?.find((c: any) => c.homeAway === 'away');
          
          if (!homeCompetitor || !awayCompetitor) continue;
          
          const game = {
            id: event.id,
            sport: name,
            league: name,
            home_team: {
              id: homeCompetitor.team?.id,
              name: homeCompetitor.team?.displayName || 'Unknown',
              score: parseInt(homeCompetitor.score) || 0,
              record: homeCompetitor.records?.[0]?.summary
            },
            away_team: {
              id: awayCompetitor.team?.id,
              name: awayCompetitor.team?.displayName || 'Unknown',
              score: parseInt(awayCompetitor.score) || 0,
              record: awayCompetitor.records?.[0]?.summary
            },
            status: competition.status?.type?.completed ? 'final' : 
                   competition.status?.type?.state === 'in' ? 'inprogress' : 'scheduled',
            scheduled: event.date,
            venue: competition.venue?.fullName,
            broadcast: competition.broadcasts?.[0]?.names,
            period: competition.status?.period,
            clock: competition.status?.displayClock,
            odds: competition.odds?.[0] ? {
              spread: {
                line: parseFloat(competition.odds[0].details) || 0,
                home: -110,
                away: -110
              },
              moneyline: {
                home: competition.odds[0].homeMoneyLine || -110,
                away: competition.odds[0].awayMoneyLine || -110
              },
              total: {
                line: parseFloat(competition.odds[0].overUnder) || 0,
                over: -110,
                under: -110
              }
            } : null
          };
          
          allGames.push(game);
        }
        
        console.log(`✅ ESPN ${name}: Found ${data.events.length} games`);
      }
    } catch (error) {
      console.error(`Error fetching ${name} from ESPN:`, error);
    }
  }

  return allGames;
}

// The Odds API - Free tier available
async function fetchOddsApiData() {
  const API_KEY = process.env.ODDS_API_KEY || 'demo_key'; // Replace with actual key
  const sports = [
    'americanfootball_nfl',
    'basketball_nba', 
    'baseball_mlb',
    'icehockey_nhl',
    'americanfootball_ncaaf',
    'basketball_ncaab'
  ];

  const allOdds = [];

  for (const sport of sports) {
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${API_KEY}&regions=us&markets=h2h,spreads,totals`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        allOdds.push(...data);
      }
    } catch (error) {
      console.warn(`Odds API error for ${sport}:`, error);
    }
  }

  return allOdds;
}

// SportsDataIO API
async function fetchSportsDataIO() {
  const API_KEY = 'c5298a785e5e48fdad99fca62bfff60e';
  const games = [];

  // NBA Games
  try {
    const nbaUrl = `https://api.sportsdata.io/v3/nba/scores/json/GamesByDate/${new Date().toISOString().split('T')[0]}?key=${API_KEY}`;
    const response = await fetch(nbaUrl);
    if (response.ok) {
      const data = await response.json();
      games.push(...data.map((g: any) => ({ ...g, sport: 'NBA' })));
    }
  } catch (error) {
    console.warn('SportsDataIO NBA error:', error);
  }

  // NFL Games
  try {
    const nflUrl = `https://api.sportsdata.io/v3/nfl/scores/json/ScoresByWeek/2024/17?key=${API_KEY}`;
    const response = await fetch(nflUrl);
    if (response.ok) {
      const data = await response.json();
      games.push(...data.map((g: any) => ({ ...g, sport: 'NFL' })));
    }
  } catch (error) {
    console.warn('SportsDataIO NFL error:', error);
  }

  return games;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Fetching live sports data from multiple sources...');
    
    // Fetch from all sources in parallel
    const [espnData, oddsData, sportsDataIO] = await Promise.all([
      fetchESPNData(),
      fetchOddsApiData(),
      fetchSportsDataIO()
    ]);

    // Combine and deduplicate games
    const allGames = [...espnData];
    
    // Enhance ESPN games with odds data
    for (const game of allGames) {
      const matchingOdds = oddsData.find((odds: any) => 
        odds.home_team === game.home_team?.name || 
        odds.away_team === game.away_team?.name
      );
      
      if (matchingOdds && matchingOdds.bookmakers?.[0]) {
        const bookmaker = matchingOdds.bookmakers[0];
        const h2h = bookmaker.markets?.find((m: any) => m.key === 'h2h');
        const spreads = bookmaker.markets?.find((m: any) => m.key === 'spreads');
        const totals = bookmaker.markets?.find((m: any) => m.key === 'totals');
        
        if (!game.odds) {
          game.odds = {
            moneyline: {
              home: h2h?.outcomes?.[0]?.price || -110,
              away: h2h?.outcomes?.[1]?.price || -110
            },
            spread: spreads?.outcomes?.[0] || { line: 0, home: -110, away: -110 },
            total: totals?.outcomes?.[0] || { line: 0, over: -110, under: -110 }
          };
        }
      }
    }

    // Group games by sport
    const gamesBySport = allGames.reduce((acc: any, game: any) => {
      const sport = game.sport || 'Other';
      if (!acc[sport]) acc[sport] = [];
      acc[sport].push(game);
      return acc;
    }, {});

    // Format response
    const sportsData = Object.entries(gamesBySport).map(([sport, games]) => ({
      sport,
      games,
      gameCount: (games as any[]).length
    }));

    const totalGames = allGames.length;
    const liveGames = allGames.filter((g: any) => g.status === 'inprogress').length;
    const upcomingGames = allGames.filter((g: any) => g.status === 'scheduled').length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGames,
        liveGames,
        upcomingGames,
        sportsActive: sportsData.length,
        sources: {
          espn: espnData.length > 0,
          oddsApi: oddsData.length > 0,
          sportsDataIO: sportsDataIO.length > 0
        }
      },
      data: sportsData,
      message: totalGames > 0 
        ? `Successfully fetched ${totalGames} games from live APIs`
        : 'No games available at this time - APIs may be experiencing issues'
    });

  } catch (error) {
    console.error('Live sports API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch live sports data',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}