import { NextResponse } from 'next/server';

export async function GET() {
  // Fetch our own API to test
  const response = await fetch('http://localhost:3002/api/sports/live-games');
  const data = await response.json();
  
  return NextResponse.json({
    test: 'API Test Result',
    gamesFound: data.data?.games?.length || 0,
    firstGame: data.data?.games?.[0] || null,
    success: data.success
  });
}