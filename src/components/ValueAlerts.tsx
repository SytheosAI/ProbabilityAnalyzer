'use client';

import React, { useState, useEffect } from 'react';
import { ExpectedValueAnalysis, ValueRating } from '@/services/expectedValueService';
import { LineMovement } from '@/services/lineMovementService';

interface ValueAlert {
  id: string;
  timestamp: string;
  level: 'exceptional' | 'great' | 'good' | 'minimal';
  sport: string;
  game: string;
  analysis: ExpectedValueAnalysis;
  message: string;
  isNew: boolean;
  dismissed: boolean;
}

interface ValueAlertsProps {
  alerts?: ValueAlert[];
  onDismiss?: (alertId: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function ValueAlerts({ 
  alerts: initialAlerts = [],
  onDismiss,
  autoRefresh = true,
  refreshInterval = 30000 // 30 seconds
}: ValueAlertsProps) {
  const [alerts, setAlerts] = useState<ValueAlert[]>(initialAlerts);
  const [filter, setFilter] = useState<'all' | 'exceptional' | 'great' | 'good'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Alert level styling
  const getAlertStyle = (level: string) => {
    switch (level) {
      case 'exceptional':
        return {
          bg: 'bg-gradient-to-r from-green-500 to-emerald-500',
          border: 'border-green-500',
          text: 'text-green-500',
          icon: '🔥',
          pulse: true
        };
      case 'great':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          border: 'border-blue-500',
          text: 'text-blue-500',
          icon: '⭐',
          pulse: false
        };
      case 'good':
        return {
          bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
          border: 'border-purple-500',
          text: 'text-purple-500',
          icon: '💎',
          pulse: false
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
          border: 'border-gray-500',
          text: 'text-gray-500',
          icon: '📊',
          pulse: false
        };
    }
  };
  
  // Play sound for new alerts
  const playAlertSound = (level: string) => {
    if (!soundEnabled) return;
    
    // Different sounds for different alert levels
    const audio = new Audio();
    switch (level) {
      case 'exceptional':
        audio.src = '/sounds/exceptional-alert.mp3'; // High priority sound
        break;
      case 'great':
        audio.src = '/sounds/great-alert.mp3'; // Medium priority sound
        break;
      default:
        audio.src = '/sounds/default-alert.mp3'; // Default sound
    }
    
    audio.play().catch(e => console.log('Audio play failed:', e));
  };
  
  // Fetch REAL alerts from API
  useEffect(() => {
    if (!autoRefresh) return;
    
    const fetchNewAlerts = async () => {
      try {
        // Fetch REAL value opportunities from API
        const response = await fetch('/api/sports/value-alerts');
        if (response.ok) {
          const data = await response.json();
          if (data.alerts && data.alerts.length > 0) {
            setAlerts(prev => [...data.alerts, ...prev].slice(0, 20)); // Keep max 20 alerts
            data.alerts.forEach((alert: ValueAlert) => {
              if (alert.isNew) {
                playAlertSound(alert.level);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching value alerts:', error);
      }
    };
    
    // Initial fetch
    fetchNewAlerts();
    
    const interval = setInterval(fetchNewAlerts, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, soundEnabled]);
  
  // Mark alerts as not new after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAlerts(prev => prev.map(alert => ({ ...alert, isNew: false })));
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [alerts]);
  
  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (alert.dismissed) return false;
    if (filter === 'all') return true;
    return alert.level === filter;
  });
  
  // Handle dismissing alerts
  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
    if (onDismiss) onDismiss(alertId);
  };
  
  // Count alerts by level
  const alertCounts = {
    exceptional: alerts.filter(a => !a.dismissed && a.level === 'exceptional').length,
    great: alerts.filter(a => !a.dismissed && a.level === 'great').length,
    good: alerts.filter(a => !a.dismissed && a.level === 'good').length,
    total: alerts.filter(a => !a.dismissed).length
  };
  
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold">Value Alerts</h2>
            {alertCounts.total > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                {alertCounts.total}
              </span>
            )}
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded ${
              soundEnabled 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
            }`}
            title={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
          >
            {soundEnabled ? '🔔' : '🔕'}
          </button>
        </div>
        
        {/* Filter tabs */}
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            All ({alertCounts.total})
          </button>
          <button
            onClick={() => setFilter('exceptional')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'exceptional'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Exceptional ({alertCounts.exceptional})
          </button>
          <button
            onClick={() => setFilter('great')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'great'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Great ({alertCounts.great})
          </button>
          <button
            onClick={() => setFilter('good')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              filter === 'good'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}
          >
            Good ({alertCounts.good})
          </button>
        </div>
      </div>
      
      {/* Alerts list */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>No active value alerts</p>
            <p className="text-sm mt-1">Alerts will appear when value opportunities are detected</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAlerts.map(alert => {
              const style = getAlertStyle(alert.level);
              return (
                <div
                  key={alert.id}
                  className={`p-4 transition-all ${
                    alert.isNew ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                  } ${style.pulse ? 'animate-pulse' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`text-2xl ${style.pulse ? 'animate-bounce' : ''}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`text-xs font-bold uppercase ${style.text}`}>
                            {alert.level}
                          </span>
                          {alert.isNew && (
                            <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded animate-pulse">
                              NEW
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        
                        <div className="font-semibold text-sm mb-1">
                          {alert.sport} - {alert.game}
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {alert.message}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-xs">
                          <span>
                            EV: <span className={`font-bold ${style.text}`}>
                              +{alert.analysis.expectedValuePercent.toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            Edge: <span className="font-bold">
                              {(alert.analysis.edge * 100).toFixed(1)}%
                            </span>
                          </span>
                          <span>
                            Units: <span className="font-bold text-blue-500">
                              {alert.analysis.suggestedUnits}
                            </span>
                          </span>
                          <span>
                            Odds: <span className="font-bold">
                              {alert.analysis.currentOdds > 0 ? '+' : ''}{alert.analysis.currentOdds}
                            </span>
                          </span>
                        </div>
                        
                        {alert.analysis.lineMovement && (
                          <div className="mt-2 flex items-center space-x-2 text-xs">
                            {alert.analysis.lineMovement.steamMove && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded">
                                Steam Move
                              </span>
                            )}
                            {alert.analysis.lineMovement.reverseLineMovement && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                RLM
                              </span>
                            )}
                            {alert.analysis.sharpAnalysis?.sharpDisagreement && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                Sharp Money
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="ml-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Dismiss alert"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer with summary */}
      {filteredAlerts.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {filteredAlerts.length} active alert{filteredAlerts.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setAlerts(prev => prev.map(a => ({ ...a, dismissed: true })))}
              className="text-red-500 hover:text-red-600 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}