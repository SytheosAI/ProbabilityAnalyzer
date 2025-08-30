"""
Live Data Integration Module
Handles real-time data fetching from multiple APIs with async operations
"""

import os
import asyncio
import aiohttp
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from dataclasses import dataclass, asdict
import time
from functools import lru_cache
import redis
import pickle

logger = logging.getLogger(__name__)

@dataclass
class LiveGameData:
    """Live game data structure"""
    game_id: str
    sport: str
    home_team: str
    away_team: str
    home_score: int
    away_score: int
    period: str
    time_remaining: str
    status: str
    venue: str
    attendance: Optional[int]
    weather: Optional[Dict]
    timestamp: datetime


@dataclass
class LiveOddsData:
    """Live odds data structure"""
    game_id: str
    bookmaker: str
    market_type: str
    home_odds: float
    away_odds: float
    spread: Optional[float]
    total: Optional[float]
    timestamp: datetime


class RateLimiter:
    """Rate limiter for API calls"""
    
    def __init__(self, calls_per_minute: int = 30):
        self.calls_per_minute = calls_per_minute
        self.call_times = []
        self.lock = asyncio.Lock()
    
    async def wait_if_needed(self):
        """Wait if rate limit would be exceeded"""
        async with self.lock:
            now = time.time()
            # Remove calls older than 1 minute
            self.call_times = [t for t in self.call_times if now - t < 60]
            
            if len(self.call_times) >= self.calls_per_minute:
                # Wait until the oldest call is more than 1 minute old
                wait_time = 60 - (now - self.call_times[0]) + 0.1
                if wait_time > 0:
                    logger.debug(f"Rate limit reached, waiting {wait_time:.1f} seconds")
                    await asyncio.sleep(wait_time)
            
            self.call_times.append(time.time())


class SportsRadarAPI:
    """Sports Radar API integration for live sports data"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_urls = {
            'nfl': 'https://api.sportradar.us/nfl/official/trial/v7/en',
            'nba': 'https://api.sportradar.us/nba/trial/v8/en',
            'mlb': 'https://api.sportradar.us/mlb/trial/v7/en',
            'nhl': 'https://api.sportradar.us/nhl/trial/v7/en',
            'ncaaf': 'https://api.sportradar.us/ncaafb/trial/v7/en',
            'ncaab': 'https://api.sportradar.us/ncaamb/trial/v8/en',
            'soccer': 'https://api.sportradar.us/soccer/trial/v4/en'
        }
        self.rate_limiter = RateLimiter(calls_per_minute=30)
        self.session = None
    
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def fetch_live_games(self, sport: str) -> List[LiveGameData]:
        """Fetch live games for a sport"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        if sport not in self.base_urls:
            logger.error(f"Sport {sport} not supported")
            return []
        
        try:
            # Get today's games
            today = datetime.now().strftime('%Y/%m/%d')
            url = f"{self.base_urls[sport]}/games/{today}/schedule.json"
            params = {'api_key': self.api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_games(data, sport)
                else:
                    logger.error(f"SportsRadar API error: {response.status}")
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching live games: {e}")
            return []
    
    def _parse_games(self, data: Dict, sport: str) -> List[LiveGameData]:
        """Parse game data from API response"""
        games = []
        
        try:
            game_list = data.get('games', [])
            
            for game in game_list:
                games.append(LiveGameData(
                    game_id=game.get('id'),
                    sport=sport,
                    home_team=game.get('home', {}).get('name', ''),
                    away_team=game.get('away', {}).get('name', ''),
                    home_score=game.get('home_points', 0),
                    away_score=game.get('away_points', 0),
                    period=game.get('quarter', game.get('period', '')),
                    time_remaining=game.get('clock', ''),
                    status=game.get('status', ''),
                    venue=game.get('venue', {}).get('name', ''),
                    attendance=game.get('attendance'),
                    weather=None,
                    timestamp=datetime.now()
                ))
        
        except Exception as e:
            logger.error(f"Error parsing game data: {e}")
        
        return games
    
    async def fetch_team_stats(self, sport: str, team_id: str) -> Dict[str, Any]:
        """Fetch detailed team statistics"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            season_year = datetime.now().year
            url = f"{self.base_urls[sport]}/seasons/{season_year}/REG/teams/{team_id}/statistics.json"
            params = {'api_key': self.api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failed to fetch team stats: {response.status}")
                    return {}
        
        except Exception as e:
            logger.error(f"Error fetching team stats: {e}")
            return {}
    
    async def fetch_player_injuries(self, sport: str) -> List[Dict[str, Any]]:
        """Fetch current injury reports"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            url = f"{self.base_urls[sport]}/league/injuries.json"
            params = {'api_key': self.api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get('teams', [])
                else:
                    logger.error(f"Failed to fetch injuries: {response.status}")
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching injuries: {e}")
            return []
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()


class OpenWeatherAPI:
    """OpenWeather API integration for weather data"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.openweathermap.org/data/2.5'
        self.rate_limiter = RateLimiter(calls_per_minute=60)
        self.session = None
    
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def fetch_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch current weather for coordinates"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            url = f"{self.base_url}/weather"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'imperial'
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_weather(data)
                else:
                    logger.error(f"Weather API error: {response.status}")
                    return {}
        
        except Exception as e:
            logger.error(f"Error fetching weather: {e}")
            return {}
    
    def _parse_weather(self, data: Dict) -> Dict[str, Any]:
        """Parse weather data"""
        return {
            'temperature': data.get('main', {}).get('temp'),
            'feels_like': data.get('main', {}).get('feels_like'),
            'humidity': data.get('main', {}).get('humidity'),
            'pressure': data.get('main', {}).get('pressure'),
            'wind_speed': data.get('wind', {}).get('speed'),
            'wind_direction': data.get('wind', {}).get('deg'),
            'visibility': data.get('visibility'),
            'conditions': data.get('weather', [{}])[0].get('main'),
            'description': data.get('weather', [{}])[0].get('description'),
            'timestamp': datetime.now().isoformat()
        }
    
    async def fetch_forecast(self, lat: float, lon: float, hours: int = 48) -> List[Dict]:
        """Fetch weather forecast"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            url = f"{self.base_url}/forecast"
            params = {
                'lat': lat,
                'lon': lon,
                'appid': self.api_key,
                'units': 'imperial',
                'cnt': hours // 3  # API returns 3-hour intervals
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return [self._parse_weather(item) for item in data.get('list', [])]
                else:
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching forecast: {e}")
            return []
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()


class TheOddsAPI:
    """The Odds API integration for betting odds"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = 'https://api.the-odds-api.com/v4'
        self.rate_limiter = RateLimiter(calls_per_minute=30)
        self.session = None
    
    async def _ensure_session(self):
        """Ensure aiohttp session exists"""
        if not self.session:
            self.session = aiohttp.ClientSession()
    
    async def fetch_sports(self) -> List[Dict]:
        """Fetch available sports"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            url = f"{self.base_url}/sports"
            params = {'apiKey': self.api_key}
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Odds API error: {response.status}")
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching sports: {e}")
            return []
    
    async def fetch_odds(self, sport: str, markets: List[str] = None, 
                        bookmakers: List[str] = None) -> List[LiveOddsData]:
        """Fetch live odds for a sport"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        if markets is None:
            markets = ['h2h', 'spreads', 'totals']
        
        try:
            url = f"{self.base_url}/sports/{sport}/odds"
            params = {
                'apiKey': self.api_key,
                'regions': 'us',
                'markets': ','.join(markets),
                'oddsFormat': 'american'
            }
            
            if bookmakers:
                params['bookmakers'] = ','.join(bookmakers)
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    return self._parse_odds(data)
                else:
                    logger.error(f"Failed to fetch odds: {response.status}")
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching odds: {e}")
            return []
    
    def _parse_odds(self, data: List[Dict]) -> List[LiveOddsData]:
        """Parse odds data from API response"""
        odds_list = []
        
        try:
            for game in data:
                game_id = game.get('id')
                
                for bookmaker_data in game.get('bookmakers', []):
                    bookmaker = bookmaker_data.get('key')
                    
                    for market in bookmaker_data.get('markets', []):
                        market_type = market.get('key')
                        
                        for outcome in market.get('outcomes', []):
                            if market_type == 'h2h':
                                odds_list.append(LiveOddsData(
                                    game_id=game_id,
                                    bookmaker=bookmaker,
                                    market_type='moneyline',
                                    home_odds=outcome.get('price', 0) if outcome.get('name') == game.get('home_team') else 0,
                                    away_odds=outcome.get('price', 0) if outcome.get('name') == game.get('away_team') else 0,
                                    spread=None,
                                    total=None,
                                    timestamp=datetime.now()
                                ))
                            elif market_type == 'spreads':
                                odds_list.append(LiveOddsData(
                                    game_id=game_id,
                                    bookmaker=bookmaker,
                                    market_type='spread',
                                    home_odds=outcome.get('price', 0),
                                    away_odds=0,
                                    spread=outcome.get('point'),
                                    total=None,
                                    timestamp=datetime.now()
                                ))
                            elif market_type == 'totals':
                                odds_list.append(LiveOddsData(
                                    game_id=game_id,
                                    bookmaker=bookmaker,
                                    market_type='total',
                                    home_odds=outcome.get('price', 0),
                                    away_odds=0,
                                    spread=None,
                                    total=outcome.get('point'),
                                    timestamp=datetime.now()
                                ))
        
        except Exception as e:
            logger.error(f"Error parsing odds: {e}")
        
        return odds_list
    
    async def fetch_historical_odds(self, sport: str, days_back: int = 7) -> List[Dict]:
        """Fetch historical odds data"""
        await self._ensure_session()
        await self.rate_limiter.wait_if_needed()
        
        try:
            date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%dT%H:%M:%SZ')
            url = f"{self.base_url}/sports/{sport}/odds-history"
            params = {
                'apiKey': self.api_key,
                'regions': 'us',
                'markets': 'h2h,spreads,totals',
                'dateFormat': 'iso',
                'date': date
            }
            
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failed to fetch historical odds: {response.status}")
                    return []
        
        except Exception as e:
            logger.error(f"Error fetching historical odds: {e}")
            return []
    
    async def close(self):
        """Close the session"""
        if self.session:
            await self.session.close()


class LiveDataManager:
    """Manager for all live data sources"""
    
    def __init__(self):
        # Load API keys from environment
        self.sports_radar_key = os.getenv('SPORTS_RADAR_API_KEY', '') or os.getenv('NEXT_PUBLIC_SPORTRADAR_API_KEY', '')
        self.weather_api_key = os.getenv('WEATHER_API_KEY', '')
        self.odds_api_key = os.getenv('ODDS_API_KEY', '')
        
        # Initialize APIs
        self.sports_api = SportsRadarAPI(self.sports_radar_key) if self.sports_radar_key else None
        self.weather_api = OpenWeatherAPI(self.weather_api_key) if self.weather_api_key else None
        self.odds_api = TheOddsAPI(self.odds_api_key) if self.odds_api_key else None
        
        # Initialize Redis cache
        self.cache = self._init_cache()
        
        logger.info(f"Live Data Manager initialized - Sports: {bool(self.sports_api)}, Weather: {bool(self.weather_api)}, Odds: {bool(self.odds_api)}")
    
    def _init_cache(self):
        """Initialize Redis cache"""
        try:
            cache = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD', ''),
                decode_responses=False
            )
            cache.ping()
            return cache
        except:
            logger.warning("Redis not available, caching disabled")
            return None
    
    async def fetch_all_live_data(self, sport: str) -> Dict[str, Any]:
        """Fetch all live data for a sport"""
        results = {
            'sport': sport,
            'games': [],
            'odds': [],
            'weather': {},
            'timestamp': datetime.now().isoformat()
        }
        
        tasks = []
        
        # Fetch games
        if self.sports_api:
            tasks.append(self.sports_api.fetch_live_games(sport))
        
        # Fetch odds
        if self.odds_api:
            tasks.append(self.odds_api.fetch_odds(sport))
        
        # Execute all tasks concurrently
        if tasks:
            task_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for result in task_results:
                if isinstance(result, list):
                    if result and isinstance(result[0], LiveGameData):
                        results['games'] = [asdict(g) for g in result]
                    elif result and isinstance(result[0], LiveOddsData):
                        results['odds'] = [asdict(o) for o in result]
        
        # Cache results
        if self.cache:
            cache_key = f"live_data:{sport}:{datetime.now().strftime('%Y%m%d%H')}"
            self.cache.setex(cache_key, 300, pickle.dumps(results))  # 5 minute cache
        
        return results
    
    async def fetch_game_weather(self, lat: float, lon: float) -> Dict[str, Any]:
        """Fetch weather for a game location"""
        if not self.weather_api:
            return {}
        
        # Check cache first
        if self.cache:
            cache_key = f"weather:{lat}:{lon}:{datetime.now().strftime('%Y%m%d%H')}"
            cached = self.cache.get(cache_key)
            if cached:
                return pickle.loads(cached)
        
        weather = await self.weather_api.fetch_weather(lat, lon)
        
        # Cache result
        if self.cache and weather:
            cache_key = f"weather:{lat}:{lon}:{datetime.now().strftime('%Y%m%d%H')}"
            self.cache.setex(cache_key, 3600, pickle.dumps(weather))  # 1 hour cache
        
        return weather
    
    async def close(self):
        """Close all connections"""
        if self.sports_api:
            await self.sports_api.close()
        if self.weather_api:
            await self.weather_api.close()
        if self.odds_api:
            await self.odds_api.close()


# Singleton instance
_live_data_manager = None

def get_live_data_manager() -> LiveDataManager:
    """Get singleton live data manager"""
    global _live_data_manager
    if _live_data_manager is None:
        _live_data_manager = LiveDataManager()
    return _live_data_manager