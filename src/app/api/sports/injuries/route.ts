import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const SPORTSDATA_API_KEY = 'c5298a785e5e48fdad99fca62bfff60e';

export async function GET() {
  try {
    console.log('🏥 Fetching REAL injury reports...');
    
    const injuries: any[] = [];
    
    // Fetch NFL injuries
    try {
      const nflUrl = `https://api.sportsdata.io/v3/nfl/projections/json/InjuredPlayers?key=${SPORTSDATA_API_KEY}`;
      const nflResponse = await fetch(nflUrl);
      
      if (nflResponse.ok) {
        const nflData = await nflResponse.json();
        if (Array.isArray(nflData)) {
          nflData.forEach((player: any) => {
            injuries.push({
              sport: 'NFL',
              player: player.Name || 'Unknown',
              team: player.Team || 'Unknown',
              position: player.Position || 'Unknown',
              status: player.InjuryStatus || 'Unknown',
              description: player.InjuryNotes || 'No details',
              practiceStatus: player.PracticeDescription || 'Unknown',
              fantasyImpact: player.DeclaredInactive ? 'Out' : 'Active'
            });
          });
        }
      }
    } catch (err) {
      console.error('NFL injuries error:', err);
    }
    
    // Fetch NBA injuries
    try {
      const nbaUrl = `https://api.sportsdata.io/v3/nba/projections/json/InjuredPlayers?key=${SPORTSDATA_API_KEY}`;
      const nbaResponse = await fetch(nbaUrl);
      
      if (nbaResponse.ok) {
        const nbaData = await nbaResponse.json();
        if (Array.isArray(nbaData)) {
          nbaData.forEach((player: any) => {
            injuries.push({
              sport: 'NBA',
              player: player.Name || 'Unknown',
              team: player.Team || 'Unknown',
              position: player.Position || 'Unknown',
              status: player.InjuryStatus || 'Unknown',
              description: player.InjuryNotes || 'No details',
              practiceStatus: player.PracticeDescription || 'Unknown',
              fantasyImpact: player.DeclaredInactive ? 'Out' : 'Active'
            });
          });
        }
      }
    } catch (err) {
      console.error('NBA injuries error:', err);
    }
    
    // Fetch MLB injuries
    try {
      const mlbUrl = `https://api.sportsdata.io/v3/mlb/projections/json/InjuredPlayers?key=${SPORTSDATA_API_KEY}`;
      const mlbResponse = await fetch(mlbUrl);
      
      if (mlbResponse.ok) {
        const mlbData = await mlbResponse.json();
        if (Array.isArray(mlbData)) {
          mlbData.forEach((player: any) => {
            injuries.push({
              sport: 'MLB',
              player: player.Name || 'Unknown',
              team: player.Team || 'Unknown',
              position: player.Position || 'Unknown',
              status: player.InjuryStatus || 'Unknown',
              description: player.InjuryNotes || 'No details',
              practiceStatus: player.PracticeDescription || 'Unknown',
              fantasyImpact: player.DeclaredInactive ? 'Out' : 'Active'
            });
          });
        }
      }
    } catch (err) {
      console.error('MLB injuries error:', err);
    }
    
    console.log(`✅ Found ${injuries.length} total injuries across all sports`);
    
    return NextResponse.json({
      success: true,
      totalInjuries: injuries.length,
      injuries: injuries.slice(0, 50), // Limit to 50 for performance
      bySpor: {
        NFL: injuries.filter(i => i.sport === 'NFL').length,
        NBA: injuries.filter(i => i.sport === 'NBA').length,
        MLB: injuries.filter(i => i.sport === 'MLB').length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Injuries API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch injury data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}