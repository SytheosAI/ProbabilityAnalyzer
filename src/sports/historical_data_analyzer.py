"""
Historical Data Analysis Module for Sports Statistics
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import json
import logging
from pathlib import Path
from dataclasses import dataclass, asdict
import pickle

logger = logging.getLogger(__name__)

@dataclass
class PerformanceBaseline:
    """Player/Team performance baseline"""
    entity_id: str
    entity_type: str  # 'player' or 'team'
    sport: str
    season: str
    games_played: int
    statistics: Dict[str, float]
    percentiles: Dict[str, float]
    trends: Dict[str, List[float]]
    consistency_scores: Dict[str, float]
    clutch_metrics: Dict[str, float]
    situational_splits: Dict[str, Any]

@dataclass
class PerformanceTrend:
    """Performance trend analysis"""
    entity_id: str
    stat_name: str
    period: str  # 'last_5', 'last_10', 'last_month', 'season'
    trend_direction: str  # 'up', 'down', 'stable'
    trend_strength: float  # 0-1
    values: List[float]
    dates: List[datetime]
    moving_average: List[float]
    projection: float
    confidence_interval: Tuple[float, float]

class HistoricalDataAnalyzer:
    """Analyze historical performance data for predictions"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.data_path = Path(config.get('data_path', './data/historical'))
        self.data_path.mkdir(parents=True, exist_ok=True)
        self.cache_path = self.data_path / 'cache'
        self.cache_path.mkdir(exist_ok=True)
        
        self.min_sample_size = config.get('min_sample_size', 10)
        self.trend_window = config.get('trend_window', 5)
        self.confidence_level = config.get('confidence_level', 0.95)
        
        self.scaler = StandardScaler()
        self.baselines = {}
        self.performance_cache = {}
        
    def load_historical_data(self, 
                            entity_id: str,
                            entity_type: str,
                            sport: str,
                            seasons: Optional[List[str]] = None) -> pd.DataFrame:
        """Load historical performance data"""
        cache_key = f"{entity_id}_{entity_type}_{sport}_{'_'.join(seasons or ['all'])}"
        
        # Check cache
        if cache_key in self.performance_cache:
            return self.performance_cache[cache_key]
        
        # Try loading from file
        file_path = self.data_path / f"{entity_type}s" / sport.lower() / f"{entity_id}.parquet"
        
        if file_path.exists():
            df = pd.read_parquet(file_path)
            
            # Filter by seasons if specified
            if seasons:
                df = df[df['season'].isin(seasons)]
            
            self.performance_cache[cache_key] = df
            return df
        
        # Return empty dataframe if no data found
        logger.warning(f"No historical data found for {entity_id}")
        return pd.DataFrame()
    
    def create_performance_baseline(self,
                                   entity_id: str,
                                   entity_type: str,
                                   sport: str,
                                   data: pd.DataFrame,
                                   season: Optional[str] = None) -> PerformanceBaseline:
        """Create performance baseline for entity"""
        if data.empty:
            return self._create_empty_baseline(entity_id, entity_type, sport, season)
        
        # Filter to specific season if provided
        if season:
            season_data = data[data['season'] == season]
        else:
            season_data = data
        
        # Calculate basic statistics
        numeric_cols = season_data.select_dtypes(include=[np.number]).columns
        numeric_cols = [col for col in numeric_cols if col not in ['game_id', 'season', 'week', 'quarter']]
        
        statistics = {}
        percentiles = {}
        trends = {}
        consistency_scores = {}
        
        for col in numeric_cols:
            if col in season_data.columns:
                values = season_data[col].dropna()
                if len(values) > 0:
                    statistics[col] = {
                        'mean': values.mean(),
                        'median': values.median(),
                        'std': values.std(),
                        'min': values.min(),
                        'max': values.max(),
                        'q25': values.quantile(0.25),
                        'q75': values.quantile(0.75)
                    }
                    
                    # Calculate percentile rank
                    percentiles[col] = self._calculate_percentile_rank(
                        values.mean(), col, sport, entity_type
                    )
                    
                    # Calculate trend
                    if len(values) >= self.trend_window:
                        trends[col] = self._analyze_trend(values.tolist())
                    
                    # Calculate consistency score
                    if values.std() > 0:
                        consistency_scores[col] = 1 / (1 + values.std() / values.mean())
                    else:
                        consistency_scores[col] = 1.0
        
        # Calculate clutch metrics
        clutch_metrics = self._calculate_clutch_metrics(season_data, sport)
        
        # Calculate situational splits
        situational_splits = self._calculate_situational_splits(season_data, sport)
        
        baseline = PerformanceBaseline(
            entity_id=entity_id,
            entity_type=entity_type,
            sport=sport,
            season=season or 'all',
            games_played=len(season_data),
            statistics=statistics,
            percentiles=percentiles,
            trends=trends,
            consistency_scores=consistency_scores,
            clutch_metrics=clutch_metrics,
            situational_splits=situational_splits
        )
        
        # Cache the baseline
        self.baselines[f"{entity_id}_{season or 'all'}"] = baseline
        
        return baseline
    
    def analyze_performance_trend(self,
                                 entity_id: str,
                                 stat_name: str,
                                 data: pd.DataFrame,
                                 period: str = 'last_10') -> PerformanceTrend:
        """Analyze performance trend for specific stat"""
        if data.empty or stat_name not in data.columns:
            return self._create_empty_trend(entity_id, stat_name, period)
        
        # Sort by date
        data = data.sort_values('game_date')
        
        # Get period data
        if period == 'last_5':
            period_data = data.tail(5)
        elif period == 'last_10':
            period_data = data.tail(10)
        elif period == 'last_month':
            cutoff_date = datetime.now() - timedelta(days=30)
            period_data = data[pd.to_datetime(data['game_date']) > cutoff_date]
        else:  # season
            period_data = data
        
        values = period_data[stat_name].dropna().tolist()
        dates = pd.to_datetime(period_data['game_date']).tolist()
        
        if len(values) < 2:
            return self._create_empty_trend(entity_id, stat_name, period)
        
        # Calculate trend
        trend_result = self._analyze_trend(values)
        
        # Calculate moving average
        window = min(3, len(values))
        moving_avg = pd.Series(values).rolling(window=window, min_periods=1).mean().tolist()
        
        # Project next value
        projection, confidence_interval = self._project_next_value(values)
        
        return PerformanceTrend(
            entity_id=entity_id,
            stat_name=stat_name,
            period=period,
            trend_direction=trend_result['direction'],
            trend_strength=trend_result['strength'],
            values=values,
            dates=dates,
            moving_average=moving_avg,
            projection=projection,
            confidence_interval=confidence_interval
        )
    
    def identify_patterns(self,
                         data: pd.DataFrame,
                         target_stat: str,
                         min_correlation: float = 0.3) -> Dict[str, Any]:
        """Identify patterns in historical data"""
        if data.empty or target_stat not in data.columns:
            return {}
        
        patterns = {
            'correlations': {},
            'cyclical_patterns': {},
            'conditional_patterns': {},
            'anomalies': []
        }
        
        # Find correlations
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col != target_stat and col in data.columns:
                correlation = data[target_stat].corr(data[col])
                if abs(correlation) >= min_correlation:
                    patterns['correlations'][col] = correlation
        
        # Detect cyclical patterns
        if len(data) >= 20:
            patterns['cyclical_patterns'] = self._detect_cyclical_patterns(
                data[target_stat].dropna().values
            )
        
        # Find conditional patterns
        patterns['conditional_patterns'] = self._find_conditional_patterns(
            data, target_stat
        )
        
        # Detect anomalies
        patterns['anomalies'] = self._detect_anomalies(
            data[target_stat].dropna().values
        )
        
        return patterns
    
    def compare_to_historical(self,
                            current_value: float,
                            entity_id: str,
                            stat_name: str,
                            sport: str,
                            context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Compare current performance to historical baseline"""
        baseline_key = f"{entity_id}_all"
        
        if baseline_key not in self.baselines:
            # Try to load and create baseline
            data = self.load_historical_data(entity_id, 'player', sport)
            if not data.empty:
                self.create_performance_baseline(entity_id, 'player', sport, data)
        
        if baseline_key not in self.baselines:
            return {
                'percentile': 50.0,
                'z_score': 0.0,
                'rating': 'average',
                'historical_context': 'No historical data available'
            }
        
        baseline = self.baselines[baseline_key]
        
        if stat_name not in baseline.statistics:
            return {
                'percentile': 50.0,
                'z_score': 0.0,
                'rating': 'average',
                'historical_context': f'No historical data for {stat_name}'
            }
        
        stat_info = baseline.statistics[stat_name]
        mean = stat_info['mean']
        std = stat_info['std']
        
        # Calculate z-score
        z_score = (current_value - mean) / std if std > 0 else 0
        
        # Calculate percentile
        percentile = stats.norm.cdf(z_score) * 100
        
        # Determine rating
        if percentile >= 90:
            rating = 'elite'
        elif percentile >= 75:
            rating = 'excellent'
        elif percentile >= 60:
            rating = 'above_average'
        elif percentile >= 40:
            rating = 'average'
        elif percentile >= 25:
            rating = 'below_average'
        else:
            rating = 'poor'
        
        # Add context
        historical_context = self._generate_historical_context(
            current_value, stat_info, percentile
        )
        
        return {
            'percentile': percentile,
            'z_score': z_score,
            'rating': rating,
            'historical_mean': mean,
            'historical_std': std,
            'historical_context': historical_context
        }
    
    def get_matchup_history(self,
                           entity1_id: str,
                           entity2_id: str,
                           sport: str,
                           min_games: int = 3) -> Dict[str, Any]:
        """Get historical matchup data between two entities"""
        cache_key = f"matchup_{entity1_id}_{entity2_id}_{sport}"
        
        # Check cache
        cache_file = self.cache_path / f"{cache_key}.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                return json.load(f)
        
        # This would typically query a database
        # For now, return sample structure
        matchup_data = {
            'total_games': 0,
            'entity1_wins': 0,
            'entity2_wins': 0,
            'avg_total_score': 0,
            'avg_margin': 0,
            'recent_games': [],
            'trends': {},
            'key_stats': {}
        }
        
        return matchup_data
    
    def _analyze_trend(self, values: List[float]) -> Dict[str, Any]:
        """Analyze trend in values"""
        if len(values) < 2:
            return {'direction': 'stable', 'strength': 0.0, 'slope': 0.0}
        
        x = np.arange(len(values))
        y = np.array(values)
        
        # Calculate linear regression
        slope, intercept = np.polyfit(x, y, 1)
        
        # Calculate correlation coefficient
        correlation = np.corrcoef(x, y)[0, 1]
        
        # Determine trend direction
        if abs(slope) < 0.01:
            direction = 'stable'
        elif slope > 0:
            direction = 'up'
        else:
            direction = 'down'
        
        # Calculate trend strength (0-1)
        strength = min(abs(correlation), 1.0)
        
        return {
            'direction': direction,
            'strength': strength,
            'slope': slope,
            'correlation': correlation
        }
    
    def _project_next_value(self, 
                           values: List[float],
                           confidence: float = 0.95) -> Tuple[float, Tuple[float, float]]:
        """Project next value based on historical data"""
        if len(values) < 3:
            if values:
                return values[-1], (values[-1] * 0.8, values[-1] * 1.2)
            return 0, (0, 0)
        
        # Use weighted moving average for projection
        weights = np.exp(np.linspace(-1, 0, len(values)))
        weights /= weights.sum()
        projection = np.average(values, weights=weights)
        
        # Calculate confidence interval
        std = np.std(values)
        z_score = stats.norm.ppf((1 + confidence) / 2)
        margin = z_score * std
        
        confidence_interval = (projection - margin, projection + margin)
        
        return projection, confidence_interval
    
    def _calculate_percentile_rank(self,
                                  value: float,
                                  stat_name: str,
                                  sport: str,
                                  entity_type: str) -> float:
        """Calculate percentile rank compared to all entities"""
        # This would typically query a database for all values
        # For now, return estimated percentile
        return stats.norm.cdf((value - 50) / 20) * 100
    
    def _calculate_clutch_metrics(self,
                                 data: pd.DataFrame,
                                 sport: str) -> Dict[str, float]:
        """Calculate performance in clutch situations"""
        clutch_metrics = {}
        
        # Define clutch situations based on sport
        if sport.upper() == 'NBA':
            # Last 5 minutes, margin <= 5
            if 'margin' in data.columns and 'period' in data.columns:
                clutch_games = data[(data['period'] == 4) & (abs(data['margin']) <= 5)]
                if not clutch_games.empty:
                    clutch_metrics['clutch_ppg'] = clutch_games['points'].mean()
                    clutch_metrics['clutch_fg_pct'] = clutch_games['field_goal_pct'].mean()
        
        elif sport.upper() == 'NFL':
            # 4th quarter, one-score game
            if 'quarter' in data.columns and 'margin' in data.columns:
                clutch_games = data[(data['quarter'] == 4) & (abs(data['margin']) <= 8)]
                if not clutch_games.empty:
                    clutch_metrics['clutch_qbr'] = clutch_games.get('qbr', pd.Series()).mean()
                    clutch_metrics['clutch_completion_pct'] = clutch_games.get('completion_pct', pd.Series()).mean()
        
        return clutch_metrics
    
    def _calculate_situational_splits(self,
                                     data: pd.DataFrame,
                                     sport: str) -> Dict[str, Any]:
        """Calculate performance in different situations"""
        splits = {}
        
        # Home/Away splits
        if 'is_home' in data.columns:
            home_games = data[data['is_home'] == True]
            away_games = data[data['is_home'] == False]
            
            splits['home'] = self._calculate_split_stats(home_games)
            splits['away'] = self._calculate_split_stats(away_games)
        
        # Day/Night splits (if applicable)
        if 'game_time' in data.columns:
            data['is_day'] = pd.to_datetime(data['game_time']).dt.hour < 17
            day_games = data[data['is_day'] == True]
            night_games = data[data['is_day'] == False]
            
            splits['day'] = self._calculate_split_stats(day_games)
            splits['night'] = self._calculate_split_stats(night_games)
        
        # Rest splits
        if 'rest_days' in data.columns:
            normal_rest = data[data['rest_days'] >= 2]
            short_rest = data[data['rest_days'] < 2]
            
            splits['normal_rest'] = self._calculate_split_stats(normal_rest)
            splits['short_rest'] = self._calculate_split_stats(short_rest)
        
        return splits
    
    def _calculate_split_stats(self, data: pd.DataFrame) -> Dict[str, float]:
        """Calculate statistics for a data split"""
        if data.empty:
            return {}
        
        stats = {}
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if col not in ['game_id', 'season', 'week']:
                stats[col] = data[col].mean()
        
        return stats
    
    def _detect_cyclical_patterns(self, values: np.ndarray) -> Dict[str, Any]:
        """Detect cyclical patterns in time series"""
        if len(values) < 10:
            return {}
        
        # Use FFT to find dominant frequencies
        fft = np.fft.fft(values)
        frequencies = np.fft.fftfreq(len(values))
        
        # Find dominant frequency
        idx = np.argmax(np.abs(fft[1:len(fft)//2])) + 1
        dominant_frequency = frequencies[idx]
        
        if dominant_frequency > 0:
            period = 1 / dominant_frequency
        else:
            period = len(values)
        
        return {
            'has_cycle': abs(dominant_frequency) > 0.01,
            'period': period,
            'strength': np.abs(fft[idx]) / len(values)
        }
    
    def _find_conditional_patterns(self,
                                  data: pd.DataFrame,
                                  target_stat: str) -> Dict[str, Any]:
        """Find patterns based on conditions"""
        patterns = {}
        
        # Example: Performance after wins vs losses
        if 'previous_result' in data.columns:
            after_win = data[data['previous_result'] == 'W'][target_stat].mean()
            after_loss = data[data['previous_result'] == 'L'][target_stat].mean()
            
            patterns['after_win_vs_loss'] = {
                'after_win': after_win,
                'after_loss': after_loss,
                'difference': after_win - after_loss
            }
        
        return patterns
    
    def _detect_anomalies(self, values: np.ndarray) -> List[int]:
        """Detect anomalies using IQR method"""
        if len(values) < 4:
            return []
        
        q1 = np.percentile(values, 25)
        q3 = np.percentile(values, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        anomalies = []
        for i, value in enumerate(values):
            if value < lower_bound or value > upper_bound:
                anomalies.append(i)
        
        return anomalies
    
    def _create_empty_baseline(self,
                              entity_id: str,
                              entity_type: str,
                              sport: str,
                              season: Optional[str]) -> PerformanceBaseline:
        """Create empty baseline when no data available"""
        return PerformanceBaseline(
            entity_id=entity_id,
            entity_type=entity_type,
            sport=sport,
            season=season or 'all',
            games_played=0,
            statistics={},
            percentiles={},
            trends={},
            consistency_scores={},
            clutch_metrics={},
            situational_splits={}
        )
    
    def _create_empty_trend(self,
                          entity_id: str,
                          stat_name: str,
                          period: str) -> PerformanceTrend:
        """Create empty trend when no data available"""
        return PerformanceTrend(
            entity_id=entity_id,
            stat_name=stat_name,
            period=period,
            trend_direction='stable',
            trend_strength=0.0,
            values=[],
            dates=[],
            moving_average=[],
            projection=0.0,
            confidence_interval=(0.0, 0.0)
        )
    
    def _generate_historical_context(self,
                                    current_value: float,
                                    stat_info: Dict[str, float],
                                    percentile: float) -> str:
        """Generate human-readable historical context"""
        mean = stat_info['mean']
        max_val = stat_info['max']
        min_val = stat_info['min']
        
        if percentile >= 95:
            context = f"Elite performance - top 5% historically (career avg: {mean:.1f})"
        elif percentile >= 80:
            context = f"Excellent performance - top 20% historically (career avg: {mean:.1f})"
        elif percentile >= 60:
            context = f"Above average performance (career avg: {mean:.1f})"
        elif percentile >= 40:
            context = f"Average performance (career avg: {mean:.1f})"
        else:
            context = f"Below average performance (career avg: {mean:.1f})"
        
        # Add comparison to extremes
        if current_value >= max_val * 0.95:
            context += f" - Near career high ({max_val:.1f})"
        elif current_value <= min_val * 1.05:
            context += f" - Near career low ({min_val:.1f})"
        
        return context