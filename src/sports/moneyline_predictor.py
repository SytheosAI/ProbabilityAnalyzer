"""
Advanced Moneyline Prediction Engine
Converts spreads to moneyline probabilities and identifies value across all sports
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from scipy import stats
from scipy.optimize import minimize
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class MoneylineType(Enum):
    AMERICAN = "american"
    DECIMAL = "decimal"
    FRACTIONAL = "fractional"
    IMPLIED_PROB = "implied_probability"

@dataclass
class MoneylineAnalysis:
    """Comprehensive moneyline analysis result"""
    team: str
    sport: str
    american_odds: int
    decimal_odds: float
    implied_probability: float
    true_probability: float
    expected_value: float
    edge: float
    kelly_criterion: float
    confidence_score: float
    value_rating: str  # 'strong', 'moderate', 'weak', 'no_value'
    factors: Dict[str, Any]
    timestamp: datetime

class MoneylinePredictor:
    """
    Advanced moneyline prediction system that converts various betting metrics
    to moneyline probabilities and identifies value opportunities
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.vig_adjustment = config.get('vig_adjustment', 0.05)
        self.kelly_fraction = config.get('kelly_fraction', 0.25)  # Conservative Kelly
        self.min_edge_threshold = config.get('min_edge_threshold', 0.03)
        self.confidence_weights = self._initialize_confidence_weights()
        self.sport_specific_params = self._load_sport_parameters()
        
    def _initialize_confidence_weights(self) -> Dict[str, float]:
        """Initialize confidence weight factors for different data sources"""
        return {
            'statistical_model': 0.30,
            'elo_rating': 0.20,
            'recent_form': 0.15,
            'head_to_head': 0.10,
            'injuries': 0.10,
            'weather': 0.05,
            'public_betting': 0.05,
            'sharp_money': 0.05
        }
    
    def _load_sport_parameters(self) -> Dict[str, Dict[str, Any]]:
        """Load sport-specific parameters for moneyline calculations"""
        return {
            'nfl': {
                'home_advantage': 0.57,  # Historical home win %
                'spread_multiplier': 2.1,  # For spread to ML conversion
                'key_numbers': [3, 7, 10],
                'total_variance': 13.86,
                'scoring_distribution': 'poisson'
            },
            'nba': {
                'home_advantage': 0.60,
                'spread_multiplier': 2.5,
                'key_numbers': [],
                'total_variance': 12.5,
                'scoring_distribution': 'normal'
            },
            'mlb': {
                'home_advantage': 0.54,
                'spread_multiplier': 1.5,  # Run line consideration
                'key_numbers': [1],
                'total_variance': 3.0,
                'scoring_distribution': 'negative_binomial'
            },
            'nhl': {
                'home_advantage': 0.55,
                'spread_multiplier': 1.5,  # Puck line consideration
                'key_numbers': [1],
                'total_variance': 1.8,
                'scoring_distribution': 'poisson'
            },
            'soccer': {
                'home_advantage': 0.46,  # Lower due to draws
                'spread_multiplier': 1.8,
                'key_numbers': [1],
                'total_variance': 1.2,
                'scoring_distribution': 'poisson',
                'draw_probability': 0.26  # Historical average
            },
            'ncaaf': {
                'home_advantage': 0.60,
                'spread_multiplier': 2.3,
                'key_numbers': [3, 7, 10, 14],
                'total_variance': 16.5,
                'scoring_distribution': 'poisson'
            },
            'ncaab': {
                'home_advantage': 0.69,  # Strong home court in college
                'spread_multiplier': 2.8,
                'key_numbers': [],
                'total_variance': 14.2,
                'scoring_distribution': 'normal'
            }
        }
    
    def spread_to_moneyline(self, spread: float, sport: str, 
                           total: Optional[float] = None) -> Dict[str, Any]:
        """
        Convert point spread to moneyline odds using advanced statistical methods
        """
        sport_params = self.sport_specific_params.get(sport.lower(), self.sport_specific_params['nfl'])
        
        # Calculate win probability from spread
        if sport.lower() == 'soccer':
            # Special handling for soccer (3-way market)
            win_prob, draw_prob, loss_prob = self._calculate_soccer_probabilities(spread, total)
            return {
                'home_win': self._probability_to_american_odds(win_prob),
                'draw': self._probability_to_american_odds(draw_prob),
                'away_win': self._probability_to_american_odds(loss_prob),
                'home_win_prob': win_prob,
                'draw_prob': draw_prob,
                'away_win_prob': loss_prob
            }
        else:
            # Standard 2-way market
            win_probability = self._spread_to_win_probability(spread, sport, total)
            
            # Convert to moneyline odds
            if win_probability >= 0.5:
                american_odds = self._probability_to_american_odds(win_probability)
            else:
                american_odds = self._probability_to_american_odds(win_probability)
            
            return {
                'american_odds': american_odds,
                'decimal_odds': self._american_to_decimal(american_odds),
                'implied_probability': win_probability,
                'spread': spread,
                'confidence': self._calculate_conversion_confidence(spread, sport)
            }
    
    def _spread_to_win_probability(self, spread: float, sport: str,
                                  total: Optional[float] = None) -> float:
        """
        Convert spread to win probability using sport-specific models
        """
        sport_params = self.sport_specific_params.get(sport.lower(), self.sport_specific_params['nfl'])
        
        # Base calculation using normal distribution
        std_dev = sport_params['total_variance'] ** 0.5
        
        # Adjust for total if provided (higher totals = higher variance)
        if total:
            if sport.lower() in ['nfl', 'ncaaf']:
                std_dev = std_dev * (total / 45) ** 0.5
            elif sport.lower() in ['nba', 'ncaab']:
                std_dev = std_dev * (total / 200) ** 0.5
        
        # Calculate probability using CDF
        z_score = -spread / std_dev
        win_probability = stats.norm.cdf(z_score)
        
        # Adjust for key numbers in football
        if sport.lower() in ['nfl', 'ncaaf'] and spread in sport_params['key_numbers']:
            # Key number adjustment
            if spread == 3:
                win_probability *= 1.08  # 3-point games are common
            elif spread == 7:
                win_probability *= 1.05
        
        # Ensure probability is within bounds
        return max(0.01, min(0.99, win_probability))
    
    def _calculate_soccer_probabilities(self, spread: float, 
                                       total: Optional[float] = None) -> Tuple[float, float, float]:
        """
        Calculate 3-way probabilities for soccer
        """
        # Use Poisson distribution for soccer scoring
        if total:
            avg_goals = total / 2
        else:
            avg_goals = 2.5  # Default average
        
        # Adjust for spread (Asian Handicap conversion)
        home_expected = avg_goals * (1 + spread / 4)
        away_expected = avg_goals * (1 - spread / 4)
        
        # Calculate probabilities for different outcomes
        win_prob = 0
        draw_prob = 0
        loss_prob = 0
        
        # Simulate possible scores
        for home_goals in range(10):
            home_prob = stats.poisson.pmf(home_goals, home_expected)
            for away_goals in range(10):
                away_prob = stats.poisson.pmf(away_goals, away_expected)
                joint_prob = home_prob * away_prob
                
                if home_goals > away_goals:
                    win_prob += joint_prob
                elif home_goals == away_goals:
                    draw_prob += joint_prob
                else:
                    loss_prob += joint_prob
        
        return win_prob, draw_prob, loss_prob
    
    def calculate_true_probability(self, team_data: Dict[str, Any], 
                                  opponent_data: Dict[str, Any],
                                  sport: str,
                                  conditions: Optional[Dict[str, Any]] = None) -> float:
        """
        Calculate true win probability using multiple factors
        """
        probabilities = []
        weights = []
        
        # ELO-based probability
        if 'elo_rating' in team_data and 'elo_rating' in opponent_data:
            elo_prob = self._calculate_elo_probability(
                team_data['elo_rating'], 
                opponent_data['elo_rating'],
                is_home=team_data.get('is_home', False)
            )
            probabilities.append(elo_prob)
            weights.append(self.confidence_weights['elo_rating'])
        
        # Statistical model probability
        if 'offensive_rating' in team_data and 'defensive_rating' in team_data:
            stat_prob = self._calculate_statistical_probability(
                team_data, opponent_data, sport
            )
            probabilities.append(stat_prob)
            weights.append(self.confidence_weights['statistical_model'])
        
        # Recent form probability
        if 'recent_form' in team_data:
            form_prob = self._calculate_form_probability(
                team_data['recent_form'],
                opponent_data.get('recent_form', 0.5)
            )
            probabilities.append(form_prob)
            weights.append(self.confidence_weights['recent_form'])
        
        # Head-to-head probability
        if 'h2h_record' in team_data:
            h2h_prob = self._calculate_h2h_probability(team_data['h2h_record'])
            probabilities.append(h2h_prob)
            weights.append(self.confidence_weights['head_to_head'])
        
        # Injury impact
        if 'injury_impact' in team_data:
            injury_adjustment = self._calculate_injury_adjustment(
                team_data['injury_impact'],
                opponent_data.get('injury_impact', 0)
            )
            probabilities.append(0.5 + injury_adjustment)  # Adjustment from baseline
            weights.append(self.confidence_weights['injuries'])
        
        # Weather impact (outdoor sports)
        if conditions and 'weather' in conditions:
            if sport.lower() in ['nfl', 'mlb', 'soccer', 'ncaaf']:
                weather_adjustment = self._calculate_weather_adjustment(
                    conditions['weather'], team_data, sport
                )
                probabilities.append(0.5 + weather_adjustment)
                weights.append(self.confidence_weights['weather'])
        
        # Calculate weighted average
        if probabilities:
            weights = np.array(weights) / sum(weights)  # Normalize weights
            true_probability = np.average(probabilities, weights=weights)
        else:
            # Fallback to basic calculation
            true_probability = 0.5
        
        return max(0.01, min(0.99, true_probability))
    
    def _calculate_elo_probability(self, team_elo: float, opponent_elo: float,
                                  is_home: bool = False) -> float:
        """Calculate win probability from ELO ratings"""
        # Home advantage in ELO points
        home_advantage = 65 if is_home else -65 if not is_home else 0
        
        elo_diff = team_elo - opponent_elo + home_advantage
        expected = 1 / (1 + 10 ** (-elo_diff / 400))
        
        return expected
    
    def _calculate_statistical_probability(self, team_data: Dict[str, Any],
                                         opponent_data: Dict[str, Any],
                                         sport: str) -> float:
        """Calculate probability from offensive/defensive ratings"""
        # Pythagorean expectation
        team_strength = team_data.get('offensive_rating', 100) / opponent_data.get('defensive_rating', 100)
        opponent_strength = opponent_data.get('offensive_rating', 100) / team_data.get('defensive_rating', 100)
        
        # Sport-specific exponent
        exponents = {
            'nfl': 2.37,
            'nba': 13.91,
            'mlb': 1.83,
            'nhl': 2.05,
            'soccer': 1.35,
            'ncaaf': 2.37,
            'ncaab': 11.5
        }
        
        exp = exponents.get(sport.lower(), 2.0)
        
        team_pythagorean = team_strength ** exp
        opponent_pythagorean = opponent_strength ** exp
        
        probability = team_pythagorean / (team_pythagorean + opponent_pythagorean)
        
        return probability
    
    def _calculate_form_probability(self, team_form: float, opponent_form: float) -> float:
        """Calculate probability based on recent form"""
        # Form should be between 0 and 1 (e.g., last 10 games win %)
        form_differential = team_form - opponent_form
        
        # Logistic function to convert differential to probability
        probability = 1 / (1 + np.exp(-3 * form_differential))
        
        return probability
    
    def _calculate_h2h_probability(self, h2h_record: Dict[str, int]) -> float:
        """Calculate probability from head-to-head record"""
        wins = h2h_record.get('wins', 0)
        losses = h2h_record.get('losses', 0)
        total = wins + losses
        
        if total == 0:
            return 0.5
        
        # Bayesian approach with prior
        # Add pseudo-counts for regularization
        adjusted_wins = wins + 1
        adjusted_total = total + 2
        
        return adjusted_wins / adjusted_total
    
    def _calculate_injury_adjustment(self, team_impact: float, opponent_impact: float) -> float:
        """Calculate probability adjustment for injuries"""
        # Impact should be between 0 (no impact) and 1 (severe impact)
        net_impact = opponent_impact - team_impact
        
        # Convert to probability adjustment (max ±0.15)
        adjustment = net_impact * 0.15
        
        return adjustment
    
    def _calculate_weather_adjustment(self, weather: Dict[str, Any],
                                     team_data: Dict[str, Any],
                                     sport: str) -> float:
        """Calculate probability adjustment for weather conditions"""
        adjustment = 0.0
        
        if sport.lower() in ['nfl', 'ncaaf']:
            wind_speed = weather.get('wind_speed', 0)
            temp = weather.get('temperature', 60)
            precipitation = weather.get('precipitation', 0)
            
            # Wind favors running teams
            if wind_speed > 15:
                if team_data.get('play_style', {}).get('run_heavy', False):
                    adjustment += 0.03
                else:
                    adjustment -= 0.03
            
            # Cold weather favors defensive teams
            if temp < 32:
                if team_data.get('defensive_rating', 100) < 100:  # Above average defense
                    adjustment += 0.02
            
            # Rain/snow impacts passing teams more
            if precipitation > 0.1:
                if team_data.get('play_style', {}).get('pass_heavy', False):
                    adjustment -= 0.04
        
        elif sport.lower() == 'mlb':
            wind_speed = weather.get('wind_speed', 0)
            wind_direction = weather.get('wind_direction', 0)
            
            # Wind impacts based on ballpark orientation
            if wind_speed > 10:
                if team_data.get('ballpark_factor', 1.0) > 1.0:  # Hitter's park
                    if wind_direction < 180:  # Blowing out
                        adjustment += 0.02
                    else:  # Blowing in
                        adjustment -= 0.02
        
        return adjustment
    
    def identify_value_bets(self, games: List[Dict[str, Any]], 
                           sport: str,
                           min_edge: Optional[float] = None) -> List[MoneylineAnalysis]:
        """
        Identify moneyline bets with positive expected value
        """
        if min_edge is None:
            min_edge = self.min_edge_threshold
        
        value_bets = []
        
        for game in games:
            # Calculate true probabilities for both teams
            home_true_prob = self.calculate_true_probability(
                game['home_team'],
                game['away_team'],
                sport,
                game.get('conditions')
            )
            away_true_prob = 1 - home_true_prob
            
            # Get market odds
            home_odds = game.get('home_moneyline')
            away_odds = game.get('away_moneyline')
            
            if home_odds and away_odds:
                # Calculate implied probabilities
                home_implied = self._american_odds_to_probability(home_odds)
                away_implied = self._american_odds_to_probability(away_odds)
                
                # Check for value on home team
                home_edge = home_true_prob - home_implied
                if home_edge > min_edge:
                    home_analysis = self._create_moneyline_analysis(
                        team=game['home_team']['name'],
                        sport=sport,
                        american_odds=home_odds,
                        true_probability=home_true_prob,
                        implied_probability=home_implied,
                        game_data=game
                    )
                    value_bets.append(home_analysis)
                
                # Check for value on away team
                away_edge = away_true_prob - away_implied
                if away_edge > min_edge:
                    away_analysis = self._create_moneyline_analysis(
                        team=game['away_team']['name'],
                        sport=sport,
                        american_odds=away_odds,
                        true_probability=away_true_prob,
                        implied_probability=away_implied,
                        game_data=game
                    )
                    value_bets.append(away_analysis)
        
        # Sort by expected value
        value_bets.sort(key=lambda x: x.expected_value, reverse=True)
        
        return value_bets
    
    def _create_moneyline_analysis(self, team: str, sport: str,
                                  american_odds: int,
                                  true_probability: float,
                                  implied_probability: float,
                                  game_data: Dict[str, Any]) -> MoneylineAnalysis:
        """Create comprehensive moneyline analysis"""
        edge = true_probability - implied_probability
        
        # Calculate expected value (per $100 bet)
        if american_odds > 0:
            potential_profit = american_odds
        else:
            potential_profit = 100 / (-american_odds / 100)
        
        expected_value = (true_probability * potential_profit) - ((1 - true_probability) * 100)
        
        # Kelly Criterion calculation
        if edge > 0:
            kelly = (edge * (potential_profit / 100)) / (potential_profit / 100)
            kelly = min(kelly * self.kelly_fraction, 0.1)  # Cap at 10% of bankroll
        else:
            kelly = 0
        
        # Confidence score based on data quality and edge size
        confidence = self._calculate_confidence_score(edge, game_data)
        
        # Value rating
        if edge > 0.10:
            value_rating = 'strong'
        elif edge > 0.05:
            value_rating = 'moderate'
        elif edge > 0.03:
            value_rating = 'weak'
        else:
            value_rating = 'no_value'
        
        # Extract key factors
        factors = self._extract_key_factors(game_data, true_probability)
        
        return MoneylineAnalysis(
            team=team,
            sport=sport,
            american_odds=american_odds,
            decimal_odds=self._american_to_decimal(american_odds),
            implied_probability=implied_probability,
            true_probability=true_probability,
            expected_value=expected_value,
            edge=edge,
            kelly_criterion=kelly,
            confidence_score=confidence,
            value_rating=value_rating,
            factors=factors,
            timestamp=datetime.now()
        )
    
    def _calculate_confidence_score(self, edge: float, game_data: Dict[str, Any]) -> float:
        """Calculate confidence in the prediction"""
        base_confidence = min(abs(edge) * 5, 0.5)  # Edge contributes up to 50%
        
        # Data completeness factors
        data_factors = 0.0
        if game_data.get('home_team', {}).get('elo_rating'):
            data_factors += 0.1
        if game_data.get('home_team', {}).get('recent_form'):
            data_factors += 0.1
        if game_data.get('home_team', {}).get('h2h_record'):
            data_factors += 0.1
        if game_data.get('conditions', {}).get('weather'):
            data_factors += 0.05
        if game_data.get('sharp_money'):
            data_factors += 0.15
        
        return min(0.95, base_confidence + data_factors)
    
    def _extract_key_factors(self, game_data: Dict[str, Any], 
                            probability: float) -> Dict[str, Any]:
        """Extract key factors influencing the prediction"""
        factors = {}
        
        # Team strength factors
        if 'elo_rating' in game_data.get('home_team', {}):
            factors['elo_differential'] = (
                game_data['home_team']['elo_rating'] - 
                game_data['away_team']['elo_rating']
            )
        
        # Form factors
        if 'recent_form' in game_data.get('home_team', {}):
            factors['form_differential'] = (
                game_data['home_team']['recent_form'] - 
                game_data['away_team']['recent_form']
            )
        
        # Market factors
        if 'line_movement' in game_data:
            factors['line_movement'] = game_data['line_movement']
        
        if 'sharp_money' in game_data:
            factors['sharp_indicator'] = game_data['sharp_money']
        
        # Situational factors
        factors['rest_days'] = game_data.get('home_team', {}).get('rest_days')
        factors['injuries'] = {
            'home': len(game_data.get('home_team', {}).get('injuries', [])),
            'away': len(game_data.get('away_team', {}).get('injuries', []))
        }
        
        return factors
    
    def _probability_to_american_odds(self, probability: float) -> int:
        """Convert probability to American odds"""
        if probability >= 0.5:
            odds = -(probability / (1 - probability)) * 100
        else:
            odds = ((1 - probability) / probability) * 100
        
        return int(round(odds))
    
    def _american_odds_to_probability(self, odds: int) -> float:
        """Convert American odds to implied probability (with vig)"""
        if odds > 0:
            probability = 100 / (odds + 100)
        else:
            probability = -odds / (-odds + 100)
        
        return probability
    
    def _american_to_decimal(self, american_odds: int) -> float:
        """Convert American odds to decimal odds"""
        if american_odds > 0:
            return (american_odds / 100) + 1
        else:
            return (100 / abs(american_odds)) + 1
    
    def _calculate_conversion_confidence(self, spread: float, sport: str) -> float:
        """Calculate confidence in spread to ML conversion"""
        sport_params = self.sport_specific_params.get(sport.lower(), {})
        
        # Higher confidence for smaller spreads (more accurate conversion)
        spread_confidence = max(0, 1 - (abs(spread) / 20))
        
        # Adjust for key numbers
        if sport.lower() in ['nfl', 'ncaaf']:
            if abs(spread) in sport_params.get('key_numbers', []):
                spread_confidence *= 0.9  # Lower confidence on key numbers
        
        return spread_confidence

    def calculate_arbitrage_opportunities(self, odds_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Identify arbitrage opportunities across different sportsbooks
        """
        arb_opportunities = []
        
        # Group odds by game
        games = {}
        for odds in odds_data:
            game_id = f"{odds['home_team']}_{odds['away_team']}_{odds['date']}"
            if game_id not in games:
                games[game_id] = []
            games[game_id].append(odds)
        
        # Check each game for arbitrage
        for game_id, game_odds in games.items():
            if len(game_odds) < 2:
                continue
            
            # Find best odds for each outcome
            best_home_odds = max(game_odds, key=lambda x: x.get('home_moneyline', -10000))
            best_away_odds = max(game_odds, key=lambda x: x.get('away_moneyline', -10000))
            
            # Calculate if arbitrage exists
            home_prob = self._american_odds_to_probability(best_home_odds['home_moneyline'])
            away_prob = self._american_odds_to_probability(best_away_odds['away_moneyline'])
            
            total_prob = home_prob + away_prob
            
            if total_prob < 1.0:  # Arbitrage opportunity
                # Calculate optimal bet sizing
                home_stake = away_prob / total_prob
                away_stake = home_prob / total_prob
                
                # Calculate guaranteed profit
                profit_margin = (1 / total_prob - 1) * 100
                
                arb_opportunities.append({
                    'game': game_id,
                    'home_bet': {
                        'sportsbook': best_home_odds['sportsbook'],
                        'odds': best_home_odds['home_moneyline'],
                        'stake_percentage': home_stake * 100
                    },
                    'away_bet': {
                        'sportsbook': best_away_odds['sportsbook'],
                        'odds': best_away_odds['away_moneyline'],
                        'stake_percentage': away_stake * 100
                    },
                    'profit_margin': profit_margin,
                    'total_probability': total_prob
                })
        
        # Sort by profit margin
        arb_opportunities.sort(key=lambda x: x['profit_margin'], reverse=True)
        
        return arb_opportunities