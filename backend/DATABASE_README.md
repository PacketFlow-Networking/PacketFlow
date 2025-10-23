# Database Feature - Lightweight SQLite Storage

## Overview

AINetUI now includes **optional persistent storage** using SQLite - a lightweight, file-based database that requires no separate server installation. Data is stored locally in a single `ainetui.db` file.

## Features

 **Zero Configuration** - Works out of the box, no database server needed  
 **Optional** - Can be disabled entirely via config  
 **Lightweight** - Minimal memory and CPU overhead  
 **Automatic Cleanup** - Old data auto-deleted based on retention policy  
 **Batch Operations** - Events inserted in batches for performance  
 **Granular Control** - Choose what to store (events, incidents, queries, metrics)  
 **REST API** - Query stored data via HTTP endpoints  

## What Gets Stored

### Events
- Network flow events with anomaly detection results
- AI explanations and threat indicators
- Indexed by timestamp, anomaly status, severity, source/destination

### Incidents
- User-created incident reports
- Status tracking (open, investigating, resolved)
- Links to related events

### Query History
- AI chat queries and responses
- Response times for performance monitoring

### Metrics (Optional)
- Historical system metrics
- Packet rates, flow counts, etc.

## Configuration

All settings are in `backend/.env`:

```bash
# Enable/disable database
DB_ENABLED=true

# Database file location
DB_PATH=ainetui.db

# Keep data for 7 days (0 = forever)
DB_RETENTION_DAYS=7

# Insert events in batches of 100
DB_BATCH_SIZE=100

# Clean up old data every 24 hours
DB_CLEANUP_INTERVAL_HOURS=24

# Granular storage control
DB_STORE_EVENTS=true      # Network events
DB_STORE_INCIDENTS=true   # User incidents
DB_STORE_QUERIES=true     # AI chat history
DB_STORE_METRICS=false    # System metrics (disabled by default)
```

## Usage Examples

### Start Backend with Database

```powershell
cd backend
pip install -r requirements.txt  # Installs aiosqlite
python main.py
```

The database file `ainetui.db` will be created automatically in the backend folder.

### Query Stored Events via REST API

```bash
# Get last 100 events
curl http://localhost:8000/api/events

# Get only anomalies
curl http://localhost:8000/api/events?anomaly_only=true

# Filter by severity
curl http://localhost:8000/api/events?severity=CRITICAL

# Filter by time range
curl "http://localhost:8000/api/events?start_time=2025-10-23T00:00:00&limit=50"

# Pagination
curl http://localhost:8000/api/events?limit=50&offset=100
```

### Get Database Statistics

```bash
curl http://localhost:8000/api/database/stats
```

Returns:
```json
{
  "enabled": true,
  "path": "ainetui.db",
  "events_count": 15420,
  "incidents_count": 3,
  "queries_count": 47,
  "metrics_count": 0,
  "size_mb": 12.8
}
```

### Query Incidents

```bash
# All incidents
curl http://localhost:8000/api/incidents

# Filter by status
curl http://localhost:8000/api/incidents?status=open
```

### Get AI Query History

```bash
# Last 50 queries
curl http://localhost:8000/api/query-history?limit=50
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | GET | Get stored events with filtering |
| `/api/incidents` | GET | Get stored incidents |
| `/api/query-history` | GET | Get AI query history |
| `/api/database/stats` | GET | Get database statistics |

### Query Parameters for `/api/events`

- `limit` (int) - Number of events to return (default: 100)
- `offset` (int) - Pagination offset (default: 0)
- `anomaly_only` (bool) - Only anomalies (default: false)
- `severity` (string) - Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)
- `src` (string) - Filter by source IP
- `dst` (string) - Filter by destination IP
- `proto` (string) - Filter by protocol (TCP, UDP, etc.)
- `start_time` (ISO 8601) - Events after this time
- `end_time` (ISO 8601) - Events before this time

## Performance

### Batch Insertion
Events are buffered and inserted in batches (default: 100 events per transaction) for optimal performance.

### Indexes
Database has indexes on:
- Timestamp (for time-range queries)
- Anomaly status (for filtering anomalies)
- Severity (for filtering by threat level)
- Source/destination IPs (for network analysis)

### Write-Ahead Logging (WAL)
SQLite is configured with WAL mode for better concurrent read/write performance.

## Storage Requirements

Typical storage per event: **~1-2 KB**

| Events/Day | Storage/Day | Storage/Week |
|------------|-------------|--------------|
| 10,000 | ~15 MB | ~100 MB |
| 100,000 | ~150 MB | ~1 GB |
| 1,000,000 | ~1.5 GB | ~10 GB |

**Note:** With default 7-day retention, old data is automatically deleted.

## Disabling the Database

To run without persistent storage:

```bash
# Edit .env
DB_ENABLED=false
```

System will work as before - all data in memory only.

## Database Schema

### Events Table
```sql
CREATE TABLE events (
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
);
```

### Incidents Table
```sql
CREATE TABLE incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_to TEXT,
    event_ids TEXT,  -- JSON array
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT
);
```

### Query History Table
```sql
CREATE TABLE query_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    model TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER
);
```

## Troubleshooting

### Database File Locked
If you see "database is locked" errors:
1. Only one backend instance can access the database
2. Close any SQLite browser tools
3. WAL mode helps prevent most locking issues

### Database Growing Too Large
1. Reduce `DB_RETENTION_DAYS` (e.g., from 7 to 3 days)
2. Disable storing normal events, only anomalies:
   ```python
   # In database.py, modify save_event() to check:
   if event.get('is_anomaly'):
       await self.database.save_event(event)
   ```

### Slow Queries
1. Increase `DB_BATCH_SIZE` for faster inserts
2. Add more specific filters to queries
3. Use pagination (`limit` and `offset`)

## Advanced Usage

### Manual Database Inspection

```powershell
# Install SQLite browser
# https://sqlitebrowser.org/

# Or use CLI
sqlite3 ainetui.db
.tables
SELECT COUNT(*) FROM events;
SELECT * FROM events WHERE is_anomaly=1 LIMIT 10;
```

### Backup Database

```powershell
# Simple file copy (stop backend first)
copy ainetui.db ainetui_backup.db

# Or use SQLite backup
sqlite3 ainetui.db ".backup ainetui_backup.db"
```

### Custom Queries

```python
from database import get_db

db = get_db()

# Custom SQL query
async with db.db.execute("""
    SELECT src, COUNT(*) as count 
    FROM events 
    WHERE is_anomaly = 1 
    GROUP BY src 
    ORDER BY count DESC 
    LIMIT 10
""") as cursor:
    top_attackers = await cursor.fetchall()
```

## Future Enhancements

Potential improvements (not yet implemented):
- [ ] PostgreSQL support for multi-user environments
- [ ] Event aggregation for long-term storage (reduce detail for old events)
- [ ] Export to CSV/JSON from API
- [ ] Full-text search on AI explanations
- [ ] Automatic backup scheduling

## Notes

- Database writes are **asynchronous** and non-blocking
- Failed database operations are logged but don't crash the system
- In-memory event streaming continues even if database is disabled
- Database file can be safely deleted - will be recreated on next startup
