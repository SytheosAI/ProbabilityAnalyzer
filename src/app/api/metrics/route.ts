import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || undefined;
    const days = parseInt(searchParams.get('days') || '30');
    
    const metrics = await db.getPerformanceMetrics(sport, days);
    
    return NextResponse.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get metrics API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}