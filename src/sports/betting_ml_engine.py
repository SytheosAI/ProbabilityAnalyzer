"""
Advanced ML engine specifically designed for sports betting predictions
"""
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
import optuna
import shap
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SportsBettingTransformer(nn.Module):
    """
    Transformer-based model for sports betting predictions
    """
    def __init__(self, input_dim: int, d_model: int = 256, nhead: int = 8, 
                 num_layers: int = 6, dropout: float = 0.1):
        super(SportsBettingTransformer, self).__init__()
        
        self.input_projection = nn.Linear(input_dim, d_model)
        self.positional_encoding = PositionalEncoding(d_model, dropout)
        
        encoder_layers = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dropout=dropout,
            batch_first=True
        )
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers)
        
        self.output_layers = nn.Sequential(
            nn.Linear(d_model, d_model // 2),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, d_model // 4),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 4, 3)  # Win/Loss/Push probabilities
        )
        
    def forward(self, x, mask=None):
        x = self.input_projection(x)
        x = self.positional_encoding(x)
        x = self.transformer_encoder(x, mask)
        x = x.mean(dim=1)  # Global average pooling
        return self.output_layers(x)

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, dropout: float = 0.1, max_len: int = 5000):
        super().__init__()
        self.dropout = nn.Dropout(p=dropout)
        
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-np.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe)
        
    def forward(self, x):
        x = x + self.pe[:x.size(0)]
        return self.dropout(x)

class BettingMLEngine:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Initialize models
        self.transformer_model = None
        self.xgb_model = None
        self.lgb_model = None
        self.rf_model = None
        self.gb_model = None
        
        # Feature engineering
        self.scaler = StandardScaler()
        self.feature_importance = {}
        
        # Model performance tracking
        self.model_performance = {
            'transformer': {'roi': 0, 'accuracy': 0, 'precision': 0},
            'xgboost': {'roi': 0, 'accuracy': 0, 'precision': 0},
            'lightgbm': {'roi': 0, 'accuracy': 0, 'precision': 0},
            'ensemble': {'roi': 0, 'accuracy': 0, 'precision': 0}
        }
        
    def engineer_features(self, game_data: Dict[str, Any]) -> np.ndarray:
        """
        Create comprehensive feature set for ML models
        """
        features = []
        
        # Team strength features
        features.extend([
            game_data['home_team']['elo_rating'],
            game_data['away_team']['elo_rating'],
            game_data['home_team']['offensive_rating'],
            game_data['home_team']['defensive_rating'],
            game_data['away_team']['offensive_rating'],
            game_data['away_team']['defensive_rating']
        ])
        
        # Recent form features (weighted by recency)
        home_form = self._calculate_weighted_form(game_data['home_team']['recent_games'])
        away_form = self._calculate_weighted_form(game_data['away_team']['recent_games'])
        features.extend([home_form, away_form])
        
        # Head-to-head features
        h2h = game_data.get('h2h_history', {})
        features.extend([
            h2h.get('home_win_pct', 0.5),
            h2h.get('avg_total', 0),
            h2h.get('avg_margin', 0),
            h2h.get('home_cover_rate', 0.5)
        ])
        
        # Situational features
        features.extend([
            game_data['home_team']['rest_days'],
            game_data['away_team']['rest_days'],
            game_data['home_team']['travel_distance'],
            game_data['away_team']['travel_distance'],
            int(game_data.get('is_divisional', False)),
            int(game_data.get('is_primetime', False)),
            game_data.get('playoff_implications', 0)
        ])
        
        # Injury impact
        home_injury_impact = self._calculate_injury_impact(game_data['home_team']['injuries'])
        away_injury_impact = self._calculate_injury_impact(game_data['away_team']['injuries'])
        features.extend([home_injury_impact, away_injury_impact])
        
        # Pace and style matchup
        pace_diff = game_data['home_team']['pace'] - game_data['away_team']['pace']
        style_matchup = self._calculate_style_matchup(
            game_data['home_team']['style'],
            game_data['away_team']['style']
        )
        features.extend([pace_diff, style_matchup])
        
        # Betting market features
        betting = game_data.get('betting_data', {})
        features.extend([
            betting.get('line_movement', 0),
            betting.get('public_home_pct', 50),
            betting.get('sharp_home_pct', 50),
            betting.get('reverse_line_movement', 0),
            betting.get('total_movement', 0)
        ])
        
        # Weather features (for outdoor sports)
        if game_data.get('weather'):
            weather = game_data['weather']
            features.extend([
                weather.get('temperature', 70),
                weather.get('wind_speed', 0),
                weather.get('precipitation', 0),
                weather.get('humidity', 50)
            ])
        else:
            features.extend([70, 0, 0, 50])  # Default weather
        
        # Referee/Umpire tendencies
        ref_data = game_data.get('referee_data', {})
        features.extend([
            ref_data.get('home_win_rate', 0.5),
            ref_data.get('avg_total', 0),
            ref_data.get('foul_rate', 0)
        ])
        
        # Advanced metrics
        features.extend([
            game_data['home_team'].get('pythagorean_expectation', 0.5),
            game_data['away_team'].get('pythagorean_expectation', 0.5),
            game_data['home_team'].get('strength_of_schedule', 0),
            game_data['away_team'].get('strength_of_schedule', 0),
            game_data['home_team'].get('clutch_rating', 0),
            game_data['away_team'].get('clutch_rating', 0)
        ])
        
        return np.array(features)
    
    def train_ensemble_models(self, training_data: pd.DataFrame, 
                            target_col: str = 'outcome') -> Dict[str, Any]:
        """
        Train multiple ML models for ensemble predictions
        """
        X = training_data.drop(columns=[target_col])
        y = training_data[target_col]
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Time series split for sports data
        tscv = TimeSeriesSplit(n_splits=5)
        
        # Train XGBoost
        self.xgb_model = self._train_xgboost(X_scaled, y, tscv)
        
        # Train LightGBM
        self.lgb_model = self._train_lightgbm(X_scaled, y, tscv)
        
        # Train Random Forest
        self.rf_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=10,
            random_state=42
        )
        self.rf_model.fit(X_scaled, y)
        
        # Train Gradient Boosting
        self.gb_model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.05,
            max_depth=7,
            random_state=42
        )
        self.gb_model.fit(X_scaled, y)
        
        # Train Transformer
        self._train_transformer(X_scaled, y)
        
        # Calculate feature importance
        self._calculate_feature_importance(X.columns)
        
        return {
            'models_trained': ['xgboost', 'lightgbm', 'random_forest', 'gradient_boosting', 'transformer'],
            'feature_importance': self.feature_importance,
            'performance_metrics': self.model_performance
        }
    
    def predict_game_outcome(self, game_features: np.ndarray) -> Dict[str, Any]:
        """
        Generate predictions using ensemble of models
        """
        features_scaled = self.scaler.transform(game_features.reshape(1, -1))
        
        predictions = {}
        
        # XGBoost prediction
        if self.xgb_model:
            xgb_pred = self.xgb_model.predict_proba(features_scaled)[0]
            predictions['xgboost'] = {
                'home_win_prob': xgb_pred[1] if len(xgb_pred) > 1 else xgb_pred[0],
                'confidence': max(xgb_pred)
            }
        
        # LightGBM prediction
        if self.lgb_model:
            lgb_pred = self.lgb_model.predict(features_scaled)[0]
            predictions['lightgbm'] = {
                'home_win_prob': lgb_pred,
                'confidence': abs(lgb_pred - 0.5) * 2
            }
        
        # Random Forest prediction
        if self.rf_model:
            rf_pred = self.rf_model.predict_proba(features_scaled)[0]
            predictions['random_forest'] = {
                'home_win_prob': rf_pred[1] if len(rf_pred) > 1 else rf_pred[0],
                'confidence': max(rf_pred)
            }
        
        # Gradient Boosting prediction
        if self.gb_model:
            gb_pred = self.gb_model.predict(features_scaled)[0]
            predictions['gradient_boosting'] = {
                'home_win_prob': 1 / (1 + np.exp(-gb_pred)),  # Sigmoid transformation
                'confidence': abs(gb_pred)
            }
        
        # Transformer prediction
        if self.transformer_model:
            self.transformer_model.eval()
            with torch.no_grad():
                features_tensor = torch.FloatTensor(features_scaled).to(self.device)
                trans_output = self.transformer_model(features_tensor.unsqueeze(0))
                trans_probs = torch.softmax(trans_output, dim=-1).cpu().numpy()[0]
                predictions['transformer'] = {
                    'home_win_prob': trans_probs[0],
                    'confidence': max(trans_probs)
                }
        
        # Ensemble prediction (weighted average)
        weights = self._get_model_weights()
        ensemble_prob = sum(
            predictions[model]['home_win_prob'] * weights[model]
            for model in predictions if model in weights
        )
        
        # Kelly Criterion for bet sizing
        kelly_fraction = self._calculate_kelly_criterion(ensemble_prob)
        
        return {
            'individual_predictions': predictions,
            'ensemble_probability': ensemble_prob,
            'recommended_bet': 'home' if ensemble_prob > 0.52 else 'away' if ensemble_prob < 0.48 else 'no_bet',
            'kelly_fraction': kelly_fraction,
            'confidence': self._calculate_prediction_confidence(predictions),
            'edge': abs(ensemble_prob - 0.5) * 100
        }
    
    def optimize_hyperparameters(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """
        Use Optuna for hyperparameter optimization
        """
        def xgb_objective(trial):
            params = {
                'max_depth': trial.suggest_int('max_depth', 3, 10),
                'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3),
                'n_estimators': trial.suggest_int('n_estimators', 100, 500),
                'subsample': trial.suggest_float('subsample', 0.6, 1.0),
                'colsample_bytree': trial.suggest_float('colsample_bytree', 0.6, 1.0),
                'gamma': trial.suggest_float('gamma', 0, 5),
                'reg_alpha': trial.suggest_float('reg_alpha', 0, 2),
                'reg_lambda': trial.suggest_float('reg_lambda', 0, 2)
            }
            
            model = xgb.XGBClassifier(**params, use_label_encoder=False, eval_metric='logloss')
            
            # Cross-validation
            tscv = TimeSeriesSplit(n_splits=3)
            scores = []
            for train_idx, val_idx in tscv.split(X):
                X_train, X_val = X[train_idx], X[val_idx]
                y_train, y_val = y[train_idx], y[val_idx]
                
                model.fit(X_train, y_train)
                pred = model.predict_proba(X_val)[:, 1]
                score = -np.log(np.mean(np.abs(pred - y_val)))  # Log loss
                scores.append(score)
            
            return np.mean(scores)
        
        study = optuna.create_study(direction='maximize')
        study.optimize(xgb_objective, n_trials=50)
        
        return study.best_params
    
    def backtest_strategy(self, historical_data: pd.DataFrame, 
                         starting_bankroll: float = 10000) -> Dict[str, Any]:
        """
        Backtest betting strategy on historical data
        """
        bankroll = starting_bankroll
        bets_placed = []
        roi_history = []
        
        for idx, game in historical_data.iterrows():
            features = self.engineer_features(game.to_dict())
            prediction = self.predict_game_outcome(features)
            
            if prediction['recommended_bet'] != 'no_bet':
                # Calculate bet size using Kelly Criterion
                bet_size = bankroll * prediction['kelly_fraction']
                bet_size = min(bet_size, bankroll * 0.05)  # Max 5% of bankroll
                
                # Simulate bet outcome
                odds = game['odds']
                actual_outcome = game['actual_outcome']
                
                if prediction['recommended_bet'] == actual_outcome:
                    profit = bet_size * (odds - 1)
                    bankroll += profit
                    result = 'win'
                else:
                    bankroll -= bet_size
                    result = 'loss'
                
                bets_placed.append({
                    'game_id': game.get('game_id'),
                    'bet': prediction['recommended_bet'],
                    'stake': bet_size,
                    'odds': odds,
                    'result': result,
                    'bankroll': bankroll
                })
                
                roi = ((bankroll - starting_bankroll) / starting_bankroll) * 100
                roi_history.append(roi)
        
        # Calculate performance metrics
        total_bets = len(bets_placed)
        wins = sum(1 for bet in bets_placed if bet['result'] == 'win')
        win_rate = wins / total_bets if total_bets > 0 else 0
        
        final_roi = ((bankroll - starting_bankroll) / starting_bankroll) * 100
        max_drawdown = self._calculate_max_drawdown([bet['bankroll'] for bet in bets_placed])
        sharpe_ratio = self._calculate_sharpe_ratio(roi_history)
        
        return {
            'final_bankroll': bankroll,
            'total_return': bankroll - starting_bankroll,
            'roi': final_roi,
            'total_bets': total_bets,
            'win_rate': win_rate,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe_ratio,
            'bet_history': bets_placed,
            'roi_history': roi_history
        }
    
    def _train_xgboost(self, X: np.ndarray, y: np.ndarray, cv) -> xgb.XGBClassifier:
        """Train XGBoost model"""
        params = {
            'max_depth': 6,
            'learning_rate': 0.05,
            'n_estimators': 300,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'gamma': 1,
            'reg_alpha': 0.5,
            'reg_lambda': 1,
            'use_label_encoder': False,
            'eval_metric': 'logloss'
        }
        
        model = xgb.XGBClassifier(**params)
        model.fit(X, y)
        return model
    
    def _train_lightgbm(self, X: np.ndarray, y: np.ndarray, cv) -> lgb.LGBMClassifier:
        """Train LightGBM model"""
        params = {
            'num_leaves': 31,
            'max_depth': -1,
            'learning_rate': 0.05,
            'n_estimators': 300,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'reg_alpha': 0.5,
            'reg_lambda': 1,
            'random_state': 42
        }
        
        model = lgb.LGBMClassifier(**params)
        model.fit(X, y)
        return model
    
    def _train_transformer(self, X: np.ndarray, y: np.ndarray):
        """Train Transformer model"""
        self.transformer_model = SportsBettingTransformer(
            input_dim=X.shape[1],
            d_model=256,
            nhead=8,
            num_layers=6,
            dropout=0.1
        ).to(self.device)
        
        # Convert to tensors
        X_tensor = torch.FloatTensor(X).to(self.device)
        y_tensor = torch.LongTensor(y).to(self.device)
        
        # Create dataset and dataloader
        dataset = TensorDataset(X_tensor.unsqueeze(1), y_tensor)
        dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
        
        # Training
        optimizer = optim.AdamW(self.transformer_model.parameters(), lr=0.001)
        criterion = nn.CrossEntropyLoss()
        
        self.transformer_model.train()
        for epoch in range(50):
            total_loss = 0
            for batch_X, batch_y in dataloader:
                optimizer.zero_grad()
                output = self.transformer_model(batch_X)
                loss = criterion(output, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            if epoch % 10 == 0:
                logger.info(f"Transformer Epoch {epoch}, Loss: {total_loss/len(dataloader):.4f}")
    
    def _calculate_weighted_form(self, recent_games: List[Dict]) -> float:
        """Calculate weighted recent form"""
        if not recent_games:
            return 0.5
        
        weights = np.exp(-np.arange(len(recent_games)) * 0.2)  # Exponential decay
        weights /= weights.sum()
        
        results = [1 if game['result'] == 'W' else 0 for game in recent_games]
        weighted_form = np.dot(weights, results)
        
        return weighted_form
    
    def _calculate_injury_impact(self, injuries: List[Dict]) -> float:
        """Calculate cumulative injury impact"""
        if not injuries:
            return 0
        
        total_impact = 0
        for injury in injuries:
            player_value = injury.get('war', 0)  # Wins Above Replacement
            games_missed = injury.get('games_missed', 0)
            severity = injury.get('severity', 0.5)
            
            impact = player_value * severity * (games_missed / 82)  # Normalized by season length
            total_impact += impact
        
        return min(total_impact, 1.0)
    
    def _calculate_style_matchup(self, home_style: Dict, away_style: Dict) -> float:
        """Calculate style matchup advantage"""
        advantage = 0
        
        # Example: Fast pace vs slow pace
        if home_style.get('pace') > away_style.get('pace'):
            if home_style.get('transition_efficiency') > away_style.get('halfcourt_defense'):
                advantage += 0.1
        
        # Three-point shooting vs perimeter defense
        if home_style.get('three_point_rate') > 0.35:
            if away_style.get('perimeter_defense') < 0.35:
                advantage += 0.1
        
        return advantage
    
    def _get_model_weights(self) -> Dict[str, float]:
        """Get model weights based on recent performance"""
        # In production, these would be dynamically calculated based on recent accuracy
        return {
            'xgboost': 0.25,
            'lightgbm': 0.25,
            'random_forest': 0.15,
            'gradient_boosting': 0.15,
            'transformer': 0.20
        }
    
    def _calculate_kelly_criterion(self, win_prob: float, odds: float = 1.91) -> float:
        """Calculate optimal bet size using Kelly Criterion"""
        if win_prob <= 0 or win_prob >= 1:
            return 0
        
        q = 1 - win_prob
        b = odds - 1
        
        kelly = (b * win_prob - q) / b
        
        # Apply fractional Kelly (25%) for safety
        kelly_fraction = max(0, min(kelly * 0.25, 0.05))  # Cap at 5% of bankroll
        
        return kelly_fraction
    
    def _calculate_prediction_confidence(self, predictions: Dict) -> float:
        """Calculate overall prediction confidence"""
        confidences = [pred['confidence'] for pred in predictions.values()]
        
        # Agreement between models
        probs = [pred['home_win_prob'] for pred in predictions.values()]
        std_dev = np.std(probs)
        agreement_score = 1 - (std_dev * 2)  # Lower std = higher agreement
        
        # Average confidence
        avg_confidence = np.mean(confidences)
        
        return (agreement_score * 0.6 + avg_confidence * 0.4)
    
    def _calculate_feature_importance(self, feature_names: List[str]):
        """Calculate and store feature importance from all models"""
        importance_scores = {}
        
        if self.xgb_model:
            importance_scores['xgboost'] = dict(zip(feature_names, self.xgb_model.feature_importances_))
        
        if self.rf_model:
            importance_scores['random_forest'] = dict(zip(feature_names, self.rf_model.feature_importances_))
        
        # Average importance across models
        all_features = set()
        for scores in importance_scores.values():
            all_features.update(scores.keys())
        
        self.feature_importance = {}
        for feature in all_features:
            scores = [importance_scores[model].get(feature, 0) for model in importance_scores]
            self.feature_importance[feature] = np.mean(scores)
        
        # Sort by importance
        self.feature_importance = dict(sorted(
            self.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        ))
    
    def _calculate_max_drawdown(self, bankroll_history: List[float]) -> float:
        """Calculate maximum drawdown"""
        if not bankroll_history:
            return 0
        
        peak = bankroll_history[0]
        max_dd = 0
        
        for value in bankroll_history:
            if value > peak:
                peak = value
            dd = (peak - value) / peak
            if dd > max_dd:
                max_dd = dd
        
        return max_dd * 100
    
    def _calculate_sharpe_ratio(self, returns: List[float]) -> float:
        """Calculate Sharpe ratio"""
        if len(returns) < 2:
            return 0
        
        returns_array = np.array(returns)
        avg_return = np.mean(returns_array)
        std_return = np.std(returns_array)
        
        if std_return == 0:
            return 0
        
        # Assuming risk-free rate of 2% annually
        risk_free_rate = 0.02 / 365  # Daily
        sharpe = (avg_return - risk_free_rate) / std_return
        
        return sharpe