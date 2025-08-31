#!/usr/bin/env node

/**
 * Supabase Database Schema Test Script
 * 
 * This script tests the Supabase database connection and verifies:
 * 1. Database connectivity
 * 2. Table existence
 * 3. Table structure and columns
 * 4. Basic CRUD operations
 * 5. RLS policies and permissions
 * 
 * Usage: node test_supabase_schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Expected tables from the schema
const EXPECTED_TABLES = [
    'games',
    'predictions',
    'odds', 
    'parlays',
    'team_stats',
    'analysis_results',
    'user_bets',
    'performance_metrics'
];

// Expected columns for each table
const EXPECTED_COLUMNS = {
    games: [
        'id', 'game_id', 'sport', 'home_team', 'away_team', 
        'scheduled', 'home_score', 'away_score', 'status', 
        'created_at', 'updated_at'
    ],
    predictions: [
        'id', 'game_id', 'prediction_type', 'predicted_outcome',
        'confidence', 'probability', 'expected_value', 'actual_outcome',
        'is_correct', 'created_at', 'updated_at'
    ],
    odds: [
        'id', 'game_id', 'book_name', 'market_type', 'home_odds',
        'away_odds', 'spread', 'total', 'over_odds', 'under_odds', 'timestamp'
    ],
    parlays: [
        'id', 'parlay_id', 'legs', 'combined_odds', 'total_probability',
        'expected_value', 'risk_level', 'correlation_score', 'recommended',
        'actual_outcome', 'payout', 'created_at'
    ],
    team_stats: [
        'id', 'team_id', 'sport', 'season', 'wins', 'losses',
        'win_percentage', 'points_per_game', 'points_against_per_game',
        'home_record', 'away_record', 'ats_record', 'over_under_record', 'last_updated'
    ],
    analysis_results: [
        'id', 'game_id', 'analysis_type', 'moneyline_pick', 'moneyline_confidence',
        'spread_pick', 'spread_confidence', 'total_pick', 'total_confidence',
        'best_bet', 'risk_assessment', 'value_opportunities', 'created_at'
    ],
    user_bets: [
        'id', 'user_id', 'bet_type', 'game_id', 'selection', 'odds',
        'stake', 'potential_payout', 'actual_payout', 'status', 'placed_at', 'resolved_at'
    ],
    performance_metrics: [
        'id', 'date', 'sport', 'total_predictions', 'correct_predictions',
        'accuracy', 'total_value', 'roi', 'best_performing_model', 'created_at'
    ]
};

class SupabaseSchemaTest {
    constructor() {
        this.results = {
            connection: false,
            tables: {},
            columns: {},
            crud: {},
            policies: {},
            errors: []
        };
        
        // Initialize both clients
        this.anonClient = null;
        this.serviceClient = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: '💡',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        }[type];
        
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async initialize() {
        this.log('🚀 Starting Supabase Database Schema Test', 'info');
        
        // Check environment variables
        if (!SUPABASE_URL) {
            this.results.errors.push('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
            return false;
        }
        
        if (!SUPABASE_ANON_KEY) {
            this.results.errors.push('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
            return false;
        }
        
        if (!SUPABASE_SERVICE_KEY) {
            this.results.errors.push('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
            return false;
        }

        this.log(`🔧 Supabase URL: ${SUPABASE_URL}`, 'info');
        
        // Initialize clients
        try {
            this.anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            this.serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            this.log('📡 Supabase clients initialized', 'success');
            return true;
        } catch (error) {
            this.results.errors.push(`Failed to initialize Supabase clients: ${error.message}`);
            this.log(`Failed to initialize clients: ${error.message}`, 'error');
            return false;
        }
    }

    async testConnection() {
        this.log('🔌 Testing database connection...', 'info');
        
        try {
            // Test with service role first (more permissions)
            const { data, error } = await this.serviceClient
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .limit(1);

            if (error) {
                throw error;
            }

            this.results.connection = true;
            this.log('Database connection successful', 'success');
            return true;
        } catch (error) {
            this.results.connection = false;
            this.results.errors.push(`Connection failed: ${error.message}`);
            this.log(`Connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async checkTableExists(tableName) {
        try {
            const { data, error } = await this.serviceClient
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public')
                .eq('table_name', tableName);

            if (error) throw error;
            
            const exists = data && data.length > 0;
            this.results.tables[tableName] = exists;
            
            if (exists) {
                this.log(`Table '${tableName}' exists`, 'success');
            } else {
                this.log(`Table '${tableName}' missing`, 'warning');
            }
            
            return exists;
        } catch (error) {
            this.results.tables[tableName] = false;
            this.results.errors.push(`Error checking table ${tableName}: ${error.message}`);
            this.log(`Error checking table ${tableName}: ${error.message}`, 'error');
            return false;
        }
    }

    async checkTableColumns(tableName) {
        if (!this.results.tables[tableName]) {
            this.log(`Skipping column check for missing table: ${tableName}`, 'warning');
            return false;
        }

        try {
            const { data, error } = await this.serviceClient
                .from('information_schema.columns')
                .select('column_name, data_type, is_nullable')
                .eq('table_schema', 'public')
                .eq('table_name', tableName)
                .order('ordinal_position');

            if (error) throw error;

            const actualColumns = data.map(col => col.column_name);
            const expectedColumns = EXPECTED_COLUMNS[tableName] || [];
            
            this.results.columns[tableName] = {
                actual: actualColumns,
                expected: expectedColumns,
                missing: expectedColumns.filter(col => !actualColumns.includes(col)),
                extra: actualColumns.filter(col => !expectedColumns.includes(col)),
                details: data
            };

            const missing = this.results.columns[tableName].missing;
            const extra = this.results.columns[tableName].extra;

            if (missing.length === 0 && extra.length === 0) {
                this.log(`Table '${tableName}' columns match exactly`, 'success');
            } else {
                if (missing.length > 0) {
                    this.log(`Table '${tableName}' missing columns: ${missing.join(', ')}`, 'warning');
                }
                if (extra.length > 0) {
                    this.log(`Table '${tableName}' has extra columns: ${extra.join(', ')}`, 'info');
                }
            }

            return true;
        } catch (error) {
            this.results.errors.push(`Error checking columns for ${tableName}: ${error.message}`);
            this.log(`Error checking columns for ${tableName}: ${error.message}`, 'error');
            return false;
        }
    }

    async testBasicCRUD(tableName) {
        if (!this.results.tables[tableName]) {
            this.log(`Skipping CRUD test for missing table: ${tableName}`, 'warning');
            return false;
        }

        this.results.crud[tableName] = {
            read: false,
            insert: false,
            update: false,
            delete: false
        };

        try {
            // Test READ
            const { data: readData, error: readError } = await this.serviceClient
                .from(tableName)
                .select('*')
                .limit(1);

            if (readError) {
                this.log(`READ test failed for ${tableName}: ${readError.message}`, 'warning');
            } else {
                this.results.crud[tableName].read = true;
                this.log(`READ test passed for ${tableName}`, 'success');
            }

            // Test INSERT (with sample data based on table)
            let sampleData = this.getSampleData(tableName);
            if (sampleData) {
                const { data: insertData, error: insertError } = await this.serviceClient
                    .from(tableName)
                    .insert(sampleData)
                    .select();

                if (insertError) {
                    this.log(`INSERT test failed for ${tableName}: ${insertError.message}`, 'warning');
                } else {
                    this.results.crud[tableName].insert = true;
                    this.log(`INSERT test passed for ${tableName}`, 'success');

                    // Test UPDATE and DELETE if insert was successful
                    if (insertData && insertData.length > 0) {
                        const insertedId = insertData[0].id;

                        // Test UPDATE
                        const updateData = this.getUpdateData(tableName);
                        if (updateData) {
                            const { error: updateError } = await this.serviceClient
                                .from(tableName)
                                .update(updateData)
                                .eq('id', insertedId);

                            if (updateError) {
                                this.log(`UPDATE test failed for ${tableName}: ${updateError.message}`, 'warning');
                            } else {
                                this.results.crud[tableName].update = true;
                                this.log(`UPDATE test passed for ${tableName}`, 'success');
                            }
                        }

                        // Test DELETE
                        const { error: deleteError } = await this.serviceClient
                            .from(tableName)
                            .delete()
                            .eq('id', insertedId);

                        if (deleteError) {
                            this.log(`DELETE test failed for ${tableName}: ${deleteError.message}`, 'warning');
                        } else {
                            this.results.crud[tableName].delete = true;
                            this.log(`DELETE test passed for ${tableName}`, 'success');
                        }
                    }
                }
            }

            return true;
        } catch (error) {
            this.results.errors.push(`CRUD test error for ${tableName}: ${error.message}`);
            this.log(`CRUD test error for ${tableName}: ${error.message}`, 'error');
            return false;
        }
    }

    getSampleData(tableName) {
        const sampleData = {
            games: {
                game_id: 'test_' + Date.now(),
                sport: 'NFL',
                home_team: 'Test Home Team',
                away_team: 'Test Away Team',
                scheduled: new Date().toISOString(),
                status: 'scheduled'
            },
            predictions: {
                game_id: 'test_' + Date.now(),
                prediction_type: 'moneyline',
                predicted_outcome: 'Test Team',
                confidence: 0.75,
                probability: 0.65
            },
            team_stats: {
                team_id: 'test_team_' + Date.now(),
                sport: 'NFL',
                season: '2024',
                wins: 8,
                losses: 4,
                win_percentage: 0.667
            },
            performance_metrics: {
                date: new Date().toISOString().split('T')[0],
                sport: 'NFL',
                total_predictions: 100,
                correct_predictions: 65,
                accuracy: 0.65,
                roi: 0.15
            }
        };

        return sampleData[tableName] || null;
    }

    getUpdateData(tableName) {
        const updateData = {
            games: { status: 'in_progress' },
            predictions: { confidence: 0.80 },
            team_stats: { wins: 9 },
            performance_metrics: { accuracy: 0.70 }
        };

        return updateData[tableName] || null;
    }

    async checkRLSPolicies() {
        this.log('🔒 Checking Row Level Security policies...', 'info');
        
        try {
            const { data, error } = await this.serviceClient.rpc('pg_policies');
            
            if (error) {
                // Alternative approach if pg_policies doesn't work
                const { data: policies, error: policyError } = await this.serviceClient
                    .from('pg_policies')
                    .select('*')
                    .eq('schemaname', 'public');

                if (policyError) {
                    this.log(`Cannot check RLS policies: ${policyError.message}`, 'warning');
                    return false;
                }
            }

            this.log('RLS policies check completed', 'success');
            return true;
        } catch (error) {
            this.log(`RLS policies check failed: ${error.message}`, 'warning');
            return false;
        }
    }

    async runAllTests() {
        const initialized = await this.initialize();
        if (!initialized) {
            this.generateReport();
            return;
        }

        const connected = await this.testConnection();
        if (!connected) {
            this.generateReport();
            return;
        }

        // Test all tables
        this.log('📋 Checking table existence...', 'info');
        for (const table of EXPECTED_TABLES) {
            await this.checkTableExists(table);
        }

        // Check columns for existing tables
        this.log('🔍 Checking table columns...', 'info');
        for (const table of EXPECTED_TABLES) {
            await this.checkTableColumns(table);
        }

        // Test CRUD operations on a subset of tables
        this.log('🧪 Testing CRUD operations...', 'info');
        const testTables = ['games', 'predictions', 'team_stats', 'performance_metrics'];
        for (const table of testTables) {
            await this.testBasicCRUD(table);
        }

        // Check RLS policies
        await this.checkRLSPolicies();

        this.generateReport();
    }

    generateReport() {
        this.log('📊 Generating test report...', 'info');
        
        console.log('\n' + '='.repeat(80));
        console.log('🏆 SUPABASE DATABASE SCHEMA TEST REPORT');
        console.log('='.repeat(80));
        
        // Connection status
        console.log(`\n🔌 Connection Status: ${this.results.connection ? '✅ Connected' : '❌ Failed'}`);
        
        // Tables summary
        const existingTables = Object.entries(this.results.tables).filter(([_, exists]) => exists).length;
        const totalTables = EXPECTED_TABLES.length;
        console.log(`\n📋 Tables: ${existingTables}/${totalTables} exist`);
        
        for (const [table, exists] of Object.entries(this.results.tables)) {
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        }

        // Column issues
        console.log(`\n🔍 Column Analysis:`);
        let totalMissingCols = 0;
        for (const [table, columnInfo] of Object.entries(this.results.columns)) {
            if (columnInfo.missing.length > 0) {
                console.log(`   ⚠️  ${table}: Missing ${columnInfo.missing.length} columns: ${columnInfo.missing.join(', ')}`);
                totalMissingCols += columnInfo.missing.length;
            } else if (this.results.tables[table]) {
                console.log(`   ✅ ${table}: All columns present`);
            }
        }

        // CRUD test results
        console.log(`\n🧪 CRUD Test Results:`);
        for (const [table, crudResults] of Object.entries(this.results.crud)) {
            const passed = Object.values(crudResults).filter(Boolean).length;
            const total = Object.keys(crudResults).length;
            console.log(`   ${table}: ${passed}/${total} operations successful`);
            
            for (const [operation, success] of Object.entries(crudResults)) {
                console.log(`     ${success ? '✅' : '❌'} ${operation.toUpperCase()}`);
            }
        }

        // Errors
        if (this.results.errors.length > 0) {
            console.log(`\n❌ Errors (${this.results.errors.length}):`);
            this.results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }

        // Summary and recommendations
        console.log(`\n📋 SUMMARY:`);
        if (this.results.connection && existingTables === totalTables && totalMissingCols === 0) {
            console.log('   🎉 Database schema is complete and ready to use!');
        } else {
            console.log('   ⚠️  Issues found that need attention:');
            
            if (!this.results.connection) {
                console.log('   • Fix database connection issues');
            }
            
            if (existingTables < totalTables) {
                console.log('   • Run supabase_schema.sql to create missing tables');
            }
            
            if (totalMissingCols > 0) {
                console.log('   • Run fix_schema.sql to add missing columns');
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('🏁 Test completed at:', new Date().toISOString());
        console.log('='.repeat(80) + '\n');

        // Return summary for programmatic use
        return {
            success: this.results.connection && existingTables === totalTables && totalMissingCols === 0,
            connection: this.results.connection,
            tablesExist: existingTables,
            totalTables: totalTables,
            missingColumns: totalMissingCols,
            errors: this.results.errors
        };
    }
}

// Main execution
async function main() {
    const tester = new SupabaseSchemaTest();
    await tester.runAllTests();
}

// Run if this script is executed directly
if (require.main === module) {
    main().catch(error => {
        console.error('❌ Test script failed:', error);
        process.exit(1);
    });
}

module.exports = SupabaseSchemaTest;