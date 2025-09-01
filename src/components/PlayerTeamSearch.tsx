'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Users, TrendingUp, Activity, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SearchResult {
  type: 'player' | 'team';
  sport: string;
  data: PlayerResult | TeamResult;
  relevanceScore: number;
}

interface PlayerResult {
  id: string;
  name: string;
  team?: string;
  position?: string;
  jersey?: string;
  status: string;
  stats?: Record<string, any>;
  injuryStatus?: {
    status: string;
    description: string;
  };
}

interface TeamResult {
  id: string;
  name: string;
  fullName?: string;
  city?: string;
  abbreviation?: string;
  conference?: string;
  division?: string;
  record?: {
    wins: number;
    losses: number;
    winPercentage: number;
  };
}

const SPORTS = [
  'All Sports',
  'NBA', 'NFL', 'MLB', 'NHL',
  'NCAA Basketball', 'NCAA Football',
  'WNBA', 'MLS',
  'Tennis', 'Soccer',
  'UFC/MMA', 'Boxing'
];

export default function PlayerTeamSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All Sports');
  const [searchType, setSearchType] = useState<'all' | 'player' | 'team'>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [roster, setRoster] = useState<PlayerResult[]>([]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedSport, searchType]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        type: searchType,
        sport: selectedSport === 'All Sports' ? '' : selectedSport
      });

      const response = await fetch(`/api/sports/search?${params}`);
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError('Failed to search. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamRoster = async (teamId: string, sport: string) => {
    try {
      const response = await fetch(`/api/sports/team/${teamId}/roster?sport=${sport}`);
      if (!response.ok) throw new Error('Failed to load roster');

      const data = await response.json();
      setRoster(data.roster || []);
    } catch (err) {
      console.error('Failed to load roster:', err);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    setSelectedItem(result);
    if (result.type === 'team' && result.data) {
      loadTeamRoster((result.data as TeamResult).id, result.sport);
    }
  };

  const renderPlayerCard = (player: PlayerResult) => (
    <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-lg">{player.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {player.team} • {player.position} • #{player.jersey}
          </p>
        </div>
        {player.status === 'injured' && (
          <Badge variant="destructive">Injured</Badge>
        )}
      </div>

      {player.stats && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {Object.entries(player.stats).slice(0, 6).map(([key, value]) => (
            <div key={key} className="text-center">
              <p className="text-xs text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="font-semibold">{typeof value === 'number' ? value.toFixed(1) : value}</p>
            </div>
          ))}
        </div>
      )}

      {player.injuryStatus && (
        <Alert className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {player.injuryStatus.description}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderTeamCard = (team: TeamResult) => (
    <div className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-semibold text-lg">{team.fullName || team.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {team.conference} • {team.division}
          </p>
        </div>
        <Badge>{team.abbreviation}</Badge>
      </div>

      {team.record && (
        <div className="flex items-center gap-4 mt-3">
          <div className="text-center">
            <p className="text-xs text-gray-500">Record</p>
            <p className="font-semibold">
              {team.record.wins}-{team.record.losses}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Win %</p>
            <p className="font-semibold">
              {(team.record.winPercentage * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Player & Team Search
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Search Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search players or teams..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSport} onValueChange={setSelectedSport}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPORTS.map(sport => (
                  <SelectItem key={sport} value={sport}>
                    {sport}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs value={searchType} onValueChange={(v) => setSearchType(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="player">Players</TabsTrigger>
              <TabsTrigger value="team">Teams</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Search Results */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Searching...</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Found {results.length} results
            </p>
            {results.map((result, index) => (
              <div
                key={index}
                className="cursor-pointer"
                onClick={() => handleResultClick(result)}
              >
                {result.type === 'player' 
                  ? renderPlayerCard(result.data as PlayerResult)
                  : renderTeamCard(result.data as TeamResult)
                }
                <Badge variant="outline" className="mt-2">
                  {result.sport}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {!loading && searchQuery.length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No results found for "{searchQuery}"
          </div>
        )}

        {/* Selected Item Detail Modal */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {selectedItem.type === 'player' ? 'Player Details' : 'Team Details'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedItem(null);
                    setRoster([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4">
                {selectedItem.type === 'player' 
                  ? renderPlayerCard(selectedItem.data as PlayerResult)
                  : (
                    <>
                      {renderTeamCard(selectedItem.data as TeamResult)}
                      {roster.length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3">Roster</h4>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {roster.map((player, idx) => (
                              <div key={idx} className="border-b pb-2">
                                {renderPlayerCard(player)}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                }
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}