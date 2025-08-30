import asyncio
import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import logging
from dataclasses import dataclass, asdict
from collections import defaultdict
import time
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class BookmakerOdds:
    bookmaker: str
    sport: str
    game_id: str
    team_home: str
    team_away: str
    market_type: str
    outcomes: List[Dict[str, Any]]
    timestamp: datetime
    last_update: datetime

@dataclass
class OddsComparison:
    game_id: str
    sport: str
    teams: Tuple[str, str]
    market_type: str
    best_odds: Dict[str, Dict[str, Any]]  # outcome -> {bookmaker, odds, implied_prob}
    worst_odds: Dict[str, Dict[str, Any]]
    average_odds: Dict[str, float]
    spread_percentage: float
    arbitrage_opportunity: Optional[Dict[str, Any]]
    total_bookmakers: int
    timestamp: datetime

@dataclass
class ArbitrageOpportunity:
    game_id: str
    sport: str
    teams: Tuple[str, str]
    market_type: str
    bookmaker_combination: Dict[str, Dict[str, Any]]
    total_probability: float
    profit_margin: float
    bet_allocation: Dict[str, float]
    minimum_stake: float
    expected_profit: float
    risk_level: str

class MultiBookmakerComparison:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.odds_api_key = config.get('odds_api_key', '')
        self.sports_radar_key = config.get('sports_radar_key', '')
        
        # Bookmaker configurations
        self.bookmakers = config.get('bookmakers', [
            'draftkings', 'fanduel', 'betmgm', 'pointsbet', 'caesars',
            'barstool', 'unibet', 'bet365', 'bovada', 'mybookie'
        ])
        
        # API endpoints
        self.odds_api_base = "https://api.the-odds-api.com/v4"
        
        # Cache settings
        self.cache_duration = config.get('cache_duration', 300)  # 5 minutes
        self.odds_cache = {}
        self.comparison_cache = {}
        
        # Rate limiting
        self.max_requests_per_minute = config.get('max_requests_per_minute', 60)
        self.request_timestamps = []
        
        # Arbitrage settings
        self.min_arbitrage_profit = config.get('min_arbitrage_profit', 1.0)  # 1% minimum profit
        self.max_arbitrage_profit = config.get('max_arbitrage_profit', 20.0)  # 20% maximum (likely error)
        
    async def fetch_live_odds_comparison(self, 
                                        sport: str,
                                        markets: List[str] = None) -> List[OddsComparison]:
        """Fetch and compare live odds from multiple bookmakers"""
        if markets is None:
            markets = ['h2h', 'spreads', 'totals']
        
        all_comparisons = []
        
        for market in markets:
            # Fetch odds from all bookmakers
            bookmaker_odds = await self._fetch_all_bookmaker_odds(sport, market)
            
            # Group by game and compare
            game_comparisons = self._compare_odds_by_game(bookmaker_odds, market)
            all_comparisons.extend(game_comparisons)
        
        # Cache results
        cache_key = f"{sport}_{datetime.now().strftime('%Y%m%d_%H%M')}"
        self.comparison_cache[cache_key] = all_comparisons
        
        logger.info(f"Generated {len(all_comparisons)} odds comparisons for {sport}")
        return all_comparisons
    
    async def _fetch_all_bookmaker_odds(self, 
                                       sport: str,
                                       market: str) -> List[BookmakerOdds]:
        """Fetch odds from all configured bookmakers"""
        if not self.odds_api_key:
            logger.error("No Odds API key provided")
            return []
        
        bookmaker_odds = []
        
        try:
            await self._check_rate_limit()
            
            sport_key = self._convert_sport_name(sport)
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.odds_api_base}/sports/{sport_key}/odds"
                params = {
                    'apiKey': self.odds_api_key,
                    'regions': 'us',
                    'markets': market,
                    'bookmakers': ','.join(self.bookmakers),
                    'dateFormat': 'iso'
                }
                
                async with session.get(url, params=params, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        bookmaker_odds = self._parse_odds_response(data, sport, market)
                    else:
                        logger.error(f"Odds API request failed: {response.status}")
                        error_text = await response.text()
                        logger.error(f"Error details: {error_text}")
        
        except asyncio.TimeoutError:
            logger.error("Odds API request timed out")
        except Exception as e:
            logger.error(f"Error fetching bookmaker odds: {e}")
        
        return bookmaker_odds
    
    def _compare_odds_by_game(self, 
                             bookmaker_odds: List[BookmakerOdds],
                             market: str) -> List[OddsComparison]:
        """Compare odds across bookmakers for each game"""
        comparisons = []
        
        # Group odds by game
        game_odds = defaultdict(list)
        for odds in bookmaker_odds:
            game_odds[odds.game_id].append(odds)
        
        for game_id, odds_list in game_odds.items():
            if len(odds_list) < 2:  # Need at least 2 bookmakers
                continue
            
            # Get game info
            first_odds = odds_list[0]
            teams = (first_odds.team_home, first_odds.team_away)
            
            # Organize outcomes by type
            outcome_odds = defaultdict(dict)  # outcome_name -> bookmaker -> odds
            
            for odds in odds_list:
                for outcome in odds.outcomes:
                    outcome_name = outcome.get('name', '')
                    odds_value = outcome.get('price', 0)
                    outcome_odds[outcome_name][odds.bookmaker] = {
                        'odds': odds_value,
                        'implied_prob': self._odds_to_probability(odds_value, market),
                        'line': outcome.get('point', None)
                    }
            
            if not outcome_odds:
                continue
            
            # Find best/worst odds for each outcome
            best_odds = {}
            worst_odds = {}
            average_odds = {}
            
            for outcome, bookmaker_data in outcome_odds.items():
                if not bookmaker_data:
                    continue
                
                odds_values = [data['odds'] for data in bookmaker_data.values()]
                
                best_odds_value = max(odds_values) if market == 'h2h' else max(odds_values)
                worst_odds_value = min(odds_values) if market == 'h2h' else min(odds_values)
                avg_odds_value = np.mean(odds_values)
                
                # Find bookmaker with best odds
                best_bookmaker = max(bookmaker_data.items(), 
                                   key=lambda x: x[1]['odds'])[0]
                worst_bookmaker = min(bookmaker_data.items(),
                                    key=lambda x: x[1]['odds'])[0]
                
                best_odds[outcome] = {
                    'bookmaker': best_bookmaker,
                    'odds': best_odds_value,
                    'implied_prob': bookmaker_data[best_bookmaker]['implied_prob']
                }
                
                worst_odds[outcome] = {
                    'bookmaker': worst_bookmaker,
                    'odds': worst_odds_value,
                    'implied_prob': bookmaker_data[worst_bookmaker]['implied_prob']
                }
                
                average_odds[outcome] = avg_odds_value
            
            # Calculate spread percentage
            spread_pct = self._calculate_spread_percentage(best_odds, worst_odds)
            
            # Check for arbitrage opportunities
            arbitrage_opp = self._check_arbitrage_opportunity(
                outcome_odds, market, game_id, teams
            )
            
            comparison = OddsComparison(
                game_id=game_id,
                sport=first_odds.sport,
                teams=teams,
                market_type=market,
                best_odds=best_odds,
                worst_odds=worst_odds,
                average_odds=average_odds,
                spread_percentage=spread_pct,
                arbitrage_opportunity=arbitrage_opp,
                total_bookmakers=len(odds_list),
                timestamp=datetime.now()
            )
            
            comparisons.append(comparison)
        
        return comparisons
    
    def _check_arbitrage_opportunity(self, 
                                   outcome_odds: Dict[str, Dict[str, Dict]],
                                   market: str,
                                   game_id: str,
                                   teams: Tuple[str, str]) -> Optional[ArbitrageOpportunity]:
        """Check for arbitrage opportunities"""
        
        if len(outcome_odds) < 2:  # Need at least 2 outcomes
            return None
        
        # Get all possible outcome combinations
        outcomes = list(outcome_odds.keys())
        
        # For each outcome, find the best odds
        best_outcome_odds = {}
        best_bookmakers = {}
        
        for outcome in outcomes:
            if not outcome_odds[outcome]:
                continue
            
            best_bookmaker = max(outcome_odds[outcome].items(),
                               key=lambda x: x[1]['odds'])
            
            best_outcome_odds[outcome] = best_bookmaker[1]['odds']
            best_bookmakers[outcome] = {
                'bookmaker': best_bookmaker[0],
                'odds': best_bookmaker[1]['odds'],
                'implied_prob': best_bookmaker[1]['implied_prob']
            }
        
        if len(best_outcome_odds) < 2:
            return None
        
        # Calculate total implied probability
        if market == 'h2h':  # Moneyline
            total_prob = sum(1/odds for odds in best_outcome_odds.values() if odds > 0)
        else:  # Spreads/Totals
            implied_probs = [self._odds_to_probability(odds, market) 
                           for odds in best_outcome_odds.values()]
            total_prob = sum(implied_probs)
        
        # Arbitrage exists if total probability < 1
        if total_prob >= 1.0:
            return None
        
        profit_margin = (1 - total_prob) * 100
        
        # Check if profit margin meets minimum threshold
        if profit_margin < self.min_arbitrage_profit:
            return None
        
        # Check if profit margin is suspiciously high (likely error)
        if profit_margin > self.max_arbitrage_profit:
            logger.warning(f"Suspiciously high arbitrage profit: {profit_margin}%")
            return None
        
        # Calculate optimal bet allocation
        bet_allocation = {}
        total_stake = 1000  # Base stake of $1000
        
        for outcome, odds in best_outcome_odds.items():
            if market == 'h2h':
                allocation_pct = (1/odds) / total_prob
            else:
                implied_prob = self._odds_to_probability(odds, market)
                allocation_pct = implied_prob / total_prob
            
            bet_allocation[outcome] = {
                'percentage': allocation_pct * 100,
                'amount': total_stake * allocation_pct,
                'bookmaker': best_bookmakers[outcome]['bookmaker'],
                'odds': odds
            }
        
        # Calculate expected profit
        expected_profit = total_stake * profit_margin / 100
        
        # Determine risk level
        if profit_margin < 2:
            risk_level = "Low"
        elif profit_margin < 5:
            risk_level = "Medium"
        else:
            risk_level = "High"
        
        arbitrage = ArbitrageOpportunity(
            game_id=game_id,
            sport=market,  # Using market as sport placeholder
            teams=teams,
            market_type=market,
            bookmaker_combination=best_bookmakers,
            total_probability=total_prob,
            profit_margin=profit_margin,
            bet_allocation=bet_allocation,
            minimum_stake=100,  # Minimum $100
            expected_profit=expected_profit,
            risk_level=risk_level
        )
        
        return arbitrage
    
    def find_arbitrage_opportunities(self, 
                                   comparisons: List[OddsComparison],
                                   min_profit_margin: float = 1.0) -> List[ArbitrageOpportunity]:
        """Find all arbitrage opportunities from odds comparisons"""
        arbitrage_opportunities = []
        
        for comparison in comparisons:
            if comparison.arbitrage_opportunity:
                arb_opp = comparison.arbitrage_opportunity
                if isinstance(arb_opp, dict):
                    # Convert dict to ArbitrageOpportunity if needed
                    if arb_opp.get('profit_margin', 0) >= min_profit_margin:
                        arbitrage_opportunities.append(arb_opp)
                elif hasattr(arb_opp, 'profit_margin'):
                    if arb_opp.profit_margin >= min_profit_margin:
                        arbitrage_opportunities.append(arb_opp)
        
        # Sort by profit margin (highest first)
        arbitrage_opportunities.sort(
            key=lambda x: x.get('profit_margin', 0) if isinstance(x, dict) else x.profit_margin,
            reverse=True
        )
        
        return arbitrage_opportunities
    
    def get_best_odds_summary(self, 
                            comparisons: List[OddsComparison],
                            top_n: int = 10) -> List[Dict[str, Any]]:
        """Get summary of best odds across all comparisons"""
        summaries = []
        
        for comparison in comparisons:
            for outcome, best_odds_info in comparison.best_odds.items():
                summary = {
                    'game_id': comparison.game_id,
                    'sport': comparison.sport,
                    'teams': f"{comparison.teams[0]} vs {comparison.teams[1]}",
                    'market': comparison.market_type,
                    'outcome': outcome,
                    'best_bookmaker': best_odds_info['bookmaker'],
                    'best_odds': best_odds_info['odds'],
                    'implied_probability': best_odds_info['implied_prob'],
                    'average_odds': comparison.average_odds.get(outcome, 0),
                    'spread_percentage': comparison.spread_percentage,
                    'total_bookmakers': comparison.total_bookmakers,
                    'has_arbitrage': comparison.arbitrage_opportunity is not None
                }
                summaries.append(summary)
        
        # Sort by spread percentage (highest first) - indicates biggest differences
        summaries.sort(key=lambda x: x['spread_percentage'], reverse=True)
        
        return summaries[:top_n]
    
    def analyze_bookmaker_performance(self, 
                                    comparisons: List[OddsComparison]) -> Dict[str, Dict[str, Any]]:
        """Analyze which bookmakers consistently offer best odds"""
        bookmaker_stats = defaultdict(lambda: {
            'best_odds_count': 0,
            'total_appearances': 0,
            'average_odds_rank': [],
            'markets_covered': set()
        })
        
        for comparison in comparisons:
            market = comparison.market_type
            
            # Track which bookmakers appear in this comparison
            bookmakers_in_game = set()
            
            # Add bookmakers from best odds
            for outcome, best_info in comparison.best_odds.items():
                bookmaker = best_info['bookmaker']
                bookmaker_stats[bookmaker]['best_odds_count'] += 1
                bookmaker_stats[bookmaker]['markets_covered'].add(market)
                bookmakers_in_game.add(bookmaker)
            
            # Count total appearances
            for bookmaker in bookmakers_in_game:
                bookmaker_stats[bookmaker]['total_appearances'] += 1
        
        # Calculate final stats
        final_stats = {}
        for bookmaker, stats in bookmaker_stats.items():
            if stats['total_appearances'] > 0:
                best_odds_rate = stats['best_odds_count'] / stats['total_appearances']
                
                final_stats[bookmaker] = {
                    'best_odds_rate': best_odds_rate,
                    'best_odds_count': stats['best_odds_count'],
                    'total_appearances': stats['total_appearances'],
                    'markets_covered': len(stats['markets_covered']),
                    'coverage_markets': list(stats['markets_covered'])
                }
        
        # Sort by best odds rate
        final_stats = dict(sorted(final_stats.items(), 
                                key=lambda x: x[1]['best_odds_rate'], 
                                reverse=True))
        
        return final_stats
    
    async def get_realtime_line_movements(self, 
                                        sport: str,
                                        game_id: str,
                                        duration_minutes: int = 60) -> List[Dict[str, Any]]:
        """Track line movements in real-time"""
        movements = []
        start_time = datetime.now()
        
        try:
            while (datetime.now() - start_time).total_seconds() < duration_minutes * 60:
                # Fetch current odds
                current_comparisons = await self.fetch_live_odds_comparison(sport)
                
                # Find the specific game
                game_comparison = None
                for comp in current_comparisons:
                    if comp.game_id == game_id:
                        game_comparison = comp
                        break
                
                if game_comparison:
                    movement_data = {
                        'timestamp': datetime.now().isoformat(),
                        'best_odds': game_comparison.best_odds,
                        'worst_odds': game_comparison.worst_odds,
                        'average_odds': game_comparison.average_odds,
                        'spread_percentage': game_comparison.spread_percentage,
                        'arbitrage_opportunity': game_comparison.arbitrage_opportunity
                    }
                    movements.append(movement_data)
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
        
        except Exception as e:
            logger.error(f"Error tracking line movements: {e}")
        
        return movements
    
    def _parse_odds_response(self, 
                           data: List[Dict],
                           sport: str,
                           market: str) -> List[BookmakerOdds]:
        """Parse API response into BookmakerOdds objects"""
        bookmaker_odds_list = []
        
        for game in data:
            game_id = game.get('id', '')
            home_team = game.get('home_team', '')
            away_team = game.get('away_team', '')
            commence_time = game.get('commence_time', '')
            
            for bookmaker_data in game.get('bookmakers', []):
                bookmaker_name = bookmaker_data.get('key', '')
                last_update = bookmaker_data.get('last_update', '')
                
                for market_data in bookmaker_data.get('markets', []):
                    if market_data.get('key') == market:
                        outcomes = market_data.get('outcomes', [])
                        
                        bookmaker_odds = BookmakerOdds(
                            bookmaker=bookmaker_name,
                            sport=sport,
                            game_id=game_id,
                            team_home=home_team,
                            team_away=away_team,
                            market_type=market,
                            outcomes=outcomes,
                            timestamp=datetime.now(),
                            last_update=datetime.fromisoformat(
                                last_update.replace('Z', '+00:00')
                            ) if last_update else datetime.now()
                        )
                        
                        bookmaker_odds_list.append(bookmaker_odds)
        
        return bookmaker_odds_list
    
    def _odds_to_probability(self, odds: float, market_type: str) -> float:
        """Convert odds to implied probability"""
        if market_type == 'h2h':  # Moneyline (American odds)
            if odds > 0:
                return 100 / (odds + 100)
            else:
                return abs(odds) / (abs(odds) + 100)
        else:  # Spreads/Totals (typically -110)
            if odds > 0:
                return 100 / (odds + 100)
            else:
                return abs(odds) / (abs(odds) + 100)
    
    def _calculate_spread_percentage(self, 
                                   best_odds: Dict[str, Dict],
                                   worst_odds: Dict[str, Dict]) -> float:
        """Calculate percentage spread between best and worst odds"""
        spreads = []
        
        for outcome in best_odds:
            if outcome in worst_odds:
                best = best_odds[outcome]['odds']
                worst = worst_odds[outcome]['odds']
                
                if worst > 0:
                    spread_pct = ((best - worst) / worst) * 100
                    spreads.append(abs(spread_pct))
        
        return np.mean(spreads) if spreads else 0
    
    def _convert_sport_name(self, sport: str) -> str:
        """Convert sport name to API format"""
        sport_mapping = {
            'nfl': 'americanfootball_nfl',
            'nba': 'basketball_nba',
            'mlb': 'baseball_mlb',
            'nhl': 'icehockey_nhl',
            'ncaaf': 'americanfootball_ncaaf',
            'ncaab': 'basketball_ncaab',
            'soccer': 'soccer_epl'  # Default to EPL
        }
        return sport_mapping.get(sport.lower(), sport.lower())
    
    async def _check_rate_limit(self):
        """Check and enforce rate limiting"""
        current_time = time.time()
        
        # Remove timestamps older than 1 minute
        self.request_timestamps = [
            ts for ts in self.request_timestamps 
            if current_time - ts < 60
        ]
        
        # Check if we're at the limit
        if len(self.request_timestamps) >= self.max_requests_per_minute:
            # Wait until we can make another request
            wait_time = 60 - (current_time - self.request_timestamps[0])
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                # Clean up old timestamps after waiting
                current_time = time.time()
                self.request_timestamps = [
                    ts for ts in self.request_timestamps 
                    if current_time - ts < 60
                ]
        
        # Record this request
        self.request_timestamps.append(current_time)
    
    def export_comparison_data(self, 
                             comparisons: List[OddsComparison],
                             format: str = 'json') -> str:
        """Export comparison data in various formats"""
        
        if format == 'json':
            # Convert to JSON serializable format
            export_data = []
            for comp in comparisons:
                comp_dict = asdict(comp)
                comp_dict['timestamp'] = comp_dict['timestamp'].isoformat()
                
                # Handle arbitrage opportunity
                if comp_dict.get('arbitrage_opportunity'):
                    arb_opp = comp_dict['arbitrage_opportunity']
                    if hasattr(arb_opp, '__dict__'):
                        comp_dict['arbitrage_opportunity'] = asdict(arb_opp)
                
                export_data.append(comp_dict)
            
            return json.dumps(export_data, indent=2, default=str)
        
        elif format == 'csv':
            # Convert to DataFrame for CSV export
            data_rows = []
            for comp in comparisons:
                base_row = {
                    'game_id': comp.game_id,
                    'sport': comp.sport,
                    'home_team': comp.teams[0],
                    'away_team': comp.teams[1],
                    'market_type': comp.market_type,
                    'spread_percentage': comp.spread_percentage,
                    'total_bookmakers': comp.total_bookmakers,
                    'has_arbitrage': comp.arbitrage_opportunity is not None,
                    'timestamp': comp.timestamp.isoformat()
                }
                
                # Add best odds for each outcome
                for outcome, odds_info in comp.best_odds.items():
                    row = base_row.copy()
                    row.update({
                        'outcome': outcome,
                        'best_bookmaker': odds_info['bookmaker'],
                        'best_odds': odds_info['odds'],
                        'implied_probability': odds_info['implied_prob']
                    })
                    data_rows.append(row)
            
            df = pd.DataFrame(data_rows)
            return df.to_csv(index=False)
        
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def get_market_summary(self, comparisons: List[OddsComparison]) -> Dict[str, Any]:
        """Get overall market summary statistics"""
        if not comparisons:
            return {}
        
        summary = {
            'total_games': len(set(comp.game_id for comp in comparisons)),
            'total_markets': len(set(comp.market_type for comp in comparisons)),
            'total_comparisons': len(comparisons),
            'arbitrage_opportunities': len([c for c in comparisons if c.arbitrage_opportunity]),
            'average_spread_percentage': np.mean([c.spread_percentage for c in comparisons]),
            'max_spread_percentage': max([c.spread_percentage for c in comparisons]),
            'average_bookmakers_per_game': np.mean([c.total_bookmakers for c in comparisons]),
            'sports_covered': list(set(comp.sport for comp in comparisons)),
            'markets_covered': list(set(comp.market_type for comp in comparisons)),
            'timestamp': datetime.now().isoformat()
        }
        
        return summary