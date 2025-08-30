"""
Master Sports Prediction System
Orchestrates all modules to provide comprehensive sports analysis and parlay recommendations
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime, timedelta
import logging
import asyncio
from dataclasses import dataclass, field
from enum import Enum
import json

from .sports_analyzer import SportsAnalyzer
from .moneyline_predictor import MoneylinePredictor, MoneylineAnalysis
from .parlay_optimizer import ParlayOptimizer, ParlayRecommendation, RiskLevel
from .weekly_learning_system import WeeklyLearningSystem
from .advanced_cross_reference import AdvancedCrossReferenceSystem, IntegratedAnalysis
from .sports_radar_client import sports_radar_client
import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

class SportType(Enum):
    NFL = "nfl"
    NBA = "nba"
    MLB = "mlb"
    NHL = "nhl"
    SOCCER = "soccer"
    NCAAF = "ncaaf"
    NCAAB = "ncaab"
    TENNIS = "tennis"
    GOLF = "golf"
    BOXING = "boxing"
    MMA = "mma"

class FilterType(Enum):
    SPORT = "sport"
    DATE = "date"
    CONFIDENCE = "confidence"
    VALUE = "value"
    RISK = "risk"
    PARLAY_SUITABLE = "parlay_suitable"

@dataclass
class PredictionFilter:
    """Filter configuration for predictions"""
    sports: Optional[List[str]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    min_confidence: Optional[float] = None
    max_confidence: Optional[float] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_expected_value: Optional[float] = None
    risk_levels: Optional[List[RiskLevel]] = None
    min_parlay_suitability: Optional[float] = None
    include_same_game_parlays: bool = False
    max_correlation: Optional[float] = None

@dataclass
class MasterPredictionResult:
    """Comprehensive prediction result"""
    game_analysis: IntegratedAnalysis
    moneyline_analysis: List[MoneylineAnalysis]
    best_single_bets: List[Dict[str, Any]]
    parlay_recommendations: List[ParlayRecommendation]
    learning_adjustments: Dict[str, float]
    overall_confidence: float
    value_score: float
    risk_assessment: Dict[str, Any]
    timestamp: datetime

class SportsFilteringSystem:
    """Advanced filtering system for sports predictions"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
    def apply_filters(self, predictions: List[Dict[str, Any]], 
                     filter_config: PredictionFilter) -> List[Dict[str, Any]]:
        """Apply comprehensive filters to predictions"""
        filtered = predictions.copy()
        
        # Sport filter
        if filter_config.sports:
            filtered = [p for p in filtered 
                       if p.get('sport', '').lower() in [s.lower() for s in filter_config.sports]]
        
        # Date range filter
        if filter_config.start_date or filter_config.end_date:
            filtered = self._apply_date_filter(filtered, filter_config)
        
        # Confidence filter
        if filter_config.min_confidence is not None or filter_config.max_confidence is not None:
            filtered = self._apply_confidence_filter(filtered, filter_config)
        
        # Value filter
        if filter_config.min_value is not None or filter_config.max_value is not None:
            filtered = self._apply_value_filter(filtered, filter_config)
        
        # Expected value filter
        if filter_config.min_expected_value is not None:
            filtered = [p for p in filtered 
                       if p.get('expected_value', 0) >= filter_config.min_expected_value]
        
        # Risk level filter
        if filter_config.risk_levels:
            filtered = [p for p in filtered 
                       if p.get('risk_level') in filter_config.risk_levels]
        
        # Parlay suitability filter
        if filter_config.min_parlay_suitability is not None:
            filtered = [p for p in filtered 
                       if p.get('parlay_suitability', 0) >= filter_config.min_parlay_suitability]
        
        # Correlation filter for parlays
        if filter_config.max_correlation is not None:
            filtered = self._apply_correlation_filter(filtered, filter_config.max_correlation)
        
        return filtered
    
    def _apply_date_filter(self, predictions: List[Dict[str, Any]], 
                          filter_config: PredictionFilter) -> List[Dict[str, Any]]:
        """Apply date range filter"""
        filtered = []
        for p in predictions:
            game_time = p.get('game_time')
            if isinstance(game_time, str):
                game_time = datetime.fromisoformat(game_time)
            elif isinstance(game_time, datetime):
                game_time = game_time
            else:
                continue
            
            if filter_config.start_date and game_time < filter_config.start_date:
                continue
            if filter_config.end_date and game_time > filter_config.end_date:
                continue
            
            filtered.append(p)
        
        return filtered
    
    def _apply_confidence_filter(self, predictions: List[Dict[str, Any]], 
                               filter_config: PredictionFilter) -> List[Dict[str, Any]]:
        """Apply confidence threshold filter"""
        filtered = []
        for p in predictions:
            confidence = p.get('confidence', 0)
            
            if filter_config.min_confidence is not None and confidence < filter_config.min_confidence:
                continue
            if filter_config.max_confidence is not None and confidence > filter_config.max_confidence:
                continue
            
            filtered.append(p)
        
        return filtered
    
    def _apply_value_filter(self, predictions: List[Dict[str, Any]], 
                          filter_config: PredictionFilter) -> List[Dict[str, Any]]:
        """Apply value threshold filter"""
        filtered = []
        for p in predictions:
            value = p.get('value_score', 0)
            
            if filter_config.min_value is not None and value < filter_config.min_value:
                continue
            if filter_config.max_value is not None and value > filter_config.max_value:
                continue
            
            filtered.append(p)
        
        return filtered
    
    def _apply_correlation_filter(self, predictions: List[Dict[str, Any]], 
                                max_correlation: float) -> List[Dict[str, Any]]:
        """Filter out highly correlated predictions for parlays"""
        if not predictions:
            return predictions
        
        # For parlay predictions, check internal correlation
        filtered = []
        for p in predictions:
            if p.get('type') == 'parlay':
                if p.get('correlation_score', 0) <= max_correlation:
                    filtered.append(p)
            else:
                filtered.append(p)
        
        return filtered

class MasterSportsPredictor:
    """
    Master orchestration system that coordinates all prediction modules
    NOW WITH REAL SPORTS RADAR API INTEGRATION!
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize all subsystems
        self.sports_analyzer = SportsAnalyzer(config.get('sports_analyzer', {}))
        self.moneyline_predictor = MoneylinePredictor(config.get('moneyline', {}))
        self.parlay_optimizer = ParlayOptimizer(config.get('parlay', {}))
        self.learning_system = WeeklyLearningSystem(config.get('learning', {}))
        self.cross_reference = AdvancedCrossReferenceSystem(config.get('cross_reference', {}))
        self.filtering_system = SportsFilteringSystem(config.get('filtering', {}))
        
        # Initialize database connection
        self.db_config = {
            'host': config.get('db_host', 'localhost'),
            'port': config.get('db_port', 5432),
            'database': config.get('db_name', 'sports_analytics'),
            'user': config.get('db_user', 'postgres'),
            'password': config.get('db_password', 'your_password_here')
        }
        
        # Start learning system
        self.learning_system.start_weekly_learning()
        
        logger.info("Master Sports Predictor initialized with REAL API integration!")
        
    async def analyze_games_comprehensive(self, games: List[Dict[str, Any]], 
                                        filter_config: Optional[PredictionFilter] = None) -> List[MasterPredictionResult]:
        """
        Perform comprehensive analysis on multiple games
        """
        results = []
        
        for game in games:
            try:
                result = await self.analyze_single_game(game, filter_config)
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(f"Error analyzing game {game.get('game_id', 'unknown')}: {e}")
                continue
        
        # Apply filters to results
        if filter_config:
            results = self._filter_results(results, filter_config)
        
        # Sort by overall value/confidence
        results.sort(key=lambda x: (x.value_score * x.overall_confidence), reverse=True)
        
        return results
    
    async def analyze_single_game(self, game_data: Dict[str, Any], 
                                 filter_config: Optional[PredictionFilter] = None) -> Optional[MasterPredictionResult]:
        """
        Perform comprehensive analysis on a single game
        """
        try:
            # Step 1: Cross-reference analysis (integrates all data sources)
            game_analysis = await self.cross_reference.analyze_game_comprehensive(game_data)
            
            # Step 2: Moneyline analysis
            moneyline_games = [self._convert_to_moneyline_format(game_data, game_analysis)]
            moneyline_analysis = self.moneyline_predictor.identify_value_bets(
                moneyline_games, 
                game_data.get('sport', 'nfl')
            )
            
            # Step 3: Get learning system adjustments
            learning_adjustments = self.learning_system.get_prediction_adjustments(
                self._extract_features_for_learning(game_analysis)
            )
            
            # Step 4: Apply learning adjustments to predictions
            adjusted_analysis = self._apply_learning_adjustments(
                game_analysis, learning_adjustments
            )
            
            # Step 5: Identify best single bets
            best_single_bets = self._identify_best_single_bets(adjusted_analysis, moneyline_analysis)
            
            # Step 6: Generate parlay recommendations (done separately for multiple games)
            parlay_recommendations = []
            
            # Step 7: Calculate overall scores
            overall_confidence = self._calculate_overall_confidence(
                adjusted_analysis, moneyline_analysis, learning_adjustments
            )
            
            value_score = self._calculate_value_score(
                adjusted_analysis, moneyline_analysis, best_single_bets
            )
            
            risk_assessment = self._assess_overall_risk(
                adjusted_analysis, moneyline_analysis
            )
            
            return MasterPredictionResult(
                game_analysis=adjusted_analysis,
                moneyline_analysis=moneyline_analysis,
                best_single_bets=best_single_bets,
                parlay_recommendations=parlay_recommendations,
                learning_adjustments=learning_adjustments,
                overall_confidence=overall_confidence,
                value_score=value_score,
                risk_assessment=risk_assessment,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Error in single game analysis: {e}")
            return None
    
    async def generate_optimal_parlays(self, games: List[Dict[str, Any]], 
                                     risk_level: RiskLevel = RiskLevel.MODERATE,
                                     filter_config: Optional[PredictionFilter] = None,
                                     max_parlays: int = 10) -> List[ParlayRecommendation]:
        """
        Generate optimal parlay combinations from available games
        """
        # First analyze all games
        game_analyses = []
        for game in games:
            analysis = await self.analyze_single_game(game, filter_config)
            if analysis:
                game_analyses.append(analysis)
        
        # Extract potential parlay bets
        available_bets = []
        for analysis in game_analyses:
            # Add moneyline bets
            for ml_analysis in analysis.moneyline_analysis:
                if ml_analysis.edge > 0.03:  # Minimum edge threshold
                    available_bets.append({
                        'game_id': analysis.game_analysis.game_id,
                        'team': ml_analysis.team,
                        'bet_type': 'moneyline',
                        'line': 0,
                        'odds': ml_analysis.american_odds,
                        'true_probability': ml_analysis.true_probability,
                        'confidence': ml_analysis.confidence_score,
                        'sport': ml_analysis.sport,
                        'game_time': analysis.game_analysis.timestamp,
                        'correlation_factors': ml_analysis.factors
                    })
            
            # Add spread bets
            spread_pred = analysis.game_analysis.spread_prediction
            if spread_pred.get('value_side', 'none') != 'none' and spread_pred.get('confidence', 0) > 0.6:
                available_bets.append({
                    'game_id': analysis.game_analysis.game_id,
                    'team': f"{analysis.game_analysis.home_team if spread_pred['value_side'] == 'home' else analysis.game_analysis.away_team}",
                    'bet_type': 'spread',
                    'line': spread_pred['current_spread'],
                    'odds': -110,  # Standard spread odds
                    'true_probability': spread_pred[f"{spread_pred['value_side']}_cover_probability"],
                    'confidence': spread_pred['confidence'],
                    'sport': analysis.game_analysis.sport,
                    'game_time': analysis.game_analysis.timestamp,
                    'correlation_factors': {}
                })
            
            # Add total bets
            total_pred = analysis.game_analysis.total_prediction
            if total_pred.get('value_side', 'none') != 'none' and total_pred.get('confidence', 0) > 0.6:
                available_bets.append({
                    'game_id': analysis.game_analysis.game_id,
                    'team': f"{total_pred['value_side']}",
                    'bet_type': 'total',
                    'line': total_pred['current_total'],
                    'odds': -110,  # Standard total odds
                    'true_probability': total_pred[f"{total_pred['value_side']}_probability"],
                    'confidence': total_pred['confidence'],
                    'sport': analysis.game_analysis.sport,
                    'game_time': analysis.game_analysis.timestamp,
                    'correlation_factors': {}
                })
        
        # Apply filters if provided
        if filter_config:
            available_bets = self.filtering_system.apply_filters(available_bets, filter_config)
        
        # Generate optimal parlays
        if available_bets:
            sport_filter = filter_config.sports if filter_config else None
            parlays = self.parlay_optimizer.generate_optimal_parlays(
                available_bets,
                risk_level,
                sport_filter,
                max_parlays
            )
            
            # Apply learning enhancements to parlays
            enhanced_parlays = self._enhance_parlays_with_learning(parlays)
            
            return enhanced_parlays
        
        return []
    
    def get_daily_recommendations(self, date: datetime, 
                                sports: Optional[List[str]] = None,
                                min_confidence: float = 0.6,
                                min_expected_value: float = 5.0) -> Dict[str, Any]:
        """
        Get comprehensive daily recommendations
        """
        # Create filter for the day
        filter_config = PredictionFilter(
            sports=sports,
            start_date=date.replace(hour=0, minute=0, second=0),
            end_date=date.replace(hour=23, minute=59, second=59),
            min_confidence=min_confidence,
            min_expected_value=min_expected_value
        )
        
        # This would fetch games for the day in production
        daily_games = self._fetch_daily_games(date, sports)
        
        return {
            'date': date.isoformat(),
            'filter_criteria': {
                'sports': sports,
                'min_confidence': min_confidence,
                'min_expected_value': min_expected_value
            },
            'total_games': len(daily_games),
            'recommendations': {
                'single_bets': [],  # Would be populated from analysis
                'parlays': {
                    'conservative': [],
                    'moderate': [],
                    'aggressive': [],
                    'yolo': []
                }
            },
            'market_insights': self._get_market_insights(daily_games),
            'learning_insights': self.learning_system.get_prediction_adjustments({}),
            'timestamp': datetime.now().isoformat()
        }
    
    def _convert_to_moneyline_format(self, game_data: Dict[str, Any], 
                                   analysis: IntegratedAnalysis) -> Dict[str, Any]:
        """Convert game analysis to moneyline predictor format"""
        return {
            'home_team': {
                'name': analysis.home_team,
                'elo_rating': analysis.live_factors.get('home_elo', 1500),
                'recent_form': analysis.live_factors.get('home_recent_form', 0.5),
                'injury_impact': sum(inj.get('impact_score', 0) for inj in analysis.live_factors.get('home_injuries', [])),
                'is_home': True
            },
            'away_team': {
                'name': analysis.away_team,
                'elo_rating': analysis.live_factors.get('away_elo', 1500),
                'recent_form': analysis.live_factors.get('away_recent_form', 0.5),
                'injury_impact': sum(inj.get('impact_score', 0) for inj in analysis.live_factors.get('away_injuries', [])),
                'is_home': False
            },
            'home_moneyline': game_data.get('home_moneyline', -110),
            'away_moneyline': game_data.get('away_moneyline', -110),
            'conditions': {
                'weather': analysis.live_factors.get('weather', {}),
                'venue': analysis.live_factors.get('venue', {}),
                'motivation': analysis.live_factors.get('motivation', {})
            },
            'sharp_money': analysis.live_factors.get('sharp_money', {}),
            'line_movement': analysis.live_factors.get('line_movement', {})
        }
    
    def _extract_features_for_learning(self, analysis: IntegratedAnalysis) -> Dict[str, Any]:
        """Extract features for learning system"""
        return {
            'elo_rating': analysis.live_factors.get('home_elo', 1500),
            'recent_form': analysis.live_factors.get('home_recent_form', 0.5),
            'injury_impact': len(analysis.live_factors.get('home_injuries', [])),
            'confidence': analysis.confidence_scores.get('overall', 0.5),
            'public_percentage': analysis.live_factors.get('public_percentage', 50),
            'sharp_money': 1 if analysis.live_factors.get('sharp_side') else 0,
            'weather_impact': analysis.live_factors.get('weather_impact', 0),
            'home_advantage': 1,
            'sport': analysis.sport,
            'hour_of_day': analysis.timestamp.hour,
            'day_of_week': analysis.timestamp.weekday()
        }
    
    def _apply_learning_adjustments(self, analysis: IntegratedAnalysis, 
                                  adjustments: Dict[str, float]) -> IntegratedAnalysis:
        """Apply learning system adjustments to predictions"""
        # Adjust probabilities based on learning
        for adjustment_type, adjustment_value in adjustments.items():
            if adjustment_type == 'moneyline_adjustment':
                analysis.moneyline_prediction['home_win_probability'] *= (1 + adjustment_value)
                analysis.moneyline_prediction['home_win_probability'] = max(0.01, min(0.99, analysis.moneyline_prediction['home_win_probability']))
                analysis.moneyline_prediction['away_win_probability'] = 1 - analysis.moneyline_prediction['home_win_probability']
            
            elif adjustment_type == 'confidence_adjustment':
                for key in analysis.confidence_scores:
                    analysis.confidence_scores[key] *= (1 + adjustment_value)
                    analysis.confidence_scores[key] = max(0.1, min(0.95, analysis.confidence_scores[key]))
        
        return analysis
    
    def _identify_best_single_bets(self, analysis: IntegratedAnalysis, 
                                 moneyline_analysis: List[MoneylineAnalysis]) -> List[Dict[str, Any]]:
        """Identify the best single bet opportunities"""
        bets = []
        
        # Best moneyline bets
        for ml in moneyline_analysis:
            if ml.expected_value > 5 and ml.confidence_score > 0.65:
                bets.append({
                    'type': 'moneyline',
                    'pick': ml.team,
                    'odds': ml.american_odds,
                    'probability': ml.true_probability,
                    'expected_value': ml.expected_value,
                    'confidence': ml.confidence_score,
                    'kelly_stake': ml.kelly_criterion,
                    'value_rating': ml.value_rating
                })
        
        # Best spread bet
        spread_pred = analysis.spread_prediction
        if spread_pred.get('value_side', 'none') != 'none' and spread_pred.get('confidence', 0) > 0.65:
            expected_value = self._calculate_spread_ev(spread_pred)
            if expected_value > 5:
                bets.append({
                    'type': 'spread',
                    'pick': f"{spread_pred['value_side']} {spread_pred['current_spread']}",
                    'odds': -110,
                    'probability': spread_pred[f"{spread_pred['value_side']}_cover_probability"],
                    'expected_value': expected_value,
                    'confidence': spread_pred['confidence'],
                    'kelly_stake': self._calculate_kelly_stake(spread_pred[f"{spread_pred['value_side']}_cover_probability"], -110),
                    'value_rating': 'strong' if expected_value > 10 else 'moderate'
                })
        
        # Best total bet
        total_pred = analysis.total_prediction
        if total_pred.get('value_side', 'none') != 'none' and total_pred.get('confidence', 0) > 0.65:
            expected_value = self._calculate_total_ev(total_pred)
            if expected_value > 5:
                bets.append({
                    'type': 'total',
                    'pick': f"{total_pred['value_side']} {total_pred['current_total']}",
                    'odds': -110,
                    'probability': total_pred[f"{total_pred['value_side']}_probability"],
                    'expected_value': expected_value,
                    'confidence': total_pred['confidence'],
                    'kelly_stake': self._calculate_kelly_stake(total_pred[f"{total_pred['value_side']}_probability"], -110),
                    'value_rating': 'strong' if expected_value > 10 else 'moderate'
                })
        
        # Sort by expected value
        bets.sort(key=lambda x: x['expected_value'], reverse=True)
        
        return bets[:3]  # Return top 3 bets
    
    def _calculate_overall_confidence(self, analysis: IntegratedAnalysis, 
                                    moneyline_analysis: List[MoneylineAnalysis],
                                    learning_adjustments: Dict[str, float]) -> float:
        """Calculate overall prediction confidence"""
        # Base confidence from cross-reference analysis
        base_confidence = analysis.confidence_scores.get('overall', 0.5)
        
        # Boost from moneyline analysis agreement
        ml_confidence = np.mean([ml.confidence_score for ml in moneyline_analysis]) if moneyline_analysis else 0.5
        
        # Learning system confidence
        learning_confidence = 0.5 + sum(abs(adj) for adj in learning_adjustments.values()) * 0.1
        
        # Data quality factor
        data_quality = analysis.data_quality_score
        
        # Weighted average
        overall = (
            base_confidence * 0.4 +
            ml_confidence * 0.3 +
            learning_confidence * 0.2 +
            data_quality * 0.1
        )
        
        return min(0.95, overall)
    
    def _calculate_value_score(self, analysis: IntegratedAnalysis, 
                             moneyline_analysis: List[MoneylineAnalysis],
                             best_bets: List[Dict[str, Any]]) -> float:
        """Calculate overall value score"""
        value_score = 0.0
        
        # Value from moneyline analysis
        ml_values = [ml.expected_value for ml in moneyline_analysis if ml.expected_value > 0]
        if ml_values:
            value_score += np.mean(ml_values) * 0.5
        
        # Value from best bets
        bet_values = [bet['expected_value'] for bet in best_bets if bet['expected_value'] > 0]
        if bet_values:
            value_score += np.mean(bet_values) * 0.5
        
        # Value from opportunities
        opp_values = [opp.get('edge', 0) * 100 for opp in analysis.value_opportunities]
        if opp_values:
            value_score += np.mean(opp_values) * 0.3
        
        return min(100, value_score)
    
    def _assess_overall_risk(self, analysis: IntegratedAnalysis, 
                           moneyline_analysis: List[MoneylineAnalysis]) -> Dict[str, Any]:
        """Assess overall risk factors"""
        risk_factors = analysis.risk_factors.copy()
        risk_score = len(risk_factors) / 10  # Normalize by maximum expected risks
        
        # Add variance risk
        probabilities = [ml.true_probability for ml in moneyline_analysis]
        if probabilities:
            prob_variance = np.var(probabilities)
            if prob_variance > 0.05:
                risk_factors.append("High prediction variance")
                risk_score += 0.1
        
        # Market risk
        if analysis.parlay_suitability < 0.3:
            risk_factors.append("Low parlay suitability")
            risk_score += 0.1
        
        return {
            'overall_risk_score': min(1.0, risk_score),
            'risk_factors': risk_factors,
            'recommendation': self._get_risk_recommendation(risk_score)
        }
    
    def _get_risk_recommendation(self, risk_score: float) -> str:
        """Get risk-based recommendation"""
        if risk_score < 0.3:
            return "Low risk - suitable for conservative betting"
        elif risk_score < 0.6:
            return "Moderate risk - suitable for balanced strategies"
        elif risk_score < 0.8:
            return "High risk - only for aggressive strategies"
        else:
            return "Very high risk - proceed with extreme caution"
    
    def _enhance_parlays_with_learning(self, parlays: List[ParlayRecommendation]) -> List[ParlayRecommendation]:
        """Enhance parlay recommendations with learning insights"""
        for parlay in parlays:
            # Get learning adjustments for this parlay pattern
            pattern_features = {
                'num_legs': len(parlay.legs),
                'sport_diversity': len(set(leg.sport for leg in parlay.legs)),
                'correlation_score': parlay.correlation_score,
                'expected_value': parlay.expected_value
            }
            
            adjustments = self.learning_system.get_prediction_adjustments(pattern_features)
            
            # Apply adjustments
            if adjustments:
                adjustment_factor = sum(adjustments.values()) * 0.1
                parlay.total_probability *= (1 + adjustment_factor)
                parlay.total_probability = max(0.001, min(0.999, parlay.total_probability))
                
                # Recalculate expected value
                if parlay.combined_odds > 0:
                    profit = parlay.combined_odds / 100
                else:
                    profit = 100 / abs(parlay.combined_odds)
                
                parlay.expected_value = (parlay.total_probability * profit * 100) - ((1 - parlay.total_probability) * 100)
        
        return parlays
    
    def _filter_results(self, results: List[MasterPredictionResult], 
                       filter_config: PredictionFilter) -> List[MasterPredictionResult]:
        """Filter master prediction results"""
        filtered = []
        
        for result in results:
            # Check confidence
            if filter_config.min_confidence and result.overall_confidence < filter_config.min_confidence:
                continue
            if filter_config.max_confidence and result.overall_confidence > filter_config.max_confidence:
                continue
            
            # Check value
            if filter_config.min_value and result.value_score < filter_config.min_value:
                continue
            if filter_config.max_value and result.value_score > filter_config.max_value:
                continue
            
            # Check expected value
            if filter_config.min_expected_value:
                max_ev = max([bet.get('expected_value', 0) for bet in result.best_single_bets] or [0])
                if max_ev < filter_config.min_expected_value:
                    continue
            
            # Check parlay suitability
            if filter_config.min_parlay_suitability:
                if result.game_analysis.parlay_suitability < filter_config.min_parlay_suitability:
                    continue
            
            filtered.append(result)
        
        return filtered
    
    def _fetch_daily_games(self, date: datetime, sports: Optional[List[str]]) -> List[Dict[str, Any]]:
        """Fetch REAL games for a specific date from Sports Radar API"""
        logger.info(f"Fetching LIVE games for {date.date()}")
        
        all_games = []
        games_by_sport = sports_radar_client.get_all_games_today()
        
        for sport, games in games_by_sport.items():
            # Filter by requested sports if specified
            if sports and sport.lower() not in [s.lower() for s in sports]:
                continue
                
            for game in games:
                formatted_game = sports_radar_client.format_game_data(game, sport)
                
                # Add to our format
                all_games.append({
                    'game_id': formatted_game['game_id'],
                    'sport': sport.upper(),
                    'home_team': formatted_game['home_team']['name'],
                    'away_team': formatted_game['away_team']['name'],
                    'game_time': formatted_game['scheduled'],
                    'home_moneyline': formatted_game.get('odds', {}).get('moneyline', {}).get('home', -110),
                    'away_moneyline': formatted_game.get('odds', {}).get('moneyline', {}).get('away', -110),
                    'venue': formatted_game.get('venue', {}).get('name', 'Unknown'),
                    'status': formatted_game.get('status', 'scheduled'),
                    'home_score': formatted_game.get('home_score'),
                    'away_score': formatted_game.get('away_score'),
                    'spread': formatted_game.get('odds', {}).get('spread', {}),
                    'total': formatted_game.get('odds', {}).get('total', {})
                })
                
                # Store in database
                self._store_game_in_db(all_games[-1])
                
        logger.info(f"Found {len(all_games)} LIVE games for {date.date()}")
        return all_games
    
    def _get_market_insights(self, games: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get REAL market insights for the day"""
        sports_dist = {}
        total_odds = []
        weather_affected = 0
        key_matchups = []
        
        for game in games:
            # Sports distribution
            sport = game.get('sport', 'Unknown')
            sports_dist[sport] = sports_dist.get(sport, 0) + 1
            
            # Collect odds
            if game.get('home_moneyline'):
                total_odds.append(game['home_moneyline'])
            if game.get('away_moneyline'):
                total_odds.append(game['away_moneyline'])
                
            # Check for outdoor games that could be weather-affected
            if sport in ['NFL', 'MLB'] and game.get('venue'):
                weather = sports_radar_client.get_weather_data(game['venue'].split(',')[0])
                if weather and (weather.get('wind', {}).get('speed', 0) > 15 or 
                               weather.get('main', {}).get('temp', 60) < 40):
                    weather_affected += 1
                    
            # Identify key matchups (rivalry games, playoff implications, etc.)
            if abs(game.get('home_moneyline', -110)) < 120 and abs(game.get('away_moneyline', -110)) < 120:
                key_matchups.append({
                    'game': f"{game['away_team']} @ {game['home_team']}",
                    'sport': sport,
                    'reason': 'Close matchup - evenly matched teams'
                })
                
        avg_odds = sum(total_odds) / len(total_odds) if total_odds else -110
        
        return {
            'total_games': len(games),
            'sports_distribution': sports_dist,
            'average_odds': avg_odds,
            'sharp_action': self._get_sharp_money_indicators(games),
            'public_trends': self._get_public_betting_trends(games),
            'weather_games': weather_affected,
            'key_matchups': key_matchups[:5]  # Top 5 key matchups
        }
    
    def _calculate_spread_ev(self, spread_pred: Dict[str, float]) -> float:
        """Calculate expected value for spread bet"""
        prob = spread_pred[f"{spread_pred['value_side']}_cover_probability"]
        return (prob * 91) - ((1 - prob) * 100)  # Assuming -110 odds
    
    def _calculate_total_ev(self, total_pred: Dict[str, float]) -> float:
        """Calculate expected value for total bet"""
        prob = total_pred[f"{total_pred['value_side']}_probability"]
        return (prob * 91) - ((1 - prob) * 100)  # Assuming -110 odds
    
    def _calculate_kelly_stake(self, probability: float, american_odds: int) -> float:
        """Calculate Kelly criterion stake"""
        if american_odds > 0:
            decimal_odds = american_odds / 100 + 1
        else:
            decimal_odds = 1 - 100 / american_odds
        
        b = decimal_odds - 1
        q = 1 - probability
        
        if b <= 0:
            return 0.0
        
        kelly = (probability * b - q) / b
        return max(0.0, min(kelly * 0.25, 0.1))  # Conservative Kelly
        
    def _store_game_in_db(self, game: Dict[str, Any]):
        """Store game data in PostgreSQL database"""
        try:
            conn = psycopg2.connect(**self.db_config)
            cur = conn.cursor()
            
            query = """
                INSERT INTO games (game_id, sport, home_team, away_team, scheduled, status)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (game_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    updated_at = CURRENT_TIMESTAMP
            """
            
            cur.execute(query, (
                game['game_id'],
                game['sport'],
                game['home_team'],
                game['away_team'],
                game['game_time'],
                game.get('status', 'scheduled')
            ))
            
            conn.commit()
            cur.close()
            conn.close()
            
        except Exception as e:
            logger.error(f"Failed to store game in database: {e}")
            
    def _get_sharp_money_indicators(self, games: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get sharp money indicators from line movements"""
        sharp_indicators = {
            'games_with_sharp_action': 0,
            'sharp_sides': []
        }
        
        # In production, this would analyze line movements and betting percentages
        # For now, we'll identify sharp action based on line movement patterns
        for game in games:
            # This would normally check historical line movement
            # Sharp money typically moves lines against public betting
            pass
            
        return sharp_indicators
        
    def _get_public_betting_trends(self, games: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get public betting trends"""
        trends = {
            'most_bet_games': [],
            'public_favorites': [],
            'contrarian_opportunities': []
        }
        
        # In production, this would fetch actual public betting percentages
        # For now, we'll identify trends based on odds
        for game in games:
            home_odds = game.get('home_moneyline', 0)
            away_odds = game.get('away_moneyline', 0)
            
            # Heavy favorites often attract public money
            if home_odds < -200:
                trends['public_favorites'].append({
                    'team': game['home_team'],
                    'odds': home_odds
                })
            elif away_odds < -200:
                trends['public_favorites'].append({
                    'team': game['away_team'],
                    'odds': away_odds
                })
                
        return trends