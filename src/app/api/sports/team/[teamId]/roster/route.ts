import { NextRequest, NextResponse } from 'next/server';
import { getTeamRoster } from '@/services/searchService';

interface RouteParams {
  params: {
    teamId: string;
  };
}

// Get team roster
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { teamId } = params;
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');

    if (!sport) {
      return NextResponse.json(
        { error: 'sport parameter is required' },
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
  } catch (error) {
    console.error('Team Roster API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch roster',
        teamId: params.teamId,
        roster: []
      },
      { status: 500 }
    );
  }
}