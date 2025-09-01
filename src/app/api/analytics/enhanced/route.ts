import { NextRequest, NextResponse } from 'next/server';
import { generateEnhancedAnalytics } from '@/services/crossReferenceAnalytics';
import { espnAPI } from '@/services/espnApi';
import { sportsRadarAPI } from '@/services/sportsRadarApi';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sport = searchParams.get('sport');
    const league = searchParams.get('league');
    const date = searchParams.get('date');
    
    if (!sport || !league) {
      return NextResponse.json(
        { error: 'Sport and league parameters are required' },
        { status: 400 }
      );
    }
    
    // Get games from both sources
    const [espnGames, sportsRadarGames] = await Promise.all([
      espnAPI.getScoreboard(sport, league, date || undefined),
      sportsRadarAPI.getAllLiveGames()
    ]);
    
    // Return basic game list
    return NextResponse.json({
      success: true,
      sport,
      league,
      date: date || new Date().toISOString().split('T')[0],
      espnGames: espnGames.events.length,
      sportsRadarGames: sportsRadarGames.reduce((sum, s) => sum + s.games.length, 0),
      games: espnGames.events.map(event => ({
        id: event.id,
        name: event.name,
        shortName: event.shortName,
        date: event.date,
        status: event.status.type.description,
        competitors: event.competitions[0]?.competitors?.map(c => ({
          team: c.team.displayName,
          score: c.score,
          homeAway: c.homeAway
        }))
      }))
    });
  } catch (error) {
    console.error('Error in enhanced analytics route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch enhanced analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sport, league, gameId, espnGameId, sportsRadarGameId } = body;
    
    if (!sport || !league || (!gameId && !espnGameId && !sportsRadarGameId)) {
      return NextResponse.json(
        { error: 'Sport, league, and at least one game ID are required' },
        { status: 400 }
      );
    }
    
    // Generate comprehensive enhanced analytics
    const analytics = await generateEnhancedAnalytics(
      sport,
      league,
      sportsRadarGameId || gameId,
      espnGameId || gameId
    );
    
    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error generating enhanced analytics:', error);
    return NextResponse.json(
      { error: 'Failed to generate enhanced analytics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}