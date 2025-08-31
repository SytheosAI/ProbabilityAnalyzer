# Supabase Database Setup Instructions

## Current Status ✅ 🔧

**Connection Status:** ✅ **SUCCESSFUL**  
**Database Credentials:** ✅ **VALID**  
**Schema Status:** ⚠️ **INCOMPLETE**

### What's Working:
- ✅ Database connection established
- ✅ Service role credentials are valid  
- ✅ 2 tables exist: `games`, `performance_metrics`

### What Needs Fixing:
- ❌ **6 tables missing:** predictions, odds, parlays, team_stats, analysis_results, user_bets
- ❌ **Existing tables incomplete:** games table missing required columns (sport, away_team, etc.)
- ❌ **CRUD operations failing** due to missing columns

---

## 🚀 Step-by-Step Fix Instructions

### Option 1: Complete Schema Setup (Recommended)

1. **Open Supabase Dashboard**
   - Go to: https://qnhuezgavmjdvayhydpe.supabase.co
   - Login with your Supabase credentials
   - Navigate to: **SQL Editor**

2. **Run the Full Schema**
   - Copy the contents of `supabase_schema.sql`
   - Paste into the SQL Editor
   - Click **Run** to execute

3. **Verify Setup**
   ```bash
   cd "Probability Analyzer"
   node full_schema_verify.js
   ```

### Option 2: Fix Existing Schema (Alternative)

1. **Run the Fix Script First**
   - Copy contents of `fix_schema.sql` 
   - Execute in Supabase SQL Editor

2. **Then Run Full Schema**
   - Follow steps from Option 1

---

## 🧪 Testing Scripts Available

### Quick Connection Test
```bash
node simple_connection_test.js
```
**Purpose:** Basic connectivity and table existence check

### Full Schema Verification  
```bash
node full_schema_verify.js
```
**Purpose:** Complete table/column verification + CRUD testing

### Comprehensive Test Suite
```bash
node test_supabase_schema.js
```
**Purpose:** Detailed analysis with policy checks

### Diagnostic Report
```bash
node diagnostic_report.js  
```
**Purpose:** Current database state analysis

---

## 📋 Expected Final Result

After running the schema setup, you should have:

### ✅ All 8 Tables Created:
1. **games** - Game information and schedules
2. **predictions** - AI predictions and outcomes  
3. **odds** - Betting odds from various books
4. **parlays** - Multi-game bet combinations
5. **team_stats** - Team performance statistics
6. **analysis_results** - Detailed game analysis
7. **user_bets** - User betting history
8. **performance_metrics** - System performance tracking

### ✅ All Columns Present:
- Each table will have all required columns as defined in schema
- Proper data types and constraints
- Foreign key relationships established

### ✅ Working Operations:
- ✅ INSERT - Add new records
- ✅ SELECT - Query data  
- ✅ UPDATE - Modify existing records
- ✅ DELETE - Remove records

### ✅ Security Features:
- Row Level Security (RLS) enabled
- Proper access policies configured
- Service role bypass policies

---

## 🔧 Troubleshooting

### If Schema Setup Fails:
1. Check for existing data conflicts
2. May need to drop existing tables first
3. Run diagnostic script to identify specific issues

### If CRUD Operations Fail:
1. Verify RLS policies are correctly set
2. Check service role key permissions
3. Ensure all required columns exist

### Connection Issues:
1. Verify .env.local contains correct credentials
2. Check Supabase project is active
3. Ensure service role key hasn't expired

---

## 📞 Support Files Created

- `test_supabase_schema.js` - Comprehensive test suite
- `simple_connection_test.js` - Quick connectivity test  
- `full_schema_verify.js` - Complete verification
- `diagnostic_report.js` - Database state analysis

All scripts are ready to run and provide detailed feedback on the database status.

---

**Next Step:** Run the schema setup in Supabase SQL Editor, then verify with the test scripts! 🚀