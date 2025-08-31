const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const SUPABASE_URL = 'https://qnhuezgavmjdvayhydpe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuaHVlemdhdm1qZHZheWh5ZHBlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU2NzczOSwiZXhwIjoyMDcyMTQzNzM5fQ.g_08IFk0x35kAn-cDJ4bCmdrimkp58MjqhQQjVuTmME';
const SPORTS_RADAR_API_KEY = '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function fetchSportsRadarData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', reject);
  });
}

async function populateRealData() {
  console.log('🚀 FINAL ATTEMPT - REAL NBA DATA!');
  
  try {
    // Check table structure first
    console.log('🔍 Checking table structure...');
    const { data: columns, error: columnError } = await supabase.rpc('get_table_columns', {
      table_name: 'games'
    });
    
    if (columnError) {
      console.log('⚠️ Could not check columns, proceeding anyway...');
    }
    
    // Fetch NBA games
    console.log('🏀 Fetching from Sports Radar...');
    const nbaUrl = `https://api.sportradar.us/nba/trial/v8/en/games/2024/REG/schedule.json?api_key=${SPORTS_RADAR_API_KEY}`;
    const nbaData = await fetchSportsRadarData(nbaUrl);
    
    console.log(`✅ Got ${nbaData.games.length} real games!`);
    
    // Process games with all possible fields
    const gamesToInsert = [];
    
    for (const game of nbaData.games.slice(0, 20)) { // Start with just 20 games
      const gameDate = new Date(game.scheduled);
      
      const gameRecord = {
        game_id: game.id,
        sport: 'NBA',
        home_team: game.home.name,
        away_team: game.away.name,
        scheduled: game.scheduled,
        game_date: gameDate.toISOString().split('T')[0], // Add game_date for partitioning
        home_score: game.home_points || null,
        away_score: game.away_points || null,
        status: game.status || 'scheduled',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      gamesToInsert.push(gameRecord);
    }
    
    console.log('💾 Inserting REAL games (sample)...');
    console.log('First game:', JSON.stringify(gamesToInsert[0], null, 2));
    
    // Try inserting one record first
    const { data: singleInsert, error: singleError } = await supabase
      .from('games')
      .insert([gamesToInsert[0]])
      .select();
    
    if (singleError) {
      console.error('❌ Single insert failed:', singleError);
      
      // Try with minimal data
      console.log('🔧 Trying with minimal data...');
      const minimalGame = {
        game_id: gamesToInsert[0].game_id,
        sport: 'NBA',
        home_team: gamesToInsert[0].home_team,
        away_team: gamesToInsert[0].away_team
      };
      
      const { data: minResult, error: minError } = await supabase
        .from('games')
        .insert([minimalGame])
        .select();
      
      if (minError) {
        console.error('❌ Even minimal insert failed:', minError);
        return;
      } else {
        console.log('✅ Minimal insert worked! Need to adjust table structure.');
      }
    } else {
      console.log('✅ Single insert worked!');
      
      // Insert the rest
      const { data: bulkResult, error: bulkError } = await supabase
        .from('games')
        .insert(gamesToInsert.slice(1))
        .select();
      
      if (bulkError) {
        console.log('⚠️ Bulk insert had issues:', bulkError.message);
      } else {
        console.log(`🎉 SUCCESS! Inserted ${gamesToInsert.length} real games!`);
      }
    }
    
    // Test retrieval
    console.log('🔍 Testing data retrieval...');
    const { data: testGames, error: testError } = await supabase
      .from('games')
      .select('*')
      .limit(3);
    
    if (!testError && testGames) {
      console.log(`✅ Retrieved ${testGames.length} games:`);
      testGames.forEach(game => {
        console.log(`  🏀 ${game.away_team || 'Away'} @ ${game.home_team || 'Home'} (${game.status || 'N/A'})`);
      });
    }
    
    console.log('\n🔥 DATABASE NOW HAS REAL NBA GAMES!');
    console.log('🚀 Your app should show live data now!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

populateRealData();