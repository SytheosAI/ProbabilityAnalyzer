"""
Sports data integration module for connecting to various sports APIs and data sources
"""
import asyncio
import aiohttp
import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
from datetime import datetime, timedelta
import json
import logging
from pathlib import Path
import redis
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

logger = logging.getLogger(__name__)

Base = declarative_base()

class SportsDatabaseCache(Base):
    __tablename__ = 'sports_cache'
    
    cache_key = Column(String, primary_key=True)
    data = Column(JSON)
    timestamp = Column(DateTime)
    sport = Column(String)
    data_type = Column(String)

class SportsDataIntegration:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_keys = config.get('api_keys', {})
        self.cache_ttl = config.get('cache_ttl', 3600)
        self.rate_limits = config.get('rate_limits', {})
        
        # Initialize database connection
        self.db_engine = create_engine(config.get('database_url', 'sqlite:///sports_data.db'))
        Base.metadata.create_all(self.db_engine)
        self.Session = sessionmaker(bind=self.db_engine)
        
        # Initialize Redis cache
        self.redis_client = redis.Redis(
            host=config.get('redis_host', 'localhost'),
            port=config.get('redis_port', 6379),
            decode_responses=True
        )
        
        # API endpoints
        self.api_endpoints = {
            'odds_api': {
                'base_url': 'https://api.the-odds-api.com/v4',
                'endpoints': {
                    'sports': '/sports',
                    'odds': '/sports/{sport}/odds',
                    'scores': '/sports/{sport}/scores',
                    'events': '/sports/{sport}/events'
                }
            },
            'sportsdata_io': {
                'base_url': 'https://api.sportsdata.io/v3',
                'endpoints': {
                    'nfl_scores': '/nfl/scores/json/Scores/{season}/{week}',
                    'nba_games': '/nba/scores/json/Games/{date}',
                    'mlb_games': '/mlb/scores/json/Games/{date}',
                    'nfl_injuries': '/nfl/scores/json/Injuries/{season}/{week}',
                    'nba_injuries': '/nba/scores/json/Injuries',
                    'player_stats': '/{sport}/stats/json/PlayerGameStatsByDate/{date}'
                }
            },
            'espn': {
                'base_url': 'https://site.api.espn.com/apis/site/v2/sports',
                'endpoints': {
                    'scoreboard': '/{sport}/{league}/scoreboard',
                    'teams': '/{sport}/{league}/teams',
                    'standings': '/{sport}/{league}/standings',
                    'news': '/{sport}/{league}/news'
                }
            },
            'action_network': {
                'base_url': 'https://api.actionnetwork.com/web/v1',
                'endpoints': {
                    'games': '/games',
                    'odds': '/odds',
                    'public_betting': '/public',
                    'sharp_report': '/sharp'
                }
            },
            'weather': {
                'base_url': 'https://api.weatherapi.com/v1',
                'endpoints': {
                    'current': '/current.json',
                    'forecast': '/forecast.json',
                    'history': '/history.json'
                }
            },
            'statmuse': {
                'base_url': 'https://api.statmuse.com/v1',
                'endpoints': {
                    'query': '/query'
                }
            }
        }
    
    async def fetch_game_odds(self, sport: str, bookmakers: List[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch current odds from multiple bookmakers
        """
        cache_key = f"odds_{sport}_{datetime.now().strftime('%Y%m%d')}"
        
        # Check cache first
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        async with aiohttp.ClientSession() as session:
            url = self.api_endpoints['odds_api']['base_url'] + \
                  self.api_endpoints['odds_api']['endpoints']['odds'].format(sport=sport)
            
            params = {
                'apiKey': self.api_keys.get('odds_api'),
                'regions': 'us',
                'markets': 'h2h,spreads,totals',
                'bookmakers': ','.join(bookmakers) if bookmakers else None
            }
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        processed_odds = self._process_odds_data(data)
                        self._save_to_cache(cache_key, processed_odds)
                        return processed_odds
                    else:
                        logger.error(f"Failed to fetch odds: {response.status}")
                        return []
            except Exception as e:
                logger.error(f"Error fetching odds: {e}")
                return []
    
    async def fetch_team_stats(self, sport: str, team_id: str, 
                              season: Optional[str] = None) -> Dict[str, Any]:
        """
        Fetch comprehensive team statistics
        """
        cache_key = f"team_stats_{sport}_{team_id}_{season or 'current'}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        # Aggregate data from multiple sources
        stats = {}
        
        # ESPN data
        espn_stats = await self._fetch_espn_team_stats(sport, team_id)
        stats['espn'] = espn_stats
        
        # SportsData.io data
        if sport in ['nfl', 'nba', 'mlb']:
            sportsdata_stats = await self._fetch_sportsdata_team_stats(sport, team_id, season)
            stats['sportsdata'] = sportsdata_stats
        
        # Combine and normalize
        combined_stats = self._normalize_team_stats(stats)
        
        self._save_to_cache(cache_key, combined_stats)
        return combined_stats
    
    async def fetch_player_stats(self, sport: str, player_id: str, 
                                last_n_games: int = 10) -> Dict[str, Any]:
        """
        Fetch player statistics and recent performance
        """
        cache_key = f"player_stats_{sport}_{player_id}_{last_n_games}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        async with aiohttp.ClientSession() as session:
            # This would fetch from appropriate API based on sport
            player_data = {
                'player_id': player_id,
                'recent_games': [],
                'season_averages': {},
                'splits': {},
                'trends': {}
            }
            
            # Fetch recent games
            recent_games = await self._fetch_recent_player_games(session, sport, player_id, last_n_games)
            player_data['recent_games'] = recent_games
            
            # Calculate statistics
            if recent_games:
                player_data['season_averages'] = self._calculate_player_averages(recent_games)
                player_data['splits'] = self._calculate_player_splits(recent_games)
                player_data['trends'] = self._analyze_player_trends(recent_games)
            
            self._save_to_cache(cache_key, player_data)
            return player_data
    
    async def fetch_injuries(self, sport: str, team_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetch current injury reports
        """
        cache_key = f"injuries_{sport}_{team_id or 'all'}_{datetime.now().strftime('%Y%m%d')}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        injuries = []
        
        async with aiohttp.ClientSession() as session:
            if sport == 'nfl':
                url = self.api_endpoints['sportsdata_io']['base_url'] + \
                      self.api_endpoints['sportsdata_io']['endpoints']['nfl_injuries']
                # Add appropriate parameters
            elif sport == 'nba':
                url = self.api_endpoints['sportsdata_io']['base_url'] + \
                      self.api_endpoints['sportsdata_io']['endpoints']['nba_injuries']
            
            # Fetch and process injury data
            # This would include proper API calls with authentication
            
        self._save_to_cache(cache_key, injuries)
        return injuries
    
    async def fetch_weather_for_game(self, venue: str, game_time: datetime) -> Dict[str, Any]:
        """
        Fetch weather conditions for outdoor venues
        """
        cache_key = f"weather_{venue}_{game_time.strftime('%Y%m%d%H')}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        # Get venue coordinates
        venue_coords = self._get_venue_coordinates(venue)
        if not venue_coords:
            return {}
        
        async with aiohttp.ClientSession() as session:
            url = self.api_endpoints['weather']['base_url'] + \
                  self.api_endpoints['weather']['endpoints']['forecast']
            
            params = {
                'key': self.api_keys.get('weather_api'),
                'q': f"{venue_coords['lat']},{venue_coords['lon']}",
                'dt': game_time.strftime('%Y-%m-%d')
            }
            
            try:
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        weather_data = self._process_weather_data(data, game_time)
                        self._save_to_cache(cache_key, weather_data)
                        return weather_data
            except Exception as e:
                logger.error(f"Error fetching weather: {e}")
                return {}
    
    async def fetch_public_betting_data(self, game_id: str) -> Dict[str, Any]:
        """
        Fetch public betting percentages and sharp money indicators
        """
        cache_key = f"betting_{game_id}_{datetime.now().strftime('%Y%m%d%H')}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        betting_data = {
            'public_percentage': {},
            'money_percentage': {},
            'sharp_action': {},
            'line_movement': [],
            'steam_moves': []
        }
        
        # This would fetch from Action Network or similar service
        # Includes public betting percentages, sharp reports, line movement
        
        self._save_to_cache(cache_key, betting_data, ttl=600)  # Shorter TTL for betting data
        return betting_data
    
    async def fetch_historical_matchups(self, team1_id: str, team2_id: str, 
                                       last_n_games: int = 10) -> Dict[str, Any]:
        """
        Fetch historical head-to-head matchup data
        """
        cache_key = f"h2h_{team1_id}_{team2_id}_{last_n_games}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        matchup_data = {
            'games': [],
            'team1_wins': 0,
            'team2_wins': 0,
            'avg_total': 0,
            'avg_margin': 0,
            'ats_records': {},
            'ou_records': {},
            'trends': []
        }
        
        # Fetch historical games between teams
        # Calculate various statistics and trends
        
        self._save_to_cache(cache_key, matchup_data)
        return matchup_data
    
    async def fetch_advanced_metrics(self, sport: str, team_id: str) -> Dict[str, Any]:
        """
        Fetch advanced analytics metrics (efficiency, pace, etc.)
        """
        cache_key = f"advanced_{sport}_{team_id}_{datetime.now().strftime('%Y%m%d')}"
        
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        metrics = {}
        
        if sport == 'nba':
            metrics = {
                'offensive_rating': 0,
                'defensive_rating': 0,
                'net_rating': 0,
                'pace': 0,
                'true_shooting': 0,
                'effective_fg': 0,
                'turnover_rate': 0,
                'offensive_rebound_rate': 0,
                'free_throw_rate': 0
            }
        elif sport == 'nfl':
            metrics = {
                'dvoa': 0,  # Defense-adjusted Value Over Average
                'offensive_dvoa': 0,
                'defensive_dvoa': 0,
                'special_teams_dvoa': 0,
                'weighted_dvoa': 0,
                'success_rate': 0,
                'explosive_play_rate': 0,
                'stuff_rate': 0,
                'pressure_rate': 0
            }
        
        # Fetch and calculate advanced metrics
        
        self._save_to_cache(cache_key, metrics)
        return metrics
    
    def _process_odds_data(self, raw_data: List[Dict]) -> List[Dict[str, Any]]:
        """
        Process and normalize odds data from API
        """
        processed = []
        
        for game in raw_data:
            game_odds = {
                'game_id': game.get('id'),
                'home_team': game.get('home_team'),
                'away_team': game.get('away_team'),
                'commence_time': game.get('commence_time'),
                'bookmakers': {}
            }
            
            for bookmaker in game.get('bookmakers', []):
                book_name = bookmaker.get('key')
                game_odds['bookmakers'][book_name] = {
                    'h2h': self._extract_h2h_odds(bookmaker),
                    'spreads': self._extract_spread_odds(bookmaker),
                    'totals': self._extract_total_odds(bookmaker)
                }
            
            processed.append(game_odds)
        
        return processed
    
    def _extract_h2h_odds(self, bookmaker: Dict) -> Dict:
        """Extract head-to-head (moneyline) odds"""
        h2h_market = next((m for m in bookmaker.get('markets', []) if m['key'] == 'h2h'), None)
        if not h2h_market:
            return {}
        
        odds = {}
        for outcome in h2h_market.get('outcomes', []):
            odds[outcome['name']] = outcome['price']
        
        return odds
    
    def _extract_spread_odds(self, bookmaker: Dict) -> Dict:
        """Extract spread odds"""
        spread_market = next((m for m in bookmaker.get('markets', []) if m['key'] == 'spreads'), None)
        if not spread_market:
            return {}
        
        spreads = {}
        for outcome in spread_market.get('outcomes', []):
            spreads[outcome['name']] = {
                'spread': outcome.get('point'),
                'odds': outcome['price']
            }
        
        return spreads
    
    def _extract_total_odds(self, bookmaker: Dict) -> Dict:
        """Extract total (over/under) odds"""
        total_market = next((m for m in bookmaker.get('markets', []) if m['key'] == 'totals'), None)
        if not total_market:
            return {}
        
        totals = {}
        for outcome in total_market.get('outcomes', []):
            totals[outcome['name']] = {
                'total': outcome.get('point'),
                'odds': outcome['price']
            }
        
        return totals
    
    def _normalize_team_stats(self, stats_dict: Dict) -> Dict[str, Any]:
        """
        Normalize team statistics from multiple sources
        """
        normalized = {
            'offensive_metrics': {},
            'defensive_metrics': {},
            'recent_form': {},
            'home_away_splits': {},
            'situational_stats': {}
        }
        
        # Combine data from different sources
        # Weight more recent and reliable sources higher
        
        return normalized
    
    def _calculate_player_averages(self, games: List[Dict]) -> Dict[str, float]:
        """
        Calculate player statistical averages
        """
        if not games:
            return {}
        
        stats_sum = {}
        for game in games:
            for stat, value in game.get('stats', {}).items():
                if stat not in stats_sum:
                    stats_sum[stat] = 0
                stats_sum[stat] += value
        
        averages = {stat: total / len(games) for stat, total in stats_sum.items()}
        return averages
    
    def _calculate_player_splits(self, games: List[Dict]) -> Dict[str, Any]:
        """
        Calculate player performance splits (home/away, vs teams, etc.)
        """
        splits = {
            'home': {'games': [], 'averages': {}},
            'away': {'games': [], 'averages': {}},
            'wins': {'games': [], 'averages': {}},
            'losses': {'games': [], 'averages': {}}
        }
        
        for game in games:
            if game.get('home'):
                splits['home']['games'].append(game)
            else:
                splits['away']['games'].append(game)
            
            if game.get('result') == 'W':
                splits['wins']['games'].append(game)
            else:
                splits['losses']['games'].append(game)
        
        # Calculate averages for each split
        for split_type in splits:
            if splits[split_type]['games']:
                splits[split_type]['averages'] = self._calculate_player_averages(
                    splits[split_type]['games']
                )
        
        return splits
    
    def _analyze_player_trends(self, games: List[Dict]) -> Dict[str, Any]:
        """
        Analyze player performance trends
        """
        if len(games) < 3:
            return {}
        
        trends = {
            'momentum': 'neutral',
            'consistency': 0,
            'recent_vs_season': {}
        }
        
        # Recent games (last 3-5)
        recent_games = games[-5:]
        recent_avg = self._calculate_player_averages(recent_games)
        
        # Season averages
        season_avg = self._calculate_player_averages(games)
        
        # Compare recent to season
        for stat in recent_avg:
            if stat in season_avg:
                diff_pct = ((recent_avg[stat] - season_avg[stat]) / season_avg[stat]) * 100 if season_avg[stat] > 0 else 0
                trends['recent_vs_season'][stat] = diff_pct
        
        # Determine momentum
        if len(trends['recent_vs_season']) > 0:
            avg_diff = np.mean(list(trends['recent_vs_season'].values()))
            if avg_diff > 10:
                trends['momentum'] = 'hot'
            elif avg_diff < -10:
                trends['momentum'] = 'cold'
        
        return trends
    
    def _get_venue_coordinates(self, venue: str) -> Optional[Dict[str, float]]:
        """
        Get latitude/longitude for a venue
        """
        # This would typically query a database of venue locations
        venue_coords = {
            'Lambeau Field': {'lat': 44.5013, 'lon': -88.0622},
            'Soldier Field': {'lat': 41.8623, 'lon': -87.6167},
            # Add more venues
        }
        
        return venue_coords.get(venue)
    
    def _process_weather_data(self, data: Dict, game_time: datetime) -> Dict[str, Any]:
        """
        Process weather data for game time
        """
        processed = {
            'temperature': 0,
            'feels_like': 0,
            'wind_speed': 0,
            'wind_direction': '',
            'precipitation': 0,
            'humidity': 0,
            'visibility': 0,
            'conditions': ''
        }
        
        # Extract weather for specific game time
        # Process forecast data to get conditions at game time
        
        return processed
    
    def _get_from_cache(self, key: str) -> Optional[Any]:
        """
        Get data from cache (Redis first, then database)
        """
        # Try Redis first
        redis_data = self.redis_client.get(key)
        if redis_data:
            return json.loads(redis_data)
        
        # Try database cache
        session = self.Session()
        try:
            cache_entry = session.query(SportsDatabaseCache).filter_by(cache_key=key).first()
            if cache_entry:
                if (datetime.now() - cache_entry.timestamp).seconds < self.cache_ttl:
                    return cache_entry.data
        finally:
            session.close()
        
        return None
    
    def _save_to_cache(self, key: str, data: Any, ttl: Optional[int] = None):
        """
        Save data to cache
        """
        ttl = ttl or self.cache_ttl
        
        # Save to Redis
        self.redis_client.setex(key, ttl, json.dumps(data))
        
        # Save to database
        session = self.Session()
        try:
            cache_entry = session.query(SportsDatabaseCache).filter_by(cache_key=key).first()
            if cache_entry:
                cache_entry.data = data
                cache_entry.timestamp = datetime.now()
            else:
                cache_entry = SportsDatabaseCache(
                    cache_key=key,
                    data=data,
                    timestamp=datetime.now()
                )
                session.add(cache_entry)
            session.commit()
        finally:
            session.close()
    
    async def _fetch_espn_team_stats(self, sport: str, team_id: str) -> Dict[str, Any]:
        """Fetch team stats from ESPN API"""
        # Implementation would go here
        return {}
    
    async def _fetch_sportsdata_team_stats(self, sport: str, team_id: str, season: str) -> Dict[str, Any]:
        """Fetch team stats from SportsData.io"""
        # Implementation would go here
        return {}
    
    async def _fetch_recent_player_games(self, session: aiohttp.ClientSession, 
                                        sport: str, player_id: str, n_games: int) -> List[Dict]:
        """Fetch recent player game logs"""
        # Implementation would go here
        return []