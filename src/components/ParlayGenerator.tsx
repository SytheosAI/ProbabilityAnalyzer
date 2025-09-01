'use client';

import React, { useState } from 'react';

interface ParlayGeneratorProps {
  selectedBets: any[];
  sport: string;
}

export function ParlayGenerator({ selectedBets, sport }: ParlayGeneratorProps) {
  const [parlayType, setParlayType] = useState('standard');

  const calculateParlayOdds = (bets: any[]) => {
    let totalOdds = 1;
    bets.forEach(bet => {
      const decimal = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
      totalOdds *= decimal;
    });
    return totalOdds;
  };

  // Kelly Criterion calculation
  const calculateKellyFraction = (odds: number) => {
    const impliedProbability = 1 / odds;
    const trueProbability = impliedProbability * 1.05; // Assume 5% edge for demo
    const decimalOdds = odds - 1;
    
    if (trueProbability <= impliedProbability) return 0;
    
    const kellyFraction = (trueProbability * decimalOdds - (1 - trueProbability)) / decimalOdds;
    return Math.max(0, Math.min(kellyFraction, 0.25)); // Cap at 25%
  };

  // Expected Value calculation
  const calculateExpectedValue = (odds: number) => {
    const impliedProbability = 1 / odds;
    const trueProbability = impliedProbability * 1.05; // Assume 5% edge for demo
    const expectedReturn = trueProbability * odds;
    return (expectedReturn - 1) * 100; // Convert to percentage
  };

  // Correlation risk assessment
  const calculateCorrelationRisk = (bets: any[]) => {
    if (bets.length <= 1) return 'None';
    
    const sportsInvolved = new Set(bets.map(bet => bet.sport || sport));
    const sameGameBets = bets.filter(bet => 
      bets.some(other => other.game === bet.game && other.id !== bet.id)
    ).length;
    
    if (sameGameBets > 0) return 'High - Same game bets';
    if (sportsInvolved.size === 1) return 'Medium - Same sport';
    return 'Low - Different sports';
  };

  // Risk level assessment
  const getRiskLevel = (kellyFraction: number) => {
    if (kellyFraction < 0.02) return 'Very Low';
    if (kellyFraction < 0.05) return 'Low';
    if (kellyFraction < 0.10) return 'Medium';
    if (kellyFraction < 0.15) return 'High';
    return 'Very High';
  };

  // Risk color coding
  const getRiskColor = (kellyFraction: number) => {
    if (kellyFraction < 0.02) return 'text-green-600 dark:text-green-400';
    if (kellyFraction < 0.05) return 'text-blue-600 dark:text-blue-400';
    if (kellyFraction < 0.10) return 'text-yellow-600 dark:text-yellow-400';
    if (kellyFraction < 0.15) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const totalOdds = calculateParlayOdds(selectedBets);
  const americanOdds = totalOdds >= 2 ? (totalOdds - 1) * 100 : -100 / (totalOdds - 1);

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Parlay Builder
        </h3>

        {/* Parlay Type Selection */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['standard', 'round-robin', 'teaser'].map((type) => (
            <button
              key={type}
              onClick={() => setParlayType(type)}
              className={`p-3 rounded-lg border-2 transition-all ${
                parlayType === type
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white capitalize">{type}</p>
            </button>
          ))}
        </div>

        {/* Selected Bets */}
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedBets.length} legs selected
          </p>
          {selectedBets.map((bet) => (
            <div key={bet.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-sm text-gray-900 dark:text-white">{bet.selection}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{bet.game}</p>
              </div>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {bet.odds > 0 ? '+' : ''}{bet.odds}
              </span>
            </div>
          ))}
        </div>

        {/* Parlay Summary */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Parlay Odds</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {americanOdds > 0 ? '+' : ''}{americanOdds.toFixed(0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">$100 wins</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${((totalOdds - 1) * 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Advanced Betting Analysis */}
        <div className="mt-6 space-y-4">
          {/* AI Recommendations */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">AI Analysis</h4>
            <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-400">
              <li>• Correlation risk: {calculateCorrelationRisk(selectedBets)}</li>
              <li>• Success probability: {(100 / totalOdds).toFixed(1)}%</li>
              <li>• Kelly fraction: {calculateKellyFraction(totalOdds).toFixed(3)}</li>
              <li>• Expected value: {calculateExpectedValue(totalOdds).toFixed(2)}%</li>
            </ul>
          </div>

          {/* Kelly Criterion Calculator */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-300 mb-3">Kelly Criterion</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Optimal Bet Size</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {(calculateKellyFraction(totalOdds) * 100).toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500">of bankroll</p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Risk Assessment</p>
                <p className="text-lg font-semibold">
                  <span className={`${getRiskColor(calculateKellyFraction(totalOdds))}`}>
                    {getRiskLevel(calculateKellyFraction(totalOdds))}
                  </span>
                </p>
                <p className="text-xs text-gray-500">volatility level</p>
              </div>
            </div>
          </div>

          {/* Expected Value Analysis */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-3">Value Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">True Odds:</span>
                <span className="font-medium">+{Math.round((totalOdds - 1) * 100 * 0.95)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Bookmaker Odds:</span>
                <span className="font-medium">+{Math.round((totalOdds - 1) * 100)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-gray-600 dark:text-gray-400">Edge:</span>
                <span className={`font-bold ${calculateExpectedValue(totalOdds) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {calculateExpectedValue(totalOdds).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Bankroll Recommendations */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="font-medium text-orange-900 dark:text-orange-300 mb-3">Bankroll Management</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Conservative</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  ${(10000 * calculateKellyFraction(totalOdds) * 0.25).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Recommended</p>
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  ${(10000 * calculateKellyFraction(totalOdds) * 0.5).toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Aggressive</p>
                <p className="text-lg font-bold text-orange-800 dark:text-orange-200">
                  ${(10000 * calculateKellyFraction(totalOdds)).toFixed(0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              Based on $10,000 bankroll
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}