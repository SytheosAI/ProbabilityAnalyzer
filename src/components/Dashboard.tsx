'use client';

import React, { useState, useEffect } from 'react';
import { QuickStats } from './QuickStats';
import { ActionCenter } from './ActionCenter';
import { MoneylineBrowser } from './MoneylineBrowser';
import { ParlayGenerator } from './ParlayGenerator';
import { ValueBetFinder } from './ValueBetFinder';
import { LiveOddsTracker } from './LiveOddsTracker';
import { PerformanceTracker } from './PerformanceTracker';
import { BettingWorkflow } from './BettingWorkflow';
import { PlayerTeamSearch } from './PlayerTeamSearch';
import { MoneylineViewer } from './MoneylineViewer';
import MLTrainingDashboard from './MLTrainingDashboard';
import { useRealtimeData } from '@/hooks/useRealtimeData';

interface DashboardProps {
  selectedSport: string;
  preferences: any;
}

export function Dashboard({ selectedSport, preferences }: DashboardProps) {
  const [activeView, setActiveView] = useState('overview');
  const [selectedBets, setSelectedBets] = useState<any[]>([]);
  const { liveData, opportunities } = useRealtimeData(selectedSport);

  // Smart view switching based on opportunities
  useEffect(() => {
    if (opportunities?.urgent && opportunities.urgent.length > 0) {
      // Auto-switch to value finder if urgent opportunities exist
      if (activeView === 'overview') {
        setActiveView('value');
      }
    }
  }, [opportunities, activeView]);

  const viewComponents = {
    overview: (
      <div className="space-y-6">
        {/* Key Metrics Row */}
        <QuickStats sport={selectedSport} data={liveData} />
        
        {/* Action Center - Time-sensitive opportunities */}
        <ActionCenter 
          opportunities={opportunities}
          onSelectBet={(bet) => {
            setSelectedBets([...selectedBets, bet]);
            setActiveView('workflow');
          }}
        />
        
        {/* Grid Layout for main components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Live Odds Tracker */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Live Odds Movement
              </h3>
              <button
                onClick={() => setActiveView('odds')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View All →
              </button>
            </div>
            <LiveOddsTracker sport={selectedSport} compact={true} />
          </div>

          {/* Top Value Bets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Top Value Opportunities
              </h3>
              <button
                onClick={() => setActiveView('value')}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                View All →
              </button>
            </div>
            <ValueBetFinder sport={selectedSport} compact={true} limit={5} />
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Your Performance
          </h3>
          <PerformanceTracker compact={true} />
        </div>
      </div>
    ),
    
    moneyline: <MoneylineViewer />,
    parlay: <ParlayGenerator selectedBets={selectedBets} sport={selectedSport} />,
    value: <ValueBetFinder sport={selectedSport} onSelectBet={setSelectedBets} />,
    odds: <LiveOddsTracker sport={selectedSport} />,
    performance: <PerformanceTracker />,
    search: <PlayerTeamSearch />,
    workflow: <BettingWorkflow selectedBets={selectedBets} onUpdateBets={setSelectedBets} />,
    training: <MLTrainingDashboard />
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-1">
        <nav className="flex space-x-1" aria-label="Tabs">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'moneyline', label: 'Moneyline', icon: '💰' },
            { id: 'search', label: 'Player/Team Search', icon: '🔍' },
            { id: 'parlay', label: 'Parlays', icon: '🎯', badge: selectedBets.length > 0 ? selectedBets.length : null },
            { id: 'value', label: 'Value Finder', icon: '💎', badge: opportunities?.count || null },
            { id: 'odds', label: 'Live Odds', icon: '📈' },
            { id: 'performance', label: 'Performance', icon: '📉' },
            { id: 'training', label: 'ML Training', icon: '🤖' },
            { id: 'workflow', label: 'Workflow', icon: '✅', highlight: selectedBets.length > 0 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`
                flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg
                transition-all duration-200 relative
                ${activeView === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
                ${tab.highlight ? 'ring-2 ring-green-500 ring-offset-2' : ''}
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.badge && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Active View Content */}
      <div className="min-h-[600px]">
        {viewComponents[activeView as keyof typeof viewComponents]}
      </div>

      {/* Floating Action Button for Quick Bet Slip */}
      {selectedBets.length > 0 && activeView !== 'workflow' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setActiveView('workflow')}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
          >
            <div className="flex items-center space-x-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="pr-2">Review {selectedBets.length} Bets</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}