import { NextRequest, NextResponse } from 'next/server';
import { 
  getTodaysGames, 
  getStandings, 
  getLiveScores,
  getOddsData,
  SPORT_CONFIGS 
} from '@/lib/sportsRadar';

// Valid sports
const VALID_SPORTS = Object.keys(SPORT_CONFIGS);

export async function GET(
  request: NextRequest,
  { params }: { params: { sport: string } }
) {
  try {
    const { sport } = params;
    const { searchParams } = new URL(request.url);
    const dataType = searchParams.get('type') || 'games';

    // Validate sport
    if (!VALID_SPORTS.includes(sport)) {
      return NextResponse.json(
        { error: `Invalid sport. Valid sports: ${VALID_SPORTS.join(', ')}` },
        { status: 400 }
      );
    }

    const sportKey = sport as keyof typeof SPORT_CONFIGS;
    let data;

    // Fetch data based on type
    switch (dataType) {
      case 'games':
      case 'schedule':
        data = await getTodaysGames(sportKey);
        break;
      
      case 'standings':
        data = await getStandings(sportKey);
        break;
      
      case 'live':
        data = await getLiveScores(sportKey);
        break;
      
      case 'odds':
        data = await getOddsData(sportKey);
        break;
      
      default:
        return NextResponse.json(
          { error: `Invalid data type. Valid types: games, standings, live, odds` },
          { status: 400 }
        );
    }

    // Transform data to consistent format
    const response = {
      sport: SPORT_CONFIGS[sportKey].name,
      sportKey,
      dataType,
      timestamp: new Date().toISOString(),
      data: transformData(data, sportKey, dataType)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error:', error);
    
    // Check for rate limiting
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch sports data' },
      { status: 500 }
    );
  }
}

// Transform data to consistent format across sports
function transformData(data: any, sport: string, dataType: string): any {
  if (!data) return null;

  switch (dataType) {
    case 'games':
    case 'schedule':
      return transformGames(data, sport);
    
    case 'standings':
      return transformStandings(data, sport);
    
    case 'live':
      return data; // Already filtered in getLiveScores
    
    case 'odds':
      return data;
    
    default:
      return data;
  }
}

function transformGames(data: any, sport: string): any {
  // Handle different response structures
  if (data.games) {
    // NBA, NFL, MLB, NHL, WNBA format
    return {
      date: data.date || new Date().toISOString(),
      games: data.games.map((game: any) => ({
        id: game.id,
        status: game.status,
        scheduled: game.scheduled,
        homeTeam: {
          id: game.home?.id || game.home_team?.id,
          name: game.home?.name || game.home_team?.name,
          alias: game.home?.alias || game.home_team?.alias,
          score: game.home_points || game.home?.runs || game.home?.goals || 0
        },
        awayTeam: {
          id: game.away?.id || game.away_team?.id,
          name: game.away?.name || game.away_team?.name,
          alias: game.away?.alias || game.away_team?.alias,
          score: game.away_points || game.away?.runs || game.away?.goals || 0
        },
        venue: game.venue,
        broadcast: game.broadcasts
      }))
    };
  } else if (data.schedules) {
    // Soccer, Tennis format
    return {
      date: data.generated_at || new Date().toISOString(),
      games: data.schedules.map((match: any) => ({
        id: match.sport_event?.id || match.id,
        status: match.sport_event_status?.status || match.status,
        scheduled: match.sport_event?.start_time || match.scheduled,
        homeTeam: match.sport_event?.competitors?.find((c: any) => c.qualifier === 'home') || {},
        awayTeam: match.sport_event?.competitors?.find((c: any) => c.qualifier === 'away') || {},
        tournament: match.sport_event?.tournament,
        venue: match.sport_event?.venue
      }))
    };
  } else if (data.events) {
    // MMA, Boxing format
    return {
      date: data.generated_at || new Date().toISOString(),
      events: data.events.map((event: any) => ({
        id: event.id,
        name: event.name,
        scheduled: event.start_time,
        venue: event.venue,
        fights: event.fights || []
      }))
    };
  }

  return data;
}

function transformStandings(data: any, sport: string): any {
  if (data.conferences) {
    // NBA, NFL format
    return {
      conferences: data.conferences.map((conf: any) => ({
        name: conf.name,
        divisions: conf.divisions?.map((div: any) => ({
          name: div.name,
          teams: div.teams?.map((team: any) => ({
            id: team.id,
            name: team.name,
            wins: team.wins,
            losses: team.losses,
            winPct: team.win_pct || (team.wins / (team.wins + team.losses)),
            gamesBack: team.games_back,
            streak: team.streak
          }))
        }))
      }))
    };
  } else if (data.leagues) {
    // MLB, NHL format
    return {
      leagues: data.leagues.map((league: any) => ({
        name: league.name,
        divisions: league.divisions?.map((div: any) => ({
          name: div.name,
          teams: div.teams?.map((team: any) => ({
            id: team.id,
            name: team.name,
            wins: team.wins,
            losses: team.losses,
            winPct: team.win_pct,
            gamesBack: team.games_back
          }))
        }))
      }))
    };
  } else if (data.standings) {
    // Soccer format
    return {
      groups: data.standings.map((group: any) => ({
        name: group.group_name || 'League Table',
        teams: group.standings?.map((team: any) => ({
          id: team.competitor?.id,
          name: team.competitor?.name,
          played: team.played,
          wins: team.win,
          draws: team.draw,
          losses: team.loss,
          points: team.points,
          goalsFor: team.goals_for,
          goalsAgainst: team.goals_against,
          goalDifference: team.goal_diff
        }))
      }))
    };
  }

  return data;
}