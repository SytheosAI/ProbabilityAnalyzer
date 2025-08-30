/**
 * PostgreSQL Database Connection Service
 * REAL database for REAL data storage - no more mock data!
 */

import { Pool, PoolClient } from 'pg';

// Database configuration - Update these with your actual PostgreSQL credentials
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'sports_analytics',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class DatabaseService {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    this.pool = new Pool(DB_CONFIG);
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      await this.createTables();
      this.initialized = true;
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }

  private async createTables() {
    const client = await this.pool.connect();
    try {
      // Games table
      await client.query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(100) UNIQUE NOT NULL,
          sport VARCHAR(20) NOT NULL,
          home_team VARCHAR(100) NOT NULL,
          away_team VARCHAR(100) NOT NULL,
          scheduled TIMESTAMP NOT NULL,
          home_score INTEGER,
          away_score INTEGER,
          status VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Predictions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS predictions (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(100) REFERENCES games(game_id),
          prediction_type VARCHAR(50) NOT NULL,
          predicted_outcome VARCHAR(100),
          confidence DECIMAL(5,4),
          probability DECIMAL(5,4),
          expected_value DECIMAL(10,2),
          actual_outcome VARCHAR(100),
          is_correct BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Odds table
      await client.query(`
        CREATE TABLE IF NOT EXISTS odds (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(100) REFERENCES games(game_id),
          book_name VARCHAR(100),
          market_type VARCHAR(50),
          home_odds INTEGER,
          away_odds INTEGER,
          spread DECIMAL(5,2),
          total DECIMAL(5,2),
          over_odds INTEGER,
          under_odds INTEGER,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Parlays table
      await client.query(`
        CREATE TABLE IF NOT EXISTS parlays (
          id SERIAL PRIMARY KEY,
          parlay_id VARCHAR(100) UNIQUE NOT NULL,
          legs JSONB NOT NULL,
          combined_odds INTEGER,
          total_probability DECIMAL(5,4),
          expected_value DECIMAL(10,2),
          risk_level VARCHAR(20),
          correlation_score DECIMAL(5,4),
          recommended BOOLEAN DEFAULT false,
          actual_outcome VARCHAR(20),
          payout DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Team Stats table
      await client.query(`
        CREATE TABLE IF NOT EXISTS team_stats (
          id SERIAL PRIMARY KEY,
          team_id VARCHAR(100) NOT NULL,
          sport VARCHAR(20) NOT NULL,
          season VARCHAR(20) NOT NULL,
          wins INTEGER,
          losses INTEGER,
          win_percentage DECIMAL(5,4),
          points_per_game DECIMAL(5,2),
          points_against_per_game DECIMAL(5,2),
          home_record VARCHAR(20),
          away_record VARCHAR(20),
          ats_record VARCHAR(20),
          over_under_record VARCHAR(20),
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(team_id, sport, season)
        )
      `);

      // Analysis Results table
      await client.query(`
        CREATE TABLE IF NOT EXISTS analysis_results (
          id SERIAL PRIMARY KEY,
          game_id VARCHAR(100) REFERENCES games(game_id),
          analysis_type VARCHAR(50),
          moneyline_pick VARCHAR(100),
          moneyline_confidence DECIMAL(5,4),
          spread_pick VARCHAR(100),
          spread_confidence DECIMAL(5,4),
          total_pick VARCHAR(20),
          total_confidence DECIMAL(5,4),
          best_bet VARCHAR(200),
          risk_assessment JSONB,
          value_opportunities JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // User Bets Tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_bets (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(100),
          bet_type VARCHAR(50),
          game_id VARCHAR(100),
          selection VARCHAR(200),
          odds INTEGER,
          stake DECIMAL(10,2),
          potential_payout DECIMAL(10,2),
          actual_payout DECIMAL(10,2),
          status VARCHAR(20) DEFAULT 'pending',
          placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          resolved_at TIMESTAMP
        )
      `);

      // Performance Metrics table
      await client.query(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id SERIAL PRIMARY KEY,
          date DATE NOT NULL,
          sport VARCHAR(20),
          total_predictions INTEGER,
          correct_predictions INTEGER,
          accuracy DECIMAL(5,4),
          total_value DECIMAL(10,2),
          roi DECIMAL(5,4),
          best_performing_model VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(date, sport)
        )
      `);

      console.log('All tables created successfully');
    } finally {
      client.release();
    }
  }

  // Save game data
  async saveGame(gameData: any): Promise<void> {
    const query = `
      INSERT INTO games (game_id, sport, home_team, away_team, scheduled, home_score, away_score, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (game_id) 
      DO UPDATE SET 
        home_score = EXCLUDED.home_score,
        away_score = EXCLUDED.away_score,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      gameData.game_id,
      gameData.sport,
      gameData.home_team,
      gameData.away_team,
      gameData.scheduled,
      gameData.home_score,
      gameData.away_score,
      gameData.status
    ]);
  }

  // Save prediction
  async savePrediction(prediction: any): Promise<void> {
    const query = `
      INSERT INTO predictions (
        game_id, prediction_type, predicted_outcome, confidence, 
        probability, expected_value
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await this.pool.query(query, [
      prediction.game_id,
      prediction.prediction_type,
      prediction.predicted_outcome,
      prediction.confidence,
      prediction.probability,
      prediction.expected_value
    ]);
  }

  // Save odds data
  async saveOdds(oddsData: any): Promise<void> {
    const query = `
      INSERT INTO odds (
        game_id, book_name, market_type, home_odds, away_odds,
        spread, total, over_odds, under_odds
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    await this.pool.query(query, [
      oddsData.game_id,
      oddsData.book_name,
      oddsData.market_type,
      oddsData.home_odds,
      oddsData.away_odds,
      oddsData.spread,
      oddsData.total,
      oddsData.over_odds,
      oddsData.under_odds
    ]);
  }

  // Save parlay
  async saveParlay(parlay: any): Promise<void> {
    const query = `
      INSERT INTO parlays (
        parlay_id, legs, combined_odds, total_probability,
        expected_value, risk_level, correlation_score, recommended
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (parlay_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      parlay.parlay_id,
      JSON.stringify(parlay.legs),
      parlay.combined_odds,
      parlay.total_probability,
      parlay.expected_value,
      parlay.risk_level,
      parlay.correlation_score,
      parlay.recommended
    ]);
  }

  // Save team statistics
  async saveTeamStats(stats: any): Promise<void> {
    const query = `
      INSERT INTO team_stats (
        team_id, sport, season, wins, losses, win_percentage,
        points_per_game, points_against_per_game, home_record, 
        away_record, ats_record, over_under_record
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (team_id, sport, season) 
      DO UPDATE SET
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        win_percentage = EXCLUDED.win_percentage,
        points_per_game = EXCLUDED.points_per_game,
        points_against_per_game = EXCLUDED.points_against_per_game,
        home_record = EXCLUDED.home_record,
        away_record = EXCLUDED.away_record,
        ats_record = EXCLUDED.ats_record,
        over_under_record = EXCLUDED.over_under_record,
        last_updated = CURRENT_TIMESTAMP
    `;
    
    await this.pool.query(query, [
      stats.team_id,
      stats.sport,
      stats.season || '2024',
      stats.wins,
      stats.losses,
      stats.win_percentage,
      stats.points_per_game,
      stats.points_against_per_game,
      stats.home_record,
      stats.away_record,
      stats.ats_record,
      stats.over_under_record
    ]);
  }

  // Get recent predictions
  async getRecentPredictions(limit: number = 10): Promise<any[]> {
    const query = `
      SELECT p.*, g.home_team, g.away_team, g.sport, g.scheduled
      FROM predictions p
      JOIN games g ON p.game_id = g.game_id
      ORDER BY p.created_at DESC
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    return result.rows;
  }

  // Get performance metrics
  async getPerformanceMetrics(sport?: string, days: number = 30): Promise<any[]> {
    let query = `
      SELECT * FROM performance_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
    `;
    
    if (sport) {
      query += ` AND sport = '${sport}'`;
    }
    
    query += ' ORDER BY date DESC';
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  // Update prediction outcome
  async updatePredictionOutcome(gameId: string, actualOutcome: string): Promise<void> {
    const query = `
      UPDATE predictions
      SET 
        actual_outcome = $2,
        is_correct = (predicted_outcome = $2),
        updated_at = CURRENT_TIMESTAMP
      WHERE game_id = $1
    `;
    
    await this.pool.query(query, [gameId, actualOutcome]);
  }

  // Get upcoming games with predictions
  async getUpcomingGamesWithPredictions(): Promise<any[]> {
    const query = `
      SELECT 
        g.*,
        p.prediction_type,
        p.predicted_outcome,
        p.confidence,
        p.probability,
        p.expected_value
      FROM games g
      LEFT JOIN predictions p ON g.game_id = p.game_id
      WHERE g.scheduled > CURRENT_TIMESTAMP
      ORDER BY g.scheduled ASC
      LIMIT 20
    `;
    
    const result = await this.pool.query(query);
    return result.rows;
  }

  // Calculate and save daily performance
  async calculateDailyPerformance(date: Date, sport?: string): Promise<void> {
    const dateStr = date.toISOString().split('T')[0];
    
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_correct = true THEN 1 ELSE 0 END) as correct,
        AVG(expected_value) as avg_value
      FROM predictions p
      JOIN games g ON p.game_id = g.game_id
      WHERE DATE(p.created_at) = $1
    `;
    
    const params = [dateStr];
    
    if (sport) {
      query += ' AND g.sport = $2';
      params.push(sport);
    }
    
    const result = await this.pool.query(query, params);
    const stats = result.rows[0];
    
    if (stats && stats.total > 0) {
      const accuracy = stats.correct / stats.total;
      
      await this.pool.query(`
        INSERT INTO performance_metrics (
          date, sport, total_predictions, correct_predictions,
          accuracy, total_value, roi
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (date, sport) 
        DO UPDATE SET
          total_predictions = EXCLUDED.total_predictions,
          correct_predictions = EXCLUDED.correct_predictions,
          accuracy = EXCLUDED.accuracy,
          total_value = EXCLUDED.total_value,
          roi = EXCLUDED.roi
      `, [
        dateStr,
        sport || 'ALL',
        stats.total,
        stats.correct,
        accuracy,
        stats.avg_value || 0,
        (accuracy * 100 - 50) // Simple ROI calculation
      ]);
    }
  }

  // Get database connection for transactions
  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  // Close database connection
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = new DatabaseService();

// Export types
export interface GameRecord {
  game_id: string;
  sport: string;
  home_team: string;
  away_team: string;
  scheduled: Date;
  home_score?: number;
  away_score?: number;
  status: string;
}

export interface PredictionRecord {
  game_id: string;
  prediction_type: string;
  predicted_outcome: string;
  confidence: number;
  probability: number;
  expected_value: number;
  actual_outcome?: string;
  is_correct?: boolean;
}

export interface ParlayRecord {
  parlay_id: string;
  legs: any[];
  combined_odds: number;
  total_probability: number;
  expected_value: number;
  risk_level: string;
  correlation_score: number;
  recommended: boolean;
}