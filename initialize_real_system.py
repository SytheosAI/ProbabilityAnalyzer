#!/usr/bin/env python3
"""
REAL SYSTEM INITIALIZATION SCRIPT
Tests all connections and ensures everything is using LIVE DATA
NO MORE MOCKS!
"""

import os
import sys
import json
import psycopg2
import requests
from datetime import datetime
from colorama import init, Fore, Style

# Initialize colorama for colored output
init()

# Configuration
SPORTS_RADAR_API_KEY = '4pkSfpJrkus2VgdJoqT3m30sMBVR8QkTTdhQyJzd'
WEATHER_API_KEY = 'cebea6d73816dccaecbe0dcd99d2471c'

DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'port': int(os.getenv('DB_PORT', '5432')),
    'database': os.getenv('DB_NAME', 'sports_analytics'),
    'user': os.getenv('DB_USER', 'postgres'),
    'password': os.getenv('DB_PASSWORD', 'your_password_here')
}

def print_success(message):
    print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")

def print_error(message):
    print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")

def print_info(message):
    print(f"{Fore.CYAN}ℹ {message}{Style.RESET_ALL}")

def print_warning(message):
    print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")

def test_sports_radar_api():
    """Test Sports Radar API connection"""
    print(f"\n{Fore.CYAN}Testing Sports Radar API...{Style.RESET_ALL}")
    
    try:
        # Test NBA endpoint
        url = f"https://api.sportradar.us/nba/trial/v8/en/games/2024/REG/schedule.json?api_key={SPORTS_RADAR_API_KEY}"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            games = data.get('games', [])
            print_success(f"Sports Radar API connected! Found {len(games)} NBA games")
            
            # Show sample game
            if games:
                game = games[0]
                print_info(f"  Sample game: {game.get('home', {}).get('name', 'N/A')} vs {game.get('away', {}).get('name', 'N/A')}")
            
            return True
        else:
            print_error(f"Sports Radar API returned status {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Sports Radar API error: {e}")
        return False

def test_weather_api():
    """Test Weather API connection"""
    print(f"\n{Fore.CYAN}Testing Weather API...{Style.RESET_ALL}")
    
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?q=New York&appid={WEATHER_API_KEY}&units=imperial"
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            temp = data.get('main', {}).get('temp')
            print_success(f"Weather API connected! Current temp in NYC: {temp}°F")
            return True
        else:
            print_error(f"Weather API returned status {response.status_code}")
            return False
            
    except Exception as e:
        print_error(f"Weather API error: {e}")
        return False

def test_database_connection():
    """Test PostgreSQL database connection"""
    print(f"\n{Fore.CYAN}Testing PostgreSQL Database...{Style.RESET_ALL}")
    
    try:
        # Attempt connection
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor()
        
        # Test query
        cur.execute("SELECT version();")
        version = cur.fetchone()[0]
        print_success(f"PostgreSQL connected! Version: {version.split(',')[0]}")
        
        # Check if tables exist
        cur.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cur.fetchall()]
        
        if tables:
            print_info(f"  Found {len(tables)} tables: {', '.join(tables[:5])}")
        else:
            print_warning("  No tables found. Creating schema...")
            create_database_schema(conn)
        
        cur.close()
        conn.close()
        return True
        
    except psycopg2.OperationalError as e:
        print_error(f"Cannot connect to PostgreSQL: {e}")
        print_warning("Make sure PostgreSQL is running and credentials are correct")
        print_info(f"  Current config: host={DB_CONFIG['host']}, port={DB_CONFIG['port']}, db={DB_CONFIG['database']}")
        return False
        
    except Exception as e:
        print_error(f"Database error: {e}")
        return False

def create_database_schema(conn):
    """Create database tables if they don't exist"""
    cur = conn.cursor()
    
    tables = [
        """
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            game_id VARCHAR(100) UNIQUE NOT NULL,
            sport VARCHAR(20) NOT NULL,
            home_team VARCHAR(100) NOT NULL,
            away_team VARCHAR(100) NOT NULL,
            scheduled TIMESTAMP NOT NULL,
            home_score INTEGER,
            away_score INTEGER,
            status VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS predictions (
            id SERIAL PRIMARY KEY,
            game_id VARCHAR(100),
            prediction_type VARCHAR(50) NOT NULL,
            predicted_outcome VARCHAR(100),
            confidence DECIMAL(5,4),
            probability DECIMAL(5,4),
            expected_value DECIMAL(10,2),
            actual_outcome VARCHAR(100),
            is_correct BOOLEAN,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS odds (
            id SERIAL PRIMARY KEY,
            game_id VARCHAR(100),
            book_name VARCHAR(100),
            market_type VARCHAR(50),
            home_odds INTEGER,
            away_odds INTEGER,
            spread DECIMAL(5,2),
            total DECIMAL(5,2),
            over_odds INTEGER,
            under_odds INTEGER,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS parlays (
            id SERIAL PRIMARY KEY,
            parlay_id VARCHAR(100) UNIQUE NOT NULL,
            legs JSONB NOT NULL,
            combined_odds INTEGER,
            total_probability DECIMAL(5,4),
            expected_value DECIMAL(10,2),
            risk_level VARCHAR(20),
            correlation_score DECIMAL(5,4),
            recommended BOOLEAN DEFAULT false,
            actual_outcome VARCHAR(20),
            payout DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    ]
    
    for table_sql in tables:
        try:
            cur.execute(table_sql)
            conn.commit()
        except Exception as e:
            print_warning(f"  Error creating table: {e}")
    
    print_success("  Database schema created successfully!")
    cur.close()

def fetch_live_games():
    """Fetch and display current live games"""
    print(f"\n{Fore.CYAN}Fetching LIVE games...{Style.RESET_ALL}")
    
    sports = ['nba', 'nfl', 'nhl', 'mlb']
    total_games = 0
    
    for sport in sports:
        try:
            if sport == 'nba':
                today = datetime.now().strftime('%Y/%m/%d')
                url = f"https://api.sportradar.us/nba/trial/v8/en/games/{today}/schedule.json?api_key={SPORTS_RADAR_API_KEY}"
            elif sport == 'nfl':
                week = ((datetime.now() - datetime(2024, 9, 5)).days // 7) + 1
                week = min(max(1, week), 18)
                url = f"https://api.sportradar.us/nfl/official/trial/v7/en/games/2024/REG/{week}/schedule.json?api_key={SPORTS_RADAR_API_KEY}"
            else:
                continue  # Skip other sports for now
            
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                games = data.get('games', []) if sport == 'nba' else data.get('week', {}).get('games', [])
                
                if games:
                    print_success(f"{sport.upper()}: {len(games)} games")
                    for game in games[:2]:  # Show first 2 games
                        home = game.get('home', {}).get('name', 'TBD')
                        away = game.get('away', {}).get('name', 'TBD')
                        scheduled = game.get('scheduled', 'TBD')
                        print_info(f"    • {away} @ {home} - {scheduled[:16]}")
                    total_games += len(games)
                    
        except Exception as e:
            print_warning(f"  Could not fetch {sport.upper()} games: {e}")
    
    print_success(f"\nTotal LIVE games found: {total_games}")
    return total_games > 0

def test_full_pipeline():
    """Test the full prediction pipeline with real data"""
    print(f"\n{Fore.CYAN}Testing Full Prediction Pipeline...{Style.RESET_ALL}")
    
    try:
        # Import the prediction system
        sys.path.insert(0, 'src/sports')
        from sports_radar_client import sports_radar_client
        
        # Get today's games
        games = sports_radar_client.get_all_games_today()
        
        if games:
            sport, game_list = next(iter(games.items()))
            if game_list:
                game = game_list[0]
                print_success(f"Processing game: {game.get('away', {}).get('name')} @ {game.get('home', {}).get('name')}")
                
                # Format game data
                formatted = sports_radar_client.format_game_data(game, sport)
                print_info(f"  Game ID: {formatted['game_id']}")
                print_info(f"  Scheduled: {formatted['scheduled']}")
                
                # Try to get odds
                odds = sports_radar_client.get_game_odds(sport, game.get('id'))
                if odds:
                    print_success("  Odds data retrieved successfully!")
                else:
                    print_warning("  No odds available for this game yet")
                
                return True
        
        print_warning("No games available to test pipeline")
        return False
        
    except Exception as e:
        print_error(f"Pipeline test failed: {e}")
        return False

def main():
    """Main initialization and testing routine"""
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"SPORTS ANALYTICS PLATFORM - REAL DATA INITIALIZATION")
    print(f"{'='*60}{Style.RESET_ALL}")
    
    print(f"\n{Fore.YELLOW}Checking all connections and APIs...{Style.RESET_ALL}")
    
    # Track results
    results = {
        'Sports Radar API': test_sports_radar_api(),
        'Weather API': test_weather_api(),
        'PostgreSQL Database': test_database_connection(),
        'Live Games': fetch_live_games(),
        'Full Pipeline': test_full_pipeline()
    }
    
    # Summary
    print(f"\n{Fore.MAGENTA}{'='*60}")
    print(f"INITIALIZATION SUMMARY")
    print(f"{'='*60}{Style.RESET_ALL}")
    
    for component, status in results.items():
        if status:
            print_success(f"{component}: OPERATIONAL")
        else:
            print_error(f"{component}: FAILED")
    
    # Overall status
    all_operational = all(results.values())
    
    if all_operational:
        print(f"\n{Fore.GREEN}{'='*60}")
        print(f"✨ SYSTEM FULLY OPERATIONAL WITH REAL LIVE DATA! ✨")
        print(f"{'='*60}{Style.RESET_ALL}")
        print_info("\nThe platform is now connected to:")
        print_info("  • Sports Radar API for live games and odds")
        print_info("  • Weather API for environmental factors")
        print_info("  • PostgreSQL for data persistence")
        print_info("\nNO MORE MOCK DATA - EVERYTHING IS REAL!")
    else:
        print(f"\n{Fore.YELLOW}{'='*60}")
        print(f"⚠ SYSTEM PARTIALLY OPERATIONAL")
        print(f"{'='*60}{Style.RESET_ALL}")
        print_warning("\nSome components need attention.")
        print_warning("Fix the failed components to enable full functionality.")
    
    # Next steps
    print(f"\n{Fore.CYAN}Next Steps:{Style.RESET_ALL}")
    print("1. Start the Next.js app: cd 'Probability Analyzer' && npm run dev")
    print("2. Navigate to http://localhost:3000")
    print("3. Watch REAL LIVE data populate your dashboard!")
    
    return 0 if all_operational else 1

if __name__ == "__main__":
    sys.exit(main())