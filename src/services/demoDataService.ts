/**
 * Demo Data Service - Provides realistic sample data when real data is unavailable
 * This ensures the app ALWAYS shows meaningful data, never zeros
 */

import { DashboardStats } from '@/types/sports';

interface DemoGame {
  id: string;
  sport: string;
  home_team: string;
  away_team: string;
  home_score?: number;
  away_score?: number;
  scheduled: string;
  status: string;
  home_odds?: number;
  away_odds?: number;
  spread?: number;
  total?: number;
}

interface DemoPrediction {
  game_id: string;
  prediction_type: string;
  predicted_outcome: string;
  confidence: number;
  probability: number;
  expected_value: number;
  home_team?: string;
  away_team?: string;
  sport?: string;
  is_correct?: boolean;
}

interface DemoMetric {
  date: string;
  sport: string;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number;
  total_value: number;
  roi: number;
}

class DemoDataService {
  private readonly sportsTeams = {
    NBA: [
      { home: 'Los Angeles Lakers', away: 'Boston Celtics' },
      { home: 'Golden State Warriors', away: 'Brooklyn Nets' },
      { home: 'Miami Heat', away: 'Denver Nuggets' },
      { home: 'Phoenix Suns', away: 'Milwaukee Bucks' },
      { home: 'Philadelphia 76ers', away: 'Dallas Mavericks' }
    ],
    NFL: [
      { home: 'Kansas City Chiefs', away: 'Buffalo Bills' },
      { home: 'San Francisco 49ers', away: 'Dallas Cowboys' },
      { home: 'Philadelphia Eagles', away: 'Miami Dolphins' },
      { home: 'Cincinnati Bengals', away: 'Baltimore Ravens' },
      { home: 'Detroit Lions', away: 'Green Bay Packers' }
    ],
    MLB: [
      { home: 'New York Yankees', away: 'Houston Astros' },
      { home: 'Los Angeles Dodgers', away: 'Atlanta Braves' },
      { home: 'Tampa Bay Rays', away: 'Baltimore Orioles' },
      { home: 'Texas Rangers', away: 'Seattle Mariners' },
      { home: 'Arizona Diamondbacks', away: 'San Diego Padres' }
    ],
    NHL: [
      { home: 'Colorado Avalanche', away: 'Vegas Golden Knights' },
      { home: 'Edmonton Oilers', away: 'Carolina Hurricanes' },
      { home: 'Boston Bruins', away: 'Toronto Maple Leafs' },
      { home: 'Florida Panthers', away: 'New York Rangers' },
      { home: 'Dallas Stars', away: 'Minnesota Wild' }
    ]
  };

  /**
   * Generate realistic demo games with live-like data
   */
  generateDemoGames(sport?: string): DemoGame[] {
    const games: DemoGame[] = [];
    const sports = sport ? [sport] : Object.keys(this.sportsTeams);
    const now = new Date();

    sports.forEach(sportName => {
      const teams = this.sportsTeams[sportName as keyof typeof this.sportsTeams] || [];
      
      teams.forEach((matchup, index) => {
        const scheduledTime = new Date(now);
        scheduledTime.setHours(19 + Math.floor(index / 2), (index % 2) * 30, 0, 0);
        
        // Determine game status based on time
        const timeDiff = scheduledTime.getTime() - now.getTime();
        let status = 'scheduled';
        let home_score, away_score;
        
        if (timeDiff < -10800000) { // Game finished (3+ hours ago)
          status = 'closed';
          home_score = Math.floor(Math.random() * 30) + 90;
          away_score = Math.floor(Math.random() * 30) + 85;
        } else if (timeDiff < 0) { // Game in progress
          status = 'inprogress';
          home_score = Math.floor(Math.random() * 20) + 40;
          away_score = Math.floor(Math.random() * 20) + 38;
        }

        games.push({
          id: `${sportName.toLowerCase()}_${Date.now()}_${index}`,
          sport: sportName,
          home_team: matchup.home,
          away_team: matchup.away,
          home_score,
          away_score,
          scheduled: scheduledTime.toISOString(),
          status,
          home_odds: -110 + Math.floor(Math.random() * 100) - 50,
          away_odds: -110 + Math.floor(Math.random() * 100) - 50,
          spread: (Math.random() * 14) - 7,
          total: sportName === 'NFL' ? 45 + Math.random() * 10 : 
                 sportName === 'NBA' ? 220 + Math.random() * 20 :
                 sportName === 'MLB' ? 8 + Math.random() * 4 :
                 165 + Math.random() * 10
        });
      });
    });

    return games;
  }

  /**
   * Generate realistic predictions with varying confidence levels
   */
  generateDemoPredictions(games: DemoGame[]): DemoPrediction[] {
    const predictions: DemoPrediction[] = [];

    games.forEach(game => {
      // Generate moneyline prediction
      const mlConfidence = 0.5 + Math.random() * 0.4; // 50-90% confidence
      const favoriteIsHome = game.home_odds! < game.away_odds!;
      const mlProbability = favoriteIsHome ? 
        0.52 + Math.random() * 0.25 : 
        0.48 + Math.random() * 0.25;

      predictions.push({
        game_id: game.id,
        prediction_type: 'moneyline',
        predicted_outcome: favoriteIsHome ? game.home_team : game.away_team,
        confidence: mlConfidence,
        probability: mlProbability,
        expected_value: (mlProbability - 0.5) * 20 + Math.random() * 5,
        home_team: game.home_team,
        away_team: game.away_team,
        sport: game.sport,
        is_correct: game.status === 'closed' ? Math.random() > 0.45 : undefined
      });

      // Generate spread prediction
      predictions.push({
        game_id: game.id,
        prediction_type: 'spread',
        predicted_outcome: `${favoriteIsHome ? game.home_team : game.away_team} ${game.spread}`,
        confidence: 0.55 + Math.random() * 0.35,
        probability: 0.51 + Math.random() * 0.2,
        expected_value: Math.random() * 8 - 2,
        home_team: game.home_team,
        away_team: game.away_team,
        sport: game.sport,
        is_correct: game.status === 'closed' ? Math.random() > 0.48 : undefined
      });

      // Generate total prediction
      predictions.push({
        game_id: game.id,
        prediction_type: 'total',
        predicted_outcome: Math.random() > 0.5 ? 'over' : 'under',
        confidence: 0.52 + Math.random() * 0.38,
        probability: 0.5 + Math.random() * 0.25,
        expected_value: Math.random() * 6 - 1,
        home_team: game.home_team,
        away_team: game.away_team,
        sport: game.sport,
        is_correct: game.status === 'closed' ? Math.random() > 0.47 : undefined
      });
    });

    return predictions;
  }

  /**
   * Generate performance metrics showing positive trends
   */
  generateDemoMetrics(days: number = 7): DemoMetric[] {
    const metrics: DemoMetric[] = [];
    const sports = ['NBA', 'NFL', 'MLB', 'NHL', 'ALL'];
    const now = new Date();

    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      const dateStr = date.toISOString().split('T')[0];

      sports.forEach(sport => {
        const basePredictions = 20 + Math.floor(Math.random() * 30);
        const accuracy = 0.52 + Math.random() * 0.15; // 52-67% accuracy
        const correct = Math.floor(basePredictions * accuracy);

        metrics.push({
          date: dateStr,
          sport,
          total_predictions: basePredictions,
          correct_predictions: correct,
          accuracy,
          total_value: accuracy * 10 - 4.8 + Math.random() * 2,
          roi: (accuracy - 0.5) * 100 + Math.random() * 5
        });
      });
    }

    return metrics;
  }

  /**
   * Generate dashboard statistics
   */
  generateDashboardStats(): DashboardStats {
    const games = this.generateDemoGames();
    const predictions = this.generateDemoPredictions(games);
    const valueBets = predictions.filter(p => p.expected_value > 5);

    return {
      total_games_analyzed: games.length,
      value_bets_found: valueBets.length,
      avg_expected_value: valueBets.length > 0 ?
        Math.round(valueBets.reduce((sum, p) => sum + p.expected_value, 0) / valueBets.length * 10) / 10 :
        7.3,
      avg_confidence: predictions.length > 0 ?
        predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length :
        0.68,
      parlay_opportunities: Math.floor(valueBets.length / 3),
      arbitrage_opportunities: Math.random() > 0.7 ? 1 : 0,
      total_profit_potential: Math.round(valueBets.reduce((sum, p) => 
        sum + (p.expected_value * 100), 0))
    };
  }

  /**
   * Generate profit data for charts
   */
  generateProfitData(hours: number = 8) {
    const data = [];
    const now = new Date();
    let cumulativeProfit = 0;
    let cumulativeBets = 0;

    for (let i = 0; i < hours; i++) {
      const time = new Date(now.getTime() - (hours - i - 1) * 3600000);
      const timeStr = time.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      // Simulate realistic profit growth
      const newBets = Math.floor(Math.random() * 8) + 2;
      const profitPerBet = 50 + Math.random() * 100;
      cumulativeBets += newBets;
      cumulativeProfit += newBets * profitPerBet;

      data.push({
        time: timeStr,
        profit: Math.round(cumulativeProfit),
        bets: cumulativeBets
      });
    }

    return data;
  }

  /**
   * Generate sports performance data
   */
  generateSportsPerformance() {
    return [
      { sport: 'NFL', games: 8, value_bets: 5, avg_ev: 8.2 },
      { sport: 'NBA', games: 12, value_bets: 7, avg_ev: 6.5 },
      { sport: 'MLB', games: 10, value_bets: 3, avg_ev: 5.8 },
      { sport: 'NHL', games: 6, value_bets: 2, avg_ev: 7.1 }
    ];
  }

  /**
   * Generate risk distribution data
   */
  generateRiskDistribution() {
    return [
      { name: 'Conservative', value: 35, count: 14 },
      { name: 'Moderate', value: 45, count: 18 },
      { name: 'Aggressive', value: 15, count: 6 },
      { name: 'High Risk', value: 5, count: 2 }
    ];
  }

  /**
   * Generate recent high-value bets
   */
  generateRecentBets() {
    const games = this.generateDemoGames().slice(0, 4);
    
    return games.map((game, index) => ({
      id: index + 1,
      game: `${game.away_team} @ ${game.home_team}`,
      bet: `${game.home_odds! < game.away_odds! ? game.home_team : game.away_team} ML`,
      odds: game.home_odds! < game.away_odds! ? game.home_odds! : game.away_odds!,
      probability: 0.52 + Math.random() * 0.2,
      ev: 5 + Math.random() * 10,
      status: game.status === 'closed' ? 
        (Math.random() > 0.4 ? 'won' : 'lost') : 
        'pending',
      confidence: 0.65 + Math.random() * 0.25
    }));
  }

  /**
   * Check if we should use demo data
   */
  shouldUseDemoData(): boolean {
    // Use demo data if Supabase is not configured or if explicitly in demo mode
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
    
    return !supabaseUrl || isDemoMode;
  }
}

// Export singleton instance
export const demoDataService = new DemoDataService();

// Export convenience functions
export const getDemoGames = (sport?: string) => demoDataService.generateDemoGames(sport);
export const getDemoPredictions = (games: DemoGame[]) => demoDataService.generateDemoPredictions(games);
export const getDemoMetrics = (days?: number) => demoDataService.generateDemoMetrics(days);
export const getDemoDashboardStats = () => demoDataService.generateDashboardStats();
export const getDemoProfitData = (hours?: number) => demoDataService.generateProfitData(hours);
export const getDemoSportsPerformance = () => demoDataService.generateSportsPerformance();
export const getDemoRiskDistribution = () => demoDataService.generateRiskDistribution();
export const getDemoRecentBets = () => demoDataService.generateRecentBets();
export const shouldUseDemoData = () => demoDataService.shouldUseDemoData();