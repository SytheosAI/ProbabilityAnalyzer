import os
import json
import asyncio
import numpy as np
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import traceback

# Import from parent directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

from src.core.probability_analyzer import ProbabilityAnalyzer, AnalysisType
from src.core.sequential_calculator import SequentialProbabilityCalculator, Event
from src.data.data_processor import DataProcessor
from src.weather.weather_integration import WeatherIntegration
from src.ml.yolo_feedback_loop import YOLOFeedbackLoop
from src.ml.pattern_recognition import PatternRecognitionEngine
from src.sports.sports_analyzer import SportsAnalyzer
from src.sports.data_integration import SportsDataIntegration
from src.sports.master_sports_predictor import MasterSportsPredictor, PredictionFilter, RiskLevel
from src.sports.moneyline_predictor import MoneylinePredictor
from src.sports.parlay_optimizer import ParlayOptimizer
from src.sports.weekly_learning_system import WeeklyLearningSystem
from src.sports.historical_odds_analyzer import HistoricalOddsAnalyzer
from src.sports.multi_bookmaker_comparison import MultiBookmakerComparison
from src.sports.line_movement_tracker import LineMovementTracker
from src.sports.ml_expected_value_calculator import MLExpectedValueCalculator
from src.sports.arbitrage_detector import ArbitrageDetector

async def async_handler(request, response):
    """Async handler for advanced sports predictions"""
    
    # Get environment variables from Vercel
    sports_radar_key = os.environ.get('SPORTS_RADAR_API_KEY') or os.environ.get('NEXT_PUBLIC_SPORTRADAR_API_KEY')
    weather_api_key = os.environ.get('WEATHER_API_KEY')
    
    # Initialize comprehensive configuration
    config = {
        'probability': {
            'monte_carlo_simulations': 1000,
            'confidence_intervals': [0.95]
        },
        'weather': {
            'api_key': weather_api_key,
            'base_url': 'https://api.openweathermap.org/data/2.5'
        },
        'sports': {
            'sports_radar_api_key': sports_radar_key
        },
        'sports_analyzer': {
            'elo_k_factor': 32,
            'home_advantage': 0.03,
            'injury_weight': 0.15,
            'form_weight': 0.25
        },
        'moneyline': {
            'vig_adjustment': 0.05,
            'kelly_fraction': 0.25,
            'min_edge_threshold': 0.03
        },
        'parlay': {
            'min_legs': 3,
            'max_legs': 5,
            'correlation_threshold': 0.3,
            'min_ev_threshold': 5.0
        },
        'learning': {
            'db_path': './data/learning.db'
        },
        'historical_odds': {
            'db_path': './data/historical_odds.db',
            'odds_api_key': sports_radar_key
        },
        'bookmaker_comparison': {
            'odds_api_key': sports_radar_key,
            'cache_duration': 300
        },
        'line_movement': {
            'db_path': './data/line_movements.db',
            'odds_api_key': sports_radar_key,
            'tracking_interval': 60
        },
        'ml_ev_calculator': {
            'ensemble_models': ['xgboost', 'lightgbm', 'random_forest'],
            'min_edge_threshold': 1.0
        },
        'arbitrage': {
            'odds_api_key': sports_radar_key,
            'min_profit_margin': 0.5
        },
        'cross_reference': {
            'sports_radar_api': sports_radar_key,
            'weather_api': weather_api_key
        }
    }
    
    # Initialize master predictor
    master_predictor = MasterSportsPredictor(config)
    
    # Parse request path to determine endpoint
    path = getattr(request, 'path', '/').lower()
    
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            
            # Route to appropriate endpoint
            if path.endswith('/moneyline') or data.get('type') == 'moneyline':
                response_data = await handle_moneyline_prediction(master_predictor, data)
            
            elif path.endswith('/parlays') or data.get('type') == 'parlays':
                response_data = await handle_parlay_optimization(master_predictor, data)
            
            elif path.endswith('/comprehensive') or data.get('type') == 'comprehensive':
                response_data = await handle_comprehensive_analysis(master_predictor, data)
            
            elif path.endswith('/daily') or data.get('type') == 'daily':
                response_data = await handle_daily_recommendations(master_predictor, data)
            
            elif path.endswith('/learning/update') or data.get('type') == 'learning_update':
                response_data = handle_learning_update(master_predictor, data)
            
            elif path.endswith('/filters') or data.get('type') == 'filter':
                response_data = await handle_filtered_predictions(master_predictor, data)
            
            elif data.get('type') == 'sports':
                # Legacy sports analysis
                response_data = await handle_legacy_sports_analysis(config, data)
            
            elif path.endswith('/historical') or data.get('type') == 'historical':
                response_data = await handle_historical_odds(config, data)
            
            elif path.endswith('/compare') or data.get('type') == 'compare':
                response_data = await handle_bookmaker_comparison(config, data)
            
            elif path.endswith('/track') or data.get('type') == 'track':
                response_data = await handle_line_movement_tracking(config, data)
            
            elif path.endswith('/expected-value') or data.get('type') == 'expected_value':
                response_data = await handle_ml_expected_value(config, data)
            
            elif path.endswith('/arbitrage') or data.get('type') == 'arbitrage':
                response_data = await handle_arbitrage_detection(config, data)
            
            elif data.get('type') == 'probability':
                # General probability analysis
                response_data = handle_probability_analysis(config, data)
            
            else:
                response_data = {
                    'success': False,
                    'error': f'Unknown analysis type: {data.get("type", "not specified")}'
                }
        
        elif request.method == 'GET':
            # Health check and API info
            response_data = {
                'success': True,
                'message': 'Advanced Sports Prediction API is running',
                'version': '2.0.0',
                'endpoints': {
                    'POST /moneyline': 'Moneyline predictions for all sports',
                    'POST /parlays': 'Optimal parlay recommendations',
                    'POST /comprehensive': 'Complete game analysis',
                    'POST /daily': 'Daily recommendations',
                    'POST /learning/update': 'Trigger learning system update',
                    'POST /filters': 'Filtered predictions with custom criteria',
                    'POST /historical': 'Pull historical odds data for pattern analysis',
                    'POST /compare': 'Compare live moneylines across bookmakers',
                    'POST /track': 'Track line movements to identify betting trends',
                    'POST /expected-value': 'Calculate expected value using ML models',
                    'POST /arbitrage': 'Identify arbitrage opportunities when lines differ',
                    'GET /': 'Health check and API information'
                },
                'apis': {
                    'sports_radar': bool(sports_radar_key),
                    'weather': bool(weather_api_key)
                },
                'features': [
                    'All sports moneyline predictions',
                    'ML-powered parlay optimization',
                    'Comprehensive cross-reference analysis',
                    'Weekly learning system',
                    'Advanced filtering and risk management',
                    'Real-time pattern recognition',
                    'Historical odds pattern analysis',
                    'Multi-bookmaker comparison',
                    'Line movement tracking',
                    'ML-based expected value calculation',
                    'Arbitrage opportunity detection'
                ]
            }
        
        else:
            response_data = {
                'success': False,
                'error': f'Method {request.method} not allowed'
            }
    
    except Exception as e:
        logger.error(f"API Error: {e}\n{traceback.format_exc()}")
        response_data = {
            'success': False,
            'error': 'Internal server error',
            'message': str(e) if os.getenv('DEBUG', 'false').lower() == 'true' else 'An error occurred processing your request',
            'timestamp': datetime.now().isoformat()
        }
    
    response.status_code = 200
    response.headers['Content-Type'] = 'application/json'
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    
    return json.dumps(response_data, indent=2)

async def handle_moneyline_prediction(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle moneyline prediction requests"""
    try:
        # Validate input
        if not data:
            return {
                'success': False,
                'error': 'No data provided',
                'timestamp': datetime.now().isoformat()
            }
        sport = data.get('sport', 'nfl')
        games = data.get('games', [])
        min_edge = data.get('min_edge', 0.03)
        
        if not games:
            # Create mock game for demonstration
            games = [{
                'game_id': 'sample_game',
                'sport': sport,
                'home_team': data.get('home_team', 'Team A'),
                'away_team': data.get('away_team', 'Team B'),
                'home_moneyline': data.get('home_moneyline', -110),
                'away_moneyline': data.get('away_moneyline', -110),
                'game_time': datetime.now() + timedelta(hours=2)
            }]
        
        # Initialize moneyline predictor
        moneyline_predictor = MoneylinePredictor(master_predictor.config['moneyline'])
        
        # Analyze games for moneyline value
        results = []
        for game in games:
            # Convert to required format and analyze
            analysis = moneyline_predictor.identify_value_bets([game], sport, min_edge)
            
            if analysis:
                for ml_analysis in analysis:
                    results.append({
                        'game_id': game.get('game_id'),
                        'team': ml_analysis.team,
                        'sport': ml_analysis.sport,
                        'american_odds': ml_analysis.american_odds,
                        'decimal_odds': ml_analysis.decimal_odds,
                        'implied_probability': ml_analysis.implied_probability,
                        'true_probability': ml_analysis.true_probability,
                        'expected_value': ml_analysis.expected_value,
                        'edge': ml_analysis.edge,
                        'kelly_criterion': ml_analysis.kelly_criterion,
                        'confidence_score': ml_analysis.confidence_score,
                        'value_rating': ml_analysis.value_rating,
                        'key_factors': ml_analysis.factors
                    })
        
        # Sort by expected value
        results.sort(key=lambda x: x['expected_value'], reverse=True)
        
        return {
            'success': True,
            'type': 'moneyline_predictions',
            'sport': sport,
            'total_games': len(games),
            'value_bets_found': len(results),
            'min_edge_threshold': min_edge,
            'predictions': results[:20],  # Return top 20
            'summary': {
                'avg_expected_value': np.mean([r['expected_value'] for r in results]) if results else 0,
                'avg_confidence': np.mean([r['confidence_score'] for r in results]) if results else 0,
                'strong_value_count': len([r for r in results if r['value_rating'] == 'strong'])
            },
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Moneyline prediction error: {e}\n{traceback.format_exc()}")
        return {
            'success': False,
            'error': 'Moneyline prediction failed',
            'message': str(e) if os.getenv('DEBUG', 'false').lower() == 'true' else 'Failed to generate moneyline predictions',
            'timestamp': datetime.now().isoformat()
        }

async def handle_parlay_optimization(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle parlay optimization requests"""
    try:
        games = data.get('games', [])
        risk_level = RiskLevel(data.get('risk_level', 'moderate'))
        max_parlays = data.get('max_parlays', 10)
        sports_filter = data.get('sports', None)
        
        # Create filter config
        filter_config = PredictionFilter(
            sports=sports_filter,
            min_confidence=data.get('min_confidence'),
            min_expected_value=data.get('min_expected_value'),
            max_correlation=data.get('max_correlation')
        )
        
        if not games:
            # Create mock games for demonstration
            sports_list = sports_filter if sports_filter else ['nfl', 'nba', 'mlb']
            games = []
            for i, sport in enumerate(sports_list[:5]):  # Max 5 mock games
                games.append({
                    'game_id': f'game_{i}',
                    'sport': sport,
                    'home_team': f'Home Team {i}',
                    'away_team': f'Away Team {i}',
                    'game_time': datetime.now() + timedelta(hours=2 + i),
                    'home_moneyline': -110 - (i * 20),
                    'away_moneyline': -110 + (i * 20)
                })
        
        # Generate optimal parlays
        parlays = await master_predictor.generate_optimal_parlays(
            games, risk_level, filter_config, max_parlays
        )
        
        # Format results
        parlay_results = []
        for parlay in parlays:
            legs_info = []
            for leg in parlay.legs:
                legs_info.append({
                    'team': leg.team,
                    'bet_type': leg.bet_type,
                    'line': leg.line,
                    'odds': leg.odds,
                    'probability': leg.probability,
                    'sport': leg.sport
                })
            
            parlay_results.append({
                'parlay_id': parlay.parlay_id,
                'legs': legs_info,
                'num_legs': len(parlay.legs),
                'combined_odds': parlay.combined_odds,
                'total_probability': parlay.total_probability,
                'expected_value': parlay.expected_value,
                'risk_score': parlay.risk_score,
                'confidence_score': parlay.confidence_score,
                'correlation_score': parlay.correlation_score,
                'kelly_stake': parlay.kelly_stake,
                'risk_level': parlay.risk_level.value,
                'key_factors': parlay.key_factors,
                'warnings': parlay.warnings,
                'sports_included': parlay.metadata.get('sports_included', []),
                'bet_types': parlay.metadata.get('bet_types', [])
            })
        
        return {
            'success': True,
            'type': 'parlay_optimization',
            'risk_level': risk_level.value,
            'total_games': len(games),
            'parlays_generated': len(parlay_results),
            'filter_criteria': {
                'sports': sports_filter,
                'min_confidence': data.get('min_confidence'),
                'max_correlation': data.get('max_correlation')
            },
            'parlays': parlay_results,
            'recommendations': {
                'best_value': parlay_results[0] if parlay_results else None,
                'safest': sorted(parlay_results, key=lambda x: x['risk_score'])[0] if parlay_results else None,
                'highest_odds': sorted(parlay_results, key=lambda x: x['combined_odds'], reverse=True)[0] if parlay_results else None
            },
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Parlay optimization error: {e}\n{traceback.format_exc()}")
        return {
            'success': False,
            'error': 'Parlay optimization failed',
            'message': str(e) if os.getenv('DEBUG', 'false').lower() == 'true' else 'Failed to generate parlay recommendations',
            'timestamp': datetime.now().isoformat()
        }

async def handle_comprehensive_analysis(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle comprehensive game analysis requests"""
    try:
        games = data.get('games', [])
        
        if not games:
            return {
                'success': False,
                'error': 'No games provided for analysis'
            }
        
        # Create filter config if provided
        filter_config = None
        if data.get('filters'):
            filter_data = data['filters']
            filter_config = PredictionFilter(
                sports=filter_data.get('sports'),
                min_confidence=filter_data.get('min_confidence'),
                min_expected_value=filter_data.get('min_expected_value'),
                risk_levels=[RiskLevel(rl) for rl in filter_data.get('risk_levels', [])] if filter_data.get('risk_levels') else None
            )
        
        # Perform comprehensive analysis
        results = await master_predictor.analyze_games_comprehensive(games, filter_config)
        
        # Format results
        analysis_results = []
        for result in results:
            analysis_results.append({
                'game_id': result.game_analysis.game_id,
                'sport': result.game_analysis.sport,
                'teams': {
                    'home': result.game_analysis.home_team,
                    'away': result.game_analysis.away_team
                },
                'predictions': {
                    'moneyline': result.game_analysis.moneyline_prediction,
                    'spread': result.game_analysis.spread_prediction,
                    'total': result.game_analysis.total_prediction
                },
                'confidence_scores': result.game_analysis.confidence_scores,
                'key_factors': result.game_analysis.key_factors,
                'value_opportunities': result.game_analysis.value_opportunities,
                'risk_factors': result.game_analysis.risk_factors,
                'parlay_suitability': result.game_analysis.parlay_suitability,
                'overall_confidence': result.overall_confidence,
                'value_score': result.value_score,
                'best_single_bets': result.best_single_bets,
                'risk_assessment': result.risk_assessment,
                'learning_adjustments': result.learning_adjustments
            })
        
        return {
            'success': True,
            'type': 'comprehensive_analysis',
            'total_games': len(games),
            'games_analyzed': len(analysis_results),
            'analysis': analysis_results,
            'summary': {
                'avg_confidence': np.mean([r['overall_confidence'] for r in results]),
                'avg_value_score': np.mean([r['value_score'] for r in results]),
                'high_confidence_games': len([r for r in results if r.overall_confidence > 0.7]),
                'high_value_games': len([r for r in results if r.value_score > 15])
            },
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Comprehensive analysis error: {e}\n{traceback.format_exc()}")
        return {
            'success': False,
            'error': 'Comprehensive analysis failed',
            'message': str(e) if os.getenv('DEBUG', 'false').lower() == 'true' else 'Failed to perform comprehensive analysis',
            'timestamp': datetime.now().isoformat()
        }

async def handle_daily_recommendations(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle daily recommendation requests"""
    try:
        date_str = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        target_date = datetime.fromisoformat(date_str) if 'T' in date_str else datetime.strptime(date_str, '%Y-%m-%d')
        
        sports = data.get('sports')
        min_confidence = data.get('min_confidence', 0.6)
        min_expected_value = data.get('min_expected_value', 5.0)
        
        # Get daily recommendations
        recommendations = master_predictor.get_daily_recommendations(
            target_date, sports, min_confidence, min_expected_value
        )
        
        return {
            'success': True,
            'type': 'daily_recommendations',
            'date': target_date.strftime('%Y-%m-%d'),
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Daily recommendations error: {str(e)}'
        }

def handle_learning_update(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle learning system update requests"""
    try:
        update_type = data.get('update_type', 'weekly')
        
        if update_type == 'weekly':
            # Trigger weekly update
            master_predictor.learning_system.perform_weekly_update()
            message = "Weekly learning update initiated"
        elif update_type == 'daily':
            # Trigger daily update
            master_predictor.learning_system.perform_daily_update()
            message = "Daily learning update initiated"
        elif update_type == 'pattern':
            # Trigger pattern detection
            master_predictor.learning_system.detect_emerging_patterns()
            message = "Pattern detection initiated"
        else:
            return {
                'success': False,
                'error': f'Unknown update type: {update_type}'
            }
        
        return {
            'success': True,
            'type': 'learning_update',
            'update_type': update_type,
            'message': message,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Learning update error: {str(e)}'
        }

async def handle_filtered_predictions(master_predictor: MasterSportsPredictor, data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle filtered prediction requests"""
    try:
        games = data.get('games', [])
        filters = data.get('filters', {})
        
        # Create comprehensive filter config
        filter_config = PredictionFilter(
            sports=filters.get('sports'),
            start_date=datetime.fromisoformat(filters['start_date']) if filters.get('start_date') else None,
            end_date=datetime.fromisoformat(filters['end_date']) if filters.get('end_date') else None,
            min_confidence=filters.get('min_confidence'),
            max_confidence=filters.get('max_confidence'),
            min_value=filters.get('min_value'),
            max_value=filters.get('max_value'),
            min_expected_value=filters.get('min_expected_value'),
            risk_levels=[RiskLevel(rl) for rl in filters['risk_levels']] if filters.get('risk_levels') else None,
            min_parlay_suitability=filters.get('min_parlay_suitability'),
            max_correlation=filters.get('max_correlation')
        )
        
        if not games:
            return {
                'success': False,
                'error': 'No games provided for filtering'
            }
        
        # Apply filtering system
        filtered_predictions = master_predictor.filtering_system.apply_filters(games, filter_config)
        
        return {
            'success': True,
            'type': 'filtered_predictions',
            'original_count': len(games),
            'filtered_count': len(filtered_predictions),
            'filters_applied': {
                'sports': filter_config.sports,
                'date_range': {
                    'start': filter_config.start_date.isoformat() if filter_config.start_date else None,
                    'end': filter_config.end_date.isoformat() if filter_config.end_date else None
                },
                'confidence_range': {
                    'min': filter_config.min_confidence,
                    'max': filter_config.max_confidence
                },
                'value_range': {
                    'min': filter_config.min_value,
                    'max': filter_config.max_value
                },
                'min_expected_value': filter_config.min_expected_value,
                'risk_levels': [rl.value for rl in filter_config.risk_levels] if filter_config.risk_levels else None,
                'min_parlay_suitability': filter_config.min_parlay_suitability,
                'max_correlation': filter_config.max_correlation
            },
            'predictions': filtered_predictions,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Filtering error: {str(e)}'
        }

async def handle_legacy_sports_analysis(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle legacy sports analysis for backward compatibility"""
    try:
        analyzer = SportsAnalyzer(config['sports'])
        sports_data = SportsDataIntegration(config['sports'])
        
        sport = data.get('sport', 'nba')
        team1 = data.get('team1')
        team2 = data.get('team2')
        
        if team1 and team2:
            # Get odds
            odds = sports_data.fetch_odds(sport)
            
            # Calculate probabilities
            result = analyzer.calculate_game_probability(
                team1_data={'name': team1, 'elo': 1500},
                team2_data={'name': team2, 'elo': 1500},
                sport=sport
            )
            
            # Add weather if outdoor sport
            weather_api_key = config['weather']['api_key']
            if sport in ['nfl', 'mlb', 'soccer'] and weather_api_key:
                weather_int = WeatherIntegration(config['weather'])
                location = data.get('location', {'lat': 40.7128, 'lon': -74.0060})
                weather = weather_int.fetch_current_weather(location)
                result['weather_conditions'] = weather
            
            return {
                'success': True,
                'type': 'legacy_sports',
                'analysis': result,
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'success': False,
                'error': 'Missing team1 or team2 parameters'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Legacy sports analysis error: {str(e)}'
        }

def handle_probability_analysis(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle general probability analysis"""
    try:
        analyzer = ProbabilityAnalyzer(config['probability'])
        
        events = data.get('events', [])
        if events:
            calc = SequentialProbabilityCalculator(config.get('sequential', {}))
            event_objects = [
                Event(
                    id=e['id'],
                    name=e.get('name', e['id']),
                    probability=e.get('probability', 0.5),
                    dependencies=e.get('dependencies', []),
                    conditions=e.get('conditions', {})
                )
                for e in events
            ]
            
            result = calc.calculate_sequential_probability(event_objects)
            return {
                'success': True,
                'type': 'probability_analysis',
                'analysis': result,
                'timestamp': datetime.now().isoformat()
            }
        else:
            return {
                'success': False,
                'error': 'No events provided'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Probability analysis error: {str(e)}'
        }

async def handle_historical_odds(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle historical odds analysis requests"""
    try:
        analyzer = HistoricalOddsAnalyzer(config['historical_odds'])
        
        sport = data.get('sport', 'nfl')
        start_date = datetime.fromisoformat(data.get('start_date', (datetime.now() - timedelta(days=30)).isoformat()))
        end_date = datetime.fromisoformat(data.get('end_date', datetime.now().isoformat()))
        markets = data.get('markets', ['h2h', 'spreads', 'totals'])
        
        # Fetch historical odds
        historical_odds = await analyzer.fetch_historical_odds(sport, start_date, end_date, markets)
        
        # Analyze for patterns
        patterns = analyzer.analyze_betting_patterns(sport, (end_date - start_date).days)
        
        # Get pattern recommendations for current games
        current_games = data.get('current_games', [])
        recommendations = analyzer.get_pattern_recommendations(sport, current_games)
        
        return {
            'success': True,
            'type': 'historical_odds_analysis',
            'sport': sport,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'historical_odds_count': len(historical_odds),
            'patterns_discovered': len(patterns),
            'patterns': [
                {
                    'pattern_type': p.pattern_type,
                    'confidence': p.confidence,
                    'frequency': p.frequency,
                    'avg_roi': p.avg_roi,
                    'conditions': p.conditions
                } for p in patterns[:10]  # Top 10 patterns
            ],
            'recommendations': recommendations,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Historical odds analysis error: {str(e)}'
        }

async def handle_bookmaker_comparison(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle bookmaker comparison requests"""
    try:
        comparator = MultiBookmakerComparison(config['bookmaker_comparison'])
        
        sport = data.get('sport', 'nfl')
        markets = data.get('markets', ['h2h', 'spreads', 'totals'])
        
        # Fetch live odds comparison
        comparisons = await comparator.fetch_live_odds_comparison(sport, markets)
        
        # Find arbitrage opportunities
        arbitrage_opportunities = comparator.find_arbitrage_opportunities(comparisons, min_profit_margin=1.0)
        
        # Get best odds summary
        best_odds_summary = comparator.get_best_odds_summary(comparisons, top_n=20)
        
        # Analyze bookmaker performance
        bookmaker_stats = comparator.analyze_bookmaker_performance(comparisons)
        
        return {
            'success': True,
            'type': 'bookmaker_comparison',
            'sport': sport,
            'markets': markets,
            'total_comparisons': len(comparisons),
            'arbitrage_opportunities': len(arbitrage_opportunities),
            'arbitrage_details': [
                {
                    'game_id': arb.game_id if hasattr(arb, 'game_id') else arb.get('game_id'),
                    'teams': arb.teams if hasattr(arb, 'teams') else arb.get('teams'),
                    'profit_margin': arb.profit_margin if hasattr(arb, 'profit_margin') else arb.get('profit_margin'),
                    'expected_profit': arb.expected_profit if hasattr(arb, 'expected_profit') else arb.get('expected_profit'),
                    'bookmakers': arb.bookmakers_involved if hasattr(arb, 'bookmakers_involved') else arb.get('bookmakers_involved', [])
                } for arb in arbitrage_opportunities[:5]
            ],
            'best_odds': best_odds_summary,
            'bookmaker_performance': bookmaker_stats,
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Bookmaker comparison error: {str(e)}'
        }

async def handle_line_movement_tracking(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle line movement tracking requests"""
    try:
        tracker = LineMovementTracker(config['line_movement'])
        
        action = data.get('action', 'track')
        
        if action == 'start':
            game_id = data.get('game_id')
            sport = data.get('sport', 'nfl')
            duration = data.get('duration_hours', 24)
            
            if not game_id:
                return {
                    'success': False,
                    'error': 'game_id required for starting tracking'
                }
            
            result = await tracker.start_tracking_game(game_id, sport, duration)
            
            return {
                'success': True,
                'type': 'line_movement_tracking',
                'action': 'start_tracking',
                'game_id': game_id,
                'sport': sport,
                'duration_hours': duration,
                'message': result,
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'summary':
            game_id = data.get('game_id')
            lookback_hours = data.get('lookback_hours', 24)
            
            if not game_id:
                return {
                    'success': False,
                    'error': 'game_id required for movement summary'
                }
            
            summary = tracker.get_movement_summary(game_id, lookback_hours)
            
            return {
                'success': True,
                'type': 'line_movement_summary',
                'game_id': game_id,
                'summary': summary,
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'active':
            active_games = tracker.get_active_tracking()
            
            return {
                'success': True,
                'type': 'active_tracking',
                'active_games': active_games,
                'count': len(active_games),
                'timestamp': datetime.now().isoformat()
            }
        
        else:
            return {
                'success': False,
                'error': f'Unknown action: {action}. Use start, summary, or active'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Line movement tracking error: {str(e)}'
        }

async def handle_ml_expected_value(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle ML-based expected value calculation requests"""
    try:
        calculator = MLExpectedValueCalculator(config['ml_ev_calculator'])
        
        game_data = data.get('game_data', {})
        betting_lines = data.get('betting_lines', [])
        
        if not betting_lines:
            return {
                'success': False,
                'error': 'No betting lines provided for EV calculation'
            }
        
        # Calculate EV for all provided lines
        ev_calculations = []
        
        for betting_line in betting_lines:
            try:
                ev_calc = calculator.calculate_expected_value(game_data, betting_line)
                
                ev_calculations.append({
                    'game_id': ev_calc.game_id,
                    'sport': ev_calc.sport,
                    'market_type': ev_calc.market_type,
                    'outcome': ev_calc.outcome,
                    'bookmaker': ev_calc.bookmaker,
                    'offered_odds': ev_calc.offered_odds,
                    'fair_odds': ev_calc.fair_odds,
                    'implied_probability': ev_calc.implied_probability,
                    'true_probability': ev_calc.true_probability,
                    'expected_value': ev_calc.expected_value,
                    'expected_value_percentage': ev_calc.expected_value_percentage,
                    'kelly_fraction': ev_calc.kelly_fraction,
                    'confidence_interval': ev_calc.confidence_interval,
                    'risk_assessment': ev_calc.risk_assessment,
                    'recommendation': ev_calc.recommendation,
                    'model_confidence': ev_calc.model_confidence
                })
            
            except Exception as line_error:
                logger.error(f"Error calculating EV for line: {line_error}")
                continue
        
        # Sort by expected value percentage
        ev_calculations.sort(key=lambda x: x['expected_value_percentage'], reverse=True)
        
        return {
            'success': True,
            'type': 'ml_expected_value',
            'total_lines_analyzed': len(betting_lines),
            'ev_calculations': ev_calculations,
            'summary': {
                'positive_ev_count': len([calc for calc in ev_calculations if calc['expected_value'] > 0]),
                'avg_expected_value': np.mean([calc['expected_value_percentage'] for calc in ev_calculations]) if ev_calculations else 0,
                'best_bet': ev_calculations[0] if ev_calculations else None,
                'strong_recommendations': len([calc for calc in ev_calculations if 'STRONG' in calc['recommendation']])
            },
            'timestamp': datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'ML expected value calculation error: {str(e)}'
        }

async def handle_arbitrage_detection(config: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Handle arbitrage detection requests"""
    try:
        detector = ArbitrageDetector(config['arbitrage'])
        
        action = data.get('action', 'scan')
        
        if action == 'scan':
            sports = data.get('sports', ['nfl', 'nba', 'mlb'])
            markets = data.get('markets', ['h2h', 'spreads', 'totals'])
            
            # Scan for arbitrage opportunities
            opportunities = await detector.scan_for_arbitrage(sports, markets)
            
            # Get summary
            summary = detector.get_arbitrage_summary()
            
            # Format opportunities for response
            formatted_opportunities = []
            for opp in opportunities[:10]:  # Return top 10
                formatted_opportunities.append({
                    'opportunity_id': opp.opportunity_id,
                    'game_id': opp.game_id,
                    'sport': opp.sport,
                    'teams': f"{opp.teams[0]} vs {opp.teams[1]}",
                    'market_type': opp.market_type,
                    'profit_margin': opp.profit_margin,
                    'expected_profit': opp.expected_profit,
                    'risk_level': opp.risk_level,
                    'confidence_score': opp.confidence_score,
                    'bookmakers_involved': opp.bookmakers_involved,
                    'recommended_stakes': opp.recommended_stakes,
                    'time_sensitivity': opp.time_sensitivity
                })
            
            return {
                'success': True,
                'type': 'arbitrage_detection',
                'action': 'scan',
                'sports_scanned': sports,
                'markets_scanned': markets,
                'opportunities_found': len(opportunities),
                'opportunities': formatted_opportunities,
                'summary': summary,
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'execute':
            opportunity_id = data.get('opportunity_id')
            stake = data.get('stake', 1000)
            
            if not opportunity_id:
                return {
                    'success': False,
                    'error': 'opportunity_id required for execution planning'
                }
            
            if opportunity_id not in detector.active_arbitrages:
                return {
                    'success': False,
                    'error': 'Arbitrage opportunity not found or expired'
                }
            
            opportunity = detector.active_arbitrages[opportunity_id]
            execution_plan = detector.execute_arbitrage_strategy(opportunity, stake)
            
            return {
                'success': True,
                'type': 'arbitrage_execution_plan',
                'opportunity_id': opportunity_id,
                'execution_plan': execution_plan,
                'timestamp': datetime.now().isoformat()
            }
        
        elif action == 'history':
            days = data.get('days', 7)
            history = detector.get_arbitrage_history(days)
            
            return {
                'success': True,
                'type': 'arbitrage_history',
                'days': days,
                'history_count': len(history),
                'history': history,
                'timestamp': datetime.now().isoformat()
            }
        
        else:
            return {
                'success': False,
                'error': f'Unknown action: {action}. Use scan, execute, or history'
            }
    
    except Exception as e:
        return {
            'success': False,
            'error': f'Arbitrage detection error: {str(e)}'
        }

def handler(request, response):
    """Synchronous wrapper for async handler"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(async_handler(request, response))
    finally:
        loop.close()