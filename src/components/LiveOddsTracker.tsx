'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LiveOddsTrackerProps {
  sport: string;
  compact?: boolean;
}

export function LiveOddsTracker({ sport, compact = false }: LiveOddsTrackerProps) {
  const [oddsData, setOddsData] = useState<any[]>([]);

  // Simulate live odds updates
  useEffect(() => {
    const generateOdds = () => {
      return [
        {
          id: '1',
          game: 'Lakers vs Celtics',
          bet: 'Lakers -3.5',
          currentOdds: -110,
          openingOdds: -115,
          movement: 'down',
          change: 5,
          volume: '$2.3M',
          sharpMoney: 'Lakers',
          publicPercentage: 45
        },
        {
          id: '2',
          game: 'Chiefs vs Bills',
          bet: 'Over 48.5',
          currentOdds: -105,
          openingOdds: -110,
          movement: 'up',
          change: 5,
          volume: '$1.8M',
          sharpMoney: 'Over',
          publicPercentage: 62
        }
      ];
    };

    setOddsData(generateOdds());
    
    const interval = setInterval(() => {
      setOddsData(prev => prev.map(odd => ({
        ...odd,
        currentOdds: odd.currentOdds + (Math.random() > 0.5 ? 5 : -5),
        volume: `$${(parseFloat(odd.volume.replace('$', '').replace('M', '')) + Math.random() * 0.1).toFixed(1)}M`,
        publicPercentage: Math.max(30, Math.min(70, odd.publicPercentage + (Math.random() > 0.5 ? 1 : -1)))
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [sport]);

  if (compact) {
    return (
      <div className="space-y-2">
        {oddsData.slice(0, 3).map((odd) => (
          <div key={odd.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{odd.bet}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{odd.game}</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-bold ${
                odd.movement === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {odd.currentOdds}
              </span>
              {odd.movement === 'up' ? (
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {oddsData.map((odd, index) => (
        <motion.div
          key={odd.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{odd.bet}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{odd.game}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {odd.currentOdds > 0 ? '+' : ''}{odd.currentOdds}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                from {odd.openingOdds}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Volume</p>
              <p className="font-bold text-gray-900 dark:text-white">{odd.volume}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Public</p>
              <p className="font-bold text-gray-900 dark:text-white">{odd.publicPercentage}%</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sharp</p>
              <p className="font-bold text-blue-600 dark:text-blue-400">{odd.sharpMoney}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Move</p>
              <div className="flex items-center justify-center space-x-1">
                <span className={`font-bold ${odd.movement === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {odd.change}
                </span>
                {odd.movement === 'up' ? (
                  <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Line Movement Chart (placeholder) */}
          <div className="mt-4 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Line movement chart</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}