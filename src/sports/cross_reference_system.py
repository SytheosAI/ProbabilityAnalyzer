"""
Cross-Reference System for Multi-Factor Sports Analysis
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import MinMaxScaler
import logging
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class ImpactFactor(Enum):
    """Types of impact factors"""
    VENUE = "venue"
    OPPONENT = "opponent"
    REST = "rest"
    SCHEDULE = "schedule"
    INJURY = "injury"
    COACHING = "coaching"
    REFEREE = "referee"
    TRAVEL = "travel"
    TIME = "time"
    RIVALRY = "rivalry"

@dataclass
class VenueProfile:
    """Venue/Stadium characteristics"""
    venue_id: str
    name: str
    location: Dict[str, float]  # lat, lon
    capacity: int
    surface_type: str
    altitude: float
    indoor: bool
    dimensions: Dict[str, float]
    park_factors: Dict[str, float]  # For baseball
    home_advantage_rating: float
    noise_level: float
    historical_scoring: Dict[str, float]

@dataclass
class CrossReferenceResult:
    """Result of cross-reference analysis"""
    base_value: float
    adjusted_value: float
    total_adjustment: float
    factor_adjustments: Dict[str, float]
    confidence: float
    key_insights: List[str]
    risk_factors: List[str]

class CrossReferenceSystem:
    """System for cross-referencing multiple factors in sports analysis"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.scaler = MinMaxScaler()
        
        # Factor weights by sport
        self.factor_weights = {
            'NFL': {
                ImpactFactor.VENUE: 0.15,
                ImpactFactor.OPPONENT: 0.25,
                ImpactFactor.REST: 0.15,
                ImpactFactor.SCHEDULE: 0.10,
                ImpactFactor.INJURY: 0.20,
                ImpactFactor.COACHING: 0.05,
                ImpactFactor.REFEREE: 0.03,
                ImpactFactor.TRAVEL: 0.05,
                ImpactFactor.TIME: 0.02
            },
            'NBA': {
                ImpactFactor.VENUE: 0.12,
                ImpactFactor.OPPONENT: 0.20,
                ImpactFactor.REST: 0.20,
                ImpactFactor.SCHEDULE: 0.15,
                ImpactFactor.INJURY: 0.18,
                ImpactFactor.COACHING: 0.05,
                ImpactFactor.REFEREE: 0.02,
                ImpactFactor.TRAVEL: 0.06,
                ImpactFactor.TIME: 0.02
            },
            'MLB': {
                ImpactFactor.VENUE: 0.20,  # Park factors matter more
                ImpactFactor.OPPONENT: 0.25,
                ImpactFactor.REST: 0.08,
                ImpactFactor.SCHEDULE: 0.10,
                ImpactFactor.INJURY: 0.15,
                ImpactFactor.COACHING: 0.08,
                ImpactFactor.REFEREE: 0.04,  # Umpire
                ImpactFactor.TRAVEL: 0.05,
                ImpactFactor.TIME: 0.05
            },
            'NHL': {
                ImpactFactor.VENUE: 0.10,
                ImpactFactor.OPPONENT: 0.22,
                ImpactFactor.REST: 0.18,
                ImpactFactor.SCHEDULE: 0.12,
                ImpactFactor.INJURY: 0.20,
                ImpactFactor.COACHING: 0.06,
                ImpactFactor.REFEREE: 0.02,
                ImpactFactor.TRAVEL: 0.08,
                ImpactFactor.TIME: 0.02
            },
            'SOCCER': {
                ImpactFactor.VENUE: 0.18,
                ImpactFactor.OPPONENT: 0.25,
                ImpactFactor.REST: 0.12,
                ImpactFactor.SCHEDULE: 0.08,
                ImpactFactor.INJURY: 0.20,
                ImpactFactor.COACHING: 0.07,
                ImpactFactor.REFEREE: 0.03,
                ImpactFactor.TRAVEL: 0.05,
                ImpactFactor.TIME: 0.02
            }
        }
        
        # Venue-specific adjustments
        self.venue_impacts = {
            'MLB': {
                'coors_field': {'batting_average': 0.15, 'home_runs': 0.30, 'era': -0.25},
                'yankee_stadium': {'home_runs': 0.10, 'strikeouts': -0.05},
                'fenway_park': {'doubles': 0.20, 'batting_average': 0.08},
                'petco_park': {'batting_average': -0.10, 'home_runs': -0.15, 'era': 0.15}
            },
            'NFL': {
                'mile_high': {'field_goals': -0.05, 'passing_yards': 0.05},
                'lambeau_field': {'passing_yards': -0.08, 'rushing_yards': 0.05},
                'superdome': {'passing_yards': 0.05, 'total_points': 0.03}
            }
        }
        
        # Rest day impacts
        self.rest_impacts = {
            'NBA': {
                0: -0.12,  # Back-to-back
                1: -0.05,  # One day rest
                2: 0.00,   # Normal rest
                3: 0.02,
                4: 0.03,
                5: 0.02,   # Too much rest can be negative
                6: 0.01,
                7: -0.01   # Rust factor
            },
            'NHL': {
                0: -0.15,
                1: -0.08,
                2: 0.00,
                3: 0.03,
                4: 0.02,
                5: 0.01,
                6: -0.02
            },
            'NFL': {
                6: -0.05,   # Short week
                7: 0.00,    # Normal
                10: 0.05,   # Extra rest
                14: 0.08    # Bye week
            },
            'MLB': {
                0: 0.00,    # Normal in baseball
                1: 0.00,
                2: 0.01,
                3: 0.02
            }
        }
    
    def cross_reference_factors(self,
                               base_prediction: float,
                               sport: str,
                               context: Dict[str, Any]) -> CrossReferenceResult:
        """Cross-reference multiple factors for comprehensive adjustment"""
        sport_upper = sport.upper()
        
        if sport_upper not in self.factor_weights:
            return CrossReferenceResult(
                base_value=base_prediction,
                adjusted_value=base_prediction,
                total_adjustment=0.0,
                factor_adjustments={},
                confidence=0.5,
                key_insights=[],
                risk_factors=[]
            )
        
        factor_adjustments = {}
        key_insights = []
        risk_factors = []
        
        # Venue/Stadium factors
        venue_adj = self._calculate_venue_impact(
            context.get('venue'),
            context.get('stat_name'),
            sport_upper
        )
        if venue_adj != 0:
            factor_adjustments[ImpactFactor.VENUE.value] = venue_adj
            if abs(venue_adj) > 0.10:
                key_insights.append(f"Significant venue impact: {venue_adj:+.1%}")
        
        # Opponent strength adjustment
        opponent_adj = self._calculate_opponent_impact(
            context.get('opponent_strength'),
            context.get('head_to_head'),
            sport_upper
        )
        if opponent_adj != 0:
            factor_adjustments[ImpactFactor.OPPONENT.value] = opponent_adj
            if abs(opponent_adj) > 0.15:
                key_insights.append(f"Strong opponent factor: {opponent_adj:+.1%}")
        
        # Rest days impact
        rest_adj = self._calculate_rest_impact(
            context.get('rest_days'),
            context.get('opponent_rest_days'),
            sport_upper
        )
        if rest_adj != 0:
            factor_adjustments[ImpactFactor.REST.value] = rest_adj
            if abs(rest_adj) > 0.10:
                risk_factors.append(f"Rest disadvantage: {rest_adj:+.1%}")
        
        # Schedule spot impact
        schedule_adj = self._calculate_schedule_impact(
            context.get('schedule_spot'),
            context.get('games_in_period'),
            sport_upper
        )
        if schedule_adj != 0:
            factor_adjustments[ImpactFactor.SCHEDULE.value] = schedule_adj
            if abs(schedule_adj) > 0.08:
                risk_factors.append(f"Difficult schedule spot: {schedule_adj:+.1%}")
        
        # Injury impact
        injury_adj = self._calculate_injury_impact(
            context.get('injuries'),
            context.get('opponent_injuries'),
            sport_upper
        )
        if injury_adj != 0:
            factor_adjustments[ImpactFactor.INJURY.value] = injury_adj
            if abs(injury_adj) > 0.15:
                key_insights.append(f"Major injury impact: {injury_adj:+.1%}")
                risk_factors.append("Key players injured")
        
        # Coaching/tactical impact
        coaching_adj = self._calculate_coaching_impact(
            context.get('coach_record'),
            context.get('tactical_matchup'),
            sport_upper
        )
        if coaching_adj != 0:
            factor_adjustments[ImpactFactor.COACHING.value] = coaching_adj
        
        # Referee/Umpire tendencies
        referee_adj = self._calculate_referee_impact(
            context.get('referee'),
            context.get('stat_name'),
            sport_upper
        )
        if referee_adj != 0:
            factor_adjustments[ImpactFactor.REFEREE.value] = referee_adj
        
        # Travel impact
        travel_adj = self._calculate_travel_impact(
            context.get('travel_distance'),
            context.get('time_zones_crossed'),
            sport_upper
        )
        if travel_adj != 0:
            factor_adjustments[ImpactFactor.TRAVEL.value] = travel_adj
            if abs(travel_adj) > 0.05:
                risk_factors.append(f"Travel fatigue: {travel_adj:+.1%}")
        
        # Time of game impact
        time_adj = self._calculate_time_impact(
            context.get('game_time'),
            context.get('player_preference'),
            sport_upper
        )
        if time_adj != 0:
            factor_adjustments[ImpactFactor.TIME.value] = time_adj
        
        # Rivalry games
        if context.get('is_rivalry'):
            rivalry_adj = self._calculate_rivalry_impact(sport_upper)
            if rivalry_adj != 0:
                factor_adjustments[ImpactFactor.RIVALRY.value] = rivalry_adj
                key_insights.append("Rivalry game - expect increased intensity")
        
        # Calculate weighted total adjustment
        weights = self.factor_weights[sport_upper]
        total_adjustment = sum(
            adj * weights.get(ImpactFactor(factor), 0.1)
            for factor, adj in factor_adjustments.items()
            if factor in [f.value for f in ImpactFactor]
        )
        
        # Apply adjustment
        adjusted_value = base_prediction * (1 + total_adjustment)
        
        # Calculate confidence
        confidence = self._calculate_confidence(factor_adjustments, context)
        
        return CrossReferenceResult(
            base_value=base_prediction,
            adjusted_value=adjusted_value,
            total_adjustment=total_adjustment,
            factor_adjustments=factor_adjustments,
            confidence=confidence,
            key_insights=key_insights,
            risk_factors=risk_factors
        )
    
    def _calculate_venue_impact(self,
                               venue: Optional[str],
                               stat_name: Optional[str],
                               sport: str) -> float:
        """Calculate venue-specific impact"""
        if not venue or not stat_name:
            return 0.0
        
        # Check for specific venue impacts
        if sport in self.venue_impacts:
            venue_lower = venue.lower().replace(' ', '_')
            if venue_lower in self.venue_impacts[sport]:
                venue_factors = self.venue_impacts[sport][venue_lower]
                return venue_factors.get(stat_name, 0.0)
        
        # Generic home/away adjustment
        if sport == 'NFL':
            return 0.03  # 3% home advantage
        elif sport == 'NBA':
            return 0.04
        elif sport == 'MLB':
            return 0.02
        elif sport == 'NHL':
            return 0.03
        elif sport == 'SOCCER':
            return 0.05
        
        return 0.0
    
    def _calculate_opponent_impact(self,
                                  opponent_strength: Optional[float],
                                  head_to_head: Optional[Dict],
                                  sport: str) -> float:
        """Calculate opponent strength impact"""
        impact = 0.0
        
        if opponent_strength is not None:
            # Opponent strength on 0-100 scale
            strength_factor = (opponent_strength - 50) / 100
            impact -= strength_factor * 0.20  # Up to ±20% impact
        
        if head_to_head:
            # Historical head-to-head performance
            h2h_record = head_to_head.get('win_percentage', 0.5)
            if h2h_record < 0.4:
                impact -= 0.05  # Struggle against this opponent
            elif h2h_record > 0.6:
                impact += 0.05  # Success against this opponent
        
        return impact
    
    def _calculate_rest_impact(self,
                              rest_days: Optional[int],
                              opponent_rest: Optional[int],
                              sport: str) -> float:
        """Calculate rest days impact"""
        if rest_days is None:
            return 0.0
        
        if sport not in self.rest_impacts:
            return 0.0
        
        rest_schedule = self.rest_impacts[sport]
        
        # Get base rest impact
        impact = rest_schedule.get(rest_days, 0.0)
        
        # Adjust for rest differential
        if opponent_rest is not None:
            rest_differential = rest_days - opponent_rest
            if rest_differential < -1:
                impact -= 0.03  # Opponent more rested
            elif rest_differential > 1:
                impact += 0.03  # We're more rested
        
        return impact
    
    def _calculate_schedule_impact(self,
                                  schedule_spot: Optional[str],
                                  games_in_period: Optional[Dict],
                                  sport: str) -> float:
        """Calculate schedule difficulty impact"""
        impact = 0.0
        
        if schedule_spot:
            # Specific schedule situations
            if schedule_spot == 'b2b':  # Back-to-back
                impact = -0.12
            elif schedule_spot == '3in4':  # 3 games in 4 nights
                impact = -0.15
            elif schedule_spot == '4in5':  # 4 games in 5 nights
                impact = -0.18
            elif schedule_spot == '5in7':  # 5 games in 7 nights
                impact = -0.10
            elif schedule_spot == 'post_bye':  # After bye week
                impact = 0.05
            elif schedule_spot == 'short_week':  # Thursday game after Sunday
                impact = -0.08
        
        if games_in_period:
            # Fatigue from compressed schedule
            if games_in_period.get('last_7_days', 0) >= 4:
                impact -= 0.08
            elif games_in_period.get('last_14_days', 0) >= 8:
                impact -= 0.05
        
        return impact
    
    def _calculate_injury_impact(self,
                                injuries: Optional[List[Dict]],
                                opponent_injuries: Optional[List[Dict]],
                                sport: str) -> float:
        """Calculate injury impact on performance"""
        impact = 0.0
        
        if injuries:
            for injury in injuries:
                player_importance = injury.get('importance', 0.5)  # 0-1 scale
                injury_severity = injury.get('severity', 0.5)  # 0-1 scale
                probability_playing = injury.get('probability_playing', 0.5)
                
                # Calculate individual injury impact
                injury_impact = player_importance * injury_severity * (1 - probability_playing)
                impact -= injury_impact * 0.25  # Up to 25% impact per key injury
        
        if opponent_injuries:
            for injury in opponent_injuries:
                player_importance = injury.get('importance', 0.5)
                injury_severity = injury.get('severity', 0.5)
                probability_playing = injury.get('probability_playing', 0.5)
                
                # Opponent injuries help us
                injury_impact = player_importance * injury_severity * (1 - probability_playing)
                impact += injury_impact * 0.20
        
        return max(-0.40, min(0.20, impact))  # Cap total injury impact
    
    def _calculate_coaching_impact(self,
                                  coach_record: Optional[Dict],
                                  tactical_matchup: Optional[str],
                                  sport: str) -> float:
        """Calculate coaching and tactical impact"""
        impact = 0.0
        
        if coach_record:
            # Coach's record in similar situations
            situation_record = coach_record.get('situation_win_pct', 0.5)
            if situation_record > 0.6:
                impact += 0.03
            elif situation_record < 0.4:
                impact -= 0.03
            
            # Head-to-head coaching record
            h2h_record = coach_record.get('h2h_win_pct', 0.5)
            if h2h_record > 0.6:
                impact += 0.02
            elif h2h_record < 0.4:
                impact -= 0.02
        
        if tactical_matchup:
            # Tactical advantages/disadvantages
            if tactical_matchup == 'favorable':
                impact += 0.05
            elif tactical_matchup == 'unfavorable':
                impact -= 0.05
        
        return impact
    
    def _calculate_referee_impact(self,
                                 referee: Optional[str],
                                 stat_name: Optional[str],
                                 sport: str) -> float:
        """Calculate referee/umpire tendencies impact"""
        if not referee or not stat_name:
            return 0.0
        
        # This would typically look up referee tendencies from database
        # For now, return small random impact
        referee_tendencies = {
            'high_scoring': ['total_points', 'goals', 'runs'],
            'low_scoring': ['under', 'defensive'],
            'home_favorable': ['home_win'],
            'strict_calls': ['fouls', 'penalties'],
            'loose_calls': ['physical_play']
        }
        
        # Small impact based on known tendencies
        return np.random.uniform(-0.02, 0.02)
    
    def _calculate_travel_impact(self,
                                travel_distance: Optional[float],
                                time_zones: Optional[int],
                                sport: str) -> float:
        """Calculate travel fatigue impact"""
        impact = 0.0
        
        if travel_distance:
            # Impact increases with distance
            if travel_distance > 2000:
                impact -= 0.05
            elif travel_distance > 1000:
                impact -= 0.03
            elif travel_distance > 500:
                impact -= 0.01
        
        if time_zones:
            # Time zone changes affect performance
            impact -= abs(time_zones) * 0.015
        
        # Sport-specific adjustments
        if sport == 'NBA' or sport == 'NHL':
            impact *= 1.2  # More games = more travel impact
        elif sport == 'NFL':
            impact *= 0.8  # Weekly games = more recovery time
        
        return max(-0.10, impact)  # Cap travel impact
    
    def _calculate_time_impact(self,
                              game_time: Optional[str],
                              player_preference: Optional[str],
                              sport: str) -> float:
        """Calculate time of game impact"""
        if not game_time:
            return 0.0
        
        impact = 0.0
        
        # Parse game time
        try:
            hour = int(game_time.split(':')[0])
            
            # Day vs night games
            if sport == 'MLB':
                if hour < 16 and player_preference == 'night':
                    impact -= 0.03  # Day game penalty for night player
                elif hour >= 19 and player_preference == 'day':
                    impact -= 0.02  # Night game penalty for day player
            
            # Early vs late games
            if sport in ['NBA', 'NHL']:
                if hour < 13:  # Early afternoon game
                    impact -= 0.02
                elif hour >= 22:  # Late night game
                    impact -= 0.01
        
        except:
            pass
        
        return impact
    
    def _calculate_rivalry_impact(self, sport: str) -> float:
        """Calculate rivalry game impact"""
        # Rivalry games typically see increased effort/intensity
        rivalry_impacts = {
            'NFL': 0.05,
            'NBA': 0.03,
            'MLB': 0.02,
            'NHL': 0.04,
            'SOCCER': 0.06
        }
        
        return rivalry_impacts.get(sport, 0.03)
    
    def _calculate_confidence(self,
                            adjustments: Dict[str, float],
                            context: Dict[str, Any]) -> float:
        """Calculate confidence in cross-reference adjustments"""
        confidence = 0.8  # Base confidence
        
        # Reduce confidence for missing data
        expected_fields = ['venue', 'opponent_strength', 'rest_days', 'injuries']
        missing = sum(1 for field in expected_fields if field not in context or context[field] is None)
        confidence -= missing * 0.1
        
        # Reduce confidence for extreme adjustments
        max_adjustment = max(abs(adj) for adj in adjustments.values()) if adjustments else 0
        if max_adjustment > 0.20:
            confidence -= 0.15
        elif max_adjustment > 0.15:
            confidence -= 0.10
        elif max_adjustment > 0.10:
            confidence -= 0.05
        
        # Increase confidence for multiple confirming factors
        if len(adjustments) >= 5:
            confidence += 0.05
        
        return max(0.3, min(0.95, confidence))