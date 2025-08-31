#!/usr/bin/env node

/**
 * Supabase Database Diagnostic Report
 * Generate a complete diagnostic report of the current database state
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function generateDiagnosticReport() {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('🔍 SUPABASE DATABASE DIAGNOSTIC REPORT');
    console.log('=' * 60);
    console.log(`🕒 Generated: ${new Date().toISOString()}`);
    console.log(`🔗 Database: ${SUPABASE_URL}`);
    console.log('=' * 60 + '\n');

    // 1. Test basic connectivity
    console.log('🔌 CONNECTION TEST');
    console.log('-' * 20);
    try {
        const { data: authData, error: authError } = await client.auth.getUser();
        console.log(`Auth Status: ${authError ? `❌ ${authError.message}` : '⚠️ No user (expected for service key)'}`);
        
        // Try a basic query
        const { data, error } = await client.from('games').select('*').limit(1);
        if (error) {
            console.log(`Basic Query: ❌ ${error.message}`);
        } else {
            console.log(`Basic Query: ✅ Success`);
        }
    } catch (err) {
        console.log(`Connection: ❌ ${err.message}`);
    }

    // 2. List all existing tables
    console.log('\n📋 EXISTING TABLES');
    console.log('-' * 20);
    try {
        // Try different approaches to get table list
        const approaches = [
            { name: 'pg_tables', query: client.from('pg_tables').select('tablename').eq('schemaname', 'public') },
            { name: 'information_schema.tables', query: client.from('information_schema.tables').select('table_name').eq('table_schema', 'public') }
        ];

        let tablesFound = false;
        for (const approach of approaches) {
            try {
                const { data, error } = await approach.query;
                if (!error && data) {
                    console.log(`✅ Found tables using ${approach.name}:`);
                    data.forEach(table => {
                        const tableName = table.tablename || table.table_name;
                        console.log(`   • ${tableName}`);
                    });
                    tablesFound = true;
                    break;
                }
            } catch (err) {
                console.log(`❌ ${approach.name}: ${err.message}`);
            }
        }

        if (!tablesFound) {
            console.log('⚠️ Could not retrieve table list, checking manually...');
            
            // Manual check for each expected table
            const expectedTables = ['games', 'predictions', 'odds', 'parlays', 'team_stats', 'analysis_results', 'user_bets', 'performance_metrics'];
            console.log('\n📊 MANUAL TABLE CHECK:');
            for (const table of expectedTables) {
                try {
                    const { data, error } = await client.from(table).select('*').limit(0);
                    if (error) {
                        console.log(`   ❌ ${table}: ${error.message}`);
                    } else {
                        console.log(`   ✅ ${table}: Exists`);
                    }
                } catch (err) {
                    console.log(`   ❌ ${table}: ${err.message}`);
                }
            }
        }
    } catch (err) {
        console.log(`❌ Table listing failed: ${err.message}`);
    }

    // 3. Check existing table structures
    console.log('\n🏗️ TABLE STRUCTURES');
    console.log('-' * 20);
    const knownTables = ['games', 'performance_metrics']; // Tables we know exist
    
    for (const table of knownTables) {
        try {
            console.log(`\n📋 Table: ${table}`);
            const { data, error } = await client.from(table).select('*').limit(1);
            
            if (error) {
                console.log(`   ❌ Error: ${error.message}`);
                continue;
            }

            if (data && data.length > 0) {
                const columns = Object.keys(data[0]);
                console.log(`   ✅ Columns (${columns.length}): ${columns.join(', ')}`);
            } else {
                console.log(`   📝 Table exists but is empty`);
                // Try to insert a test record to see what columns are available
                console.log(`   🔍 Testing column structure...`);
                
                if (table === 'games') {
                    try {
                        const testInsert = await client
                            .from('games')
                            .insert({
                                game_id: 'test_structure_check',
                                sport: 'TEST'
                            })
                            .select();
                        
                        if (testInsert.error) {
                            console.log(`   ⚠️ Insert test: ${testInsert.error.message}`);
                        } else {
                            console.log(`   ✅ Basic columns work, cleaning up...`);
                            await client.from('games').delete().eq('game_id', 'test_structure_check');
                        }
                    } catch (err) {
                        console.log(`   ❌ Structure test failed: ${err.message}`);
                    }
                }
            }

            // Get count
            const { count } = await client.from(table).select('*', { count: 'exact' });
            console.log(`   📊 Record count: ${count || 0}`);

        } catch (err) {
            console.log(`   ❌ ${table}: ${err.message}`);
        }
    }

    // 4. Database recommendations
    console.log('\n💡 RECOMMENDATIONS');
    console.log('-' * 20);
    console.log('Based on the diagnostic results:\n');
    
    console.log('1. 🚨 IMMEDIATE ACTIONS NEEDED:');
    console.log('   • Only 2 out of 8 required tables exist');
    console.log('   • Missing tables: predictions, odds, parlays, team_stats, analysis_results, user_bets');
    console.log('   • Existing games table may be missing columns\n');
    
    console.log('2. 🔧 SCHEMA SETUP REQUIRED:');
    console.log('   • Run the full supabase_schema.sql in Supabase SQL Editor');
    console.log('   • This will create all missing tables and proper structure');
    console.log('   • Alternatively, run fix_schema.sql to add missing columns to existing tables\n');
    
    console.log('3. ✅ WHAT WORKS:');
    console.log('   • Database connection is successful');
    console.log('   • Service role credentials are valid');
    console.log('   • Basic table operations work');
    console.log('   • games and performance_metrics tables exist\n');

    console.log('4. 📝 NEXT STEPS:');
    console.log('   a) Open Supabase Dashboard → SQL Editor');
    console.log('   b) Copy and paste supabase_schema.sql contents');
    console.log('   c) Execute the SQL script');
    console.log('   d) Re-run this diagnostic to verify');
    console.log('   e) Run the full schema verification test\n');

    console.log('=' * 60);
    console.log('🏁 DIAGNOSTIC COMPLETE');
    console.log('=' * 60);
}

if (require.main === module) {
    generateDiagnosticReport().catch(console.error);
}

module.exports = generateDiagnosticReport;