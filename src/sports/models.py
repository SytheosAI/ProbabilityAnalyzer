"""
Sports-specific data models for probability analysis
"""
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum

class SportType(Enum):
    FOOTBALL = "football"
    BASKETBALL = "basketball"
    BASEBALL = "baseball"
    SOCCER = "soccer"
    TENNIS = "tennis"
    HOCKEY = "hockey"
    MMA = "mma"
    BOXING = "boxing"
    GOLF = "golf"
    RACING = "racing"

class BetType(Enum):
    MONEYLINE = "moneyline"
    SPREAD = "spread"
    TOTAL = "total"
    PROP = "prop"
    FUTURES = "futures"
    PARLAY = "parlay"
    TEASER = "teaser"
    LIVE = "live"

@dataclass
class Player:
    id: str
    name: str
    team_id: str
    position: str
    stats: Dict[str, float]
    injury_status: str
    form_rating: float  # 0-100 current form
    historical_performance: Dict[str, Any]
    matchup_history: Dict[str, List[float]]  # vs specific opponents
    
@dataclass
class Team:
    id: str
    name: str
    sport: SportType
    current_form: float  # Recent performance rating
    home_record: Dict[str, float]
    away_record: Dict[str, float]
    roster: List[Player]
    injuries: List[Dict[str, Any]]
    coaching_staff: Dict[str, Any]
    tactical_style: Dict[str, float]
    rest_days: int
    travel_distance: float
    
@dataclass
class GameContext:
    game_id: str
    sport: SportType
    home_team: Team
    away_team: Team
    venue: str
    weather_conditions: Dict[str, Any]
    referee: Optional[str]
    importance_factor: float  # Playoff, rivalry, etc.
    schedule_spot: str  # B2B, 3in4, etc.
    public_betting_percentage: Dict[str, float]
    sharp_money_indicators: Dict[str, float]
    line_movement: List[Dict[str, Any]]
    
@dataclass
class BettingLine:
    bet_type: BetType
    opening_line: float
    current_line: float
    opening_odds: float
    current_odds: float
    volume: float
    sharp_action: bool
    steam_move: bool
    reverse_line_movement: bool
    
@dataclass
class PerformanceMetrics:
    offensive_rating: float
    defensive_rating: float
    pace: float
    efficiency: float
    clutch_performance: float
    momentum_score: float
    fatigue_index: float
    matchup_advantage: float
    
@dataclass
class HistoricalMatchup:
    games_played: int
    home_wins: int
    away_wins: int
    average_total: float
    average_margin: float
    cover_rate: float
    over_rate: float
    recent_trends: List[Dict[str, Any]]
    
@dataclass
class SportsPrediction:
    game_context: GameContext
    predicted_winner: str
    win_probability: float
    predicted_score: Dict[str, float]
    spread_prediction: float
    total_prediction: float
    confidence_level: float
    key_factors: List[Dict[str, Any]]
    risk_assessment: Dict[str, float]
    recommended_bets: List[Dict[str, Any]]
    expected_value: Dict[str, float]