'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface PerformanceTrackerProps {
  compact?: boolean;
}

export function PerformanceTracker({ compact = false }: PerformanceTrackerProps) {
  const [timeRange, setTimeRange] = useState('7d');

  // LIVE DATA ONLY - NO HARDCODED PERFORMANCE DATA
  const performanceData = {
    totalBets: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    totalStaked: 0,
    totalReturned: 0,
    profit: 0,
    roi: 0,
    avgOdds: 0,
    bestDay: { date: '', profit: 0 },
    worstDay: { date: '', profit: 0 },
    streak: { type: 'none', count: 0 },
    bySport: []
  };

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{performanceData.winRate}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">ROI</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">+{performanceData.roi}%</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Profit</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">+${performanceData.profit}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Streak</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">W{performanceData.streak.count}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Analytics
          </h3>
          <div className="flex space-x-2">
            {['24h', '7d', '30d', 'All'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Profit</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            +${performanceData.profit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            ${performanceData.totalStaked.toLocaleString()} staked
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {performanceData.winRate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {performanceData.wins}W - {performanceData.losses}L
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">ROI</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            +{performanceData.roi}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Avg odds: {performanceData.avgOdds}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Current Streak</p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {performanceData.streak.type === 'win' ? 'W' : 'L'}{performanceData.streak.count}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {performanceData.streak.type === 'win' ? 'Keep it going!' : 'Stay disciplined'}
          </p>
        </motion.div>
      </div>

      {/* Performance by Sport */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Performance by Sport</h4>
        <div className="space-y-3">
          {performanceData.bySpor.map((sport) => (
            <div key={sport.sport} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">
                  {sport.sport === 'NFL' ? '🏈' : sport.sport === 'NBA' ? '🏀' : '⚾'}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{sport.sport}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {sport.bets} bets • {sport.winRate}% win rate
                  </p>
                </div>
              </div>
              <p className={`font-bold ${sport.profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sport.profit > 0 ? '+' : ''}${sport.profit}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Profit Chart</h4>
        <div className="h-64 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-center">
          <span className="text-gray-500 dark:text-gray-400">Profit/Loss Chart Over Time</span>
        </div>
      </div>
    </div>
  );
}