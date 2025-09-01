/**
 * Data Storage Service - Store sports data for ML training
 */

import { UnifiedGame } from './unifiedApiService';

interface StoredGameData {
  id: string;
  timestamp: string;
  game: UnifiedGame;
  predictions?: any;
  actualResult?: {
    winner: string;
    finalScore: { home: number; away: number };
    totalPoints: number;
    spreadCovered: boolean;
  };
}

class DataStorageService {
  private static instance: DataStorageService;
  private gamesData: Map<string, StoredGameData> = new Map();
  private trainingData: any[] = [];

  private constructor() {}

  static getInstance(): DataStorageService {
    if (!DataStorageService.instance) {
      DataStorageService.instance = new DataStorageService();
    }
    return DataStorageService.instance;
  }

  // Store game data
  async storeGame(game: UnifiedGame): Promise<void> {
    const storedData: StoredGameData = {
      id: game.id,
      timestamp: new Date().toISOString(),
      game: game
    };
    
    this.gamesData.set(game.id, storedData);
    
    // Also prepare for training
    if (game.odds) {
      this.addToTrainingData(game);
    }
    
    console.log(`📊 Stored game data: ${game.awayTeam} @ ${game.homeTeam}`);
  }

  // Store multiple games
  async storeGames(games: UnifiedGame[]): Promise<void> {
    for (const game of games) {
      await this.storeGame(game);
    }
    console.log(`📊 Stored ${games.length} games for training`);
  }

  // Add to training dataset
  private addToTrainingData(game: UnifiedGame): void {
    const features = this.extractFeatures(game);
    if (features) {
      this.trainingData.push(features);
    }
  }

  // Extract ML features from game
  private extractFeatures(game: UnifiedGame): any {
    if (!game.odds) return null;

    return {
      gameId: game.id,
      sport: game.sport,
      
      // Betting lines
      spread: game.odds.spread,
      total: game.odds.overUnder,
      homeML: game.odds.homeML,
      awayML: game.odds.awayML,
      
      // Weather features (for outdoor sports)
      hasWeather: !!game.weather,
      temperature: game.weather?.temp || null,
      windSpeed: game.weather?.windSpeed || null,
      humidity: game.weather?.humidity || null,
      
      // Time features
      dayOfWeek: new Date(game.date).getDay(),
      hour: new Date(game.date).getHours(),
      month: new Date(game.date).getMonth(),
      
      // Venue
      venue: game.venue || 'Unknown',
      
      // To be filled after game completes
      actualWinner: null,
      actualSpreadCovered: null,
      actualTotal: null
    };
  }

  // Get training data
  getTrainingData(sport?: string): any[] {
    if (sport) {
      return this.trainingData.filter(d => d.sport === sport);
    }
    return this.trainingData;
  }

  // Get stored games
  getStoredGames(): StoredGameData[] {
    return Array.from(this.gamesData.values());
  }

  // Update game result
  async updateGameResult(gameId: string, result: any): Promise<void> {
    const stored = this.gamesData.get(gameId);
    if (stored) {
      stored.actualResult = result;
      
      // Update training data
      const trainingEntry = this.trainingData.find(d => d.gameId === gameId);
      if (trainingEntry) {
        trainingEntry.actualWinner = result.winner;
        trainingEntry.actualSpreadCovered = result.spreadCovered;
        trainingEntry.actualTotal = result.totalPoints;
      }
    }
  }

  // Export for training
  exportForTraining(): {
    features: number[][];
    labels: number[];
    metadata: any[];
  } {
    const validData = this.trainingData.filter(d => d.actualWinner !== null);
    
    const features = validData.map(d => [
      d.spread || 0,
      d.total || 0,
      d.homeML || -110,
      d.awayML || -110,
      d.temperature || 72,
      d.windSpeed || 0,
      d.humidity || 50,
      d.dayOfWeek,
      d.hour,
      d.month
    ]);
    
    const labels = validData.map(d => d.actualWinner === 'home' ? 1 : 0);
    
    return {
      features,
      labels,
      metadata: validData
    };
  }

  // Get stats
  getStats(): any {
    return {
      totalGamesStored: this.gamesData.size,
      trainingDataPoints: this.trainingData.length,
      gamesWithResults: this.trainingData.filter(d => d.actualWinner !== null).length,
      sports: [...new Set(this.trainingData.map(d => d.sport))],
      oldestGame: this.trainingData[0]?.gameId || null,
      newestGame: this.trainingData[this.trainingData.length - 1]?.gameId || null
    };
  }

  // Clear old data
  clearOldData(daysToKeep: number = 30): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);
    
    for (const [id, data] of this.gamesData.entries()) {
      if (new Date(data.timestamp) < cutoff) {
        this.gamesData.delete(id);
      }
    }
    
    // Also clean training data
    this.trainingData = this.trainingData.filter(d => {
      const gameData = this.gamesData.get(d.gameId);
      return gameData !== undefined;
    });
  }
}

export const dataStorage = DataStorageService.getInstance();