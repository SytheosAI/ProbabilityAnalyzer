'use client';

import React, { useEffect, useState } from 'react';
import { useSportsData, useSportsOverview } from '@/hooks/useSportsData';

export default function TestPage() {
  const [selectedSport, setSelectedSport] = useState('nba');
  const { data: sportsData, loading, error } = useSportsData(selectedSport, 'games');
  const { data: overview } = useSportsOverview(true);

  const sports = [
    'nba', 'nfl', 'mlb', 'nhl', 'ncaamb', 'ncaafb', 
    'tennis', 'soccer', 'wnba', 'mls', 'ufc', 'boxing'
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Sports Data API Test</h1>
      
      {/* Sport Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Select Sport:</label>
        <select 
          value={selectedSport}
          onChange={(e) => setSelectedSport(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          {sports.map(sport => (
            <option key={sport} value={sport}>{sport.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="mb-8 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">API Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Sports</p>
              <p className="text-2xl font-bold">{overview.summary?.totalSports || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Available</p>
              <p className="text-2xl font-bold text-green-600">{overview.summary?.availableSports || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Games</p>
              <p className="text-2xl font-bold text-blue-600">{overview.summary?.totalGames || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Live Games</p>
              <p className="text-2xl font-bold text-red-600">{overview.summary?.totalLiveGames}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Status */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">
          {selectedSport.toUpperCase()} Data
        </h2>
        
        {loading && (
          <div className="text-blue-600">Loading {selectedSport} data...</div>
        )}
        
        {error && (
          <div className="text-red-600">Error: {error}</div>
        )}
        
        {sportsData && (
          <div>
            <div className="mb-4">
              <span className="text-sm text-gray-600">Sport: </span>
              <span className="font-semibold">{sportsData.sport}</span>
            </div>
            
            <div className="mb-4">
              <span className="text-sm text-gray-600">Date: </span>
              <span className="font-semibold">{sportsData.data?.date || 'N/A'}</span>
            </div>
            
            <div className="mb-4">
              <span className="text-sm text-gray-600">Games Found: </span>
              <span className="font-semibold text-green-600">
                {sportsData.data?.games?.length || sportsData.data?.events?.length || 0}
              </span>
            </div>

            {/* Display Games */}
            {sportsData.data?.games && sportsData.data.games.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Games:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {sportsData.data.games.map((game: any, index: number) => (
                    <div key={game.id || index} className="p-3 bg-gray-50 rounded border">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{game.awayTeam?.name || 'Away'}</span>
                          {game.awayTeam?.score !== undefined && (
                            <span className="ml-2 font-bold">{game.awayTeam.score}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">@</span>
                        <div>
                          <span className="font-medium">{game.homeTeam?.name || 'Home'}</span>
                          {game.homeTeam?.score !== undefined && (
                            <span className="ml-2 font-bold">{game.homeTeam.score}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Status: {game.status} | {new Date(game.scheduled).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw Data Preview */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                View Raw Data
              </summary>
              <pre className="mt-2 p-4 bg-gray-100 rounded overflow-auto text-xs">
                {JSON.stringify(sportsData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}