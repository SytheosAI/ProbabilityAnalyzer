import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const sport = searchParams.get('sport') || undefined;
    
    // Convert timeRange to days
    const days = timeRange === '1h' ? 1 : timeRange === '6h' ? 0.25 : timeRange === '24h' ? 1 : 7;
    
    // LIVE DATA ONLY - NO DEMO DATA
    try {
      const [predictions, metrics] = await Promise.all([
        db.getRecentPredictions(100),
        db.getPerformanceMetrics(sport, days)
      ]);
      
      return NextResponse.json({
        success: true,
        data: {
          predictions: predictions || [],
          metrics: metrics || []
        },
        isDemo: false
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json({
        success: false,
        data: {
          predictions: [],
          metrics: []
        },
        isDemo: false,
        error: 'Database connection error - no data available'
      });
    }
    
  } catch (error) {
    console.error('Analytics API error:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        predictions: [],
        metrics: []
      },
      isDemo: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}