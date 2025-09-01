import { NextResponse } from 'next/server';
import { unifiedApi } from '@/services/unifiedApiService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Use the service directly instead of fetching localhost
    const games = await unifiedApi.getAllGames();
    
    return NextResponse.json({
      test: 'API Test Result',
      gamesFound: games.length || 0,
      firstGame: games[0] || null,
      success: true
    });
  } catch (error) {
    return NextResponse.json({
      test: 'API Test Error',
      gamesFound: 0,
      firstGame: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}