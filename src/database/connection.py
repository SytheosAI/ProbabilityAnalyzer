"""
PostgreSQL Database Connection Manager with Connection Pooling
Handles all database operations for the Probability Analyzer
"""

import os
import logging
import asyncio
import asyncpg
import psycopg2
from psycopg2 import pool
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import json
from contextlib import asynccontextmanager, contextmanager
from functools import wraps
import time

logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration handler"""
    
    def __init__(self):
        # Load from environment variables
        self.host = os.getenv('DB_HOST', 'localhost')
        self.port = int(os.getenv('DB_PORT', 5432))
        self.database = os.getenv('DB_NAME', 'probability_analyzer')
        self.user = os.getenv('DB_USER', 'postgres')
        self.password = os.getenv('DB_PASSWORD', '')
        
        # Connection pool settings
        self.min_connections = int(os.getenv('DB_MIN_CONNECTIONS', 2))
        self.max_connections = int(os.getenv('DB_MAX_CONNECTIONS', 20))
        self.connection_timeout = int(os.getenv('DB_CONNECTION_TIMEOUT', 10))
        
        # Retry settings
        self.max_retries = int(os.getenv('DB_MAX_RETRIES', 3))
        self.retry_delay = float(os.getenv('DB_RETRY_DELAY', 1.0))
        
    def get_connection_string(self) -> str:
        """Get PostgreSQL connection string"""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    def get_async_connection_string(self) -> str:
        """Get async PostgreSQL connection string"""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


class DatabaseConnectionPool:
    """Synchronous connection pool manager using psycopg2"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.pool = None
        self._initialize_pool()
    
    def _initialize_pool(self):
        """Initialize the connection pool"""
        try:
            self.pool = psycopg2.pool.ThreadedConnectionPool(
                self.config.min_connections,
                self.config.max_connections,
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                connect_timeout=self.config.connection_timeout
            )
            logger.info(f"Database connection pool initialized with {self.config.min_connections}-{self.config.max_connections} connections")
        except Exception as e:
            logger.error(f"Failed to initialize connection pool: {e}")
            raise
    
    @contextmanager
    def get_connection(self):
        """Get a connection from the pool"""
        conn = None
        try:
            conn = self.pool.getconn()
            yield conn
            conn.commit()
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                self.pool.putconn(conn)
    
    def close_all(self):
        """Close all connections in the pool"""
        if self.pool:
            self.pool.closeall()
            logger.info("All database connections closed")


class AsyncDatabasePool:
    """Asynchronous connection pool manager using asyncpg"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self.pool = None
    
    async def initialize(self):
        """Initialize the async connection pool"""
        try:
            self.pool = await asyncpg.create_pool(
                host=self.config.host,
                port=self.config.port,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                min_size=self.config.min_connections,
                max_size=self.config.max_connections,
                timeout=self.config.connection_timeout
            )
            logger.info(f"Async database pool initialized with {self.config.min_connections}-{self.config.max_connections} connections")
        except Exception as e:
            logger.error(f"Failed to initialize async pool: {e}")
            raise
    
    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool"""
        async with self.pool.acquire() as connection:
            yield connection
    
    async def close(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Async database pool closed")


def retry_on_failure(max_retries: int = 3, delay: float = 1.0):
    """Decorator for retrying database operations on failure"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (asyncpg.PostgresError, psycopg2.Error) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                        await asyncio.sleep(delay * (attempt + 1))
                    else:
                        logger.error(f"Database operation failed after {max_retries} attempts: {e}")
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except psycopg2.Error as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"Database operation failed (attempt {attempt + 1}/{max_retries}): {e}")
                        time.sleep(delay * (attempt + 1))
                    else:
                        logger.error(f"Database operation failed after {max_retries} attempts: {e}")
            raise last_exception
        
        # Return appropriate wrapper based on function type
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class DatabaseManager:
    """Main database manager for all operations"""
    
    def __init__(self):
        self.config = DatabaseConfig()
        self.sync_pool = DatabaseConnectionPool(self.config)
        self.async_pool = None
        self._ensure_database_exists()
    
    def _ensure_database_exists(self):
        """Ensure the database exists, create if not"""
        try:
            # Connect to default postgres database to create our database
            conn = psycopg2.connect(
                host=self.config.host,
                port=self.config.port,
                database='postgres',
                user=self.config.user,
                password=self.config.password
            )
            conn.autocommit = True
            cursor = conn.cursor()
            
            # Check if database exists
            cursor.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (self.config.database,)
            )
            
            if not cursor.fetchone():
                cursor.execute(f"CREATE DATABASE {self.config.database}")
                logger.info(f"Created database: {self.config.database}")
            
            cursor.close()
            conn.close()
        except Exception as e:
            logger.warning(f"Could not ensure database exists: {e}")
    
    async def initialize_async(self):
        """Initialize async connection pool"""
        if not self.async_pool:
            self.async_pool = AsyncDatabasePool(self.config)
            await self.async_pool.initialize()
    
    @retry_on_failure(max_retries=3)
    def execute_query(self, query: str, params: Tuple = None) -> List[Dict]:
        """Execute a SELECT query and return results"""
        with self.sync_pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            
            # Get column names
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            
            # Fetch all results
            results = cursor.fetchall()
            cursor.close()
            
            # Convert to list of dicts
            return [dict(zip(columns, row)) for row in results]
    
    @retry_on_failure(max_retries=3)
    def execute_update(self, query: str, params: Tuple = None) -> int:
        """Execute an INSERT/UPDATE/DELETE query and return affected rows"""
        with self.sync_pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            affected = cursor.rowcount
            cursor.close()
            return affected
    
    @retry_on_failure(max_retries=3)
    def execute_many(self, query: str, params_list: List[Tuple]) -> int:
        """Execute multiple INSERT/UPDATE queries"""
        with self.sync_pool.get_connection() as conn:
            cursor = conn.cursor()
            cursor.executemany(query, params_list)
            affected = cursor.rowcount
            cursor.close()
            return affected
    
    @retry_on_failure(max_retries=3)
    async def async_execute_query(self, query: str, *params) -> List[Dict]:
        """Execute an async SELECT query"""
        if not self.async_pool:
            await self.initialize_async()
        
        async with self.async_pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]
    
    @retry_on_failure(max_retries=3)
    async def async_execute_update(self, query: str, *params) -> str:
        """Execute an async INSERT/UPDATE/DELETE query"""
        if not self.async_pool:
            await self.initialize_async()
        
        async with self.async_pool.acquire() as conn:
            result = await conn.execute(query, *params)
            return result
    
    @retry_on_failure(max_retries=3)
    async def async_execute_many(self, query: str, params_list: List[Tuple]):
        """Execute multiple async queries"""
        if not self.async_pool:
            await self.initialize_async()
        
        async with self.async_pool.acquire() as conn:
            await conn.executemany(query, params_list)
    
    def create_tables(self, schema_file: str = None):
        """Create all database tables from schema"""
        if schema_file and os.path.exists(schema_file):
            with open(schema_file, 'r') as f:
                schema = f.read()
            
            with self.sync_pool.get_connection() as conn:
                cursor = conn.cursor()
                try:
                    cursor.execute(schema)
                    logger.info("Database schema created successfully")
                except Exception as e:
                    logger.error(f"Failed to create schema: {e}")
                    raise
                finally:
                    cursor.close()
    
    def close(self):
        """Close all connections"""
        self.sync_pool.close_all()
        if self.async_pool:
            asyncio.create_task(self.async_pool.close())


# Singleton instance
_db_manager = None

def get_db_manager() -> DatabaseManager:
    """Get the singleton database manager instance"""
    global _db_manager
    if _db_manager is None:
        _db_manager = DatabaseManager()
    return _db_manager


# Convenience functions for direct access
def query(sql: str, params: Tuple = None) -> List[Dict]:
    """Execute a query and return results"""
    return get_db_manager().execute_query(sql, params)

def update(sql: str, params: Tuple = None) -> int:
    """Execute an update and return affected rows"""
    return get_db_manager().execute_update(sql, params)

async def async_query(sql: str, *params) -> List[Dict]:
    """Execute an async query and return results"""
    return await get_db_manager().async_execute_query(sql, *params)

async def async_update(sql: str, *params) -> str:
    """Execute an async update"""
    return await get_db_manager().async_execute_update(sql, *params)