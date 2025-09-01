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
          console.log(`No golf data available - API error`);
          return { tournaments: [] };
        }
      
      case 'tennis':
        // Get today's tennis matches
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.dailySchedule, { date });
        } catch (error) {
          console.log(`No tennis data available - API error`);
          return { sport_events: [] };
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
          console.log(`No ${sport} data available - API error`);
          return { schedules: [] };
        }
      
      case 'ufc':
        // Get UFC/MMA events
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.schedule, { date });
        } catch (error) {
          console.log(`No UFC data available - API error`);
          return { events: [] };
        }
      
      case 'boxing':
        // Get boxing events
        try {
          const date = formatDate(new Date());
          return await fetchSportsData(sport, SPORT_CONFIGS[sport].endpoints.events, { date });
        } catch (error) {
          console.log(`No boxing data available - API error`);
          return { events: [] };
        }
      
      default:
        throw new Error(`Unsupported sport for today's games: ${sport}`);
    }
  } catch (error) {
    console.warn(`API error for ${sport} - returning empty data:`, error);
    return {};
  }
}

// ALL FAKE DATA GENERATION REMOVED - LIVE DATA ONLY

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