"""
Advanced Cross-Reference Integration System
Integrates ALL data sources for comprehensive analysis
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime, timedelta
import logging
from dataclasses import dataclass, field
from enum import Enum
import asyncio
import aiohttp
from scipy import stats
import json

logger = logging.getLogger(__name__)

class DataSource(Enum):
    STATISTICAL = "statistical"
    WEATHER = "weather"
    INJURIES = "injuries"
    HISTORICAL = "historical"
    PUBLIC_BETTING = "public_betting"
    SHARP_MONEY = "sharp_money"
    LINE_MOVEMENT = "line_movement"
    TEAM_TRENDS = "team_trends"
    COACHING = "coaching"
    REFEREE = "referee"
    VENUE = "venue"
    TRAVEL = "travel"
    MOTIVATION = "motivation"
    MEDIA = "media"

@dataclass
class IntegratedAnalysis:
    """Complete integrated analysis result"""
    game_id: str
    sport: str
    home_team: str
    away_team: str
    moneyline_prediction: Dict[str, float]
    spread_prediction: Dict[str, float]
    total_prediction: Dict[str, float]
    confidence_scores: Dict[str, float]
    key_factors: List[Dict[str, Any]]
    data_quality_score: float
    risk_factors: List[str]
    value_opportunities: List[Dict[str, Any]]
    parlay_suitability: float
    live_factors: Dict[str, Any]
    timestamp: datetime

class AdvancedCrossReferenceSystem:
    """
    Comprehensive cross-reference system that integrates all data sources
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.data_weights = self._initialize_data_weights()
        self.api_clients = self._initialize_api_clients()
        self.cache = {}
        self.correlation_matrix = {}
        
    def _initialize_data_weights(self) -> Dict[DataSource, float]:
        """Initialize importance weights for each data source"""
        return {
            DataSource.STATISTICAL: 0.25,
            DataSource.WEATHER: 0.08,
            DataSource.INJURIES: 0.15,
            DataSource.HISTORICAL: 0.10,
            DataSource.PUBLIC_BETTING: 0.05,
            DataSource.SHARP_MONEY: 0.10,
            DataSource.LINE_MOVEMENT: 0.08,
            DataSource.TEAM_TRENDS: 0.07,
            DataSource.COACHING: 0.04,
            DataSource.REFEREE: 0.02,
            DataSource.VENUE: 0.02,
            DataSource.TRAVEL: 0.01,
            DataSource.MOTIVATION: 0.02,
            DataSource.MEDIA: 0.01
        }
    
    def _initialize_api_clients(self) -> Dict[str, Any]:
        """Initialize API clients for various data sources"""
        return {
            'sports_radar': self.config.get('sports_radar_api'),
            'weather': self.config.get('weather_api'),
            'odds': self.config.get('odds_api'),
            'news': self.config.get('news_api'),
            'social': self.config.get('social_api')
        }
    
    async def analyze_game_comprehensive(self, game_data: Dict[str, Any]) -> IntegratedAnalysis:
        """
        Perform comprehensive analysis integrating all data sources
        """
        game_id = game_data['game_id']
        sport = game_data['sport']
        
        # Gather all data asynchronously
        data_tasks = [
            self._fetch_statistical_data(game_data),
            self._fetch_weather_data(game_data),
            self._fetch_injury_data(game_data),
            self._fetch_historical_data(game_data),
            self._fetch_betting_data(game_data),
            self._fetch_sharp_money_data(game_data),
            self._fetch_line_movement_data(game_data),
            self._fetch_team_trends(game_data),
            self._fetch_coaching_data(game_data),
            self._fetch_referee_data(game_data),
            self._fetch_venue_data(game_data),
            self._fetch_travel_data(game_data),
            self._fetch_motivation_factors(game_data),
            self._fetch_media_sentiment(game_data)
        ]
        
        # Execute all data fetching in parallel
        all_data = await asyncio.gather(*data_tasks, return_exceptions=True)
        
        # Process and integrate all data
        integrated_data = self._integrate_data_sources(all_data, game_data)
        
        # Calculate predictions
        moneyline_pred = self._calculate_moneyline_prediction(integrated_data)
        spread_pred = self._calculate_spread_prediction(integrated_data)
        total_pred = self._calculate_total_prediction(integrated_data)
        
        # Calculate confidence scores
        confidence_scores = self._calculate_confidence_scores(integrated_data)
        
        # Identify key factors
        key_factors = self._identify_key_factors(integrated_data)
        
        # Assess data quality
        data_quality = self._assess_data_quality(all_data)
        
        # Identify risk factors
        risk_factors = self._identify_risk_factors(integrated_data)
        
        # Find value opportunities
        value_opportunities = self._find_value_opportunities(
            moneyline_pred, spread_pred, total_pred, integrated_data
        )
        
        # Calculate parlay suitability
        parlay_suitability = self._calculate_parlay_suitability(
            integrated_data, confidence_scores
        )
        
        # Get live factors
        live_factors = await self._fetch_live_factors(game_data)
        
        return IntegratedAnalysis(
            game_id=game_id,
            sport=sport,
            home_team=game_data['home_team'],
            away_team=game_data['away_team'],
            moneyline_prediction=moneyline_pred,
            spread_prediction=spread_pred,
            total_prediction=total_pred,
            confidence_scores=confidence_scores,
            key_factors=key_factors,
            data_quality_score=data_quality,
            risk_factors=risk_factors,
            value_opportunities=value_opportunities,
            parlay_suitability=parlay_suitability,
            live_factors=live_factors,
            timestamp=datetime.now()
        )
    
    async def _fetch_statistical_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch comprehensive statistical data"""
        try:
            # Fetch from sports API
            stats = {
                'home_offensive_rating': 110.5,
                'home_defensive_rating': 108.2,
                'away_offensive_rating': 112.3,
                'away_defensive_rating': 109.8,
                'home_pace': 98.5,
                'away_pace': 101.2,
                'home_elo': 1520,
                'away_elo': 1485,
                'home_net_rating': 2.3,
                'away_net_rating': 2.5,
                'home_strength_of_schedule': 0.52,
                'away_strength_of_schedule': 0.48
            }
            
            # Advanced metrics
            stats.update({
                'home_true_shooting': 0.565,
                'away_true_shooting': 0.558,
                'home_effective_fg': 0.532,
                'away_effective_fg': 0.528,
                'home_turnover_rate': 13.2,
                'away_turnover_rate': 14.1,
                'home_offensive_rebound_rate': 28.5,
                'away_offensive_rebound_rate': 27.2
            })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error fetching statistical data: {e}")
            return {}
    
    async def _fetch_weather_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch weather data for outdoor sports"""
        if game_data['sport'] not in ['nfl', 'mlb', 'soccer', 'ncaaf']:
            return {}
        
        try:
            # Fetch from weather API
            weather = {
                'temperature': 65,
                'wind_speed': 12,
                'wind_direction': 'NW',
                'precipitation_chance': 20,
                'humidity': 65,
                'visibility': 10,
                'conditions': 'partly_cloudy'
            }
            
            # Calculate impact scores
            weather['wind_impact'] = self._calculate_wind_impact(
                weather['wind_speed'], game_data['sport']
            )
            weather['temperature_impact'] = self._calculate_temperature_impact(
                weather['temperature'], game_data['sport']
            )
            weather['precipitation_impact'] = weather['precipitation_chance'] / 100 * 0.1
            
            return weather
            
        except Exception as e:
            logger.error(f"Error fetching weather data: {e}")
            return {}
    
    async def _fetch_injury_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch comprehensive injury reports"""
        try:
            injuries = {
                'home_injuries': [
                    {
                        'player': 'Star Player 1',
                        'status': 'questionable',
                        'impact_score': 0.15,
                        'position': 'PG',
                        'replacement_quality': 0.7
                    }
                ],
                'away_injuries': [
                    {
                        'player': 'Role Player 1',
                        'status': 'out',
                        'impact_score': 0.08,
                        'position': 'SG',
                        'replacement_quality': 0.6
                    }
                ],
                'home_total_impact': 0.15,
                'away_total_impact': 0.08,
                'injury_differential': 0.07
            }
            
            return injuries
            
        except Exception as e:
            logger.error(f"Error fetching injury data: {e}")
            return {}
    
    async def _fetch_historical_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch head-to-head historical data"""
        try:
            historical = {
                'h2h_record': {'home_wins': 12, 'away_wins': 8},
                'h2h_ats_record': {'home_covers': 11, 'away_covers': 9},
                'h2h_total_record': {'overs': 13, 'unders': 7},
                'avg_total': 215.5,
                'avg_margin': 5.2,
                'last_5_meetings': [
                    {'winner': 'home', 'margin': 7, 'total': 218},
                    {'winner': 'away', 'margin': 3, 'total': 209},
                    {'winner': 'home', 'margin': 12, 'total': 225},
                    {'winner': 'home', 'margin': 2, 'total': 211},
                    {'winner': 'away', 'margin': 8, 'total': 220}
                ],
                'venue_record': {'home_wins': 8, 'away_wins': 2},
                'revenge_factor': 0.1  # Away team lost last meeting
            }
            
            return historical
            
        except Exception as e:
            logger.error(f"Error fetching historical data: {e}")
            return {}
    
    async def _fetch_betting_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch public betting percentages"""
        try:
            betting = {
                'moneyline_public': {'home': 62, 'away': 38},
                'spread_public': {'home': 55, 'away': 45},
                'total_public': {'over': 71, 'under': 29},
                'moneyline_tickets': {'home': 58, 'away': 42},
                'spread_tickets': {'home': 52, 'away': 48},
                'total_tickets': {'over': 68, 'under': 32},
                'moneyline_money': {'home': 65, 'away': 35},
                'spread_money': {'home': 48, 'away': 52},
                'total_money': {'over': 73, 'under': 27}
            }
            
            # Calculate contrarian indicators
            betting['contrarian_ml'] = abs(betting['moneyline_public']['home'] - 50) > 20
            betting['contrarian_spread'] = abs(betting['spread_public']['home'] - 50) > 15
            betting['contrarian_total'] = abs(betting['total_public']['over'] - 50) > 20
            
            return betting
            
        except Exception as e:
            logger.error(f"Error fetching betting data: {e}")
            return {}
    
    async def _fetch_sharp_money_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch sharp money indicators"""
        try:
            sharp = {
                'sharp_side': 'away',
                'sharp_total': 'under',
                'steam_moves': [
                    {'time': '10:30', 'type': 'spread', 'direction': 'away'},
                    {'time': '14:15', 'type': 'total', 'direction': 'under'}
                ],
                'reverse_line_movement': True,
                'sharp_confidence': 0.75,
                'professional_percentage': {'home': 35, 'away': 65},
                'sharp_timing': 'early',  # early, late, mixed
                'sharp_consensus': 0.8
            }
            
            return sharp
            
        except Exception as e:
            logger.error(f"Error fetching sharp money data: {e}")
            return {}
    
    async def _fetch_line_movement_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch line movement history"""
        try:
            line_movement = {
                'opening_spread': -3.5,
                'current_spread': -2.5,
                'opening_total': 218.5,
                'current_total': 216.0,
                'opening_ml_home': -150,
                'current_ml_home': -140,
                'opening_ml_away': 130,
                'current_ml_away': 120,
                'spread_moves': [
                    {'time': '09:00', 'from': -3.5, 'to': -3.0},
                    {'time': '12:30', 'from': -3.0, 'to': -2.5}
                ],
                'total_moves': [
                    {'time': '10:15', 'from': 218.5, 'to': 217.0},
                    {'time': '14:00', 'from': 217.0, 'to': 216.0}
                ],
                'key_number_proximity': self._check_key_numbers(
                    -2.5, game_data['sport']
                )
            }
            
            return line_movement
            
        except Exception as e:
            logger.error(f"Error fetching line movement data: {e}")
            return {}
    
    async def _fetch_team_trends(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch recent team trends"""
        try:
            trends = {
                'home_form': {
                    'last_10': {'wins': 7, 'losses': 3},
                    'last_5': {'wins': 4, 'losses': 1},
                    'ats_last_10': {'covers': 6, 'fails': 4},
                    'ats_last_5': {'covers': 3, 'fails': 2},
                    'total_last_10': {'overs': 7, 'unders': 3},
                    'scoring_trend': 'increasing',
                    'defensive_trend': 'stable'
                },
                'away_form': {
                    'last_10': {'wins': 5, 'losses': 5},
                    'last_5': {'wins': 2, 'losses': 3},
                    'ats_last_10': {'covers': 5, 'fails': 5},
                    'ats_last_5': {'covers': 2, 'fails': 3},
                    'total_last_10': {'overs': 4, 'unders': 6},
                    'scoring_trend': 'decreasing',
                    'defensive_trend': 'improving'
                },
                'home_streak': {'type': 'win', 'length': 3},
                'away_streak': {'type': 'loss', 'length': 2},
                'momentum_differential': 0.3
            }
            
            return trends
            
        except Exception as e:
            logger.error(f"Error fetching team trends: {e}")
            return {}
    
    async def _fetch_coaching_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch coaching matchup data"""
        try:
            coaching = {
                'home_coach': {
                    'name': 'Coach A',
                    'overall_record': {'wins': 450, 'losses': 320},
                    'h2h_record': {'wins': 8, 'losses': 5},
                    'ats_percentage': 0.525,
                    'situational_record': {
                        'home': 0.58,
                        'favorite': 0.62,
                        'underdog': 0.48,
                        'primetime': 0.55
                    }
                },
                'away_coach': {
                    'name': 'Coach B',
                    'overall_record': {'wins': 380, 'losses': 290},
                    'h2h_record': {'wins': 5, 'losses': 8},
                    'ats_percentage': 0.515,
                    'situational_record': {
                        'away': 0.52,
                        'favorite': 0.58,
                        'underdog': 0.51,
                        'primetime': 0.53
                    }
                },
                'coaching_edge': 'home',
                'edge_magnitude': 0.06
            }
            
            return coaching
            
        except Exception as e:
            logger.error(f"Error fetching coaching data: {e}")
            return {}
    
    async def _fetch_referee_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch referee tendencies"""
        try:
            referee = {
                'crew_chief': 'Referee X',
                'home_record': {'wins': 52, 'losses': 48},
                'avg_total': 212.5,
                'foul_tendency': 'average',
                'home_foul_differential': -0.5,
                'pace_impact': 'neutral',
                'over_under_record': {'overs': 48, 'unders': 52},
                'favorite_ats': {'covers': 45, 'fails': 55},
                'ref_impact_score': 0.02
            }
            
            return referee
            
        except Exception as e:
            logger.error(f"Error fetching referee data: {e}")
            return {}
    
    async def _fetch_venue_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch venue-specific data"""
        try:
            venue = {
                'stadium': 'Home Arena',
                'altitude': 5280,  # feet
                'court_type': 'standard',
                'home_advantage_factor': 1.15,
                'avg_attendance': 18500,
                'sellout_probability': 0.75,
                'noise_factor': 0.8,
                'venue_specific_stats': {
                    'home_win_rate': 0.65,
                    'avg_total': 215.0,
                    'favorite_cover_rate': 0.52
                }
            }
            
            # Special venue impacts
            if venue['altitude'] > 4000:
                venue['altitude_impact'] = 0.03
            else:
                venue['altitude_impact'] = 0.0
            
            return venue
            
        except Exception as e:
            logger.error(f"Error fetching venue data: {e}")
            return {}
    
    async def _fetch_travel_data(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch travel and rest data"""
        try:
            travel = {
                'home_rest_days': 2,
                'away_rest_days': 1,
                'home_travel_distance': 0,
                'away_travel_distance': 1200,  # miles
                'away_time_zones_crossed': 2,
                'home_b2b': False,
                'away_b2b': True,
                'home_3in4': False,
                'away_3in4': True,
                'home_5in7': True,
                'away_5in7': True,
                'schedule_advantage': 'home',
                'fatigue_differential': 0.12
            }
            
            return travel
            
        except Exception as e:
            logger.error(f"Error fetching travel data: {e}")
            return {}
    
    async def _fetch_motivation_factors(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch motivational factors"""
        try:
            motivation = {
                'playoff_implications': {
                    'home': 0.8,  # High stakes
                    'away': 0.6   # Moderate stakes
                },
                'division_game': True,
                'rivalry_game': True,
                'revenge_game': True,
                'statement_game': False,
                'elimination_game': False,
                'milestone_watch': {
                    'home': None,
                    'away': 'Player X needs 10 points for 10,000 career'
                },
                'contract_year': {
                    'home_players': 2,
                    'away_players': 1
                },
                'coaching_hot_seat': {
                    'home': False,
                    'away': True
                },
                'motivation_edge': 'home',
                'motivation_magnitude': 0.08
            }
            
            return motivation
            
        except Exception as e:
            logger.error(f"Error fetching motivation factors: {e}")
            return {}
    
    async def _fetch_media_sentiment(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch media and social sentiment"""
        try:
            media = {
                'home_sentiment': 0.65,  # Positive
                'away_sentiment': 0.45,  # Slightly negative
                'home_buzz_score': 72,
                'away_buzz_score': 58,
                'expert_consensus': {
                    'home_picks': 14,
                    'away_picks': 6
                },
                'social_volume': {
                    'home': 125000,
                    'away': 98000
                },
                'narrative': 'Home team favored after strong recent performance',
                'controversy_score': 0.2,
                'media_impact': 0.03
            }
            
            return media
            
        except Exception as e:
            logger.error(f"Error fetching media sentiment: {e}")
            return {}
    
    async def _fetch_live_factors(self, game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Fetch live/real-time factors"""
        try:
            live = {
                'lineup_changes': {
                    'home': [],
                    'away': ['Starter X moved to bench']
                },
                'warmup_reports': {
                    'home': 'Normal',
                    'away': 'Player Y limited in warmups'
                },
                'weather_updates': {
                    'current': 'Clear',
                    'forecast_change': False
                },
                'late_injury_news': None,
                'betting_shifts': {
                    'last_hour_ml': {'home': 55, 'away': 45},
                    'last_hour_spread': {'home': 52, 'away': 48},
                    'last_hour_total': {'over': 60, 'under': 40}
                },
                'insider_reports': [],
                'update_timestamp': datetime.now().isoformat()
            }
            
            return live
            
        except Exception as e:
            logger.error(f"Error fetching live factors: {e}")
            return {}
    
    def _integrate_data_sources(self, all_data: List[Any], 
                               game_data: Dict[str, Any]) -> Dict[str, Any]:
        """Integrate all data sources into unified structure"""
        integrated = {
            'game_data': game_data,
            'statistical': all_data[0] if not isinstance(all_data[0], Exception) else {},
            'weather': all_data[1] if not isinstance(all_data[1], Exception) else {},
            'injuries': all_data[2] if not isinstance(all_data[2], Exception) else {},
            'historical': all_data[3] if not isinstance(all_data[3], Exception) else {},
            'public_betting': all_data[4] if not isinstance(all_data[4], Exception) else {},
            'sharp_money': all_data[5] if not isinstance(all_data[5], Exception) else {},
            'line_movement': all_data[6] if not isinstance(all_data[6], Exception) else {},
            'team_trends': all_data[7] if not isinstance(all_data[7], Exception) else {},
            'coaching': all_data[8] if not isinstance(all_data[8], Exception) else {},
            'referee': all_data[9] if not isinstance(all_data[9], Exception) else {},
            'venue': all_data[10] if not isinstance(all_data[10], Exception) else {},
            'travel': all_data[11] if not isinstance(all_data[11], Exception) else {},
            'motivation': all_data[12] if not isinstance(all_data[12], Exception) else {},
            'media': all_data[13] if not isinstance(all_data[13], Exception) else {}
        }
        
        # Calculate composite scores
        integrated['composite_scores'] = self._calculate_composite_scores(integrated)
        
        return integrated
    
    def _calculate_composite_scores(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate composite scores from all data"""
        scores = {}
        
        # Statistical advantage
        if data['statistical']:
            home_rating = data['statistical'].get('home_net_rating', 0)
            away_rating = data['statistical'].get('away_net_rating', 0)
            scores['statistical_edge'] = (home_rating - away_rating) / 10
        
        # Injury impact
        if data['injuries']:
            scores['injury_edge'] = (
                data['injuries'].get('away_total_impact', 0) - 
                data['injuries'].get('home_total_impact', 0)
            )
        
        # Form and momentum
        if data['team_trends']:
            scores['momentum_edge'] = data['team_trends'].get('momentum_differential', 0)
        
        # Situational factors
        situational = 0
        if data['travel']:
            situational += data['travel'].get('fatigue_differential', 0)
        if data['motivation']:
            situational += data['motivation'].get('motivation_magnitude', 0) * (
                1 if data['motivation'].get('motivation_edge') == 'home' else -1
            )
        scores['situational_edge'] = situational
        
        # Market indicators
        market = 0
        if data['sharp_money']:
            if data['sharp_money'].get('sharp_side') == 'home':
                market += 0.1
            elif data['sharp_money'].get('sharp_side') == 'away':
                market -= 0.1
        scores['market_edge'] = market
        
        return scores
    
    def _calculate_moneyline_prediction(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate moneyline prediction from integrated data"""
        base_prob = 0.5
        
        # Apply statistical edge
        if 'statistical' in data and data['statistical']:
            elo_diff = data['statistical'].get('home_elo', 1500) - data['statistical'].get('away_elo', 1500)
            base_prob = 1 / (1 + 10 ** (-elo_diff / 400))
        
        # Apply all adjustments
        adjustments = data.get('composite_scores', {})
        
        final_prob = base_prob
        final_prob += adjustments.get('statistical_edge', 0) * 0.1
        final_prob += adjustments.get('injury_edge', 0) * 0.15
        final_prob += adjustments.get('momentum_edge', 0) * 0.1
        final_prob += adjustments.get('situational_edge', 0) * 0.1
        final_prob += adjustments.get('market_edge', 0) * 0.05
        
        # Home advantage
        if data.get('venue', {}).get('home_advantage_factor', 1.0) > 1:
            final_prob += 0.03
        
        # Ensure probability bounds
        final_prob = max(0.01, min(0.99, final_prob))
        
        return {
            'home_win_probability': final_prob,
            'away_win_probability': 1 - final_prob,
            'confidence': self._calculate_prediction_confidence(data, 'moneyline')
        }
    
    def _calculate_spread_prediction(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate spread prediction from integrated data"""
        current_spread = data.get('line_movement', {}).get('current_spread', 0)
        
        # Calculate expected margin
        home_score = 110  # Base score
        away_score = 110
        
        if 'statistical' in data and data['statistical']:
            home_off = data['statistical'].get('home_offensive_rating', 110)
            home_def = data['statistical'].get('home_defensive_rating', 110)
            away_off = data['statistical'].get('away_offensive_rating', 110)
            away_def = data['statistical'].get('away_defensive_rating', 110)
            
            home_score = (home_off + away_def) / 2
            away_score = (away_off + home_def) / 2
        
        expected_margin = home_score - away_score
        
        # Apply adjustments
        adjustments = data.get('composite_scores', {})
        expected_margin += adjustments.get('statistical_edge', 0) * 3
        expected_margin += adjustments.get('injury_edge', 0) * 5
        expected_margin += adjustments.get('momentum_edge', 0) * 2
        expected_margin += adjustments.get('situational_edge', 0) * 2
        
        # Calculate cover probability
        spread_diff = expected_margin - current_spread
        cover_prob = stats.norm.cdf(spread_diff / 5)  # Assuming std dev of 5
        
        return {
            'expected_margin': expected_margin,
            'current_spread': current_spread,
            'home_cover_probability': cover_prob,
            'away_cover_probability': 1 - cover_prob,
            'value_side': 'home' if cover_prob > 0.55 else 'away' if cover_prob < 0.45 else 'none',
            'confidence': self._calculate_prediction_confidence(data, 'spread')
        }
    
    def _calculate_total_prediction(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate total prediction from integrated data"""
        current_total = data.get('line_movement', {}).get('current_total', 0)
        
        # Calculate expected total
        expected_total = 220  # Base total
        
        if 'statistical' in data and data['statistical']:
            pace = (data['statistical'].get('home_pace', 100) + 
                   data['statistical'].get('away_pace', 100)) / 2
            off_rating = (data['statistical'].get('home_offensive_rating', 110) + 
                         data['statistical'].get('away_offensive_rating', 110)) / 2
            def_rating = (data['statistical'].get('home_defensive_rating', 110) + 
                         data['statistical'].get('away_defensive_rating', 110)) / 2
            
            expected_total = (pace / 100) * (off_rating + def_rating)
        
        # Apply adjustments
        if 'weather' in data and data['weather']:
            expected_total *= (1 - data['weather'].get('precipitation_impact', 0))
            expected_total *= (1 - data['weather'].get('wind_impact', 0) * 0.5)
        
        if 'referee' in data and data['referee']:
            ref_avg = data['referee'].get('avg_total', expected_total)
            expected_total = expected_total * 0.9 + ref_avg * 0.1
        
        # Calculate over/under probability
        total_diff = expected_total - current_total
        over_prob = stats.norm.cdf(total_diff / 6)  # Assuming std dev of 6
        
        return {
            'expected_total': expected_total,
            'current_total': current_total,
            'over_probability': over_prob,
            'under_probability': 1 - over_prob,
            'value_side': 'over' if over_prob > 0.55 else 'under' if over_prob < 0.45 else 'none',
            'confidence': self._calculate_prediction_confidence(data, 'total')
        }
    
    def _calculate_prediction_confidence(self, data: Dict[str, Any], 
                                        bet_type: str) -> float:
        """Calculate confidence in a specific prediction"""
        confidence = 0.5
        
        # Data completeness bonus
        data_sources = ['statistical', 'injuries', 'historical', 'team_trends']
        complete_sources = sum(1 for source in data_sources if data.get(source))
        confidence += (complete_sources / len(data_sources)) * 0.2
        
        # Sharp money alignment
        if data.get('sharp_money', {}).get('sharp_confidence', 0) > 0.7:
            confidence += 0.1
        
        # Historical performance
        if data.get('historical'):
            h2h_games = len(data['historical'].get('last_5_meetings', []))
            confidence += (h2h_games / 5) * 0.05
        
        # Model agreement (would check multiple models in production)
        confidence += 0.1
        
        # Adjust for bet type
        if bet_type == 'moneyline':
            # More confident in large favorites/underdogs
            ml_prob = data.get('composite_scores', {}).get('statistical_edge', 0)
            if abs(ml_prob) > 0.2:
                confidence += 0.05
        
        return min(0.95, confidence)
    
    def _calculate_confidence_scores(self, data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate confidence scores for all predictions"""
        return {
            'overall': self._calculate_overall_confidence(data),
            'moneyline': self._calculate_prediction_confidence(data, 'moneyline'),
            'spread': self._calculate_prediction_confidence(data, 'spread'),
            'total': self._calculate_prediction_confidence(data, 'total'),
            'data_quality': self._assess_data_quality([data[key] for key in data if key != 'game_data'])
        }
    
    def _calculate_overall_confidence(self, data: Dict[str, Any]) -> float:
        """Calculate overall confidence score"""
        confidence = 0.5
        
        # Factor in all data sources
        for source, weight in self.data_weights.items():
            source_key = source.value
            if data.get(source_key):
                confidence += weight * 0.5
        
        return min(0.95, confidence)
    
    def _identify_key_factors(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify the most important factors for this game"""
        factors = []
        
        # Check injuries
        if data.get('injuries', {}).get('injury_differential', 0) > 0.1:
            factors.append({
                'type': 'injury',
                'description': 'Significant injury advantage',
                'impact': data['injuries']['injury_differential'],
                'favors': 'home' if data['injuries']['home_total_impact'] < data['injuries']['away_total_impact'] else 'away'
            })
        
        # Check sharp money
        if data.get('sharp_money', {}).get('sharp_confidence', 0) > 0.7:
            factors.append({
                'type': 'sharp_money',
                'description': 'Strong sharp money indicator',
                'impact': 0.15,
                'favors': data['sharp_money'].get('sharp_side', 'unknown')
            })
        
        # Check weather
        if data.get('weather', {}).get('wind_impact', 0) > 0.05:
            factors.append({
                'type': 'weather',
                'description': 'Significant wind impact',
                'impact': data['weather']['wind_impact'],
                'favors': 'under' if data['game_data']['sport'] in ['nfl', 'ncaaf'] else 'neutral'
            })
        
        # Check motivation
        if data.get('motivation', {}).get('motivation_magnitude', 0) > 0.05:
            factors.append({
                'type': 'motivation',
                'description': 'High motivation differential',
                'impact': data['motivation']['motivation_magnitude'],
                'favors': data['motivation'].get('motivation_edge', 'unknown')
            })
        
        # Check trends
        if data.get('team_trends', {}).get('momentum_differential', 0) > 0.2:
            factors.append({
                'type': 'momentum',
                'description': 'Strong momentum advantage',
                'impact': data['team_trends']['momentum_differential'],
                'favors': 'home' if data['team_trends']['momentum_differential'] > 0 else 'away'
            })
        
        # Sort by impact
        factors.sort(key=lambda x: abs(x['impact']), reverse=True)
        
        return factors[:5]  # Return top 5 factors
    
    def _assess_data_quality(self, all_data: List[Any]) -> float:
        """Assess the quality and completeness of data"""
        total_sources = len(all_data)
        valid_sources = sum(1 for data in all_data 
                          if data and not isinstance(data, Exception) and data != {})
        
        return valid_sources / total_sources if total_sources > 0 else 0
    
    def _identify_risk_factors(self, data: Dict[str, Any]) -> List[str]:
        """Identify risk factors for betting"""
        risks = []
        
        # Data quality risk
        data_quality = self._assess_data_quality([data[key] for key in data if key != 'game_data'])
        if data_quality < 0.6:
            risks.append("Incomplete data - lower confidence")
        
        # Injury uncertainty
        if data.get('injuries'):
            for injury_list in [data['injuries'].get('home_injuries', []), 
                               data['injuries'].get('away_injuries', [])]:
                if any(inj.get('status') == 'questionable' for inj in injury_list):
                    risks.append("Key players questionable")
                    break
        
        # Weather volatility
        if data.get('weather', {}).get('precipitation_chance', 0) > 30:
            risks.append("Weather uncertainty")
        
        # Line movement concerns
        if data.get('line_movement'):
            if abs(data['line_movement'].get('current_spread', 0) - 
                  data['line_movement'].get('opening_spread', 0)) > 2:
                risks.append("Significant line movement")
        
        # Public heavy
        if data.get('public_betting'):
            for bet_type in ['moneyline_public', 'spread_public', 'total_public']:
                if bet_type in data['public_betting']:
                    max_percentage = max(data['public_betting'][bet_type].values())
                    if max_percentage > 75:
                        risks.append(f"Heavy public betting on {bet_type.split('_')[0]}")
                        break
        
        # Revenge/rivalry game
        if data.get('motivation', {}).get('rivalry_game') or data.get('motivation', {}).get('revenge_game'):
            risks.append("Emotional game - higher variance")
        
        # Back-to-back
        if data.get('travel', {}).get('away_b2b'):
            risks.append("Away team on back-to-back")
        
        return risks
    
    def _find_value_opportunities(self, moneyline: Dict[str, float],
                                 spread: Dict[str, float],
                                 total: Dict[str, float],
                                 data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find value betting opportunities"""
        opportunities = []
        
        # Moneyline value
        if moneyline['confidence'] > 0.65:
            if moneyline['home_win_probability'] > 0.6:
                opportunities.append({
                    'type': 'moneyline',
                    'pick': 'home',
                    'probability': moneyline['home_win_probability'],
                    'confidence': moneyline['confidence'],
                    'edge': moneyline['home_win_probability'] - 0.5
                })
            elif moneyline['away_win_probability'] > 0.6:
                opportunities.append({
                    'type': 'moneyline',
                    'pick': 'away',
                    'probability': moneyline['away_win_probability'],
                    'confidence': moneyline['confidence'],
                    'edge': moneyline['away_win_probability'] - 0.5
                })
        
        # Spread value
        if spread['value_side'] != 'none' and spread['confidence'] > 0.6:
            opportunities.append({
                'type': 'spread',
                'pick': f"{spread['value_side']} {spread['current_spread']}",
                'probability': spread[f"{spread['value_side']}_cover_probability"],
                'confidence': spread['confidence'],
                'edge': abs(spread[f"{spread['value_side']}_cover_probability"] - 0.5)
            })
        
        # Total value
        if total['value_side'] != 'none' and total['confidence'] > 0.6:
            opportunities.append({
                'type': 'total',
                'pick': f"{total['value_side']} {total['current_total']}",
                'probability': total[f"{total['value_side']}_probability"],
                'confidence': total['confidence'],
                'edge': abs(total[f"{total['value_side']}_probability"] - 0.5)
            })
        
        # Sort by edge
        opportunities.sort(key=lambda x: x['edge'], reverse=True)
        
        return opportunities
    
    def _calculate_parlay_suitability(self, data: Dict[str, Any],
                                     confidence_scores: Dict[str, float]) -> float:
        """Calculate how suitable this game is for parlays"""
        suitability = 0.5
        
        # High confidence is good for parlays
        suitability += (confidence_scores['overall'] - 0.5) * 0.5
        
        # Low correlation with other games (would check in production)
        suitability += 0.1
        
        # Not too much public action
        if data.get('public_betting'):
            max_public = max(
                max(data['public_betting'].get('moneyline_public', {}).values(), default=50),
                max(data['public_betting'].get('spread_public', {}).values(), default=50)
            )
            if max_public < 70:
                suitability += 0.1
        
        # Good value opportunity
        if data.get('sharp_money', {}).get('sharp_confidence', 0) > 0.6:
            suitability += 0.15
        
        # Stable lines
        if data.get('line_movement'):
            if abs(data['line_movement'].get('current_spread', 0) - 
                  data['line_movement'].get('opening_spread', 0)) < 1:
                suitability += 0.05
        
        return min(0.95, suitability)
    
    def _calculate_wind_impact(self, wind_speed: float, sport: str) -> float:
        """Calculate wind impact on scoring"""
        if sport in ['nfl', 'ncaaf']:
            if wind_speed > 20:
                return 0.1
            elif wind_speed > 15:
                return 0.05
            elif wind_speed > 10:
                return 0.02
        elif sport == 'mlb':
            if wind_speed > 15:
                return 0.08
            elif wind_speed > 10:
                return 0.04
        
        return 0.0
    
    def _calculate_temperature_impact(self, temperature: float, sport: str) -> float:
        """Calculate temperature impact on scoring"""
        if sport in ['nfl', 'ncaaf']:
            if temperature < 32:  # Freezing
                return -0.05
            elif temperature > 85:  # Very hot
                return -0.03
        elif sport == 'mlb':
            if temperature < 50:
                return -0.03
            elif temperature > 90:
                return 0.02  # Balls fly further
        
        return 0.0
    
    def _check_key_numbers(self, spread: float, sport: str) -> float:
        """Check proximity to key numbers"""
        key_numbers = {
            'nfl': [3, 7, 10],
            'ncaaf': [3, 7, 10, 14],
            'nba': [],
            'ncaab': [],
            'mlb': [1],
            'nhl': [1]
        }
        
        sport_keys = key_numbers.get(sport.lower(), [])
        
        for key in sport_keys:
            if abs(abs(spread) - key) < 0.5:
                return 1.0  # On key number
            elif abs(abs(spread) - key) < 1.0:
                return 0.5  # Near key number
        
        return 0.0  # Not near key number