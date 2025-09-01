'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Sport {
  id: string;
  name: string;
  icon: string;
  color: string;
  activeGames: number;
  liveGames: number;
}

interface SportSelectorProps {
  selectedSport: string;
  onSportChange: (sport: string) => void;
}

const SPORTS: Sport[] = [
  { id: 'all', name: 'All Sports', icon: '🏆', color: 'from-purple-500 to-pink-500', activeGames: 127, liveGames: 43 },
  { id: 'nfl', name: 'NFL', icon: '🏈', color: 'from-green-600 to-green-700', activeGames: 16, liveGames: 8 },
  { id: 'nba', name: 'NBA', icon: '🏀', color: 'from-orange-500 to-red-500', activeGames: 24, liveGames: 12 },
  { id: 'mlb', name: 'MLB', icon: '⚾', color: 'from-blue-600 to-blue-700', activeGames: 15, liveGames: 6 },
  { id: 'nhl', name: 'NHL', icon: '🏒', color: 'from-cyan-500 to-blue-500', activeGames: 18, liveGames: 4 },
  { id: 'soccer', name: 'Soccer', icon: '⚽', color: 'from-green-500 to-emerald-500', activeGames: 32, liveGames: 8 },
  { id: 'tennis', name: 'Tennis', icon: '🎾', color: 'from-yellow-500 to-green-500', activeGames: 12, liveGames: 3 },
  { id: 'golf', name: 'Golf', icon: '⛳', color: 'from-teal-500 to-green-500', activeGames: 4, liveGames: 2 },
  { id: 'mma', name: 'MMA/UFC', icon: '🥊', color: 'from-red-600 to-red-700', activeGames: 6, liveGames: 0 },
];

export function SportSelector({ selectedSport, onSportChange }: SportSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredSport, setHoveredSport] = useState<string | null>(null);

  const currentSport = SPORTS.find(s => s.id === selectedSport) || SPORTS[0];

  return (
    <div className="relative">
      {/* Main Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
      >
        <div className={`p-2 rounded-lg bg-gradient-to-r ${currentSport.color}`}>
          <span className="text-2xl">{currentSport.icon}</span>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {currentSport.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {currentSport.liveGames} live • {currentSport.activeGames} today
          </p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Quick Stats */}
              <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs opacity-90">Total Active Games</p>
                    <p className="text-2xl font-bold">127</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-90">Live Now</p>
                    <p className="text-2xl font-bold">43</p>
                  </div>
                  <div>
                    <p className="text-xs opacity-90">Opportunities</p>
                    <p className="text-2xl font-bold">18</p>
                  </div>
                </div>
              </div>

              {/* Sports Grid */}
              <div className="p-2">
                <div className="grid grid-cols-1 gap-1">
                  {SPORTS.map((sport) => (
                    <button
                      key={sport.id}
                      onClick={() => {
                        onSportChange(sport.id);
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setHoveredSport(sport.id)}
                      onMouseLeave={() => setHoveredSport(null)}
                      className={`
                        relative flex items-center justify-between p-3 rounded-lg
                        transition-all duration-200
                        ${selectedSport === sport.id
                          ? 'bg-gradient-to-r ' + sport.color + ' text-white shadow-lg'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{sport.icon}</span>
                        <div className="text-left">
                          <p className={`font-semibold ${
                            selectedSport === sport.id ? 'text-white' : 'text-gray-900 dark:text-white'
                          }`}>
                            {sport.name}
                          </p>
                          <p className={`text-xs ${
                            selectedSport === sport.id ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {sport.activeGames} games today
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {sport.liveGames > 0 && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className={`text-xs font-medium ${
                              selectedSport === sport.id ? 'text-white' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {sport.liveGames} LIVE
                            </span>
                          </div>
                        )}
                        
                        {selectedSport === sport.id && (
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>

                      {/* Hover Effect */}
                      {hoveredSport === sport.id && selectedSport !== sport.id && (
                        <motion.div
                          layoutId="hoverBackground"
                          className="absolute inset-0 bg-gray-50 dark:bg-gray-700 rounded-lg -z-10"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Filters */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick Filters</p>
                <div className="flex flex-wrap gap-2">
                  <button className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                    Live Only
                  </button>
                  <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
                    Starting Soon
                  </button>
                  <button className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                    High Value
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}