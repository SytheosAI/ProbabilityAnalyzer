"""
Statistical Prediction Engine for Sports Analytics
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from scipy import stats
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.linear_model import Ridge, Lasso, ElasticNet
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, PolynomialFeatures
import xgboost as xgb
import lightgbm as lgb
import logging
from dataclasses import dataclass, asdict
import pickle
import json
from pathlib import Path

logger = logging.getLogger(__name__)

@dataclass
class StatisticalPrediction:
    """Individual statistical prediction"""
    player_id: str
    player_name: str
    team: str
    opponent: str
    stat_name: str
    predicted_value: float
    confidence_interval: Tuple[float, float]
    probability_over: Dict[float, float]  # Line -> Probability
    probability_under: Dict[float, float]
    expected_variance: float
    confidence_score: float
    key_factors: List[Dict[str, Any]]
    historical_average: float
    recent_form: float
    matchup_history: float
    recommendation: str

@dataclass
class TeamPrediction:
    """Team-level statistical prediction"""
    team_id: str
    team_name: str
    opponent: str
    predictions: Dict[str, float]  # stat_name -> value
    total_points: float
    spread: float
    over_under: float
    win_probability: float
    quarter_projections: List[float]
    key_players: List[str]
    team_trends: Dict[str, Any]

@dataclass
class PropBetAnalysis:
    """Prop bet analysis result"""
    bet_type: str
    player: str
    stat: str
    line: float
    over_probability: float
    under_probability: float
    expected_value: float
    edge: float
    recommendation: str
    confidence: float
    supporting_factors: List[str]
    risk_factors: List[str]

class StatisticalPredictionEngine:
    """Advanced statistical prediction engine for all sports"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.scalers = {}
        self.feature_engineers = {}
        
        # Model hyperparameters by sport
        self.model_configs = {
            'NFL': {
                'n_estimators': 200,
                'max_depth': 10,
                'learning_rate': 0.05,
                'min_samples_split': 20
            },
            'NBA': {
                'n_estimators': 150,
                'max_depth': 8,
                'learning_rate': 0.08,
                'min_samples_split': 15
            },
            'MLB': {
                'n_estimators': 250,
                'max_depth': 12,
                'learning_rate': 0.03,
                'min_samples_split': 25
            },
            'NHL': {
                'n_estimators': 150,
                'max_depth': 8,
                'learning_rate': 0.06,
                'min_samples_split': 15
            },
            'SOCCER': {
                'n_estimators': 180,
                'max_depth': 9,
                'learning_rate': 0.05,
                'min_samples_split': 18
            }
        }
        
        # Statistical thresholds for recommendations
        self.recommendation_thresholds = {
            'strong_over': 0.65,
            'lean_over': 0.55,
            'no_play': 0.45,
            'lean_under': 0.35,
            'strong_under': 0.25
        }
        
        # Cache for predictions
        self.prediction_cache = {}
        self.cache_duration = config.get('cache_duration', 3600)
        
    def predict_player_statistics(self,
                                 player_id: str,
                                 player_name: str,
                                 stat_name: str,
                                 sport: str,
                                 context: Dict[str, Any]) -> StatisticalPrediction:
        """Predict individual player statistics"""
        
        # Check cache
        cache_key = f"{player_id}_{stat_name}_{context.get('game_id', '')}"
        if cache_key in self.prediction_cache:
            cached = self.prediction_cache[cache_key]
            if (datetime.now() - cached['timestamp']).seconds < self.cache_duration:
                return cached['prediction']
        
        # Prepare features
        features = self._prepare_player_features(player_id, stat_name, sport, context)
        
        # Get or create model
        model = self._get_or_create_model(sport, stat_name, 'player')
        
        # Make prediction
        if model:
            prediction = self._make_model_prediction(model, features)
        else:
            # Fallback to statistical methods
            prediction = self._statistical_prediction(player_id, stat_name, sport, context)
        
        # Calculate probabilities
        probabilities = self._calculate_probabilities(
            prediction['value'],
            prediction['std_dev'],
            stat_name,
            sport
        )
        
        # Get historical context
        historical = self._get_historical_context(player_id, stat_name, sport)
        
        # Analyze matchup
        matchup = self._analyze_matchup(player_id, stat_name, context.get('opponent'), sport)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(
            prediction['value'],
            context.get('line'),
            probabilities,
            prediction['confidence']
        )
        
        # Create prediction object
        stat_prediction = StatisticalPrediction(
            player_id=player_id,
            player_name=player_name,
            team=context.get('team', ''),
            opponent=context.get('opponent', ''),
            stat_name=stat_name,
            predicted_value=prediction['value'],
            confidence_interval=prediction['confidence_interval'],
            probability_over=probabilities['over'],
            probability_under=probabilities['under'],
            expected_variance=prediction['std_dev'],
            confidence_score=prediction['confidence'],
            key_factors=prediction.get('factors', []),
            historical_average=historical['average'],
            recent_form=historical['recent_form'],
            matchup_history=matchup['average'],
            recommendation=recommendation
        )
        
        # Cache prediction
        self.prediction_cache[cache_key] = {
            'prediction': stat_prediction,
            'timestamp': datetime.now()
        }
        
        return stat_prediction
    
    def predict_team_statistics(self,
                               team_id: str,
                               team_name: str,
                               sport: str,
                               context: Dict[str, Any]) -> TeamPrediction:
        """Predict team-level statistics"""
        
        predictions = {}
        
        # Get team stats to predict based on sport
        team_stats = self._get_team_stats_list(sport)
        
        for stat in team_stats:
            features = self._prepare_team_features(team_id, stat, sport, context)
            model = self._get_or_create_model(sport, stat, 'team')
            
            if model:
                pred = self._make_model_prediction(model, features)
                predictions[stat] = pred['value']
            else:
                predictions[stat] = self._statistical_team_prediction(team_id, stat, sport, context)
        
        # Calculate total points
        total_points = self._calculate_total_points(predictions, sport)
        
        # Calculate spread and O/U
        spread = self._calculate_spread(team_id, context.get('opponent_id'), sport, context)
        over_under = self._calculate_over_under(total_points, context.get('opponent_total', 0))
        
        # Calculate win probability
        win_prob = self._calculate_win_probability(team_id, context.get('opponent_id'), sport, context)
        
        # Get quarter/period projections
        period_projections = self._calculate_period_projections(total_points, sport)
        
        # Identify key players
        key_players = self._identify_key_players(team_id, sport, context)
        
        # Get team trends
        team_trends = self._analyze_team_trends(team_id, sport)
        
        return TeamPrediction(
            team_id=team_id,
            team_name=team_name,
            opponent=context.get('opponent', ''),
            predictions=predictions,
            total_points=total_points,
            spread=spread,
            over_under=over_under,
            win_probability=win_prob,
            quarter_projections=period_projections,
            key_players=key_players,
            team_trends=team_trends
        )
    
    def analyze_prop_bet(self,
                        player_id: str,
                        stat_name: str,
                        line: float,
                        sport: str,
                        context: Dict[str, Any]) -> PropBetAnalysis:
        """Analyze a specific prop bet"""
        
        # Get prediction
        player_name = context.get('player_name', player_id)
        prediction = self.predict_player_statistics(
            player_id, player_name, stat_name, sport, context
        )
        
        # Calculate probabilities for specific line
        over_prob = self._calculate_line_probability(
            prediction.predicted_value,
            prediction.expected_variance,
            line,
            'over'
        )
        under_prob = 1 - over_prob
        
        # Calculate expected value
        odds_over = context.get('odds_over', -110)
        odds_under = context.get('odds_under', -110)
        
        ev_over = self._calculate_expected_value(over_prob, odds_over)
        ev_under = self._calculate_expected_value(under_prob, odds_under)
        
        # Determine best side and edge
        if ev_over > ev_under:
            best_side = 'over'
            edge = ev_over
            probability = over_prob
        else:
            best_side = 'under'
            edge = ev_under
            probability = under_prob
        
        # Generate recommendation
        if edge > 0.05 and probability > 0.60:
            recommendation = f"Strong play: {best_side} {line}"
        elif edge > 0.02 and probability > 0.55:
            recommendation = f"Lean: {best_side} {line}"
        else:
            recommendation = "No play - insufficient edge"
        
        # Identify supporting factors
        supporting_factors = []
        risk_factors = []
        
        if prediction.recent_form > prediction.historical_average * 1.1:
            supporting_factors.append("Hot streak - exceeding season average")
        elif prediction.recent_form < prediction.historical_average * 0.9:
            risk_factors.append("Cold streak - below season average")
        
        if prediction.matchup_history > line:
            supporting_factors.append(f"Historically exceeds line vs this opponent")
        elif prediction.matchup_history < line * 0.9:
            risk_factors.append("Struggles vs this opponent historically")
        
        if prediction.confidence_score > 0.75:
            supporting_factors.append("High model confidence")
        elif prediction.confidence_score < 0.50:
            risk_factors.append("Low model confidence")
        
        return PropBetAnalysis(
            bet_type='player_prop',
            player=player_name,
            stat=stat_name,
            line=line,
            over_probability=over_prob,
            under_probability=under_prob,
            expected_value=edge,
            edge=edge * 100,  # Convert to percentage
            recommendation=recommendation,
            confidence=prediction.confidence_score,
            supporting_factors=supporting_factors,
            risk_factors=risk_factors
        )
    
    def calculate_parlay_probability(self,
                                    bets: List[PropBetAnalysis]) -> Dict[str, Any]:
        """Calculate probability and EV for parlay"""
        
        total_prob = 1.0
        total_odds = 1.0
        legs = []
        
        for bet in bets:
            if 'over' in bet.recommendation.lower():
                prob = bet.over_probability
                odds = self._american_to_decimal(bet.expected_value)
            else:
                prob = bet.under_probability
                odds = self._american_to_decimal(bet.expected_value)
            
            total_prob *= prob
            total_odds *= odds
            
            legs.append({
                'player': bet.player,
                'stat': bet.stat,
                'line': bet.line,
                'side': 'over' if 'over' in bet.recommendation.lower() else 'under',
                'probability': prob
            })
        
        expected_value = (total_odds * total_prob) - 1
        
        return {
            'legs': legs,
            'total_probability': total_prob,
            'total_odds': total_odds,
            'expected_value': expected_value,
            'recommendation': 'Play' if expected_value > 0.10 else 'Pass',
            'risk_level': self._assess_parlay_risk(total_prob, len(legs))
        }
    
    def _prepare_player_features(self,
                                player_id: str,
                                stat_name: str,
                                sport: str,
                                context: Dict[str, Any]) -> np.ndarray:
        """Prepare features for player prediction"""
        features = []
        
        # Recent performance (last 5, 10, 20 games)
        recent_stats = context.get('recent_stats', {})
        features.extend([
            recent_stats.get('last_5', 0),
            recent_stats.get('last_10', 0),
            recent_stats.get('last_20', 0),
            recent_stats.get('season', 0)
        ])
        
        # Opponent defensive ranking
        features.append(context.get('opponent_def_rank', 50) / 100)
        
        # Home/Away
        features.append(1 if context.get('is_home') else 0)
        
        # Rest days
        features.append(context.get('rest_days', 2) / 7)
        
        # Minutes/Usage projections
        features.append(context.get('projected_minutes', 30) / 48)
        features.append(context.get('usage_rate', 20) / 100)
        
        # Weather factors (outdoor sports)
        if sport in ['NFL', 'MLB', 'SOCCER']:
            weather = context.get('weather', {})
            features.extend([
                weather.get('temperature', 70) / 100,
                weather.get('wind_speed', 0) / 30,
                weather.get('precipitation', 0)
            ])
        
        # Matchup history
        features.append(context.get('matchup_avg', 0))
        
        # Team pace/total projection
        features.append(context.get('game_total', 200) / 250)
        
        # Injury status (1 = healthy, 0 = out)
        features.append(context.get('health_status', 1))
        
        # Days since last game
        features.append(context.get('days_since_last', 2) / 7)
        
        # Conference/Division game
        features.append(1 if context.get('division_game') else 0)
        
        # Time of game (normalized to 0-1)
        game_hour = context.get('game_hour', 19)
        features.append(game_hour / 24)
        
        # Season progress (0 = start, 1 = end)
        features.append(context.get('season_progress', 0.5))
        
        # Playoff implications
        features.append(context.get('playoff_implications', 0))
        
        return np.array(features).reshape(1, -1)
    
    def _prepare_team_features(self,
                              team_id: str,
                              stat_name: str,
                              sport: str,
                              context: Dict[str, Any]) -> np.ndarray:
        """Prepare features for team prediction"""
        features = []
        
        # Team offensive/defensive ratings
        features.extend([
            context.get('offensive_rating', 100) / 120,
            context.get('defensive_rating', 100) / 120
        ])
        
        # Opponent ratings
        features.extend([
            context.get('opp_offensive_rating', 100) / 120,
            context.get('opp_defensive_rating', 100) / 120
        ])
        
        # Pace factors
        features.append(context.get('pace', 100) / 110)
        features.append(context.get('opp_pace', 100) / 110)
        
        # Home/Away
        features.append(1 if context.get('is_home') else 0)
        
        # Rest advantage
        features.append(context.get('rest_advantage', 0) / 3)
        
        # Recent form (last 5, 10 games)
        features.extend([
            context.get('form_last_5', 0.5),
            context.get('form_last_10', 0.5)
        ])
        
        # Head-to-head history
        features.append(context.get('h2h_win_pct', 0.5))
        features.append(context.get('h2h_avg_score', 100) / 120)
        
        # Injuries impact
        features.append(1 - context.get('injury_impact', 0))
        
        # Season metrics
        features.extend([
            context.get('win_percentage', 0.5),
            context.get('net_rating', 0) / 20
        ])
        
        # Situational factors
        features.append(1 if context.get('division_game') else 0)
        features.append(1 if context.get('rivalry_game') else 0)
        features.append(context.get('playoff_implications', 0))
        
        return np.array(features).reshape(1, -1)
    
    def _get_or_create_model(self,
                           sport: str,
                           stat_name: str,
                           level: str) -> Optional[Any]:
        """Get existing model or create new one"""
        model_key = f"{sport}_{stat_name}_{level}"
        
        if model_key in self.models:
            return self.models[model_key]
        
        # Try to load saved model
        model_path = Path(f"models/{sport}/{level}/{stat_name}.pkl")
        if model_path.exists():
            with open(model_path, 'rb') as f:
                self.models[model_key] = pickle.load(f)
                return self.models[model_key]
        
        # Create new ensemble model
        if sport.upper() in self.model_configs:
            config = self.model_configs[sport.upper()]
            
            # Create ensemble
            ensemble = {
                'xgboost': xgb.XGBRegressor(
                    n_estimators=config['n_estimators'],
                    max_depth=config['max_depth'],
                    learning_rate=config['learning_rate'],
                    random_state=42
                ),
                'lightgbm': lgb.LGBMRegressor(
                    n_estimators=config['n_estimators'],
                    max_depth=config['max_depth'],
                    learning_rate=config['learning_rate'],
                    random_state=42,
                    verbose=-1
                ),
                'random_forest': RandomForestRegressor(
                    n_estimators=config['n_estimators'],
                    max_depth=config['max_depth'],
                    min_samples_split=config['min_samples_split'],
                    random_state=42
                ),
                'gradient_boost': GradientBoostingRegressor(
                    n_estimators=config['n_estimators'] // 2,
                    max_depth=config['max_depth'],
                    learning_rate=config['learning_rate'] * 2,
                    random_state=42
                )
            }
            
            self.models[model_key] = ensemble
            return ensemble
        
        return None
    
    def _make_model_prediction(self,
                             model: Union[Dict, Any],
                             features: np.ndarray) -> Dict[str, Any]:
        """Make prediction using model or ensemble"""
        
        if isinstance(model, dict):
            # Ensemble prediction
            predictions = []
            weights = {'xgboost': 0.3, 'lightgbm': 0.3, 'random_forest': 0.25, 'gradient_boost': 0.15}
            
            weighted_sum = 0
            total_weight = 0
            
            for name, mdl in model.items():
                try:
                    if hasattr(mdl, 'predict'):
                        pred = mdl.predict(features)[0]
                        predictions.append(pred)
                        weighted_sum += pred * weights.get(name, 0.25)
                        total_weight += weights.get(name, 0.25)
                except:
                    continue
            
            if predictions:
                final_prediction = weighted_sum / total_weight if total_weight > 0 else np.mean(predictions)
                std_dev = np.std(predictions)
                
                # Calculate confidence based on agreement
                confidence = 1.0 - (std_dev / (abs(final_prediction) + 1))
                confidence = max(0.3, min(0.95, confidence))
                
                return {
                    'value': final_prediction,
                    'std_dev': std_dev,
                    'confidence_interval': (final_prediction - 1.96 * std_dev, final_prediction + 1.96 * std_dev),
                    'confidence': confidence,
                    'model_predictions': predictions
                }
            else:
                # No valid predictions, return default
                return self._default_prediction()
        else:
            # Single model prediction
            try:
                prediction = model.predict(features)[0]
                # Estimate uncertainty (would need proper implementation)
                std_dev = abs(prediction) * 0.15
                
                return {
                    'value': prediction,
                    'std_dev': std_dev,
                    'confidence_interval': (prediction - 1.96 * std_dev, prediction + 1.96 * std_dev),
                    'confidence': 0.7
                }
            except:
                return self._default_prediction()
    
    def _statistical_prediction(self,
                              player_id: str,
                              stat_name: str,
                              sport: str,
                              context: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback statistical prediction method"""
        
        # Get recent averages
        recent_stats = context.get('recent_stats', {})
        last_5 = recent_stats.get('last_5', 0)
        last_10 = recent_stats.get('last_10', 0)
        season = recent_stats.get('season', 0)
        
        # Weighted average
        if last_5 and last_10 and season:
            weighted_avg = (last_5 * 0.5) + (last_10 * 0.3) + (season * 0.2)
        else:
            weighted_avg = season or 0
        
        # Adjust for opponent
        opp_factor = 1.0
        opp_rank = context.get('opponent_def_rank', 50)
        if opp_rank < 30:  # Top 30% defense
            opp_factor = 0.90
        elif opp_rank > 70:  # Bottom 30% defense
            opp_factor = 1.10
        
        # Adjust for home/away
        home_factor = 1.03 if context.get('is_home') else 0.97
        
        # Final prediction
        prediction = weighted_avg * opp_factor * home_factor
        
        # Estimate variance
        std_dev = abs(prediction) * 0.20
        
        return {
            'value': prediction,
            'std_dev': std_dev,
            'confidence_interval': (prediction - 1.96 * std_dev, prediction + 1.96 * std_dev),
            'confidence': 0.6,
            'factors': [
                {'factor': 'recent_form', 'impact': weighted_avg},
                {'factor': 'opponent', 'impact': opp_factor},
                {'factor': 'venue', 'impact': home_factor}
            ]
        }
    
    def _calculate_probabilities(self,
                               predicted_value: float,
                               std_dev: float,
                               stat_name: str,
                               sport: str) -> Dict[str, Dict[float, float]]:
        """Calculate over/under probabilities for common lines"""
        
        probabilities = {'over': {}, 'under': {}}
        
        # Get common lines for this stat
        common_lines = self._get_common_lines(stat_name, sport, predicted_value)
        
        for line in common_lines:
            # Calculate probability using normal distribution
            z_score = (line - predicted_value) / std_dev if std_dev > 0 else 0
            prob_under = stats.norm.cdf(z_score)
            prob_over = 1 - prob_under
            
            probabilities['over'][line] = prob_over
            probabilities['under'][line] = prob_under
        
        return probabilities
    
    def _get_common_lines(self,
                        stat_name: str,
                        sport: str,
                        predicted_value: float) -> List[float]:
        """Get common betting lines for a statistic"""
        
        # Generate lines around predicted value
        lines = []
        
        if 'percentage' in stat_name or 'pct' in stat_name:
            # Percentage stats
            base = round(predicted_value, 1)
            for offset in [-5, -2.5, -1, -0.5, 0, 0.5, 1, 2.5, 5]:
                line = base + offset
                if 0 <= line <= 100:
                    lines.append(line)
        elif any(x in stat_name for x in ['points', 'goals', 'runs', 'yards']):
            # Major counting stats
            base = round(predicted_value / 5) * 5
            for offset in [-10, -5, -2.5, 0, 2.5, 5, 10]:
                lines.append(max(0, base + offset))
        else:
            # Other counting stats
            base = round(predicted_value)
            for offset in [-2, -1, -0.5, 0, 0.5, 1, 2]:
                lines.append(max(0, base + offset))
        
        return sorted(lines)
    
    def _calculate_line_probability(self,
                                  predicted_value: float,
                                  std_dev: float,
                                  line: float,
                                  side: str) -> float:
        """Calculate probability for specific line and side"""
        
        if std_dev == 0:
            if side == 'over':
                return 1.0 if predicted_value > line else 0.0
            else:
                return 1.0 if predicted_value < line else 0.0
        
        z_score = (line - predicted_value) / std_dev
        prob_under = stats.norm.cdf(z_score)
        
        return 1 - prob_under if side == 'over' else prob_under
    
    def _calculate_expected_value(self,
                                probability: float,
                                american_odds: int) -> float:
        """Calculate expected value from probability and odds"""
        
        if american_odds > 0:
            decimal_odds = (american_odds / 100) + 1
        else:
            decimal_odds = (100 / abs(american_odds)) + 1
        
        ev = (probability * decimal_odds) - 1
        return ev
    
    def _american_to_decimal(self, american_odds: int) -> float:
        """Convert American odds to decimal"""
        if american_odds > 0:
            return (american_odds / 100) + 1
        else:
            return (100 / abs(american_odds)) + 1
    
    def _generate_recommendation(self,
                                predicted_value: float,
                                line: Optional[float],
                                probabilities: Dict[str, Dict[float, float]],
                                confidence: float) -> str:
        """Generate betting recommendation"""
        
        if not line:
            return "No line available"
        
        # Get probability for the line
        over_probs = probabilities['over']
        closest_line = min(over_probs.keys(), key=lambda x: abs(x - line))
        over_prob = over_probs[closest_line]
        
        # Adjust for confidence
        adjusted_prob = 0.5 + (over_prob - 0.5) * confidence
        
        if adjusted_prob >= self.recommendation_thresholds['strong_over']:
            return f"STRONG OVER {line}"
        elif adjusted_prob >= self.recommendation_thresholds['lean_over']:
            return f"Lean Over {line}"
        elif adjusted_prob <= self.recommendation_thresholds['strong_under']:
            return f"STRONG UNDER {line}"
        elif adjusted_prob <= self.recommendation_thresholds['lean_under']:
            return f"Lean Under {line}"
        else:
            return f"No Play - {line}"
    
    def _get_historical_context(self,
                               player_id: str,
                               stat_name: str,
                               sport: str) -> Dict[str, float]:
        """Get historical context for player/stat"""
        # This would query historical database
        # Returning sample data for now
        return {
            'average': 15.5,
            'recent_form': 17.2,
            'career_high': 35,
            'career_low': 0
        }
    
    def _analyze_matchup(self,
                       player_id: str,
                       stat_name: str,
                       opponent: Optional[str],
                       sport: str) -> Dict[str, float]:
        """Analyze historical matchup data"""
        # This would query matchup database
        # Returning sample data for now
        return {
            'games': 5,
            'average': 14.8,
            'best': 25,
            'worst': 8
        }
    
    def _get_team_stats_list(self, sport: str) -> List[str]:
        """Get list of team stats to predict"""
        team_stats = {
            'NFL': ['total_yards', 'passing_yards', 'rushing_yards', 'points', 'turnovers'],
            'NBA': ['points', 'rebounds', 'assists', 'field_goal_pct', 'three_point_pct'],
            'MLB': ['runs', 'hits', 'errors', 'batting_average', 'era'],
            'NHL': ['goals', 'shots', 'save_percentage', 'power_play_pct'],
            'SOCCER': ['goals', 'shots', 'possession', 'corners', 'fouls']
        }
        
        return team_stats.get(sport.upper(), [])
    
    def _statistical_team_prediction(self,
                                   team_id: str,
                                   stat: str,
                                   sport: str,
                                   context: Dict[str, Any]) -> float:
        """Fallback team statistical prediction"""
        # Simple average-based prediction
        season_avg = context.get(f'{stat}_avg', 0)
        opponent_factor = 1.0 + (context.get('opponent_rank', 50) - 50) / 100
        home_factor = 1.02 if context.get('is_home') else 0.98
        
        return season_avg * opponent_factor * home_factor
    
    def _calculate_total_points(self,
                              predictions: Dict[str, float],
                              sport: str) -> float:
        """Calculate total points from predictions"""
        if sport.upper() == 'NFL':
            return predictions.get('points', 0)
        elif sport.upper() == 'NBA':
            return predictions.get('points', 0)
        elif sport.upper() == 'MLB':
            return predictions.get('runs', 0)
        elif sport.upper() == 'NHL':
            return predictions.get('goals', 0)
        elif sport.upper() == 'SOCCER':
            return predictions.get('goals', 0)
        
        return 0
    
    def _calculate_spread(self,
                        team_id: str,
                        opponent_id: str,
                        sport: str,
                        context: Dict[str, Any]) -> float:
        """Calculate point spread"""
        # This would use more sophisticated methods
        # Simple calculation for now
        team_rating = context.get('team_rating', 100)
        opponent_rating = context.get('opponent_rating', 100)
        
        spread = (team_rating - opponent_rating) / 4
        
        # Home advantage
        if context.get('is_home'):
            spread += 3 if sport.upper() == 'NFL' else 2.5
        
        return round(spread * 2) / 2  # Round to nearest 0.5
    
    def _calculate_over_under(self,
                            team_total: float,
                            opponent_total: float) -> float:
        """Calculate over/under line"""
        total = team_total + opponent_total
        return round(total * 2) / 2  # Round to nearest 0.5
    
    def _calculate_win_probability(self,
                                 team_id: str,
                                 opponent_id: str,
                                 sport: str,
                                 context: Dict[str, Any]) -> float:
        """Calculate win probability"""
        # Use ELO or similar rating system
        team_rating = context.get('team_elo', 1500)
        opponent_rating = context.get('opponent_elo', 1500)
        
        # Add home advantage
        if context.get('is_home'):
            team_rating += 100
        
        expected = 1 / (1 + 10 ** ((opponent_rating - team_rating) / 400))
        return expected
    
    def _calculate_period_projections(self,
                                    total_points: float,
                                    sport: str) -> List[float]:
        """Calculate quarter/period score projections"""
        if sport.upper() == 'NFL':
            # 4 quarters
            return [total_points * 0.22, total_points * 0.28, 
                   total_points * 0.23, total_points * 0.27]
        elif sport.upper() == 'NBA':
            # 4 quarters
            return [total_points * 0.24, total_points * 0.26,
                   total_points * 0.25, total_points * 0.25]
        elif sport.upper() == 'MLB':
            # 9 innings (grouped by 3)
            return [total_points * 0.35, total_points * 0.33, total_points * 0.32]
        elif sport.upper() == 'NHL':
            # 3 periods
            return [total_points * 0.32, total_points * 0.34, total_points * 0.34]
        elif sport.upper() == 'SOCCER':
            # 2 halves
            return [total_points * 0.45, total_points * 0.55]
        
        return [total_points]
    
    def _identify_key_players(self,
                            team_id: str,
                            sport: str,
                            context: Dict[str, Any]) -> List[str]:
        """Identify key players for the game"""
        # This would analyze player importance
        # Returning sample data
        return context.get('key_players', [])
    
    def _analyze_team_trends(self,
                           team_id: str,
                           sport: str) -> Dict[str, Any]:
        """Analyze team trends"""
        # This would analyze recent team performance
        # Returning sample structure
        return {
            'scoring_trend': 'up',
            'defensive_trend': 'stable',
            'home_record': '10-5',
            'away_record': '8-7',
            'streak': 'W3'
        }
    
    def _assess_parlay_risk(self,
                          probability: float,
                          num_legs: int) -> str:
        """Assess risk level of parlay"""
        if probability > 0.25 and num_legs <= 3:
            return 'Low Risk'
        elif probability > 0.15 and num_legs <= 4:
            return 'Medium Risk'
        elif probability > 0.10 and num_legs <= 5:
            return 'High Risk'
        else:
            return 'Very High Risk'
    
    def _default_prediction(self) -> Dict[str, Any]:
        """Default prediction when models fail"""
        return {
            'value': 0,
            'std_dev': 1,
            'confidence_interval': (-2, 2),
            'confidence': 0.3,
            'note': 'Default prediction - insufficient data'
        }