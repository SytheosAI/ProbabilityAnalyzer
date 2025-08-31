#!/usr/bin/env node

/**
 * Simple Supabase Connection Test
 * Tests basic connectivity and identifies what tables currently exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnection() {
    console.log('🚀 Testing Supabase Connection\n');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Anon Key: ${SUPABASE_ANON_KEY ? '✓ Present' : '✗ Missing'}`);
    console.log(`Service Key: ${SUPABASE_SERVICE_KEY ? '✓ Present' : '✗ Missing'}\n`);

    try {
        // Test with service role
        const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        
        console.log('🔌 Testing basic connection...');
        
        // Try a simple query first
        const { data, error } = await client.rpc('version');
        
        if (error) {
            console.log('❌ Direct connection failed, trying table query...');
            
            // Try to query existing tables using a different approach
            const { data: tables, error: tablesError } = await client
                .from('pg_tables')
                .select('tablename')
                .eq('schemaname', 'public');
                
            if (tablesError) {
                console.log('❌ Tables query failed, trying basic auth test...');
                
                // Try auth test
                const { data: user, error: authError } = await client.auth.getUser();
                
                if (authError) {
                    console.log(`❌ Auth test failed: ${authError.message}`);
                } else {
                    console.log('✅ Auth connection works');
                }
                
                // Try a very simple query
                try {
                    const { data: testData, error: testError } = await client
                        .from('games')
                        .select('*')
                        .limit(1);
                        
                    if (testError) {
                        console.log(`⚠️  Games table query failed: ${testError.message}`);
                        
                        if (testError.message.includes('does not exist')) {
                            console.log('📋 Database connected but schema not created yet');
                            return { connected: true, schemaExists: false };
                        }
                    } else {
                        console.log('✅ Games table exists and accessible');
                        console.log(`📊 Found ${testData ? testData.length : 0} records`);
                        return { connected: true, schemaExists: true };
                    }
                } catch (err) {
                    console.log(`❌ Games table test error: ${err.message}`);
                }
                
                return { connected: false, schemaExists: false };
            } else {
                console.log('✅ Connected! Found tables in database:');
                tables.forEach(table => {
                    console.log(`   • ${table.tablename}`);
                });
                
                // Check if our expected tables exist
                const expectedTables = ['games', 'predictions', 'odds', 'parlays', 'team_stats', 'analysis_results', 'user_bets', 'performance_metrics'];
                const existingTables = tables.map(t => t.tablename);
                const ourTables = expectedTables.filter(t => existingTables.includes(t));
                
                console.log(`\n📊 Schema Analysis:`);
                console.log(`   Expected tables: ${expectedTables.length}`);
                console.log(`   Found our tables: ${ourTables.length}`);
                console.log(`   Missing tables: ${expectedTables.length - ourTables.length}`);
                
                if (ourTables.length === 0) {
                    console.log('\n❌ No application tables found - schema needs to be created');
                    return { connected: true, schemaExists: false, allTables: existingTables };
                } else if (ourTables.length < expectedTables.length) {
                    console.log('\n⚠️  Partial schema found - may need updates');
                    console.log('   Found tables:', ourTables.join(', '));
                    const missing = expectedTables.filter(t => !ourTables.includes(t));
                    console.log('   Missing tables:', missing.join(', '));
                    return { connected: true, schemaExists: 'partial', allTables: existingTables, ourTables, missing };
                } else {
                    console.log('\n✅ Complete schema found!');
                    return { connected: true, schemaExists: true, allTables: existingTables, ourTables };
                }
            }
        } else {
            console.log('✅ Connection successful!');
            console.log(`Database version: ${data}`);
            return { connected: true, schemaExists: 'unknown' };
        }
        
    } catch (error) {
        console.log(`❌ Connection failed: ${error.message}`);
        return { connected: false, schemaExists: false, error: error.message };
    }
}

async function main() {
    const result = await testConnection();
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    
    if (result.connected) {
        console.log('✅ Database connection: SUCCESS');
        
        if (result.schemaExists === false) {
            console.log('❌ Schema status: NOT CREATED');
            console.log('\n🔧 Next Steps:');
            console.log('   1. Run supabase_schema.sql in Supabase SQL Editor');
            console.log('   2. Re-run this test to verify');
        } else if (result.schemaExists === 'partial') {
            console.log('⚠️  Schema status: INCOMPLETE');
            console.log('\n🔧 Next Steps:');
            console.log('   1. Run fix_schema.sql to add missing tables/columns');
            console.log('   2. Re-run this test to verify');
        } else if (result.schemaExists === true) {
            console.log('✅ Schema status: COMPLETE');
            console.log('\n🎉 Database is ready to use!');
        } else {
            console.log('❓ Schema status: UNKNOWN (needs manual check)');
        }
    } else {
        console.log('❌ Database connection: FAILED');
        console.log('\n🔧 Check your credentials in .env.local');
    }
    
    console.log('='.repeat(60));
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = testConnection;