/**
 * ESPN API Service - Comprehensive Sports Data Integration
 * Free API with no authentication required
 * Based on https://gist.github.com/akeaswaran/b48b02f1c94f873c6655e7129910fc3b
 */

const ESPN_BASE_URL = 'https://site.api.espn.com/apis/site/v2/sports';

export interface ESPNTeam {
  id: string;
  uid: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  color?: string;
  alternateColor?: string;
  logo?: string;
  record?: {
    items: Array<{
      summary: string;
      stats: Array<{
        name: string;
        value: number;
      }>;
    }>;
  };
  links?: Array<{
    rel: string[];
    href: string;
    text: string;
  }>;
}

export interface ESPNAthlete {
  id: string;
  uid: string;
  guid: string;
  fullName: string;
  displayName: string;
  shortName: string;
  jersey?: string;
  position?: {
    abbreviation: string;
    displayName: string;
    name: string;
  };
  team?: {
    id: string;
    displayName: string;
    shortDisplayName: string;
  };
  injuries?: Array<{
    status: string;
    date: string;
    details: {
      type: string;
      location: string;
      detail: string;
      side?: string;
      returnDate?: string;
    };
  }>;
  statistics?: {
    splits: {
      categories: Array<{
        name: string;
        displayName: string;
        stats: Array<{
          name: string;
          displayName: string;
          value: number;
          displayValue: string;
        }>;
      }>;
    };
  };
  qbr?: {
    current: number;
    season: number;
    career: number;
  };
}

export interface ESPNEvent {
  id: string;
  uid: string;
  date: string;
  name: string;
  shortName: string;
  competitions: Array<{
    id: string;
    uid: string;
    date: string;
    attendance?: number;
    type: {
      id: string;
      abbreviation: string;
    };
    timeValid: boolean;
    neutralSite: boolean;
    conferenceCompetition: boolean;
    playByPlayAvailable: boolean;
    recent: boolean;
    venue?: {
      id: string;
      fullName: string;
      address: {
        city: string;
        state?: string;
      };
      capacity?: number;
      indoor: boolean;
      grass?: boolean;
    };
    competitors: Array<{
      id: string;
      uid: string;
      type: string;
      order: number;
      homeAway: string;
      team: ESPNTeam;
      score?: string;
      statistics?: Array<{
        name: string;
        abbreviation: string;
        displayValue: string;
      }>;
      records?: Array<{
        name: string;
        abbreviation?: string;
        type: string;
        summary: string;
      }>;
      leaders?: Array<{
        name: string;
        displayName: string;
        shortDisplayName: string;
        abbreviation: string;
        leaders: Array<{
          displayValue: string;
          value: number;
          athlete: ESPNAthlete;
        }>;
      }>;
      probables?: Array<ESPNAthlete>;
      linescores?: Array<{
        value: number;
      }>;
    }>;
    status: {
      clock?: number;
      displayClock?: string;
      period?: number;
      type: {
        id: string;
        name: string;
        state: string;
        completed: boolean;
        description: string;
        detail: string;
        shortDetail: string;
      };
    };
    broadcasts?: Array<{
      market: string;
      names: string[];
    }>;
    odds?: Array<{
      provider: {
        id: string;
        name: string;
        priority: number;
      };
      details: string;
      overUnder?: number;
      spread?: number;
      overOdds?: number;
      underOdds?: number;
      awayTeamOdds?: {
        favorite: boolean;
        underdog: boolean;
        moneyLine?: number;
        spreadOdds?: number;
      };
      homeTeamOdds?: {
        favorite: boolean;
        underdog: boolean;
        moneyLine?: number;
        spreadOdds?: number;
      };
    }>;
    situation?: {
      lastPlay?: {
        id: string;
        type: {
          id: string;
          text: string;
        };
        text: string;
        probability?: {
          homeWinPercentage: number;
          awayWinPercentage: number;
        };
      };
      down?: number;
      yardLine?: number;
      distance?: number;
      downDistanceText?: string;
      shortDownDistanceText?: string;
      possessionText?: string;
      isRedZone?: boolean;
      homeTimeouts?: number;
      awayTimeouts?: number;
    };
    officials?: Array<{
      fullName: string;
      displayName: string;
      position: {
        name: string;
        displayName: string;
      };
      order: number;
    }>;
    weather?: {
      displayValue: string;
      temperature: number;
      highTemperature?: number;
      conditionId?: string;
      link?: {
        language: string;
        rel: string[];
        href: string;
        text: string;
        shortText: string;
        isExternal: boolean;
        isPremium: boolean;
      };
    };
  }>;
  links?: Array<{
    language: string;
    rel: string[];
    href: string;
    text: string;
    shortText: string;
    isExternal: boolean;
    isPremium: boolean;
  }>;
  weather?: {
    displayValue: string;
    temperature: number;
    highTemperature?: number;
    conditionId?: string;
  };
  status: {
    clock?: number;
    displayClock?: string;
    period?: number;
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
      description: string;
      detail: string;
      shortDetail: string;
    };
  };
}

export interface ESPNScoreboard {
  leagues: Array<{
    id: string;
    uid: string;
    name: string;
    abbreviation: string;
    slug: string;
    season: {
      year: number;
      startDate: string;
      endDate: string;
      displayName: string;
      type: {
        id: string;
        type: number;
        name: string;
        abbreviation: string;
      };
    };
    logos: Array<{
      href: string;
      width: number;
      height: number;
      alt: string;
      rel: string[];
      lastUpdated: string;
    }>;
    calendarType: string;
    calendarIsWhitelist: boolean;
    calendarStartDate: string;
    calendarEndDate: string;
    calendar: string[];
  }>;
  season?: {
    type: number;
    year: number;
  };
  day: {
    date: string;
  };
  events: ESPNEvent[];
}

export interface ESPNOdds {
  awayTeamOdds: {
    favorite: boolean;
    underdog: boolean;
    moneyLine?: number;
    spreadOdds?: number;
    team?: ESPNTeam;
  };
  homeTeamOdds: {
    favorite: boolean;
    underdog: boolean;
    moneyLine?: number;
    spreadOdds?: number;
    team?: ESPNTeam;
  };
  spread?: number;
  overUnder?: number;
  overOdds?: number;
  underOdds?: number;
  provider: {
    id: string;
    name: string;
    priority: number;
  };
  details: string;
  movement?: {
    line: Array<{
      timestamp: string;
      spread?: number;
      overUnder?: number;
      homeMoneyLine?: number;
      awayMoneyLine?: number;
    }>;
  };
}

export interface ESPNTeamSchedule {
  team: ESPNTeam;
  events: ESPNEvent[];
}

export interface ESPNStandings {
  season: {
    year: number;
    displayName: string;
  };
  standings: Array<{
    id: string;
    name: string;
    displayName: string;
    entries: Array<{
      team: ESPNTeam;
      stats: Array<{
        name: string;
        displayName: string;
        shortDisplayName: string;
        description: string;
        abbreviation: string;
        type: string;
        value: number;
        displayValue: string;
      }>;
    }>;
  }>;
}

export interface ESPNHeadToHead {
  teams: [ESPNTeam, ESPNTeam];
  events: ESPNEvent[];
  statistics: {
    team1: {
      wins: number;
      losses: number;
      ties?: number;
      winPercentage: number;
      pointsFor: number;
      pointsAgainst: number;
    };
    team2: {
      wins: number;
      losses: number;
      ties?: number;
      winPercentage: number;
      pointsFor: number;
      pointsAgainst: number;
    };
  };
}

class ESPNAPIService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  private async fetchWithCache(url: string): Promise<any> {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`Using cached ESPN data for ${url}`);
      return cached.data;
    }

    console.log(`Fetching ESPN data from: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ESPN API Error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('ESPN API Error:', error);
      throw error;
    }
  }

  // Get scoreboard for a specific sport and date
  async getScoreboard(
    sport: string, 
    league: string, 
    date?: string
  ): Promise<ESPNScoreboard> {
    const dateParam = date ? `?dates=${date.replace(/-/g, '')}` : '';
    const url = `${ESPN_BASE_URL}/${sport}/${league}/scoreboard${dateParam}`;
    return this.fetchWithCache(url);
  }

  // Get teams for a specific sport/league
  async getTeams(sport: string, league: string): Promise<ESPNTeam[]> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/teams`;
    const data = await this.fetchWithCache(url);
    return data.sports?.[0]?.leagues?.[0]?.teams?.map((t: any) => t.team) || [];
  }

  // Get specific team details
  async getTeam(sport: string, league: string, teamId: string): Promise<ESPNTeam> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/teams/${teamId}`;
    const data = await this.fetchWithCache(url);
    return data.team;
  }

  // Get team schedule
  async getTeamSchedule(
    sport: string, 
    league: string, 
    teamId: string
  ): Promise<ESPNTeamSchedule> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/teams/${teamId}/schedule`;
    const data = await this.fetchWithCache(url);
    return {
      team: data.team,
      events: data.events || []
    };
  }

  // Get team roster with injury information
  async getTeamRoster(
    sport: string, 
    league: string, 
    teamId: string
  ): Promise<ESPNAthlete[]> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/teams/${teamId}/roster`;
    const data = await this.fetchWithCache(url);
    return data.athletes || [];
  }

  // Get specific athlete details
  async getAthlete(
    sport: string, 
    league: string, 
    athleteId: string
  ): Promise<ESPNAthlete> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/athletes/${athleteId}`;
    const data = await this.fetchWithCache(url);
    return data.athlete;
  }

  // Get athlete stats
  async getAthleteStats(
    sport: string, 
    league: string, 
    athleteId: string
  ): Promise<any> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/athletes/${athleteId}/stats`;
    return this.fetchWithCache(url);
  }

  // Get game/event details
  async getEvent(sport: string, league: string, eventId: string): Promise<ESPNEvent> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/summary?event=${eventId}`;
    const data = await this.fetchWithCache(url);
    return data;
  }

  // Get odds for games
  async getOdds(sport: string, league: string): Promise<ESPNOdds[]> {
    const scoreboard = await this.getScoreboard(sport, league);
    const oddsData: ESPNOdds[] = [];
    
    for (const event of scoreboard.events) {
      if (event.competitions?.[0]?.odds) {
        for (const odds of event.competitions[0].odds) {
          oddsData.push({
            ...odds,
            awayTeamOdds: {
              ...odds.awayTeamOdds,
              team: event.competitions[0].competitors.find(c => c.homeAway === 'away')?.team
            },
            homeTeamOdds: {
              ...odds.homeTeamOdds,
              team: event.competitions[0].competitors.find(c => c.homeAway === 'home')?.team
            }
          });
        }
      }
    }
    
    return oddsData;
  }

  // Get standings
  async getStandings(sport: string, league: string): Promise<ESPNStandings> {
    const url = `${ESPN_BASE_URL}/${sport}/${league}/standings`;
    const data = await this.fetchWithCache(url);
    return {
      season: data.season,
      standings: data.children || []
    };
  }

  // Get news
  async getNews(sport: string, league: string, teamId?: string): Promise<any[]> {
    const teamParam = teamId ? `/${teamId}` : '';
    const url = `${ESPN_BASE_URL}/${sport}/${league}/teams${teamParam}/news`;
    const data = await this.fetchWithCache(url);
    return data.articles || [];
  }

  // Get head-to-head history
  async getHeadToHead(
    sport: string,
    league: string,
    team1Id: string,
    team2Id: string
  ): Promise<ESPNHeadToHead> {
    // Get both teams' schedules
    const [team1Schedule, team2Schedule] = await Promise.all([
      this.getTeamSchedule(sport, league, team1Id),
      this.getTeamSchedule(sport, league, team2Id)
    ]);

    // Find common games
    const h2hGames = team1Schedule.events.filter(event =>
      event.competitions?.[0]?.competitors?.some(c => c.team.id === team2Id)
    );

    // Calculate statistics
    let team1Wins = 0, team2Wins = 0, ties = 0;
    let team1PointsFor = 0, team1PointsAgainst = 0;
    let team2PointsFor = 0, team2PointsAgainst = 0;

    for (const game of h2hGames) {
      const competition = game.competitions?.[0];
      if (competition?.competitors && competition.status.type.completed) {
        const team1Competitor = competition.competitors.find(c => c.team.id === team1Id);
        const team2Competitor = competition.competitors.find(c => c.team.id === team2Id);
        
        if (team1Competitor?.score && team2Competitor?.score) {
          const score1 = parseInt(team1Competitor.score);
          const score2 = parseInt(team2Competitor.score);
          
          if (score1 > score2) team1Wins++;
          else if (score2 > score1) team2Wins++;
          else ties++;
          
          team1PointsFor += score1;
          team1PointsAgainst += score2;
          team2PointsFor += score2;
          team2PointsAgainst += score1;
        }
      }
    }

    return {
      teams: [team1Schedule.team, team2Schedule.team],
      events: h2hGames,
      statistics: {
        team1: {
          wins: team1Wins,
          losses: team2Wins,
          ties,
          winPercentage: team1Wins / (team1Wins + team2Wins + ties),
          pointsFor: team1PointsFor,
          pointsAgainst: team1PointsAgainst
        },
        team2: {
          wins: team2Wins,
          losses: team1Wins,
          ties,
          winPercentage: team2Wins / (team1Wins + team2Wins + ties),
          pointsFor: team2PointsFor,
          pointsAgainst: team2PointsAgainst
        }
      }
    };
  }

  // Get QBR ratings for NFL
  async getQBRRatings(): Promise<any> {
    const url = 'https://site.api.espn.com/apis/fitt/v3/sports/football/nfl/qbr?region=us&lang=en&qbrType=seasons&seasontype=2&isqualified=true';
    return this.fetchWithCache(url);
  }

  // Get recent performance (last N games)
  async getRecentPerformance(
    sport: string,
    league: string,
    teamId: string,
    games: number = 5
  ): Promise<any> {
    const schedule = await this.getTeamSchedule(sport, league, teamId);
    const completedGames = schedule.events
      .filter(e => e.competitions?.[0]?.status.type.completed)
      .slice(-games);
    
    const stats = {
      games: games,
      wins: 0,
      losses: 0,
      ties: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      atsRecord: { wins: 0, losses: 0, pushes: 0 },
      ouRecord: { overs: 0, unders: 0, pushes: 0 },
      performances: [] as any[]
    };

    for (const game of completedGames) {
      const competition = game.competitions?.[0];
      const teamCompetitor = competition?.competitors?.find(c => c.team.id === teamId);
      const opponentCompetitor = competition?.competitors?.find(c => c.team.id !== teamId);
      
      if (teamCompetitor && opponentCompetitor) {
        const teamScore = parseInt(teamCompetitor.score || '0');
        const oppScore = parseInt(opponentCompetitor.score || '0');
        
        // Win/Loss
        if (teamScore > oppScore) stats.wins++;
        else if (oppScore > teamScore) stats.losses++;
        else stats.ties++;
        
        stats.pointsFor += teamScore;
        stats.pointsAgainst += oppScore;
        
        // ATS Record
        if (competition.odds?.[0]?.spread) {
          const spread = competition.odds[0].spread;
          const isHome = teamCompetitor.homeAway === 'home';
          const teamSpread = isHome ? spread : -spread;
          const scoreDiff = teamScore - oppScore;
          
          if (scoreDiff + teamSpread > 0) stats.atsRecord.wins++;
          else if (scoreDiff + teamSpread < 0) stats.atsRecord.losses++;
          else stats.atsRecord.pushes++;
        }
        
        // O/U Record
        if (competition.odds?.[0]?.overUnder) {
          const total = competition.odds[0].overUnder;
          const actualTotal = teamScore + oppScore;
          
          if (actualTotal > total) stats.ouRecord.overs++;
          else if (actualTotal < total) stats.ouRecord.unders++;
          else stats.ouRecord.pushes++;
        }
        
        stats.performances.push({
          date: game.date,
          opponent: opponentCompetitor.team.displayName,
          result: teamScore > oppScore ? 'W' : oppScore > teamScore ? 'L' : 'T',
          score: `${teamScore}-${oppScore}`,
          location: teamCompetitor.homeAway,
          spread: competition.odds?.[0]?.spread,
          total: competition.odds?.[0]?.overUnder
        });
      }
    }
    
    return stats;
  }

  // Get injury report for all teams in a league
  async getInjuryReport(sport: string, league: string): Promise<any[]> {
    const teams = await this.getTeams(sport, league);
    const injuryReports = [];
    
    for (const team of teams.slice(0, 10)) { // Limit to avoid rate limiting
      try {
        const roster = await this.getTeamRoster(sport, league, team.id);
        const injuries = roster
          .filter(athlete => athlete.injuries && athlete.injuries.length > 0)
          .map(athlete => ({
            team: team.displayName,
            teamId: team.id,
            player: athlete.displayName,
            playerId: athlete.id,
            position: athlete.position?.abbreviation,
            injuries: athlete.injuries,
            probabilityToPlay: this.calculateProbabilityToPlay(athlete.injuries?.[0])
          }));
        
        injuryReports.push(...injuries);
      } catch (error) {
        console.error(`Error fetching injuries for team ${team.id}:`, error);
      }
    }
    
    return injuryReports;
  }

  // Calculate probability to play based on injury status
  private calculateProbabilityToPlay(injury?: any): number {
    if (!injury) return 1.0;
    
    const status = injury.status?.toLowerCase() || '';
    if (status.includes('out') || status.includes('injured reserve')) return 0.0;
    if (status.includes('doubtful')) return 0.25;
    if (status.includes('questionable')) return 0.5;
    if (status.includes('probable')) return 0.75;
    if (status.includes('day-to-day')) return 0.85;
    return 1.0;
  }

  // Get all data for comprehensive analysis
  async getComprehensiveGameData(
    sport: string,
    league: string,
    gameId: string
  ): Promise<any> {
    const event = await this.getEvent(sport, league, gameId);
    const competition = event.competitions?.[0];
    
    if (!competition) {
      throw new Error('Competition data not found');
    }
    
    const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
    const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
    
    if (!homeTeam || !awayTeam) {
      throw new Error('Team data incomplete');
    }
    
    // Fetch additional data in parallel
    const [
      homeSchedule,
      awaySchedule,
      homeRoster,
      awayRoster,
      h2h,
      homeRecent,
      awayRecent
    ] = await Promise.all([
      this.getTeamSchedule(sport, league, homeTeam.team.id),
      this.getTeamSchedule(sport, league, awayTeam.team.id),
      this.getTeamRoster(sport, league, homeTeam.team.id),
      this.getTeamRoster(sport, league, awayTeam.team.id),
      this.getHeadToHead(sport, league, homeTeam.team.id, awayTeam.team.id),
      this.getRecentPerformance(sport, league, homeTeam.team.id),
      this.getRecentPerformance(sport, league, awayTeam.team.id)
    ]);
    
    return {
      event,
      competition,
      teams: {
        home: {
          ...homeTeam,
          schedule: homeSchedule,
          roster: homeRoster,
          recentPerformance: homeRecent,
          injuries: homeRoster.filter(p => p.injuries && p.injuries.length > 0)
        },
        away: {
          ...awayTeam,
          schedule: awaySchedule,
          roster: awayRoster,
          recentPerformance: awayRecent,
          injuries: awayRoster.filter(p => p.injuries && p.injuries.length > 0)
        }
      },
      headToHead: h2h,
      odds: competition.odds,
      venue: competition.venue,
      weather: competition.weather,
      officials: competition.officials
    };
  }

  // Get all games across multiple sports
  async getAllGamesAcrossSports(date?: string): Promise<any[]> {
    const sports = [
      { sport: 'football', league: 'nfl' },
      { sport: 'basketball', league: 'nba' },
      { sport: 'baseball', league: 'mlb' },
      { sport: 'hockey', league: 'nhl' },
      { sport: 'football', league: 'college-football' },
      { sport: 'basketball', league: 'mens-college-basketball' }
    ];
    
    const allGames = [];
    
    for (const { sport, league } of sports) {
      try {
        const scoreboard = await this.getScoreboard(sport, league, date);
        allGames.push({
          sport,
          league,
          events: scoreboard.events
        });
      } catch (error) {
        console.error(`Error fetching ${sport}/${league}:`, error);
      }
    }
    
    return allGames;
  }
}

// Export singleton instance
export const espnAPI = new ESPNAPIService();

// Export convenience functions
export const getESPNScoreboard = (sport: string, league: string, date?: string) => 
  espnAPI.getScoreboard(sport, league, date);

export const getESPNTeams = (sport: string, league: string) => 
  espnAPI.getTeams(sport, league);

export const getESPNTeam = (sport: string, league: string, teamId: string) => 
  espnAPI.getTeam(sport, league, teamId);

export const getESPNSchedule = (sport: string, league: string, teamId: string) => 
  espnAPI.getTeamSchedule(sport, league, teamId);

export const getESPNRoster = (sport: string, league: string, teamId: string) => 
  espnAPI.getTeamRoster(sport, league, teamId);

export const getESPNAthlete = (sport: string, league: string, athleteId: string) => 
  espnAPI.getAthlete(sport, league, athleteId);

export const getESPNOdds = (sport: string, league: string) => 
  espnAPI.getOdds(sport, league);

export const getESPNH2H = (sport: string, league: string, team1Id: string, team2Id: string) => 
  espnAPI.getHeadToHead(sport, league, team1Id, team2Id);

export const getESPNInjuries = (sport: string, league: string) => 
  espnAPI.getInjuryReport(sport, league);

export const getESPNRecentPerformance = (sport: string, league: string, teamId: string, games?: number) => 
  espnAPI.getRecentPerformance(sport, league, teamId, games);

export const getESPNGameData = (sport: string, league: string, gameId: string) => 
  espnAPI.getComprehensiveGameData(sport, league, gameId);

export const getESPNAllGames = (date?: string) => 
  espnAPI.getAllGamesAcrossSports(date);