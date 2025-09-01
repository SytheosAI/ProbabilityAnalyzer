// Comprehensive Sports Data Service
// Handles all data fetching for 12 sports with real Sports Radar API integration

import { SPORT_CONFIGS, fetchSportsData, formatDate, getDateParts, getTodaysGames } from '@/lib/sportsRadar';

// Type definitions
export interface Game {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'postponed';
  startTime: string;
  venue?: string;
  homeMoneyline?: number;
  awayMoneyline?: number;
  spread?: {
    line: number;
    homeOdds: number;
    awayOdds: number;
  };
  total?: {
    line: number;
    overOdds: number;
    underOdds: number;
  };
  period?: string;
  timeRemaining?: string;
  broadcast?: string[];
}

export interface Team {
  id: string;
  name: string;
  city?: string;
  abbreviation?: string;
  conference?: string;
  division?: string;
  wins?: number;
  losses?: number;
  ties?: number;
  winPercentage?: number;
  rank?: number;
  logo?: string;
}

export interface Player {
  id: string;
  name: string;
  team?: string;
  teamId?: string;
  position?: string;
  jersey?: string;
  height?: string;
  weight?: string;
  age?: number;
  status?: 'active' | 'injured' | 'suspended' | 'inactive';
  injuryStatus?: string;
  stats?: Record<string, any>;
}

export interface SportData {
  sport: string;
  games: Game[];
  teams?: Team[];
  standings?: any;
  lastUpdated: string;
  dataSource: 'live' | 'cached' | 'sample';
}

// Moneyline calculation utilities
export function calculateImpliedProbability(moneyline: number): number {
  if (moneyline > 0) {
    return 100 / (moneyline + 100);
  } else {
    return Math.abs(moneyline) / (Math.abs(moneyline) + 100);
  }
}

export function calculateExpectedValue(moneyline: number, winProbability: number): number {
  const impliedProb = calculateImpliedProbability(moneyline);
  const payout = moneyline > 0 ? moneyline / 100 : 100 / Math.abs(moneyline);
  return (winProbability * payout) - (1 - winProbability);
}

// Parse game data from different API response formats
function parseGameData(sport: string, rawData: any): Game[] {
  const games: Game[] = [];
  
  try {
    switch (sport) {
      case 'nba':
      case 'wnba':
      case 'ncaamb':
        if (rawData?.games) {
          rawData.games.forEach((game: any) => {
            games.push({
              id: game.id,
              homeTeam: game.home?.name || game.home_team?.name || 'TBD',
              awayTeam: game.away?.name || game.away_team?.name || 'TBD',
              homeScore: game.home_points || game.home?.points,
              awayScore: game.away_points || game.away?.points,
              status: mapGameStatus(game.status),
              startTime: game.scheduled || game.start_time,
              venue: game.venue?.name,
              period: game.period?.toString(),
              timeRemaining: game.clock,
              broadcast: game.broadcasts?.map((b: any) => b.network)
            });
          });
        }
        break;
      
      case 'nfl':
      case 'ncaafb':
        // NFL and NCAA Football data structure has weeks containing games
        if (rawData?.weeks) {
          // Iterate through all weeks and extract games
          rawData.weeks.forEach((week: any) => {
            if (week.games) {
              week.games.forEach((game: any) => {
                games.push({
                  id: game.id,
                  homeTeam: game.home?.name || 'TBD',
                  awayTeam: game.away?.name || 'TBD',
                  homeScore: game.scoring?.home_points,
                  awayScore: game.scoring?.away_points,
                  status: mapGameStatus(game.status),
                  startTime: game.scheduled,
                  venue: game.venue?.name,
                  broadcast: game.broadcast?.network ? [game.broadcast.network] : []
                });
              });
            }
          });
        } else if (rawData?.games) {
          // Direct games array
          rawData.games.forEach((game: any) => {
            games.push({
              id: game.id,
              homeTeam: game.home?.name || 'TBD',
              awayTeam: game.away?.name || 'TBD',
              homeScore: game.home_points || game.scoring?.home_points,
              awayScore: game.away_points || game.scoring?.away_points,
              status: mapGameStatus(game.status),
              startTime: game.scheduled,
              venue: game.venue?.name,
              broadcast: game.broadcasts?.map((b: any) => b.network) || []
            });
          });
        }
        break;
      
      case 'mlb':
      case 'nhl':
        if (rawData?.games) {
          rawData.games.forEach((game: any) => {
            games.push({
              id: game.id,
              homeTeam: game.home?.name || game.home_team?.name || 'TBD',
              awayTeam: game.away?.name || game.away_team?.name || 'TBD',
              homeScore: game.home_runs || game.home?.runs || game.home_goals || game.home?.goals,
              awayScore: game.away_runs || game.away?.runs || game.away_goals || game.away?.goals,
              status: mapGameStatus(game.status),
              startTime: game.scheduled,
              venue: game.venue?.name,
              period: game.inning?.toString() || game.period?.toString(),
              broadcast: game.broadcasts?.map((b: any) => b.network)
            });
          });
        }
        break;
      
      case 'tennis':
        if (rawData?.sport_events) {
          rawData.sport_events.forEach((event: any) => {
            if (event.competitors?.length >= 2) {
              games.push({
                id: event.id,
                homeTeam: event.competitors[0]?.name || 'Player 1',
                awayTeam: event.competitors[1]?.name || 'Player 2',
                status: mapGameStatus(event.sport_event_status?.status),
                startTime: event.scheduled,
                venue: event.venue?.name || event.tournament?.name
              });
            }
          });
        }
        break;
      
      case 'soccer':
      case 'mls':
        if (rawData?.schedules) {
          rawData.schedules.forEach((match: any) => {
            games.push({
              id: match.sport_event?.id || match.id,
              homeTeam: match.sport_event?.competitors?.find((c: any) => c.qualifier === 'home')?.name || 'TBD',
              awayTeam: match.sport_event?.competitors?.find((c: any) => c.qualifier === 'away')?.name || 'TBD',
              homeScore: match.sport_event_status?.home_score,
              awayScore: match.sport_event_status?.away_score,
              status: mapGameStatus(match.sport_event_status?.status),
              startTime: match.sport_event?.scheduled || match.scheduled,
              venue: match.sport_event?.venue?.name
            });
          });
        }
        break;
      
      case 'ufc':
      case 'boxing':
        if (rawData?.events || rawData?.summaries) {
          const events = rawData.events || rawData.summaries || [];
          events.forEach((event: any) => {
            if (event.fights) {
              event.fights.forEach((fight: any) => {
                games.push({
                  id: fight.id,
                  homeTeam: fight.competitors?.[0]?.name || 'Fighter 1',
                  awayTeam: fight.competitors?.[1]?.name || 'Fighter 2',
                  status: mapGameStatus(fight.status),
                  startTime: event.scheduled || fight.scheduled,
                  venue: event.venue?.name
                });
              });
            }
          });
        }
        break;
      
      case 'golf':
        if (rawData?.tournaments) {
          rawData.tournaments.forEach((tournament: any) => {
            // Golf tournaments are multi-day events, we'll show them as "games"
            games.push({
              id: tournament.id,
              homeTeam: tournament.name || 'Tournament',
              awayTeam: `${tournament.leaderboard?.[0]?.player?.name || 'Leader'} (${tournament.leaderboard?.[0]?.score || 'E'})`,
              status: mapGameStatus(tournament.status),
              startTime: tournament.start_date,
              venue: tournament.course?.name || tournament.name,
              period: tournament.current_round ? `Round ${tournament.current_round}` : undefined
            });
          });
        }
        break;
    }
  } catch (error) {
    console.error(`Error parsing ${sport} game data:`, error);
  }
  
  return games;
}

// Map various status strings to our standard status
function mapGameStatus(status: string): Game['status'] {
  if (!status) return 'scheduled';
  
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('live') || lowerStatus.includes('inprogress') || lowerStatus.includes('in_progress')) {
    return 'in_progress';
  }
  if (lowerStatus.includes('complete') || lowerStatus.includes('final') || lowerStatus.includes('ended')) {
    return 'completed';
  }
  if (lowerStatus.includes('postpone') || lowerStatus.includes('cancel') || lowerStatus.includes('suspend')) {
    return 'postponed';
  }
  return 'scheduled';
}

// Main function to get games for a specific sport
export async function getSportGames(sport: string): Promise<SportData> {
  const sportKey = sport.toLowerCase() as keyof typeof SPORT_CONFIGS;
  const config = SPORT_CONFIGS[sportKey];
  
  if (!config) {
    throw new Error(`Unsupported sport: ${sport}`);
  }
  
  try {
    // Use the updated getTodaysGames function which has working endpoints
    const rawData = await getTodaysGames(sportKey);
    
    // Parse games
    const games = parseGameData(sportKey, rawData);
    
    // Add mock moneyline odds for demonstration
    games.forEach(game => {
      if (game.status === 'scheduled') {
        // Generate realistic-looking moneylines
        const favorite = Math.random() > 0.5;
        if (favorite) {
          game.homeMoneyline = -150 - Math.floor(Math.random() * 200);
          game.awayMoneyline = 120 + Math.floor(Math.random() * 150);
        } else {
          game.homeMoneyline = 110 + Math.floor(Math.random() * 150);
          game.awayMoneyline = -140 - Math.floor(Math.random() * 200);
        }
        
        // Add spread and total
        game.spread = {
          line: favorite ? -3.5 : 3.5,
          homeOdds: -110,
          awayOdds: -110
        };
        
        game.total = {
          line: 220 + Math.floor(Math.random() * 20),
          overOdds: -110,
          underOdds: -110
        };
      }
    });
    
    return {
      sport: config.name,
      games,
      lastUpdated: new Date().toISOString(),
      dataSource: 'live'
    };
  } catch (error) {
    console.error(`Error fetching ${sport} games:`, error);
    
    // Return sample data on error
    return {
      sport: config.name,
      games: generateSampleGames(sportKey),
      lastUpdated: new Date().toISOString(),
      dataSource: 'sample'
    };
  }
}

// Generate sample games for testing
function generateSampleGames(sport: string): Game[] {
  const sampleTeams: Record<string, string[]> = {
    nba: ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Nets', 'Suns'],
    nfl: ['Patriots', 'Chiefs', 'Bills', 'Cowboys', 'Packers', 'Eagles'],
    mlb: ['Yankees', 'Red Sox', 'Dodgers', 'Giants', 'Cubs', 'Cardinals'],
    nhl: ['Rangers', 'Bruins', 'Lightning', 'Avalanche', 'Maple Leafs', 'Penguins'],
    ncaamb: ['Duke', 'Kentucky', 'Kansas', 'North Carolina', 'UCLA', 'Gonzaga'],
    ncaafb: ['Alabama', 'Georgia', 'Ohio State', 'Michigan', 'Texas', 'Oklahoma'],
    wnba: ['Storm', 'Aces', 'Liberty', 'Sun', 'Mercury', 'Lynx'],
    mls: ['Atlanta United', 'LA Galaxy', 'NYCFC', 'Seattle Sounders', 'Portland Timbers', 'LAFC'],
    tennis: ['Djokovic', 'Alcaraz', 'Medvedev', 'Sinner', 'Rune', 'Tsitsipas'],
    soccer: ['Real Madrid', 'Barcelona', 'Bayern Munich', 'Liverpool', 'Man City', 'PSG'],
    ufc: ['Jon Jones', 'Israel Adesanya', 'Alex Pereira', 'Leon Edwards', 'Islam Makhachev', 'Charles Oliveira'],
    boxing: ['Canelo Alvarez', 'Tyson Fury', 'Errol Spence Jr', 'Terence Crawford', 'Gervonta Davis', 'Ryan Garcia'],
    golf: ['Scottie Scheffler', 'Jon Rahm', 'Rory McIlroy', 'Viktor Hovland', 'Patrick Cantlay', 'Xander Schauffele']
  };
  
  const teams = sampleTeams[sport] || ['Team A', 'Team B', 'Team C', 'Team D'];
  const games: Game[] = [];
  
  // Generate 3-6 sample games
  const numGames = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < numGames; i++) {
    const homeIndex = Math.floor(Math.random() * teams.length);
    let awayIndex = Math.floor(Math.random() * teams.length);
    while (awayIndex === homeIndex) {
      awayIndex = Math.floor(Math.random() * teams.length);
    }
    
    const status = ['scheduled', 'in_progress', 'completed'][Math.floor(Math.random() * 3)] as Game['status'];
    const favorite = Math.random() > 0.5;
    
    games.push({
      id: `sample-${sport}-${i}`,
      homeTeam: teams[homeIndex],
      awayTeam: teams[awayIndex],
      homeScore: status !== 'scheduled' ? Math.floor(Math.random() * 100) : undefined,
      awayScore: status !== 'scheduled' ? Math.floor(Math.random() * 100) : undefined,
      status,
      startTime: new Date(Date.now() + Math.random() * 86400000).toISOString(),
      venue: `Stadium ${i + 1}`,
      homeMoneyline: favorite ? -150 - Math.floor(Math.random() * 200) : 120 + Math.floor(Math.random() * 150),
      awayMoneyline: favorite ? 120 + Math.floor(Math.random() * 150) : -150 - Math.floor(Math.random() * 200),
      spread: {
        line: favorite ? -3.5 : 3.5,
        homeOdds: -110,
        awayOdds: -110
      },
      total: {
        line: 220 + Math.floor(Math.random() * 20),
        overOdds: -110,
        underOdds: -110
      }
    });
  }
  
  return games;
}

// Get all games for all sports
export async function getAllSportsGames(): Promise<SportData[]> {
  // Ensure we're fetching all 12 sports
  const allSports = [
    'nba', 'nfl', 'mlb', 'nhl', 'wnba', 'mls', 
    'ncaamb', 'ncaafb', 'tennis', 'soccer', 'ufc', 
    'boxing', 'golf'
  ];
  
  console.log(`Fetching data for ${allSports.length} sports...`);
  
  const results = await Promise.allSettled(
    allSports.map(async (sport) => {
      try {
        console.log(`Fetching ${sport} games...`);
        const data = await getSportGames(sport);
        console.log(`${sport}: ${data.games.length} games found`);
        return data;
      } catch (error) {
        console.error(`Error fetching ${sport}:`, error);
        // Return sample data on error to ensure all sports are represented
        return {
          sport: SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS]?.name || sport.toUpperCase(),
          games: generateSampleGames(sport),
          lastUpdated: new Date().toISOString(),
          dataSource: 'sample' as const
        };
      }
    })
  );
  
  const successfulResults = results
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<SportData>).value);
  
  console.log(`Successfully fetched data for ${successfulResults.length} sports`);
  
  // Ensure we have data for all sports, even if some failed
  const fetchedSports = new Set(successfulResults.map(r => r.sport.toLowerCase()));
  const missingSports = allSports.filter(sport => 
    !fetchedSports.has(SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS]?.name.toLowerCase() || sport)
  );
  
  // Add sample data for any missing sports
  missingSports.forEach(sport => {
    console.log(`Adding sample data for missing sport: ${sport}`);
    successfulResults.push({
      sport: SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS]?.name || sport.toUpperCase(),
      games: generateSampleGames(sport),
      lastUpdated: new Date().toISOString(),
      dataSource: 'sample'
    });
  });
  
  return successfulResults;
}

// Search for teams across all sports
export async function searchTeams(query: string): Promise<Team[]> {
  // This would normally search the API, but for now return mock data
  const allTeams: Team[] = [
    // NBA
    { id: 'lal', name: 'Lakers', city: 'Los Angeles', abbreviation: 'LAL', conference: 'Western', division: 'Pacific' },
    { id: 'gsw', name: 'Warriors', city: 'Golden State', abbreviation: 'GSW', conference: 'Western', division: 'Pacific' },
    { id: 'bos', name: 'Celtics', city: 'Boston', abbreviation: 'BOS', conference: 'Eastern', division: 'Atlantic' },
    // NFL
    { id: 'ne', name: 'Patriots', city: 'New England', abbreviation: 'NE', conference: 'AFC', division: 'East' },
    { id: 'kc', name: 'Chiefs', city: 'Kansas City', abbreviation: 'KC', conference: 'AFC', division: 'West' },
    // Add more teams as needed
  ];
  
  const lowerQuery = query.toLowerCase();
  return allTeams.filter(team => 
    team.name.toLowerCase().includes(lowerQuery) ||
    team.city?.toLowerCase().includes(lowerQuery) ||
    team.abbreviation?.toLowerCase().includes(lowerQuery)
  );
}

// Search for players across all sports
export async function searchPlayers(query: string): Promise<Player[]> {
  // This would normally search the API, but for now return mock data
  const allPlayers: Player[] = [
    // NBA
    { id: 'lbj', name: 'LeBron James', team: 'Lakers', position: 'F', jersey: '23', status: 'active' },
    { id: 'sc30', name: 'Stephen Curry', team: 'Warriors', position: 'G', jersey: '30', status: 'active' },
    // NFL
    { id: 'pm15', name: 'Patrick Mahomes', team: 'Chiefs', position: 'QB', jersey: '15', status: 'active' },
    // Add more players as needed
  ];
  
  const lowerQuery = query.toLowerCase();
  return allPlayers.filter(player => 
    player.name.toLowerCase().includes(lowerQuery) ||
    player.team?.toLowerCase().includes(lowerQuery) ||
    player.position?.toLowerCase().includes(lowerQuery)
  );
}