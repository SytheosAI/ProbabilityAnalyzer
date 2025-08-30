"""
Sports Radar API Client - REAL DATA INTEGRATION
No more mocks - this connects to the actual Sports Radar API
"""

import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from functools import lru_cache
import time

logger = logging.getLogger(__name__)

class SportsRadarClient:
    """Client for interacting with Sports Radar API"""
    
    def __init__(self):
        self.api_key = '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd'
        self.base_url = 'https://api.sportradar.us'
        self.session = requests.Session()
        self.last_request_time = 0
        self.min_request_interval = 1.1  # Rate limiting: 1 request per second
        
    def _rate_limit(self):
        """Ensure we don't exceed API rate limits"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            time.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()
        
    def _make_request(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Make a request to Sports Radar API with rate limiting"""
        self._rate_limit()
        
        url = f"{endpoint}?api_key={self.api_key}"
        logger.info(f"Fetching LIVE data from: {url}")
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {e}")
            return None
            
    @lru_cache(maxsize=100, typed=False)
    def get_nba_games_today(self) -> List[Dict[str, Any]]:
        """Get today's NBA games"""
        today = datetime.now().strftime('%Y/%m/%d')
        endpoint = f"{self.base_url}/nba/trial/v8/en/games/{today}/schedule.json"
        data = self._make_request(endpoint)
        return data.get('games', []) if data else []
        
    @lru_cache(maxsize=100, typed=False)
    def get_nfl_games_week(self, week: Optional[int] = None) -> List[Dict[str, Any]]:
        """Get NFL games for specific week"""
        if week is None:
            week = self._get_current_nfl_week()
        endpoint = f"{self.base_url}/nfl/official/trial/v7/en/games/2024/REG/{week}/schedule.json"
        data = self._make_request(endpoint)
        return data.get('week', {}).get('games', []) if data else []
        
    @lru_cache(maxsize=100, typed=False)
    def get_mlb_games_today(self) -> List[Dict[str, Any]]:
        """Get today's MLB games"""
        today = datetime.now().strftime('%Y/%m/%d')
        endpoint = f"{self.base_url}/mlb/trial/v7/en/games/{today}/schedule.json"
        data = self._make_request(endpoint)
        return data.get('games', []) if data else []
        
    @lru_cache(maxsize=100, typed=False)
    def get_nhl_games_today(self) -> List[Dict[str, Any]]:
        """Get today's NHL games"""
        today = datetime.now().strftime('%Y/%m/%d')
        endpoint = f"{self.base_url}/nhl/trial/v7/en/games/{today}/schedule.json"
        data = self._make_request(endpoint)
        return data.get('games', []) if data else []
        
    def get_game_odds(self, sport: str, game_id: str) -> Optional[Dict[str, Any]]:
        """Get odds for a specific game"""
        sport_map = {
            'nba': 'basketball_nba',
            'nfl': 'americanfootball_nfl',
            'mlb': 'baseball_mlb',
            'nhl': 'icehockey_nhl'
        }
        
        odds_sport = sport_map.get(sport.lower(), sport)
        endpoint = f"{self.base_url}/oddscomparison-us/trial/v2/en/sports/{odds_sport}/odds.json"
        
        data = self._make_request(endpoint)
        if data and 'sport_events' in data:
            for event in data['sport_events']:
                if event.get('sport_event', {}).get('id') == game_id:
                    return event
        return None
        
    @lru_cache(maxsize=200, typed=False)
    def get_team_statistics(self, sport: str, team_id: str, season: str = '2024') -> Optional[Dict[str, Any]]:
        """Get team statistics"""
        endpoints = {
            'nba': f"{self.base_url}/nba/trial/v8/en/seasons/{season}/REG/teams/{team_id}/statistics.json",
            'nfl': f"{self.base_url}/nfl/official/trial/v7/en/seasons/{season}/REG/teams/{team_id}/statistics.json",
            'mlb': f"{self.base_url}/mlb/trial/v7/en/seasons/{season}/REG/teams/{team_id}/statistics.json",
            'nhl': f"{self.base_url}/nhl/trial/v7/en/seasons/{season}/REG/teams/{team_id}/statistics.json"
        }
        
        endpoint = endpoints.get(sport.lower())
        if not endpoint:
            logger.error(f"Unsupported sport: {sport}")
            return None
            
        return self._make_request(endpoint)
        
    def get_injuries(self, sport: str) -> List[Dict[str, Any]]:
        """Get current injury report"""
        endpoints = {
            'nba': f"{self.base_url}/nba/trial/v8/en/league/injuries.json",
            'nfl': f"{self.base_url}/nfl/official/trial/v7/en/league/injuries.json",
            'mlb': f"{self.base_url}/mlb/trial/v7/en/league/injuries.json",
            'nhl': f"{self.base_url}/nhl/trial/v7/en/league/injuries.json"
        }
        
        endpoint = endpoints.get(sport.lower())
        if not endpoint:
            return []
            
        data = self._make_request(endpoint)
        if not data:
            return []
            
        injuries = []
        for team in data.get('teams', []):
            for player in team.get('players', []):
                if player.get('injuries'):
                    for injury in player['injuries']:
                        injuries.append({
                            'team': team.get('name'),
                            'team_id': team.get('id'),
                            'player': player.get('full_name'),
                            'status': injury.get('status'),
                            'description': injury.get('desc'),
                            'impact': self._calculate_injury_impact(injury)
                        })
        return injuries
        
    def get_player_statistics(self, sport: str, player_id: str, season: str = '2024') -> Optional[Dict[str, Any]]:
        """Get player statistics"""
        endpoints = {
            'nba': f"{self.base_url}/nba/trial/v8/en/players/{player_id}/profile.json",
            'nfl': f"{self.base_url}/nfl/official/trial/v7/en/players/{player_id}/profile.json",
            'mlb': f"{self.base_url}/mlb/trial/v7/en/players/{player_id}/profile.json",
            'nhl': f"{self.base_url}/nhl/trial/v7/en/players/{player_id}/profile.json"
        }
        
        endpoint = endpoints.get(sport.lower())
        if not endpoint:
            return None
            
        return self._make_request(endpoint)
        
    def get_game_boxscore(self, sport: str, game_id: str) -> Optional[Dict[str, Any]]:
        """Get live/final boxscore for a game"""
        endpoints = {
            'nba': f"{self.base_url}/nba/trial/v8/en/games/{game_id}/boxscore.json",
            'nfl': f"{self.base_url}/nfl/official/trial/v7/en/games/{game_id}/boxscore.json",
            'mlb': f"{self.base_url}/mlb/trial/v7/en/games/{game_id}/boxscore.json",
            'nhl': f"{self.base_url}/nhl/trial/v7/en/games/{game_id}/boxscore.json"
        }
        
        endpoint = endpoints.get(sport.lower())
        if not endpoint:
            return None
            
        return self._make_request(endpoint)
        
    def get_all_games_today(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all games across all sports for today"""
        games = {
            'nba': self.get_nba_games_today(),
            'nfl': self.get_nfl_games_week(),
            'mlb': self.get_mlb_games_today(),
            'nhl': self.get_nhl_games_today()
        }
        
        # Filter out empty lists
        return {sport: game_list for sport, game_list in games.items() if game_list}
        
    def format_game_data(self, game: Dict[str, Any], sport: str) -> Dict[str, Any]:
        """Format raw game data into standardized structure"""
        formatted = {
            'game_id': game.get('id'),
            'sport': sport.upper(),
            'scheduled': game.get('scheduled'),
            'status': game.get('status'),
            'home_team': {
                'id': game.get('home', {}).get('id'),
                'name': game.get('home', {}).get('name'),
                'alias': game.get('home', {}).get('alias')
            },
            'away_team': {
                'id': game.get('away', {}).get('id'),
                'name': game.get('away', {}).get('name'),
                'alias': game.get('away', {}).get('alias')
            },
            'venue': game.get('venue', {}),
            'home_score': game.get('home_points'),
            'away_score': game.get('away_points')
        }
        
        # Get odds if available
        odds = self.get_game_odds(sport, game.get('id'))
        if odds:
            formatted['odds'] = self._extract_odds(odds)
            
        return formatted
        
    def _extract_odds(self, odds_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract relevant odds from raw data"""
        markets = odds_data.get('markets', [])
        
        odds = {
            'moneyline': {},
            'spread': {},
            'total': {}
        }
        
        for market in markets:
            market_name = market.get('name', '').lower()
            
            if 'moneyline' in market_name:
                for book in market.get('books', []):
                    for outcome in book.get('outcomes', []):
                        if outcome.get('type') == 'home':
                            odds['moneyline']['home'] = outcome.get('odds', {}).get('american')
                        elif outcome.get('type') == 'away':
                            odds['moneyline']['away'] = outcome.get('odds', {}).get('american')
                            
            elif 'spread' in market_name or 'handicap' in market_name:
                for book in market.get('books', []):
                    for outcome in book.get('outcomes', []):
                        if outcome.get('type') == 'home':
                            odds['spread']['home'] = {
                                'line': outcome.get('spread'),
                                'odds': outcome.get('odds', {}).get('american')
                            }
                        elif outcome.get('type') == 'away':
                            odds['spread']['away'] = {
                                'line': outcome.get('spread'),
                                'odds': outcome.get('odds', {}).get('american')
                            }
                            
            elif 'total' in market_name or 'over/under' in market_name:
                for book in market.get('books', []):
                    for outcome in book.get('outcomes', []):
                        if 'over' in outcome.get('type', '').lower():
                            odds['total']['over'] = {
                                'line': outcome.get('total'),
                                'odds': outcome.get('odds', {}).get('american')
                            }
                        elif 'under' in outcome.get('type', '').lower():
                            odds['total']['under'] = {
                                'line': outcome.get('total'),
                                'odds': outcome.get('odds', {}).get('american')
                            }
                            
        return odds
        
    def _calculate_injury_impact(self, injury: Dict[str, Any]) -> float:
        """Calculate injury impact score"""
        status = injury.get('status', '').lower()
        
        if 'out' in status:
            return 1.0
        elif 'doubtful' in status:
            return 0.75
        elif 'questionable' in status:
            return 0.5
        elif 'probable' in status:
            return 0.25
        else:
            return 0.0
            
    def _get_current_nfl_week(self) -> int:
        """Calculate current NFL week"""
        season_start = datetime(2024, 9, 5)  # 2024 NFL season start
        now = datetime.now()
        
        if now < season_start:
            return 1
            
        weeks_passed = (now - season_start).days // 7
        return min(max(1, weeks_passed + 1), 18)  # Regular season is 18 weeks
        
    def get_weather_data(self, city: str) -> Optional[Dict[str, Any]]:
        """Get weather data for outdoor games"""
        weather_api_key = 'cebea6d73816dccaecbe0dcd99d2471c'
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={weather_api_key}&units=imperial"
        
        try:
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Weather API error: {e}")
            return None

# Global client instance
sports_radar_client = SportsRadarClient()