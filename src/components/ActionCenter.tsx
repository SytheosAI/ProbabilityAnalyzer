'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Opportunity {
  id: string;
  type: 'value' | 'arbitrage' | 'momentum' | 'injury' | 'weather';
  sport: string;
  game: string;
  description: string;
  expectedValue: number;
  confidence: number;
  timeRemaining: number; // minutes until opportunity expires
  action: string;
  odds: number;
  stake?: number;
  potentialProfit: number;
  urgency: 'critical' | 'high' | 'medium' | 'low';
}

interface ActionCenterProps {
  opportunities: {
    urgent: Opportunity[];
    count: number;
  };
  onSelectBet: (bet: any) => void;
}

export function ActionCenter({ opportunities, onSelectBet }: ActionCenterProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: number }>({});

  // Update countdown timers
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const updated = { ...prev };
        opportunities?.urgent?.forEach(opp => {
          if (!dismissedIds.has(opp.id)) {
            updated[opp.id] = Math.max(0, (updated[opp.id] || opp.timeRemaining) - 1);
          }
        });
        return updated;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [opportunities, dismissedIds]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'from-red-500 to-red-600';
      case 'high': return 'from-orange-500 to-orange-600';
      case 'medium': return 'from-yellow-500 to-yellow-600';
      default: return 'from-blue-500 to-blue-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'value': return '💎';
      case 'arbitrage': return '⚖️';
      case 'momentum': return '🚀';
      case 'injury': return '🏥';
      case 'weather': return '🌦️';
      default: return '📊';
    }
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const visibleOpportunities = opportunities?.urgent?.filter(
    opp => !dismissedIds.has(opp.id) && (timeLeft[opp.id] || opp.timeRemaining) > 0
  ) || [];

  if (visibleOpportunities.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping absolute"></div>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Action Required
          </h2>
          <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
            {visibleOpportunities.length} Opportunities
          </span>
        </div>
        <button
          onClick={() => setDismissedIds(new Set([...dismissedIds, ...visibleOpportunities.map(o => o.id)]))}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Dismiss All
        </button>
      </div>

      {/* Opportunity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {visibleOpportunities.map((opportunity) => (
            <motion.div
              key={opportunity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
            >
              {/* Urgency Gradient Bar */}
              <div className={`h-1 bg-gradient-to-r ${getUrgencyColor(opportunity.urgency)}`} />
              
              {/* Card Content */}
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getTypeIcon(opportunity.type)}</span>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {opportunity.type}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {opportunity.sport}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissedIds(new Set([...dismissedIds, opportunity.id]))}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Game Info */}
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {opportunity.game}
                </p>

                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {opportunity.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Expected Value</p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      +${opportunity.expectedValue.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Confidence</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {opportunity.confidence}%
                    </p>
                  </div>
                </div>

                {/* Time Remaining */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTimeRemaining(timeLeft[opportunity.id] || opportunity.timeRemaining)} remaining
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    @ {opportunity.odds > 0 ? '+' : ''}{opportunity.odds}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => onSelectBet(opportunity)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200"
                  >
                    {opportunity.action}
                  </button>
                  <button
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* Progress Bar for Time */}
              <div className="h-1 bg-gray-200 dark:bg-gray-700">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000"
                  style={{ 
                    width: `${((timeLeft[opportunity.id] || opportunity.timeRemaining) / opportunity.timeRemaining) * 100}%` 
                  }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}