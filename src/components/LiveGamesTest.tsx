/**
 * Live Games Test Component
 * Tests the direct Sports Radar API integration
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity, AlertCircle, CheckCircle } from 'lucide-react'

export default function LiveGamesTest() {
  const [isLoading, setIsLoading] = useState(false)
  const [liveData, setLiveData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchLiveGames = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('Fetching live games from /api/live-games...')
      const response = await fetch('/api/live-games?includeOdds=true')
      const data = await response.json()
      
      console.log('Live games response:', data)
      
      if (data.success) {
        setLiveData(data)
        setLastFetch(new Date())
      } else {
        setError(data.message || 'Failed to fetch live games')
      }
    } catch (err) {
      console.error('Error fetching live games:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveGames()
  }, [])

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Live Games API Test
          </CardTitle>
          <Button 
            onClick={fetchLiveGames} 
            disabled={isLoading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Fetching...' : 'Refresh'}
          </Button>
        </div>
        {lastFetch && (
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {formatDate(lastFetch)}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {liveData && (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">API Status: Active</span>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div>
                  <p className="text-sm text-gray-600">Total Games</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {liveData.summary?.total_games || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sports Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {liveData.summary?.sports_active || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">API Key</p>
                  <p className="text-sm font-mono text-green-600">Valid ✓</p>
                </div>
              </div>
            </div>
            
            {/* Sports Breakdown */}
            {liveData.summary?.breakdown && liveData.summary.breakdown.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Sports Breakdown:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {liveData.summary.breakdown.map((sport: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 rounded p-2">
                      <span className="font-medium">{sport.sport}:</span>
                      <span className="ml-2">{sport.games} games</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Games Details */}
            {liveData.data && liveData.data.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Live Games:</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {liveData.data.map((sportData: any) => (
                    <div key={sportData.sport} className="border rounded-lg p-3">
                      <h4 className="font-medium text-blue-600 mb-2">{sportData.sport}</h4>
                      {sportData.games.slice(0, 3).map((game: any, idx: number) => (
                        <div key={idx} className="text-sm bg-gray-50 rounded p-2 mb-1">
                          <div className="flex justify-between">
                            <span>{game.away_team?.name || 'Away'} @ {game.home_team?.name || 'Home'}</span>
                            <span className="text-gray-500">{game.status || 'Scheduled'}</span>
                          </div>
                          {game.scheduled && (
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(game.scheduled).toLocaleString()}
                            </div>
                          )}
                        </div>
                      ))}
                      {sportData.games.length > 3 && (
                        <p className="text-sm text-gray-500 mt-1">
                          ...and {sportData.games.length - 3} more games
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Raw Response (for debugging) */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                View Raw Response
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-x-auto">
                {JSON.stringify(liveData, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        {!liveData && !error && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            No data loaded yet. Click refresh to fetch live games.
          </div>
        )}
      </CardContent>
    </Card>
  )
}