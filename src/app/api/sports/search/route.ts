import { NextRequest, NextResponse } from 'next/server';
import { search, getTeamRoster, getPlayerProfile } from '@/services/searchService';

// Search for players and teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') as 'player' | 'team' | 'all' || 'all';
    const sport = searchParams.get('sport') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      );
    }

    const results = await search(query, { type, sport, limit });

    return NextResponse.json({
      query,
      type,
      sport: sport || 'all',
      resultCount: results.length,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Search failed',
        query: null,
        results: []
      },
      { status: 500 }
    );
  }
}

// Get team roster endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { teamId, sport, action } = body;

    if (action === 'roster') {
      if (!teamId || !sport) {
        return NextResponse.json(
          { error: 'teamId and sport are required' },
          { status: 400 }
        );
      }

      const roster = await getTeamRoster(teamId, sport);
      
      return NextResponse.json({
        teamId,
        sport,
        roster,
        count: roster.length,
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'player') {
      const { playerId } = body;
      if (!playerId || !sport) {
        return NextResponse.json(
          { error: 'playerId and sport are required' },
          { status: 400 }
        );
      }

      const player = await getPlayerProfile(playerId, sport);
      
      if (!player) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        player,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "roster" or "player"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Search POST API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Request failed'
      },
      { status: 500 }
    );
  }
}