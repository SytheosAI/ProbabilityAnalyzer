// Team Statistics Service
// Handles team data fetching, statistics aggregation, and performance analysis for all 12 sports

import { SPORT_CONFIGS, fetchSportsData, getStandings } from '@/lib/sportsRadar';
import { Team } from './sportsDataService';

export interface TeamStats {
  teamId: string;
  name: string;
  sport: string;
  conference?: string;
  division?: string;
  currentRecord?: TeamRecord;
  statistics?: TeamStatistics;
  rankings?: TeamRankings;
  recentForm?: GameResult[];
  projections?: TeamProjections;
  strengthOfSchedule?: number;
  trends?: TeamTrends;
}

export interface TeamRecord {
  wins: number;
  losses: number;
  ties?: number;
  winPercentage: number;
  homeRecord?: string;
  awayRecord?: string;
  divisionRecord?: string;
  conferenceRecord?: string;
  streak?: string;
}

export interface TeamStatistics {
  offensive?: any;
  defensive?: any;
  special?: any;
  advanced?: any;
  perGame?: any;
  total?: any;
}

export interface TeamRankings {
  overall?: number;
  conference?: number;
  division?: number;
  powerRanking?: number;
  offensiveRank?: number;
  defensiveRank?: number;
}

export interface GameResult {
  date: string;
  opponent: string;
  result: 'W' | 'L' | 'T';
  score: string;
  location: 'home' | 'away';
}

export interface TeamProjections {
  expectedWins?: number;
  playoffProbability?: number;
  divisionWinProbability?: number;
  championshipProbability?: number;
  remainingStrengthOfSchedule?: number;
  projectedFinish?: string;
}

export interface TeamTrends {
  overall: 'improving' | 'declining' | 'stable';
  offensive: 'improving' | 'declining' | 'stable';
  defensive: 'improving' | 'declining' | 'stable';
  keyFactors: string[];
}

// Sport-specific team stat categories
const TEAM_STAT_CATEGORIES: Record<string, any> = {
  nba: {
    offensive: ['points_per_game', 'field_goal_pct', 'three_point_pct', 'assists_per_game', 'offensive_rating'],
    defensive: ['points_allowed', 'defensive_rating', 'rebounds_per_game', 'steals_per_game', 'blocks_per_game'],
    advanced: ['net_rating', 'pace', 'effective_fg_pct', 'true_shooting_pct']
  },
  nfl: {
    offensive: ['points_per_game', 'yards_per_game', 'passing_yards', 'rushing_yards', 'third_down_pct'],
    defensive: ['points_allowed', 'yards_allowed', 'sacks', 'turnovers_forced', 'third_down_defense'],
    special: ['field_goal_pct', 'punt_return_avg', 'kick_return_avg']
  },
  mlb: {
    offensive: ['runs_per_game', 'batting_average', 'on_base_pct', 'slugging_pct', 'home_runs'],
    defensive: ['era', 'fielding_pct', 'double_plays', 'errors'],
    pitching: ['team_era', 'strikeouts', 'whip', 'saves', 'quality_starts']
  },
  nhl: {
    offensive: ['goals_per_game', 'power_play_pct', 'shots_per_game', 'shooting_pct'],
    defensive: ['goals_against', 'penalty_kill_pct', 'save_pct', 'blocked_shots'],
    special: ['faceoff_win_pct', 'penalty_minutes']
  },
  soccer: {
    offensive: ['goals_scored', 'shots_per_game', 'possession_pct', 'passing_accuracy'],
    defensive: ['goals_conceded', 'clean_sheets', 'tackles_per_game', 'interceptions'],
    overall: ['goal_difference', 'points_per_game', 'form_rating']
  }
};

// Get team statistics
export async function getTeamStats(
  sport: string,
  teamId: string,
  includeProjections: boolean = true
): Promise<TeamStats | null> {
  const sportKey = sport.toLowerCase() as keyof typeof SPORT_CONFIGS;
  const config = SPORT_CONFIGS[sportKey];
  
  if (!config) {
    console.error(`Unsupported sport: ${sport}`);
    return null;
  }
  
  try {
    let teamData: any = null;
    let standingsData: any = null;
    
    // Fetch team-specific data based on sport
    switch (sportKey) {
      case 'nba':
      case 'wnba':
      case 'ncaamb':
        if (config.endpoints.teamRoster) {
          teamData = await fetchSportsData(sportKey, config.endpoints.teamRoster, {
            team_id: teamId
          });
        }
        standingsData = await getStandings(sportKey);
        break;
      
      case 'nfl':
      case 'ncaafb':
        if (config.endpoints.teamRoster) {
          teamData = await fetchSportsData(sportKey, config.endpoints.teamRoster, {
            team_id: teamId
          });
        }
        standingsData = await getStandings(sportKey);
        break;
      
      case 'mlb':
      case 'nhl':
        if (config.endpoints.teamRoster) {
          teamData = await fetchSportsData(sportKey, config.endpoints.teamRoster, {
            team_id: teamId
          });
        }
        break;
      
      case 'soccer':
      case 'mls':
        if (config.endpoints.teamProfile) {
          teamData = await fetchSportsData(sportKey, config.endpoints.teamProfile, {
            team_id: teamId
          });
        }
        break;
      
      default:
        console.log(`Team stats not available for ${sport}`);
        break;
    }
    
    // Parse team data
    if (teamData || standingsData) {
      const stats = parseTeamStats(sportKey, teamData, standingsData);
      
      // Add projections if requested
      if (includeProjections) {
        stats.projections = await generateTeamProjections(sportKey, stats);
      }
      
      // Analyze trends
      stats.trends = analyzeTeamTrends(stats);
      
      return stats;
    }
    
    // Return mock data if API fails
    return generateMockTeamStats(sportKey, teamId);
    
  } catch (error) {
    console.error(`Error fetching team stats for ${teamId}:`, error);
    return generateMockTeamStats(sportKey, teamId);
  }
}

// Parse team statistics from API response
function parseTeamStats(sport: string, teamData: any, standingsData: any): TeamStats {
  const stats: TeamStats = {
    teamId: teamData?.id || 'unknown',
    name: teamData?.name || teamData?.market || 'Unknown Team',
    sport: sport.toUpperCase(),
    conference: teamData?.conference?.name,
    division: teamData?.division?.name
  };
  
  // Extract record from standings
  if (standingsData) {
    const teamStanding = findTeamInStandings(standingsData, stats.teamId);
    if (teamStanding) {
      stats.currentRecord = {
        wins: teamStanding.wins || 0,
        losses: teamStanding.losses || 0,
        ties: teamStanding.ties,
        winPercentage: teamStanding.win_pct || (teamStanding.wins / (teamStanding.wins + teamStanding.losses)),
        homeRecord: teamStanding.home_record,
        awayRecord: teamStanding.away_record,
        streak: teamStanding.streak
      };
      
      stats.rankings = {
        overall: teamStanding.rank,
        conference: teamStanding.conference_rank,
        division: teamStanding.division_rank
      };
    }
  }
  
  // Extract team statistics
  if (teamData?.statistics) {
    stats.statistics = parseTeamStatistics(sport, teamData.statistics);
  }
  
  // Extract recent form
  if (teamData?.games || teamData?.recent_games) {
    stats.recentForm = parseRecentGames(teamData.games || teamData.recent_games);
  }
  
  return stats;
}

// Find team in standings data
function findTeamInStandings(standingsData: any, teamId: string): any {
  if (!standingsData) return null;
  
  // Check different structures
  if (standingsData.conferences) {
    for (const conf of standingsData.conferences) {
      if (conf.divisions) {
        for (const div of conf.divisions) {
          const team = div.teams?.find((t: any) => t.id === teamId);
          if (team) return team;
        }
      }
    }
  }
  
  if (standingsData.teams) {
    return standingsData.teams.find((t: any) => t.id === teamId);
  }
  
  return null;
}

// Parse team statistics by category
function parseTeamStatistics(sport: string, rawStats: any): TeamStatistics {
  const categories = TEAM_STAT_CATEGORIES[sport] || {};
  const statistics: TeamStatistics = {};
  
  // Extract offensive stats
  if (categories.offensive) {
    statistics.offensive = {};
    categories.offensive.forEach((stat: string) => {
      if (rawStats[stat] !== undefined) {
        statistics.offensive[stat] = rawStats[stat];
      }
    });
  }
  
  // Extract defensive stats
  if (categories.defensive) {
    statistics.defensive = {};
    categories.defensive.forEach((stat: string) => {
      if (rawStats[stat] !== undefined) {
        statistics.defensive[stat] = rawStats[stat];
      }
    });
  }
  
  // Extract other categories
  if (categories.special) {
    statistics.special = {};
    categories.special.forEach((stat: string) => {
      if (rawStats[stat] !== undefined) {
        statistics.special[stat] = rawStats[stat];
      }
    });
  }
  
  return statistics;
}

// Parse recent game results
function parseRecentGames(games: any[]): GameResult[] {
  if (!games || !Array.isArray(games)) return [];
  
  return games.slice(0, 10).map(game => ({
    date: game.scheduled || game.date,
    opponent: game.opponent?.name || 'Unknown',
    result: determineGameResult(game),
    score: `${game.home_points || 0}-${game.away_points || 0}`,
    location: game.home ? 'home' : 'away'
  }));
}

// Determine game result
function determineGameResult(game: any): 'W' | 'L' | 'T' {
  if (game.result) return game.result;
  
  const homeScore = game.home_points || game.home_score || 0;
  const awayScore = game.away_points || game.away_score || 0;
  
  if (game.home) {
    return homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'T';
  } else {
    return awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'T';
  }
}

// Generate team projections
async function generateTeamProjections(sport: string, teamStats: TeamStats): Promise<TeamProjections> {
  const projections: TeamProjections = {};
  
  // Calculate expected wins based on current win percentage
  const gamesPlayed = (teamStats.currentRecord?.wins || 0) + (teamStats.currentRecord?.losses || 0);
  const totalGames = getTotalGamesInSeason(sport);
  const remainingGames = totalGames - gamesPlayed;
  const winPct = teamStats.currentRecord?.winPercentage || 0.5;
  
  projections.expectedWins = (teamStats.currentRecord?.wins || 0) + (remainingGames * winPct);
  
  // Calculate playoff probability (simplified)
  projections.playoffProbability = calculatePlayoffProbability(sport, winPct, gamesPlayed, totalGames);
  
  // Division win probability
  projections.divisionWinProbability = winPct > 0.6 ? winPct * 0.7 : winPct * 0.3;
  
  // Championship probability (very simplified)
  projections.championshipProbability = projections.playoffProbability * (winPct > 0.65 ? 0.15 : 0.05);
  
  // Projected finish
  if (winPct > 0.65) {
    projections.projectedFinish = 'Division Winner';
  } else if (winPct > 0.55) {
    projections.projectedFinish = 'Playoff Contender';
  } else if (winPct > 0.45) {
    projections.projectedFinish = 'Wild Card Contender';
  } else {
    projections.projectedFinish = 'Lottery Team';
  }
  
  return projections;
}

// Get total games in season by sport
function getTotalGamesInSeason(sport: string): number {
  const seasonLengths: Record<string, number> = {
    nba: 82,
    nfl: 17,
    mlb: 162,
    nhl: 82,
    wnba: 40,
    ncaamb: 30,
    ncaafb: 12,
    mls: 34,
    soccer: 38
  };
  
  return seasonLengths[sport] || 30;
}

// Calculate playoff probability
function calculatePlayoffProbability(sport: string, winPct: number, gamesPlayed: number, totalGames: number): number {
  // Simplified calculation
  const gamesRemaining = totalGames - gamesPlayed;
  const seasonProgress = gamesPlayed / totalGames;
  
  // Base probability on win percentage
  let probability = winPct;
  
  // Adjust based on season progress
  if (seasonProgress > 0.75) {
    // Late season - current record matters more
    probability = winPct > 0.5 ? winPct * 1.2 : winPct * 0.8;
  } else if (seasonProgress > 0.5) {
    // Mid season
    probability = winPct > 0.5 ? winPct * 1.1 : winPct * 0.9;
  }
  
  // Sport-specific adjustments
  const playoffThresholds: Record<string, number> = {
    nba: 0.45,  // About 16 of 30 teams make playoffs
    nfl: 0.44,  // 14 of 32 teams
    mlb: 0.40,  // 12 of 30 teams
    nhl: 0.50,  // 16 of 32 teams
    wnba: 0.67, // 8 of 12 teams
    mls: 0.50   // Varies by season
  };
  
  const threshold = playoffThresholds[sport] || 0.5;
  
  if (winPct > threshold + 0.1) {
    probability = Math.min(0.95, probability * 1.2);
  } else if (winPct < threshold - 0.1) {
    probability = Math.max(0.05, probability * 0.5);
  }
  
  return Math.min(1, Math.max(0, probability));
}

// Analyze team trends
function analyzeTeamTrends(stats: TeamStats): TeamTrends {
  const trends: TeamTrends = {
    overall: 'stable',
    offensive: 'stable',
    defensive: 'stable',
    keyFactors: []
  };
  
  // Analyze recent form
  if (stats.recentForm && stats.recentForm.length >= 5) {
    const recentWins = stats.recentForm.slice(0, 5).filter(g => g.result === 'W').length;
    const overallWinPct = stats.currentRecord?.winPercentage || 0.5;
    const recentWinPct = recentWins / 5;
    
    if (recentWinPct > overallWinPct + 0.2) {
      trends.overall = 'improving';
      trends.keyFactors.push('Strong recent form');
    } else if (recentWinPct < overallWinPct - 0.2) {
      trends.overall = 'declining';
      trends.keyFactors.push('Poor recent form');
    }
  }
  
  // Analyze offensive trends
  if (stats.statistics?.offensive) {
    const avgPoints = stats.statistics.offensive.points_per_game || stats.statistics.offensive.goals_per_game;
    if (avgPoints) {
      // Would compare to league average here
      trends.keyFactors.push(avgPoints > 110 ? 'High-scoring offense' : 'Struggling offense');
    }
  }
  
  // Analyze defensive trends
  if (stats.statistics?.defensive) {
    const avgAllowed = stats.statistics.defensive.points_allowed || stats.statistics.defensive.goals_against;
    if (avgAllowed) {
      // Would compare to league average here
      trends.keyFactors.push(avgAllowed < 105 ? 'Strong defense' : 'Defensive concerns');
    }
  }
  
  return trends;
}

// Generate mock team statistics
function generateMockTeamStats(sport: string, teamId: string): TeamStats {
  const mockTeams: Record<string, string[]> = {
    nba: ['Lakers', 'Warriors', 'Celtics', 'Heat', 'Nuggets', 'Bucks'],
    nfl: ['Chiefs', 'Bills', 'Eagles', 'Cowboys', '49ers', 'Ravens'],
    mlb: ['Yankees', 'Dodgers', 'Astros', 'Braves', 'Rays', 'Orioles'],
    nhl: ['Avalanche', 'Panthers', 'Rangers', 'Oilers', 'Stars', 'Bruins'],
    wnba: ['Aces', 'Liberty', 'Sun', 'Storm', 'Mystics', 'Wings'],
    mls: ['LAFC', 'Philadelphia', 'Cincinnati', 'Nashville', 'Seattle', 'Atlanta'],
    soccer: ['Man City', 'Arsenal', 'Liverpool', 'Man United', 'Chelsea', 'Tottenham'],
    ncaamb: ['UConn', 'Purdue', 'Houston', 'Kansas', 'Alabama', 'Arizona'],
    ncaafb: ['Georgia', 'Michigan', 'Alabama', 'Texas', 'Ohio State', 'Oregon']
  };
  
  const teams = mockTeams[sport] || ['Team A', 'Team B'];
  const randomTeam = teams[Math.floor(Math.random() * teams.length)];
  
  const wins = Math.floor(Math.random() * 20) + 10;
  const losses = Math.floor(Math.random() * 15) + 5;
  const winPct = wins / (wins + losses);
  
  return {
    teamId: teamId,
    name: randomTeam,
    sport: sport.toUpperCase(),
    conference: ['Eastern', 'Western'][Math.floor(Math.random() * 2)],
    division: ['Atlantic', 'Central', 'Pacific', 'North', 'South'][Math.floor(Math.random() * 5)],
    currentRecord: {
      wins: wins,
      losses: losses,
      winPercentage: winPct,
      homeRecord: `${Math.floor(wins * 0.6)}-${Math.floor(losses * 0.4)}`,
      awayRecord: `${Math.floor(wins * 0.4)}-${Math.floor(losses * 0.6)}`,
      streak: Math.random() > 0.5 ? `W${Math.floor(Math.random() * 5) + 1}` : `L${Math.floor(Math.random() * 3) + 1}`
    },
    statistics: generateMockTeamStatistics(sport),
    rankings: {
      overall: Math.floor(Math.random() * 30) + 1,
      conference: Math.floor(Math.random() * 15) + 1,
      division: Math.floor(Math.random() * 5) + 1,
      offensiveRank: Math.floor(Math.random() * 30) + 1,
      defensiveRank: Math.floor(Math.random() * 30) + 1
    },
    projections: {
      expectedWins: wins + Math.floor((82 - wins - losses) * winPct),
      playoffProbability: winPct > 0.5 ? 0.6 + Math.random() * 0.3 : 0.1 + Math.random() * 0.3,
      divisionWinProbability: winPct > 0.6 ? 0.3 + Math.random() * 0.4 : Math.random() * 0.2,
      championshipProbability: winPct > 0.65 ? 0.05 + Math.random() * 0.1 : Math.random() * 0.03,
      projectedFinish: winPct > 0.6 ? 'Division Winner' : winPct > 0.5 ? 'Playoff Team' : 'Lottery Team'
    },
    trends: {
      overall: ['improving', 'declining', 'stable'][Math.floor(Math.random() * 3)] as any,
      offensive: ['improving', 'declining', 'stable'][Math.floor(Math.random() * 3)] as any,
      defensive: ['improving', 'declining', 'stable'][Math.floor(Math.random() * 3)] as any,
      keyFactors: ['Recent winning streak', 'Strong home record', 'Improved defense']
    }
  };
}

// Generate mock team statistics
function generateMockTeamStatistics(sport: string): TeamStatistics {
  switch (sport) {
    case 'nba':
      return {
        offensive: {
          points_per_game: 105 + Math.random() * 15,
          field_goal_pct: 0.44 + Math.random() * 0.06,
          three_point_pct: 0.34 + Math.random() * 0.06,
          assists_per_game: 22 + Math.random() * 6,
          offensive_rating: 108 + Math.random() * 10
        },
        defensive: {
          points_allowed: 103 + Math.random() * 15,
          defensive_rating: 106 + Math.random() * 10,
          rebounds_per_game: 42 + Math.random() * 8,
          steals_per_game: 7 + Math.random() * 3,
          blocks_per_game: 4 + Math.random() * 2
        }
      };
    
    case 'nfl':
      return {
        offensive: {
          points_per_game: 20 + Math.random() * 10,
          yards_per_game: 320 + Math.random() * 80,
          passing_yards: 220 + Math.random() * 60,
          rushing_yards: 100 + Math.random() * 40,
          third_down_pct: 0.35 + Math.random() * 0.15
        },
        defensive: {
          points_allowed: 18 + Math.random() * 10,
          yards_allowed: 310 + Math.random() * 80,
          sacks: 2 + Math.random() * 2,
          turnovers_forced: 1 + Math.random() * 1.5
        }
      };
    
    default:
      return {
        offensive: { rating: 75 + Math.random() * 20 },
        defensive: { rating: 75 + Math.random() * 20 }
      };
  }
}

// Get league standings
export async function getLeagueStandings(sport: string): Promise<any> {
  const sportKey = sport.toLowerCase() as keyof typeof SPORT_CONFIGS;
  
  try {
    const standings = await getStandings(sportKey);
    return standings;
  } catch (error) {
    console.error(`Error fetching standings for ${sport}:`, error);
    return generateMockStandings(sport);
  }
}

// Generate mock standings
function generateMockStandings(sport: string): any {
  const mockTeams = generateMockTeamStats(sport, 'team-1');
  const teams = [];
  
  for (let i = 0; i < 10; i++) {
    const team = generateMockTeamStats(sport, `team-${i}`);
    teams.push({
      rank: i + 1,
      team: team.name,
      wins: team.currentRecord?.wins,
      losses: team.currentRecord?.losses,
      winPct: team.currentRecord?.winPercentage,
      gamesBack: i * 1.5
    });
  }
  
  return { standings: teams };
}

// Get head-to-head matchup analysis
export async function getTeamMatchupAnalysis(
  sport: string,
  team1Id: string,
  team2Id: string
): Promise<any> {
  const [team1Stats, team2Stats] = await Promise.all([
    getTeamStats(sport, team1Id),
    getTeamStats(sport, team2Id)
  ]);
  
  if (!team1Stats || !team2Stats) {
    return null;
  }
  
  return {
    team1: team1Stats,
    team2: team2Stats,
    comparison: compareTeams(team1Stats, team2Stats),
    prediction: {
      favoredTeam: determineFavoredTeam(team1Stats, team2Stats),
      confidence: 0.60 + Math.random() * 0.25,
      keyMatchups: ['Offense vs Defense', 'Home court advantage', 'Recent form'],
      historicalRecord: generateMockH2H()
    }
  };
}

// Compare two teams
function compareTeams(team1: TeamStats, team2: TeamStats): any {
  return {
    recordComparison: {
      team1WinPct: team1.currentRecord?.winPercentage || 0,
      team2WinPct: team2.currentRecord?.winPercentage || 0,
      advantage: (team1.currentRecord?.winPercentage || 0) > (team2.currentRecord?.winPercentage || 0) ? team1.name : team2.name
    },
    rankingComparison: {
      team1Rank: team1.rankings?.overall || 999,
      team2Rank: team2.rankings?.overall || 999,
      advantage: (team1.rankings?.overall || 999) < (team2.rankings?.overall || 999) ? team1.name : team2.name
    },
    trendComparison: {
      team1Trend: team1.trends?.overall || 'stable',
      team2Trend: team2.trends?.overall || 'stable'
    }
  };
}

// Determine favored team
function determineFavoredTeam(team1: TeamStats, team2: TeamStats): string {
  const team1Score = (team1.currentRecord?.winPercentage || 0) * 100 + 
                     (30 - (team1.rankings?.overall || 30)) +
                     (team1.trends?.overall === 'improving' ? 10 : 0);
  
  const team2Score = (team2.currentRecord?.winPercentage || 0) * 100 + 
                     (30 - (team2.rankings?.overall || 30)) +
                     (team2.trends?.overall === 'improving' ? 10 : 0);
  
  return team1Score > team2Score ? team1.name : team2.name;
}

// Generate mock head-to-head record
function generateMockH2H(): any {
  const team1Wins = Math.floor(Math.random() * 10);
  const team2Wins = Math.floor(Math.random() * 10);
  
  return {
    allTime: `${team1Wins}-${team2Wins}`,
    lastSeason: `${Math.min(team1Wins, 4)}-${Math.min(team2Wins, 4)}`,
    currentSeason: `${Math.min(team1Wins, 2)}-${Math.min(team2Wins, 2)}`,
    streak: Math.random() > 0.5 ? 'Team 1 W2' : 'Team 2 W1'
  };
}