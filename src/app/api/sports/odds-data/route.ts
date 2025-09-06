/**
 * Real Odds Data API
 * Fetches moneyline, spread, and total odds from ESPN's public API
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'all';
    
    console.log('📊 Fetching real odds data...');

    const sports = [
      { sport: 'football', league: 'nfl', name: 'NFL' },
      { sport: 'basketball', league: 'nba', name: 'NBA' },
      { sport: 'baseball', league: 'mlb', name: 'MLB' },
      { sport: 'hockey', league: 'nhl', name: 'NHL' },
      { sport: 'football', league: 'college-football', name: 'NCAAF' },
      { sport: 'basketball', league: 'mens-college-basketball', name: 'NCAAB' }
    ];

    const oddsData = [];

    for (const { sport: sportType, league, name } of sports) {
      if (sport !== 'all' && name.toLowerCase() !== sport.toLowerCase()) continue;

      try {
        // ESPN provides odds in their scoreboard API
        const url = `https://site.api.espn.com/apis/site/v2/sports/${sportType}/${league}/scoreboard`;
        const response = await fetch(url);
        
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.events) {
          for (const event of data.events) {
            const competition = event.competitions?.[0];
            if (!competition) continue;
            
            const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
            const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
            
            // Extract odds if available
            const odds = competition.odds?.[0];
            if (odds) {
              const oddsInfo = {
                id: event.id,
                sport: name,
                game: `${awayTeam?.team?.displayName} @ ${homeTeam?.team?.displayName}`,
                homeTeam: homeTeam?.team?.displayName,
                awayTeam: awayTeam?.team?.displayName,
                startTime: event.date,
                status: competition.status?.type?.name,
                
                // Moneyline odds
                moneyline: {
                  home: parseInt(odds.homeMoneyLine) || null,
                  away: parseInt(odds.awayMoneyLine) || null,
                  homeProbability: null,
                  awayProbability: null
                },
                
                // Spread
                spread: {
                  line: parseFloat(odds.details) || null,
                  favorite: odds.details?.startsWith('-') ? homeTeam?.team?.displayName : awayTeam?.team?.displayName,
                  spreadOdds: -110 // Standard spread odds
                },
                
                // Total (Over/Under)
                total: {
                  line: parseFloat(odds.overUnder) || null,
                  over: -110, // Standard total odds
                  under: -110
                },
                
                // Additional info
                provider: odds.provider?.name || 'ESPN BET',
                lastUpdated: new Date().toISOString()
              };
              
              // Calculate implied probabilities for moneyline
              if (oddsInfo.moneyline.home) {
                const homeML = oddsInfo.moneyline.home;
                if (homeML > 0) {
                  oddsInfo.moneyline.homeProbability = (100 / (homeML + 100) * 100).toFixed(1);
                } else {
                  oddsInfo.moneyline.homeProbability = (Math.abs(homeML) / (Math.abs(homeML) + 100) * 100).toFixed(1);
                }
              }
              
              if (oddsInfo.moneyline.away) {
                const awayML = oddsInfo.moneyline.away;
                if (awayML > 0) {
                  oddsInfo.moneyline.awayProbability = (100 / (awayML + 100) * 100).toFixed(1);
                } else {
                  oddsInfo.moneyline.awayProbability = (Math.abs(awayML) / (Math.abs(awayML) + 100) * 100).toFixed(1);
                }
              }
              
              oddsData.push(oddsInfo);
            }
          }
        }
        
        console.log(`✅ ${name}: Found odds for ${oddsData.filter(o => o.sport === name).length} games`);
      } catch (error) {
        console.error(`Error fetching ${name} odds:`, error);
      }
    }

    // Sort by start time
    oddsData.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    // Calculate summary statistics
    const totalGamesWithOdds = oddsData.length;
    const sportsWithOdds = [...new Set(oddsData.map(o => o.sport))];
    const gamesWithMoneyline = oddsData.filter(o => o.moneyline.home && o.moneyline.away).length;
    const gamesWithSpread = oddsData.filter(o => o.spread.line !== null).length;
    const gamesWithTotal = oddsData.filter(o => o.total.line !== null).length;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalGamesWithOdds,
        sportsCount: sportsWithOdds.length,
        sports: sportsWithOdds,
        gamesWithMoneyline,
        gamesWithSpread,
        gamesWithTotal,
        oddsProvider: 'ESPN BET'
      },
      data: oddsData,
      message: totalGamesWithOdds > 0 
        ? `Successfully fetched odds for ${totalGamesWithOdds} games`
        : 'No odds data available at this time'
    });

  } catch (error) {
    console.error('Odds API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch odds data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}