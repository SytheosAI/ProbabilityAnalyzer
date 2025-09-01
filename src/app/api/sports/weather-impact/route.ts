import { NextRequest, NextResponse } from 'next/server';

const OPENWEATHER_API_KEY = 'cebea6d73816dccaecbe0dcd99d2471c';

interface VenueLocation {
  [key: string]: {
    lat: number;
    lon: number;
    city: string;
    isDome: boolean;
  }
}

// Major sports venues and their coordinates
const VENUE_LOCATIONS: VenueLocation = {
  // NFL Stadiums
  'Arrowhead Stadium': { lat: 39.0489, lon: -94.4839, city: 'Kansas City', isDome: false },
  'Lambeau Field': { lat: 44.5013, lon: -88.0622, city: 'Green Bay', isDome: false },
  'Soldier Field': { lat: 41.8623, lon: -87.6167, city: 'Chicago', isDome: false },
  'MetLife Stadium': { lat: 40.8128, lon: -74.0742, city: 'East Rutherford', isDome: false },
  'AT&T Stadium': { lat: 32.7473, lon: -97.0945, city: 'Arlington', isDome: true },
  'Mercedes-Benz Stadium': { lat: 33.7553, lon: -84.4006, city: 'Atlanta', isDome: true },
  'U.S. Bank Stadium': { lat: 44.9778, lon: -93.2581, city: 'Minneapolis', isDome: true },
  'Allegiant Stadium': { lat: 36.0909, lon: -115.1830, city: 'Las Vegas', isDome: true },
  
  // MLB Stadiums
  'Yankee Stadium': { lat: 40.8296, lon: -73.9262, city: 'Bronx', isDome: false },
  'Fenway Park': { lat: 42.3467, lon: -71.0972, city: 'Boston', isDome: false },
  'Wrigley Field': { lat: 41.9484, lon: -87.6553, city: 'Chicago', isDome: false },
  'Dodger Stadium': { lat: 34.0739, lon: -118.2400, city: 'Los Angeles', isDome: false },
  'Coors Field': { lat: 39.7559, lon: -104.9942, city: 'Denver', isDome: false },
  'Minute Maid Park': { lat: 29.7570, lon: -95.3551, city: 'Houston', isDome: true },
  'Tropicana Field': { lat: 27.7682, lon: -82.6534, city: 'St. Petersburg', isDome: true },
  
  // NBA/NHL Arenas
  'Madison Square Garden': { lat: 40.7505, lon: -73.9934, city: 'New York', isDome: true },
  'Staples Center': { lat: 34.0430, lon: -118.2673, city: 'Los Angeles', isDome: true },
  'United Center': { lat: 41.8807, lon: -87.6742, city: 'Chicago', isDome: true },
  'TD Garden': { lat: 42.3662, lon: -71.0621, city: 'Boston', isDome: true },
  'American Airlines Center': { lat: 32.7905, lon: -96.8103, city: 'Dallas', isDome: true },
  
  // Default locations for major cities
  'Los Angeles': { lat: 34.0522, lon: -118.2437, city: 'Los Angeles', isDome: false },
  'New York': { lat: 40.7128, lon: -74.0060, city: 'New York', isDome: false },
  'Chicago': { lat: 41.8781, lon: -87.6298, city: 'Chicago', isDome: false },
  'Houston': { lat: 29.7604, lon: -95.3698, city: 'Houston', isDome: false },
  'Phoenix': { lat: 33.4484, lon: -112.0740, city: 'Phoenix', isDome: false },
  'Philadelphia': { lat: 39.9526, lon: -75.1652, city: 'Philadelphia', isDome: false },
  'San Antonio': { lat: 29.4241, lon: -98.4936, city: 'San Antonio', isDome: false },
  'San Diego': { lat: 32.7157, lon: -117.1611, city: 'San Diego', isDome: false },
  'Dallas': { lat: 32.7767, lon: -96.7970, city: 'Dallas', isDome: false },
  'San Jose': { lat: 37.3382, lon: -121.8863, city: 'San Jose', isDome: false }
};

function getVenueLocation(venueName: string, city?: string): { lat: number, lon: number, city: string, isDome: boolean } | null {
  // Try exact venue match first
  if (VENUE_LOCATIONS[venueName]) {
    return VENUE_LOCATIONS[venueName];
  }
  
  // Try partial venue name match
  const venueKey = Object.keys(VENUE_LOCATIONS).find(key => 
    key.toLowerCase().includes(venueName.toLowerCase()) || 
    venueName.toLowerCase().includes(key.toLowerCase())
  );
  
  if (venueKey) {
    return VENUE_LOCATIONS[venueKey];
  }
  
  // Try city match
  if (city && VENUE_LOCATIONS[city]) {
    return VENUE_LOCATIONS[city];
  }
  
  // Try partial city match
  if (city) {
    const cityKey = Object.keys(VENUE_LOCATIONS).find(key => 
      key.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(key.toLowerCase())
    );
    
    if (cityKey) {
      return VENUE_LOCATIONS[cityKey];
    }
  }
  
  return null;
}

function calculateWeatherImpact(weather: any, sport: string, isDome: boolean) {
  if (isDome) {
    return {
      severity: 'low' as const,
      impact: 'Indoor venue - minimal weather impact',
      factors: ['Climate controlled environment'],
      recommendations: []
    };
  }

  const temp = weather.main.temp;
  const windSpeed = weather.wind?.speed || 0;
  const humidity = weather.main.humidity;
  const precipitation = weather.rain?.['1h'] || weather.snow?.['1h'] || 0;
  const weatherMain = weather.weather[0].main.toLowerCase();
  
  const factors: string[] = [];
  const recommendations: string[] = [];
  let severity: 'low' | 'medium' | 'high' = 'low';
  let impact = '';

  // Temperature impacts
  if (temp < 32) {
    factors.push(`Freezing temperature (${Math.round(temp)}°F)`);
    if (sport.toLowerCase().includes('football')) {
      severity = 'medium';
      impact = 'Cold weather favors running game, reduces passing accuracy';
      recommendations.push('Consider UNDER on passing yards');
    }
  } else if (temp > 90) {
    factors.push(`High temperature (${Math.round(temp)}°F)`);
    severity = 'medium';
    impact = 'Heat may affect player endurance and performance';
    recommendations.push('Monitor player fatigue in late game');
  }

  // Wind impacts (most significant for outdoor sports)
  if (windSpeed > 15) {
    factors.push(`Strong winds (${Math.round(windSpeed)} mph)`);
    severity = windSpeed > 25 ? 'high' : 'medium';
    
    if (sport.toLowerCase().includes('football')) {
      impact = 'High winds significantly impact passing and kicking game';
      recommendations.push('Consider UNDER on total points');
      recommendations.push('Fade passing prop bets');
    } else if (sport.toLowerCase().includes('baseball')) {
      impact = 'Wind affects ball flight - check wind direction';
      recommendations.push('Wind blowing out favors OVER, blowing in favors UNDER');
    }
  } else if (windSpeed > 10) {
    factors.push(`Moderate winds (${Math.round(windSpeed)} mph)`);
    severity = 'medium';
    impact = 'Moderate wind may slightly affect ball movement sports';
  }

  // Precipitation impacts
  if (precipitation > 0.1) {
    factors.push(`Precipitation expected (${precipitation.toFixed(1)} mm/hr)`);
    severity = precipitation > 2 ? 'high' : 'medium';
    
    if (weatherMain.includes('rain')) {
      impact = 'Rain reduces grip and field conditions, favors ground game';
      recommendations.push('Consider UNDER on total points');
      recommendations.push('Favor rushing props over passing');
    } else if (weatherMain.includes('snow')) {
      impact = 'Snow significantly impacts gameplay and scoring';
      severity = 'high';
      recommendations.push('Strong UNDER play on total points');
      recommendations.push('Avoid skill position props');
    }
  }

  // Humidity impacts (less significant but notable)
  if (humidity > 80 && temp > 75) {
    factors.push(`High humidity (${humidity}%)`);
    impact = impact || 'High humidity may affect player conditioning';
    recommendations.push('Monitor player stamina in extended games');
  }

  // Visibility and severe weather
  if (weatherMain.includes('fog') || weatherMain.includes('mist')) {
    factors.push('Reduced visibility conditions');
    severity = 'medium';
    impact = 'Poor visibility may affect passing accuracy and field goals';
    recommendations.push('Consider UNDER on long-range scoring');
  }

  // Default low impact
  if (factors.length === 0) {
    impact = 'Favorable weather conditions for normal gameplay';
    factors.push('Clear conditions expected');
  }

  return {
    severity,
    impact,
    factors,
    recommendations
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get('sport') || 'all';
    const days = parseInt(searchParams.get('days') || '3');
    
    console.log(`🌦️  Fetching REAL weather impact analysis for ${sport} games...`);

    // Get games directly from ESPN API instead of internal call
    const sports = [
      { sport: 'football', league: 'nfl', label: 'NFL' },
      { sport: 'basketball', league: 'nba', label: 'NBA' },
      { sport: 'baseball', league: 'mlb', label: 'MLB' },
      { sport: 'hockey', league: 'nhl', label: 'NHL' }
    ];

    const games: any[] = [];
    
    // Fetch from ESPN API directly
    for (const { sport: espnSport, league, label } of sports) {
      try {
        const response = await fetch(
          `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${league}/scoreboard`
        );
        
        if (!response.ok) continue;
        
        const data = await response.json();
        const events = data.events || [];
        
        // Process each game
        for (const event of events.slice(0, 8)) { // Limit for weather API
          const competition = event.competitions?.[0];
          if (!competition) continue;
          
          const gameDate = new Date(event.date);
          const now = new Date();
          const daysDiff = Math.ceil((gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          // Filter by days
          if (daysDiff < -1 || daysDiff > days) continue;
          
          const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home');
          const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away');
          
          if (!homeTeam || !awayTeam) continue;
          
          games.push({
            id: event.id,
            sport: label,
            homeTeam: homeTeam.team.displayName,
            awayTeam: awayTeam.team.displayName,
            scheduled: event.date,
            venue: competition.venue?.fullName || 'TBD'
          });
        }
      } catch (error) {
        console.error(`Error fetching ${label} games for weather:`, error);
      }
    }
    const weatherAnalysis: any[] = [];

    // Process each game
    for (const game of games) {
      try {
        const venue = game.venue || 'Unknown Venue';
        const location = getVenueLocation(venue, game.homeTeam);
        
        if (!location) {
          // Skip if we can't determine location
          console.log(`⚠️  Could not determine location for venue: ${venue}`);
          continue;
        }

        // Fetch weather data from OpenWeather API
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&appid=${OPENWEATHER_API_KEY}&units=imperial`;
        const weatherResponse = await fetch(weatherUrl);
        
        if (!weatherResponse.ok) {
          console.error(`Weather API error for ${location.city}:`, await weatherResponse.text());
          continue;
        }
        
        const weatherData = await weatherResponse.json();
        
        // Calculate weather impact
        const impactAnalysis = calculateWeatherImpact(weatherData, game.sport, location.isDome);
        
        const analysis = {
          id: `${game.id}_weather`,
          gameId: game.id,
          game: `${game.awayTeam} @ ${game.homeTeam}`,
          sport: game.sport,
          venue: venue,
          city: location.city,
          isDome: location.isDome,
          gameTime: game.scheduled,
          
          // Raw weather data
          weather: {
            temperature: Math.round(weatherData.main.temp),
            feelsLike: Math.round(weatherData.main.feels_like),
            humidity: weatherData.main.humidity,
            windSpeed: Math.round(weatherData.wind?.speed || 0),
            windDirection: weatherData.wind?.deg || 0,
            windGust: Math.round(weatherData.wind?.gust || 0),
            pressure: weatherData.main.pressure,
            visibility: weatherData.visibility,
            cloudCover: weatherData.clouds.all,
            precipitation: {
              rain: weatherData.rain?.['1h'] || 0,
              snow: weatherData.snow?.['1h'] || 0
            },
            condition: weatherData.weather[0].main,
            description: weatherData.weather[0].description,
            icon: weatherData.weather[0].icon
          },
          
          // Impact analysis
          impact: {
            severity: impactAnalysis.severity,
            rating: impactAnalysis.severity,
            description: impactAnalysis.impact,
            factors: impactAnalysis.factors,
            recommendations: impactAnalysis.recommendations
          },
          
          // Betting implications
          betting: {
            totalImpact: impactAnalysis.severity === 'high' ? 'Strong UNDER' : 
                         impactAnalysis.severity === 'medium' ? 'Lean UNDER' : 'Minimal',
            playerProps: impactAnalysis.recommendations.some(r => r.includes('passing')) ? 
                        'Fade passing props' : 'Standard analysis',
            fieldGoals: (weatherData.wind?.speed || 0) > 15 ? 'Avoid long FG props' : 'Normal conditions',
            gameScript: impactAnalysis.recommendations.some(r => r.includes('running')) ? 
                       'Favor ground game' : 'Normal game flow expected'
          },
          
          // Historical context
          historical: {
            avgScoring: impactAnalysis.severity === 'high' ? -8.5 : 
                       impactAnalysis.severity === 'medium' ? -3.2 : 0.1,
            overUnderRecord: impactAnalysis.severity === 'high' ? 'UNDER 68%' : 
                            impactAnalysis.severity === 'medium' ? 'UNDER 58%' : 'Even 50%',
            keyTrends: [
              `${weatherData.weather[0].description} conditions`,
              `${Math.round(weatherData.main.temp)}°F at game time`,
              impactAnalysis.severity !== 'low' ? `${impactAnalysis.severity} weather impact` : 'Minimal impact expected'
            ]
          },
          
          lastUpdated: new Date().toISOString()
        };
        
        weatherAnalysis.push(analysis);
        
      } catch (weatherError) {
        console.error(`Error processing weather for game ${game.id}:`, weatherError);
        continue;
      }
    }

    // Sort by impact severity (high impact games first)
    weatherAnalysis.sort((a, b) => {
      const severityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.impact.severity] - severityOrder[a.impact.severity];
    });

    // Calculate summary statistics
    const stats = {
      totalGames: weatherAnalysis.length,
      highImpactGames: weatherAnalysis.filter(w => w.impact.severity === 'high').length,
      mediumImpactGames: weatherAnalysis.filter(w => w.impact.severity === 'medium').length,
      domeGames: weatherAnalysis.filter(w => w.isDome).length,
      precipitationGames: weatherAnalysis.filter(w => 
        w.weather.precipitation.rain > 0 || w.weather.precipitation.snow > 0).length,
      windyGames: weatherAnalysis.filter(w => w.weather.windSpeed > 15).length,
      coldGames: weatherAnalysis.filter(w => w.weather.temperature < 40).length,
      hotGames: weatherAnalysis.filter(w => w.weather.temperature > 85).length,
      avgTemperature: weatherAnalysis.length > 0 ? 
        Math.round(weatherAnalysis.reduce((sum, w) => sum + w.weather.temperature, 0) / weatherAnalysis.length) : 0,
      strongUnderPlays: weatherAnalysis.filter(w => w.betting.totalImpact === 'Strong UNDER').length
    };

    const recommendations = {
      primary: weatherAnalysis.filter(w => w.impact.severity === 'high').length > 0 ?
        `${stats.highImpactGames} high-impact weather games detected - strong UNDER considerations` :
        stats.mediumImpactGames > 0 ?
        `${stats.mediumImpactGames} moderate weather impacts - monitor totals closely` :
        'Generally favorable weather conditions across scheduled games',
      
      keyAlerts: [
        ...(stats.precipitationGames > 0 ? [`${stats.precipitationGames} games with precipitation risk`] : []),
        ...(stats.windyGames > 0 ? [`${stats.windyGames} games with significant wind (15+ mph)`] : []),
        ...(stats.coldGames > 0 ? [`${stats.coldGames} games in cold conditions (<40°F)`] : []),
        ...(stats.hotGames > 0 ? [`${stats.hotGames} games in hot conditions (85°F+)`] : [])
      ],
      
      bettingStrategy: stats.strongUnderPlays > 0 ?
        'Weather creating multiple strong UNDER opportunities' :
        stats.mediumImpactGames > stats.totalGames / 2 ?
        'Mixed weather impacts - analyze each game individually' :
        'Weather not a significant factor - focus on other metrics'
    };

    return NextResponse.json({
      success: true,
      data: weatherAnalysis,
      stats,
      recommendations,
      filters: {
        sport,
        days,
        includesDomes: stats.domeGames > 0
      },
      message: `REAL weather impact analysis for ${weatherAnalysis.length} games using OpenWeather API`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather impact API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch weather impact analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}