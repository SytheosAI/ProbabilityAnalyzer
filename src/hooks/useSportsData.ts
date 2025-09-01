import { useState, useEffect, useCallback } from 'react';

interface SportsDataHook {
  data: any;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  lastFetched: Date | null;
}

export function useSportsData(sport: string, dataType: string = 'games'): SportsDataHook {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!sport || sport === 'all') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sports/${sport}?type=${dataType}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to fetch ${sport} data`);
      }

      const result = await response.json();
      setData(result);
      setLastFetched(new Date());
      
      console.log(`Fetched ${sport} ${dataType}:`, result);
    } catch (err) {
      console.error(`Error fetching ${sport} data:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [sport, dataType]);

  useEffect(() => {
    fetchData();
    
    // Refresh data every minute
    const interval = setInterval(fetchData, 60000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastFetched
  };
}

// Hook to get overview of all sports
export function useSportsOverview(includeGames: boolean = false) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sports?includeGames=${includeGames}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sports overview');
      }

      const result = await response.json();
      setData(result);
      
      console.log('Sports overview:', result);
    } catch (err) {
      console.error('Error fetching sports overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch overview');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [includeGames]);

  useEffect(() => {
    fetchOverview();
    
    // Refresh overview every 5 minutes
    const interval = setInterval(fetchOverview, 300000);
    
    return () => clearInterval(interval);
  }, [fetchOverview]);

  return {
    data,
    loading,
    error,
    refetch: fetchOverview
  };
}

// Hook for live scores with more frequent updates
export function useLiveScores(sport: string) {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveScores = useCallback(async () => {
    if (!sport || sport === 'all') {
      // Fetch live scores for all sports
      try {
        const sports = ['nba', 'nfl', 'mlb', 'nhl', 'soccer', 'tennis'];
        const promises = sports.map(s => 
          fetch(`/api/sports/${s}?type=live`)
            .then(res => res.ok ? res.json() : null)
            .catch(() => null)
        );
        
        const results = await Promise.all(promises);
        const allScores = results
          .filter(r => r && r.data)
          .flatMap(r => r.data);
        
        setScores(allScores);
        setError(null);
      } catch (err) {
        console.error('Error fetching live scores:', err);
        setError('Failed to fetch live scores');
      }
    } else {
      // Fetch live scores for specific sport
      try {
        const response = await fetch(`/api/sports/${sport}?type=live`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch live scores');
        }

        const result = await response.json();
        setScores(result.data || []);
        setError(null);
      } catch (err) {
        console.error(`Error fetching ${sport} live scores:`, err);
        setError(err instanceof Error ? err.message : 'Failed to fetch live scores');
        setScores([]);
      }
    }
    
    setLoading(false);
  }, [sport]);

  useEffect(() => {
    fetchLiveScores();
    
    // Refresh live scores every 30 seconds
    const interval = setInterval(fetchLiveScores, 30000);
    
    return () => clearInterval(interval);
  }, [fetchLiveScores]);

  return {
    scores,
    loading,
    error,
    refetch: fetchLiveScores
  };
}

// Hook for standings
export function useStandings(sport: string) {
  return useSportsData(sport, 'standings');
}

// Hook for odds (placeholder since Sports Radar trial doesn't include odds)
export function useOdds(sport: string) {
  const [odds, setOdds] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Simulate odds data since it's not available in Sports Radar trial
    if (sport && sport !== 'all') {
      setLoading(true);
      setTimeout(() => {
        setOdds([
          {
            game: 'Sample Game 1',
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            moneyline: { home: -150, away: +130 },
            spread: { line: -3.5, homeOdds: -110, awayOdds: -110 },
            total: { line: 215.5, overOdds: -110, underOdds: -110 }
          }
        ]);
        setLoading(false);
      }, 1000);
    }
  }, [sport]);
  
  return { odds, loading, error: null };
}