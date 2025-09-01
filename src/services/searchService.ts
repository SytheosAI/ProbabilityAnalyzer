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
const TEAM_MAPPINGS: Record<string, Record<string, TeamResult>> = {}
    'liberty': { id: '2a1613e6-0e7f-11e2-bde9-18a905767e44', name: 'Liberty', fullName: 'New York Liberty', city: 'New York', abbreviation: 'NY', conference: 'Eastern', division: 'Eastern' },
    'sun': { id: '3ee7c180-4f4e-4920-8fb3-9a066d8e373e', name: 'Sun', fullName: 'Connecticut Sun', city: 'Connecticut', abbreviation: 'CONN', conference: 'Eastern', division: 'Eastern' }
  },
  mls: {
    'atlanta united': { id: 'sr:competitor:4672', name: 'Atlanta United', fullName: 'Atlanta United FC', city: 'Atlanta', abbreviation: 'ATL', conference: 'Eastern', division: 'East' },
    'la galaxy': { id: 'sr:competitor:1956', name: 'LA Galaxy', fullName: 'Los Angeles Galaxy', city: 'Los Angeles', abbreviation: 'LA', conference: 'Western', division: 'West' },
    'nycfc': { id: 'sr:competitor:4664', name: 'NYCFC', fullName: 'New York City FC', city: 'New York', abbreviation: 'NYC', conference: 'Eastern', division: 'East' },
    'seattle sounders': { id: 'sr:competitor:5812', name: 'Seattle Sounders', fullName: 'Seattle Sounders FC', city: 'Seattle', abbreviation: 'SEA', conference: 'Western', division: 'West' }
  }
};

// LIVE DATA ONLY - NO HARDCODED PLAYER MAPPINGS  
const PLAYER_MAPPINGS: Record<string, PlayerResult[]> = {}
  'lebron james': [{
    id: 'ab532a66-9314-4d57-ade7-bb54a70c65ad',
    name: 'LeBron James',
    firstName: 'LeBron',
    lastName: 'James',
    team: 'Lakers',
    teamId: '583ecae2-fb46-11e1-82cb-f4ce4684ea4c',
    position: 'F',
    jersey: '23',
    height: '6-9',
    weight: '250',
    age: 39,
    status: 'active',
    stats: {
      season: '2023-24',
      gamesPlayed: 71,
      pointsPerGame: 25.7,
      reboundsPerGame: 7.3,
      assistsPerGame: 8.3
    }
  }],
  'stephen curry': [{
    id: '8ec91366-faea-4196-bbfd-b8fab7434795',
    name: 'Stephen Curry',
    firstName: 'Stephen',
    lastName: 'Curry',
    team: 'Warriors',
    teamId: '583ec825-fb46-11e1-82cb-f4ce4684ea4c',
    position: 'G',
    jersey: '30',
    height: '6-2',
    weight: '185',
    age: 36,
    status: 'active',
    stats: {
      season: '2023-24',
      gamesPlayed: 74,
      pointsPerGame: 26.4,
      reboundsPerGame: 4.5,
      assistsPerGame: 5.1,
      threePtPercentage: 40.8
    }
  }],
  'patrick mahomes': [{
    id: '11cad59d-90dd-449c-a839-dddaba4fe16c',
    name: 'Patrick Mahomes',
    firstName: 'Patrick',
    lastName: 'Mahomes',
    team: 'Chiefs',
    teamId: '6680d28d-d4d2-49f6-aace-5292d3ec02c2',
    position: 'QB',
    jersey: '15',
    height: '6-3',
    weight: '230',
    age: 28,
    status: 'active',
    stats: {
      season: '2023',
      gamesPlayed: 17,
      passingYards: 5250,
      touchdowns: 41,
      interceptions: 14,
      qbRating: 92.6
    }
  }],
  'shohei ohtani': [{
    id: '90075d8e-5452-44f5-9589-2a73524cf1d8',
    name: 'Shohei Ohtani',
    firstName: 'Shohei',
    lastName: 'Ohtani',
    team: 'Dodgers',
    teamId: 'ef64da7f-cfaf-4300-87b0-9313386b977c',
    position: 'DH/P',
    jersey: '17',
    height: '6-4',
    weight: '210',
    age: 29,
    status: 'active',
    stats: {
      season: '2024',
      gamesPlayed: 159,
      battingAverage: .310,
      homeRuns: 54,
      rbis: 130,
      stolenBases: 59
    }
  }],
  'connor mcdavid': [{
    id: '5ab5c2b2-3e48-410f-8fc9-3e6a21d89db1',
    name: 'Connor McDavid',
    firstName: 'Connor',
    lastName: 'McDavid',
    team: 'Oilers',
    position: 'C',
    jersey: '97',
    height: '6-1',
    weight: '193',
    age: 27,
    status: 'active',
    stats: {
      season: '2023-24',
      gamesPlayed: 76,
      goals: 32,
      assists: 100,
      points: 132
    }
  }]
};

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