// Player and Team Search Service
// Comprehensive search functionality across all sports

import { fetchSportsData, SPORT_CONFIGS } from '@/lib/sportsRadar';

export interface SearchResult {
  type: 'player' | 'team';
  sport: string;
  data: PlayerResult | TeamResult;
  relevanceScore: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  team?: string;
  teamId?: string;
  position?: string;
  jersey?: string;
  height?: string;
  weight?: string;
  birthDate?: string;
  age?: number;
  experience?: number;
  college?: string;
  draftYear?: number;
  draftRound?: number;
  draftPick?: number;
  status: 'active' | 'injured' | 'suspended' | 'inactive' | 'retired';
  injuryStatus?: {
    status: string;
    description: string;
    returnDate?: string;
  };
  stats?: PlayerStats;
  imageUrl?: string;
}

export interface TeamResult {
  id: string;
  name: string;
  fullName?: string;
  city?: string;
  abbreviation?: string;
  conference?: string;
  division?: string;
  league?: string;
  founded?: number;
  venue?: {
    name: string;
    city: string;
    capacity: number;
  };
  record?: {
    wins: number;
    losses: number;
    ties?: number;
    winPercentage: number;
    streak?: string;
  };
  ranking?: number;
  playoffs?: boolean;
  coach?: string;
  owner?: string;
  logoUrl?: string;
  colors?: string[];
  roster?: PlayerResult[];
}

export interface PlayerStats {
  season: string;
  gamesPlayed: number;
  [key: string]: any; // Sport-specific stats
}

// Cache for search results
const searchCache = new Map<string, { results: SearchResult[]; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes

// LIVE DATA ONLY - NO HARDCODED TEAM MAPPINGS
const TEAM_MAPPINGS: Record<string, Record<string, TeamResult>> = {};

// LIVE DATA ONLY - NO HARDCODED PLAYER MAPPINGS  
const PLAYER_MAPPINGS: Record<string, PlayerResult[]> = {};

// Calculate relevance score for search results
function calculateRelevance(query: string, result: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerResult = result.toLowerCase();
  
  if (lowerResult === lowerQuery) return 1.0;
  if (lowerResult.startsWith(lowerQuery)) return 0.9;
  if (lowerResult.includes(lowerQuery)) return 0.7;
  
  // Calculate character match percentage
  let matches = 0;
  for (const char of lowerQuery) {
    if (lowerResult.includes(char)) matches++;
  }
  return Math.max(0.3, matches / lowerQuery.length * 0.5);
}

// Search for teams
export async function searchTeams(query: string, sport?: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Filter by sport if specified
  const sportsToSearch = sport ? [sport.toLowerCase()] : Object.keys(TEAM_MAPPINGS);
  
  for (const sportKey of sportsToSearch) {
    const teams = TEAM_MAPPINGS[sportKey];
    if (!teams) continue;
    
    for (const [key, team] of Object.entries(teams)) {
      const relevance = Math.max(
        calculateRelevance(query, team.name),
        calculateRelevance(query, team.fullName || ''),
        calculateRelevance(query, team.city || ''),
        calculateRelevance(query, team.abbreviation || '')
      );
      
      if (relevance > 0.3) {
        results.push({
          type: 'team',
          sport: sportKey.toUpperCase(),
          data: team,
          relevanceScore: relevance
        });
      }
    }
  }
  
  // Sort by relevance
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Search for players
export async function searchPlayers(query: string, sport?: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Search in player mappings
  for (const [key, players] of Object.entries(PLAYER_MAPPINGS)) {
    const relevance = calculateRelevance(query, key);
    
    if (relevance > 0.3) {
      for (const player of players) {
        // Filter by sport if specified
        if (sport) {
          const playerSport = getPlayerSport(player.team || '');
          if (playerSport.toLowerCase() !== sport.toLowerCase()) continue;
        }
        
        results.push({
          type: 'player',
          sport: getPlayerSport(player.team || ''),
          data: player,
          relevanceScore: relevance
        });
      }
    }
  }
  
  // Sort by relevance
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Helper to determine sport from team name
function getPlayerSport(teamName: string): string {
  const lowerTeam = teamName.toLowerCase();
  
  // Check each sport's teams
  for (const [sport, teams] of Object.entries(TEAM_MAPPINGS)) {
    for (const team of Object.values(teams)) {
      if (team.name.toLowerCase() === lowerTeam || 
          team.fullName?.toLowerCase().includes(lowerTeam)) {
        return sport.toUpperCase();
      }
    }
  }
  
  // Default checks
  if (['lakers', 'warriors', 'celtics', 'heat', 'nets', 'suns'].includes(lowerTeam)) return 'NBA';
  if (['chiefs', 'patriots', 'bills', 'cowboys', 'packers'].includes(lowerTeam)) return 'NFL';
  if (['yankees', 'red sox', 'dodgers', 'giants'].includes(lowerTeam)) return 'MLB';
  if (['rangers', 'bruins', 'lightning', 'oilers'].includes(lowerTeam)) return 'NHL';
  
  return 'UNKNOWN';
}

// Combined search function
export async function search(query: string, options?: {
  type?: 'player' | 'team' | 'all';
  sport?: string;
  limit?: number;
}): Promise<SearchResult[]> {
  const { type = 'all', sport, limit = 20 } = options || {};
  
  // Check cache
  const cacheKey = `${query}:${type}:${sport || 'all'}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.results.slice(0, limit);
  }
  
  let results: SearchResult[] = [];
  
  // Perform searches based on type
  if (type === 'all' || type === 'team') {
    const teamResults = await searchTeams(query, sport);
    results = results.concat(teamResults);
  }
  
  if (type === 'all' || type === 'player') {
    const playerResults = await searchPlayers(query, sport);
    results = results.concat(playerResults);
  }
  
  // Sort by relevance and limit
  results = results
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);
  
  // Cache results
  searchCache.set(cacheKey, { results, timestamp: Date.now() });
  
  return results;
}

// Get team roster
export async function getTeamRoster(teamId: string, sport: string): Promise<PlayerResult[]> {
  try {
    const sportKey = sport.toLowerCase() as keyof typeof SPORT_CONFIGS;
    const config = SPORT_CONFIGS[sportKey];
    
    if (!config || !config.endpoints.teamRoster) {
      throw new Error(`Roster endpoint not available for ${sport}`);
    }
    
    const data = await fetchSportsData(sportKey, config.endpoints.teamRoster, {
      team_id: teamId
    });
    
    // Parse roster data based on sport
    const roster: PlayerResult[] = [];
    
    if (data?.players) {
      data.players.forEach((player: any) => {
        roster.push({
          id: player.id,
          name: player.full_name || `${player.first_name} ${player.last_name}`,
          firstName: player.first_name,
          lastName: player.last_name,
          position: player.position,
          jersey: player.jersey_number || player.jersey,
          height: player.height,
          weight: player.weight,
          birthDate: player.birth_date,
          status: player.status || 'active',
          college: player.college,
          experience: player.experience
        });
      });
    }
    
    return roster;
  } catch (error) {
    console.error(`Error fetching roster for team ${teamId}:`, error);
    return [];
  }
}

// Get player profile with detailed stats
export async function getPlayerProfile(playerId: string, sport: string): Promise<PlayerResult | null> {
  try {
    const sportKey = sport.toLowerCase() as keyof typeof SPORT_CONFIGS;
    const config = SPORT_CONFIGS[sportKey];
    
    if (!config || !config.endpoints.playerProfile) {
      // Return from cached data if available
      for (const players of Object.values(PLAYER_MAPPINGS)) {
        const player = players.find(p => p.id === playerId);
        if (player) return player;
      }
      return null;
    }
    
    const data = await fetchSportsData(sportKey, config.endpoints.playerProfile, {
      player_id: playerId
    });
    
    if (!data) return null;
    
    // Parse player data
    return {
      id: data.id,
      name: data.full_name || `${data.first_name} ${data.last_name}`,
      firstName: data.first_name,
      lastName: data.last_name,
      team: data.team?.name,
      teamId: data.team?.id,
      position: data.position,
      jersey: data.jersey_number || data.jersey,
      height: data.height,
      weight: data.weight,
      birthDate: data.birth_date,
      status: data.status || 'active',
      college: data.college,
      draftYear: data.draft?.year,
      draftRound: data.draft?.round,
      draftPick: data.draft?.pick,
      stats: data.statistics
    };
  } catch (error) {
    console.error(`Error fetching player profile ${playerId}:`, error);
    return null;
  }
}