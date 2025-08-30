import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import cross_val_score, TimeSeriesSplit
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import xgboost as xgb
import lightgbm as lgb
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass
import joblib
import json
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class EVCalculation:
    game_id: str
    sport: str
    market_type: str
    outcome: str
    bookmaker: str
    offered_odds: float
    fair_odds: float
    implied_probability: float
    true_probability: float
    expected_value: float
    expected_value_percentage: float
    kelly_fraction: float
    confidence_interval: Tuple[float, float]
    risk_assessment: str
    recommendation: str
    factors_considered: List[str]
    model_confidence: float

@dataclass
class ModelPrediction:
    predicted_probability: float
    confidence: float
    feature_importance: Dict[str, float]
    model_type: str
    cross_validation_score: float

class MLExpectedValueCalculator:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.models = {}
        self.scalers = {}
        self.feature_encoders = {}
        
        # Model configuration
        self.ensemble_models = config.get('ensemble_models', [
            'xgboost', 'lightgbm', 'random_forest', 'gradient_boosting', 'neural_network'
        ])
        
        # EV calculation settings
        self.min_edge_threshold = config.get('min_edge_threshold', 1.0)  # 1% minimum edge
        self.max_kelly_fraction = config.get('max_kelly_fraction', 0.25)  # 25% max bet size
        self.confidence_threshold = config.get('confidence_threshold', 0.7)
        
        # Feature engineering settings
        self.lookback_games = config.get('lookback_games', 10)
        self.feature_weights = config.get('feature_weights', {
            'team_performance': 0.25,
            'player_stats': 0.20,
            'weather': 0.15,
            'injuries': 0.15,
            'historical_matchup': 0.10,
            'venue': 0.08,
            'rest_days': 0.07
        })
        
        # Initialize models
        self._initialize_models()
        
    def _initialize_models(self):
        """Initialize ML models for probability prediction"""
        
        # XGBoost
        self.models['xgboost'] = xgb.XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42
        )
        
        # LightGBM
        self.models['lightgbm'] = lgb.LGBMRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbose=-1
        )
        
        # Random Forest
        self.models['random_forest'] = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42
        )
        
        # Gradient Boosting
        self.models['gradient_boosting'] = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42
        )
        
        # Neural Network
        self.models['neural_network'] = MLPRegressor(
            hidden_layer_sizes=(100, 50),
            activation='relu',
            solver='adam',
            alpha=0.001,
            learning_rate='adaptive',
            max_iter=500,
            random_state=42
        )
        
        # Linear models for baseline
        self.models['ridge'] = Ridge(alpha=1.0)
        self.models['lasso'] = Lasso(alpha=0.1)
        
        logger.info(f"Initialized {len(self.models)} ML models")
    
    def calculate_expected_value(self,
                               game_data: Dict[str, Any],
                               betting_line: Dict[str, Any],
                               historical_data: Optional[pd.DataFrame] = None) -> EVCalculation:
        """Calculate expected value using ML models"""
        
        # Extract key information
        game_id = game_data.get('game_id', '')
        sport = game_data.get('sport', '')
        market_type = betting_line.get('market_type', '')
        outcome = betting_line.get('outcome', '')
        bookmaker = betting_line.get('bookmaker', '')
        offered_odds = betting_line.get('odds', 0)
        
        # Engineer features
        features = self._engineer_features(game_data, historical_data)
        
        # Get model predictions
        model_predictions = self._get_ensemble_predictions(features, sport, market_type)
        
        # Calculate true probability from ensemble
        true_probability = self._calculate_ensemble_probability(model_predictions)
        
        # Convert offered odds to implied probability
        implied_probability = self._odds_to_probability(offered_odds, market_type)
        
        # Calculate fair odds
        fair_odds = self._probability_to_odds(true_probability, market_type)
        
        # Calculate expected value
        if market_type in ['h2h', 'moneyline']:
            ev = self._calculate_moneyline_ev(offered_odds, true_probability)
        else:
            ev = self._calculate_spread_total_ev(offered_odds, true_probability)
        
        ev_percentage = ev * 100
        
        # Calculate Kelly fraction
        kelly_fraction = self._calculate_kelly_fraction(offered_odds, true_probability, market_type)
        kelly_fraction = min(kelly_fraction, self.max_kelly_fraction)
        
        # Calculate confidence interval
        confidence_interval = self._calculate_confidence_interval(model_predictions, true_probability)
        
        # Risk assessment
        risk_assessment = self._assess_risk(ev_percentage, kelly_fraction, model_predictions)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(ev_percentage, kelly_fraction, risk_assessment)
        
        # Factors considered
        factors_considered = list(features.keys()) if isinstance(features, dict) else ['statistical_analysis']
        
        # Model confidence
        model_confidence = np.mean([pred.confidence for pred in model_predictions])
        
        return EVCalculation(
            game_id=game_id,
            sport=sport,
            market_type=market_type,
            outcome=outcome,
            bookmaker=bookmaker,
            offered_odds=offered_odds,
            fair_odds=fair_odds,
            implied_probability=implied_probability,
            true_probability=true_probability,
            expected_value=ev,
            expected_value_percentage=ev_percentage,
            kelly_fraction=kelly_fraction,
            confidence_interval=confidence_interval,
            risk_assessment=risk_assessment,
            recommendation=recommendation,
            factors_considered=factors_considered,
            model_confidence=model_confidence
        )
    
    def _engineer_features(self,
                          game_data: Dict[str, Any],
                          historical_data: Optional[pd.DataFrame] = None) -> np.ndarray:
        """Engineer features for ML models"""
        features = []
        
        # Team performance features
        home_team = game_data.get('home_team', {})
        away_team = game_data.get('away_team', {})
        
        # Basic team stats
        features.extend([
            home_team.get('wins', 0),
            home_team.get('losses', 0),
            home_team.get('win_percentage', 0.5),
            away_team.get('wins', 0),
            away_team.get('losses', 0),
            away_team.get('win_percentage', 0.5)
        ])
        
        # Advanced team metrics
        features.extend([
            home_team.get('points_per_game', 0),
            home_team.get('points_allowed_per_game', 0),
            home_team.get('point_differential', 0),
            away_team.get('points_per_game', 0),
            away_team.get('points_allowed_per_game', 0),
            away_team.get('point_differential', 0)
        ])
        
        # Recent form (last 5 games)
        features.extend([
            home_team.get('recent_form', {}).get('wins_last_5', 0),
            home_team.get('recent_form', {}).get('point_diff_last_5', 0),
            away_team.get('recent_form', {}).get('wins_last_5', 0),
            away_team.get('recent_form', {}).get('point_diff_last_5', 0)
        ])
        
        # Injuries and player availability
        home_injuries = home_team.get('key_injuries', [])
        away_injuries = away_team.get('key_injuries', [])
        
        features.extend([
            len(home_injuries),
            len(away_injuries),
            sum(injury.get('impact_score', 0) for injury in home_injuries),
            sum(injury.get('impact_score', 0) for injury in away_injuries)
        ])
        
        # Weather factors (for outdoor sports)
        weather = game_data.get('weather', {})
        features.extend([
            weather.get('temperature', 70),
            weather.get('wind_speed', 0),
            weather.get('humidity', 50),
            weather.get('precipitation_chance', 0)
        ])
        
        # Venue factors
        venue = game_data.get('venue', {})
        features.extend([
            1 if venue.get('dome', False) else 0,
            venue.get('altitude', 0),
            venue.get('capacity', 50000),
            home_team.get('home_record', {}).get('win_percentage', 0.5)
        ])
        
        # Rest and travel
        features.extend([
            game_data.get('home_rest_days', 7),
            game_data.get('away_rest_days', 7),
            game_data.get('away_travel_distance', 0)
        ])
        
        # Historical matchup
        matchup_history = game_data.get('head_to_head', {})
        features.extend([
            matchup_history.get('home_wins_last_10', 5),
            matchup_history.get('away_wins_last_10', 5),
            matchup_history.get('avg_total_points', 45),
            matchup_history.get('avg_point_differential', 0)
        ])
        
        # Market and line information
        features.extend([
            game_data.get('betting_trends', {}).get('public_percentage_home', 50),
            game_data.get('betting_trends', {}).get('sharp_percentage_home', 50),
            game_data.get('line_movement', {}).get('opening_line', 0),
            game_data.get('line_movement', {}).get('current_line', 0)
        ])
        
        # Time-based features
        game_time = game_data.get('game_time', datetime.now())
        if isinstance(game_time, str):
            game_time = datetime.fromisoformat(game_time)
        
        features.extend([
            game_time.hour,
            game_time.weekday(),
            game_time.month,
            1 if game_time.weekday() >= 5 else 0  # Weekend indicator
        ])
        
        # Convert to numpy array and handle missing values
        features = np.array(features, dtype=float)
        features = np.nan_to_num(features, nan=0.0)
        
        return features
    
    def _get_ensemble_predictions(self,
                                features: np.ndarray,
                                sport: str,
                                market_type: str) -> List[ModelPrediction]:
        """Get predictions from ensemble of models"""
        predictions = []
        
        # Reshape features for sklearn models
        if len(features.shape) == 1:
            features = features.reshape(1, -1)
        
        # Scale features
        scaler_key = f"{sport}_{market_type}"
        if scaler_key not in self.scalers:
            self.scalers[scaler_key] = StandardScaler()
            # For new models, fit with current features (in production, use historical data)
            features_scaled = self.scalers[scaler_key].fit_transform(features)
        else:
            features_scaled = self.scalers[scaler_key].transform(features)
        
        for model_name in self.ensemble_models:
            if model_name not in self.models:
                continue
            
            try:
                model = self.models[model_name]
                
                # For new models, create synthetic training data (in production, use real historical data)
                if not hasattr(model, 'n_features_in_') or model.n_features_in_ is None:
                    # Create synthetic training data for demonstration
                    X_synthetic, y_synthetic = self._create_synthetic_training_data(features_scaled.shape[1])
                    model.fit(X_synthetic, y_synthetic)
                
                # Make prediction
                if hasattr(model, 'predict_proba'):
                    # For classifiers, get probability of positive class
                    try:
                        pred_prob = model.predict_proba(features_scaled)[0]
                        if len(pred_prob) > 1:
                            prediction = pred_prob[1]  # Probability of positive class
                        else:
                            prediction = pred_prob[0]
                    except:
                        prediction = model.predict(features_scaled)[0]
                else:
                    # For regressors
                    prediction = model.predict(features_scaled)[0]
                
                # Ensure prediction is a valid probability
                prediction = max(0.01, min(0.99, prediction))
                
                # Calculate confidence (simplified)
                confidence = self._calculate_model_confidence(model, features_scaled, model_name)
                
                # Feature importance
                feature_importance = self._get_feature_importance(model, model_name)
                
                # Cross-validation score (simplified for demo)
                cv_score = 0.75  # Would calculate from actual cross-validation
                
                model_pred = ModelPrediction(
                    predicted_probability=prediction,
                    confidence=confidence,
                    feature_importance=feature_importance,
                    model_type=model_name,
                    cross_validation_score=cv_score
                )
                
                predictions.append(model_pred)
                
            except Exception as e:
                logger.warning(f"Error with model {model_name}: {e}")
                continue
        
        return predictions
    
    def _create_synthetic_training_data(self, n_features: int) -> Tuple[np.ndarray, np.ndarray]:
        """Create synthetic training data for demonstration (use real data in production)"""
        n_samples = 1000
        X = np.random.randn(n_samples, n_features)
        
        # Create realistic synthetic target based on features
        # This is a simplified example - use real historical outcomes in production
        y = (X.sum(axis=1) + np.random.normal(0, 0.1, n_samples)) / 10
        y = 1 / (1 + np.exp(-y))  # Sigmoid to get probabilities
        y = np.clip(y, 0.01, 0.99)
        
        return X, y
    
    def _calculate_ensemble_probability(self, predictions: List[ModelPrediction]) -> float:
        """Calculate ensemble probability with weighted average"""
        if not predictions:
            return 0.5  # Default neutral probability
        
        # Weight by confidence and cross-validation score
        weighted_sum = 0
        total_weight = 0
        
        for pred in predictions:
            weight = pred.confidence * pred.cross_validation_score
            weighted_sum += pred.predicted_probability * weight
            total_weight += weight
        
        if total_weight == 0:
            return np.mean([pred.predicted_probability for pred in predictions])
        
        ensemble_prob = weighted_sum / total_weight
        return max(0.01, min(0.99, ensemble_prob))
    
    def _calculate_moneyline_ev(self, offered_odds: float, true_probability: float) -> float:
        """Calculate expected value for moneyline bets"""
        if offered_odds > 0:
            # Positive American odds
            potential_profit = offered_odds / 100
            ev = (true_probability * potential_profit) - (1 - true_probability)
        else:
            # Negative American odds
            potential_profit = 100 / abs(offered_odds)
            ev = (true_probability * potential_profit) - (1 - true_probability)
        
        return ev
    
    def _calculate_spread_total_ev(self, offered_odds: float, true_probability: float) -> float:
        """Calculate expected value for spread/total bets"""
        # Most spread/total bets are at -110 odds
        if offered_odds == 0:
            offered_odds = -110
        
        if offered_odds > 0:
            potential_profit = offered_odds / 100
        else:
            potential_profit = 100 / abs(offered_odds)
        
        ev = (true_probability * potential_profit) - (1 - true_probability)
        return ev
    
    def _calculate_kelly_fraction(self,
                                offered_odds: float,
                                true_probability: float,
                                market_type: str) -> float:
        """Calculate Kelly Criterion fraction"""
        
        # Convert odds to decimal for Kelly calculation
        if offered_odds > 0:
            decimal_odds = (offered_odds / 100) + 1
        else:
            decimal_odds = (100 / abs(offered_odds)) + 1
        
        # Kelly formula: f = (bp - q) / b
        # where b = decimal odds - 1, p = true probability, q = 1 - p
        b = decimal_odds - 1
        p = true_probability
        q = 1 - p
        
        if b <= 0:
            return 0
        
        kelly_fraction = (b * p - q) / b
        
        # Return 0 if Kelly is negative (no edge)
        return max(0, kelly_fraction)
    
    def _calculate_confidence_interval(self,
                                     predictions: List[ModelPrediction],
                                     ensemble_prob: float) -> Tuple[float, float]:
        """Calculate confidence interval for probability estimate"""
        if not predictions:
            return (ensemble_prob * 0.8, ensemble_prob * 1.2)
        
        probs = [pred.predicted_probability for pred in predictions]
        
        # Calculate standard deviation of predictions
        std_dev = np.std(probs)
        
        # 95% confidence interval (approximately 2 standard deviations)
        lower_bound = max(0.01, ensemble_prob - 2 * std_dev)
        upper_bound = min(0.99, ensemble_prob + 2 * std_dev)
        
        return (lower_bound, upper_bound)
    
    def _assess_risk(self,
                    ev_percentage: float,
                    kelly_fraction: float,
                    predictions: List[ModelPrediction]) -> str:
        """Assess risk level of the bet"""
        
        # Model agreement factor
        if predictions:
            prob_std = np.std([pred.predicted_probability for pred in predictions])
            model_agreement = 1 - (prob_std / 0.5)  # Higher agreement = lower risk
        else:
            model_agreement = 0.5
        
        # Risk factors
        risk_factors = []
        
        if ev_percentage < 2:
            risk_factors.append("Low edge")
        
        if kelly_fraction > 0.1:
            risk_factors.append("High Kelly fraction")
        
        if model_agreement < 0.7:
            risk_factors.append("Model disagreement")
        
        # Overall risk assessment
        if not risk_factors:
            return "Low Risk"
        elif len(risk_factors) == 1:
            return "Moderate Risk"
        else:
            return "High Risk"
    
    def _generate_recommendation(self,
                               ev_percentage: float,
                               kelly_fraction: float,
                               risk_assessment: str) -> str:
        """Generate betting recommendation"""
        
        if ev_percentage < self.min_edge_threshold:
            return "AVOID - Insufficient edge"
        
        if kelly_fraction <= 0:
            return "AVOID - No Kelly edge"
        
        if risk_assessment == "High Risk" and ev_percentage < 5:
            return "AVOID - High risk, low reward"
        
        if ev_percentage >= 5 and kelly_fraction >= 0.05:
            return f"STRONG BET - {kelly_fraction:.1%} Kelly"
        
        if ev_percentage >= 2 and kelly_fraction >= 0.02:
            return f"MODERATE BET - {kelly_fraction:.1%} Kelly"
        
        return f"LIGHT BET - {kelly_fraction:.1%} Kelly"
    
    def _calculate_model_confidence(self,
                                  model: Any,
                                  features: np.ndarray,
                                  model_name: str) -> float:
        """Calculate confidence score for model prediction"""
        
        # This is a simplified confidence calculation
        # In practice, you might use prediction intervals, ensemble variance, etc.
        
        base_confidence = 0.7  # Base confidence for all models
        
        # Adjust based on model type
        if model_name in ['xgboost', 'lightgbm']:
            base_confidence += 0.1  # Boosting models tend to be more reliable
        elif model_name == 'neural_network':
            base_confidence += 0.05
        elif model_name in ['ridge', 'lasso']:
            base_confidence -= 0.1  # Linear models might be less flexible
        
        # Add some randomness to simulate real confidence variations
        confidence = base_confidence + np.random.normal(0, 0.05)
        
        return max(0.1, min(0.95, confidence))
    
    def _get_feature_importance(self, model: Any, model_name: str) -> Dict[str, float]:
        """Get feature importance from model"""
        
        feature_names = [
            'home_wins', 'home_losses', 'home_win_pct',
            'away_wins', 'away_losses', 'away_win_pct',
            'home_ppg', 'home_papg', 'home_diff',
            'away_ppg', 'away_papg', 'away_diff',
            'home_form', 'home_recent_diff',
            'away_form', 'away_recent_diff',
            'home_injuries_count', 'away_injuries_count',
            'home_injury_impact', 'away_injury_impact',
            'temperature', 'wind_speed', 'humidity', 'precipitation',
            'dome', 'altitude', 'capacity', 'home_record',
            'home_rest', 'away_rest', 'travel_distance',
            'h2h_home_wins', 'h2h_away_wins', 'h2h_avg_total', 'h2h_avg_diff',
            'public_home_pct', 'sharp_home_pct', 'opening_line', 'current_line',
            'game_hour', 'day_of_week', 'month', 'weekend'
        ]
        
        try:
            if hasattr(model, 'feature_importances_'):
                importances = model.feature_importances_
            elif hasattr(model, 'coef_'):
                importances = np.abs(model.coef_)
            else:
                # Create dummy importances
                importances = np.random.random(len(feature_names))
                importances = importances / importances.sum()
            
            # Ensure we have the right number of features
            if len(importances) != len(feature_names):
                importances = np.random.random(len(feature_names))
                importances = importances / importances.sum()
            
            return dict(zip(feature_names, importances))
            
        except:
            # Return equal importance if we can't extract
            return {name: 1.0/len(feature_names) for name in feature_names}
    
    def _odds_to_probability(self, odds: float, market_type: str) -> float:
        """Convert odds to implied probability"""
        if odds > 0:
            return 100 / (odds + 100)
        else:
            return abs(odds) / (abs(odds) + 100)
    
    def _probability_to_odds(self, probability: float, market_type: str) -> float:
        """Convert probability to fair odds"""
        if probability >= 0.5:
            return -(probability / (1 - probability)) * 100
        else:
            return ((1 - probability) / probability) * 100
    
    def train_models(self,
                    historical_data: pd.DataFrame,
                    target_column: str,
                    sport: str,
                    market_type: str) -> Dict[str, float]:
        """Train models on historical data"""
        
        logger.info(f"Training models for {sport} {market_type}")
        
        # Prepare features and target
        feature_columns = [col for col in historical_data.columns if col != target_column]
        X = historical_data[feature_columns].values
        y = historical_data[target_column].values
        
        # Scale features
        scaler_key = f"{sport}_{market_type}"
        if scaler_key not in self.scalers:
            self.scalers[scaler_key] = StandardScaler()
        
        X_scaled = self.scalers[scaler_key].fit_transform(X)
        
        # Train each model and calculate performance
        model_scores = {}
        
        # Use time series split for validation
        tscv = TimeSeriesSplit(n_splits=5)
        
        for model_name, model in self.models.items():
            try:
                # Cross-validation
                cv_scores = cross_val_score(model, X_scaled, y, cv=tscv, scoring='neg_mean_squared_error')
                
                # Train on full dataset
                model.fit(X_scaled, y)
                
                # Store performance
                model_scores[model_name] = {
                    'cv_score': -cv_scores.mean(),
                    'cv_std': cv_scores.std(),
                    'n_features': X_scaled.shape[1],
                    'n_samples': X_scaled.shape[0]
                }
                
                logger.info(f"Trained {model_name}: CV Score = {-cv_scores.mean():.4f}")
                
            except Exception as e:
                logger.error(f"Error training {model_name}: {e}")
                model_scores[model_name] = {'error': str(e)}
        
        return model_scores
    
    def save_models(self, save_path: str):
        """Save trained models and scalers"""
        try:
            model_data = {
                'models': self.models,
                'scalers': self.scalers,
                'feature_encoders': self.feature_encoders,
                'config': self.config
            }
            
            joblib.dump(model_data, save_path)
            logger.info(f"Models saved to {save_path}")
            
        except Exception as e:
            logger.error(f"Error saving models: {e}")
    
    def load_models(self, load_path: str):
        """Load trained models and scalers"""
        try:
            model_data = joblib.load(load_path)
            
            self.models = model_data['models']
            self.scalers = model_data['scalers']
            self.feature_encoders = model_data['feature_encoders']
            
            logger.info(f"Models loaded from {load_path}")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
    
    def batch_calculate_ev(self,
                          betting_opportunities: List[Dict[str, Any]]) -> List[EVCalculation]:
        """Calculate EV for multiple betting opportunities"""
        
        ev_calculations = []
        
        for opportunity in betting_opportunities:
            try:
                game_data = opportunity.get('game_data', {})
                betting_line = opportunity.get('betting_line', {})
                historical_data = opportunity.get('historical_data', None)
                
                ev_calc = self.calculate_expected_value(game_data, betting_line, historical_data)
                ev_calculations.append(ev_calc)
                
            except Exception as e:
                logger.error(f"Error calculating EV for opportunity: {e}")
                continue
        
        # Sort by expected value percentage
        ev_calculations.sort(key=lambda x: x.expected_value_percentage, reverse=True)
        
        return ev_calculations
    
    def get_model_summary(self) -> Dict[str, Any]:
        """Get summary of model performance and status"""
        
        summary = {
            'models_available': list(self.models.keys()),
            'scalers_fitted': list(self.scalers.keys()),
            'config': self.config,
            'last_updated': datetime.now().isoformat()
        }
        
        return summary