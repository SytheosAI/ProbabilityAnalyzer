import { useState, useEffect } from 'react';

interface UserPreferences {
  experience: string;
  bankroll: number;
  favoredSports: string[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  goals: string;
  notifications: boolean;
  theme: 'light' | 'dark' | 'auto';
  defaultView: string;
  autoRefresh: boolean;
  betSizing: 'kelly' | 'fixed' | 'percentage';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  experience: 'intermediate',
  bankroll: 1000,
  favoredSports: ['nfl', 'nba'],
  riskTolerance: 'moderate',
  goals: 'side',
  notifications: true,
  theme: 'auto',
  defaultView: 'overview',
  autoRefresh: true,
  betSizing: 'kelly'
};

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load preferences from localStorage
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem('user_preferences');
        if (stored) {
          setPreferences(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = (updates: Partial<UserPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    // Save to localStorage
    try {
      localStorage.setItem('user_preferences', JSON.stringify(newPreferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
    localStorage.removeItem('user_preferences');
  };

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    isLoading
  };
}