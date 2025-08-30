"""
Advanced sports analytics engine for comprehensive game analysis
"""
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from scipy import stats
import logging
from datetime import datetime, timedelta
from .models import *

logger = logging.getLogger(__name__)

class SportsAnalyzer:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.elo_k_factor = config.get('elo_k_factor', 32)
        self.home_advantage = config.get('home_advantage', 0.03)
        self.injury_weight = config.get('injury_weight', 0.15)
        self.form_weight = config.get('form_weight', 0.25)
        self.rest_advantage = config.get('rest_advantage', 0.02)
        
    def analyze_game(self, game_context: GameContext) -> SportsPrediction:
        """
        Comprehensive game analysis combining multiple factors
        """
        # Calculate base probabilities
        elo_prob = self._calculate_elo_probability(
            game_context.home_team, 
            game_context.away_team
        )
        
        # Adjust for current form
        form_adjusted = self._adjust_for_form(
            elo_prob, 
            game_context.home_team, 
            game_context.away_team
        )
        
        # Factor in injuries
        injury_adjusted = self._adjust_for_injuries(
            form_adjusted,
            game_context.home_team,
            game_context.away_team
        )
        
        # Consider rest and travel
        fatigue_adjusted = self._adjust_for_fatigue(
            injury_adjusted,
            game_context
        )
        
        # Matchup-specific adjustments
        matchup_adjusted = self._adjust_for_matchup(
            fatigue_adjusted,
            game_context
        )
        
        # Weather impact (outdoor sports)
        final_probability = self._adjust_for_weather(
            matchup_adjusted,
            game_context
        )
        
        # Generate score prediction
        predicted_score = self._predict_score(game_context, final_probability)
        
        # Calculate spread and total
        spread = self._calculate_spread(final_probability, game_context)
        total = self._calculate_total(game_context)
        
        # Identify value bets
        recommended_bets = self._identify_value_bets(
            game_context,
            final_probability,
            spread,
            total
        )
        
        # Risk assessment
        risk_assessment = self._assess_risk(game_context, final_probability)
        
        return SportsPrediction(
            game_context=game_context,
            predicted_winner=game_context.home_team.name if final_probability > 0.5 else game_context.away_team.name,
            win_probability=final_probability if final_probability > 0.5 else 1 - final_probability,
            predicted_score=predicted_score,
            spread_prediction=spread,
            total_prediction=total,
            confidence_level=self._calculate_confidence(game_context, final_probability),
            key_factors=self._identify_key_factors(game_context),
            risk_assessment=risk_assessment,
            recommended_bets=recommended_bets,
            expected_value=self._calculate_expected_value(recommended_bets)
        )
    
    def _calculate_elo_probability(self, home_team: Team, away_team: Team) -> float:
        """
        Calculate win probability using ELO ratings
        """
        home_elo = self._get_team_elo(home_team)
        away_elo = self._get_team_elo(away_team)
        
        # Add home advantage
        home_elo += 100 * self.home_advantage
        
        expected_home = 1 / (1 + 10 ** ((away_elo - home_elo) / 400))
        return expected_home
    
    def _adjust_for_form(self, base_prob: float, home_team: Team, away_team: Team) -> float:
        """
        Adjust probability based on recent team form
        """
        home_form = home_team.current_form / 100
        away_form = away_team.current_form / 100
        
        form_differential = (home_form - away_form) * self.form_weight
        
        adjusted_prob = base_prob + form_differential
        return max(0, min(1, adjusted_prob))
    
    def _adjust_for_injuries(self, base_prob: float, home_team: Team, away_team: Team) -> float:
        """
        Adjust for key player injuries
        """
        home_injury_impact = self._calculate_injury_impact(home_team)
        away_injury_impact = self._calculate_injury_impact(away_team)
        
        injury_differential = (away_injury_impact - home_injury_impact) * self.injury_weight
        
        adjusted_prob = base_prob + injury_differential
        return max(0, min(1, adjusted_prob))
    
    def _calculate_injury_impact(self, team: Team) -> float:
        """
        Calculate the impact of injuries on team performance
        """
        if not team.injuries:
            return 0.0
        
        total_impact = 0.0
        for injury in team.injuries:
            player_importance = injury.get('player_importance', 0.5)
            injury_severity = injury.get('severity', 0.5)
            total_impact += player_importance * injury_severity
        
        return min(1.0, total_impact)
    
    def _adjust_for_fatigue(self, base_prob: float, game_context: GameContext) -> float:
        """
        Adjust for rest days and travel
        """
        home_rest = game_context.home_team.rest_days
        away_rest = game_context.away_team.rest_days
        
        rest_differential = (home_rest - away_rest) * self.rest_advantage
        
        # Travel fatigue
        away_travel_penalty = min(0.05, game_context.away_team.travel_distance / 10000)
        
        adjusted_prob = base_prob + rest_differential + away_travel_penalty
        return max(0, min(1, adjusted_prob))
    
    def _adjust_for_matchup(self, base_prob: float, game_context: GameContext) -> float:
        """
        Adjust for specific matchup advantages
        """
        # Style matchup
        home_style = game_context.home_team.tactical_style
        away_style = game_context.away_team.tactical_style
        
        matchup_advantage = self._calculate_style_matchup(home_style, away_style)
        
        adjusted_prob = base_prob + matchup_advantage * 0.1
        return max(0, min(1, adjusted_prob))
    
    def _calculate_style_matchup(self, home_style: Dict, away_style: Dict) -> float:
        """
        Calculate tactical matchup advantages
        """
        # This would be sport-specific
        # Example for basketball: pace, three-point shooting, defense
        advantages = 0.0
        
        if home_style.get('pace', 0) > away_style.get('pace', 0):
            if home_style.get('efficiency', 0) > away_style.get('efficiency', 0):
                advantages += 0.2
        
        if home_style.get('defensive_rating', 0) < away_style.get('offensive_rating', 0):
            advantages += 0.1
        
        return advantages
    
    def _adjust_for_weather(self, base_prob: float, game_context: GameContext) -> float:
        """
        Adjust for weather conditions (outdoor sports)
        """
        if game_context.sport not in [SportType.FOOTBALL, SportType.BASEBALL, SportType.SOCCER]:
            return base_prob
        
        weather = game_context.weather_conditions
        if not weather:
            return base_prob
        
        # Wind impact
        wind_speed = weather.get('wind_speed', 0)
        if wind_speed > 20:
            # Favors running teams in football, affects baseball significantly
            adjustment = 0.05 if game_context.home_team.tactical_style.get('run_heavy', False) else -0.05
            base_prob += adjustment
        
        # Temperature impact
        temp = weather.get('temperature', 70)
        if temp < 32:  # Freezing
            # Favors defensive teams
            adjustment = 0.03 if game_context.home_team.tactical_style.get('defensive', False) else -0.03
            base_prob += adjustment
        
        return max(0, min(1, base_prob))
    
    def _predict_score(self, game_context: GameContext, win_prob: float) -> Dict[str, float]:
        """
        Predict the final score based on team statistics and probability
        """
        sport = game_context.sport
        
        if sport == SportType.BASKETBALL:
            return self._predict_basketball_score(game_context, win_prob)
        elif sport == SportType.FOOTBALL:
            return self._predict_football_score(game_context, win_prob)
        elif sport == SportType.BASEBALL:
            return self._predict_baseball_score(game_context, win_prob)
        else:
            return self._predict_generic_score(game_context, win_prob)
    
    def _predict_basketball_score(self, game_context: GameContext, win_prob: float) -> Dict[str, float]:
        """
        Predict basketball score using pace and efficiency metrics
        """
        # Get team offensive/defensive ratings
        home_off = game_context.home_team.tactical_style.get('offensive_rating', 110)
        home_def = game_context.home_team.tactical_style.get('defensive_rating', 110)
        away_off = game_context.away_team.tactical_style.get('offensive_rating', 110)
        away_def = game_context.away_team.tactical_style.get('defensive_rating', 110)
        
        # Calculate expected pace
        home_pace = game_context.home_team.tactical_style.get('pace', 100)
        away_pace = game_context.away_team.tactical_style.get('pace', 100)
        game_pace = (home_pace + away_pace) / 2
        
        # Calculate expected points
        possessions = game_pace
        home_points = (home_off * away_def / 110) * (possessions / 100)
        away_points = (away_off * home_def / 110) * (possessions / 100)
        
        # Adjust based on win probability
        if win_prob > 0.5:
            margin = (win_prob - 0.5) * 20
            home_points += margin / 2
            away_points -= margin / 2
        else:
            margin = (0.5 - win_prob) * 20
            away_points += margin / 2
            home_points -= margin / 2
        
        return {
            'home': round(home_points, 1),
            'away': round(away_points, 1)
        }
    
    def _predict_football_score(self, game_context: GameContext, win_prob: float) -> Dict[str, float]:
        """
        Predict football score
        """
        # Base scoring expectation
        base_total = 45
        
        # Adjust for offensive/defensive strength
        home_off = game_context.home_team.tactical_style.get('offensive_rating', 20)
        away_off = game_context.away_team.tactical_style.get('offensive_rating', 20)
        
        total_adjustment = ((home_off + away_off) / 40 - 1) * 10
        expected_total = base_total + total_adjustment
        
        # Distribute points based on win probability
        if win_prob > 0.5:
            home_share = 0.5 + (win_prob - 0.5)
            home_points = expected_total * home_share
            away_points = expected_total * (1 - home_share)
        else:
            away_share = 0.5 + (0.5 - win_prob)
            away_points = expected_total * away_share
            home_points = expected_total * (1 - away_share)
        
        return {
            'home': round(home_points, 0),
            'away': round(away_points, 0)
        }
    
    def _predict_baseball_score(self, game_context: GameContext, win_prob: float) -> Dict[str, float]:
        """
        Predict baseball score
        """
        # Base run expectation
        base_runs = 4.5
        
        # Park factor and pitcher adjustments would go here
        
        if win_prob > 0.5:
            home_runs = base_runs * (1 + (win_prob - 0.5))
            away_runs = base_runs * (1 - (win_prob - 0.5))
        else:
            away_runs = base_runs * (1 + (0.5 - win_prob))
            home_runs = base_runs * (1 - (0.5 - win_prob))
        
        return {
            'home': round(home_runs, 1),
            'away': round(away_runs, 1)
        }
    
    def _predict_generic_score(self, game_context: GameContext, win_prob: float) -> Dict[str, float]:
        """
        Generic score prediction
        """
        if win_prob > 0.5:
            return {'home': 2.5, 'away': 1.5}
        else:
            return {'home': 1.5, 'away': 2.5}
    
    def _calculate_spread(self, win_prob: float, game_context: GameContext) -> float:
        """
        Calculate point spread from win probability
        """
        # Convert probability to spread using normal distribution
        if win_prob == 0.5:
            return 0.0
        
        # Use inverse normal CDF to convert probability to spread
        z_score = stats.norm.ppf(win_prob)
        
        # Sport-specific spread calculations
        if game_context.sport == SportType.BASKETBALL:
            spread = z_score * 4.5  # NBA typical std dev
        elif game_context.sport == SportType.FOOTBALL:
            spread = z_score * 7  # NFL typical std dev
        else:
            spread = z_score * 3
        
        return round(spread, 0.5)
    
    def _calculate_total(self, game_context: GameContext) -> float:
        """
        Calculate game total (over/under)
        """
        predicted_score = self._predict_score(game_context, 0.5)  # Neutral prediction
        total = predicted_score['home'] + predicted_score['away']
        
        # Adjust for weather if applicable
        if game_context.weather_conditions:
            if game_context.weather_conditions.get('wind_speed', 0) > 15:
                total *= 0.95  # Lower scoring in wind
            if game_context.weather_conditions.get('temperature', 70) < 40:
                total *= 0.97  # Lower scoring in cold
        
        return round(total, 0.5)
    
    def _identify_value_bets(self, game_context: GameContext, 
                            win_prob: float, spread: float, total: float) -> List[Dict[str, Any]]:
        """
        Identify bets with positive expected value
        """
        value_bets = []
        
        # Check moneyline value
        if game_context.public_betting_percentage:
            public_home = game_context.public_betting_percentage.get('home', 50)
            if abs(public_home - win_prob * 100) > 10:
                value_bets.append({
                    'type': 'moneyline',
                    'pick': 'home' if win_prob > public_home / 100 else 'away',
                    'edge': abs(public_home - win_prob * 100),
                    'confidence': 'high' if abs(public_home - win_prob * 100) > 15 else 'medium'
                })
        
        # Check for sharp money divergence
        if game_context.sharp_money_indicators:
            sharp_side = game_context.sharp_money_indicators.get('side')
            if sharp_side:
                value_bets.append({
                    'type': 'spread',
                    'pick': sharp_side,
                    'line': spread,
                    'confidence': 'high'
                })
        
        # Check line movement
        if game_context.line_movement:
            for movement in game_context.line_movement:
                if movement.get('reverse_line_movement'):
                    value_bets.append({
                        'type': movement.get('bet_type'),
                        'pick': movement.get('sharp_side'),
                        'confidence': 'high'
                    })
        
        return value_bets
    
    def _calculate_confidence(self, game_context: GameContext, probability: float) -> float:
        """
        Calculate confidence level in prediction
        """
        confidence = abs(probability - 0.5) * 2  # Base confidence from probability
        
        # Adjust for data quality
        if game_context.home_team.roster and game_context.away_team.roster:
            confidence += 0.1
        
        # Adjust for historical matchup data
        if hasattr(game_context, 'historical_matchup'):
            confidence += 0.05
        
        # Cap at 95%
        return min(0.95, confidence)
    
    def _identify_key_factors(self, game_context: GameContext) -> List[Dict[str, Any]]:
        """
        Identify the key factors influencing the prediction
        """
        factors = []
        
        # Rest advantage
        rest_diff = game_context.home_team.rest_days - game_context.away_team.rest_days
        if abs(rest_diff) >= 2:
            factors.append({
                'factor': 'rest_advantage',
                'team': game_context.home_team.name if rest_diff > 0 else game_context.away_team.name,
                'impact': 'high'
            })
        
        # Injuries
        if game_context.home_team.injuries or game_context.away_team.injuries:
            factors.append({
                'factor': 'injuries',
                'impact': 'high' if len(game_context.home_team.injuries) + len(game_context.away_team.injuries) > 3 else 'medium'
            })
        
        # Home advantage
        factors.append({
            'factor': 'home_advantage',
            'team': game_context.home_team.name,
            'impact': 'medium'
        })
        
        # Form differential
        form_diff = game_context.home_team.current_form - game_context.away_team.current_form
        if abs(form_diff) > 20:
            factors.append({
                'factor': 'current_form',
                'team': game_context.home_team.name if form_diff > 0 else game_context.away_team.name,
                'impact': 'high'
            })
        
        return factors
    
    def _assess_risk(self, game_context: GameContext, probability: float) -> Dict[str, float]:
        """
        Assess betting risk factors
        """
        risk_score = 0.0
        
        # Uncertainty from close probability
        uncertainty_risk = 1.0 - abs(probability - 0.5) * 2
        risk_score += uncertainty_risk * 0.3
        
        # Injury risk
        total_injuries = len(game_context.home_team.injuries) + len(game_context.away_team.injuries)
        injury_risk = min(1.0, total_injuries / 10)
        risk_score += injury_risk * 0.2
        
        # Public betting risk (potential trap game)
        if game_context.public_betting_percentage:
            public_consensus = max(game_context.public_betting_percentage.values())
            if public_consensus > 70:
                risk_score += 0.3
        
        # Weather risk
        if game_context.weather_conditions:
            if game_context.weather_conditions.get('wind_speed', 0) > 20:
                risk_score += 0.2
        
        return {
            'overall_risk': min(1.0, risk_score),
            'uncertainty': uncertainty_risk,
            'injury_risk': injury_risk,
            'variance_risk': 0.5 if game_context.sport in [SportType.BASEBALL, SportType.HOCKEY] else 0.3
        }
    
    def _calculate_expected_value(self, bets: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculate expected value for recommended bets
        """
        ev_results = {}
        
        for bet in bets:
            if bet.get('edge'):
                # Simplified EV calculation
                edge_decimal = bet['edge'] / 100
                ev = edge_decimal * 100  # Assuming $100 bet
                ev_results[f"{bet['type']}_{bet['pick']}"] = ev
        
        return ev_results
    
    def _get_team_elo(self, team: Team) -> float:
        """
        Get or calculate team ELO rating
        """
        # This would typically fetch from a database
        # For now, use a base rating modified by recent form
        base_elo = 1500
        form_adjustment = (team.current_form - 50) * 4
        return base_elo + form_adjustment