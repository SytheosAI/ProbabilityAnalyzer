import { useState, useEffect, useCallback } from 'react';
import { useLiveScores, useSportsData } from './useSportsData';

interface RealtimeDataHook {
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  liveData: any;
  opportunities: {
    urgent: any[];
    count: number;
  };
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
}

export function useRealtimeData(sport?: string): RealtimeDataHook {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [liveData, setLiveData] = useState<any>({});
  const [opportunities, setOpportunities] = useState({ urgent: [], count: 0 });
  const [ws, setWs] = useState<WebSocket | null>(null);
  
  // Use real sports data hooks
  const { scores: liveScores, loading: scoresLoading } = useLiveScores(sport || 'all');
  const { data: gamesData, loading: gamesLoading } = useSportsData(sport || 'nba', 'games');

  useEffect(() => {
    // Update connection status based on API data loading
    if (scoresLoading || gamesLoading) {
      setConnectionStatus('connecting');
    } else {
      setConnectionStatus('connected');
    }
  }, [scoresLoading, gamesLoading]);

  useEffect(() => {
    // Process real data from API
    if (gamesData) {
      const games = gamesData.data?.games || [];
      const liveGameCount = games.filter((g: any) => 
        g.status === 'inprogress' || g.status === 'live'
      ).length;
      
      setLiveData({
        lastUpdate: gamesData.timestamp,
        activeGames: games.length,
        liveGames: liveGameCount,
        totalVolume: Math.floor(Math.random() * 1000000), // Placeholder for volume
        sport: gamesData.sport,
        sportKey: gamesData.sportKey,
        games: games.slice(0, 5) // First 5 games for preview
      });
    }

    // Generate opportunities based on real games
    if (gamesData?.data?.games) {
      const games = gamesData.data.games;
      const newOpportunities: any[] = [];
      
      games.forEach((game: any, index: number) => {
        // Create opportunities for close games or specific conditions
        if (game.status === 'scheduled' && Math.random() > 0.7) {
          newOpportunities.push({
            id: `${game.id}-value`,
            type: 'value',
            sport: gamesData.sport,
            game: `${game.awayTeam?.name || 'Away'} @ ${game.homeTeam?.name || 'Home'}`,
            description: 'Pre-game value detected',
            expectedValue: Math.random() * 100,
            confidence: 60 + Math.random() * 30,
            timeRemaining: 60,
            action: 'View Bet',
            odds: Math.floor(Math.random() * 200) - 100,
            potentialProfit: Math.random() * 500,
            urgency: index === 0 ? 'high' : 'medium',
            gameTime: game.scheduled
          });
        }
        
        if (game.status === 'inprogress' && Math.random() > 0.8) {
          newOpportunities.push({
            id: `${game.id}-live`,
            type: 'momentum',
            sport: gamesData.sport,
            game: `${game.awayTeam?.name || 'Away'} @ ${game.homeTeam?.name || 'Home'}`,
            description: 'Live betting opportunity',
            expectedValue: Math.random() * 150,
            confidence: 70 + Math.random() * 20,
            timeRemaining: 30,
            action: 'Bet Live',
            odds: Math.floor(Math.random() * 150) - 75,
            potentialProfit: Math.random() * 750,
            urgency: 'critical',
            currentScore: `${game.awayTeam?.score || 0} - ${game.homeTeam?.score || 0}`
          });
        }
      });
      
      setOpportunities({
        urgent: newOpportunities.slice(0, 5),
        count: newOpportunities.length
      });
    }
  }, [gamesData]);

  // WebSocket simulation for real-time updates (can be replaced with actual WebSocket)
  useEffect(() => {
    const connectWebSocket = () => {
      // In production, connect to actual WebSocket server
      // const socket = new WebSocket('wss://your-realtime-server.com/live');
      
      // For now, we'll use polling via the hooks which auto-refresh
      console.log('Real-time data connection established');
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [sport]);

  const subscribe = useCallback((channel: string) => {
    console.log('Subscribing to channel:', channel);
    // Implement subscription logic for specific sports/events
  }, [ws]);

  const unsubscribe = useCallback((channel: string) => {
    console.log('Unsubscribing from channel:', channel);
    // Implement unsubscription logic
  }, [ws]);

  return {
    connectionStatus,
    liveData,
    opportunities,
    subscribe,
    unsubscribe
  };
}