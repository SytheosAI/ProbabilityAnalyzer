import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/services/database';
import { getAllSportsGames } from '@/services/sportsRadarApi';
import { DashboardStats } from '@/types/sports';

export async function GET(request: NextRequest) {
  try {
    // LIVE DATA ONLY - NO DEMO DATA
    try {
      // Get recent predictions from database
      const [predictions, games] = await Promise.all([
        db.getRecentPredictions(100),
        getAllSportsGames()
      ]);

      // Calculate statistics
      const totalGames = games.reduce((sum, sport) => sum + sport.games.length, 0);
      const valueBets = predictions.filter(p => p.expected_value > 5);
      const avgEV = valueBets.length > 0 ?
        valueBets.reduce((sum, p) => sum + p.expected_value, 0) / valueBets.length :
        0;
      const avgConfidence = predictions.length > 0 ?
        predictions.reduce((sum, p) => sum + (p.confidence || 0), 0) / predictions.length :
        0;

      // Look for arbitrage opportunities (simplified check)
      const arbitrageOpportunities = predictions.filter(p => 
        p.expected_value > 15 && p.confidence > 0.8
      ).length;

      // Calculate parlay opportunities
      const parlayOpportunities = Math.floor(valueBets.length / 3);

      // Calculate profit potential
      const profitPotential = valueBets.reduce((sum, p) => 
        sum + (p.expected_value * 100), 0);

      const stats: DashboardStats = {
        total_games_analyzed: totalGames || 0,
        value_bets_found: valueBets.length || 0,
        avg_expected_value: Math.round(avgEV * 10) / 10 || 0,
        avg_confidence: avgConfidence || 0,
        parlay_opportunities: parlayOpportunities || 0,
        arbitrage_opportunities: arbitrageOpportunities || 0,
        total_profit_potential: Math.round(profitPotential) || 0
      };

      return NextResponse.json({
        success: true,
        data: stats,
        isDemo: false
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      
      return NextResponse.json({
        success: false,
        data: {
          total_games_analyzed: 0,
          value_bets_found: 0,
          avg_expected_value: 0,
          avg_confidence: 0,
          parlay_opportunities: 0,
          arbitrage_opportunities: 0,
          total_profit_potential: 0
        },
        isDemo: false,
        error: 'Database connection error - no data available'
      });
    }

  } catch (error) {
    console.error('Dashboard stats API error:', error);
    
    return NextResponse.json({
      success: false,
      data: {
        total_games_analyzed: 0,
        value_bets_found: 0,
        avg_expected_value: 0,
        avg_confidence: 0,
        parlay_opportunities: 0,
        arbitrage_opportunities: 0,
        total_profit_potential: 0
      },
      isDemo: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}