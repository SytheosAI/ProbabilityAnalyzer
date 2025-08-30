"""
WebSocket Handler for Real-Time Updates
Provides live streaming of odds changes, game updates, and alerts
"""

import asyncio
import json
import logging
from typing import Dict, Any, Set, Optional, List
from datetime import datetime
import websockets
from websockets.server import WebSocketServerProtocol
import aioredis
from dataclasses import dataclass, asdict
import uuid

logger = logging.getLogger(__name__)

@dataclass
class WebSocketMessage:
    """WebSocket message structure"""
    type: str  # 'odds_update', 'game_update', 'alert', 'arbitrage', 'pattern'
    data: Dict[str, Any]
    timestamp: datetime
    id: str = None
    
    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps({
            'id': self.id,
            'type': self.type,
            'data': self.data,
            'timestamp': self.timestamp.isoformat()
        })


class SubscriptionManager:
    """Manages WebSocket subscriptions"""
    
    def __init__(self):
        self.subscriptions: Dict[str, Set[WebSocketServerProtocol]] = {
            'all': set(),
            'odds': set(),
            'games': set(),
            'alerts': set(),
            'arbitrage': set(),
            'patterns': set()
        }
        self.client_subscriptions: Dict[WebSocketServerProtocol, Set[str]] = {}
    
    def subscribe(self, client: WebSocketServerProtocol, channels: List[str]):
        """Subscribe client to channels"""
        if client not in self.client_subscriptions:
            self.client_subscriptions[client] = set()
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].add(client)
                self.client_subscriptions[client].add(channel)
                logger.info(f"Client subscribed to {channel}")
    
    def unsubscribe(self, client: WebSocketServerProtocol, channels: List[str] = None):
        """Unsubscribe client from channels"""
        if channels is None:
            channels = self.client_subscriptions.get(client, set()).copy()
        
        for channel in channels:
            if channel in self.subscriptions:
                self.subscriptions[channel].discard(client)
                if client in self.client_subscriptions:
                    self.client_subscriptions[client].discard(channel)
    
    def remove_client(self, client: WebSocketServerProtocol):
        """Remove client from all subscriptions"""
        self.unsubscribe(client)
        if client in self.client_subscriptions:
            del self.client_subscriptions[client]
    
    def get_subscribers(self, channel: str) -> Set[WebSocketServerProtocol]:
        """Get all subscribers for a channel"""
        return self.subscriptions.get(channel, set()).copy()


class WebSocketHandler:
    """Main WebSocket handler for real-time updates"""
    
    def __init__(self, host: str = 'localhost', port: int = 8765):
        self.host = host
        self.port = port
        self.subscription_manager = SubscriptionManager()
        self.redis_client = None
        self.pubsub = None
        self.running = False
        self.update_tasks = []
    
    async def initialize_redis(self):
        """Initialize Redis connection for pub/sub"""
        try:
            self.redis_client = await aioredis.create_redis_pool(
                'redis://localhost',
                encoding='utf-8'
            )
            self.pubsub = self.redis_client.pubsub()
            await self.pubsub.subscribe(
                'odds_updates',
                'game_updates',
                'alerts',
                'arbitrage_opportunities',
                'pattern_detections'
            )
            logger.info("Redis pub/sub initialized")
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}")
    
    async def handle_client(self, websocket: WebSocketServerProtocol, path: str):
        """Handle individual WebSocket client connection"""
        client_id = str(uuid.uuid4())
        logger.info(f"New client connected: {client_id}")
        
        try:
            # Send welcome message
            welcome = WebSocketMessage(
                type='connection',
                data={'client_id': client_id, 'status': 'connected'},
                timestamp=datetime.now()
            )
            await websocket.send(welcome.to_json())
            
            # Subscribe to 'all' channel by default
            self.subscription_manager.subscribe(websocket, ['all'])
            
            # Handle messages from client
            async for message in websocket:
                await self.handle_client_message(websocket, message)
        
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        
        except Exception as e:
            logger.error(f"Error handling client {client_id}: {e}")
        
        finally:
            self.subscription_manager.remove_client(websocket)
    
    async def handle_client_message(self, websocket: WebSocketServerProtocol, message: str):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            msg_type = data.get('type')
            
            if msg_type == 'subscribe':
                channels = data.get('channels', [])
                self.subscription_manager.subscribe(websocket, channels)
                
                response = WebSocketMessage(
                    type='subscription_confirmed',
                    data={'channels': channels},
                    timestamp=datetime.now()
                )
                await websocket.send(response.to_json())
            
            elif msg_type == 'unsubscribe':
                channels = data.get('channels', [])
                self.subscription_manager.unsubscribe(websocket, channels)
                
                response = WebSocketMessage(
                    type='unsubscription_confirmed',
                    data={'channels': channels},
                    timestamp=datetime.now()
                )
                await websocket.send(response.to_json())
            
            elif msg_type == 'ping':
                response = WebSocketMessage(
                    type='pong',
                    data={'timestamp': datetime.now().isoformat()},
                    timestamp=datetime.now()
                )
                await websocket.send(response.to_json())
            
            else:
                logger.warning(f"Unknown message type: {msg_type}")
        
        except json.JSONDecodeError:
            logger.error(f"Invalid JSON received: {message}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def broadcast_to_channel(self, channel: str, message: WebSocketMessage):
        """Broadcast message to all subscribers of a channel"""
        subscribers = self.subscription_manager.get_subscribers(channel)
        
        if subscribers:
            message_json = message.to_json()
            
            # Send to all subscribers concurrently
            tasks = []
            for client in subscribers:
                tasks.append(self.send_safe(client, message_json))
            
            await asyncio.gather(*tasks)
            logger.debug(f"Broadcasted to {len(subscribers)} clients on {channel}")
    
    async def send_safe(self, client: WebSocketServerProtocol, message: str):
        """Safely send message to client"""
        try:
            await client.send(message)
        except websockets.exceptions.ConnectionClosed:
            self.subscription_manager.remove_client(client)
        except Exception as e:
            logger.error(f"Error sending message to client: {e}")
    
    async def redis_listener(self):
        """Listen for Redis pub/sub messages and broadcast to WebSocket clients"""
        if not self.pubsub:
            return
        
        channel_mapping = {
            'odds_updates': 'odds',
            'game_updates': 'games',
            'alerts': 'alerts',
            'arbitrage_opportunities': 'arbitrage',
            'pattern_detections': 'patterns'
        }
        
        try:
            while self.running:
                message = await self.pubsub.get_message(timeout=1.0)
                
                if message and message['type'] == 'message':
                    redis_channel = message['channel']
                    ws_channel = channel_mapping.get(redis_channel, 'all')
                    
                    try:
                        data = json.loads(message['data'])
                        
                        ws_message = WebSocketMessage(
                            type=ws_channel,
                            data=data,
                            timestamp=datetime.now()
                        )
                        
                        # Broadcast to channel subscribers and 'all' subscribers
                        await self.broadcast_to_channel(ws_channel, ws_message)
                        if ws_channel != 'all':
                            await self.broadcast_to_channel('all', ws_message)
                    
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON from Redis: {message['data']}")
        
        except Exception as e:
            logger.error(f"Redis listener error: {e}")
    
    async def send_odds_update(self, odds_data: Dict[str, Any]):
        """Send odds update to subscribers"""
        message = WebSocketMessage(
            type='odds_update',
            data=odds_data,
            timestamp=datetime.now()
        )
        await self.broadcast_to_channel('odds', message)
        await self.broadcast_to_channel('all', message)
    
    async def send_game_update(self, game_data: Dict[str, Any]):
        """Send game update to subscribers"""
        message = WebSocketMessage(
            type='game_update',
            data=game_data,
            timestamp=datetime.now()
        )
        await self.broadcast_to_channel('games', message)
        await self.broadcast_to_channel('all', message)
    
    async def send_alert(self, alert_data: Dict[str, Any]):
        """Send alert to subscribers"""
        message = WebSocketMessage(
            type='alert',
            data=alert_data,
            timestamp=datetime.now()
        )
        await self.broadcast_to_channel('alerts', message)
        await self.broadcast_to_channel('all', message)
    
    async def send_arbitrage_opportunity(self, arb_data: Dict[str, Any]):
        """Send arbitrage opportunity to subscribers"""
        message = WebSocketMessage(
            type='arbitrage_opportunity',
            data=arb_data,
            timestamp=datetime.now()
        )
        await self.broadcast_to_channel('arbitrage', message)
        await self.broadcast_to_channel('alerts', message)
        await self.broadcast_to_channel('all', message)
    
    async def send_pattern_detection(self, pattern_data: Dict[str, Any]):
        """Send pattern detection to subscribers"""
        message = WebSocketMessage(
            type='pattern_detection',
            data=pattern_data,
            timestamp=datetime.now()
        )
        await self.broadcast_to_channel('patterns', message)
        await self.broadcast_to_channel('all', message)
    
    async def start(self):
        """Start WebSocket server"""
        self.running = True
        
        # Initialize Redis
        await self.initialize_redis()
        
        # Start Redis listener
        if self.redis_client:
            redis_task = asyncio.create_task(self.redis_listener())
            self.update_tasks.append(redis_task)
        
        # Start WebSocket server
        logger.info(f"Starting WebSocket server on {self.host}:{self.port}")
        
        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info(f"WebSocket server running on ws://{self.host}:{self.port}")
            
            # Keep server running
            try:
                await asyncio.Future()  # Run forever
            except KeyboardInterrupt:
                logger.info("WebSocket server shutting down")
    
    async def stop(self):
        """Stop WebSocket server"""
        self.running = False
        
        # Cancel update tasks
        for task in self.update_tasks:
            task.cancel()
        
        # Close Redis connection
        if self.redis_client:
            self.redis_client.close()
            await self.redis_client.wait_closed()
        
        logger.info("WebSocket server stopped")


class WebSocketClient:
    """WebSocket client for testing and integration"""
    
    def __init__(self, uri: str = 'ws://localhost:8765'):
        self.uri = uri
        self.websocket = None
    
    async def connect(self):
        """Connect to WebSocket server"""
        self.websocket = await websockets.connect(self.uri)
        logger.info(f"Connected to {self.uri}")
    
    async def subscribe(self, channels: List[str]):
        """Subscribe to channels"""
        message = {
            'type': 'subscribe',
            'channels': channels
        }
        await self.websocket.send(json.dumps(message))
    
    async def listen(self):
        """Listen for messages"""
        async for message in self.websocket:
            data = json.loads(message)
            logger.info(f"Received: {data}")
            yield data
    
    async def close(self):
        """Close connection"""
        if self.websocket:
            await self.websocket.close()


# Singleton instance
_ws_handler = None

def get_websocket_handler() -> WebSocketHandler:
    """Get singleton WebSocket handler"""
    global _ws_handler
    if _ws_handler is None:
        _ws_handler = WebSocketHandler()
    return _ws_handler


# For running as standalone server
if __name__ == "__main__":
    handler = get_websocket_handler()
    asyncio.run(handler.start())