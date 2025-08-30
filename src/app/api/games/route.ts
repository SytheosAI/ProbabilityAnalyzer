import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';

export async function POST(request: NextRequest) {
  try {
    const gameData = await request.json();
    await db.saveGame(gameData);
    
    return NextResponse.json({
      success: true,
      message: 'Game saved successfully'
    });
  } catch (error) {
    console.error('Save game API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to save game',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const games = await db.getUpcomingGamesWithPredictions();
    
    return NextResponse.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Get games API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch games',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}