import asyncio
import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
import sqlite3
import json
import logging
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import time
from scipy import stats
from scipy.signal import find_peaks
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class LineMovement:
    game_id: str
    sport: str
    bookmaker: str
    market_type: str
    outcome: str
    timestamp: datetime
    odds_value: float
    line_value: Optional[float]
    implied_probability: float
    volume_indicator: Optional[float]
    
@dataclass
class MovementAnalysis:
    game_id: str
    sport: str
    market_type: str
    outcome: str
    start_odds: float
    current_odds: float
    movement_percentage: float
    movement_direction: str  # 'up', 'down', 'stable'
    velocity: float  # rate of change
    acceleration: float  # change in velocity
    volume_pattern: str  # 'heavy', 'moderate', 'light'
    sharp_money_indicator: float  # 0-1 scale
    public_money_indicator: float  # 0-1 scale
    reverse_line_movement: bool
    steam_move: bool
    closing_line_value: Optional[float]
    
@dataclass
class TrendSignal:
    signal_type: str  # 'sharp_money', 'steam_move', 'reverse_line_movement', 'closing_line_value'
    strength: float  # 0-1 scale
    confidence: float  # 0-1 scale
    expected_value: float
    recommended_action: str  # 'bet', 'avoid', 'fade'
    reasoning: str

class LineMovementTracker:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.db_path = config.get('db_path', './data/line_movements.db')
        self.odds_api_key = config.get('odds_api_key', '')
        
        # Tracking settings
        self.tracking_interval = config.get('tracking_interval', 60)  # seconds
        self.max_tracking_duration = config.get('max_tracking_duration', 24)  # hours
        
        # Movement thresholds
        self.significant_movement_threshold = config.get('significant_movement', 5.0)  # 5%
        self.steam_move_threshold = config.get('steam_move_threshold', 10.0)  # 10%
        self.sharp_money_threshold = config.get('sharp_money_threshold', 0.7)
        
        # Data storage
        self.movement_history = defaultdict(list)  # game_id -> list of movements
        self.active_trackers = {}  # game_id -> tracking task
        
        # Initialize database
        self._init_database()
        
        # Analysis components
        self.sharp_money_detector = SharpMoneyDetector(config)
        self.steam_detector = SteamMoveDetector(config)
        self.clv_calculator = ClosingLineValueCalculator(config)
        
    def _init_database(self):
        """Initialize SQLite database for line movement storage"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Create line movements table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS line_movements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id TEXT,
                    sport TEXT,
                    bookmaker TEXT,
                    market_type TEXT,
                    outcome TEXT,
                    timestamp TEXT,
                    odds_value REAL,
                    line_value REAL,
                    implied_probability REAL,
                    volume_indicator REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create movement analysis table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS movement_analysis (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id TEXT,
                    sport TEXT,
                    market_type TEXT,
                    outcome TEXT,
                    analysis_data TEXT,
                    signals_data TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Create indexes
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_movements_game_time ON line_movements(game_id, timestamp)')
            cursor.execute('CREATE INDEX IF NOT EXISTS idx_movements_sport ON line_movements(sport, timestamp)')
            
            conn.commit()
            conn.close()
            logger.info("Line movement database initialized successfully")
            
        except Exception as e:
            logger.error(f"Database initialization failed: {e}")
            raise
    
    async def start_tracking_game(self, 
                                 game_id: str,
                                 sport: str,
                                 duration_hours: float = 24) -> str:
        """Start tracking line movements for a specific game"""
        
        if game_id in self.active_trackers:
            logger.warning(f"Already tracking game {game_id}")
            return f"Already tracking {game_id}"
        
        # Create tracking task
        tracking_task = asyncio.create_task(
            self._track_game_movements(game_id, sport, duration_hours)
        )
        
        self.active_trackers[game_id] = tracking_task
        
        logger.info(f"Started tracking line movements for {game_id}")
        return f"Started tracking {game_id} for {duration_hours} hours"
    
    async def _track_game_movements(self, 
                                   game_id: str,
                                   sport: str,
                                   duration_hours: float):
        """Track line movements for a specific game"""
        
        start_time = datetime.now()
        end_time = start_time + timedelta(hours=duration_hours)
        
        try:
            while datetime.now() < end_time:
                # Fetch current odds
                current_movements = await self._fetch_current_movements(game_id, sport)
                
                # Store movements
                if current_movements:
                    self._store_movements(current_movements)
                    
                    # Add to in-memory tracking
                    self.movement_history[game_id].extend(current_movements)
                    
                    # Analyze movements if we have sufficient data
                    if len(self.movement_history[game_id]) >= 5:
                        analysis = await self._analyze_movements(game_id)
                        if analysis:
                            self._store_analysis(game_id, analysis)
                
                # Wait for next check
                await asyncio.sleep(self.tracking_interval)
                
        except asyncio.CancelledError:
            logger.info(f"Tracking cancelled for game {game_id}")
        except Exception as e:
            logger.error(f"Error tracking game {game_id}: {e}")
        finally:
            # Clean up
            if game_id in self.active_trackers:
                del self.active_trackers[game_id]
    
    async def _fetch_current_movements(self, 
                                      game_id: str,
                                      sport: str) -> List[LineMovement]:
        """Fetch current odds for movement tracking"""
        movements = []
        
        if not self.odds_api_key:
            return movements
        
        try:
            sport_key = self._convert_sport_name(sport)
            
            async with aiohttp.ClientSession() as session:
                # Fetch odds from multiple markets
                markets = ['h2h', 'spreads', 'totals']
                
                for market in markets:
                    url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
                    params = {
                        'apiKey': self.odds_api_key,
                        'regions': 'us',
                        'markets': market,
                        'dateFormat': 'iso'
                    }
                    
                    async with session.get(url, params=params, timeout=30) as response:
                        if response.status == 200:
                            data = await response.json()
                            game_movements = self._parse_movements(data, game_id, sport, market)
                            movements.extend(game_movements)
                        else:
                            logger.warning(f"Failed to fetch odds for {market}: {response.status}")
        
        except Exception as e:
            logger.error(f"Error fetching current movements: {e}")
        
        return movements
    
    def _parse_movements(self, 
                        data: List[Dict],
                        target_game_id: str,
                        sport: str,
                        market: str) -> List[LineMovement]:
        """Parse API response for specific game movements"""
        movements = []
        
        for game in data:
            game_id = game.get('id', '')
            
            # Only track the specific game we're interested in
            if game_id != target_game_id:
                continue
            
            for bookmaker in game.get('bookmakers', []):
                bookmaker_name = bookmaker.get('key', '')
                
                for market_data in bookmaker.get('markets', []):
                    if market_data.get('key') == market:
                        for outcome in market_data.get('outcomes', []):
                            odds_value = outcome.get('price', 0)
                            line_value = outcome.get('point', None)
                            outcome_name = outcome.get('name', '')
                            
                            # Calculate implied probability
                            if market == 'h2h':
                                implied_prob = self._american_to_probability(odds_value)
                            else:
                                implied_prob = self._american_to_probability(odds_value)
                            
                            movement = LineMovement(
                                game_id=game_id,
                                sport=sport,
                                bookmaker=bookmaker_name,
                                market_type=market,
                                outcome=outcome_name,
                                timestamp=datetime.now(),
                                odds_value=odds_value,
                                line_value=line_value,
                                implied_probability=implied_prob,
                                volume_indicator=None  # Would need additional data source
                            )
                            movements.append(movement)
        
        return movements
    
    async def _analyze_movements(self, game_id: str) -> List[MovementAnalysis]:
        """Analyze line movements for patterns and signals"""
        if game_id not in self.movement_history:
            return []
        
        movements = self.movement_history[game_id]
        if len(movements) < 5:
            return []
        
        # Group movements by market and outcome
        grouped_movements = defaultdict(list)
        for movement in movements:
            key = f"{movement.market_type}_{movement.outcome}"
            grouped_movements[key].append(movement)
        
        analyses = []
        
        for key, movement_list in grouped_movements.items():
            if len(movement_list) < 3:
                continue
            
            # Sort by timestamp
            movement_list.sort(key=lambda x: x.timestamp)
            
            market_type, outcome = key.split('_', 1)
            
            # Calculate movement statistics
            start_odds = movement_list[0].odds_value
            current_odds = movement_list[-1].odds_value
            
            if start_odds == 0:
                continue
            
            movement_pct = ((current_odds - start_odds) / start_odds) * 100
            
            # Determine movement direction
            if abs(movement_pct) < 1:
                direction = 'stable'
            elif movement_pct > 0:
                direction = 'up'
            else:
                direction = 'down'
            
            # Calculate velocity and acceleration
            velocity = self._calculate_velocity(movement_list)
            acceleration = self._calculate_acceleration(movement_list)
            
            # Detect patterns
            sharp_money_score = await self.sharp_money_detector.analyze(movement_list)
            steam_move = abs(movement_pct) > self.steam_move_threshold
            reverse_line = self._detect_reverse_line_movement(movement_list)
            
            analysis = MovementAnalysis(
                game_id=game_id,
                sport=movement_list[0].sport,
                market_type=market_type,
                outcome=outcome,
                start_odds=start_odds,
                current_odds=current_odds,
                movement_percentage=movement_pct,
                movement_direction=direction,
                velocity=velocity,
                acceleration=acceleration,
                volume_pattern='moderate',  # Would need volume data
                sharp_money_indicator=sharp_money_score,
                public_money_indicator=1 - sharp_money_score,  # Inverse relationship
                reverse_line_movement=reverse_line,
                steam_move=steam_move,
                closing_line_value=None  # Will be updated when game closes
            )
            
            analyses.append(analysis)
        
        return analyses
    
    def generate_trend_signals(self, 
                             analyses: List[MovementAnalysis]) -> List[TrendSignal]:
        """Generate betting signals from movement analysis"""
        signals = []
        
        for analysis in analyses:
            # Sharp money signal
            if analysis.sharp_money_indicator > self.sharp_money_threshold:
                signal = TrendSignal(
                    signal_type='sharp_money',
                    strength=analysis.sharp_money_indicator,
                    confidence=min(0.95, analysis.sharp_money_indicator * 1.2),
                    expected_value=analysis.sharp_money_indicator * 5,  # Rough estimate
                    recommended_action='bet',
                    reasoning=f"Sharp money moving on {analysis.outcome} with {analysis.sharp_money_indicator:.1%} confidence"
                )
                signals.append(signal)
            
            # Steam move signal
            if analysis.steam_move and abs(analysis.movement_percentage) > 15:
                signal = TrendSignal(
                    signal_type='steam_move',
                    strength=min(1.0, abs(analysis.movement_percentage) / 20),
                    confidence=0.8,
                    expected_value=abs(analysis.movement_percentage) * 0.3,
                    recommended_action='bet',
                    reasoning=f"Steam move detected: {analysis.movement_percentage:.1f}% movement"
                )
                signals.append(signal)
            
            # Reverse line movement signal
            if analysis.reverse_line_movement:
                signal = TrendSignal(
                    signal_type='reverse_line_movement',
                    strength=0.8,
                    confidence=0.85,
                    expected_value=3.5,
                    recommended_action='bet',
                    reasoning=f"Reverse line movement detected on {analysis.outcome}"
                )
                signals.append(signal)
            
            # Avoid signals for public money
            if analysis.public_money_indicator > 0.8 and abs(analysis.movement_percentage) > 5:
                signal = TrendSignal(
                    signal_type='public_money',
                    strength=analysis.public_money_indicator,
                    confidence=0.7,
                    expected_value=-abs(analysis.movement_percentage) * 0.2,
                    recommended_action='fade',
                    reasoning=f"Heavy public money on {analysis.outcome}, consider fading"
                )
                signals.append(signal)
        
        return signals
    
    def get_movement_summary(self, 
                           game_id: str,
                           lookback_hours: int = 24) -> Dict[str, Any]:
        """Get movement summary for a specific game"""
        
        if game_id not in self.movement_history:
            return {'error': f'No movement data for game {game_id}'}
        
        movements = self.movement_history[game_id]
        cutoff_time = datetime.now() - timedelta(hours=lookback_hours)
        
        # Filter recent movements
        recent_movements = [
            m for m in movements 
            if m.timestamp > cutoff_time
        ]
        
        if not recent_movements:
            return {'error': 'No recent movement data'}
        
        # Group by market and outcome
        movement_groups = defaultdict(list)
        for movement in recent_movements:
            key = f"{movement.market_type}_{movement.outcome}"
            movement_groups[key].append(movement)
        
        summary = {
            'game_id': game_id,
            'total_movements': len(recent_movements),
            'tracking_duration_hours': lookback_hours,
            'markets_tracked': len(movement_groups),
            'movements_by_market': {}
        }
        
        for key, movement_list in movement_groups.items():
            movement_list.sort(key=lambda x: x.timestamp)
            
            if len(movement_list) >= 2:
                start_odds = movement_list[0].odds_value
                current_odds = movement_list[-1].odds_value
                
                movement_pct = ((current_odds - start_odds) / start_odds * 100) if start_odds != 0 else 0
                
                summary['movements_by_market'][key] = {
                    'start_odds': start_odds,
                    'current_odds': current_odds,
                    'movement_percentage': movement_pct,
                    'data_points': len(movement_list),
                    'bookmakers': list(set(m.bookmaker for m in movement_list))
                }
        
        return summary
    
    def create_movement_visualization(self, 
                                    game_id: str,
                                    market_type: str = 'h2h') -> go.Figure:
        """Create visualization of line movements"""
        
        if game_id not in self.movement_history:
            fig = go.Figure()
            fig.add_annotation(text="No movement data available", 
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            return fig
        
        movements = [
            m for m in self.movement_history[game_id]
            if m.market_type == market_type
        ]
        
        if not movements:
            fig = go.Figure()
            fig.add_annotation(text=f"No data for market: {market_type}", 
                             xref="paper", yref="paper",
                             x=0.5, y=0.5, showarrow=False)
            return fig
        
        # Group by outcome
        outcome_groups = defaultdict(list)
        for movement in movements:
            outcome_groups[movement.outcome].append(movement)
        
        fig = go.Figure()
        
        colors = ['blue', 'red', 'green', 'orange', 'purple']
        
        for i, (outcome, movement_list) in enumerate(outcome_groups.items()):
            movement_list.sort(key=lambda x: x.timestamp)
            
            timestamps = [m.timestamp for m in movement_list]
            odds_values = [m.odds_value for m in movement_list]
            
            color = colors[i % len(colors)]
            
            fig.add_trace(go.Scatter(
                x=timestamps,
                y=odds_values,
                mode='lines+markers',
                name=outcome,
                line=dict(color=color, width=2),
                marker=dict(size=6, color=color),
                hovertemplate='<b>%{fullData.name}</b><br>' +
                             'Time: %{x}<br>' +
                             'Odds: %{y}<br>' +
                             '<extra></extra>'
            ))
        
        fig.update_layout(
            title=f'Line Movement Tracking - Game {game_id} ({market_type.upper()})',
            xaxis_title='Time',
            yaxis_title='Odds',
            hovermode='x unified',
            showlegend=True,
            height=500
        )
        
        return fig
    
    def _calculate_velocity(self, movements: List[LineMovement]) -> float:
        """Calculate the velocity of line movement"""
        if len(movements) < 2:
            return 0
        
        movements.sort(key=lambda x: x.timestamp)
        
        velocities = []
        for i in range(1, len(movements)):
            current = movements[i]
            previous = movements[i-1]
            
            time_diff = (current.timestamp - previous.timestamp).total_seconds()
            if time_diff > 0:
                odds_change = current.odds_value - previous.odds_value
                velocity = odds_change / time_diff  # odds change per second
                velocities.append(velocity)
        
        return np.mean(velocities) if velocities else 0
    
    def _calculate_acceleration(self, movements: List[LineMovement]) -> float:
        """Calculate the acceleration of line movement"""
        if len(movements) < 3:
            return 0
        
        movements.sort(key=lambda x: x.timestamp)
        
        # Calculate velocities first
        velocities = []
        for i in range(1, len(movements)):
            current = movements[i]
            previous = movements[i-1]
            
            time_diff = (current.timestamp - previous.timestamp).total_seconds()
            if time_diff > 0:
                odds_change = current.odds_value - previous.odds_value
                velocity = odds_change / time_diff
                velocities.append((velocity, current.timestamp))
        
        if len(velocities) < 2:
            return 0
        
        # Calculate acceleration
        accelerations = []
        for i in range(1, len(velocities)):
            current_vel, current_time = velocities[i]
            previous_vel, previous_time = velocities[i-1]
            
            time_diff = (current_time - previous_time).total_seconds()
            if time_diff > 0:
                vel_change = current_vel - previous_vel
                acceleration = vel_change / time_diff
                accelerations.append(acceleration)
        
        return np.mean(accelerations) if accelerations else 0
    
    def _detect_reverse_line_movement(self, movements: List[LineMovement]) -> bool:
        """Detect reverse line movement patterns"""
        if len(movements) < 4:
            return False
        
        movements.sort(key=lambda x: x.timestamp)
        
        # Look for pattern where line moves against expected public money
        # This is a simplified implementation - would need actual betting percentage data
        
        odds_changes = []
        for i in range(1, len(movements)):
            change = movements[i].odds_value - movements[i-1].odds_value
            odds_changes.append(change)
        
        # Check if there's a consistent movement in one direction
        # followed by movement in the opposite direction
        if len(odds_changes) >= 4:
            first_half = odds_changes[:len(odds_changes)//2]
            second_half = odds_changes[len(odds_changes)//2:]
            
            first_trend = np.mean(first_half)
            second_trend = np.mean(second_half)
            
            # Reverse if trends are opposite and significant
            if abs(first_trend) > 1 and abs(second_trend) > 1:
                if (first_trend > 0 and second_trend < 0) or (first_trend < 0 and second_trend > 0):
                    return True
        
        return False
    
    def _american_to_probability(self, american_odds: float) -> float:
        """Convert American odds to implied probability"""
        if american_odds > 0:
            return 100 / (american_odds + 100)
        else:
            return abs(american_odds) / (abs(american_odds) + 100)
    
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
    
    def _store_movements(self, movements: List[LineMovement]):
        """Store movements in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for movement in movements:
                cursor.execute('''
                    INSERT INTO line_movements
                    (game_id, sport, bookmaker, market_type, outcome, 
                     timestamp, odds_value, line_value, implied_probability, volume_indicator)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    movement.game_id,
                    movement.sport,
                    movement.bookmaker,
                    movement.market_type,
                    movement.outcome,
                    movement.timestamp.isoformat(),
                    movement.odds_value,
                    movement.line_value,
                    movement.implied_probability,
                    movement.volume_indicator
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing movements: {e}")
    
    def _store_analysis(self, game_id: str, analyses: List[MovementAnalysis]):
        """Store movement analysis in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            for analysis in analyses:
                analysis_data = asdict(analysis)
                
                # Generate signals
                signals = self.generate_trend_signals([analysis])
                signals_data = [asdict(signal) for signal in signals]
                
                cursor.execute('''
                    INSERT OR REPLACE INTO movement_analysis
                    (game_id, sport, market_type, outcome, analysis_data, signals_data)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    game_id,
                    analysis.sport,
                    analysis.market_type,
                    analysis.outcome,
                    json.dumps(analysis_data, default=str),
                    json.dumps(signals_data, default=str)
                ))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logger.error(f"Error storing analysis: {e}")
    
    def stop_tracking(self, game_id: str) -> str:
        """Stop tracking a specific game"""
        if game_id in self.active_trackers:
            self.active_trackers[game_id].cancel()
            del self.active_trackers[game_id]
            return f"Stopped tracking {game_id}"
        else:
            return f"Game {game_id} is not being tracked"
    
    def get_active_tracking(self) -> List[str]:
        """Get list of games currently being tracked"""
        return list(self.active_trackers.keys())

# Additional helper classes

class SharpMoneyDetector:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    async def analyze(self, movements: List[LineMovement]) -> float:
        """Analyze movements for sharp money indicators"""
        # Simplified sharp money detection
        # Would need actual betting volume and percentage data for accuracy
        
        if len(movements) < 3:
            return 0.0
        
        movements.sort(key=lambda x: x.timestamp)
        
        # Look for consistent movement in one direction with acceleration
        odds_changes = []
        for i in range(1, len(movements)):
            change = movements[i].odds_value - movements[i-1].odds_value
            odds_changes.append(change)
        
        if not odds_changes:
            return 0.0
        
        # Check for consistency in direction
        positive_changes = sum(1 for change in odds_changes if change > 0)
        negative_changes = sum(1 for change in odds_changes if change < 0)
        
        consistency = max(positive_changes, negative_changes) / len(odds_changes)
        
        # Check for magnitude (sharp money usually moves lines significantly)
        total_movement = abs(sum(odds_changes))
        magnitude_score = min(1.0, total_movement / 50)  # Normalize to 0-1
        
        # Combine factors
        sharp_score = (consistency * 0.6 + magnitude_score * 0.4)
        
        return min(1.0, sharp_score)

class SteamMoveDetector:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.steam_threshold = config.get('steam_move_threshold', 10.0)
    
    def detect(self, movements: List[LineMovement]) -> bool:
        """Detect steam moves (rapid, significant line movements)"""
        if len(movements) < 2:
            return False
        
        movements.sort(key=lambda x: x.timestamp)
        
        # Look for rapid changes within a short time window
        for i in range(1, len(movements)):
            current = movements[i]
            previous = movements[i-1]
            
            time_diff_minutes = (current.timestamp - previous.timestamp).total_seconds() / 60
            
            if time_diff_minutes <= 15:  # Within 15 minutes
                if previous.odds_value != 0:
                    movement_pct = abs((current.odds_value - previous.odds_value) / previous.odds_value * 100)
                    
                    if movement_pct >= self.steam_threshold:
                        return True
        
        return False

class ClosingLineValueCalculator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    def calculate_clv(self, 
                     bet_odds: float,
                     closing_odds: float,
                     market_type: str = 'h2h') -> float:
        """Calculate Closing Line Value"""
        if closing_odds == 0 or bet_odds == 0:
            return 0.0
        
        if market_type == 'h2h':
            bet_prob = self._american_to_probability(bet_odds)
            closing_prob = self._american_to_probability(closing_odds)
        else:
            bet_prob = self._american_to_probability(bet_odds)
            closing_prob = self._american_to_probability(closing_odds)
        
        # CLV is the difference in implied probability
        clv = closing_prob - bet_prob
        
        return clv * 100  # Return as percentage
    
    def _american_to_probability(self, american_odds: float) -> float:
        """Convert American odds to implied probability"""
        if american_odds > 0:
            return 100 / (american_odds + 100)
        else:
            return abs(american_odds) / (abs(american_odds) + 100)