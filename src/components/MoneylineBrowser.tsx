'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface MoneylineBrowserProps {
  sport: string;
  onSelectBet?: (bets: any) => void;
}

export function MoneylineBrowser({ sport, onSelectBet }: MoneylineBrowserProps) {
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [filter, setFilter] = useState('all');

  // Mock data - in production this would come from your API
  const games = [
    {
      id: '1',
      sport: 'NFL',
      home: 'Kansas City Chiefs',
      away: 'Buffalo Bills',
      homeOdds: -150,
      awayOdds: +130,
      time: '8:20 PM ET',
      network: 'NBC',
      spread: -3.5,
      total: 48.5
    },
    {
      id: '2',
      sport: 'NBA',
      home: 'Los Angeles Lakers',
      away: 'Boston Celtics',
      homeOdds: +110,
      awayOdds: -130,
      time: '10:30 PM ET',
      network: 'TNT',
      spread: +2.5,
      total: 228.5
    },
    {
      id: '3',
      sport: 'NHL',
      home: 'New York Rangers',
      away: 'Tampa Bay Lightning',
      homeOdds: -120,
      awayOdds: +100,
      time: '7:00 PM ET',
      network: 'ESPN+',
      spread: -1.5,
      total: 6.5
    }
  ];

  const filteredGames = sport === 'all' 
    ? games 
    : games.filter(g => g.sport.toLowerCase() === sport.toLowerCase());

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            {['all', 'favorites', 'underdogs', 'live'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredGames.length} games
            </span>
          </div>
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200"
          >
            <div className="p-6">
              {/* Game Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                    {game.sport}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {game.time}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {game.network}
                  </span>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Teams and Odds */}
              <div className="space-y-3">
                {/* Away Team */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedGames.includes(`${game.id}-away`)}
                      onChange={() => {
                        const id = `${game.id}-away`;
                        setSelectedGames(prev =>
                          prev.includes(id) 
                            ? prev.filter(g => g !== id)
                            : [...prev, id]
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {game.away}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Away
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {game.awayOdds > 0 ? '+' : ''}{game.awayOdds}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {game.awayOdds > 0 ? 'Underdog' : 'Favorite'}
                    </p>
                  </div>
                </div>

                {/* Home Team */}
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedGames.includes(`${game.id}-home`)}
                      onChange={() => {
                        const id = `${game.id}-home`;
                        setSelectedGames(prev =>
                          prev.includes(id) 
                            ? prev.filter(g => g !== id)
                            : [...prev, id]
                        );
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {game.home}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Home
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900 dark:text-white">
                      {game.homeOdds > 0 ? '+' : ''}{game.homeOdds}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {game.homeOdds > 0 ? 'Underdog' : 'Favorite'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-around text-sm">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Spread</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {game.spread > 0 ? '+' : ''}{game.spread}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Total</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {game.total}
                    </p>
                  </div>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                    More Bets
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add to Bet Slip */}
      {selectedGames.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              if (onSelectBet) {
                const selectedBets = selectedGames.map(sg => {
                  const [gameId, team] = sg.split('-');
                  const game = games.find(g => g.id === gameId);
                  return {
                    id: sg,
                    sport: game?.sport,
                    game: `${game?.away} @ ${game?.home}`,
                    type: 'Moneyline',
                    selection: team === 'away' ? game?.away : game?.home,
                    odds: team === 'away' ? game?.awayOdds : game?.homeOdds,
                    confidence: 55 + Math.random() * 15
                  };
                });
                onSelectBet(selectedBets);
              }
            }}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full px-6 py-3 shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-200"
          >
            Add {selectedGames.length} to Bet Slip
          </button>
        </div>
      )}
    </div>
  );
}