'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface QuickStatsProps {
  sport: string;
  data: any;
}

export function QuickStats({ sport, data }: QuickStatsProps) {
  const stats = [
    {
      label: 'Today\'s ROI',
      value: '+12.4%',
      change: '+3.2%',
      trend: 'up',
      icon: '📈',
      color: 'from-green-500 to-emerald-500'
    },
    {
      label: 'Active Bets',
      value: '14',
      subValue: '$2,340',
      icon: '🎯',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      label: 'Win Rate',
      value: '58.3%',
      change: '+2.1%',
      trend: 'up',
      icon: '🏆',
      color: 'from-purple-500 to-pink-500'
    },
    {
      label: 'Opportunities',
      value: '23',
      urgentCount: 5,
      icon: '💎',
      color: 'from-orange-500 to-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden"
        >
          <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
          <div className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <span className="text-2xl">{stat.icon}</span>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              {stat.change && (
                <div className="flex items-center space-x-1">
                  {stat.trend === 'up' ? (
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stat.change}
                  </span>
                </div>
              )}
              
              {stat.subValue && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {stat.subValue}
                </span>
              )}
              
              {stat.urgentCount && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                    {stat.urgentCount} urgent
                  </span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}