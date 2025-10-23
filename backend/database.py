"""
database.py - Lightweight SQLite backend for persistent storage
Features:
- Optional storage (controlled by config)
- Automatic schema migrations
- Efficient queries with indexes
- Memory-efficient batch operations
- Auto-cleanup of old data
"""

import asyncio
import logging
import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict, Optional, Any
from contextlib import asynccontextmanager
import aiosqlite

logger = logging.getLogger(__name__)


class Database:
    """Lightweight SQLite database with async support."""
    
    def __init__(
        self,
        db_path: str = "ainetui.db",
        enabled: bool = True,
        retention_days: int = 7,
        batch_size: int = 100
    ):
        """
        Initialize database.
        
        Args:
            db_path: Path to SQLite database file
            enabled: Whether to enable persistent storage
            retention_days: Days to keep data (0 = forever)
            batch_size: Number of records to insert in single transaction
        """
        self.db_path = Path(db_path)
        self.enabled = enabled
        self.retention_days = retention_days
        self.batch_size = batch_size
        self.db: Optional[aiosqlite.Connection] = None
        
        # Batch insertion buffers
        self._event_buffer: List[Dict] = []
        self._buffer_lock = asyncio.Lock()
        
        logger.info(f"Database initialized: enabled={enabled}, path={db_path}, retention={retention_days}d")
    
    async def initialize(self):
        """Initialize database connection and schema."""
        if not self.enabled:
            logger.info("Database storage disabled")
            return
        
        try:
            # Create database directory if needed
            self.db_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Connect to database
            self.db = await aiosqlite.connect(str(self.db_path))
            self.db.row_factory = aiosqlite.Row
            
            # Enable WAL mode for better concurrent access
            await self.db.execute("PRAGMA journal_mode=WAL")
            await self.db.execute("PRAGMA synchronous=NORMAL")
            await self.db.commit()
            
            # Create schema
            await self._create_schema()
            
            logger.info(f"Database connected: {self.db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            self.enabled = False
    
    async def _create_schema(self):
        """Create database schema with indexes."""
        
        # Events table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                src TEXT NOT NULL,
                dst TEXT NOT NULL,
                proto TEXT NOT NULL,
                src_port INTEGER,
                dst_port INTEGER,
                flows INTEGER NOT NULL,
                total_bytes INTEGER NOT NULL,
                anomaly_score REAL NOT NULL,
                is_anomaly BOOLEAN NOT NULL,
                severity TEXT,
                detection_methods TEXT,  -- JSON array
                threat_indicators TEXT,  -- JSON array
                summary TEXT,
                ai_explanation TEXT,
                ai_processed BOOLEAN,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Indexes for fast queries
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_timestamp 
            ON events(timestamp DESC)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_anomaly 
            ON events(is_anomaly, timestamp DESC)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_severity 
            ON events(severity, timestamp DESC)
        """)
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_events_src_dst 
            ON events(src, dst)
        """)
        
        # Incidents table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                severity TEXT NOT NULL,
                status TEXT NOT NULL,
                assigned_to TEXT,
                event_ids TEXT,  -- JSON array of related event IDs
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                resolved_at TEXT
            )
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_incidents_status 
            ON incidents(status, created_at DESC)
        """)
        
        # Alert rules table
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS alert_rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                rule_type TEXT NOT NULL,
                conditions TEXT NOT NULL,  -- JSON
                actions TEXT NOT NULL,     -- JSON
                enabled BOOLEAN NOT NULL DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Query history table (for AI chat)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS query_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                response TEXT NOT NULL,
                model TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                response_time_ms INTEGER
            )
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_query_history_timestamp 
            ON query_history(timestamp DESC)
        """)
        
        # Metrics table (for historical stats)
        await self.db.execute("""
            CREATE TABLE IF NOT EXISTS metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                metric_type TEXT NOT NULL,
                value REAL NOT NULL,
                metadata TEXT  -- JSON
            )
        """)
        
        await self.db.execute("""
            CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp 
            ON metrics(metric_type, timestamp DESC)
        """)
        
        await self.db.commit()
        logger.info("Database schema created/verified")
    
    # ==================== Events ====================
    
    async def save_event(self, event: Dict[str, Any]):
        """Save single event (buffered for batch insert)."""
        if not self.enabled:
            return
        
        async with self._buffer_lock:
            self._event_buffer.append(event)
            
            # Flush buffer if it reaches batch size
            if len(self._event_buffer) >= self.batch_size:
                await self._flush_event_buffer()
    
    async def _flush_event_buffer(self):
        """Flush event buffer to database."""
        if not self._event_buffer:
            return
        
        try:
            events = self._event_buffer.copy()
            self._event_buffer.clear()
            
            # Prepare batch insert
            rows = []
            for event in events:
                rows.append((
                    event.get('timestamp'),
                    event.get('src'),
                    event.get('dst'),
                    event.get('proto'),
                    event.get('src_port'),
                    event.get('dst_port'),
                    event.get('flows'),
                    event.get('total_bytes'),
                    event.get('anomaly_score', 0.0),
                    event.get('is_anomaly', False),
                    event.get('severity'),
                    json.dumps(event.get('detection_methods', [])),
                    json.dumps(event.get('threat_indicators', [])),
                    event.get('summary'),
                    event.get('ai_explanation'),
                    event.get('ai_processed', False)
                ))
            
            # Batch insert
            await self.db.executemany("""
                INSERT INTO events (
                    timestamp, src, dst, proto, src_port, dst_port,
                    flows, total_bytes, anomaly_score, is_anomaly,
                    severity, detection_methods, threat_indicators,
                    summary, ai_explanation, ai_processed
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, rows)
            
            await self.db.commit()
            logger.debug(f"Flushed {len(rows)} events to database")
            
        except Exception as e:
            logger.error(f"Error flushing event buffer: {e}")
    
    async def get_events(
        self,
        limit: int = 100,
        offset: int = 0,
        anomaly_only: bool = False,
        severity: Optional[str] = None,
        src: Optional[str] = None,
        dst: Optional[str] = None,
        proto: Optional[str] = None,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> List[Dict]:
        """Get events with filtering and pagination."""
        if not self.enabled:
            return []
        
        try:
            # Build query
            query = "SELECT * FROM events WHERE 1=1"
            params = []
            
            if anomaly_only:
                query += " AND is_anomaly = 1"
            
            if severity:
                query += " AND severity = ?"
                params.append(severity)
            
            if src:
                query += " AND src = ?"
                params.append(src)
            
            if dst:
                query += " AND dst = ?"
                params.append(dst)
            
            if proto:
                query += " AND proto = ?"
                params.append(proto)
            
            if start_time:
                query += " AND timestamp >= ?"
                params.append(start_time)
            
            if end_time:
                query += " AND timestamp <= ?"
                params.append(end_time)
            
            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            # Execute query
            async with self.db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                # Convert to dictionaries
                events = []
                for row in rows:
                    event = dict(row)
                    # Parse JSON fields
                    event['detection_methods'] = json.loads(event.get('detection_methods', '[]'))
                    event['threat_indicators'] = json.loads(event.get('threat_indicators', '[]'))
                    events.append(event)
                
                return events
        
        except Exception as e:
            logger.error(f"Error fetching events: {e}")
            return []
    
    async def get_event_count(self, anomaly_only: bool = False) -> int:
        """Get total event count."""
        if not self.enabled:
            return 0
        
        try:
            query = "SELECT COUNT(*) as count FROM events"
            if anomaly_only:
                query += " WHERE is_anomaly = 1"
            
            async with self.db.execute(query) as cursor:
                row = await cursor.fetchone()
                return row['count'] if row else 0
        
        except Exception as e:
            logger.error(f"Error counting events: {e}")
            return 0
    
    # ==================== Incidents ====================
    
    async def save_incident(self, incident: Dict[str, Any]):
        """Save or update incident."""
        if not self.enabled:
            return
        
        try:
            await self.db.execute("""
                INSERT OR REPLACE INTO incidents (
                    id, title, description, severity, status,
                    assigned_to, event_ids, created_at, updated_at, resolved_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                incident['id'],
                incident['title'],
                incident.get('description'),
                incident['severity'],
                incident['status'],
                incident.get('assignedTo'),
                json.dumps(incident.get('relatedEvents', [])),
                incident['createdAt'],
                incident['updatedAt'],
                incident.get('resolvedAt')
            ))
            
            await self.db.commit()
            logger.debug(f"Saved incident: {incident['id']}")
            
        except Exception as e:
            logger.error(f"Error saving incident: {e}")
    
    async def get_incidents(self, status: Optional[str] = None) -> List[Dict]:
        """Get incidents, optionally filtered by status."""
        if not self.enabled:
            return []
        
        try:
            query = "SELECT * FROM incidents"
            params = []
            
            if status:
                query += " WHERE status = ?"
                params.append(status)
            
            query += " ORDER BY created_at DESC"
            
            async with self.db.execute(query, params) as cursor:
                rows = await cursor.fetchall()
                
                incidents = []
                for row in rows:
                    incident = dict(row)
                    incident['event_ids'] = json.loads(incident.get('event_ids', '[]'))
                    incidents.append(incident)
                
                return incidents
        
        except Exception as e:
            logger.error(f"Error fetching incidents: {e}")
            return []
    
    async def delete_incident(self, incident_id: str):
        """Delete incident."""
        if not self.enabled:
            return
        
        try:
            await self.db.execute("DELETE FROM incidents WHERE id = ?", (incident_id,))
            await self.db.commit()
            logger.debug(f"Deleted incident: {incident_id}")
        
        except Exception as e:
            logger.error(f"Error deleting incident: {e}")
    
    # ==================== Query History ====================
    
    async def save_query(
        self,
        query: str,
        response: str,
        model: str,
        response_time_ms: int
    ):
        """Save AI query/response."""
        if not self.enabled:
            return
        
        try:
            await self.db.execute("""
                INSERT INTO query_history (query, response, model, response_time_ms)
                VALUES (?, ?, ?, ?)
            """, (query, response, model, response_time_ms))
            
            await self.db.commit()
        
        except Exception as e:
            logger.error(f"Error saving query: {e}")
    
    async def get_query_history(self, limit: int = 50) -> List[Dict]:
        """Get recent query history."""
        if not self.enabled:
            return []
        
        try:
            async with self.db.execute(
                "SELECT * FROM query_history ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(row) for row in rows]
        
        except Exception as e:
            logger.error(f"Error fetching query history: {e}")
            return []
    
    # ==================== Metrics ====================
    
    async def save_metric(
        self,
        metric_type: str,
        value: float,
        metadata: Optional[Dict] = None
    ):
        """Save metric value."""
        if not self.enabled:
            return
        
        try:
            await self.db.execute("""
                INSERT INTO metrics (timestamp, metric_type, value, metadata)
                VALUES (datetime('now'), ?, ?, ?)
            """, (metric_type, value, json.dumps(metadata or {})))
            
            await self.db.commit()
        
        except Exception as e:
            logger.error(f"Error saving metric: {e}")
    
    async def get_metrics(
        self,
        metric_type: str,
        hours: int = 24
    ) -> List[Dict]:
        """Get metrics for time range."""
        if not self.enabled:
            return []
        
        try:
            async with self.db.execute("""
                SELECT * FROM metrics 
                WHERE metric_type = ? 
                  AND timestamp >= datetime('now', '-' || ? || ' hours')
                ORDER BY timestamp ASC
            """, (metric_type, hours)) as cursor:
                rows = await cursor.fetchall()
                
                metrics = []
                for row in rows:
                    metric = dict(row)
                    metric['metadata'] = json.loads(metric.get('metadata', '{}'))
                    metrics.append(metric)
                
                return metrics
        
        except Exception as e:
            logger.error(f"Error fetching metrics: {e}")
            return []
    
    # ==================== Cleanup ====================
    
    async def cleanup_old_data(self):
        """Delete data older than retention period."""
        if not self.enabled or self.retention_days == 0:
            return
        
        try:
            cutoff_date = (datetime.now() - timedelta(days=self.retention_days)).isoformat()
            
            # Delete old events
            cursor = await self.db.execute(
                "DELETE FROM events WHERE timestamp < ?",
                (cutoff_date,)
            )
            events_deleted = cursor.rowcount
            
            # Delete old query history
            cursor = await self.db.execute(
                "DELETE FROM query_history WHERE timestamp < ?",
                (cutoff_date,)
            )
            queries_deleted = cursor.rowcount
            
            # Delete old metrics
            cursor = await self.db.execute(
                "DELETE FROM metrics WHERE timestamp < ?",
                (cutoff_date,)
            )
            metrics_deleted = cursor.rowcount
            
            await self.db.commit()
            
            # Vacuum to reclaim space
            await self.db.execute("VACUUM")
            
            logger.info(
                f"Cleanup complete: {events_deleted} events, "
                f"{queries_deleted} queries, {metrics_deleted} metrics deleted"
            )
        
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")
    
    async def start_cleanup_task(self, interval_hours: int = 24):
        """Start periodic cleanup task."""
        logger.info(f"Starting cleanup task (every {interval_hours}h)")
        
        while True:
            try:
                await asyncio.sleep(interval_hours * 3600)
                await self.cleanup_old_data()
            
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    # ==================== Database Management ====================
    
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            stats = {"enabled": True, "path": str(self.db_path)}
            
            # Get table counts
            async with self.db.execute("SELECT COUNT(*) as count FROM events") as cursor:
                row = await cursor.fetchone()
                stats['events_count'] = row['count']
            
            async with self.db.execute("SELECT COUNT(*) as count FROM incidents") as cursor:
                row = await cursor.fetchone()
                stats['incidents_count'] = row['count']
            
            async with self.db.execute("SELECT COUNT(*) as count FROM query_history") as cursor:
                row = await cursor.fetchone()
                stats['queries_count'] = row['count']
            
            async with self.db.execute("SELECT COUNT(*) as count FROM metrics") as cursor:
                row = await cursor.fetchone()
                stats['metrics_count'] = row['count']
            
            # Get database size
            stats['size_mb'] = round(self.db_path.stat().st_size / 1024 / 1024, 2)
            
            return stats
        
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {"enabled": True, "error": str(e)}
    
    async def close(self):
        """Close database connection and flush buffers."""
        if not self.enabled or not self.db:
            return
        
        try:
            # Flush any remaining buffered events
            async with self._buffer_lock:
                await self._flush_event_buffer()
            
            await self.db.close()
            logger.info("Database connection closed")
        
        except Exception as e:
            logger.error(f"Error closing database: {e}")


# Global database instance
db: Optional[Database] = None


def get_db() -> Database:
    """Get global database instance."""
    global db
    if db is None:
        raise RuntimeError("Database not initialized. Call initialize_database() first.")
    return db


async def initialize_database(
    db_path: str = "ainetui.db",
    enabled: bool = True,
    retention_days: int = 7,
    batch_size: int = 100
) -> Database:
    """Initialize global database instance."""
    global db
    db = Database(
        db_path=db_path,
        enabled=enabled,
        retention_days=retention_days,
        batch_size=batch_size
    )
    await db.initialize()
    return db
