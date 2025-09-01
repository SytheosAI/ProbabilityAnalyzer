'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Bet {
  id: string;
  sport: string;
  game: string;
  type: string;
  selection: string;
  odds: number;
  stake?: number;
  potentialWin?: number;
  confidence?: number;
  analysis?: string;
}

interface BettingWorkflowProps {
  selectedBets: Bet[];
  onUpdateBets: (bets: Bet[]) => void;
}

export function BettingWorkflow({ selectedBets, onUpdateBets }: BettingWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [bankroll, setBankroll] = useState(1000);
  const [riskProfile, setRiskProfile] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [betAmounts, setBetAmounts] = useState<{ [key: string]: number }>({});
  const [parlayMode, setParlayMode] = useState(false);
  const [finalizedBets, setFinalizedBets] = useState<Bet[]>([]);

  const STEPS = [
    { id: 1, name: 'Review Selections', icon: '📋' },
    { id: 2, name: 'Set Stakes', icon: '💰' },
    { id: 3, name: 'Risk Analysis', icon: '📊' },
    { id: 4, name: 'Confirm & Place', icon: '✅' },
  ];

  // Calculate Kelly Criterion for optimal bet sizing
  const calculateKellyCriterion = (odds: number, confidence: number) => {
    const decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
    const probability = confidence / 100;
    const edge = (probability * decimalOdds) - 1;
    const kellyPercentage = edge / (decimalOdds - 1);
    return Math.max(0, Math.min(kellyPercentage, 0.25)); // Cap at 25% of bankroll
  };

  // Auto-calculate recommended stakes based on Kelly Criterion
  useEffect(() => {
    const amounts: { [key: string]: number } = {};
    selectedBets.forEach(bet => {
      const kellyFraction = calculateKellyCriterion(bet.odds, bet.confidence || 55);
      const riskMultiplier = riskProfile === 'conservative' ? 0.25 : 
                            riskProfile === 'moderate' ? 0.5 : 1;
      amounts[bet.id] = Math.round(bankroll * kellyFraction * riskMultiplier);
    });
    setBetAmounts(amounts);
  }, [selectedBets, bankroll, riskProfile]);

  const totalStake = Object.values(betAmounts).reduce((sum, amount) => sum + amount, 0);
  const totalPotentialWin = selectedBets.reduce((sum, bet) => {
    const stake = betAmounts[bet.id] || 0;
    const decimalOdds = bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1;
    return sum + (stake * decimalOdds);
  }, 0);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Review Your Selections ({selectedBets.length})
            </h3>
            
            {/* Bet Type Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Bet Type</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {parlayMode ? 'Combine all selections into one bet' : 'Place each bet individually'}
                </p>
              </div>
              <button
                onClick={() => setParlayMode(!parlayMode)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  parlayMode ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  parlayMode ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {/* Bet Cards */}
            <div className="space-y-3">
              {selectedBets.map((bet, index) => (
                <motion.div
                  key={bet.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {bet.sport}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {bet.type}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {bet.game}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {bet.selection}
                      </p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {bet.odds > 0 ? '+' : ''}{bet.odds}
                        </span>
                        {bet.confidence && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {bet.confidence}% confidence
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const updated = selectedBets.filter(b => b.id !== bet.id);
                        onUpdateBets(updated);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Set Your Stakes
            </h3>

            {/* Bankroll & Risk Profile */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Total Bankroll
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(Number(e.target.value))}
                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Risk Profile
                </label>
                <select
                  value={riskProfile}
                  onChange={(e) => setRiskProfile(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="conservative">Conservative (Kelly × 0.25)</option>
                  <option value="moderate">Moderate (Kelly × 0.5)</option>
                  <option value="aggressive">Aggressive (Full Kelly)</option>
                </select>
              </div>
            </div>

            {/* Individual Bet Stakes */}
            {!parlayMode ? (
              <div className="space-y-3">
                {selectedBets.map((bet) => (
                  <div key={bet.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {bet.selection}
                      </p>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        @ {bet.odds > 0 ? '+' : ''}{bet.odds}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400">Stake Amount</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-gray-500">$</span>
                          <input
                            type="number"
                            value={betAmounts[bet.id] || 0}
                            onChange={(e) => setBetAmounts({
                              ...betAmounts,
                              [bet.id]: Number(e.target.value)
                            })}
                            className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Potential Win</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          ${((betAmounts[bet.id] || 0) * (bet.odds > 0 ? (bet.odds / 100) + 1 : (100 / Math.abs(bet.odds)) + 1)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Parlay Bet</h4>
                <div className="space-y-2 mb-4">
                  {selectedBets.map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{bet.selection}</span>
                      <span className="font-medium">{bet.odds > 0 ? '+' : ''}{bet.odds}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 dark:text-gray-400">Parlay Stake</label>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          value={totalStake}
                          onChange={(e) => {
                            const newTotal = Number(e.target.value);
                            const newAmounts: { [key: string]: number } = {};
                            selectedBets.forEach(bet => {
                              newAmounts[bet.id] = newTotal / selectedBets.length;
                            });
                            setBetAmounts(newAmounts);
                          }}
                          className="flex-1 px-2 py-1 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Potential Win</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${(totalStake * 8.5).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Stake</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${totalStake.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Potential Return</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${totalPotentialWin.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Risk Analysis
            </h3>

            {/* Risk Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Bankroll at Risk</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {((totalStake / bankroll) * 100).toFixed(1)}%
                </p>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      (totalStake / bankroll) > 0.2 ? 'bg-red-500' :
                      (totalStake / bankroll) > 0.1 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min((totalStake / bankroll) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Expected Value</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  +${((totalPotentialWin - totalStake) * 0.55).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Based on average 55% win rate
                </p>
              </div>
            </div>

            {/* Scenario Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Outcome Scenarios</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Best Case (All Win)</span>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +${(totalPotentialWin - totalStake).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-600">~</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Expected (55% Win)</span>
                  </div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">
                    +${((totalPotentialWin - totalStake) * 0.55 - totalStake * 0.45).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-red-600">✗</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Worst Case (All Lose)</span>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    -${totalStake.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">AI Recommendations</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Your stake sizing aligns with Kelly Criterion for optimal growth</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Consider hedging if any single bet exceeds 10% of bankroll</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-600">•</span>
                  <span>Historical data shows 58% success rate for similar bet profiles</span>
                </li>
              </ul>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm & Place Bets
            </h3>

            {/* Final Summary */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Final Summary</h4>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Ready to Place
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Bets</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {parlayMode ? '1 Parlay' : `${selectedBets.length} Singles`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Stake</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    ${totalStake.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Potential Return</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    ${totalPotentialWin.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Bet Details */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                {selectedBets.map((bet) => (
                  <div key={bet.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{bet.selection}</span>
                    <div className="flex items-center space-x-4">
                      <span className="font-medium">{bet.odds > 0 ? '+' : ''}{bet.odds}</span>
                      <span className="text-gray-900 dark:text-white">${betAmounts[bet.id]?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sportsbook Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Select Sportsbook</h4>
              <div className="grid grid-cols-2 gap-3">
                {['DraftKings', 'FanDuel', 'BetMGM', 'Caesars'].map((book) => (
                  <button
                    key={book}
                    className="p-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{book}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Connected</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  // Place bets logic
                  setFinalizedBets(selectedBets);
                  alert('Bets placed successfully!');
                }}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all duration-200"
              >
                Place Bets Now
              </button>
              <button
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Save for Later
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setCurrentStep(step.id)}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-semibold
                    transition-all duration-200
                    ${currentStep === step.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }
                  `}
                >
                  {currentStep > step.id ? '✓' : step.icon}
                </button>
                <p className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {step.name}
                </p>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className={`
            px-6 py-2 rounded-lg font-medium transition-all duration-200
            ${currentStep === 1
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }
          `}
        >
          Previous
        </button>
        
        {currentStep < STEPS.length && (
          <button
            onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
          >
            Next Step
          </button>
        )}
      </div>
    </div>
  );
}