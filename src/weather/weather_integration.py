import requests
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import logging
import time
from functools import lru_cache
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

class WeatherIntegration:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.api_key = os.getenv('WEATHER_API_KEY', config.get('api_key', ''))
        self.base_url = config.get('base_url', 'https://api.openweathermap.org/data/2.5')
        self.historical_url = config.get('historical_url', 'https://api.openweathermap.org/data/3.0/onecall/timemachine')
        self.update_interval = config.get('update_interval', 3600)
        self.cache_duration = config.get('cache_duration', 86400)
        
        self.cache_dir = Path('./data/weather_cache')
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        
        self.weather_cache = {}
        self.last_update = {}
        
    def fetch_current_weather(self, location: Dict[str, float]) -> Dict[str, Any]:
        lat, lon = location['lat'], location['lon']
        cache_key = f"current_{lat}_{lon}"
        
        if self._is_cache_valid(cache_key):
            return self.weather_cache[cache_key]
        
        url = f"{self.base_url}/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            processed_data = self._process_weather_data(data)
            
            self.weather_cache[cache_key] = processed_data
            self.last_update[cache_key] = datetime.now()
            
            self._save_to_cache(cache_key, processed_data)
            
            return processed_data
            
        except requests.RequestException as e:
            logger.error(f"Error fetching weather data: {e}")
            return self._get_fallback_weather_data()
    
    def fetch_historical_weather(self,
                                location: Dict[str, float],
                                date: datetime) -> Dict[str, Any]:
        lat, lon = location['lat'], location['lon']
        timestamp = int(date.timestamp())
        cache_key = f"historical_{lat}_{lon}_{timestamp}"
        
        cached_data = self._load_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        url = self.historical_url
        params = {
            'lat': lat,
            'lon': lon,
            'dt': timestamp,
            'appid': self.api_key,
            'units': 'metric'
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            processed_data = self._process_historical_data(data)
            
            self._save_to_cache(cache_key, processed_data)
            
            return processed_data
            
        except requests.RequestException as e:
            logger.error(f"Error fetching historical weather: {e}")
            return self._get_fallback_weather_data()
    
    def fetch_forecast(self,
                      location: Dict[str, float],
                      days: int = 5) -> List[Dict[str, Any]]:
        lat, lon = location['lat'], location['lon']
        cache_key = f"forecast_{lat}_{lon}_{days}"
        
        if self._is_cache_valid(cache_key):
            return self.weather_cache[cache_key]
        
        url = f"{self.base_url}/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric',
            'cnt': days * 8
        }
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            forecast_data = self._process_forecast_data(data)
            
            self.weather_cache[cache_key] = forecast_data
            self.last_update[cache_key] = datetime.now()
            
            return forecast_data
            
        except requests.RequestException as e:
            logger.error(f"Error fetching forecast: {e}")
            return []
    
    async def fetch_multiple_locations_async(self,
                                           locations: List[Dict[str, float]]) -> List[Dict[str, Any]]:
        async with aiohttp.ClientSession() as session:
            tasks = [self._fetch_weather_async(session, loc) for loc in locations]
            results = await asyncio.gather(*tasks)
            return results
    
    def analyze_weather_impact(self,
                              weather_data: Dict[str, Any],
                              target_metric: str) -> Dict[str, float]:
        temp = weather_data.get('temperature', 20)
        humidity = weather_data.get('humidity', 50)
        pressure = weather_data.get('pressure', 1013)
        wind_speed = weather_data.get('wind_speed', 0)
        precipitation = weather_data.get('precipitation', 0)
        
        impacts = {
            'temperature_impact': self._calculate_temperature_impact(temp, target_metric),
            'humidity_impact': self._calculate_humidity_impact(humidity, target_metric),
            'pressure_impact': self._calculate_pressure_impact(pressure, target_metric),
            'wind_impact': self._calculate_wind_impact(wind_speed, target_metric),
            'precipitation_impact': self._calculate_precipitation_impact(precipitation, target_metric),
            'combined_impact': 0.0
        }
        
        weights = {
            'temperature_impact': 0.3,
            'humidity_impact': 0.2,
            'pressure_impact': 0.15,
            'wind_impact': 0.15,
            'precipitation_impact': 0.2
        }
        
        impacts['combined_impact'] = sum(
            impacts[key] * weights.get(key, 0)
            for key in impacts if key != 'combined_impact'
        )
        
        return impacts
    
    def create_weather_features(self,
                               weather_data: Dict[str, Any]) -> np.ndarray:
        features = []
        
        features.append(weather_data.get('temperature', 0))
        features.append(weather_data.get('feels_like', 0))
        features.append(weather_data.get('humidity', 0))
        features.append(weather_data.get('pressure', 0))
        features.append(weather_data.get('wind_speed', 0))
        features.append(weather_data.get('wind_direction', 0))
        features.append(weather_data.get('clouds', 0))
        features.append(weather_data.get('precipitation', 0))
        features.append(weather_data.get('uv_index', 0))
        features.append(weather_data.get('visibility', 0))
        
        hour = datetime.fromtimestamp(weather_data.get('timestamp', 0)).hour
        features.append(np.sin(2 * np.pi * hour / 24))
        features.append(np.cos(2 * np.pi * hour / 24))
        
        month = datetime.fromtimestamp(weather_data.get('timestamp', 0)).month
        features.append(np.sin(2 * np.pi * month / 12))
        features.append(np.cos(2 * np.pi * month / 12))
        
        return np.array(features)
    
    def correlate_with_events(self,
                            weather_history: List[Dict[str, Any]],
                            event_history: List[Dict[str, Any]]) -> Dict[str, float]:
        if not weather_history or not event_history:
            return {}
        
        weather_df = pd.DataFrame(weather_history)
        event_df = pd.DataFrame(event_history)
        
        weather_features = ['temperature', 'humidity', 'pressure', 'wind_speed']
        event_features = list(event_df.select_dtypes(include=[np.number]).columns)
        
        correlations = {}
        
        for weather_feat in weather_features:
            if weather_feat in weather_df.columns:
                for event_feat in event_features:
                    corr_key = f"{weather_feat}_vs_{event_feat}"
                    correlations[corr_key] = weather_df[weather_feat].corr(event_df[event_feat])
        
        return correlations
    
    def generate_weather_scenarios(self,
                                  base_weather: Dict[str, Any],
                                  n_scenarios: int = 100) -> List[Dict[str, Any]]:
        scenarios = []
        
        for _ in range(n_scenarios):
            scenario = base_weather.copy()
            
            scenario['temperature'] += np.random.normal(0, 5)
            scenario['humidity'] = np.clip(scenario['humidity'] + np.random.normal(0, 10), 0, 100)
            scenario['pressure'] += np.random.normal(0, 10)
            scenario['wind_speed'] = max(0, scenario['wind_speed'] + np.random.normal(0, 3))
            
            scenarios.append(scenario)
        
        return scenarios
    
    def _process_weather_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            'temperature': raw_data['main']['temp'],
            'feels_like': raw_data['main']['feels_like'],
            'humidity': raw_data['main']['humidity'],
            'pressure': raw_data['main']['pressure'],
            'wind_speed': raw_data['wind']['speed'],
            'wind_direction': raw_data['wind'].get('deg', 0),
            'clouds': raw_data['clouds']['all'],
            'precipitation': raw_data.get('rain', {}).get('1h', 0) + raw_data.get('snow', {}).get('1h', 0),
            'weather_condition': raw_data['weather'][0]['main'],
            'weather_description': raw_data['weather'][0]['description'],
            'visibility': raw_data.get('visibility', 10000),
            'uv_index': raw_data.get('uvi', 0),
            'timestamp': raw_data['dt'],
            'location': {
                'lat': raw_data['coord']['lat'],
                'lon': raw_data['coord']['lon'],
                'name': raw_data.get('name', 'Unknown')
            }
        }
    
    def _process_historical_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        if 'data' in raw_data and len(raw_data['data']) > 0:
            data_point = raw_data['data'][0]
            return {
                'temperature': data_point['temp'],
                'feels_like': data_point['feels_like'],
                'humidity': data_point['humidity'],
                'pressure': data_point['pressure'],
                'wind_speed': data_point['wind_speed'],
                'wind_direction': data_point.get('wind_deg', 0),
                'clouds': data_point['clouds'],
                'precipitation': data_point.get('rain', {}).get('1h', 0) + data_point.get('snow', {}).get('1h', 0),
                'weather_condition': data_point['weather'][0]['main'],
                'weather_description': data_point['weather'][0]['description'],
                'visibility': data_point.get('visibility', 10000),
                'uv_index': data_point.get('uvi', 0),
                'timestamp': data_point['dt']
            }
        return self._get_fallback_weather_data()
    
    def _process_forecast_data(self, raw_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        forecast_list = []
        
        for item in raw_data.get('list', []):
            forecast_list.append({
                'temperature': item['main']['temp'],
                'feels_like': item['main']['feels_like'],
                'humidity': item['main']['humidity'],
                'pressure': item['main']['pressure'],
                'wind_speed': item['wind']['speed'],
                'wind_direction': item['wind'].get('deg', 0),
                'clouds': item['clouds']['all'],
                'precipitation': item.get('rain', {}).get('3h', 0) + item.get('snow', {}).get('3h', 0),
                'weather_condition': item['weather'][0]['main'],
                'weather_description': item['weather'][0]['description'],
                'timestamp': item['dt'],
                'dt_txt': item['dt_txt']
            })
        
        return forecast_list
    
    async def _fetch_weather_async(self,
                                  session: aiohttp.ClientSession,
                                  location: Dict[str, float]) -> Dict[str, Any]:
        url = f"{self.base_url}/weather"
        params = {
            'lat': location['lat'],
            'lon': location['lon'],
            'appid': self.api_key,
            'units': 'metric'
        }
        
        try:
            async with session.get(url, params=params) as response:
                data = await response.json()
                return self._process_weather_data(data)
        except Exception as e:
            logger.error(f"Async fetch error: {e}")
            return self._get_fallback_weather_data()
    
    def _calculate_temperature_impact(self, temp: float, target_metric: str) -> float:
        optimal_temp = 20.0
        deviation = abs(temp - optimal_temp)
        impact = 1.0 / (1.0 + 0.01 * deviation ** 2)
        return impact
    
    def _calculate_humidity_impact(self, humidity: float, target_metric: str) -> float:
        optimal_humidity = 50.0
        deviation = abs(humidity - optimal_humidity)
        impact = 1.0 / (1.0 + 0.001 * deviation ** 2)
        return impact
    
    def _calculate_pressure_impact(self, pressure: float, target_metric: str) -> float:
        normal_pressure = 1013.25
        deviation = abs(pressure - normal_pressure)
        impact = 1.0 / (1.0 + 0.0001 * deviation ** 2)
        return impact
    
    def _calculate_wind_impact(self, wind_speed: float, target_metric: str) -> float:
        impact = 1.0 / (1.0 + 0.05 * wind_speed ** 2)
        return impact
    
    def _calculate_precipitation_impact(self, precipitation: float, target_metric: str) -> float:
        impact = 1.0 / (1.0 + 0.1 * precipitation)
        return impact
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key not in self.last_update:
            return False
        
        time_diff = (datetime.now() - self.last_update[cache_key]).total_seconds()
        return time_diff < self.cache_duration
    
    def _save_to_cache(self, key: str, data: Any) -> None:
        cache_file = self.cache_dir / f"{key}.json"
        with open(cache_file, 'w') as f:
            json.dump(data, f)
    
    def _load_from_cache(self, key: str) -> Optional[Dict[str, Any]]:
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            with open(cache_file, 'r') as f:
                return json.load(f)
        return None
    
    def _get_fallback_weather_data(self) -> Dict[str, Any]:
        return {
            'temperature': 20.0,
            'feels_like': 20.0,
            'humidity': 50.0,
            'pressure': 1013.25,
            'wind_speed': 5.0,
            'wind_direction': 0,
            'clouds': 50,
            'precipitation': 0,
            'weather_condition': 'Clear',
            'weather_description': 'clear sky',
            'visibility': 10000,
            'uv_index': 5,
            'timestamp': int(datetime.now().timestamp())
        }