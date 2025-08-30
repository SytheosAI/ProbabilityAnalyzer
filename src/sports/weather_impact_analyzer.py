"""
Weather Impact Analysis for Sports Statistics
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from scipy import stats
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
import logging
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

@dataclass
class WeatherImpactProfile:
    """Weather impact profile for a specific stat"""
    stat_name: str
    sport: str
    optimal_conditions: Dict[str, float]
    impact_factors: Dict[str, float]
    adjustment_curves: Dict[str, Any]
    historical_correlation: float
    confidence_level: float

class WeatherImpactAnalyzer:
    """Analyze how weather affects sports statistics"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.impact_profiles = {}
        self.models = {}
        
        # Sport-specific weather impact configurations
        self.sport_weather_configs = {
            'NFL': {
                'critical_factors': ['wind_speed', 'temperature', 'precipitation', 'humidity'],
                'thresholds': {
                    'wind_speed': {'low': 10, 'medium': 20, 'high': 30},
                    'temperature': {'cold': 32, 'cool': 50, 'moderate': 70, 'warm': 85, 'hot': 95},
                    'precipitation': {'light': 0.1, 'moderate': 0.5, 'heavy': 1.0},
                    'humidity': {'dry': 30, 'normal': 60, 'humid': 80}
                }
            },
            'MLB': {
                'critical_factors': ['temperature', 'humidity', 'wind_speed', 'wind_direction', 'pressure'],
                'thresholds': {
                    'temperature': {'cold': 50, 'cool': 65, 'moderate': 75, 'warm': 85, 'hot': 95},
                    'humidity': {'dry': 30, 'normal': 50, 'humid': 70},
                    'wind_speed': {'calm': 5, 'light': 10, 'moderate': 15, 'strong': 20},
                    'pressure': {'low': 29.80, 'normal': 30.00, 'high': 30.20}
                }
            },
            'NBA': {
                'critical_factors': [],  # Indoor sport
                'thresholds': {}
            },
            'NHL': {
                'critical_factors': [],  # Indoor sport
                'thresholds': {}
            },
            'SOCCER': {
                'critical_factors': ['wind_speed', 'precipitation', 'temperature', 'field_conditions'],
                'thresholds': {
                    'wind_speed': {'calm': 10, 'moderate': 20, 'strong': 30},
                    'precipitation': {'dry': 0, 'light': 0.2, 'moderate': 0.5, 'heavy': 1.0},
                    'temperature': {'cold': 32, 'cool': 50, 'moderate': 70, 'warm': 85}
                }
            }
        }
        
        # Statistical category weather sensitivities
        self.stat_weather_sensitivity = {
            'NFL': {
                'passing_yards': {
                    'wind_speed': -0.015,  # -1.5% per mph over 10
                    'precipitation': -0.20,  # -20% in rain
                    'temperature': {'cold': -0.15, 'hot': -0.05},
                    'optimal': {'wind_speed': 5, 'temperature': 70, 'precipitation': 0}
                },
                'completion_pct': {
                    'wind_speed': -0.008,
                    'precipitation': -0.15,
                    'temperature': {'cold': -0.10, 'hot': -0.03},
                    'optimal': {'wind_speed': 3, 'temperature': 68, 'precipitation': 0}
                },
                'field_goals_made': {
                    'wind_speed': -0.025,
                    'precipitation': -0.10,
                    'temperature': {'cold': -0.12},
                    'optimal': {'wind_speed': 0, 'temperature': 72, 'precipitation': 0}
                },
                'rushing_yards': {
                    'wind_speed': 0.005,  # Slight positive in wind
                    'precipitation': 0.05,  # Better for running game
                    'temperature': {'cold': 0.03},
                    'optimal': {'wind_speed': 15, 'temperature': 50, 'precipitation': 0}
                },
                'turnovers': {
                    'wind_speed': 0.015,
                    'precipitation': 0.25,
                    'temperature': {'cold': 0.10},
                    'optimal': {'wind_speed': 0, 'temperature': 70, 'precipitation': 0}
                }
            },
            'MLB': {
                'batting_average': {
                    'temperature': {'cold': -0.08, 'hot': 0.05},
                    'humidity': -0.002,
                    'pressure': 0.10,  # Higher in low pressure
                    'optimal': {'temperature': 80, 'humidity': 40, 'pressure': 29.90}
                },
                'home_runs': {
                    'temperature': 0.003,  # +0.3% per degree over 70
                    'humidity': -0.004,
                    'wind_speed': {'tailwind': 0.20, 'headwind': -0.30},
                    'altitude': 0.0001,  # Per foot elevation
                    'optimal': {'temperature': 85, 'humidity': 30, 'wind_speed': 10}
                },
                'earned_run_average': {
                    'temperature': -0.002,
                    'humidity': 0.003,
                    'wind_speed': -0.005,
                    'optimal': {'temperature': 65, 'humidity': 60, 'wind_speed': 5}
                },
                'strikeouts_pitching': {
                    'temperature': {'cold': 0.05, 'hot': -0.03},
                    'humidity': 0.002,
                    'optimal': {'temperature': 60, 'humidity': 50}
                }
            },
            'SOCCER': {
                'goals': {
                    'wind_speed': -0.010,
                    'precipitation': -0.15,
                    'temperature': {'cold': -0.08, 'hot': -0.10},
                    'optimal': {'wind_speed': 5, 'temperature': 65, 'precipitation': 0}
                },
                'shots_on_target': {
                    'wind_speed': -0.012,
                    'precipitation': -0.10,
                    'optimal': {'wind_speed': 3, 'precipitation': 0}
                },
                'pass_accuracy': {
                    'wind_speed': -0.005,
                    'precipitation': -0.08,
                    'field_conditions': {'wet': -0.12, 'muddy': -0.20},
                    'optimal': {'wind_speed': 0, 'precipitation': 0}
                }
            }
        }
    
    def analyze_weather_impact(self,
                              weather_data: Dict[str, Any],
                              stat_name: str,
                              sport: str,
                              base_value: float) -> Dict[str, Any]:
        """Analyze weather impact on a specific statistic"""
        sport_upper = sport.upper()
        
        # Check if sport has weather impacts
        if sport_upper not in self.sport_weather_configs:
            return {
                'adjusted_value': base_value,
                'impact_percentage': 0.0,
                'factors': {},
                'confidence': 1.0
            }
        
        # Indoor sports have no weather impact
        if not self.sport_weather_configs[sport_upper]['critical_factors']:
            return {
                'adjusted_value': base_value,
                'impact_percentage': 0.0,
                'factors': {'indoor_sport': True},
                'confidence': 1.0
            }
        
        # Get stat sensitivity profile
        if sport_upper not in self.stat_weather_sensitivity:
            return self._default_impact_response(base_value)
        
        sport_sensitivities = self.stat_weather_sensitivity[sport_upper]
        if stat_name not in sport_sensitivities:
            return self._default_impact_response(base_value)
        
        sensitivity_profile = sport_sensitivities[stat_name]
        
        # Calculate cumulative impact
        total_impact = 0.0
        impact_factors = {}
        
        # Wind impact
        if 'wind_speed' in weather_data and 'wind_speed' in sensitivity_profile:
            wind_impact = self._calculate_wind_impact(
                weather_data['wind_speed'],
                sensitivity_profile['wind_speed'],
                weather_data.get('wind_direction'),
                sport_upper
            )
            total_impact += wind_impact
            impact_factors['wind'] = wind_impact
        
        # Temperature impact
        if 'temperature' in weather_data and 'temperature' in sensitivity_profile:
            temp_impact = self._calculate_temperature_impact(
                weather_data['temperature'],
                sensitivity_profile['temperature'],
                sport_upper
            )
            total_impact += temp_impact
            impact_factors['temperature'] = temp_impact
        
        # Precipitation impact
        if 'precipitation' in weather_data and 'precipitation' in sensitivity_profile:
            precip_impact = self._calculate_precipitation_impact(
                weather_data['precipitation'],
                sensitivity_profile['precipitation']
            )
            total_impact += precip_impact
            impact_factors['precipitation'] = precip_impact
        
        # Humidity impact
        if 'humidity' in weather_data and 'humidity' in sensitivity_profile:
            humidity_impact = self._calculate_humidity_impact(
                weather_data['humidity'],
                sensitivity_profile['humidity']
            )
            total_impact += humidity_impact
            impact_factors['humidity'] = humidity_impact
        
        # Pressure impact (mainly for baseball)
        if 'pressure' in weather_data and 'pressure' in sensitivity_profile:
            pressure_impact = self._calculate_pressure_impact(
                weather_data['pressure'],
                sensitivity_profile['pressure']
            )
            total_impact += pressure_impact
            impact_factors['pressure'] = pressure_impact
        
        # Apply adjustments
        adjusted_value = base_value * (1 + total_impact)
        
        # Calculate confidence based on data quality
        confidence = self._calculate_confidence(weather_data, impact_factors)
        
        return {
            'adjusted_value': adjusted_value,
            'impact_percentage': total_impact * 100,
            'factors': impact_factors,
            'optimal_conditions': sensitivity_profile.get('optimal', {}),
            'confidence': confidence,
            'severity': self._categorize_impact_severity(total_impact)
        }
    
    def create_weather_adjustment_model(self,
                                       historical_data: pd.DataFrame,
                                       stat_name: str,
                                       sport: str) -> Any:
        """Create ML model for weather adjustments"""
        if historical_data.empty:
            return None
        
        # Prepare features
        weather_features = ['temperature', 'humidity', 'wind_speed', 'pressure', 'precipitation']
        available_features = [f for f in weather_features if f in historical_data.columns]
        
        if not available_features or stat_name not in historical_data.columns:
            return None
        
        X = historical_data[available_features].fillna(historical_data[available_features].mean())
        y = historical_data[stat_name].fillna(historical_data[stat_name].mean())
        
        # Create ensemble model
        rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
        gb_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        lr_model = LinearRegression()
        
        # Train models
        rf_model.fit(X, y)
        gb_model.fit(X, y)
        lr_model.fit(X, y)
        
        # Store ensemble
        model_key = f"{sport}_{stat_name}"
        self.models[model_key] = {
            'random_forest': rf_model,
            'gradient_boost': gb_model,
            'linear': lr_model,
            'features': available_features,
            'feature_importance': dict(zip(available_features, rf_model.feature_importances_))
        }
        
        return self.models[model_key]
    
    def predict_with_weather(self,
                           weather_data: Dict[str, Any],
                           stat_name: str,
                           sport: str,
                           player_baseline: float) -> Dict[str, Any]:
        """Predict performance with weather conditions"""
        model_key = f"{sport}_{stat_name}"
        
        if model_key not in self.models:
            # Fall back to rule-based adjustments
            return self.analyze_weather_impact(weather_data, stat_name, sport, player_baseline)
        
        model_ensemble = self.models[model_key]
        features = model_ensemble['features']
        
        # Prepare input
        X_input = []
        for feature in features:
            X_input.append(weather_data.get(feature, 0))
        X_input = np.array(X_input).reshape(1, -1)
        
        # Get predictions from ensemble
        rf_pred = model_ensemble['random_forest'].predict(X_input)[0]
        gb_pred = model_ensemble['gradient_boost'].predict(X_input)[0]
        lr_pred = model_ensemble['linear'].predict(X_input)[0]
        
        # Weighted average
        ensemble_pred = (rf_pred * 0.4 + gb_pred * 0.4 + lr_pred * 0.2)
        
        # Calculate adjustment factor
        adjustment_factor = (ensemble_pred - player_baseline) / player_baseline if player_baseline != 0 else 0
        
        return {
            'predicted_value': ensemble_pred,
            'adjustment_factor': adjustment_factor,
            'model_predictions': {
                'random_forest': rf_pred,
                'gradient_boost': gb_pred,
                'linear': lr_pred
            },
            'feature_importance': model_ensemble['feature_importance'],
            'confidence': self._calculate_model_confidence(model_ensemble, X_input)
        }
    
    def get_historical_weather_performance(self,
                                          entity_id: str,
                                          stat_name: str,
                                          weather_conditions: str) -> Dict[str, Any]:
        """Get historical performance in specific weather conditions"""
        # This would query historical database
        # Returns sample structure for now
        return {
            'games_played': 0,
            'average': 0.0,
            'std_dev': 0.0,
            'best': 0.0,
            'worst': 0.0,
            'trend': 'stable'
        }
    
    def _calculate_wind_impact(self,
                              wind_speed: float,
                              sensitivity: Union[float, Dict],
                              wind_direction: Optional[str],
                              sport: str) -> float:
        """Calculate wind impact on statistic"""
        if isinstance(sensitivity, dict):
            # Direction-specific impact (e.g., baseball)
            if wind_direction:
                if 'tailwind' in sensitivity and wind_direction in ['out', 'tailwind']:
                    return sensitivity['tailwind'] * (wind_speed / 10)
                elif 'headwind' in sensitivity and wind_direction in ['in', 'headwind']:
                    return sensitivity['headwind'] * (wind_speed / 10)
            return 0.0
        else:
            # Linear impact based on wind speed
            if wind_speed <= 5:
                return 0.0
            elif wind_speed <= 10:
                return sensitivity * (wind_speed - 5)
            elif wind_speed <= 20:
                return sensitivity * (wind_speed - 5) * 1.5  # Accelerating impact
            else:
                return sensitivity * 15 * 2.0  # Severe impact
    
    def _calculate_temperature_impact(self,
                                     temperature: float,
                                     sensitivity: Union[float, Dict],
                                     sport: str) -> float:
        """Calculate temperature impact on statistic"""
        if isinstance(sensitivity, dict):
            if temperature < 32:
                return sensitivity.get('cold', -0.10)
            elif temperature > 90:
                return sensitivity.get('hot', -0.05)
            else:
                return 0.0
        else:
            # Linear impact from optimal temperature
            optimal_temp = 70
            deviation = abs(temperature - optimal_temp)
            if deviation <= 10:
                return 0.0
            else:
                return sensitivity * (deviation - 10) / 10
    
    def _calculate_precipitation_impact(self,
                                       precipitation: float,
                                       sensitivity: Union[float, Dict]) -> float:
        """Calculate precipitation impact on statistic"""
        if isinstance(sensitivity, dict):
            if precipitation < 0.1:
                return 0.0
            elif precipitation < 0.5:
                return sensitivity.get('light', -0.05)
            elif precipitation < 1.0:
                return sensitivity.get('moderate', -0.15)
            else:
                return sensitivity.get('heavy', -0.25)
        else:
            # Simple linear impact
            if precipitation < 0.1:
                return 0.0
            else:
                return sensitivity * min(precipitation, 1.0)
    
    def _calculate_humidity_impact(self,
                                  humidity: float,
                                  sensitivity: float) -> float:
        """Calculate humidity impact on statistic"""
        optimal_humidity = 50
        deviation = abs(humidity - optimal_humidity)
        
        if deviation <= 20:
            return 0.0
        else:
            return sensitivity * (deviation - 20) / 30
    
    def _calculate_pressure_impact(self,
                                  pressure: float,
                                  sensitivity: float) -> float:
        """Calculate barometric pressure impact (mainly for baseball)"""
        standard_pressure = 30.00
        deviation = pressure - standard_pressure
        
        # Lower pressure = ball travels farther
        return -sensitivity * deviation * 10  # Negative because lower pressure helps hitting
    
    def _categorize_impact_severity(self, impact: float) -> str:
        """Categorize the severity of weather impact"""
        abs_impact = abs(impact)
        if abs_impact < 0.05:
            return 'minimal'
        elif abs_impact < 0.10:
            return 'minor'
        elif abs_impact < 0.20:
            return 'moderate'
        elif abs_impact < 0.30:
            return 'significant'
        else:
            return 'severe'
    
    def _calculate_confidence(self,
                            weather_data: Dict[str, Any],
                            impact_factors: Dict[str, float]) -> float:
        """Calculate confidence in weather impact assessment"""
        confidence = 1.0
        
        # Reduce confidence for missing data
        expected_fields = ['temperature', 'wind_speed', 'humidity', 'pressure']
        missing_fields = sum(1 for field in expected_fields if field not in weather_data)
        confidence -= missing_fields * 0.1
        
        # Reduce confidence for extreme impacts
        max_impact = max(abs(v) for v in impact_factors.values()) if impact_factors else 0
        if max_impact > 0.3:
            confidence -= 0.2
        
        return max(0.3, confidence)
    
    def _calculate_model_confidence(self,
                                  model_ensemble: Dict[str, Any],
                                  X_input: np.ndarray) -> float:
        """Calculate confidence in model predictions"""
        # Get predictions from all models
        rf_pred = model_ensemble['random_forest'].predict(X_input)[0]
        gb_pred = model_ensemble['gradient_boost'].predict(X_input)[0]
        lr_pred = model_ensemble['linear'].predict(X_input)[0]
        
        # Calculate standard deviation of predictions
        predictions = [rf_pred, gb_pred, lr_pred]
        std_dev = np.std(predictions)
        mean_pred = np.mean(predictions)
        
        # Higher agreement = higher confidence
        if mean_pred != 0:
            cv = std_dev / abs(mean_pred)  # Coefficient of variation
            confidence = max(0.3, 1.0 - cv)
        else:
            confidence = 0.5
        
        return confidence
    
    def _default_impact_response(self, base_value: float) -> Dict[str, Any]:
        """Default response when no specific impact data available"""
        return {
            'adjusted_value': base_value,
            'impact_percentage': 0.0,
            'factors': {},
            'confidence': 0.5,
            'note': 'No specific weather impact data available for this statistic'
        }