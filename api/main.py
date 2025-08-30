import os
import json
from typing import Dict, Any
from datetime import datetime

# Import from parent directory
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.probability_analyzer import ProbabilityAnalyzer, AnalysisType
from src.core.sequential_calculator import SequentialProbabilityCalculator, Event
from src.data.data_processor import DataProcessor
from src.weather.weather_integration import WeatherIntegration
from src.ml.yolo_feedback_loop import YOLOFeedbackLoop
from src.ml.pattern_recognition import PatternRecognitionEngine
from src.sports.sports_analyzer import SportsAnalyzer
from src.sports.data_integration import SportsDataIntegration

def handler(request, response):
    """Vercel serverless function handler"""
    
    # Get environment variables from Vercel
    sports_radar_key = os.environ.get('SPORTS_RADAR_API_KEY') or os.environ.get('NEXT_PUBLIC_SPORTRADAR_API_KEY')
    weather_api_key = os.environ.get('WEATHER_API_KEY')
    
    # Initialize configuration
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
        }
    }
    
    # Parse request
    if request.method == 'POST':
        data = json.loads(request.body)
        analysis_type = data.get('type', 'sports')
        
        if analysis_type == 'sports':
            # Sports analysis
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
                if sport in ['nfl', 'mlb', 'soccer'] and weather_api_key:
                    weather_int = WeatherIntegration(config['weather'])
                    location = data.get('location', {'lat': 40.7128, 'lon': -74.0060})
                    weather = weather_int.fetch_current_weather(location)
                    result['weather_conditions'] = weather
                
                response_data = {
                    'success': True,
                    'analysis': result,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                response_data = {
                    'success': False,
                    'error': 'Missing team1 or team2 parameters'
                }
                
        elif analysis_type == 'probability':
            # General probability analysis
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
                response_data = {
                    'success': True,
                    'analysis': result,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                response_data = {
                    'success': False,
                    'error': 'No events provided'
                }
        else:
            response_data = {
                'success': False,
                'error': f'Unknown analysis type: {analysis_type}'
            }
            
    elif request.method == 'GET':
        # Health check
        response_data = {
            'success': True,
            'message': 'Probability Analyzer API is running',
            'version': '1.0.0',
            'apis': {
                'sports_radar': bool(sports_radar_key),
                'weather': bool(weather_api_key)
            }
        }
    else:
        response_data = {
            'success': False,
            'error': f'Method {request.method} not allowed'
        }
    
    response.status_code = 200
    response.headers['Content-Type'] = 'application/json'
    return json.dumps(response_data)