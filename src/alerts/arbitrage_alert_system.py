"""
Arbitrage Alert System
Real-time monitoring and alerting for arbitrage opportunities
"""

import asyncio
import logging
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import redis
from twilio.rest import Client as TwilioClient
import os

# Import our modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.connection import get_db_manager
from realtime.websocket_handler import get_websocket_handler
from data.live_data_integration import get_live_data_manager

logger = logging.getLogger(__name__)

@dataclass
class ArbitrageOpportunity:
    """Arbitrage opportunity data structure"""
    opportunity_id: str
    sport: str
    game_id: str
    teams: tuple
    market_type: str
    bookmakers: Dict[str, Dict]  # bookmaker -> odds data
    profit_margin: float
    expected_profit: float
    stake_distribution: Dict[str, float]
    confidence: float
    time_sensitivity: str  # 'immediate', 'short', 'medium'
    discovered_at: datetime
    expires_at: Optional[datetime] = None
    status: str = 'active'  # 'active', 'expired', 'executed'


@dataclass 
class AlertConfig:
    """Alert configuration"""
    min_profit_margin: float = 1.0
    min_confidence: float = 0.8
    sports: List[str] = None
    email_enabled: bool = True
    sms_enabled: bool = False
    websocket_enabled: bool = True
    discord_enabled: bool = False
    telegram_enabled: bool = False
    email_recipients: List[str] = None
    phone_numbers: List[str] = None
    discord_webhook: str = ""
    telegram_chat_id: str = ""


class ArbitrageAlertSystem:
    """System for monitoring and alerting on arbitrage opportunities"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.db = get_db_manager()
        self.ws_handler = get_websocket_handler()
        self.live_data = get_live_data_manager()
        
        # Alert configuration
        self.alert_config = AlertConfig(**self.config.get('alerts', {}))
        
        # Redis for caching and pub/sub
        self.redis_client = self._init_redis()
        
        # Email configuration
        self.smtp_config = self.config.get('smtp', {})
        
        # SMS configuration (Twilio)
        self.twilio_client = self._init_twilio()
        
        # Active opportunities tracking
        self.active_opportunities: Dict[str, ArbitrageOpportunity] = {}
        self.alerted_opportunities: Set[str] = set()
        
        # Monitoring state
        self.monitoring = False
        self.monitor_task = None
        
        # Initialize database
        self._init_database()
    
    def _init_redis(self):
        """Initialize Redis connection"""
        try:
            client = redis.Redis(
                host=os.getenv('REDIS_HOST', 'localhost'),
                port=int(os.getenv('REDIS_PORT', 6379)),
                password=os.getenv('REDIS_PASSWORD', ''),
                decode_responses=True
            )
            client.ping()
            return client
        except:
            logger.warning("Redis not available")
            return None
    
    def _init_twilio(self):
        """Initialize Twilio client for SMS"""
        try:
            account_sid = os.getenv('TWILIO_ACCOUNT_SID')
            auth_token = os.getenv('TWILIO_AUTH_TOKEN')
            if account_sid and auth_token:
                return TwilioClient(account_sid, auth_token)
        except:
            logger.warning("Twilio not configured")
        return None
    
    def _init_database(self):
        """Initialize database tables for arbitrage tracking"""
        try:
            # Check if arbitrage_opportunities table exists
            check_query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'arbitrage_opportunities'
                );
            """
            
            result = self.db.execute_query(check_query)
            
            if not result[0]['exists']:
                # Create arbitrage_opportunities table
                create_table = """
                    CREATE TABLE arbitrage_opportunities (
                        opportunity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        sport VARCHAR(50),
                        game_id VARCHAR(100),
                        teams VARCHAR(200),
                        market_type VARCHAR(50),
                        bookmakers JSONB,
                        profit_margin DECIMAL(10,4),
                        expected_profit DECIMAL(15,2),
                        stake_distribution JSONB,
                        confidence DECIMAL(5,4),
                        time_sensitivity VARCHAR(20),
                        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP,
                        status VARCHAR(20) DEFAULT 'active',
                        alerts_sent JSONB,
                        execution_details JSONB
                    );
                    
                    CREATE INDEX idx_arb_status ON arbitrage_opportunities(status);
                    CREATE INDEX idx_arb_sport ON arbitrage_opportunities(sport);
                    CREATE INDEX idx_arb_profit ON arbitrage_opportunities(profit_margin DESC);
                    CREATE INDEX idx_arb_discovered ON arbitrage_opportunities(discovered_at DESC);
                """
                self.db.execute_update(create_table)
                
                # Create alerts_log table
                create_alerts = """
                    CREATE TABLE arbitrage_alerts_log (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        opportunity_id UUID REFERENCES arbitrage_opportunities(opportunity_id),
                        alert_type VARCHAR(50),
                        recipients TEXT[],
                        message TEXT,
                        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        success BOOLEAN DEFAULT true,
                        error_message TEXT
                    );
                    
                    CREATE INDEX idx_alerts_opportunity ON arbitrage_alerts_log(opportunity_id);
                    CREATE INDEX idx_alerts_sent ON arbitrage_alerts_log(sent_at DESC);
                """
                self.db.execute_update(create_alerts)
                
                logger.info("Arbitrage alert tables created")
        
        except Exception as e:
            logger.error(f"Failed to initialize arbitrage tables: {e}")
    
    async def start_monitoring(self):
        """Start monitoring for arbitrage opportunities"""
        if self.monitoring:
            logger.warning("Monitoring already active")
            return
        
        self.monitoring = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        logger.info("Started arbitrage monitoring")
    
    async def stop_monitoring(self):
        """Stop monitoring"""
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
        logger.info("Stopped arbitrage monitoring")
    
    async def _monitor_loop(self):
        """Main monitoring loop"""
        while self.monitoring:
            try:
                # Get sports to monitor
                sports = self.alert_config.sports or ['nfl', 'nba', 'mlb', 'nhl']
                
                for sport in sports:
                    await self._check_sport_arbitrage(sport)
                
                # Clean up expired opportunities
                self._cleanup_expired()
                
                # Wait before next check
                await asyncio.sleep(30)  # Check every 30 seconds
            
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)
    
    async def _check_sport_arbitrage(self, sport: str):
        """Check for arbitrage opportunities in a sport"""
        try:
            # Fetch live odds data
            live_data = await self.live_data.fetch_all_live_data(sport)
            
            if not live_data.get('odds'):
                return
            
            # Group odds by game
            games_odds = {}
            for odds in live_data['odds']:
                game_id = odds.get('game_id')
                if game_id not in games_odds:
                    games_odds[game_id] = []
                games_odds[game_id].append(odds)
            
            # Check each game for arbitrage
            for game_id, odds_list in games_odds.items():
                opportunities = self._find_arbitrage_in_game(game_id, odds_list, sport)
                
                for opp in opportunities:
                    await self._process_opportunity(opp)
        
        except Exception as e:
            logger.error(f"Error checking {sport} arbitrage: {e}")
    
    def _find_arbitrage_in_game(self, game_id: str, odds_list: List[Dict], sport: str) -> List[ArbitrageOpportunity]:
        """Find arbitrage opportunities in a single game"""
        opportunities = []
        
        # Group by market type
        markets = {}
        for odds in odds_list:
            market = odds.get('market_type', 'moneyline')
            if market not in markets:
                markets[market] = []
            markets[market].append(odds)
        
        # Check moneyline arbitrage
        if 'moneyline' in markets:
            ml_arb = self._check_moneyline_arbitrage(game_id, markets['moneyline'], sport)
            if ml_arb:
                opportunities.append(ml_arb)
        
        # Check spread arbitrage
        if 'spread' in markets:
            spread_arb = self._check_spread_arbitrage(game_id, markets['spread'], sport)
            if spread_arb:
                opportunities.append(spread_arb)
        
        # Check total arbitrage
        if 'total' in markets:
            total_arb = self._check_total_arbitrage(game_id, markets['total'], sport)
            if total_arb:
                opportunities.append(total_arb)
        
        return opportunities
    
    def _check_moneyline_arbitrage(self, game_id: str, odds_list: List[Dict], sport: str) -> Optional[ArbitrageOpportunity]:
        """Check for moneyline arbitrage"""
        if len(odds_list) < 2:
            return None
        
        best_home_odds = -float('inf')
        best_away_odds = -float('inf')
        best_home_book = None
        best_away_book = None
        teams = None
        
        for odds in odds_list:
            home_odds = odds.get('home_odds', 0)
            away_odds = odds.get('away_odds', 0)
            bookmaker = odds.get('bookmaker')
            
            if not teams:
                teams = (odds.get('home_team', 'Home'), odds.get('away_team', 'Away'))
            
            if home_odds > best_home_odds:
                best_home_odds = home_odds
                best_home_book = bookmaker
            
            if away_odds > best_away_odds:
                best_away_odds = away_odds
                best_away_book = bookmaker
        
        if not (best_home_book and best_away_book):
            return None
        
        # Calculate implied probabilities
        home_prob = self._american_to_probability(best_home_odds)
        away_prob = self._american_to_probability(best_away_odds)
        
        total_prob = home_prob + away_prob
        
        # Check for arbitrage (total probability < 1)
        if total_prob < 1.0:
            profit_margin = (1.0 - total_prob) * 100
            
            if profit_margin >= self.alert_config.min_profit_margin:
                # Calculate optimal stake distribution
                stake_distribution = {
                    best_home_book: {
                        'team': teams[0],
                        'odds': best_home_odds,
                        'stake_percentage': away_prob / total_prob * 100
                    },
                    best_away_book: {
                        'team': teams[1],
                        'odds': best_away_odds,
                        'stake_percentage': home_prob / total_prob * 100
                    }
                }
                
                # Calculate expected profit for $1000 total stake
                expected_profit = 1000 * profit_margin / 100
                
                return ArbitrageOpportunity(
                    opportunity_id=f"{game_id}_{datetime.now().timestamp()}",
                    sport=sport,
                    game_id=game_id,
                    teams=teams,
                    market_type='moneyline',
                    bookmakers=stake_distribution,
                    profit_margin=profit_margin,
                    expected_profit=expected_profit,
                    stake_distribution=stake_distribution,
                    confidence=0.95,  # High confidence for simple moneyline
                    time_sensitivity='immediate',
                    discovered_at=datetime.now(),
                    expires_at=datetime.now() + timedelta(minutes=5)
                )
        
        return None
    
    def _check_spread_arbitrage(self, game_id: str, odds_list: List[Dict], sport: str) -> Optional[ArbitrageOpportunity]:
        """Check for spread arbitrage (middling opportunities)"""
        # Implementation for spread arbitrage
        # Look for different spreads that could both win
        pass
    
    def _check_total_arbitrage(self, game_id: str, odds_list: List[Dict], sport: str) -> Optional[ArbitrageOpportunity]:
        """Check for total arbitrage (middling opportunities)"""
        # Implementation for total arbitrage
        # Look for different totals that could both win
        pass
    
    def _american_to_probability(self, odds: float) -> float:
        """Convert American odds to implied probability"""
        if odds > 0:
            return 100 / (odds + 100)
        else:
            return abs(odds) / (abs(odds) + 100)
    
    async def _process_opportunity(self, opportunity: ArbitrageOpportunity):
        """Process a discovered arbitrage opportunity"""
        # Check if already alerted
        if opportunity.opportunity_id in self.alerted_opportunities:
            return
        
        # Check if meets criteria
        if opportunity.profit_margin < self.alert_config.min_profit_margin:
            return
        
        if opportunity.confidence < self.alert_config.min_confidence:
            return
        
        # Save to database
        self._save_opportunity(opportunity)
        
        # Add to active opportunities
        self.active_opportunities[opportunity.opportunity_id] = opportunity
        self.alerted_opportunities.add(opportunity.opportunity_id)
        
        # Send alerts
        await self._send_alerts(opportunity)
        
        # Publish to Redis for other services
        if self.redis_client:
            self.redis_client.publish(
                'arbitrage_opportunities',
                json.dumps(asdict(opportunity), default=str)
            )
    
    async def _send_alerts(self, opportunity: ArbitrageOpportunity):
        """Send alerts through configured channels"""
        tasks = []
        
        if self.alert_config.email_enabled:
            tasks.append(self._send_email_alert(opportunity))
        
        if self.alert_config.sms_enabled and self.twilio_client:
            tasks.append(self._send_sms_alert(opportunity))
        
        if self.alert_config.websocket_enabled:
            tasks.append(self._send_websocket_alert(opportunity))
        
        if self.alert_config.discord_enabled:
            tasks.append(self._send_discord_alert(opportunity))
        
        if self.alert_config.telegram_enabled:
            tasks.append(self._send_telegram_alert(opportunity))
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _send_email_alert(self, opportunity: ArbitrageOpportunity):
        """Send email alert"""
        if not self.alert_config.email_recipients:
            return
        
        try:
            subject = f"Arbitrage Alert: {opportunity.profit_margin:.2f}% Profit - {opportunity.sport.upper()}"
            
            body = f"""
            New Arbitrage Opportunity Detected!
            
            Sport: {opportunity.sport.upper()}
            Game: {opportunity.teams[0]} vs {opportunity.teams[1]}
            Market: {opportunity.market_type}
            Profit Margin: {opportunity.profit_margin:.2f}%
            Expected Profit (per $1000): ${opportunity.expected_profit:.2f}
            
            Betting Instructions:
            """
            
            for bookmaker, details in opportunity.bookmakers.items():
                body += f"\n{bookmaker}: Bet {details['stake_percentage']:.1f}% on {details['team']} at {details['odds']}"
            
            body += f"\n\nTime Sensitivity: {opportunity.time_sensitivity}"
            body += f"\nExpires: {opportunity.expires_at}"
            
            # Send email
            msg = MIMEMultipart()
            msg['From'] = self.smtp_config.get('from_email', 'alerts@probabilityanalyzer.com')
            msg['To'] = ', '.join(self.alert_config.email_recipients)
            msg['Subject'] = subject
            msg.attach(MIMEText(body, 'plain'))
            
            with smtplib.SMTP(self.smtp_config.get('host', 'localhost'), 
                             self.smtp_config.get('port', 587)) as server:
                if self.smtp_config.get('use_tls'):
                    server.starttls()
                if self.smtp_config.get('username'):
                    server.login(self.smtp_config['username'], self.smtp_config['password'])
                server.send_message(msg)
            
            logger.info(f"Email alert sent for opportunity {opportunity.opportunity_id}")
            
        except Exception as e:
            logger.error(f"Failed to send email alert: {e}")
    
    async def _send_sms_alert(self, opportunity: ArbitrageOpportunity):
        """Send SMS alert via Twilio"""
        if not self.alert_config.phone_numbers:
            return
        
        try:
            message = f"ARBITRAGE: {opportunity.sport.upper()} - {opportunity.profit_margin:.1f}% profit! {opportunity.teams[0]} vs {opportunity.teams[1]}. Check app for details."
            
            from_number = os.getenv('TWILIO_PHONE_NUMBER')
            
            for phone in self.alert_config.phone_numbers:
                self.twilio_client.messages.create(
                    body=message,
                    from_=from_number,
                    to=phone
                )
            
            logger.info(f"SMS alerts sent for opportunity {opportunity.opportunity_id}")
            
        except Exception as e:
            logger.error(f"Failed to send SMS alert: {e}")
    
    async def _send_websocket_alert(self, opportunity: ArbitrageOpportunity):
        """Send WebSocket alert"""
        try:
            await self.ws_handler.send_arbitrage_opportunity(asdict(opportunity))
            logger.info(f"WebSocket alert sent for opportunity {opportunity.opportunity_id}")
        except Exception as e:
            logger.error(f"Failed to send WebSocket alert: {e}")
    
    async def _send_discord_alert(self, opportunity: ArbitrageOpportunity):
        """Send Discord webhook alert"""
        # Implementation for Discord webhook
        pass
    
    async def _send_telegram_alert(self, opportunity: ArbitrageOpportunity):
        """Send Telegram alert"""
        # Implementation for Telegram bot
        pass
    
    def _save_opportunity(self, opportunity: ArbitrageOpportunity):
        """Save opportunity to database"""
        query = """
            INSERT INTO arbitrage_opportunities (
                opportunity_id, sport, game_id, teams, market_type,
                bookmakers, profit_margin, expected_profit,
                stake_distribution, confidence, time_sensitivity,
                discovered_at, expires_at, status
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        params = (
            opportunity.opportunity_id,
            opportunity.sport,
            opportunity.game_id,
            f"{opportunity.teams[0]} vs {opportunity.teams[1]}",
            opportunity.market_type,
            json.dumps(opportunity.bookmakers),
            opportunity.profit_margin,
            opportunity.expected_profit,
            json.dumps(opportunity.stake_distribution),
            opportunity.confidence,
            opportunity.time_sensitivity,
            opportunity.discovered_at,
            opportunity.expires_at,
            opportunity.status
        )
        
        self.db.execute_update(query, params)
    
    def _cleanup_expired(self):
        """Clean up expired opportunities"""
        now = datetime.now()
        expired = []
        
        for opp_id, opp in self.active_opportunities.items():
            if opp.expires_at and opp.expires_at < now:
                expired.append(opp_id)
        
        for opp_id in expired:
            del self.active_opportunities[opp_id]
            
            # Update database
            query = "UPDATE arbitrage_opportunities SET status = 'expired' WHERE opportunity_id = %s"
            self.db.execute_update(query, (opp_id,))
    
    def get_active_opportunities(self) -> List[ArbitrageOpportunity]:
        """Get list of active opportunities"""
        return list(self.active_opportunities.values())


# Singleton instance
_alert_system = None

def get_alert_system() -> ArbitrageAlertSystem:
    """Get singleton alert system"""
    global _alert_system
    if _alert_system is None:
        _alert_system = ArbitrageAlertSystem()
    return _alert_system