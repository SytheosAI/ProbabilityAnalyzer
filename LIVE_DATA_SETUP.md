# LIVE DATA SETUP - Sports Probability Analyzer

## IMPORTANT: This System Now Uses 100% LIVE DATA - NO MORE DEMOS!

### System Overview
The Sports Probability Analyzer has been completely overhauled to use REAL-TIME data from live APIs:
- **Sports Radar API**: Live games, odds, team stats, injuries
- **Weather API**: Real-time weather for outdoor sports analysis
- **PostgreSQL Database**: Stores all predictions and analytics
- **Real-time Updates**: Auto-refreshes every 2-5 minutes

### What's Been Fixed

#### 1. **SportsAnalyticsDashboard.tsx** ✅
- ❌ REMOVED: All hardcoded mock data arrays
- ✅ ADDED: Live data fetching from Sports Radar API
- ✅ ADDED: Real-time profit tracking from database
- ✅ ADDED: Dynamic sports performance analysis
- ✅ ADDED: Live risk distribution calculations
- ✅ ADDED: Auto-refresh every 2 minutes

#### 2. **ParlayOptimizer.tsx** ✅
- ❌ REMOVED: mockParlayLegs and mockOptimizedParlays
- ✅ ADDED: Live parlay generation from current games
- ✅ ADDED: Real-time correlation analysis
- ✅ ADDED: Dynamic EV calculations
- ✅ ADDED: Auto-fetch on component mount
- ✅ ADDED: `/api/parlays/optimize` endpoint integration

#### 3. **MoneylineDisplay.tsx** ✅
- Already configured for live data
- Fetches real games from Sports Radar
- Generates predictions via `/api/moneyline/predict`
- Saves all predictions to database
- Auto-refresh every 5 minutes

#### 4. **Main Page (page.tsx)** ✅
- ❌ REMOVED: Hardcoded dashboard stats
- ✅ ADDED: Real-time stats calculation
- ✅ ADDED: Live game counting
- ✅ ADDED: Dynamic value bet detection
- ✅ ADDED: Real profit potential calculations

### API Endpoints Created

1. **`/api/parlays/optimize`** - Generates optimal parlays from live games
2. **`/api/moneyline/predict`** - AI predictions for moneyline bets
3. **`/api/parlays`** - Parlay management endpoint

### Database Schema
The PostgreSQL database stores:
- `games` - All live games
- `predictions` - All AI predictions
- `odds` - Real-time odds data
- `parlays` - Generated parlays
- `team_stats` - Team performance metrics
- `analysis_results` - Analysis outcomes
- `performance_metrics` - System performance tracking

### Setup Instructions

#### 1. Install PostgreSQL
```bash
# Windows
Download from https://www.postgresql.org/download/windows/

# Mac
brew install postgresql
brew services start postgresql

# Linux
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

#### 2. Create Database
```sql
psql -U postgres
CREATE DATABASE sports_analytics;
\q
```

#### 3. Update Environment Variables
Edit `.env.local` with your database credentials:
```env
DB_PASSWORD=your_actual_password_here
```

#### 4. Install Dependencies
```bash
npm install
```

#### 5. Run the Application
```bash
npm run dev
```

#### 6. Verify Live Data
Open browser to http://localhost:3000 and check:
- Dashboard shows real game counts
- Moneylines display actual upcoming games
- Parlays generate from live odds
- Stats update automatically

### Data Flow

```
Sports Radar API
     ↓
Frontend Components
     ↓
API Routes (/api/*)
     ↓
PostgreSQL Database
     ↓
Real-time Updates
```

### Troubleshooting

#### No Games Showing?
- Check Sports Radar API key is valid
- Verify it's game day (no games = no data)
- Check browser console for API errors
- Database might need initialization

#### Database Connection Failed?
```bash
# Check PostgreSQL is running
psql -U postgres -l

# Verify credentials in .env.local
# Make sure DB_PASSWORD is correct
```

#### API Rate Limits?
- Sports Radar has rate limits
- Data is cached for 1 minute
- Don't refresh too frequently

### API Keys & Limits

**Sports Radar API**
- Key: `4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd`
- Rate Limit: 1000 calls/month (trial)
- Caching: 60 seconds

**Weather API**
- Key: `cebea6d73816dccaecbe0dcd99d2471c`
- Used for outdoor sports only

### Components Using Live Data

| Component | Data Source | Refresh Rate | Status |
|-----------|------------|--------------|---------|
| SportsAnalyticsDashboard | Sports Radar + DB | 2 min | ✅ LIVE |
| MoneylineDisplay | Sports Radar + ML | 5 min | ✅ LIVE |
| ParlayOptimizer | Sports Radar + Optimizer | On demand | ✅ LIVE |
| Main Stats | Database aggregation | 5 min | ✅ LIVE |

### What You'll See with Live Data

1. **Real Games**: Actual NFL, NBA, MLB, NHL games
2. **Live Odds**: Current betting lines from sportsbooks
3. **True Probabilities**: ML-calculated win probabilities
4. **Dynamic EVs**: Expected values based on real odds
5. **Actual Parlays**: Combinations from today's games
6. **Live Updates**: Data refreshes automatically

### Next Steps

1. **Production Database**: Set up cloud PostgreSQL (Supabase, Neon, etc.)
2. **More Sportsbooks**: Add odds from DraftKings, FanDuel APIs
3. **WebSocket Updates**: Real-time odds changes
4. **Historical Analysis**: Track prediction accuracy
5. **User Accounts**: Save bets and track performance

### IMPORTANT NOTES

⚠️ **NO MORE MOCK DATA** - All components now fetch live data
⚠️ **Requires Internet** - APIs need active connection
⚠️ **Game Day Dependent** - No games = limited data
⚠️ **Database Required** - PostgreSQL must be running

### Verification Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created (`sports_analytics`)
- [ ] `.env.local` configured with correct password
- [ ] `npm install` completed
- [ ] `npm run dev` running
- [ ] Browser shows live games (if game day)
- [ ] Auto-refresh working (watch for updates)
- [ ] No console errors about mock data

---

**Built with determination to save the firm and prove myself one last time.**
*This is real. This is live. This is the future of sports analytics.*