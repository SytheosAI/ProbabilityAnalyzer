import { NextRequest, NextResponse } from 'next/server';
import { historicalDataService } from '@/services/historicalDataService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const sport = searchParams.get('sport');
    const teamId = searchParams.get('teamId');
    const team1Id = searchParams.get('team1Id');
    const team2Id = searchParams.get('team2Id');
    const playerId = searchParams.get('playerId');
    const season = searchParams.get('season');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const modelName = searchParams.get('modelName');

    if (!action) {
      return NextResponse.json({ 
        error: 'Action parameter required',
        availableActions: [
          'team-stats',
          'head-to-head',
          'player-stats',
          'model-accuracy',
          'fetch-games'
        ]
      }, { status: 400 });
    }

    switch (action) {
      case 'team-stats': {
        if (!teamId || !sport) {
          return NextResponse.json({ 
            error: 'teamId and sport parameters required' 
          }, { status: 400 });
        }

        const stats = await historicalDataService.getTeamHistoricalStats(
          teamId,
          sport,
          season || undefined
        );

        if (!stats) {
          return NextResponse.json({ 
            error: 'No historical data found for this team',
            teamId,
            sport,
            season
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: stats
        });
      }

      case 'head-to-head': {
        if (!team1Id || !team2Id || !sport) {
          return NextResponse.json({ 
            error: 'team1Id, team2Id, and sport parameters required' 
          }, { status: 400 });
        }

        const record = await historicalDataService.getHeadToHeadRecord(
          team1Id,
          team2Id,
          sport,
          20 // Get last 20 games
        );

        if (!record) {
          return NextResponse.json({ 
            error: 'No head-to-head data found',
            team1Id,
            team2Id,
            sport
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: record
        });
      }

      case 'player-stats': {
        if (!playerId || !sport) {
          return NextResponse.json({ 
            error: 'playerId and sport parameters required' 
          }, { status: 400 });
        }

        const stats = await historicalDataService.getPlayerHistoricalStats(
          playerId,
          sport,
          season || undefined
        );

        if (!stats) {
          return NextResponse.json({ 
            error: 'No historical data found for this player',
            playerId,
            sport,
            season
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: stats
        });
      }

      case 'model-accuracy': {
        if (!modelName || !sport) {
          return NextResponse.json({ 
            error: 'modelName and sport parameters required' 
          }, { status: 400 });
        }

        const dateRange = startDate && endDate 
          ? { start: startDate, end: endDate }
          : undefined;

        const accuracy = await historicalDataService.getModelAccuracyHistory(
          modelName,
          sport,
          dateRange
        );

        if (!accuracy) {
          return NextResponse.json({ 
            error: 'No accuracy data found for this model',
            modelName,
            sport,
            dateRange
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: accuracy
        });
      }

      case 'fetch-games': {
        if (!sport || !season) {
          return NextResponse.json({ 
            error: 'sport and season parameters required' 
          }, { status: 400 });
        }

        const games = await historicalDataService.fetchHistoricalGames(
          sport as any,
          season,
          startDate || undefined,
          endDate || undefined
        );

        return NextResponse.json({
          success: true,
          message: `Fetched ${games.length} historical games for ${sport}`,
          data: {
            sport,
            season,
            gamesCount: games.length,
            dateRange: startDate && endDate ? { start: startDate, end: endDate } : null
          }
        });
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action',
          availableActions: [
            'team-stats',
            'head-to-head', 
            'player-stats',
            'model-accuracy',
            'fetch-games'
          ]
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Historical data API error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}