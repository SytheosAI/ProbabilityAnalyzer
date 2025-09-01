'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface ValueBetFinderProps {
  sport: string;
  compact?: boolean;
  limit?: number;
  onSelectBet?: (bets: any) => void;
}

export function ValueBetFinder({ sport, compact = false, limit, onSelectBet }: ValueBetFinderProps) {
  // Mock value bets data
  const valueBets = [
    {
      id: '1',
      game: 'Lakers vs Celtics',
      bet: 'Lakers -3.5',
      odds: -110,
      expectedValue: 4.2,
      confidence: 68,
      edgePercentage: 3.8,
      recommendation: 'Strong Buy',
      reason: 'Line movement indicates sharp money'
    },
    {
      id: '2',
      game: 'Chiefs vs Bills',
      bet: 'Over 48.5',
      odds: -105,
      expectedValue: 3.1,
      confidence: 62,
      edgePercentage: 2.9,
      recommendation: 'Buy',
      reason: 'Weather conditions favor scoring'
    },
    {
      id: '3',
      game: 'Yankees vs Red Sox',
      bet: 'Yankees ML',
      odds: +125,
      expectedValue: 5.7,
      confidence: 71,
      edgePercentage: 4.5,
      recommendation: 'Strong Buy',
      reason: 'Pitching matchup heavily favors Yankees'
    }
  ];

  const displayBets = limit ? valueBets.slice(0, limit) : valueBets;

  if (compact) {
    return (
      <div className="space-y-2">
        {displayBets.map((bet) => (
          <div key={bet.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-sm text-gray-900 dark:text-white">{bet.bet}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{bet.game}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-green-600 dark:text-green-400">
                +{bet.expectedValue}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {bet.confidence}% conf
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            High Value Opportunities
          </h3>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
              {valueBets.length} Found
            </span>
          </div>
        </div>
      </div>

      {/* Value Bets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {displayBets.map((bet, index) => (
          <motion.div
            key={bet.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
          >
            {/* Edge Indicator Bar */}
            <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500" 
                 style={{ width: `${bet.confidence}%` }} />
            
            <div className="p-6">
              {/* Recommendation Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  bet.recommendation === 'Strong Buy' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}>
                  {bet.recommendation}
                </span>
                <span className="text-2xl">💎</span>
              </div>

              {/* Bet Details */}
              <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                {bet.bet}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {bet.game}
              </p>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">EV</p>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    +{bet.expectedValue}%
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Edge</p>
                  <p className="font-bold text-blue-600 dark:text-blue-400">
                    {bet.edgePercentage}%
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Conf</p>
                  <p className="font-bold text-purple-600 dark:text-purple-400">
                    {bet.confidence}%
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Why: </span>{bet.reason}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => onSelectBet && onSelectBet([{
                    ...bet,
                    type: 'Value',
                    sport: sport
                  }])}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
                >
                  Add to Slip
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                  Analysis
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}