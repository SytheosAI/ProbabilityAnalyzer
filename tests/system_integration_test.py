"""
Comprehensive System Integration Test
Verifies all components are connected and functional
"""

import os
import sys
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all our modules
from src.database.connection import get_db_manager
from src.data.live_data_integration import get_live_data_manager
from src.realtime.websocket_handler import get_websocket_handler
from src.ml.model_persistence import get_model_manager
from src.alerts.arbitrage_alert_system import get_alert_system
from src.sports.historical_odds_analyzer import HistoricalOddsAnalyzer
from src.sports.line_movement_tracker import LineMovementTracker
from src.sports.multi_bookmaker_comparison import MultiBookmakerComparison

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class SystemIntegrationTest:
    """Test all system components"""
    
    def __init__(self):
        self.results = {
            'database': False,
            'live_data': False,
            'websocket': False,
            'ml_persistence': False,
            'arbitrage_alerts': False,
            'historical_odds': False,
            'redis_cache': False,
            'api_endpoints': False
        }
        self.errors = []
    
    async def run_all_tests(self):
        """Run all integration tests"""
        logger.info("=" * 80)
        logger.info("PROBABILITY ANALYZER - SYSTEM INTEGRATION TEST")
        logger.info("=" * 80)
        
        # 1. Test database connectivity
        await self.test_database_connection()
        
        # 2. Test live data integration
        await self.test_live_data_apis()
        
        # 3. Test WebSocket handler
        await self.test_websocket_handler()
        
        # 4. Test ML model persistence
        await self.test_ml_persistence()
        
        # 5. Test arbitrage alert system
        await self.test_arbitrage_alerts()
        
        # 6. Test historical odds analyzer
        await self.test_historical_odds()
        
        # 7. Test Redis cache
        await self.test_redis_cache()
        
        # 8. Test API endpoints
        await self.test_api_endpoints()
        
        # Print summary
        self.print_summary()
    
    async def test_database_connection(self):
        """Test database connectivity and operations"""
        logger.info("\n1. TESTING DATABASE CONNECTION...")
        
        try:
            db = get_db_manager()
            
            # Test query
            result = db.execute_query("SELECT 1 as test")
            assert result[0]['test'] == 1
            
            # Test table existence
            tables_query = """
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
            """
            tables = db.execute_query(tables_query)
            
            logger.info(f"   ✓ Database connected successfully")
            logger.info(f"   ✓ Found {len(tables)} tables in database")
            
            # List tables
            for table in tables[:10]:  # Show first 10 tables
                logger.info(f"     - {table['table_name']}")
            
            self.results['database'] = True
            
        except Exception as e:
            logger.error(f"   ✗ Database connection failed: {e}")
            self.errors.append(f"Database: {str(e)}")
    
    async def test_live_data_apis(self):
        """Test live data API integrations"""
        logger.info("\n2. TESTING LIVE DATA APIS...")
        
        try:
            live_data = get_live_data_manager()
            
            # Check API configurations
            apis_configured = {
                'Sports Radar': bool(live_data.sports_api),
                'OpenWeather': bool(live_data.weather_api),
                'The Odds API': bool(live_data.odds_api)
            }
            
            for api, configured in apis_configured.items():
                if configured:
                    logger.info(f"   ✓ {api} configured and ready")
                else:
                    logger.warning(f"   ⚠ {api} not configured (missing API key)")
            
            # Test fetching live data for NFL
            if live_data.sports_api:
                try:
                    data = await live_data.fetch_all_live_data('nfl')
                    logger.info(f"   ✓ Fetched live NFL data successfully")
                    logger.info(f"     - Games: {len(data.get('games', []))}")
                    logger.info(f"     - Odds: {len(data.get('odds', []))}")
                except Exception as e:
                    logger.warning(f"   ⚠ Could not fetch live data: {e}")
            
            # Test weather API
            if live_data.weather_api:
                try:
                    weather = await live_data.fetch_game_weather(40.7128, -74.0060)  # NYC
                    logger.info(f"   ✓ Weather API working")
                    logger.info(f"     - Temperature: {weather.get('temperature')}°F")
                    logger.info(f"     - Conditions: {weather.get('conditions')}")
                except Exception as e:
                    logger.warning(f"   ⚠ Weather API error: {e}")
            
            self.results['live_data'] = any(apis_configured.values())
            
        except Exception as e:
            logger.error(f"   ✗ Live data integration failed: {e}")
            self.errors.append(f"Live Data: {str(e)}")
    
    async def test_websocket_handler(self):
        """Test WebSocket handler"""
        logger.info("\n3. TESTING WEBSOCKET HANDLER...")
        
        try:
            ws_handler = get_websocket_handler()
            
            # Check if Redis is available for pub/sub
            await ws_handler.initialize_redis()
            
            if ws_handler.redis_client:
                logger.info(f"   ✓ WebSocket handler initialized with Redis")
            else:
                logger.warning(f"   ⚠ WebSocket handler running without Redis")
            
            # Test sending a message (won't actually send without clients)
            test_data = {
                'test': True,
                'timestamp': datetime.now().isoformat()
            }
            
            await ws_handler.send_odds_update(test_data)
            logger.info(f"   ✓ WebSocket message send test successful")
            
            self.results['websocket'] = True
            
        except Exception as e:
            logger.error(f"   ✗ WebSocket handler test failed: {e}")
            self.errors.append(f"WebSocket: {str(e)}")
    
    async def test_ml_persistence(self):
        """Test ML model persistence"""
        logger.info("\n4. TESTING ML MODEL PERSISTENCE...")
        
        try:
            model_manager = get_model_manager()
            
            # List existing models
            models = model_manager.list_models()
            logger.info(f"   ✓ Model persistence manager initialized")
            logger.info(f"   ✓ Found {len(models)} models in registry")
            
            # Test saving a dummy model
            from sklearn.linear_model import LogisticRegression
            dummy_model = LogisticRegression()
            
            metadata = model_manager.save_sklearn_model(
                model=dummy_model,
                model_name='test_model',
                version='test_001',
                metrics={'accuracy': 0.95},
                description='Test model for integration testing'
            )
            
            logger.info(f"   ✓ Successfully saved test model")
            logger.info(f"     - Model ID: {metadata.model_id}")
            logger.info(f"     - Checksum: {metadata.checksum[:16]}...")
            
            # Test loading the model
            loaded_model, loaded_metadata = model_manager.load_sklearn_model('test_model', 'test_001')
            logger.info(f"   ✓ Successfully loaded test model")
            
            self.results['ml_persistence'] = True
            
        except Exception as e:
            logger.error(f"   ✗ ML persistence test failed: {e}")
            self.errors.append(f"ML Persistence: {str(e)}")
    
    async def test_arbitrage_alerts(self):
        """Test arbitrage alert system"""
        logger.info("\n5. TESTING ARBITRAGE ALERT SYSTEM...")
        
        try:
            alert_system = get_alert_system()
            
            logger.info(f"   ✓ Alert system initialized")
            logger.info(f"   ✓ Alert channels configured:")
            logger.info(f"     - Email: {alert_system.alert_config.email_enabled}")
            logger.info(f"     - SMS: {alert_system.alert_config.sms_enabled}")
            logger.info(f"     - WebSocket: {alert_system.alert_config.websocket_enabled}")
            
            # Get active opportunities
            opportunities = alert_system.get_active_opportunities()
            logger.info(f"   ✓ Active opportunities: {len(opportunities)}")
            
            self.results['arbitrage_alerts'] = True
            
        except Exception as e:
            logger.error(f"   ✗ Arbitrage alert test failed: {e}")
            self.errors.append(f"Arbitrage Alerts: {str(e)}")
    
    async def test_historical_odds(self):
        """Test historical odds analyzer"""
        logger.info("\n6. TESTING HISTORICAL ODDS ANALYZER...")
        
        try:
            config = {
                'odds_api_key': os.getenv('ODDS_API_KEY', ''),
                'sports_radar_key': os.getenv('SPORTS_RADAR_API_KEY', '')
            }
            
            analyzer = HistoricalOddsAnalyzer(config)
            
            logger.info(f"   ✓ Historical odds analyzer initialized")
            
            # Test pattern analysis (using existing data)
            patterns = analyzer.analyze_betting_patterns('nfl', lookback_days=30)
            logger.info(f"   ✓ Found {len(patterns)} betting patterns")
            
            for pattern in patterns[:3]:  # Show first 3 patterns
                logger.info(f"     - {pattern.pattern_type}: {pattern.confidence:.2%} confidence, {pattern.avg_roi:.2f}% ROI")
            
            self.results['historical_odds'] = True
            
        except Exception as e:
            logger.error(f"   ✗ Historical odds test failed: {e}")
            self.errors.append(f"Historical Odds: {str(e)}")
    
    async def test_redis_cache(self):
        """Test Redis cache connectivity"""
        logger.info("\n7. TESTING REDIS CACHE...")
        
        try:
            import redis
            
            r = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD', ''),
                decode_responses=True
            )
            
            # Test connection
            r.ping()
            logger.info(f"   ✓ Redis connected successfully")
            
            # Test set/get
            test_key = 'test:integration'
            test_value = json.dumps({'test': True, 'timestamp': datetime.now().isoformat()})
            r.setex(test_key, 60, test_value)
            retrieved = r.get(test_key)
            
            assert retrieved == test_value
            logger.info(f"   ✓ Redis cache operations working")
            
            # Clean up
            r.delete(test_key)
            
            self.results['redis_cache'] = True
            
        except Exception as e:
            logger.warning(f"   ⚠ Redis cache not available: {e}")
            self.results['redis_cache'] = False
    
    async def test_api_endpoints(self):
        """Test API endpoints"""
        logger.info("\n8. TESTING API ENDPOINTS...")
        
        try:
            # Import API handler
            from api.main import async_handler
            
            # Create mock request/response objects
            class MockRequest:
                def __init__(self, method='GET', body=None, path='/'):
                    self.method = method
                    self.body = body or '{}'
                    self.path = path
            
            class MockResponse:
                def __init__(self):
                    self.status_code = None
                    self.headers = {}
            
            # Test health check
            request = MockRequest('GET')
            response = MockResponse()
            
            result = await async_handler(request, response)
            result_data = json.loads(result)
            
            assert result_data['success'] == True
            logger.info(f"   ✓ Health check endpoint working")
            logger.info(f"   ✓ API version: {result_data.get('version')}")
            logger.info(f"   ✓ Available endpoints: {len(result_data.get('endpoints', {}))}")
            
            # List some endpoints
            for endpoint, description in list(result_data.get('endpoints', {}).items())[:5]:
                logger.info(f"     - {endpoint}: {description}")
            
            self.results['api_endpoints'] = True
            
        except Exception as e:
            logger.error(f"   ✗ API endpoint test failed: {e}")
            self.errors.append(f"API Endpoints: {str(e)}")
    
    def print_summary(self):
        """Print test summary"""
        logger.info("\n" + "=" * 80)
        logger.info("INTEGRATION TEST SUMMARY")
        logger.info("=" * 80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for v in self.results.values() if v)
        
        for component, passed in self.results.items():
            status = "✓ PASS" if passed else "✗ FAIL"
            logger.info(f"{component.ljust(20)}: {status}")
        
        logger.info("-" * 80)
        logger.info(f"TOTAL: {passed_tests}/{total_tests} tests passed")
        
        if self.errors:
            logger.info("\nERRORS ENCOUNTERED:")
            for error in self.errors:
                logger.error(f"  - {error}")
        
        if passed_tests == total_tests:
            logger.info("\n🎉 ALL SYSTEMS OPERATIONAL! 🎉")
            logger.info("The Probability Analyzer is fully connected and ready for production!")
        else:
            logger.warning(f"\n⚠ {total_tests - passed_tests} components need attention")
            logger.info("Please check the errors above and ensure all API keys are configured in .env")


async def main():
    """Run the integration test"""
    tester = SystemIntegrationTest()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())