"""
Integrated Sports Predictor - Main orchestrator for all prediction modules
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import logging
from dataclasses import dataclass, asdict
import json
from pathlib import Path

# Import all custom modules
from .statistical_categories import StatisticalCategoryManager, StatDefinition
from .historical_data_analyzer import HistoricalDataAnalyzer, PerformanceBaseline
from .weather_impact_analyzer import WeatherImpactAnalyzer
from .cross_reference_system import CrossReferenceSystem, CrossReferenceResult
from .statistical_prediction_engine import StatisticalPredictionEngine, StatisticalPrediction, PropBetAnalysis
from .sports_analyzer import SportsAnalyzer
from ..weather.weather_integration import WeatherIntegration

logger = logging.getLogger(__name__)

@dataclass
class ComprehensivePrediction:
    """Complete prediction with all factors considered"""
    entity_id: str
    entity_name: str
    entity_type: str  # 'player' or 'team'
    sport: str
    game_date: datetime
    opponent: str
    predictions: Dict[str, StatisticalPrediction]  # stat_name -> prediction
    weather_impacts: Dict[str, float]
    cross_reference_adjustments: Dict[str, float]
    historical_context: Dict[str, Any]
    confidence_score: float
    top_plays: List[PropBetAnalysis]
    risk_assessment: Dict[str, Any]
    key_insights: List[str]

class IntegratedSportsPredictor:
    """Main orchestrator for comprehensive sports predictions"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        
        # Initialize all components
        self.category_manager = StatisticalCategoryManager()
        self.historical_analyzer = HistoricalDataAnalyzer(config.get('historical', {}))
        self.weather_analyzer = WeatherImpactAnalyzer(config.get('weather', {}))
        self.cross_reference = CrossReferenceSystem(config.get('cross_reference', {}))
        self.prediction_engine = StatisticalPredictionEngine(config.get('prediction', {}))
        self.sports_analyzer = SportsAnalyzer(config.get('sports', {}))
        self.weather_integration = WeatherIntegration(config.get('weather_api', {}))
        
        # Cache for predictions
        self.prediction_cache = {}
        
    def predict_player_performance(self,
                                  player_id: str,
                                  player_name: str,
                                  sport: str,
                                  game_context: Dict[str, Any]) -> ComprehensivePrediction:
        """Generate comprehensive player prediction"""
        
        logger.info(f"Generating prediction for {player_name} ({sport})")
        
        # Get relevant statistical categories
        sport_categories = self.category_manager.get_sport_categories(sport)
        
        # Load historical data
        historical_data = self.historical_analyzer.load_historical_data(
            player_id, 'player', sport
        )
        
        # Create performance baseline
        baseline = self.historical_analyzer.create_performance_baseline(
            player_id, 'player', sport, historical_data
        )
        
        # Get weather data if outdoor sport
        weather_data = {}
        weather_impacts = {}
        if sport.upper() in ['NFL', 'MLB', 'SOCCER']:
            if game_context.get('venue_location'):
                weather_data = self.weather_integration.fetch_current_weather(
                    game_context['venue_location']
                )
        
        # Prepare predictions for each relevant stat
        predictions = {}
        all_prop_bets = []
        
        for category_name, category_stats in sport_categories.items():
            for stat_name, stat_def in category_stats.items():
                # Skip if not a player stat
                if not self._is_player_stat(stat_name, sport):
                    continue
                
                # Prepare context for prediction
                pred_context = self._prepare_prediction_context(
                    player_id, stat_name, historical_data, game_context
                )
                
                # Get base prediction
                base_prediction = self.prediction_engine.predict_player_statistics(
                    player_id, player_name, stat_name, sport, pred_context
                )
                
                # Apply weather impact if applicable
                if stat_def.weather_sensitive and weather_data:
                    weather_impact = self.weather_analyzer.analyze_weather_impact(
                        weather_data, stat_name, sport, base_prediction.predicted_value
                    )
                    weather_impacts[stat_name] = weather_impact['impact_percentage']
                    base_prediction.predicted_value = weather_impact['adjusted_value']
                
                # Apply cross-reference adjustments
                cross_ref_context = {
                    'venue': game_context.get('venue'),
                    'stat_name': stat_name,
                    'opponent_strength': game_context.get('opponent_def_rank'),
                    'rest_days': game_context.get('rest_days'),
                    'injuries': game_context.get('team_injuries'),
                    'opponent_injuries': game_context.get('opponent_injuries'),
                    'travel_distance': game_context.get('travel_distance'),
                    'game_time': game_context.get('game_time'),
                    'is_rivalry': game_context.get('is_rivalry')
                }
                
                cross_ref_result = self.cross_reference.cross_reference_factors(
                    base_prediction.predicted_value, sport, cross_ref_context
                )
                
                # Update prediction with adjustments
                base_prediction.predicted_value = cross_ref_result.adjusted_value
                
                predictions[stat_name] = base_prediction
                
                # Analyze as prop bet if line available
                if game_context.get('betting_lines', {}).get(stat_name):
                    line = game_context['betting_lines'][stat_name]
                    prop_analysis = self.prediction_engine.analyze_prop_bet(
                        player_id, stat_name, line, sport, pred_context
                    )
                    all_prop_bets.append(prop_analysis)
        
        # Identify top plays
        top_plays = self._identify_top_plays(all_prop_bets)
        
        # Generate risk assessment
        risk_assessment = self._assess_overall_risk(
            predictions, weather_impacts, cross_ref_result, game_context
        )
        
        # Generate key insights
        key_insights = self._generate_key_insights(
            baseline, predictions, weather_impacts, cross_ref_result, game_context
        )
        
        # Calculate overall confidence
        confidence_score = self._calculate_overall_confidence(
            predictions, weather_impacts, cross_ref_result
        )
        
        return ComprehensivePrediction(
            entity_id=player_id,
            entity_name=player_name,
            entity_type='player',
            sport=sport,
            game_date=game_context.get('game_date', datetime.now()),
            opponent=game_context.get('opponent', ''),
            predictions=predictions,
            weather_impacts=weather_impacts,
            cross_reference_adjustments=cross_ref_result.factor_adjustments if cross_ref_result else {},
            historical_context=asdict(baseline),
            confidence_score=confidence_score,
            top_plays=top_plays,
            risk_assessment=risk_assessment,
            key_insights=key_insights
        )
    
    def predict_game_outcome(self,
                           home_team_id: str,
                           away_team_id: str,
                           sport: str,
                           game_context: Dict[str, Any]) -> Dict[str, Any]:
        """Predict complete game outcome with all statistics"""
        
        logger.info(f"Predicting game: {home_team_id} vs {away_team_id} ({sport})")
        
        # Get team predictions
        home_prediction = self.prediction_engine.predict_team_statistics(
            home_team_id, game_context.get('home_team_name', home_team_id),
            sport, {**game_context, 'is_home': True}
        )
        
        away_prediction = self.prediction_engine.predict_team_statistics(
            away_team_id, game_context.get('away_team_name', away_team_id),
            sport, {**game_context, 'is_home': False}
        )
        
        # Get weather impact for outdoor sports
        weather_adjustments = {}
        if sport.upper() in ['NFL', 'MLB', 'SOCCER'] and game_context.get('venue_location'):
            weather_data = self.weather_integration.fetch_current_weather(
                game_context['venue_location']
            )
            
            # Adjust team totals for weather
            for stat_name in ['total_points', 'total_yards', 'runs', 'goals']:
                if stat_name in home_prediction.predictions:
                    weather_impact = self.weather_analyzer.analyze_weather_impact(
                        weather_data, stat_name, sport, home_prediction.predictions[stat_name]
                    )
                    weather_adjustments[f'home_{stat_name}'] = weather_impact['impact_percentage']
                    home_prediction.predictions[stat_name] = weather_impact['adjusted_value']
                
                if stat_name in away_prediction.predictions:
                    weather_impact = self.weather_analyzer.analyze_weather_impact(
                        weather_data, stat_name, sport, away_prediction.predictions[stat_name]
                    )
                    weather_adjustments[f'away_{stat_name}'] = weather_impact['impact_percentage']
                    away_prediction.predictions[stat_name] = weather_impact['adjusted_value']
        
        # Calculate final predictions
        final_home_score = home_prediction.total_points
        final_away_score = away_prediction.total_points
        
        # Determine winner and spread
        if final_home_score > final_away_score:
            winner = game_context.get('home_team_name', home_team_id)
            spread = -(final_home_score - final_away_score)
        else:
            winner = game_context.get('away_team_name', away_team_id)
            spread = final_away_score - final_home_score
        
        # Calculate over/under
        total = final_home_score + final_away_score
        
        # Get player predictions for key players
        key_player_predictions = {}
        for player_id in game_context.get('key_players', []):
            player_name = game_context.get('player_names', {}).get(player_id, player_id)
            player_pred = self.predict_player_performance(
                player_id, player_name, sport, game_context
            )
            key_player_predictions[player_id] = player_pred
        
        # Generate betting recommendations
        betting_recommendations = self._generate_betting_recommendations(
            home_prediction, away_prediction, spread, total, game_context
        )
        
        return {
            'home_team': {
                'team_id': home_team_id,
                'predicted_score': final_home_score,
                'statistics': home_prediction.predictions,
                'quarter_scores': home_prediction.quarter_projections,
                'win_probability': home_prediction.win_probability
            },
            'away_team': {
                'team_id': away_team_id,
                'predicted_score': final_away_score,
                'statistics': away_prediction.predictions,
                'quarter_scores': away_prediction.quarter_projections,
                'win_probability': 1 - home_prediction.win_probability
            },
            'game_predictions': {
                'winner': winner,
                'spread': spread,
                'total': total,
                'confidence': (home_prediction.win_probability + (1 - away_prediction.win_probability)) / 2
            },
            'weather_adjustments': weather_adjustments,
            'key_player_predictions': key_player_predictions,
            'betting_recommendations': betting_recommendations,
            'risk_factors': self._identify_game_risk_factors(
                home_prediction, away_prediction, weather_adjustments, game_context
            )
        }
    
    def analyze_prop_bet_slate(self,
                              prop_bets: List[Dict[str, Any]],
                              sport: str) -> Dict[str, Any]:
        """Analyze a full slate of prop bets"""
        
        analyzed_bets = []
        
        for prop in prop_bets:
            player_id = prop['player_id']
            player_name = prop['player_name']
            stat_name = prop['stat']
            line = prop['line']
            
            # Get full context
            game_context = prop.get('game_context', {})
            
            # Generate prediction
            player_prediction = self.predict_player_performance(
                player_id, player_name, sport, game_context
            )
            
            # Get specific prop analysis
            if stat_name in player_prediction.predictions:
                stat_pred = player_prediction.predictions[stat_name]
                
                prop_analysis = self.prediction_engine.analyze_prop_bet(
                    player_id, stat_name, line, sport, game_context
                )
                
                analyzed_bets.append(prop_analysis)
        
        # Rank bets by expected value
        ranked_bets = sorted(analyzed_bets, key=lambda x: x.edge, reverse=True)
        
        # Identify best singles
        best_singles = [bet for bet in ranked_bets if bet.edge > 3.0][:5]
        
        # Generate optimal parlays
        optimal_parlays = self._generate_optimal_parlays(ranked_bets)
        
        # Calculate portfolio Kelly criterion
        kelly_sizes = self._calculate_kelly_sizes(ranked_bets)
        
        return {
            'total_bets_analyzed': len(analyzed_bets),
            'positive_ev_bets': len([b for b in analyzed_bets if b.edge > 0]),
            'best_singles': best_singles,
            'optimal_parlays': optimal_parlays,
            'kelly_sizes': kelly_sizes,
            'expected_roi': self._calculate_expected_roi(ranked_bets),
            'risk_metrics': self._calculate_portfolio_risk(ranked_bets)
        }
    
    def _prepare_prediction_context(self,
                                   player_id: str,
                                   stat_name: str,
                                   historical_data: pd.DataFrame,
                                   game_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare context for prediction engine"""
        
        context = game_context.copy()
        
        # Add recent performance stats
        if not historical_data.empty and stat_name in historical_data.columns:
            context['recent_stats'] = {
                'last_5': historical_data[stat_name].tail(5).mean(),
                'last_10': historical_data[stat_name].tail(10).mean(),
                'last_20': historical_data[stat_name].tail(20).mean(),
                'season': historical_data[stat_name].mean()
            }
        
        # Add matchup history if available
        if game_context.get('opponent'):
            opp_games = historical_data[historical_data['opponent'] == game_context['opponent']]
            if not opp_games.empty and stat_name in opp_games.columns:
                context['matchup_avg'] = opp_games[stat_name].mean()
        
        return context
    
    def _is_player_stat(self, stat_name: str, sport: str) -> bool:
        """Determine if stat is player-level or team-level"""
        team_only_stats = [
            'team_total', 'team_rebounds', 'team_assists',
            'possession_pct', 'team_era', 'team_whip'
        ]
        
        return not any(team_stat in stat_name for team_stat in team_only_stats)
    
    def _identify_top_plays(self,
                          prop_bets: List[PropBetAnalysis],
                          max_plays: int = 5) -> List[PropBetAnalysis]:
        """Identify top plays from all prop bets"""
        
        # Filter for positive EV
        positive_ev = [bet for bet in prop_bets if bet.edge > 0]
        
        # Sort by edge
        sorted_bets = sorted(positive_ev, key=lambda x: x.edge, reverse=True)
        
        # Return top plays
        return sorted_bets[:max_plays]
    
    def _assess_overall_risk(self,
                           predictions: Dict[str, StatisticalPrediction],
                           weather_impacts: Dict[str, float],
                           cross_ref: CrossReferenceResult,
                           game_context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess overall risk factors"""
        
        risk_score = 0.0
        risk_factors = []
        
        # Check prediction confidence
        avg_confidence = np.mean([p.confidence_score for p in predictions.values()])
        if avg_confidence < 0.6:
            risk_score += 0.3
            risk_factors.append("Low prediction confidence")
        
        # Check weather impacts
        if weather_impacts:
            max_weather_impact = max(abs(impact) for impact in weather_impacts.values())
            if max_weather_impact > 0.15:
                risk_score += 0.2
                risk_factors.append(f"Significant weather impact ({max_weather_impact:.1%})")
        
        # Check injury status
        if game_context.get('injury_status') != 'healthy':
            risk_score += 0.25
            risk_factors.append(f"Injury concern: {game_context.get('injury_status')}")
        
        # Check rest days
        rest_days = game_context.get('rest_days', 2)
        if rest_days < 2:
            risk_score += 0.15
            risk_factors.append(f"Short rest ({rest_days} days)")
        
        # Determine risk level
        if risk_score < 0.3:
            risk_level = 'Low'
        elif risk_score < 0.6:
            risk_level = 'Medium'
        else:
            risk_level = 'High'
        
        return {
            'risk_score': risk_score,
            'risk_level': risk_level,
            'risk_factors': risk_factors,
            'mitigation': self._suggest_risk_mitigation(risk_factors)
        }
    
    def _generate_key_insights(self,
                             baseline: PerformanceBaseline,
                             predictions: Dict[str, StatisticalPrediction],
                             weather_impacts: Dict[str, float],
                             cross_ref: CrossReferenceResult,
                             game_context: Dict[str, Any]) -> List[str]:
        """Generate key insights from analysis"""
        
        insights = []
        
        # Check for hot/cold streaks
        for stat_name, prediction in predictions.items():
            if prediction.recent_form > prediction.historical_average * 1.15:
                insights.append(f"Hot streak in {stat_name}: {prediction.recent_form:.1f} vs {prediction.historical_average:.1f} average")
            elif prediction.recent_form < prediction.historical_average * 0.85:
                insights.append(f"Cold streak in {stat_name}: {prediction.recent_form:.1f} vs {prediction.historical_average:.1f} average")
        
        # Weather insights
        if weather_impacts:
            for stat, impact in weather_impacts.items():
                if abs(impact) > 10:
                    direction = "reduced" if impact < 0 else "increased"
                    insights.append(f"Weather expected to {direction} {stat} by {abs(impact):.0f}%")
        
        # Matchup insights
        if game_context.get('opponent_def_rank'):
            rank = game_context['opponent_def_rank']
            if rank < 20:
                insights.append(f"Facing top-20 defense (rank: {rank})")
            elif rank > 80:
                insights.append(f"Facing bottom-20 defense (rank: {rank})")
        
        # Venue insights
        if cross_ref and 'venue' in cross_ref.factor_adjustments:
            venue_impact = cross_ref.factor_adjustments['venue']
            if abs(venue_impact) > 0.05:
                insights.append(f"Venue factor: {venue_impact:+.1%}")
        
        return insights
    
    def _calculate_overall_confidence(self,
                                    predictions: Dict[str, StatisticalPrediction],
                                    weather_impacts: Dict[str, float],
                                    cross_ref: CrossReferenceResult) -> float:
        """Calculate overall confidence score"""
        
        # Average prediction confidence
        if predictions:
            pred_confidence = np.mean([p.confidence_score for p in predictions.values()])
        else:
            pred_confidence = 0.5
        
        # Adjust for weather uncertainty
        if weather_impacts:
            max_weather = max(abs(i) for i in weather_impacts.values())
            weather_penalty = min(0.2, max_weather)
            pred_confidence -= weather_penalty
        
        # Include cross-reference confidence
        if cross_ref:
            final_confidence = (pred_confidence * 0.7) + (cross_ref.confidence * 0.3)
        else:
            final_confidence = pred_confidence
        
        return max(0.3, min(0.95, final_confidence))
    
    def _generate_betting_recommendations(self,
                                        home_pred: Any,
                                        away_pred: Any,
                                        spread: float,
                                        total: float,
                                        context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate betting recommendations for game"""
        
        recommendations = []
        
        # Spread recommendation
        market_spread = context.get('market_spread')
        if market_spread:
            spread_diff = spread - market_spread
            if abs(spread_diff) > 2:
                side = 'home' if spread_diff < 0 else 'away'
                recommendations.append({
                    'type': 'spread',
                    'pick': side,
                    'confidence': min(0.8, abs(spread_diff) / 10),
                    'edge': abs(spread_diff)
                })
        
        # Total recommendation
        market_total = context.get('market_total')
        if market_total:
            total_diff = total - market_total
            if abs(total_diff) > 3:
                side = 'over' if total_diff > 0 else 'under'
                recommendations.append({
                    'type': 'total',
                    'pick': side,
                    'confidence': min(0.8, abs(total_diff) / 15),
                    'edge': abs(total_diff)
                })
        
        # Moneyline if significant edge
        if home_pred.win_probability > 0.60 or home_pred.win_probability < 0.40:
            side = 'home' if home_pred.win_probability > 0.60 else 'away'
            recommendations.append({
                'type': 'moneyline',
                'pick': side,
                'confidence': abs(home_pred.win_probability - 0.5) * 2,
                'win_probability': home_pred.win_probability if side == 'home' else 1 - home_pred.win_probability
            })
        
        return recommendations
    
    def _identify_game_risk_factors(self,
                                  home_pred: Any,
                                  away_pred: Any,
                                  weather: Dict[str, float],
                                  context: Dict[str, Any]) -> List[str]:
        """Identify risk factors for game prediction"""
        
        risks = []
        
        # Check for significant weather impact
        if weather:
            max_impact = max(abs(i) for i in weather.values())
            if max_impact > 0.15:
                risks.append(f"Weather impact: {max_impact:.0%}")
        
        # Check for key injuries
        if context.get('home_injuries'):
            risks.append(f"Home team injuries: {len(context['home_injuries'])}")
        if context.get('away_injuries'):
            risks.append(f"Away team injuries: {len(context['away_injuries'])}")
        
        # Check for scheduling spots
        if context.get('home_b2b'):
            risks.append("Home team on back-to-back")
        if context.get('away_b2b'):
            risks.append("Away team on back-to-back")
        
        return risks
    
    def _generate_optimal_parlays(self,
                                bets: List[PropBetAnalysis],
                                max_legs: int = 4) -> List[Dict[str, Any]]:
        """Generate optimal parlay combinations"""
        
        parlays = []
        
        # Filter for good bets
        good_bets = [b for b in bets if b.edge > 2.0 and b.confidence > 0.6]
        
        if len(good_bets) < 2:
            return parlays
        
        # Generate 2-leg parlays
        for i in range(min(3, len(good_bets) - 1)):
            for j in range(i + 1, min(i + 4, len(good_bets))):
                parlay = self.prediction_engine.calculate_parlay_probability(
                    [good_bets[i], good_bets[j]]
                )
                if parlay['expected_value'] > 0.15:
                    parlays.append(parlay)
        
        # Generate 3-leg parlays if enough good bets
        if len(good_bets) >= 3:
            for i in range(min(2, len(good_bets) - 2)):
                parlay = self.prediction_engine.calculate_parlay_probability(
                    good_bets[i:i+3]
                )
                if parlay['expected_value'] > 0.20:
                    parlays.append(parlay)
        
        # Sort by EV
        parlays.sort(key=lambda x: x['expected_value'], reverse=True)
        
        return parlays[:5]
    
    def _calculate_kelly_sizes(self,
                             bets: List[PropBetAnalysis]) -> Dict[str, float]:
        """Calculate Kelly criterion bet sizes"""
        
        kelly_sizes = {}
        
        for bet in bets:
            if bet.edge <= 0:
                continue
            
            # Get probability and odds
            if 'over' in bet.recommendation.lower():
                prob = bet.over_probability
            else:
                prob = bet.under_probability
            
            # Simplified Kelly: f = (p*b - q) / b
            # where p = probability of winning, q = 1-p, b = decimal odds - 1
            decimal_odds = 1.91  # Assuming standard -110
            b = decimal_odds - 1
            q = 1 - prob
            
            kelly_fraction = (prob * b - q) / b
            
            # Apply Kelly divisor for safety (quarter Kelly)
            safe_kelly = kelly_fraction / 4
            
            # Cap at 5% of bankroll
            final_size = min(0.05, max(0, safe_kelly))
            
            if final_size > 0.01:  # Only include if > 1%
                kelly_sizes[f"{bet.player}_{bet.stat}"] = final_size
        
        return kelly_sizes
    
    def _calculate_expected_roi(self,
                              bets: List[PropBetAnalysis]) -> float:
        """Calculate expected ROI for bet portfolio"""
        
        if not bets:
            return 0.0
        
        total_ev = sum(bet.edge for bet in bets if bet.edge > 0)
        num_positive = len([b for b in bets if bet.edge > 0])
        
        if num_positive == 0:
            return 0.0
        
        return total_ev / num_positive
    
    def _calculate_portfolio_risk(self,
                                bets: List[PropBetAnalysis]) -> Dict[str, float]:
        """Calculate risk metrics for bet portfolio"""
        
        if not bets:
            return {'variance': 0, 'sharpe_ratio': 0, 'max_drawdown': 0}
        
        edges = [bet.edge for bet in bets]
        
        return {
            'variance': np.var(edges),
            'sharpe_ratio': np.mean(edges) / (np.std(edges) + 0.001),
            'max_drawdown': min(edges) if edges else 0,
            'win_rate': len([e for e in edges if e > 0]) / len(edges)
        }
    
    def _suggest_risk_mitigation(self, risk_factors: List[str]) -> List[str]:
        """Suggest risk mitigation strategies"""
        
        suggestions = []
        
        for risk in risk_factors:
            if 'weather' in risk.lower():
                suggestions.append("Consider under bets in severe weather")
            elif 'injury' in risk.lower():
                suggestions.append("Reduce exposure or wait for injury updates")
            elif 'rest' in risk.lower():
                suggestions.append("Fade players on short rest")
            elif 'confidence' in risk.lower():
                suggestions.append("Reduce bet size or pass")
        
        return suggestions