import { NextRequest, NextResponse } from 'next/server';
import { SPORT_CONFIGS, getTodaysGames, formatDate } from '@/lib/sportsRadar';

// Fetch overview data for all sports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeGames = searchParams.get('includeGames') === 'true';
    
    // Get basic info for all sports
    const sportsOverview = await Promise.allSettled(
      Object.entries(SPORT_CONFIGS).map(async ([key, config]) => {
        const sportKey = key as keyof typeof SPORT_CONFIGS;
        
        try {
          let gamesData = null;
          let gameCount = 0;
          let liveCount = 0;
          
          if (includeGames) {
            // Try to fetch today's games
            gamesData = await getTodaysGames(sportKey);
            
            // Count games based on response structure
            if (gamesData?.games) {
              gameCount = gamesData.games.length;
              liveCount = gamesData.games.filter((g: any) => 
                g.status === 'inprogress' || g.status === 'live'
              ).length;
            } else if (gamesData?.schedules) {
              gameCount = gamesData.schedules.length;
              liveCount = gamesData.schedules.filter((s: any) => 
                s.sport_event_status?.status === 'live'
              ).length;
            } else if (gamesData?.events) {
              gameCount = gamesData.events.length;
            }
          }
          
          return {
            key: sportKey,
            name: config.name,
            available: true,
            hasData: gameCount > 0,
            gameCount,
            liveCount,
            lastUpdated: new Date().toISOString(),
            season: config.currentSeason || 'Current',
            endpoints: Object.keys(config.endpoints)
          };
        } catch (error) {
          console.error(`Error fetching ${config.name} data:`, error);
          return {
            key: sportKey,
            name: config.name,
            available: false,
            hasData: false,
            gameCount: 0,
            liveCount: 0,
            error: error instanceof Error ? error.message : 'Failed to fetch data',
            endpoints: Object.keys(config.endpoints)
          };
        }
      })
    );
    
    // Process results
    const sports = sportsOverview.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          error: result.reason?.message || 'Unknown error'
        };
      }
    });
    
    // Calculate summary statistics
    const summary = {
      totalSports: sports.length,
      availableSports: sports.filter(s => s.available).length,
      sportsWithGames: sports.filter(s => s.hasData).length,
      totalGames: sports.reduce((sum, s) => sum + (s.gameCount || 0), 0),
      totalLiveGames: sports.reduce((sum, s) => sum + (s.liveCount || 0), 0),
      date: formatDate(),
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json({
      summary,
      sports,
      apiStatus: 'operational',
      rateLimit: {
        remaining: 'Check headers',
        reset: 'Check headers'
      }
    });
  } catch (error) {
    console.error('Overview API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch sports overview',
        apiStatus: 'error'
      },
      { status: 500 }
    );
  }
}

// Test endpoint to verify API connectivity
export async function POST(request: NextRequest) {
  try {
    const { sport } = await request.json();
    
    if (!sport || !SPORT_CONFIGS[sport as keyof typeof SPORT_CONFIGS]) {
      return NextResponse.json(
        { error: 'Invalid sport specified' },
        { status: 400 }
      );
    }
    
    const sportKey = sport as keyof typeof SPORT_CONFIGS;
    const testData = await getTodaysGames(sportKey);
    
    return NextResponse.json({
      success: true,
      sport: SPORT_CONFIGS[sportKey].name,
      hasData: !!testData,
      dataPreview: testData ? Object.keys(testData) : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      },
      { status: 500 }
    );
  }
}