// Sports Radar API Client
import { SAMPLE_DATES, getOptimalDate } from './sampleDates';

const API_KEY = process.env.NEXT_PUBLIC_SPORTRADAR_API_KEY || '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd';

// Sport configurations with proper endpoints
export const SPORT_CONFIGS = {
  nba: {
    name: 'NBA',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/nba/trial/v8/en/games/2024/REG/schedule.json',
      standings: '/nba/trial/v8/en/seasons/2024/REG/standings.json',
      teamRoster: '/nba/trial/v8/en/teams/{team_id}/profile.json',
      gameBoxscore: '/nba/trial/v8/en/games/{game_id}/boxscore.json',
      playerProfile: '/nba/trial/v8/en/players/{player_id}/profile.json',
      dailySchedule: '/nba/trial/v8/en/games/{year}/{month}/{day}/schedule.json'
    },
    currentSeason: '2024'
  },
  nfl: {
    name: 'NFL',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/nfl/official/trial/v7/en/games/2024/REG/schedule.json',
      standings: '/nfl/official/trial/v7/en/seasons/2024/standings.json',
      teamRoster: '/nfl/official/trial/v7/en/teams/{team_id}/roster.json',
      gameBoxscore: '/nfl/official/trial/v7/en/games/{game_id}/boxscore.json',
      currentWeek: '/nfl/official/trial/v7/en/seasons/2024/current_week.json'
    },
    currentSeason: '2024'
  },
  mlb: {
    name: 'MLB',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/mlb/trial/v7/en/games/{year}/{month}/{day}/schedule.json',
      standings: '/mlb/trial/v7/en/seasons/{season}/REG/standings.json',
      teamRoster: '/mlb/trial/v7/en/teams/{team_id}/roster.json',
      gameBoxscore: '/mlb/trial/v7/en/games/{game_id}/boxscore.json',
      dailySchedule: '/mlb/trial/v7/en/games/{year}/{month}/{day}/schedule.json'
    },
    currentSeason: '2024'
  },
  nhl: {
    name: 'NHL',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/nhl/trial/v7/en/games/{year}/{month}/{day}/schedule.json',
      standings: '/nhl/trial/v7/en/seasons/{season}/REG/standings.json',
      teamRoster: '/nhl/trial/v7/en/teams/{team_id}/roster.json',
      gameBoxscore: '/nhl/trial/v7/en/games/{game_id}/boxscore.json',
      dailySchedule: '/nhl/trial/v7/en/games/{year}/{month}/{day}/schedule.json'
    },
    currentSeason: '2024'
  },
  ncaamb: {
    name: 'NCAA Basketball',
    baseUrl: 'https://api.sportradar.com/ncaamb/trial/v8/en',
    endpoints: {
      games: '/games/{date}/schedule.json',
      standings: '/seasons/{season}/REG/standings.json',
      rankings: '/polls/AP25/{season}/{week}/rankings.json',
      tournament: '/tournaments/{tournament_id}/schedule.json',
      dailySchedule: '/games/{year}/{month}/{day}/schedule.json'
    },
    currentSeason: '2024'
  },
  ncaafb: {
    name: 'NCAA Football',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/ncaafb/trial/v7/en/games/2024/REG/schedule.json',
      standings: '/ncaafb/trial/v7/en/seasons/2024/standings.json',
      rankings: '/ncaafb/trial/v7/en/polls/AP25/2024/{week}/rankings.json',
      teamRoster: '/ncaafb/trial/v7/en/teams/{team_id}/roster.json'
    },
    currentSeason: '2024'
  },
  tennis: {
    name: 'Tennis',
    baseUrl: 'https://api.sportradar.com/tennis/trial/v3/en',
    endpoints: {
      dailySchedule: '/schedules/{date}/schedule.json',
      rankings: '/rankings.json',
      playerProfile: '/players/{player_id}/profile.json',
      tournamentSchedule: '/tournaments/{tournament_id}/schedule.json'
    }
  },
  soccer: {
    name: 'Soccer',
    baseUrl: 'https://api.sportradar.com/soccer/trial/v4/en',
    endpoints: {
      competitions: '/competitions.json',
      seasonSchedule: '/competitions/{competition_id}/seasons/{season_id}/schedules.json',
      standings: '/competitions/{competition_id}/seasons/{season_id}/standings.json',
      teamProfile: '/teams/{team_id}/profile.json',
      dailySchedule: '/schedules/{date}/schedule.json'
    }
  },
  wnba: {
    name: 'WNBA',
    baseUrl: 'https://api.sportradar.com',
    endpoints: {
      games: '/wnba/trial/v8/en/games/2024/REG/schedule.json',
      standings: '/wnba/trial/v8/en/seasons/2024/REG/standings.json',
      teamRoster: '/wnba/trial/v8/en/teams/{team_id}/profile.json',
      gameBoxscore: '/wnba/trial/v8/en/games/{game_id}/boxscore.json',
      dailySchedule: '/wnba/trial/v8/en/games/{year}/{month}/{day}/schedule.json'
    },
    currentSeason: '2024'
  },
  mls: {
    name: 'MLS',
    baseUrl: 'https://api.sportradar.com/soccer/trial/v4/en',
    endpoints: {
      seasonSchedule: '/competitions/sr:competition:242/seasons/{season_id}/schedules.json',
      standings: '/competitions/sr:competition:242/seasons/{season_id}/standings.json',
      teamProfile: '/teams/{team_id}/profile.json'
    },
    competitionId: 'sr:competition:242',
    currentSeason: 'sr:season:114313'
  },
  ufc: {
    name: 'UFC/MMA',
    baseUrl: 'https://api.sportradar.com/mma/trial/v2/en',
    endpoints: {
      schedule: '/schedules/{date}/schedule.json',
      events: '/events.json',
      fightCard: '/events/{event_id}/summary.json',
      fighterProfile: '/competitors/{fighter_id}/profile.json'
    }
  },
  boxing: {
    name: 'Boxing',
    baseUrl: 'https://api.sportradar.com/boxing/trial/v2/en',
    endpoints: {
      schedule: '/schedules/{date}/summaries.json',
      events: '/schedules/{date}/schedule.json',
      fightCard: '/events/{event_id}/summary.json',
      fighterProfile: '/competitors/{fighter_id}/profile.json'
    }
  },
  golf: {
    name: 'Golf',
    baseUrl: 'https://api.sportradar.com/golf/trial/v3/en',
    endpoints: {
      tournaments: '/tournaments.json',
      schedule: '/schedules/{year}/tournaments.json',
      leaderboard: '/tournaments/{tournament_id}/leaderboard.json',
      playerProfile: '/players/{player_id}/profile.json',
      statistics: '/players/{player_id}/statistics/{year}.json'
    },
    currentSeason: '2024'
  }
};

// Helper to format dates
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to format date parts
export function getDateParts(date: Date = new Date()) {
  return {
    year: date.getFullYear().toString(),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    day: String(date.getDate()).padStart(2, '0'),
    date: formatDate(date)
  };
}

// Helper to get current NFL week
export function getCurrentNFLWeek(): string {
  const seasonStart = new Date('2024-09-05'); // NFL 2024 season start
  const now = new Date();
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(1, weeksSinceStart + 1), 18).toString(); // Regular season weeks 1-18
}

// Helper to get current NCAA week
export function getCurrentNCAAWeek(): string {
  const seasonStart = new Date('2024-08-24'); // NCAA Football 2024 season start
  const now = new Date();
  const weeksSinceStart = Math.floor((now.getTime() - seasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(1, weeksSinceStart + 1), 15).toString();
}

// Cache implementation
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

function getCacheKey(sport: string, endpoint: string, params: any): string {
  return `${sport}:${endpoint}:${JSON.stringify(params)}`;
}

function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Main API fetch function
export async function fetchSportsData(
  sport: keyof typeof SPORT_CONFIGS,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  const config = SPORT_CONFIGS[sport];
  if (!config) {
    throw new Error(`Invalid sport: ${sport}`);
  }

  // Check cache first
  const cacheKey = getCacheKey(sport, endpoint, params);
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    console.log(`Using cached data for ${sport}:${endpoint}`);
    return cachedData;
  }

  // Build URL
  let url = `${config.baseUrl}${endpoint}`;
  
  // Replace placeholders in URL
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`{${key}}`, value);
  });

  // Add API key
  url += `?api_key=${API_KEY}`;

  console.log(`Fetching from Sports Radar: ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 } // Next.js caching
    });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      // Handle other errors
      throw new Error(`Failed to fetch ${sport} data: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache the successful response
    setCachedData(cacheKey, data);
    
    return data;
  } catch (error) {
    console.error(`Error fetching ${sport} data:`, error);
    throw error;
  }
}

// Specific sport data fetchers
export async function getTodaysGames(sport: keyof typeof SPORT_CONFIGS): Promise<any> {
  // Use fallback data for endpoints that have issues
  
  try {
    switch (sport) {
      case 'nba':
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.games, {});
      
      case 'wnba':
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.games, {});
      
      case 'ncaamb': {
        // NCAA Basketball season: November-March (March Madness)
        const now = new Date();
        const month = now.getMonth() + 1;
        
        // Check if in season
        if (month >= 4 && month <= 10) {
          console.log('NCAA Basketball is in off-season (April-October)');
          return { games: [] };
        }
        
        // Use current date for NCAA Basketball
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule!, {
          year: now.getFullYear().toString(),
          month: String(month).padStart(2, '0'),
          day: String(now.getDate()).padStart(2, '0')
        });
      }
      
      case 'nfl':
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.games, {});
      
      case 'ncaafb':
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.games, {});
      
      case 'mlb': {
        // MLB season: April-October
        const now = new Date();
        const month = now.getMonth() + 1;
        
        // Check if in season
        if (month < 4 || month > 10) {
          console.log('MLB is in off-season');
          return { games: [] };
        }
        
        // Use current date for MLB
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule!, {
          year: now.getFullYear().toString(),
          month: String(month).padStart(2, '0'),
          day: String(now.getDate()).padStart(2, '0')
        });
      }
      
      case 'nhl': {
        // NHL season: October-April (playoffs through June)
        const now = new Date();
        const month = now.getMonth() + 1;
        
        // Check if in season (October-June)
        if (month >= 7 && month <= 9) {
          console.log('NHL is in off-season (July-September)');
          return { games: [] };
        }
        
        // Use current date for NHL
        return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule!, {
          year: now.getFullYear().toString(),
          month: String(month).padStart(2, '0'),
          day: String(now.getDate()).padStart(2, '0')
        });
      }
      
      case 'golf':
        // Get current tournaments and leaderboards
        try {
          const year = new Date().getFullYear().toString();
          const tournaments = await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.schedule, { year });
          return { tournaments: tournaments?.tournaments || [] };
        } catch (error) {
          console.log(`Using fallback data for golf due to API limitations`);
          return generateFallbackSportsData(sport);
        }
      
      case 'tennis':
        // Get today's tennis matches
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule, { date });
        } catch (error) {
          console.log(`Using fallback data for tennis due to API limitations`);
          return generateFallbackSportsData(sport);
        }
      
      case 'soccer':
      case 'mls':
        // Get MLS/Soccer matches
        try {
          if (sport === 'mls') {
            const seasonId = SPORT_CONFIGS.mls.currentSeason || 'sr:season:114313';
            return await fetchSportsData('soccer', SPORT_CONFIGS.mls.endpoints.seasonSchedule, {
              season_id: seasonId
            });
          } else {
            const date = formatDate(new Date());
            return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule, { date });
          }
        } catch (error) {
          console.log(`Using fallback data for ${sport} due to API limitations`);
          return generateFallbackSportsData(sport);
        }
      
      case 'ufc':
        // Get UFC/MMA events
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.schedule, { date });
        } catch (error) {
          console.log(`Using fallback data for UFC due to API limitations`);
          return generateFallbackSportsData(sport);
        }
      
      case 'boxing':
        // Get boxing events
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.events, { date });
        } catch (error) {
          console.log(`Using fallback data for boxing due to API limitations`);
          return generateFallbackSportsData(sport);
        }
      
      default:
        throw new Error(`Unsupported sport for today's games: ${sport}`);
    }
  } catch (error) {
    console.warn(`API error for ${sport}, using fallback data:`, error);
    return generateFallbackSportsData(sport);
  }
}

// Generate fallback data for sports with API issues
function generateFallbackSportsData(sport: string): any {
  const sampleTeams: Record<string, string[]> = {
    tennis: ['Novak Djokovic', 'Carlos Alcaraz', 'Jannik Sinner', 'Daniil Medvedev', 'Holger Rune', 'Alexander Zverev'],
    soccer: ['Real Madrid', 'Barcelona', 'Bayern Munich', 'Liverpool', 'Man City', 'PSG', 'Arsenal', 'Chelsea'],
    ufc: ['Jon Jones', 'Islam Makhachev', 'Israel Adesanya', 'Alex Pereira', 'Leon Edwards', 'Charles Oliveira'],
    boxing: ['Canelo Alvarez', 'Tyson Fury', 'Errol Spence Jr', 'Terence Crawford', 'Gervonta Davis', 'Ryan Garcia'],
    mls: ['Atlanta United', 'LA Galaxy', 'NYCFC', 'Seattle Sounders', 'Portland Timbers', 'LAFC', 'Miami', 'Nashville'],
    golf: ['Scottie Scheffler', 'Jon Rahm', 'Rory McIlroy', 'Viktor Hovland', 'Patrick Cantlay', 'Xander Schauffele', 'Max Homa', 'Jordan Spieth']
  };

  const teams = sampleTeams[sport] || ['Team A', 'Team B', 'Team C', 'Team D'];
  const events: any[] = [];

  // Generate 3-5 sample events
  for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
    const homeIndex = Math.floor(Math.random() * teams.length);
    let awayIndex = Math.floor(Math.random() * teams.length);
    while (awayIndex === homeIndex) {
      awayIndex = Math.floor(Math.random() * teams.length);
    }

    const status = i === 0 ? 'live' : Math.random() > 0.5 ? 'scheduled' : 'completed';
    const startTime = new Date(Date.now() + (i * 86400000)).toISOString();

    if (sport === 'tennis') {
      events.push({
        id: `${sport}-${i}`,
        competitors: [
          { name: teams[homeIndex], qualifier: 'home' },
          { name: teams[awayIndex], qualifier: 'away' }
        ],
        scheduled: startTime,
        sport_event_status: { status: status === 'live' ? 'live' : status },
        venue: { name: `${sport === 'tennis' ? 'Court' : 'Stadium'} ${i + 1}` }
      });
    } else if (sport === 'soccer' || sport === 'mls') {
      events.push({
        sport_event: {
          id: `${sport}-${i}`,
          competitors: [
            { name: teams[homeIndex], qualifier: 'home' },
            { name: teams[awayIndex], qualifier: 'away' }
          ],
          scheduled: startTime,
          venue: { name: `Stadium ${i + 1}` }
        },
        sport_event_status: {
          status: status === 'live' ? 'live' : status,
          home_score: status !== 'scheduled' ? Math.floor(Math.random() * 4) : undefined,
          away_score: status !== 'scheduled' ? Math.floor(Math.random() * 4) : undefined
        }
      });
    } else if (sport === 'ufc' || sport === 'boxing') {
      events.push({
        id: `event-${i}`,
        scheduled: startTime,
        venue: { name: `Arena ${i + 1}` },
        fights: [
          {
            id: `fight-${i}`,
            competitors: [
              { name: teams[homeIndex] },
              { name: teams[awayIndex] }
            ],
            status: status,
            scheduled: startTime
          }
        ]
      });
    }
  }

  // Special handling for golf tournaments
  if (sport === 'golf') {
    const tournaments = [];
    const tournamentNames = ['The Masters', 'PGA Championship', 'US Open', 'The Open Championship', 'The Players Championship'];
    
    for (let i = 0; i < 2; i++) {
      const leaderboard = [];
      for (let j = 0; j < Math.min(10, teams.length); j++) {
        leaderboard.push({
          position: j + 1,
          player: { name: teams[j] },
          score: j === 0 ? -8 : -8 + j,
          strokes: 272 + j,
          rounds: [68, 70, 69, 65 + j]
        });
      }
      
      tournaments.push({
        id: `tournament-${i}`,
        name: tournamentNames[i % tournamentNames.length],
        start_date: new Date(Date.now() - (i * 7 * 86400000)).toISOString(),
        end_date: new Date(Date.now() + ((4 - i) * 86400000)).toISOString(),
        status: i === 0 ? 'in_progress' : 'scheduled',
        leaderboard: i === 0 ? leaderboard : undefined
      });
    }
    return { tournaments };
  }

  // Return data in expected format
  if (sport === 'tennis') {
    return { sport_events: events };
  } else if (sport === 'soccer' || sport === 'mls') {
    return { schedules: events };
  } else if (sport === 'ufc' || sport === 'boxing') {
    return { events: events };
  }

  return { events };
}

// Get standings for team sports
export async function getStandings(sport: keyof typeof SPORT_CONFIGS): Promise<any> {
  const config = SPORT_CONFIGS[sport];
  
  if (!config.endpoints.standings) {
    throw new Error(`Standings not available for ${sport}`);
  }
  
  const season = config.currentSeason || new Date().getFullYear().toString();
  
  switch (sport) {
    case 'mls':
      return fetchSportsData('soccer', config.endpoints.standings, {
        season_id: config.currentSeason!
      });
    
    default:
      return fetchSportsData(sport, config.endpoints.standings, {
        season
      });
  }
}

// Get live scores
export async function getLiveScores(sport: keyof typeof SPORT_CONFIGS): Promise<any> {
  // For live scores, we'll use the daily schedule and filter for in-progress games
  const games = await getTodaysGames(sport);
  
  // Filter for live games based on sport-specific logic
  if (games?.games) {
    return games.games.filter((game: any) => 
      game.status === 'inprogress' || 
      game.status === 'live' ||
      game.status === 'halftime'
    );
  }
  
  if (games?.schedules) {
    return games.schedules.filter((match: any) => 
      match.status === 'live' || 
      match.sport_event_status?.status === 'live'
    );
  }
  
  return [];
}

// Get odds data (placeholder - would need separate odds provider)
export async function getOddsData(sport: keyof typeof SPORT_CONFIGS): Promise<any> {
  // Sports Radar doesn't provide odds in their trial API
  // This would need integration with a separate odds provider
  console.log(`Odds data requested for ${sport} - not available in trial API`);
  return {
    message: 'Odds data requires separate provider integration',
    sport,
    games: []
  };
}