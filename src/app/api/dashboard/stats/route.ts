import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';
import { getAllSportsGames } from '@/services/sportsRadarApi';

export async function GET(request: NextRequest) {
  try {
    // Fetch real-time data from multiple sources
    const [liveGames, predictions, metrics] = await Promise.all([
      getAllSportsGames(),
      db.getRecentPredictions(100),
      db.getPerformanceMetrics()
    ]);
    
    // Calculate real statistics
    const totalGames = liveGames.reduce((sum, sport) => sum + sport.games.length, 0);
    const valueBets = predictions.filter(p => p.expected_value > 5);
    const avgEV = valueBets.length > 0 
      ? valueBets.reduce((sum, p) => sum + p.expected_value, 0) / valueBets.length
      : 0;
    const avgConf = predictions.length > 0
      ? predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length
      : 0;
    
    // Calculate parlay opportunities (predictions that could be combined)
    const parlayOpps = Math.min(
      Math.floor(valueBets.length / 2),
      15
    );
    
    // Calculate arbitrage opportunities (simplified - would need cross-book comparison)
    const arbOpps = valueBets.filter(p => p.expected_value > 15).length;
    
    // Calculate profit potential
    const profitPotential = valueBets.reduce((sum, p) => {
      const stake = 100; // Base stake
      const potentialReturn = stake * (p.expected_value / 100);
      return sum + potentialReturn;
    }, 0);
    
    const dashboardStats = {
      total_games_analyzed: totalGames,
      value_bets_found: valueBets.length,
      avg_expected_value: Math.round(avgEV * 10) / 10,
      avg_confidence: avgConf,
      parlay_opportunities: parlayOpps,
      arbitrage_opportunities: arbOpps,
      total_profit_potential: Math.round(profitPotential * 100) / 100
    };
    
    return NextResponse.json({
      success: true,
      data: dashboardStats
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch dashboard stats',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}