"""
Advanced Parlay Optimization Engine
Generates optimal parlay combinations using correlation analysis and ML techniques
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Set
from scipy import stats
from scipy.optimize import minimize, LinearConstraint
from itertools import combinations
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib

logger = logging.getLogger(__name__)

class ParlayType(Enum):
    STANDARD = "standard"
    ROUND_ROBIN = "round_robin"
    TEASER = "teaser"
    PROGRESSIVE = "progressive"
    SYSTEM = "system"

class RiskLevel(Enum):
    CONSERVATIVE = "conservative"  # High probability, lower payout
    MODERATE = "moderate"          # Balanced probability and payout
    AGGRESSIVE = "aggressive"      # Lower probability, higher payout
    YOLO = "yolo"                 # Maximum risk/reward

@dataclass
class ParlayLeg:
    """Individual leg of a parlay"""
    game_id: str
    team: str
    bet_type: str  # 'moneyline', 'spread', 'total'
    line: float
    odds: int  # American odds
    probability: float
    confidence: float
    sport: str
    game_time: datetime
    correlation_factors: Dict[str, float] = field(default_factory=dict)

@dataclass
class ParlayRecommendation:
    """Optimized parlay recommendation"""
    parlay_id: str
    legs: List[ParlayLeg]
    combined_odds: int
    total_probability: float
    expected_value: float
    risk_score: float
    confidence_score: float
    correlation_score: float
    kelly_stake: float
    risk_level: RiskLevel
    key_factors: List[str]
    warnings: List[str]
    metadata: Dict[str, Any]
    timestamp: datetime

class ParlayOptimizer:
    """
    Advanced parlay optimization system using ML and correlation analysis
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.min_legs = config.get('min_legs', 3)
        self.max_legs = config.get('max_legs', 5)
        self.correlation_threshold = config.get('correlation_threshold', 0.3)
        self.min_ev_threshold = config.get('min_ev_threshold', 5.0)
        self.risk_parameters = self._initialize_risk_parameters()
        self.correlation_matrix = {}
        self.historical_performance = self._load_historical_data()
        
    def _initialize_risk_parameters(self) -> Dict[RiskLevel, Dict[str, float]]:
        """Initialize risk level parameters"""
        return {
            RiskLevel.CONSERVATIVE: {
                'min_probability': 0.65,
                'max_correlation': 0.2,
                'min_confidence': 0.7,
                'kelly_fraction': 0.1,
                'max_legs': 3
            },
            RiskLevel.MODERATE: {
                'min_probability': 0.55,
                'max_correlation': 0.3,
                'min_confidence': 0.6,
                'kelly_fraction': 0.15,
                'max_legs': 4
            },
            RiskLevel.AGGRESSIVE: {
                'min_probability': 0.45,
                'max_correlation': 0.4,
                'min_confidence': 0.5,
                'kelly_fraction': 0.2,
                'max_legs': 5
            },
            RiskLevel.YOLO: {
                'min_probability': 0.35,
                'max_correlation': 0.5,
                'min_confidence': 0.4,
                'kelly_fraction': 0.25,
                'max_legs': 6
            }
        }
    
    def _load_historical_data(self) -> Dict[str, Any]:
        """Load historical parlay performance data"""
        # This would load from database in production
        return {
            'success_rates': {},
            'correlation_history': {},
            'pattern_performance': {}
        }
    
    def generate_optimal_parlays(self, available_bets: List[Dict[str, Any]],
                                risk_level: RiskLevel = RiskLevel.MODERATE,
                                sport_filter: Optional[List[str]] = None,
                                max_parlays: int = 10) -> List[ParlayRecommendation]:
        """
        Generate optimal parlay combinations based on risk level and filters
        """
        # Convert bets to ParlayLeg objects
        legs = self._create_parlay_legs(available_bets, sport_filter)
        
        # Filter by confidence and probability thresholds
        risk_params = self.risk_parameters[risk_level]
        filtered_legs = [
            leg for leg in legs
            if leg.probability >= risk_params['min_probability'] * 0.8  # Allow some flexibility
            and leg.confidence >= risk_params['min_confidence']
        ]
        
        if len(filtered_legs) < self.min_legs:
            logger.warning(f"Not enough qualifying bets for {risk_level.value} parlays")
            return []
        
        # Calculate correlation matrix
        self._calculate_correlations(filtered_legs)
        
        # Generate candidate parlays
        candidate_parlays = self._generate_candidate_parlays(
            filtered_legs,
            risk_params['max_legs'],
            risk_level
        )
        
        # Optimize and rank parlays
        optimized_parlays = self._optimize_parlays(
            candidate_parlays,
            risk_level
        )
        
        # Apply machine learning enhancements
        ml_enhanced_parlays = self._apply_ml_enhancements(optimized_parlays)
        
        # Final filtering and ranking
        final_parlays = self._final_selection(
            ml_enhanced_parlays,
            risk_level,
            max_parlays
        )
        
        return final_parlays
    
    def _create_parlay_legs(self, available_bets: List[Dict[str, Any]],
                          sport_filter: Optional[List[str]] = None) -> List[ParlayLeg]:
        """Convert raw bet data to ParlayLeg objects"""
        legs = []
        
        for bet in available_bets:
            # Apply sport filter
            if sport_filter and bet['sport'] not in sport_filter:
                continue
            
            leg = ParlayLeg(
                game_id=bet.get('game_id', f"{bet['home_team']}_{bet['away_team']}"),
                team=bet['team'],
                bet_type=bet['bet_type'],
                line=bet.get('line', 0),
                odds=bet['odds'],
                probability=bet['true_probability'],
                confidence=bet.get('confidence', 0.5),
                sport=bet['sport'],
                game_time=datetime.fromisoformat(bet['game_time']) if isinstance(bet['game_time'], str) else bet['game_time'],
                correlation_factors=bet.get('correlation_factors', {})
            )
            
            legs.append(leg)
        
        return legs
    
    def _calculate_correlations(self, legs: List[ParlayLeg]) -> None:
        """Calculate correlation matrix between all potential legs"""
        n = len(legs)
        self.correlation_matrix = np.zeros((n, n))
        
        for i in range(n):
            for j in range(i + 1, n):
                correlation = self._calculate_pairwise_correlation(legs[i], legs[j])
                self.correlation_matrix[i, j] = correlation
                self.correlation_matrix[j, i] = correlation
    
    def _calculate_pairwise_correlation(self, leg1: ParlayLeg, leg2: ParlayLeg) -> float:
        """Calculate correlation between two parlay legs"""
        correlation = 0.0
        
        # Same game correlation (very high)
        if leg1.game_id == leg2.game_id:
            return 0.95  # Almost perfectly correlated
        
        # Same sport, same time slot
        if leg1.sport == leg2.sport:
            time_diff = abs((leg1.game_time - leg2.game_time).total_seconds() / 3600)
            if time_diff < 1:  # Games within 1 hour
                correlation += 0.2
        
        # Division/conference games (moderate correlation)
        if leg1.correlation_factors.get('division') == leg2.correlation_factors.get('division'):
            correlation += 0.15
        
        # Weather-affected games (outdoor sports)
        if leg1.sport in ['nfl', 'mlb', 'soccer'] and leg2.sport in ['nfl', 'mlb', 'soccer']:
            if leg1.correlation_factors.get('outdoor') and leg2.correlation_factors.get('outdoor'):
                # Check if similar weather conditions
                weather1 = leg1.correlation_factors.get('weather', {})
                weather2 = leg2.correlation_factors.get('weather', {})
                if weather1 and weather2:
                    if abs(weather1.get('wind_speed', 0) - weather2.get('wind_speed', 0)) < 5:
                        correlation += 0.1
        
        # Betting pattern correlation (public/sharp money)
        public1 = leg1.correlation_factors.get('public_percentage', 50)
        public2 = leg2.correlation_factors.get('public_percentage', 50)
        if abs(public1 - public2) < 10:  # Similar public betting
            correlation += 0.05
        
        # Total-based correlation
        if leg1.bet_type == 'total' and leg2.bet_type == 'total':
            if (leg1.line > 0 and leg2.line > 0) or (leg1.line < 0 and leg2.line < 0):
                correlation += 0.1  # Both overs or both unders
        
        # Historical correlation from past data
        hist_key = f"{leg1.team}_{leg2.team}"
        if hist_key in self.historical_performance.get('correlation_history', {}):
            correlation += self.historical_performance['correlation_history'][hist_key]
        
        return min(correlation, 0.95)  # Cap at 0.95
    
    def _generate_candidate_parlays(self, legs: List[ParlayLeg],
                                   max_legs: int,
                                   risk_level: RiskLevel) -> List[List[ParlayLeg]]:
        """Generate candidate parlay combinations"""
        candidates = []
        risk_params = self.risk_parameters[risk_level]
        
        # Generate combinations of different sizes
        for parlay_size in range(self.min_legs, min(max_legs + 1, len(legs) + 1)):
            for combo in combinations(range(len(legs)), parlay_size):
                # Check correlation constraint
                max_correlation = self._get_max_correlation(combo)
                if max_correlation <= risk_params['max_correlation']:
                    parlay_legs = [legs[i] for i in combo]
                    
                    # Additional filters
                    if self._validate_parlay_composition(parlay_legs, risk_level):
                        candidates.append(parlay_legs)
        
        return candidates
    
    def _get_max_correlation(self, indices: Tuple[int]) -> float:
        """Get maximum correlation in a set of legs"""
        max_corr = 0.0
        for i, idx1 in enumerate(indices):
            for idx2 in indices[i + 1:]:
                max_corr = max(max_corr, self.correlation_matrix[idx1, idx2])
        return max_corr
    
    def _validate_parlay_composition(self, legs: List[ParlayLeg],
                                    risk_level: RiskLevel) -> bool:
        """Validate parlay composition rules"""
        # No more than 2 legs from same sport (for diversity)
        sport_counts = {}
        for leg in legs:
            sport_counts[leg.sport] = sport_counts.get(leg.sport, 0) + 1
            if sport_counts[leg.sport] > 2 and risk_level != RiskLevel.YOLO:
                return False
        
        # Time diversity (not all games at same time)
        game_times = [leg.game_time for leg in legs]
        unique_times = len(set(game_times))
        if unique_times == 1 and len(legs) > 3:
            return False
        
        # Bet type diversity for conservative parlays
        if risk_level == RiskLevel.CONSERVATIVE:
            bet_types = [leg.bet_type for leg in legs]
            if len(set(bet_types)) == 1:  # All same bet type
                return False
        
        return True
    
    def _optimize_parlays(self, candidate_parlays: List[List[ParlayLeg]],
                        risk_level: RiskLevel) -> List[Dict[str, Any]]:
        """Optimize and score candidate parlays"""
        optimized = []
        
        for parlay_legs in candidate_parlays:
            # Calculate combined probability (considering correlations)
            combined_prob = self._calculate_combined_probability(parlay_legs)
            
            # Calculate combined odds
            combined_odds = self._calculate_combined_odds(parlay_legs)
            
            # Calculate expected value
            expected_value = self._calculate_expected_value(
                combined_prob,
                combined_odds
            )
            
            # Skip if EV is below threshold
            if expected_value < self.min_ev_threshold:
                continue
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(parlay_legs, combined_prob)
            
            # Calculate confidence score
            confidence_score = self._calculate_parlay_confidence(parlay_legs)
            
            # Calculate correlation score (lower is better)
            correlation_score = self._calculate_correlation_score(parlay_legs)
            
            # Calculate Kelly stake
            kelly_stake = self._calculate_kelly_stake(
                combined_prob,
                combined_odds,
                risk_level
            )
            
            optimized.append({
                'legs': parlay_legs,
                'combined_prob': combined_prob,
                'combined_odds': combined_odds,
                'expected_value': expected_value,
                'risk_score': risk_score,
                'confidence_score': confidence_score,
                'correlation_score': correlation_score,
                'kelly_stake': kelly_stake,
                'composite_score': self._calculate_composite_score(
                    expected_value,
                    risk_score,
                    confidence_score,
                    correlation_score,
                    risk_level
                )
            })
        
        # Sort by composite score
        optimized.sort(key=lambda x: x['composite_score'], reverse=True)
        
        return optimized
    
    def _calculate_combined_probability(self, legs: List[ParlayLeg]) -> float:
        """
        Calculate combined probability considering correlations
        Uses copula theory for dependent events
        """
        if len(legs) == 1:
            return legs[0].probability
        
        # Get individual probabilities
        probs = [leg.probability for leg in legs]
        
        # Get correlation matrix for these legs
        n = len(legs)
        corr_matrix = np.ones((n, n))
        
        leg_indices = {id(leg): i for i, leg in enumerate(legs)}
        
        for i in range(n):
            for j in range(i + 1, n):
                correlation = self._calculate_pairwise_correlation(legs[i], legs[j])
                corr_matrix[i, j] = correlation
                corr_matrix[j, i] = correlation
        
        # Use Gaussian copula for dependent probabilities
        # Convert probabilities to standard normal quantiles
        quantiles = [stats.norm.ppf(p) for p in probs]
        
        # Calculate multivariate normal CDF
        try:
            # Simplified calculation for computational efficiency
            # In production, use full multivariate normal CDF
            mean = np.zeros(n)
            combined_prob = stats.multivariate_normal.cdf(
                quantiles,
                mean=mean,
                cov=corr_matrix
            )
        except:
            # Fallback to independence assumption with correlation penalty
            combined_prob = np.prod(probs)
            avg_correlation = (corr_matrix.sum() - n) / (n * (n - 1))
            combined_prob *= (1 - avg_correlation * 0.2)  # Correlation penalty
        
        return max(0.001, min(0.999, combined_prob))
    
    def _calculate_combined_odds(self, legs: List[ParlayLeg]) -> int:
        """Calculate combined American odds for parlay"""
        decimal_odds = 1.0
        
        for leg in legs:
            if leg.odds > 0:
                decimal_odds *= (leg.odds / 100 + 1)
            else:
                decimal_odds *= (1 - 100 / leg.odds)
        
        # Convert back to American odds
        if decimal_odds >= 2.0:
            american_odds = (decimal_odds - 1) * 100
        else:
            american_odds = -100 / (decimal_odds - 1)
        
        return int(round(american_odds))
    
    def _calculate_expected_value(self, probability: float, american_odds: int) -> float:
        """Calculate expected value percentage"""
        if american_odds > 0:
            profit = american_odds / 100
        else:
            profit = 100 / abs(american_odds)
        
        ev = (probability * profit * 100) - ((1 - probability) * 100)
        return ev
    
    def _calculate_risk_score(self, legs: List[ParlayLeg], combined_prob: float) -> float:
        """Calculate risk score (0-1, higher is riskier)"""
        # Base risk from probability
        prob_risk = 1 - combined_prob
        
        # Variance risk from number of legs
        leg_risk = (len(legs) - 2) / 8  # Normalize to 0-1
        
        # Correlation risk
        correlations = []
        for i in range(len(legs)):
            for j in range(i + 1, len(legs)):
                correlations.append(
                    self._calculate_pairwise_correlation(legs[i], legs[j])
                )
        
        corr_risk = np.mean(correlations) if correlations else 0
        
        # Time concentration risk
        unique_times = len(set(leg.game_time for leg in legs))
        time_risk = 1 - (unique_times / len(legs))
        
        # Weighted average
        risk_score = (
            prob_risk * 0.4 +
            leg_risk * 0.2 +
            corr_risk * 0.25 +
            time_risk * 0.15
        )
        
        return min(1.0, risk_score)
    
    def _calculate_parlay_confidence(self, legs: List[ParlayLeg]) -> float:
        """Calculate overall confidence in parlay"""
        # Average confidence of individual legs
        avg_confidence = np.mean([leg.confidence for leg in legs])
        
        # Penalty for correlation
        correlations = []
        for i in range(len(legs)):
            for j in range(i + 1, len(legs)):
                correlations.append(
                    self._calculate_pairwise_correlation(legs[i], legs[j])
                )
        
        corr_penalty = np.mean(correlations) * 0.2 if correlations else 0
        
        # Bonus for diverse sports/bet types
        sport_diversity = len(set(leg.sport for leg in legs)) / len(legs)
        bet_diversity = len(set(leg.bet_type for leg in legs)) / len(legs)
        diversity_bonus = (sport_diversity + bet_diversity) * 0.1
        
        confidence = avg_confidence - corr_penalty + diversity_bonus
        
        return max(0.1, min(0.95, confidence))
    
    def _calculate_correlation_score(self, legs: List[ParlayLeg]) -> float:
        """Calculate correlation score (0-1, lower is better)"""
        if len(legs) <= 1:
            return 0.0
        
        correlations = []
        for i in range(len(legs)):
            for j in range(i + 1, len(legs)):
                correlations.append(
                    self._calculate_pairwise_correlation(legs[i], legs[j])
                )
        
        return np.mean(correlations) if correlations else 0.0
    
    def _calculate_kelly_stake(self, probability: float, american_odds: int,
                              risk_level: RiskLevel) -> float:
        """Calculate Kelly Criterion stake recommendation"""
        # Convert American odds to decimal
        if american_odds > 0:
            decimal_odds = american_odds / 100 + 1
        else:
            decimal_odds = 1 - 100 / american_odds
        
        # Kelly formula: f = (p * b - q) / b
        # where p = probability of winning, q = 1-p, b = decimal odds - 1
        b = decimal_odds - 1
        q = 1 - probability
        
        if b <= 0:
            return 0.0
        
        kelly = (probability * b - q) / b
        
        # Apply fractional Kelly based on risk level
        kelly_fraction = self.risk_parameters[risk_level]['kelly_fraction']
        adjusted_kelly = kelly * kelly_fraction
        
        # Cap at maximum stake
        max_stake = 0.1 if risk_level != RiskLevel.YOLO else 0.15
        
        return max(0.0, min(adjusted_kelly, max_stake))
    
    def _calculate_composite_score(self, ev: float, risk: float,
                                  confidence: float, correlation: float,
                                  risk_level: RiskLevel) -> float:
        """Calculate composite score for ranking parlays"""
        # Weight factors based on risk level
        if risk_level == RiskLevel.CONSERVATIVE:
            weights = {
                'ev': 0.2,
                'risk': -0.3,  # Negative weight (lower risk is better)
                'confidence': 0.35,
                'correlation': -0.15  # Negative weight
            }
        elif risk_level == RiskLevel.MODERATE:
            weights = {
                'ev': 0.35,
                'risk': -0.2,
                'confidence': 0.3,
                'correlation': -0.15
            }
        elif risk_level == RiskLevel.AGGRESSIVE:
            weights = {
                'ev': 0.5,
                'risk': -0.1,
                'confidence': 0.25,
                'correlation': -0.15
            }
        else:  # YOLO
            weights = {
                'ev': 0.7,
                'risk': 0.0,  # Don't care about risk
                'confidence': 0.2,
                'correlation': -0.1
            }
        
        # Normalize EV to 0-100 scale
        normalized_ev = min(100, max(0, ev))
        
        score = (
            weights['ev'] * normalized_ev +
            weights['risk'] * risk * 100 +
            weights['confidence'] * confidence * 100 +
            weights['correlation'] * correlation * 100
        )
        
        return score
    
    def _apply_ml_enhancements(self, parlays: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply machine learning enhancements to parlay predictions"""
        enhanced = []
        
        for parlay in parlays:
            # Extract features for ML model
            features = self._extract_ml_features(parlay)
            
            # Apply pattern recognition
            pattern_boost = self._check_historical_patterns(parlay['legs'])
            
            # Adjust probabilities based on ML insights
            ml_adjustment = self._get_ml_probability_adjustment(features)
            
            # Update parlay metrics
            parlay['combined_prob'] *= (1 + ml_adjustment)
            parlay['combined_prob'] = max(0.001, min(0.999, parlay['combined_prob']))
            
            # Recalculate EV with adjusted probability
            parlay['expected_value'] = self._calculate_expected_value(
                parlay['combined_prob'],
                parlay['combined_odds']
            )
            
            # Add ML confidence
            parlay['ml_confidence'] = self._calculate_ml_confidence(features, pattern_boost)
            
            # Add pattern insights
            parlay['patterns'] = self._identify_parlay_patterns(parlay['legs'])
            
            enhanced.append(parlay)
        
        return enhanced
    
    def _extract_ml_features(self, parlay: Dict[str, Any]) -> np.ndarray:
        """Extract features for ML model"""
        legs = parlay['legs']
        
        features = [
            len(legs),  # Number of legs
            parlay['combined_prob'],
            parlay['risk_score'],
            parlay['correlation_score'],
            np.mean([leg.probability for leg in legs]),
            np.std([leg.probability for leg in legs]),
            len(set(leg.sport for leg in legs)),  # Sport diversity
            len(set(leg.bet_type for leg in legs)),  # Bet type diversity
            np.mean([leg.confidence for leg in legs]),
            parlay['expected_value']
        ]
        
        return np.array(features)
    
    def _check_historical_patterns(self, legs: List[ParlayLeg]) -> float:
        """Check for successful historical patterns"""
        pattern_score = 0.0
        
        # Check for successful team combinations
        teams = [leg.team for leg in legs]
        team_combo_key = '_'.join(sorted(teams))
        
        if team_combo_key in self.historical_performance.get('pattern_performance', {}):
            pattern_score += self.historical_performance['pattern_performance'][team_combo_key]
        
        # Check for successful bet type combinations
        bet_types = [leg.bet_type for leg in legs]
        bet_combo = '_'.join(sorted(bet_types))
        
        pattern_templates = {
            'moneyline_moneyline_moneyline': 0.05,  # All favorites
            'spread_spread_total': 0.03,  # Mixed bet types
            'total_total': 0.04,  # Correlated totals
        }
        
        if bet_combo in pattern_templates:
            pattern_score += pattern_templates[bet_combo]
        
        # Time-based patterns (e.g., early games, primetime)
        hours = [leg.game_time.hour for leg in legs]
        if all(h < 16 for h in hours):  # All early games
            pattern_score += 0.02
        elif all(h >= 20 for h in hours):  # All primetime
            pattern_score += 0.03
        
        return pattern_score
    
    def _get_ml_probability_adjustment(self, features: np.ndarray) -> float:
        """Get ML-based probability adjustment"""
        # In production, this would use a trained model
        # For now, use heuristic adjustments
        
        adjustment = 0.0
        
        # High confidence with low correlation is good
        if features[8] > 0.7 and features[3] < 0.2:  # confidence > 0.7, correlation < 0.2
            adjustment += 0.05
        
        # Good expected value with reasonable risk
        if features[9] > 20 and features[2] < 0.6:  # EV > 20%, risk < 0.6
            adjustment += 0.03
        
        # Diverse parlays tend to perform better
        if features[6] >= 3:  # 3+ different sports
            adjustment += 0.02
        
        return adjustment
    
    def _calculate_ml_confidence(self, features: np.ndarray, pattern_boost: float) -> float:
        """Calculate ML model confidence"""
        base_confidence = 0.5
        
        # Add confidence from feature quality
        if features[1] > 0.3:  # Good base probability
            base_confidence += 0.1
        
        if features[9] > 15:  # Good EV
            base_confidence += 0.1
        
        if features[3] < 0.3:  # Low correlation
            base_confidence += 0.1
        
        # Add pattern boost
        base_confidence += pattern_boost
        
        return min(0.95, base_confidence)
    
    def _identify_parlay_patterns(self, legs: List[ParlayLeg]) -> List[str]:
        """Identify notable patterns in parlay"""
        patterns = []
        
        # Check for all favorites
        if all(leg.probability > 0.6 for leg in legs):
            patterns.append("all_favorites")
        
        # Check for all underdogs
        if all(leg.probability < 0.4 for leg in legs):
            patterns.append("all_underdogs")
        
        # Check for all same sport
        sports = [leg.sport for leg in legs]
        if len(set(sports)) == 1:
            patterns.append(f"single_sport_{sports[0]}")
        
        # Check for divisional games
        if all(leg.correlation_factors.get('divisional', False) for leg in legs):
            patterns.append("all_divisional")
        
        # Check for time patterns
        hours = [leg.game_time.hour for leg in legs]
        if all(h < 16 for h in hours):
            patterns.append("early_games")
        elif all(h >= 20 for h in hours):
            patterns.append("primetime_games")
        
        # Check for bet type patterns
        bet_types = [leg.bet_type for leg in legs]
        if len(set(bet_types)) == 1:
            patterns.append(f"all_{bet_types[0]}")
        
        return patterns
    
    def _final_selection(self, parlays: List[Dict[str, Any]],
                        risk_level: RiskLevel,
                        max_parlays: int) -> List[ParlayRecommendation]:
        """Final selection and formatting of parlays"""
        recommendations = []
        
        # Remove duplicate or highly similar parlays
        selected_parlays = self._remove_similar_parlays(parlays)
        
        # Take top parlays based on composite score
        for parlay_data in selected_parlays[:max_parlays]:
            # Generate unique ID
            parlay_id = self._generate_parlay_id(parlay_data['legs'])
            
            # Identify key factors
            key_factors = self._identify_key_factors(parlay_data)
            
            # Generate warnings
            warnings = self._generate_warnings(parlay_data, risk_level)
            
            # Create metadata
            metadata = {
                'ml_confidence': parlay_data.get('ml_confidence', 0),
                'patterns': parlay_data.get('patterns', []),
                'composite_score': parlay_data['composite_score'],
                'sports_included': list(set(leg.sport for leg in parlay_data['legs'])),
                'bet_types': list(set(leg.bet_type for leg in parlay_data['legs'])),
                'time_spread': self._calculate_time_spread(parlay_data['legs'])
            }
            
            recommendation = ParlayRecommendation(
                parlay_id=parlay_id,
                legs=parlay_data['legs'],
                combined_odds=parlay_data['combined_odds'],
                total_probability=parlay_data['combined_prob'],
                expected_value=parlay_data['expected_value'],
                risk_score=parlay_data['risk_score'],
                confidence_score=parlay_data['confidence_score'],
                correlation_score=parlay_data['correlation_score'],
                kelly_stake=parlay_data['kelly_stake'],
                risk_level=risk_level,
                key_factors=key_factors,
                warnings=warnings,
                metadata=metadata,
                timestamp=datetime.now()
            )
            
            recommendations.append(recommendation)
        
        return recommendations
    
    def _remove_similar_parlays(self, parlays: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Remove duplicate or highly similar parlays"""
        unique_parlays = []
        seen_teams = []
        
        for parlay in parlays:
            # Get team set for this parlay
            teams = set(leg.team for leg in parlay['legs'])
            
            # Check if too similar to already selected parlays
            is_unique = True
            for seen in seen_teams:
                overlap = len(teams & seen) / len(teams | seen)
                if overlap > 0.66:  # More than 2/3 overlap
                    is_unique = False
                    break
            
            if is_unique:
                unique_parlays.append(parlay)
                seen_teams.append(teams)
        
        return unique_parlays
    
    def _generate_parlay_id(self, legs: List[ParlayLeg]) -> str:
        """Generate unique ID for parlay"""
        # Create string representation of parlay
        parlay_str = '_'.join([
            f"{leg.team}_{leg.bet_type}_{leg.line}"
            for leg in sorted(legs, key=lambda x: x.game_id)
        ])
        
        # Hash for unique ID
        return hashlib.md5(parlay_str.encode()).hexdigest()[:12]
    
    def _identify_key_factors(self, parlay_data: Dict[str, Any]) -> List[str]:
        """Identify key factors for parlay success"""
        factors = []
        
        if parlay_data['expected_value'] > 25:
            factors.append(f"High EV: {parlay_data['expected_value']:.1f}%")
        
        if parlay_data['correlation_score'] < 0.2:
            factors.append("Low correlation between legs")
        
        if parlay_data['confidence_score'] > 0.7:
            factors.append("High confidence predictions")
        
        if 'all_favorites' in parlay_data.get('patterns', []):
            factors.append("All favorites parlay")
        
        if parlay_data.get('ml_confidence', 0) > 0.7:
            factors.append("Strong ML pattern match")
        
        # Sport-specific factors
        sports = set(leg.sport for leg in parlay_data['legs'])
        if len(sports) >= 3:
            factors.append("Cross-sport diversification")
        
        return factors
    
    def _generate_warnings(self, parlay_data: Dict[str, Any],
                         risk_level: RiskLevel) -> List[str]:
        """Generate warnings for parlay"""
        warnings = []
        
        if parlay_data['risk_score'] > 0.7:
            warnings.append("High risk parlay")
        
        if parlay_data['correlation_score'] > 0.4:
            warnings.append("High correlation between legs")
        
        if parlay_data['combined_prob'] < 0.2:
            warnings.append("Low probability of success")
        
        if parlay_data['kelly_stake'] < 0.01:
            warnings.append("Kelly Criterion suggests minimal stake")
        
        # Check for same game parlays
        game_ids = [leg.game_id for leg in parlay_data['legs']]
        if len(game_ids) != len(set(game_ids)):
            warnings.append("Contains same-game parlay legs")
        
        # Time concentration warning
        time_spread = self._calculate_time_spread(parlay_data['legs'])
        if time_spread < 1:  # All games within 1 hour
            warnings.append("All games start at similar times")
        
        return warnings
    
    def _calculate_time_spread(self, legs: List[ParlayLeg]) -> float:
        """Calculate time spread of games in hours"""
        if len(legs) <= 1:
            return 0
        
        times = [leg.game_time for leg in legs]
        min_time = min(times)
        max_time = max(times)
        
        return (max_time - min_time).total_seconds() / 3600
    
    def track_parlay_performance(self, parlay_id: str, result: bool,
                                actual_odds: Optional[int] = None) -> None:
        """Track actual parlay performance for learning"""
        # Store result in historical data
        if 'results' not in self.historical_performance:
            self.historical_performance['results'] = {}
        
        self.historical_performance['results'][parlay_id] = {
            'result': result,
            'actual_odds': actual_odds,
            'timestamp': datetime.now().isoformat()
        }
        
        # Update pattern performance
        # This would be more sophisticated in production
        logger.info(f"Tracked parlay {parlay_id}: {'Won' if result else 'Lost'}")