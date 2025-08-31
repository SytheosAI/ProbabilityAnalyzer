import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';
import { 
  getDemoGames, 
  getDemoPredictions, 
  getDemoMetrics,
  shouldUseDemoData 
} from '@/services/demoDataService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const sport = searchParams.get('sport') || undefined;
    
    // Convert timeRange to days
    const days = timeRange === '1h' ? 1 : timeRange === '6h' ? 0.25 : timeRange === '24h' ? 1 : 7;
    
    // Check if we should use demo data
    if (shouldUseDemoData()) {
      console.log('Using demo data for analytics');
      const demoGames = getDemoGames(sport);
      const demoPredictions = getDemoPredictions(demoGames);
      const demoMetrics = getDemoMetrics(Math.ceil(days));
      
      return NextResponse.json({
        success: true,
        data: {
          predictions: demoPredictions,
          metrics: demoMetrics
        },
        isDemo: true
      });
    }
    
    // Try to fetch real data
    try {
      const [predictions, metrics] = await Promise.all([
        db.getRecentPredictions(100),
        db.getPerformanceMetrics(sport, days)
      ]);
      
      // If both are empty, use demo data
      if (predictions.length === 0 && metrics.length === 0) {
        console.log('Real data is empty, switching to demo data');
        const demoGames = getDemoGames(sport);
        const demoPredictions = getDemoPredictions(demoGames);
        const demoMetrics = getDemoMetrics(Math.ceil(days));
        
        return NextResponse.json({
          success: true,
          data: {
            predictions: demoPredictions,
            metrics: demoMetrics
          },
          isDemo: true,
          message: 'Using demo data as real data is currently unavailable'
        });
      }
      
      return NextResponse.json({
        success: true,
        data: {
          predictions,
          metrics
        },
        isDemo: false
      });
      
    } catch (dbError) {
      console.error('Database error, falling back to demo data:', dbError);
      const demoGames = getDemoGames(sport);
      const demoPredictions = getDemoPredictions(demoGames);
      const demoMetrics = getDemoMetrics(Math.ceil(days));
      
      return NextResponse.json({
        success: true,
        data: {
          predictions: demoPredictions,
          metrics: demoMetrics
        },
        isDemo: true,
        message: 'Using demo data due to database connection issues'
      });
    }
    
  } catch (error) {
    console.error('Analytics API error:', error);
    
    // Even on error, return demo data
    const demoGames = getDemoGames();
    const demoPredictions = getDemoPredictions(demoGames);
    const demoMetrics = getDemoMetrics(7);
    
    return NextResponse.json({
      success: true,
      data: {
        predictions: demoPredictions,
        metrics: demoMetrics
      },
      isDemo: true,
      error: 'An error occurred, showing demo data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}