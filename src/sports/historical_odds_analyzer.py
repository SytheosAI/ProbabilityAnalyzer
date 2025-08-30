import asyncio
import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import logging
from dataclasses import dataclass
import time
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

# Import database connection
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import get_db_manager, async_query, async_update

logger = logging.getLogger(__name__)

@dataclass
class OddsRecord:
    game_id: str
    sport: str
    date: datetime
    team_home: str
    team_away: str
    bookmaker: str
    market_type: str  # moneyline, spread, total
    line_value: Optional[float]
    odds: float
    timestamp: datetime
    closing_odds: Optional[float] = None
    result: Optional[str] = None

@dataclass
class PatternResult:
    pattern_type: str
    confidence: float
    frequency: int
    avg_roi: float
    conditions: Dict[str, Any]
    examples: List[Dict[str, Any]]

class HistoricalOddsAnalyzer:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db = get_db_manager()
        self.odds_api_key = config.get('odds_api_key', '') or os.getenv('ODDS_API_KEY', '')
        self.sports_radar_key = config.get('sports_radar_key', '') or os.getenv('SPORTS_RADAR_API_KEY', '')
        
        # API endpoints
        self.odds_api_base = "https://api.the-odds-api.com/v4"
        self.sports_radar_base = "https://api.sportradar.us"
        
        # Cache settings
        self.cache_duration = config.get('cache_duration', 3600)
        self.max_requests_per_minute = config.get('max_requests_per_minute', 30)
        
        # Initialize database tables
        self._init_database()
        
        # Rate limiting
        self.last_request_time = 0
        self.request_count = 0
        self.rate_limit_window = 60  # seconds
        
    def _init_database(self):
        """Initialize PostgreSQL tables for historical odds storage"""
        try:
            # Check if odds_history table exists, create if not
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'odds_history'
                );
            """
            
            result = self.db.execute_query(check_query)
            
            if not result[0]['exists']:
                # Create odds_history table
                create_odds_table = """
                    CREATE TABLE odds_history (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        game_id VARCHAR(100),
                        sport VARCHAR(50),
                        date TIMESTAMP,
                        team_home VARCHAR(100),
                        team_away VARCHAR(100),
                        bookmaker VARCHAR(50),
                        market_type VARCHAR(50),
                        line_value DECIMAL(10,2),
                        odds DECIMAL(10,2),
                        timestamp TIMESTAMP,
                        closing_odds DECIMAL(10,2),
                        result VARCHAR(50),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_odds_game_id ON odds_history(game_id);
                    CREATE INDEX idx_odds_sport_date ON odds_history(sport, date);
                    CREATE INDEX idx_odds_bookmaker ON odds_history(bookmaker);
                    CREATE INDEX idx_odds_market_type ON odds_history(market_type);
                """
                self.db.execute_update(create_odds_table)
                logger.info("Created odds_history table")
            
            # Check if betting_patterns table exists
            check_patterns = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'betting_patterns'
                );
            """
            
            result = self.db.execute_query(check_patterns)
            
            if not result[0]['exists']:
                # Create betting_patterns table
                create_patterns_table = """
                    CREATE TABLE betting_patterns (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        pattern_name VARCHAR(100),
                        sport VARCHAR(50),
                        pattern_data JSONB,
                        roi DECIMAL(10,4),
                        win_rate DECIMAL(10,4),
                        sample_size INTEGER,
                        confidence DECIMAL(5,4),
                        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                    
                    CREATE INDEX idx_patterns_sport ON betting_patterns(sport);
                    CREATE INDEX idx_patterns_roi ON betting_patterns(roi DESC);
                """
                self.db.execute_update(create_patterns_table)
                logger.info("Created betting_patterns table")
            
            logger.info("Database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def fetch_historical_odds(self, 
                                   sport: str,
                                   start_date: datetime,
                                   end_date: datetime,
                                   markets: List[str] = None) -> List[OddsRecord]:
        """Fetch historical odds data for pattern analysis"""
        if markets is None:
            markets = ['h2h', 'spreads', 'totals']  # moneyline, spreads, totals
        
        all_odds = []
        
        # Fetch from The Odds API
        odds_api_data = await self._fetch_odds_api_historical(sport, start_date, end_date, markets)
        all_odds.extend(odds_api_data)
        
        # Fetch from Sports Radar (if available)
        if self.sports_radar_key:
            sr_data = await self._fetch_sports_radar_historical(sport, start_date, end_date)
            all_odds.extend(sr_data)
        
        # Store in database
        self._store_odds_records(all_odds)
        
        logger.info(f"Fetched {len(all_odds)} historical odds records for {sport}")
        return all_odds
    
    async def _fetch_odds_api_historical(self,
                                        sport: str,
                                        start_date: datetime,
                                        end_date: datetime,
                                        markets: List[str]) -> List[OddsRecord]:
        """Fetch historical data from The Odds API"""
        odds_records = []
        
        if not self.odds_api_key:
            logger.warning("No Odds API key provided")
            return odds_records
        
        try:
            # Convert sport name to Odds API format
            sport_key = self._convert_sport_name(sport)
            
            async with aiohttp.ClientSession() as session:
                # Iterate through date range (API limitation: need to fetch by date)
                current_date = start_date
                while current_date <= end_date:
                    await self._rate_limit_check()
                    
                    # Format date for API
                    date_str = current_date.strftime('%Y-%m-%d')
                    
                    for market in markets:
                        url = f"{self.odds_api_base}/sports/{sport_key}/odds/history"
                        params = {
                            'apiKey': self.odds_api_key,
                            'regions': 'us',
                            'markets': market,
                            'date': date_str,
                            'dateFormat': 'iso'
                        }
                        
                        async with session.get(url, params=params) as response:
                            if response.status == 200:
                                data = await response.json()
                                records = self._parse_odds_api_response(data, sport, market)
                                odds_records.extend(records)
                            else:
                                logger.warning(f"Odds API request failed: {response.status}")
                    
                    current_date += timedelta(days=1)
                    
        except Exception as e:
            logger.error(f"Error fetching Odds API historical data: {e}")
        
        return odds_records
    
    async def _fetch_sports_radar_historical(self,
                                           sport: str,
                                           start_date: datetime,
                                           end_date: datetime) -> List[OddsRecord]:
        """Fetch historical data from Sports Radar"""
        odds_records = []
        
        try:
            # Sports Radar has different endpoints for different sports
            if sport.lower() == 'nfl':
                records = await self._fetch_sr_nfl_historical(start_date, end_date)
            elif sport.lower() == 'nba':
                records = await self._fetch_sr_nba_historical(start_date, end_date)
            elif sport.lower() == 'mlb':
                records = await self._fetch_sr_mlb_historical(start_date, end_date)
            else:
                logger.info(f"Sports Radar historical data not available for {sport}")
                return odds_records
            
            odds_records.extend(records)
            
        except Exception as e:
            logger.error(f"Error fetching Sports Radar historical data: {e}")
        
        return odds_records
    
    def analyze_betting_patterns(self, 
                                sport: str,
                                lookback_days: int = 365) -> List[PatternResult]:
        """Analyze historical odds data for betting patterns"""
        
        # Get historical data from database
        cutoff_date = datetime.now() - timedelta(days=lookback_days)
        
        query = '''
            SELECT * FROM odds_history 
            WHERE sport = %s AND date >= %s
            ORDER BY date DESC
        '''
        
        rows = self.db.execute_query(query, (sport, cutoff_date))
        df = pd.DataFrame(rows)
        
        if df.empty:
            logger.warning(f"No historical data found for {sport}")
            return []
        
        patterns = []
        
        # Pattern 1: Line movement patterns
        line_movement_patterns = self._analyze_line_movement_patterns(df)
        patterns.extend(line_movement_patterns)
        
        # Pattern 2: Bookmaker bias patterns
        bookmaker_bias_patterns = self._analyze_bookmaker_bias(df)
        patterns.extend(bookmaker_bias_patterns)
        
        # Pattern 3: Market inefficiency patterns
        inefficiency_patterns = self._analyze_market_inefficiencies(df)
        patterns.extend(inefficiency_patterns)
        
        # Pattern 4: Seasonal/temporal patterns
        temporal_patterns = self._analyze_temporal_patterns(df)
        patterns.extend(temporal_patterns)
        
        # Pattern 5: Odds distribution patterns
        distribution_patterns = self._analyze_odds_distributions(df)
        patterns.extend(distribution_patterns)
        
        # Store patterns in database
        self._store_patterns(patterns, sport)
        
        logger.info(f"Identified {len(patterns)} betting patterns for {sport}")
        return patterns
    
    def _analyze_line_movement_patterns(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze patterns in line movements"""
        patterns = []
        
        try:
            # Group by game and market type
            for market_type in df['market_type'].unique():
                market_df = df[df['market_type'] == market_type].copy()
                
                if len(market_df) < 10:  # Need minimum data
                    continue
                
                # Analyze opening vs closing line movements
                movements = []
                
                for game_id in market_df['game_id'].unique():
                    game_odds = market_df[market_df['game_id'] == game_id].sort_values('timestamp')
                    
                    if len(game_odds) >= 2:
                        opening_odds = game_odds.iloc[0]['odds']
                        closing_odds = game_odds.iloc[-1].get('closing_odds', game_odds.iloc[-1]['odds'])
                        
                        if opening_odds and closing_odds:
                            movement = (closing_odds - opening_odds) / opening_odds * 100
                            movements.append({
                                'game_id': game_id,
                                'movement': movement,
                                'opening': opening_odds,
                                'closing': closing_odds,
                                'result': game_odds.iloc[0].get('result')
                            })
                
                if movements:
                    movement_df = pd.DataFrame(movements)
                    
                    # Find patterns where large movements indicate value
                    large_movements = movement_df[abs(movement_df['movement']) > 5]  # >5% movement
                    
                    if len(large_movements) >= 5:
                        # Calculate ROI for betting against large movements
                        roi_data = self._calculate_movement_roi(large_movements)
                        
                        if roi_data['roi'] > 0:
                            patterns.append(PatternResult(
                                pattern_type=f"{market_type}_large_movement_fade",
                                confidence=roi_data['confidence'],
                                frequency=len(large_movements),
                                avg_roi=roi_data['roi'],
                                conditions={
                                    'market_type': market_type,
                                    'min_movement': 5,
                                    'fade_direction': True
                                },
                                examples=large_movements.head(5).to_dict('records')
                            ))
        
        except Exception as e:
            logger.error(f"Error analyzing line movement patterns: {e}")
        
        return patterns
    
    def _analyze_bookmaker_bias(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze bookmaker-specific biases"""
        patterns = []
        
        try:
            bookmaker_stats = {}
            
            for bookmaker in df['bookmaker'].unique():
                bm_df = df[df['bookmaker'] == bookmaker].copy()
                
                if len(bm_df) < 20:  # Need minimum sample size
                    continue
                
                # Calculate average margins
                margins = []
                roi_results = []
                
                for market_type in bm_df['market_type'].unique():
                    market_odds = bm_df[bm_df['market_type'] == market_type]
                    
                    if market_type == 'h2h' and len(market_odds) >= 10:
                        # Analyze moneyline margins
                        margin_data = self._calculate_bookmaker_margins(market_odds)
                        margins.append(margin_data)
                        
                        # Calculate ROI for this bookmaker/market combo
                        roi = self._calculate_bookmaker_roi(market_odds)
                        roi_results.append(roi)
                
                if margins and roi_results:
                    avg_margin = np.mean([m['margin'] for m in margins])
                    avg_roi = np.mean([r['roi'] for r in roi_results if r['roi'] is not None])
                    
                    bookmaker_stats[bookmaker] = {
                        'margin': avg_margin,
                        'roi': avg_roi,
                        'sample_size': len(bm_df)
                    }
            
            # Find bookmakers with consistently high margins (avoid)
            # or low margins with positive ROI (target)
            for bookmaker, stats in bookmaker_stats.items():
                if stats['sample_size'] >= 50:
                    if stats['roi'] > 2:  # Positive ROI pattern
                        patterns.append(PatternResult(
                            pattern_type=f"bookmaker_value_{bookmaker.lower()}",
                            confidence=min(0.95, stats['sample_size'] / 100),
                            frequency=stats['sample_size'],
                            avg_roi=stats['roi'],
                            conditions={
                                'bookmaker': bookmaker,
                                'target_for_value': True
                            },
                            examples=[]
                        ))
                    elif stats['margin'] > 8:  # High margin pattern
                        patterns.append(PatternResult(
                            pattern_type=f"bookmaker_high_margin_{bookmaker.lower()}",
                            confidence=min(0.90, stats['sample_size'] / 100),
                            frequency=stats['sample_size'],
                            avg_roi=-stats['margin'],
                            conditions={
                                'bookmaker': bookmaker,
                                'avoid_high_margin': True
                            },
                            examples=[]
                        ))
        
        except Exception as e:
            logger.error(f"Error analyzing bookmaker bias: {e}")
        
        return patterns
    
    def _analyze_market_inefficiencies(self, df: pd.DataFrame) -> List[PatternResult]:
        """Identify market inefficiency patterns"""
        patterns = []
        
        try:
            # Group by game to find odds discrepancies
            game_groups = df.groupby('game_id')
            
            inefficiencies = []
            
            for game_id, game_df in game_groups:
                if len(game_df) < 3:  # Need multiple bookmakers
                    continue
                
                for market_type in game_df['market_type'].unique():
                    market_odds = game_df[game_df['market_type'] == market_type]
                    
                    if len(market_odds) >= 3:
                        # Find odds spread
                        odds_values = market_odds['odds'].values
                        odds_spread = np.max(odds_values) - np.min(odds_values)
                        
                        # Convert odds to implied probabilities
                        if market_type == 'h2h':
                            implied_probs = [self._american_to_probability(odds) for odds in odds_values]
                        else:
                            implied_probs = [self._decimal_to_probability(odds) for odds in odds_values]
                        
                        prob_spread = np.max(implied_probs) - np.min(implied_probs)
                        
                        # Significant spread indicates potential inefficiency
                        if prob_spread > 0.05:  # 5% probability difference
                            inefficiencies.append({
                                'game_id': game_id,
                                'market_type': market_type,
                                'prob_spread': prob_spread,
                                'odds_spread': odds_spread,
                                'bookmakers': market_odds['bookmaker'].tolist(),
                                'odds': odds_values.tolist(),
                                'best_odds': np.max(odds_values),
                                'worst_odds': np.min(odds_values)
                            })
            
            if inefficiencies:
                ineff_df = pd.DataFrame(inefficiencies)
                
                # Find patterns in large inefficiencies
                large_ineff = ineff_df[ineff_df['prob_spread'] > 0.08]  # 8%+ difference
                
                if len(large_ineff) >= 5:
                    avg_roi = np.mean(large_ineff['prob_spread']) * 100  # Rough ROI estimate
                    
                    patterns.append(PatternResult(
                        pattern_type="market_inefficiency_arbitrage",
                        confidence=0.85,
                        frequency=len(large_ineff),
                        avg_roi=avg_roi,
                        conditions={
                            'min_prob_spread': 0.08,
                            'min_bookmakers': 3
                        },
                        examples=large_ineff.head(5).to_dict('records')
                    ))
        
        except Exception as e:
            logger.error(f"Error analyzing market inefficiencies: {e}")
        
        return patterns
    
    def _analyze_temporal_patterns(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze time-based betting patterns"""
        patterns = []
        
        try:
            df['date'] = pd.to_datetime(df['date'])
            df['hour'] = df['date'].dt.hour
            df['day_of_week'] = df['date'].dt.dayofweek
            df['month'] = df['date'].dt.month
            
            # Day of week patterns
            dow_patterns = self._analyze_day_of_week_patterns(df)
            patterns.extend(dow_patterns)
            
            # Time of day patterns
            time_patterns = self._analyze_time_of_day_patterns(df)
            patterns.extend(time_patterns)
            
            # Seasonal patterns
            seasonal_patterns = self._analyze_seasonal_patterns(df)
            patterns.extend(seasonal_patterns)
        
        except Exception as e:
            logger.error(f"Error analyzing temporal patterns: {e}")
        
        return patterns
    
    def _analyze_odds_distributions(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze odds distribution patterns"""
        patterns = []
        
        try:
            for market_type in df['market_type'].unique():
                market_df = df[df['market_type'] == market_type]
                
                if len(market_df) < 50:
                    continue
                
                odds_values = market_df['odds'].values
                
                # Analyze distribution characteristics
                distribution_stats = {
                    'mean': np.mean(odds_values),
                    'median': np.median(odds_values),
                    'std': np.std(odds_values),
                    'skewness': stats.skew(odds_values),
                    'kurtosis': stats.kurtosis(odds_values)
                }
                
                # Find outliers (potential value bets)
                z_scores = np.abs(stats.zscore(odds_values))
                outliers = odds_values[z_scores > 2]  # 2 standard deviations
                
                if len(outliers) >= 10:
                    # Calculate ROI for betting outliers
                    outlier_roi = self._calculate_outlier_roi(market_df, outliers)
                    
                    if outlier_roi > 0:
                        patterns.append(PatternResult(
                            pattern_type=f"{market_type}_odds_outlier",
                            confidence=0.75,
                            frequency=len(outliers),
                            avg_roi=outlier_roi,
                            conditions={
                                'market_type': market_type,
                                'min_z_score': 2,
                                'distribution_stats': distribution_stats
                            },
                            examples=[]
                        ))
        
        except Exception as e:
            logger.error(f"Error analyzing odds distributions: {e}")
        
        return patterns
    
    def get_pattern_recommendations(self, 
                                  sport: str,
                                  current_games: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get betting recommendations based on discovered patterns"""
        
        # Load patterns from database
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT * FROM betting_patterns 
            WHERE sport = ? AND roi > 0
            ORDER BY roi DESC
        '''
        
        patterns_df = pd.read_sql_query(query, conn, params=(sport,))
        conn.close()
        
        recommendations = []
        
        for _, pattern in patterns_df.iterrows():
            pattern_data = json.loads(pattern['pattern_data'])
            
            # Apply pattern to current games
            for game in current_games:
                recommendation = self._apply_pattern_to_game(pattern_data, game)
                if recommendation:
                    recommendations.append({
                        'game': game,
                        'pattern': pattern['pattern_name'],
                        'expected_roi': pattern['roi'],
                        'confidence': pattern['win_rate'],
                        'recommendation': recommendation
                    })
        
        return recommendations
    
    def _rate_limit_check(self):
        """Implement rate limiting for API calls"""
        current_time = time.time()
        
        # Reset counter if window has passed
        if current_time - self.last_request_time > self.rate_limit_window:
            self.request_count = 0
            self.last_request_time = current_time
        
        # Check if we need to wait
        if self.request_count >= self.max_requests_per_minute:
            sleep_time = self.rate_limit_window - (current_time - self.last_request_time)
            if sleep_time > 0:
                await asyncio.sleep(sleep_time)
                self.request_count = 0
                self.last_request_time = time.time()
        
        self.request_count += 1
    
    def _store_odds_records(self, odds_records: List[OddsRecord]):
        """Store odds records in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for record in odds_records:
                cursor.execute('''
                    INSERT INTO odds_history 
                    (game_id, sport, date, team_home, team_away, bookmaker, 
                     market_type, line_value, odds, timestamp, closing_odds, result)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    record.game_id,
                    record.sport,
                    record.date.isoformat(),
                    record.team_home,
                    record.team_away,
                    record.bookmaker,
                    record.market_type,
                    record.line_value,
                    record.odds,
                    record.timestamp.isoformat(),
                    record.closing_odds,
                    record.result
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing odds records: {e}")
    
    def _store_patterns(self, patterns: List[PatternResult], sport: str):
        """Store discovered patterns in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for pattern in patterns:
                pattern_data = {
                    'pattern_type': pattern.pattern_type,
                    'conditions': pattern.conditions,
                    'examples': pattern.examples
                }
                
                cursor.execute('''
                    INSERT OR REPLACE INTO betting_patterns
                    (pattern_name, sport, pattern_data, roi, win_rate, sample_size)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    pattern.pattern_type,
                    sport,
                    json.dumps(pattern_data),
                    pattern.avg_roi,
                    pattern.confidence,
                    pattern.frequency
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing patterns: {e}")
    
    # Helper methods for calculations
    def _convert_sport_name(self, sport: str) -> str:
        """Convert sport name to API format"""
        sport_mapping = {
            'nfl': 'americanfootball_nfl',
            'nba': 'basketball_nba',
            'mlb': 'baseball_mlb',
            'nhl': 'icehockey_nhl',
            'ncaaf': 'americanfootball_ncaaf',
            'ncaab': 'basketball_ncaab'
        }
        return sport_mapping.get(sport.lower(), sport.lower())
    
    def _american_to_probability(self, american_odds: float) -> float:
        """Convert American odds to implied probability"""
        if american_odds > 0:
            return 100 / (american_odds + 100)
        else:
            return abs(american_odds) / (abs(american_odds) + 100)
    
    def _decimal_to_probability(self, decimal_odds: float) -> float:
        """Convert decimal odds to implied probability"""
        return 1 / decimal_odds if decimal_odds > 0 else 0
    
    def _parse_odds_api_response(self, data: List[Dict], sport: str, market: str) -> List[OddsRecord]:
        """Parse Odds API response into OddsRecord objects"""
        records = []
        
        for game in data:
            game_id = game.get('id', '')
            date = datetime.fromisoformat(game.get('commence_time', '').replace('Z', '+00:00'))
            home_team = game.get('home_team', '')
            away_team = game.get('away_team', '')
            
            for bookmaker in game.get('bookmakers', []):
                bookmaker_name = bookmaker.get('key', '')
                
                for market_data in bookmaker.get('markets', []):
                    if market_data.get('key') == market:
                        for outcome in market_data.get('outcomes', []):
                            records.append(OddsRecord(
                                game_id=game_id,
                                sport=sport,
                                date=date,
                                team_home=home_team,
                                team_away=away_team,
                                bookmaker=bookmaker_name,
                                market_type=market,
                                line_value=outcome.get('point'),
                                odds=outcome.get('price', 0),
                                timestamp=datetime.now()
                            ))
        
        return records
    
    def _calculate_movement_roi(self, movements_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate ROI for line movement patterns"""
        # Simplified calculation - would need actual results for real ROI
        avg_movement = movements_df['movement'].mean()
        confidence = min(0.95, len(movements_df) / 20)
        
        # Rough estimate: larger movements against public often profitable
        estimated_roi = abs(avg_movement) * 0.1  # Simplified estimate
        
        return {
            'roi': estimated_roi,
            'confidence': confidence,
            'avg_movement': avg_movement
        }
    
    def _calculate_bookmaker_margins(self, odds_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate bookmaker margins"""
        # Get pairs of odds for moneyline markets
        margins = []
        
        games = odds_df['game_id'].unique()
        for game in games[:10]:  # Sample calculation
            game_odds = odds_df[odds_df['game_id'] == game]
            if len(game_odds) >= 2:
                probs = [self._american_to_probability(odds) for odds in game_odds['odds'].values[:2]]
                if len(probs) == 2:
                    margin = sum(probs) - 1
                    margins.append(margin * 100)  # Convert to percentage
        
        return {
            'margin': np.mean(margins) if margins else 0,
            'sample_size': len(margins)
        }
    
    def _calculate_bookmaker_roi(self, odds_df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate ROI for betting with specific bookmaker"""
        # This would need actual results data
        # For now, return placeholder based on margin analysis
        margin_data = self._calculate_bookmaker_margins(odds_df)
        estimated_roi = max(0, 5 - margin_data['margin'])  # Lower margin = higher potential ROI
        
        return {
            'roi': estimated_roi,
            'confidence': 0.5,  # Low confidence without results
            'sample_size': len(odds_df)
        }
    
    def _calculate_outlier_roi(self, market_df: pd.DataFrame, outliers: np.ndarray) -> float:
        """Calculate ROI for betting odds outliers"""
        # Simplified calculation - outliers often indicate value
        return len(outliers) / len(market_df) * 10  # Rough estimate
    
    async def _fetch_sr_nfl_historical(self, start_date: datetime, end_date: datetime) -> List[OddsRecord]:
        """Fetch NFL historical data from Sports Radar"""
        # Implementation would depend on Sports Radar API structure
        return []
    
    async def _fetch_sr_nba_historical(self, start_date: datetime, end_date: datetime) -> List[OddsRecord]:
        """Fetch NBA historical data from Sports Radar"""
        return []
    
    async def _fetch_sr_mlb_historical(self, start_date: datetime, end_date: datetime) -> List[OddsRecord]:
        """Fetch MLB historical data from Sports Radar"""
        return []
    
    def _analyze_day_of_week_patterns(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze day of week patterns"""
        # Implementation for day-of-week analysis
        return []
    
    def _analyze_time_of_day_patterns(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze time of day patterns"""
        return []
    
    def _analyze_seasonal_patterns(self, df: pd.DataFrame) -> List[PatternResult]:
        """Analyze seasonal patterns"""
        return []
    
    def _apply_pattern_to_game(self, pattern_data: Dict, game: Dict) -> Optional[Dict]:
        """Apply discovered pattern to current game"""
        # Implementation would match pattern conditions to current game
        return None