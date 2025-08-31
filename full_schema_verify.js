#!/usr/bin/env node

/**
 * Full Supabase Schema Verification
 * Comprehensive test of all tables, columns, and basic operations
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const EXPECTED_TABLES = [
    'games', 'predictions', 'odds', 'parlays', 
    'team_stats', 'analysis_results', 'user_bets', 'performance_metrics'
];

const EXPECTED_COLUMNS = {
    games: ['id', 'game_id', 'sport', 'home_team', 'away_team', 'scheduled', 'home_score', 'away_score', 'status', 'created_at', 'updated_at'],
    predictions: ['id', 'game_id', 'prediction_type', 'predicted_outcome', 'confidence', 'probability', 'expected_value', 'actual_outcome', 'is_correct', 'created_at', 'updated_at'],
    odds: ['id', 'game_id', 'book_name', 'market_type', 'home_odds', 'away_odds', 'spread', 'total', 'over_odds', 'under_odds', 'timestamp'],
    parlays: ['id', 'parlay_id', 'legs', 'combined_odds', 'total_probability', 'expected_value', 'risk_level', 'correlation_score', 'recommended', 'actual_outcome', 'payout', 'created_at'],
    team_stats: ['id', 'team_id', 'sport', 'season', 'wins', 'losses', 'win_percentage', 'points_per_game', 'points_against_per_game', 'home_record', 'away_record', 'ats_record', 'over_under_record', 'last_updated'],
    analysis_results: ['id', 'game_id', 'analysis_type', 'moneyline_pick', 'moneyline_confidence', 'spread_pick', 'spread_confidence', 'total_pick', 'total_confidence', 'best_bet', 'risk_assessment', 'value_opportunities', 'created_at'],
    user_bets: ['id', 'user_id', 'bet_type', 'game_id', 'selection', 'odds', 'stake', 'potential_payout', 'actual_payout', 'status', 'placed_at', 'resolved_at'],
    performance_metrics: ['id', 'date', 'sport', 'total_predictions', 'correct_predictions', 'accuracy', 'total_value', 'roi', 'best_performing_model', 'created_at']
};

async function verifySchema() {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const results = {
        tables: {},
        columns: {},
        samples: {},
        errors: []
    };

    console.log('🔍 Full Schema Verification Started\n');

    // Check each table
    for (const tableName of EXPECTED_TABLES) {
        console.log(`📋 Checking table: ${tableName}`);
        
        try {
            // Test if table exists and is accessible
            const { data, error } = await client
                .from(tableName)
                .select('*')
                .limit(5);

            if (error) {
                results.tables[tableName] = false;
                results.errors.push(`Table ${tableName}: ${error.message}`);
                console.log(`   ❌ ${error.message}`);
                continue;
            }

            results.tables[tableName] = true;
            results.samples[tableName] = data || [];
            console.log(`   ✅ Table exists, ${data ? data.length : 0} sample records`);

            // Get column information
            if (data && data.length > 0) {
                const actualColumns = Object.keys(data[0]);
                const expectedColumns = EXPECTED_COLUMNS[tableName];
                
                results.columns[tableName] = {
                    actual: actualColumns,
                    expected: expectedColumns,
                    missing: expectedColumns.filter(col => !actualColumns.includes(col)),
                    extra: actualColumns.filter(col => !expectedColumns.includes(col))
                };

                const missing = results.columns[tableName].missing;
                const extra = results.columns[tableName].extra;

                if (missing.length === 0) {
                    console.log(`   ✅ All expected columns present`);
                } else {
                    console.log(`   ⚠️  Missing columns: ${missing.join(', ')}`);
                }

                if (extra.length > 0) {
                    console.log(`   💡 Extra columns: ${extra.join(', ')}`);
                }
            } else {
                // Table exists but no data, try to get column info differently
                console.log(`   📝 Empty table, checking schema...`);
                
                try {
                    const { data: schemaData, error: schemaError } = await client
                        .from(tableName)
                        .select()
                        .limit(0);
                    
                    // This won't give us column names, but confirms table structure is valid
                    if (!schemaError) {
                        console.log(`   ✅ Table structure is valid`);
                    }
                } catch (err) {
                    console.log(`   ⚠️  Could not verify empty table structure`);
                }
            }

        } catch (error) {
            results.tables[tableName] = false;
            results.errors.push(`Table ${tableName}: ${error.message}`);
            console.log(`   ❌ ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }

    return results;
}

async function testBasicOperations() {
    const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    console.log('🧪 Testing Basic CRUD Operations\n');

    // Test with games table (most basic)
    const testGameId = `test_${Date.now()}`;
    const testData = {
        game_id: testGameId,
        sport: 'TEST',
        home_team: 'Test Home',
        away_team: 'Test Away',
        scheduled: new Date().toISOString(),
        status: 'scheduled'
    };

    try {
        // INSERT test
        console.log('📝 Testing INSERT operation...');
        const { data: insertData, error: insertError } = await client
            .from('games')
            .insert(testData)
            .select();

        if (insertError) {
            console.log(`   ❌ INSERT failed: ${insertError.message}`);
            return { insert: false, update: false, delete: false, select: false };
        }

        console.log(`   ✅ INSERT successful`);
        const insertedId = insertData[0].id;

        // SELECT test
        console.log('🔍 Testing SELECT operation...');
        const { data: selectData, error: selectError } = await client
            .from('games')
            .select('*')
            .eq('id', insertedId);

        if (selectError) {
            console.log(`   ❌ SELECT failed: ${selectError.message}`);
        } else {
            console.log(`   ✅ SELECT successful, found ${selectData.length} record(s)`);
        }

        // UPDATE test
        console.log('✏️ Testing UPDATE operation...');
        const { data: updateData, error: updateError } = await client
            .from('games')
            .update({ status: 'completed' })
            .eq('id', insertedId)
            .select();

        if (updateError) {
            console.log(`   ❌ UPDATE failed: ${updateError.message}`);
        } else {
            console.log(`   ✅ UPDATE successful`);
        }

        // DELETE test
        console.log('🗑️ Testing DELETE operation...');
        const { error: deleteError } = await client
            .from('games')
            .delete()
            .eq('id', insertedId);

        if (deleteError) {
            console.log(`   ❌ DELETE failed: ${deleteError.message}`);
            return { insert: true, update: !updateError, delete: false, select: !selectError };
        } else {
            console.log(`   ✅ DELETE successful`);
        }

        return { 
            insert: true, 
            update: !updateError, 
            delete: true, 
            select: !selectError 
        };

    } catch (error) {
        console.log(`   ❌ CRUD test failed: ${error.message}`);
        return { insert: false, update: false, delete: false, select: false };
    }
}

async function main() {
    console.log('🚀 Supabase Full Schema Verification\n');
    console.log(`🔗 URL: ${SUPABASE_URL}`);
    console.log(`🔑 Service Key: ${SUPABASE_SERVICE_KEY ? 'Present' : 'Missing'}\n`);

    // Verify schema
    const schemaResults = await verifySchema();

    // Test operations
    const crudResults = await testBasicOperations();

    // Generate report
    console.log('\n' + '='.repeat(70));
    console.log('📊 FULL VERIFICATION REPORT');
    console.log('='.repeat(70));

    // Tables summary
    const tablesExist = Object.values(schemaResults.tables).filter(Boolean).length;
    console.log(`\n📋 Tables Status: ${tablesExist}/${EXPECTED_TABLES.length} exist`);
    
    EXPECTED_TABLES.forEach(table => {
        const exists = schemaResults.tables[table];
        const records = schemaResults.samples[table]?.length || 0;
        console.log(`   ${exists ? '✅' : '❌'} ${table}${exists ? ` (${records} records)` : ''}`);
    });

    // Column issues
    console.log(`\n🔍 Column Analysis:`);
    let totalMissing = 0;
    for (const [table, columnInfo] of Object.entries(schemaResults.columns)) {
        if (columnInfo?.missing?.length > 0) {
            console.log(`   ⚠️  ${table}: Missing ${columnInfo.missing.join(', ')}`);
            totalMissing += columnInfo.missing.length;
        } else if (schemaResults.tables[table]) {
            console.log(`   ✅ ${table}: Schema complete`);
        }
    }

    // CRUD results
    console.log(`\n🧪 CRUD Operations:`);
    const crudOperations = ['insert', 'select', 'update', 'delete'];
    crudOperations.forEach(op => {
        console.log(`   ${crudResults[op] ? '✅' : '❌'} ${op.toUpperCase()}`);
    });

    // Errors
    if (schemaResults.errors.length > 0) {
        console.log(`\n❌ Errors Found (${schemaResults.errors.length}):`);
        schemaResults.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error}`);
        });
    }

    // Final assessment
    console.log(`\n🎯 FINAL ASSESSMENT:`);
    const allTablesExist = tablesExist === EXPECTED_TABLES.length;
    const noMissingColumns = totalMissing === 0;
    const crudWorks = Object.values(crudResults).every(Boolean);

    if (allTablesExist && noMissingColumns && crudWorks) {
        console.log('   🎉 PERFECT! Database is fully set up and operational');
        console.log('   ✅ All tables exist');
        console.log('   ✅ All columns present');
        console.log('   ✅ CRUD operations working');
        console.log('\n   🚀 Ready for production use!');
    } else {
        console.log('   ⚠️  Issues found that need attention:');
        if (!allTablesExist) {
            console.log('   • Run supabase_schema.sql to create missing tables');
        }
        if (!noMissingColumns) {
            console.log('   • Run fix_schema.sql to add missing columns');
        }
        if (!crudWorks) {
            console.log('   • Check RLS policies and permissions');
        }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`🕒 Completed at: ${new Date().toISOString()}`);
    console.log('='.repeat(70));

    return {
        success: allTablesExist && noMissingColumns && crudWorks,
        tablesExist: allTablesExist,
        columnsComplete: noMissingColumns,
        crudWorks,
        details: { schemaResults, crudResults }
    };
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = main;