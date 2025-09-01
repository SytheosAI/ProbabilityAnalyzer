'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingFlowProps {
  onComplete: (data: any) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useState({
    experience: '',
    bankroll: '',
    favoredSports: [] as string[],
    riskTolerance: '',
    goals: '',
    notifications: true,
  });

  const STEPS = [
    {
      title: 'Welcome to Sports Analytics Pro',
      subtitle: 'Your professional sports betting intelligence platform',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="text-5xl">🏆</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Turn Data Into Profit
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Our AI-powered platform analyzes millions of data points across 8 major sports to identify profitable betting opportunities in real-time.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-3xl mb-2">📊</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Live Analytics</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Real-time odds tracking</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-3xl mb-2">🤖</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">AI Predictions</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">ML-powered insights</p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-3xl mb-2">💰</div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Value Finder</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">+EV opportunities</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Your Experience Level',
      subtitle: 'Help us customize your experience',
      content: (
        <div className="space-y-4 max-w-lg mx-auto">
          {[
            { id: 'beginner', label: 'Beginner', desc: 'New to sports betting', icon: '🌱' },
            { id: 'intermediate', label: 'Intermediate', desc: '1-3 years experience', icon: '📈' },
            { id: 'advanced', label: 'Advanced', desc: '3+ years, understand EV/CLV', icon: '🎯' },
            { id: 'professional', label: 'Professional', desc: 'Full-time sports bettor', icon: '💎' },
          ].map((level) => (
            <button
              key={level.id}
              onClick={() => setUserData({ ...userData, experience: level.id })}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                userData.experience === level.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">{level.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">{level.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{level.desc}</p>
                </div>
                {userData.experience === level.id && (
                  <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Select Your Sports',
      subtitle: 'Choose the sports you want to track',
      content: (
        <div className="space-y-4 max-w-2xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { id: 'nfl', name: 'NFL', icon: '🏈' },
              { id: 'nba', name: 'NBA', icon: '🏀' },
              { id: 'mlb', name: 'MLB', icon: '⚾' },
              { id: 'nhl', name: 'NHL', icon: '🏒' },
              { id: 'soccer', name: 'Soccer', icon: '⚽' },
              { id: 'tennis', name: 'Tennis', icon: '🎾' },
              { id: 'golf', name: 'Golf', icon: '⛳' },
              { id: 'mma', name: 'MMA/UFC', icon: '🥊' },
            ].map((sport) => (
              <button
                key={sport.id}
                onClick={() => {
                  const updated = userData.favoredSports.includes(sport.id)
                    ? userData.favoredSports.filter(s => s !== sport.id)
                    : [...userData.favoredSports, sport.id];
                  setUserData({ ...userData, favoredSports: updated });
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  userData.favoredSports.includes(sport.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="text-3xl mb-2">{sport.icon}</div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{sport.name}</p>
              </button>
            ))}
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Select at least one sport to continue
          </p>
        </div>
      )
    },
    {
      title: 'Set Your Bankroll',
      subtitle: 'This helps us size your bets appropriately',
      content: (
        <div className="space-y-6 max-w-lg mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Starting Bankroll
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={userData.bankroll}
                onChange={(e) => setUserData({ ...userData, bankroll: e.target.value })}
                placeholder="1000"
                className="w-full pl-8 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-lg"
              />
            </div>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This is the total amount you're comfortable betting with
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Risk Tolerance
            </label>
            <div className="space-y-2">
              {[
                { id: 'conservative', label: 'Conservative', desc: '1-2% per bet' },
                { id: 'moderate', label: 'Moderate', desc: '3-5% per bet' },
                { id: 'aggressive', label: 'Aggressive', desc: '5-10% per bet' },
              ].map((risk) => (
                <button
                  key={risk.id}
                  onClick={() => setUserData({ ...userData, riskTolerance: risk.id })}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    userData.riskTolerance === risk.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">{risk.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{risk.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Your Goals',
      subtitle: 'What are you looking to achieve?',
      content: (
        <div className="space-y-4 max-w-lg mx-auto">
          {[
            { id: 'fun', label: 'Entertainment', desc: 'Betting for fun and excitement', icon: '🎮' },
            { id: 'side', label: 'Side Income', desc: 'Generate extra income', icon: '💵' },
            { id: 'serious', label: 'Serious Profit', desc: 'Build long-term bankroll', icon: '📈' },
            { id: 'pro', label: 'Go Professional', desc: 'Make this my primary income', icon: '🏆' },
          ].map((goal) => (
            <button
              key={goal.id}
              onClick={() => setUserData({ ...userData, goals: goal.id })}
              className={`w-full p-4 rounded-lg border-2 transition-all ${
                userData.goals === goal.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center space-x-4">
                <span className="text-3xl">{goal.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">{goal.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{goal.desc}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )
    },
    {
      title: 'Enable Notifications',
      subtitle: 'Never miss a profitable opportunity',
      content: (
        <div className="space-y-6 max-w-lg mx-auto">
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">🔔</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Get instant alerts for high-value opportunities, line movements, and game updates
            </p>
          </div>

          <div className="space-y-3">
            {[
              { id: 'value', label: 'Value Bet Alerts', desc: 'When +EV opportunities arise' },
              { id: 'lines', label: 'Line Movement', desc: 'Significant odds changes' },
              { id: 'games', label: 'Game Updates', desc: 'Starting lineups, injuries' },
              { id: 'results', label: 'Bet Results', desc: 'Win/loss notifications' },
            ].map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{notif.label}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{notif.desc}</p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-blue-600 rounded"
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => setUserData({ ...userData, notifications: true })}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium"
          >
            Enable All Notifications
          </button>
        </div>
      )
    }
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1: return userData.experience !== '';
      case 2: return userData.favoredSports.length > 0;
      case 3: return userData.bankroll !== '' && userData.riskTolerance !== '';
      case 4: return userData.goals !== '';
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Step {currentStep + 1} of {STEPS.length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round(((currentStep + 1) / STEPS.length) * 100)}% Complete
            </p>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {STEPS[currentStep].title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {STEPS[currentStep].subtitle}
              </p>
            </div>

            {STEPS[currentStep].content}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  currentStep === 0
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Back
              </button>

              {currentStep === STEPS.length - 1 ? (
                <button
                  onClick={() => onComplete(userData)}
                  className="px-8 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-medium hover:from-green-700 hover:to-green-800 transition-all"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!canProceed()}
                  className={`px-8 py-2 rounded-lg font-medium transition-all ${
                    canProceed()
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Continue
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Skip Option */}
        {currentStep === 0 && (
          <div className="text-center mt-4">
            <button
              onClick={() => onComplete({})}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}