import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching REAL NFL data from ESPN...');
    
    const response = await fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard');
    const data = await response.json();
    
    const games = data.events?.map((event: any) => {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((c: any) => c.homeAway === 'home');
      const away = competition?.competitors?.find((c: any) => c.homeAway === 'away');
      
      return {
        id: event.id,
        name: event.name,
        date: event.date,
        homeTeam: home?.team?.displayName || 'Unknown',
        awayTeam: away?.team?.displayName || 'Unknown',
        homeScore: home?.score || '0',
        awayScore: away?.score || '0',
        status: competition?.status?.type?.description || 'Scheduled'
      };
    }) || [];
    
    return NextResponse.json({
      success: true,
      totalGames: games.length,
      games: games,
      raw: data.events?.slice(0, 2) // Include first 2 raw events for debugging
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch'
    });
  }
}