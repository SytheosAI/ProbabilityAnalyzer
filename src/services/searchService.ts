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

// Team name mappings for each sport
const TEAM_MAPPINGS: Record<string, Record<string, TeamResult>> = {
  nba: {
    'lakers': { id: '583ecae2-fb46-11e1-82cb-f4ce4684ea4c', name: 'Lakers', fullName: 'Los Angeles Lakers', city: 'Los Angeles', abbreviation: 'LAL', conference: 'Western', division: 'Pacific' },
    'warriors': { id: '583ec825-fb46-11e1-82cb-f4ce4684ea4c', name: 'Warriors', fullName: 'Golden State Warriors', city: 'Golden State', abbreviation: 'GSW', conference: 'Western', division: 'Pacific' },
    'celtics': { id: '583eccfa-fb46-11e1-82cb-f4ce4684ea4c', name: 'Celtics', fullName: 'Boston Celtics', city: 'Boston', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic' },
    'heat': { id: '583ecea6-fb46-11e1-82cb-f4ce4684ea4c', name: 'Heat', fullName: 'Miami Heat', city: 'Miami', abbreviation: 'MIA', conference: 'Eastern', division: 'Southeast' },
    'nets': { id: '583ec9d6-fb46-11e1-82cb-f4ce4684ea4c', name: 'Nets', fullName: 'Brooklyn Nets', city: 'Brooklyn', abbreviation: 'BKN', conference: 'Eastern', division: 'Atlantic' },
    'suns': { id: '583ecfa8-fb46-11e1-82cb-f4ce4684ea4c', name: 'Suns', fullName: 'Phoenix Suns', city: 'Phoenix', abbreviation: 'PHX', conference: 'Western', division: 'Pacific' },
    'bucks': { id: '583ecefd-fb46-11e1-82cb-f4ce4684ea4c', name: 'Bucks', fullName: 'Milwaukee Bucks', city: 'Milwaukee', abbreviation: 'MIL', conference: 'Eastern', division: 'Central' },
    'nuggets': { id: '583ed102-fb46-11e1-82cb-f4ce4684ea4c', name: 'Nuggets', fullName: 'Denver Nuggets', city: 'Denver', abbreviation: 'DEN', conference: 'Western', division: 'Northwest' }
  },
  nfl: {
    'patriots': { id: '97354895-8c77-4fd4-a860-32e62ea7382a', name: 'Patriots', fullName: 'New England Patriots', city: 'New England', abbreviation: 'NE', conference: 'AFC', division: 'East' },
    'chiefs': { id: '6680d28d-d4d2-49f6-aace-5292d3ec02c2', name: 'Chiefs', fullName: 'Kansas City Chiefs', city: 'Kansas City', abbreviation: 'KC', conference: 'AFC', division: 'West' },
    'bills': { id: '768c92aa-75ff-4a43-bcc0-f2798c2e1724', name: 'Bills', fullName: 'Buffalo Bills', city: 'Buffalo', abbreviation: 'BUF', conference: 'AFC', division: 'East' },
    'cowboys': { id: 'e627eec7-bbae-4fa4-8e73-8e1d6bc5c060', name: 'Cowboys', fullName: 'Dallas Cowboys', city: 'Dallas', abbreviation: 'DAL', conference: 'NFC', division: 'East' },
    'packers': { id: 'a20471b4-a8d9-40c7-95ad-90cc30e46932', name: 'Packers', fullName: 'Green Bay Packers', city: 'Green Bay', abbreviation: 'GB', conference: 'NFC', division: 'North' },
    'eagles': { id: '386bdbf9-9eea-4869-bb9a-274b0bc66e80', name: 'Eagles', fullName: 'Philadelphia Eagles', city: 'Philadelphia', abbreviation: 'PHI', conference: 'NFC', division: 'East' },
    '49ers': { id: 'f0e724b0-4cbf-495a-be47-013907608da9', name: '49ers', fullName: 'San Francisco 49ers', city: 'San Francisco', abbreviation: 'SF', conference: 'NFC', division: 'West' }
  },
  mlb: {
    'yankees': { id: 'a09ec676-f887-43dc-bbb3-cf4bbaee9a18', name: 'Yankees', fullName: 'New York Yankees', city: 'New York', abbreviation: 'NYY', conference: 'American', division: 'East' },
    'red sox': { id: '93941372-eb4c-4c40-aced-fe3267174393', name: 'Red Sox', fullName: 'Boston Red Sox', city: 'Boston', abbreviation: 'BOS', conference: 'American', division: 'East' },
    'dodgers': { id: 'ef64da7f-cfaf-4300-87b0-9313386b977c', name: 'Dodgers', fullName: 'Los Angeles Dodgers', city: 'Los Angeles', abbreviation: 'LAD', conference: 'National', division: 'West' },
    'giants': { id: 'a7723160-10b7-4277-a309-d8dd95a8ae65', name: 'Giants', fullName: 'San Francisco Giants', city: 'San Francisco', abbreviation: 'SF', conference: 'National', division: 'West' }
  },
  nhl: {
    'rangers': { id: '441781b9-0f24-11e2-8525-18a905767e44', name: 'Rangers', fullName: 'New York Rangers', city: 'New York', abbreviation: 'NYR', conference: 'Eastern', division: 'Metropolitan' },
    'bruins': { id: '4416091c-0f24-11e2-8525-18a905767e44', name: 'Bruins', fullName: 'Boston Bruins', city: 'Boston', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic' },
    'lightning': { id: '4417b7d7-0f24-11e2-8525-18a905767e44', name: 'Lightning', fullName: 'Tampa Bay Lightning', city: 'Tampa Bay', abbreviation: 'TB', conference: 'Eastern', division: 'Atlantic' },
    'avalanche': { id: '44153da1-0f24-11e2-8525-18a905767e44', name: 'Avalanche', fullName: 'Colorado Avalanche', city: 'Colorado', abbreviation: 'COL', conference: 'Western', division: 'Central' }
  },
  ncaamb: {
    'duke': { id: 'faeb1160-5d15-11e1-90a9-b48f3d47f046', name: 'Duke', fullName: 'Duke Blue Devils', city: 'Durham', abbreviation: 'DUKE', conference: 'ACC', division: 'Atlantic Coast' },
    'kentucky': { id: 'e52c9644-717a-46f4-bf16-aeca000b3b44', name: 'Kentucky', fullName: 'Kentucky Wildcats', city: 'Lexington', abbreviation: 'UK', conference: 'SEC', division: 'Southeastern' },
    'kansas': { id: 'fae4855b-1b64-4b40-a632-9ed345e1e952', name: 'Kansas', fullName: 'Kansas Jayhawks', city: 'Lawrence', abbreviation: 'KU', conference: 'Big 12', division: 'Big 12' },
    'north carolina': { id: 'd366712d-e51a-419f-ba6e-364447093106', name: 'North Carolina', fullName: 'North Carolina Tar Heels', city: 'Chapel Hill', abbreviation: 'UNC', conference: 'ACC', division: 'Atlantic Coast' }
  },
  ncaafb: {
    'alabama': { id: '19775492-f1eb-4bc5-9e15-078ebd689c0f', name: 'Alabama', fullName: 'Alabama Crimson Tide', city: 'Tuscaloosa', abbreviation: 'ALA', conference: 'SEC', division: 'West' },
    'georgia': { id: '2f7e9178-4e79-44d9-8a73-097fd7ad22f8', name: 'Georgia', fullName: 'Georgia Bulldogs', city: 'Athens', abbreviation: 'UGA', conference: 'SEC', division: 'East' },
    'ohio state': { id: 'c7569eae-5b93-4197-b204-6f3a62146b25', name: 'Ohio State', fullName: 'Ohio State Buckeyes', city: 'Columbus', abbreviation: 'OSU', conference: 'Big Ten', division: 'East' },
    'michigan': { id: 'd3e8c416-e643-4d5e-be8e-c0dddcd0f0e4', name: 'Michigan', fullName: 'Michigan Wolverines', city: 'Ann Arbor', abbreviation: 'MICH', conference: 'Big Ten', division: 'East' }
  },
  wnba: {
    'storm': { id: '3f667445-0e7f-11e2-bde9-18a905767e44', name: 'Storm', fullName: 'Seattle Storm', city: 'Seattle', abbreviation: 'SEA', conference: 'Western', division: 'Western' },
    'aces': { id: '8c7b1e2f-4432-4441-be52-2d98ba34da8f', name: 'Aces', fullName: 'Las Vegas Aces', city: 'Las Vegas', abbreviation: 'LV', conference: 'Western', division: 'Western' },
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

// Player name mappings (sample data)
const PLAYER_MAPPINGS: Record<string, PlayerResult[]> = {
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