import asyncio
import aiohttp
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from collections import defaultdict
import json
import logging
import itertools
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

@dataclass
class ArbitrageOpportunity:
    opportunity_id: str
    game_id: str
    sport: str
    teams: Tuple[str, str]
    market_type: str
    outcomes: Dict[str, Dict[str, Any]]  # outcome -> {bookmaker, odds, stake_pct}
    total_implied_probability: float
    profit_margin: float
    profit_percentage: float
    minimum_stake: float
    recommended_stakes: Dict[str, float]
    expected_profit: float
    risk_level: str
    confidence_score: float
    time_sensitivity: str
    bookmakers_involved: List[str]
    created_at: datetime
    expires_at: Optional[datetime]

@dataclass
class SurebetCalculation:
    total_stake: float
    individual_stakes: Dict[str, float]
    guaranteed_profit: float
    profit_percentage: float
    worst_case_scenario: float
    best_case_scenario: float

@dataclass
class MiddleOpportunity:
    game_id: str
    sport: str
    teams: Tuple[str, str]
    spread_line: float
    over_bookmaker: str
    over_odds: float
    under_bookmaker: str
    under_odds: float
    middle_range: Tuple[float, float]
    win_probability: float
    expected_value: float
    recommended_stakes: Dict[str, float]

class ArbitrageDetector:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.odds_api_key = config.get('odds_api_key', '')
        
        # Arbitrage settings
        self.min_profit_margin = config.get('min_profit_margin', 0.5)  # 0.5% minimum
        self.max_profit_margin = config.get('max_profit_margin', 15.0)  # 15% max (likely error)
        self.min_stake = config.get('min_stake', 100)
        self.max_stake = config.get('max_stake', 10000)
        self.commission_rate = config.get('commission_rate', 0.0)  # Bookmaker commission
        
        # Risk management
        self.max_exposure_per_arb = config.get('max_exposure_per_arb', 1000)
        self.max_bookmakers = config.get('max_bookmakers', 5)
        self.time_window = config.get('time_window', 300)  # 5 minutes for odds validity
        
        # Bookmaker settings
        self.trusted_bookmakers = config.get('trusted_bookmakers', [
            'draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet'
        ])
        
        self.bookmaker_limits = config.get('bookmaker_limits', {
            'draftkings': 5000,
            'fanduel': 5000,
            'betmgm': 3000,
            'caesars': 3000,
            'pointsbet': 2000
        })
        
        # Data storage
        self.active_arbitrages = {}
        self.historical_arbitrages = []
        self.odds_history = defaultdict(list)
        
    async def scan_for_arbitrage(self, 
                                sports: List[str],
                                markets: List[str] = None) -> List[ArbitrageOpportunity]:
        """Scan multiple sports for arbitrage opportunities"""
        
        if markets is None:
            markets = ['h2h', 'spreads', 'totals']
        
        all_opportunities = []
        
        for sport in sports:
            try:
                sport_opportunities = await self._scan_sport_arbitrage(sport, markets)
                all_opportunities.extend(sport_opportunities)
                logger.info(f"Found {len(sport_opportunities)} arbitrage opportunities in {sport}")
                
            except Exception as e:
                logger.error(f"Error scanning {sport} for arbitrage: {e}")
                continue
        
        # Sort by profit margin (highest first)
        all_opportunities.sort(key=lambda x: x.profit_margin, reverse=True)
        
        # Store active arbitrages
        for opp in all_opportunities:
            self.active_arbitrages[opp.opportunity_id] = opp
        
        logger.info(f"Found {len(all_opportunities)} total arbitrage opportunities")
        return all_opportunities
    
    async def _scan_sport_arbitrage(self, 
                                   sport: str,
                                   markets: List[str]) -> List[ArbitrageOpportunity]:
        """Scan a specific sport for arbitrage opportunities"""
        
        opportunities = []
        
        for market in markets:
            try:
                # Fetch odds from all bookmakers
                odds_data = await self._fetch_comprehensive_odds(sport, market)
                
                if not odds_data:
                    continue
                
                # Group by game
                game_odds = self._group_odds_by_game(odds_data)
                
                # Check each game for arbitrage
                for game_id, game_data in game_odds.items():
                    arb_opportunities = self._detect_arbitrage_in_game(game_data, sport, market)
                    opportunities.extend(arb_opportunities)
                
            except Exception as e:
                logger.error(f"Error scanning {sport} {market} for arbitrage: {e}")
                continue
        
        return opportunities
    
    async def _fetch_comprehensive_odds(self, 
                                       sport: str,
                                       market: str) -> List[Dict[str, Any]]:
        """Fetch odds from multiple sources for comprehensive coverage"""
        
        all_odds = []
        
        if not self.odds_api_key:
            logger.error("No odds API key available")
            return all_odds
        
        try:
            sport_key = self._convert_sport_name(sport)
            
            async with aiohttp.ClientSession() as session:
                url = f"https://api.the-odds-api.com/v4/sports/{sport_key}/odds"
                params = {
                    'apiKey': self.odds_api_key,
                    'regions': 'us,uk,eu',  # Multiple regions for more bookmakers
                    'markets': market,
                    'bookmakers': ','.join(self.trusted_bookmakers),
                    'dateFormat': 'iso'
                }
                
                async with session.get(url, params=params, timeout=30) as response:
                    if response.status == 200:
                        data = await response.json()
                        all_odds = self._parse_comprehensive_odds(data, sport, market)
                    else:
                        logger.error(f"Failed to fetch odds: {response.status}")
            
        except Exception as e:
            logger.error(f"Error fetching comprehensive odds: {e}")
        
        return all_odds
    
    def _parse_comprehensive_odds(self, 
                                 data: List[Dict[str, Any]],
                                 sport: str,
                                 market: str) -> List[Dict[str, Any]]:
        """Parse comprehensive odds data"""
        
        parsed_odds = []
        
        for game in data:
            game_id = game.get('id', '')
            home_team = game.get('home_team', '')
            away_team = game.get('away_team', '')
            commence_time = game.get('commence_time', '')
            
            for bookmaker in game.get('bookmakers', []):
                bookmaker_key = bookmaker.get('key', '')
                
                if bookmaker_key not in self.trusted_bookmakers:
                    continue
                
                for market_data in bookmaker.get('markets', []):
                    if market_data.get('key') == market:
                        outcomes = market_data.get('outcomes', [])
                        
                        parsed_odds.append({
                            'game_id': game_id,
                            'sport': sport,
                            'home_team': home_team,
                            'away_team': away_team,
                            'market_type': market,
                            'bookmaker': bookmaker_key,
                            'outcomes': outcomes,
                            'commence_time': commence_time,
                            'last_update': bookmaker.get('last_update', '')
                        })
        
        return parsed_odds
    
    def _group_odds_by_game(self, odds_data: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """Group odds data by game"""
        
        game_groups = defaultdict(list)
        
        for odds in odds_data:
            game_id = odds['game_id']
            game_groups[game_id].append(odds)
        
        return dict(game_groups)
    
    def _detect_arbitrage_in_game(self, 
                                 game_odds: List[Dict[str, Any]],
                                 sport: str,
                                 market: str) -> List[ArbitrageOpportunity]:
        """Detect arbitrage opportunities in a single game"""
        
        opportunities = []
        
        if len(game_odds) < 2:  # Need at least 2 bookmakers
            return opportunities
        
        # Extract game info
        first_odds = game_odds[0]
        game_id = first_odds['game_id']
        teams = (first_odds['home_team'], first_odds['away_team'])
        
        # Organize outcomes by bookmaker
        bookmaker_outcomes = {}
        
        for odds_data in game_odds:
            bookmaker = odds_data['bookmaker']
            outcomes = odds_data['outcomes']
            
            bookmaker_outcomes[bookmaker] = {}
            for outcome in outcomes:
                outcome_name = outcome.get('name', '')
                outcome_odds = outcome.get('price', 0)
                outcome_point = outcome.get('point', None)
                
                key = outcome_name
                if outcome_point is not None:
                    key = f"{outcome_name}_{outcome_point}"
                
                bookmaker_outcomes[bookmaker][key] = {
                    'odds': outcome_odds,
                    'point': outcome_point,
                    'name': outcome_name
                }
        
        # Find all possible outcome combinations
        outcome_names = set()
        for bookmaker_data in bookmaker_outcomes.values():
            outcome_names.update(bookmaker_data.keys())
        
        outcome_names = list(outcome_names)
        
        if len(outcome_names) < 2:
            return opportunities
        
        # Check for arbitrage opportunities
        if market == 'h2h':  # Moneyline
            arb_opp = self._check_moneyline_arbitrage(
                bookmaker_outcomes, game_id, sport, teams, outcome_names
            )
            if arb_opp:
                opportunities.append(arb_opp)
        
        elif market in ['spreads', 'totals']:
            arb_opportunities = self._check_spread_total_arbitrage(
                bookmaker_outcomes, game_id, sport, teams, market
            )
            opportunities.extend(arb_opportunities)
        
        return opportunities
    
    def _check_moneyline_arbitrage(self,
                                  bookmaker_outcomes: Dict[str, Dict[str, Dict]],
                                  game_id: str,
                                  sport: str,
                                  teams: Tuple[str, str],
                                  outcome_names: List[str]) -> Optional[ArbitrageOpportunity]:
        """Check for moneyline arbitrage opportunities"""
        
        # Find best odds for each outcome
        best_odds = {}
        best_bookmakers = {}
        
        for outcome in outcome_names:
            best_odd = -float('inf')
            best_bookmaker = None
            
            for bookmaker, outcomes in bookmaker_outcomes.items():
                if outcome in outcomes:
                    odds_value = outcomes[outcome]['odds']
                    
                    if odds_value > best_odd:
                        best_odd = odds_value
                        best_bookmaker = bookmaker
            
            if best_bookmaker:
                best_odds[outcome] = best_odd
                best_bookmakers[outcome] = best_bookmaker
        
        if len(best_odds) < 2:
            return None
        
        # Calculate total implied probability
        total_implied_prob = 0
        outcome_probs = {}
        
        for outcome, odds in best_odds.items():
            implied_prob = self._odds_to_probability(odds)
            outcome_probs[outcome] = implied_prob
            total_implied_prob += implied_prob
        
        # Check if arbitrage exists (total probability < 1)
        if total_implied_prob >= 1.0:
            return None
        
        profit_margin = (1 - total_implied_prob) * 100
        
        # Check profit margin thresholds
        if profit_margin < self.min_profit_margin:
            return None
        
        if profit_margin > self.max_profit_margin:
            logger.warning(f"Suspiciously high profit margin: {profit_margin}%")
            return None
        
        # Calculate optimal stakes
        stakes_calculation = self._calculate_optimal_stakes(
            best_odds, self.min_stake * len(best_odds)
        )
        
        # Create arbitrage opportunity
        outcomes_data = {}
        for outcome, odds in best_odds.items():
            outcomes_data[outcome] = {
                'bookmaker': best_bookmakers[outcome],
                'odds': odds,
                'stake': stakes_calculation.individual_stakes[outcome],
                'implied_probability': outcome_probs[outcome]
            }
        
        opportunity = ArbitrageOpportunity(
            opportunity_id=f"arb_{game_id}_{market}_{int(datetime.now().timestamp())}",
            game_id=game_id,
            sport=sport,
            teams=teams,
            market_type='h2h',
            outcomes=outcomes_data,
            total_implied_probability=total_implied_prob,
            profit_margin=profit_margin,
            profit_percentage=profit_margin,
            minimum_stake=stakes_calculation.total_stake,
            recommended_stakes=stakes_calculation.individual_stakes,
            expected_profit=stakes_calculation.guaranteed_profit,
            risk_level=self._assess_arbitrage_risk(profit_margin, best_bookmakers),
            confidence_score=self._calculate_confidence_score(profit_margin, len(best_bookmakers)),
            time_sensitivity="High",  # Odds can change quickly
            bookmakers_involved=list(best_bookmakers.values()),
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(seconds=self.time_window)
        )
        
        return opportunity
    
    def _check_spread_total_arbitrage(self,
                                    bookmaker_outcomes: Dict[str, Dict[str, Dict]],
                                    game_id: str,
                                    sport: str,
                                    teams: Tuple[str, str],
                                    market: str) -> List[ArbitrageOpportunity]:
        """Check for spread/total arbitrage opportunities"""
        
        opportunities = []
        
        # Group outcomes by point spread/total value
        point_groups = defaultdict(lambda: defaultdict(dict))
        
        for bookmaker, outcomes in bookmaker_outcomes.items():
            for outcome_key, outcome_data in outcomes.items():
                point_value = outcome_data.get('point')
                outcome_name = outcome_data.get('name')
                
                if point_value is not None:
                    point_groups[point_value][outcome_name][bookmaker] = outcome_data
        
        # Check each point group for arbitrage
        for point_value, outcomes_by_name in point_groups.items():
            if len(outcomes_by_name) < 2:
                continue
            
            # Check for standard two-way arbitrage
            outcome_names = list(outcomes_by_name.keys())
            
            if len(outcome_names) == 2:
                arb_opp = self._check_two_way_arbitrage(
                    outcomes_by_name, game_id, sport, teams, market, point_value
                )
                if arb_opp:
                    opportunities.append(arb_opp)
        
        return opportunities
    
    def _check_two_way_arbitrage(self,
                               outcomes_by_name: Dict[str, Dict[str, Dict]],
                               game_id: str,
                               sport: str,
                               teams: Tuple[str, str],
                               market: str,
                               point_value: float) -> Optional[ArbitrageOpportunity]:
        """Check for two-way arbitrage (spread/total)"""
        
        outcome_names = list(outcomes_by_name.keys())
        
        if len(outcome_names) != 2:
            return None
        
        # Find best odds for each outcome
        best_odds = {}
        best_bookmakers = {}
        
        for outcome_name in outcome_names:
            bookmaker_data = outcomes_by_name[outcome_name]
            
            best_odd = -float('inf')
            best_bookmaker = None
            
            for bookmaker, data in bookmaker_data.items():
                odds_value = data['odds']
                
                if odds_value > best_odd:
                    best_odd = odds_value
                    best_bookmaker = bookmaker
            
            if best_bookmaker:
                best_odds[outcome_name] = best_odd
                best_bookmakers[outcome_name] = best_bookmaker
        
        if len(best_odds) != 2:
            return None
        
        # Calculate arbitrage
        total_implied_prob = sum(self._odds_to_probability(odds) for odds in best_odds.values())
        
        if total_implied_prob >= 1.0:
            return None
        
        profit_margin = (1 - total_implied_prob) * 100
        
        if profit_margin < self.min_profit_margin:
            return None
        
        if profit_margin > self.max_profit_margin:
            return None
        
        # Calculate stakes
        stakes_calculation = self._calculate_optimal_stakes(
            best_odds, self.min_stake * len(best_odds)
        )
        
        # Create opportunity
        outcomes_data = {}
        for outcome_name, odds in best_odds.items():
            outcomes_data[outcome_name] = {
                'bookmaker': best_bookmakers[outcome_name],
                'odds': odds,
                'stake': stakes_calculation.individual_stakes[outcome_name],
                'implied_probability': self._odds_to_probability(odds),
                'point': point_value
            }
        
        opportunity = ArbitrageOpportunity(
            opportunity_id=f"arb_{game_id}_{market}_{point_value}_{int(datetime.now().timestamp())}",
            game_id=game_id,
            sport=sport,
            teams=teams,
            market_type=market,
            outcomes=outcomes_data,
            total_implied_probability=total_implied_prob,
            profit_margin=profit_margin,
            profit_percentage=profit_margin,
            minimum_stake=stakes_calculation.total_stake,
            recommended_stakes=stakes_calculation.individual_stakes,
            expected_profit=stakes_calculation.guaranteed_profit,
            risk_level=self._assess_arbitrage_risk(profit_margin, best_bookmakers),
            confidence_score=self._calculate_confidence_score(profit_margin, len(best_bookmakers)),
            time_sensitivity="High",
            bookmakers_involved=list(best_bookmakers.values()),
            created_at=datetime.now(),
            expires_at=datetime.now() + timedelta(seconds=self.time_window)
        )
        
        return opportunity
    
    def _calculate_optimal_stakes(self,
                                odds_dict: Dict[str, float],
                                total_stake: float) -> SurebetCalculation:
        """Calculate optimal stake distribution for arbitrage"""
        
        # Calculate implied probabilities
        implied_probs = {}
        total_prob = 0
        
        for outcome, odds in odds_dict.items():
            prob = self._odds_to_probability(odds)
            implied_probs[outcome] = prob
            total_prob += prob
        
        # Calculate individual stakes
        individual_stakes = {}
        
        for outcome, odds in odds_dict.items():
            # Stake proportional to inverse of odds
            stake_ratio = (1 / odds) / total_prob
            individual_stakes[outcome] = total_stake * stake_ratio
        
        # Calculate guaranteed profit
        profits = []
        for outcome, odds in odds_dict.items():
            potential_return = individual_stakes[outcome] * self._odds_to_decimal(odds)
            profit = potential_return - total_stake
            profits.append(profit)
        
        guaranteed_profit = min(profits)
        profit_percentage = (guaranteed_profit / total_stake) * 100
        
        return SurebetCalculation(
            total_stake=total_stake,
            individual_stakes=individual_stakes,
            guaranteed_profit=guaranteed_profit,
            profit_percentage=profit_percentage,
            worst_case_scenario=min(profits),
            best_case_scenario=max(profits)
        )
    
    def detect_middle_opportunities(self, 
                                   sport: str,
                                   market: str = 'spreads') -> List[MiddleOpportunity]:
        """Detect middle opportunities (betting both sides with different lines)"""
        
        middle_opportunities = []
        
        # This would require fetching odds with different spreads/totals
        # and finding opportunities where you can win both bets
        
        # Implementation would be similar to arbitrage detection but looking
        # for overlapping ranges where both bets could win
        
        return middle_opportunities
    
    def _assess_arbitrage_risk(self,
                              profit_margin: float,
                              bookmakers: Dict[str, str]) -> str:
        """Assess risk level of arbitrage opportunity"""
        
        risk_factors = []
        
        # Low profit margin = higher risk
        if profit_margin < 1.0:
            risk_factors.append("Very low margin")
        elif profit_margin < 2.0:
            risk_factors.append("Low margin")
        
        # Check bookmaker reliability
        unreliable_books = [book for book in bookmakers.values() 
                           if book not in self.trusted_bookmakers]
        if unreliable_books:
            risk_factors.append("Untrusted bookmakers")
        
        # Check for same bookmaker (shouldn't happen but...)
        unique_books = set(bookmakers.values())
        if len(unique_books) < len(bookmakers):
            risk_factors.append("Same bookmaker multiple bets")
        
        # Overall risk assessment
        if not risk_factors:
            return "Low"
        elif len(risk_factors) == 1:
            return "Medium"
        else:
            return "High"
    
    def _calculate_confidence_score(self,
                                  profit_margin: float,
                                  num_bookmakers: int) -> float:
        """Calculate confidence score for arbitrage opportunity"""
        
        # Base confidence from profit margin
        margin_confidence = min(1.0, profit_margin / 5.0)  # 5% margin = 100% confidence
        
        # Bookmaker diversity bonus
        diversity_bonus = min(0.2, (num_bookmakers - 1) * 0.05)
        
        # Time factor (would decrease over time)
        time_factor = 1.0  # Assume fresh odds
        
        confidence = (margin_confidence + diversity_bonus) * time_factor
        return min(1.0, max(0.1, confidence))
    
    def _odds_to_probability(self, american_odds: float) -> float:
        """Convert American odds to implied probability"""
        if american_odds > 0:
            return 100 / (american_odds + 100)
        else:
            return abs(american_odds) / (abs(american_odds) + 100)
    
    def _odds_to_decimal(self, american_odds: float) -> float:
        """Convert American odds to decimal odds"""
        if american_odds > 0:
            return (american_odds / 100) + 1
        else:
            return (100 / abs(american_odds)) + 1
    
    def _convert_sport_name(self, sport: str) -> str:
        """Convert sport name to API format"""
        sport_mapping = {
            'nfl': 'americanfootball_nfl',
            'nba': 'basketball_nba',
            'mlb': 'baseball_mlb',
            'nhl': 'icehockey_nhl',
            'ncaaf': 'americanfootball_ncaaf',
            'ncaab': 'basketball_ncaab'
        }
        return sport_mapping.get(sport.lower(), sport.lower())
    
    def get_arbitrage_summary(self) -> Dict[str, Any]:
        """Get summary of current arbitrage opportunities"""
        
        active_arbs = list(self.active_arbitrages.values())
        
        if not active_arbs:
            return {
                'total_opportunities': 0,
                'message': 'No active arbitrage opportunities'
            }
        
        # Calculate summary statistics
        profit_margins = [arb.profit_margin for arb in active_arbs]
        expected_profits = [arb.expected_profit for arb in active_arbs]
        
        # Group by sport
        by_sport = defaultdict(list)
        for arb in active_arbs:
            by_sport[arb.sport].append(arb)
        
        # Group by risk level
        by_risk = defaultdict(list)
        for arb in active_arbs:
            by_risk[arb.risk_level].append(arb)
        
        summary = {
            'total_opportunities': len(active_arbs),
            'average_profit_margin': np.mean(profit_margins),
            'max_profit_margin': max(profit_margins),
            'total_expected_profit': sum(expected_profits),
            'opportunities_by_sport': {sport: len(arbs) for sport, arbs in by_sport.items()},
            'opportunities_by_risk': {risk: len(arbs) for risk, arbs in by_risk.items()},
            'top_opportunities': [
                {
                    'opportunity_id': arb.opportunity_id,
                    'sport': arb.sport,
                    'teams': f"{arb.teams[0]} vs {arb.teams[1]}",
                    'profit_margin': arb.profit_margin,
                    'expected_profit': arb.expected_profit,
                    'bookmakers': arb.bookmakers_involved
                }
                for arb in sorted(active_arbs, key=lambda x: x.profit_margin, reverse=True)[:5]
            ]
        }
        
        return summary
    
    def execute_arbitrage_strategy(self,
                                  opportunity: ArbitrageOpportunity,
                                  actual_stake: float) -> Dict[str, Any]:
        """Execute arbitrage strategy with given stake"""
        
        # Recalculate stakes for actual amount
        stakes_calc = self._calculate_optimal_stakes(
            {outcome: data['odds'] for outcome, data in opportunity.outcomes.items()},
            actual_stake
        )
        
        execution_plan = {
            'opportunity_id': opportunity.opportunity_id,
            'total_stake': actual_stake,
            'expected_profit': stakes_calc.guaranteed_profit,
            'profit_percentage': stakes_calc.profit_percentage,
            'bets_to_place': []
        }
        
        for outcome, data in opportunity.outcomes.items():
            bet_info = {
                'bookmaker': data['bookmaker'],
                'market': opportunity.market_type,
                'outcome': outcome,
                'odds': data['odds'],
                'stake': stakes_calc.individual_stakes[outcome],
                'potential_return': stakes_calc.individual_stakes[outcome] * self._odds_to_decimal(data['odds'])
            }
            execution_plan['bets_to_place'].append(bet_info)
        
        return execution_plan
    
    def cleanup_expired_arbitrages(self):
        """Remove expired arbitrage opportunities"""
        current_time = datetime.now()
        expired_ids = []
        
        for arb_id, arb in self.active_arbitrages.items():
            if arb.expires_at and current_time > arb.expires_at:
                expired_ids.append(arb_id)
        
        for arb_id in expired_ids:
            expired_arb = self.active_arbitrages.pop(arb_id)
            self.historical_arbitrages.append(expired_arb)
        
        logger.info(f"Cleaned up {len(expired_ids)} expired arbitrage opportunities")
    
    async def monitor_arbitrage_opportunities(self,
                                            sports: List[str],
                                            check_interval: int = 60):
        """Continuously monitor for arbitrage opportunities"""
        
        logger.info(f"Starting arbitrage monitoring for {sports}")
        
        while True:
            try:
                # Clean up expired opportunities
                self.cleanup_expired_arbitrages()
                
                # Scan for new opportunities
                new_opportunities = await self.scan_for_arbitrage(sports)
                
                if new_opportunities:
                    logger.info(f"Found {len(new_opportunities)} new arbitrage opportunities")
                    
                    # Alert for high-profit opportunities
                    for opp in new_opportunities:
                        if opp.profit_margin > 5.0:  # 5%+ profit
                            logger.warning(f"HIGH PROFIT ARBITRAGE: {opp.profit_margin:.2f}% - {opp.teams[0]} vs {opp.teams[1]}")
                
                # Wait before next scan
                await asyncio.sleep(check_interval)
                
            except Exception as e:
                logger.error(f"Error in arbitrage monitoring: {e}")
                await asyncio.sleep(check_interval)
    
    def get_arbitrage_history(self, days: int = 7) -> List[Dict[str, Any]]:
        """Get historical arbitrage opportunities"""
        
        cutoff_date = datetime.now() - timedelta(days=days)
        
        recent_history = [
            arb for arb in self.historical_arbitrages
            if arb.created_at > cutoff_date
        ]
        
        # Convert to serializable format
        history_data = []
        for arb in recent_history:
            arb_dict = asdict(arb)
            arb_dict['created_at'] = arb_dict['created_at'].isoformat()
            if arb_dict['expires_at']:
                arb_dict['expires_at'] = arb_dict['expires_at'].isoformat()
            history_data.append(arb_dict)
        
        return history_data