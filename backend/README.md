# PacketFlow Backend

**Enterprise-grade real-time network security monitoring engine** with local AI reasoning, packet capture, flow aggregation, and anomaly detection. Privacy-first, no cloud dependencies.

---

##  Architecture Overview

The backend follows a **7-tier functional architecture** designed for scalability, testability, and maintainability:

```
                      ENTRY POINT                                                     main.py (orchestrator)                                                                                                                                                                                   CFG  API  CORE     PERSIST.   OBSERVABILITY  INFRASTRUCTURE
                                                     1     2       3          4              5               6
                            
                    7: TESTS (integration/unit/e2e)
```

---

##  Root Directory Structure

**Key directories:**
- `config/` - Configuration management
- `core/` - Business logic (capture, condense, AI)
- `api/` - REST/WebSocket API layer
- `persistence/` - Database operations
- `observability/` - Metrics and monitoring
- `infrastructure/` - Tasks and lifecycle management
- `tests/` - Test suite
- `utils/` - Development utilities
- `docs/` - Documentation
- `test-data/` - PCAP files for testing
- `logs/` - Generated runtime files (database, logs)
- `_deprecated/` - Legacy code reference

**Root configuration files:**
- `.env` - Main configuration
- `.env.enhanced` - Alternative configuration
- `main.py` - Application entry point
- `README.md` - This file
- `pyproject.toml` - Python project metadata
- `requirements.txt` - Python dependencies
- `Dockerfile` - Container configuration

---

##  Directory Structure & Components

### **1. `config/` - Configuration Management**

**Purpose:** Centralized configuration loaded from environment variables at startup.

**Location:** `backend/config/`

**Files:**
- `settings.py` - Main configuration class with all subsystems
- `__init__.py` - Module exports

**Key Features:**
- Environment-based configuration (`.env` file support)
- Type-safe configuration with validation
- Subsystem configs: Capture, Condenser, AI, Server, Database
- Runtime configuration access throughout the app

**Usage:**
```python
from config import config
# Access capture interface
interface = config.capture.interface
# Access AI model URL
ollama_url = config.ai.ollama_url
```

**Configuration Sections:**
- `CaptureConfig` - Packet capture source (mock/PCAP/live)
- `CondenserConfig` - Flow aggregation and anomaly thresholds
- `AIConfig` - AI model, Ollama URL, timeout settings
- `ServerConfig` - FastAPI server port, log level, log file
- `DatabaseConfig` - SQLite settings, retention, batch size

---

### **2. `api/` - HTTP & WebSocket API Layer**

**Purpose:** Expose backend functionality via REST and WebSocket endpoints for frontend communication.

**Location:** `backend/api/`

**Files:**
- `websocket_server.py` - FastAPI app, WebSocket handler, REST endpoints
- `middleware/` - (placeholder for auth, CORS, rate limiting)
- `routes/` - (placeholder for modular endpoint organization)
- `__init__.py` - Module exports

**Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/status` | GET | System metrics (packets/sec, flows, anomalies, uptime) |
| `/health` | GET | Health check for load balancers |
| `/metrics` | GET | Prometheus metrics (if enabled) |
| `/api/events` | GET | Query stored events (with filters/pagination) |
| `/api/incidents` | GET | Query stored incidents |
| `/api/query-history` | GET | Get AI query history |
| `/api/database/stats` | GET | Database statistics |
| `/api/query` | POST | Send natural language query to AI (rate-limited) |
| WebSocket `/ws` | - | Real-time event stream (auto-reconnect support) |

**Message Format (WebSocket):**
```json
{
  "type": "network_event",
  "data": {
    "timestamp": "2025-10-21T15:30:45.123Z",
    "src": "192.168.1.10",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "flows": 500,
    "total_bytes": 125000,
    "anomaly_score": 0.91,
    "is_anomaly": true,
    "detection_methods": ["Z-Score", "Protocol"],
    "threat_indicators": ["DNS_TUNNELING"],
    "summary": "ANOMALY [CRITICAL]: DNS spike detected...",
    "ai_explanation": "Detected DNS tunneling attempt...",
    "ai_processed": true
  }
}
```

---

### **3. `core/` - Business Logic & Data Processing**

**Purpose:** Core algorithmic components that process network packets and generate insights.

**Location:** `backend/core/`

**Subdirectories:**

#### **`core/capture/` - Packet Acquisition**

**Files:**
- `capture.py` - Multi-source packet capture engine

**Purpose:** Read network packets from three possible sources:
1. **Mock mode** - Simulated traffic (default, no TShark needed)
2. **PCAP file replay** - Reproduce attacks from recorded files
3. **Live capture** - Real-time TShark integration (requires admin rights)

**Key Features:**
- Async packet reading without blocking
- Source selection via `MOCK_MODE` and `PCAP_FILE` config
- Configurable packet speed for PCAP replay
- Automatic looping for test data
- Graceful error handling

**Configuration:**
```env
MOCK_MODE=true              # Use simulated packets
PCAP_FILE=test-data/dns-remoteshell.pcap  # File to replay
PCAP_SPEED=1.0              # Playback speed (1.0 = realtime)
PCAP_LOOP=true              # Loop file indefinitely
```

---

#### **`core/condense/` - Flow Aggregation & Anomaly Detection**

**Files:**
- `condenser.py` - Industrial-grade flow condenser (8-method anomaly detection)

**Purpose:** Transform raw packets into meaningful network flows with security scoring.

**Key Features:**
- **Flow aggregation** - Groups packets by src/dst/proto/port
- **8-method anomaly detection**:
  1. Z-Score - Statistical spike detection
  2. IQR - Robust median-based detection
  3. EWMA - Exponentially weighted moving average
  4. Rate-Based - Threshold on packets/sec
  5. Behavioral - Entropy and inter-arrival analysis
  6. Port Scan - Unique destination port tracking
  7. Protocol-Specific - DNS tunneling, HTTP attacks, TLS weaknesses
  8. Payload Threats - SQL injection, XSS, command injection detection

- **Severity scoring** - 0.0 to 1.0 scale (0.9+ = CRITICAL)
- **Threat indicators** - Tagged anomaly types
- **Warmup phase** - 50 seconds baseline establishment
- **Automatic cleanup** - Removes old data every 5 minutes
- **Real-time statistics** - Flows/sec, bytes/sec, packet counts

**Configuration:**
```env
CONDENSER_TIME_WINDOW=5          # Group packets by 5-sec windows
Z_SCORE_THRESHOLD=3              # Z-score sensitivity
IQR_MULTIPLIER=1.5               # IQR sensitivity
EWMA_ALPHA=0.2                   # EWMA smoothing
ANOMALY_THRESHOLD=0.5            # Minimum score to flag anomaly
```

---

#### **`core/ai/` - AI Reasoning & Explanation**

**Files:**
- `ai_agent.py` - Local LLM reasoning engine with incident correlation

**Purpose:** Generate human-readable security insights using local Ollama models.

**Key Features:**
- **Local inference** - Privacy-first (no cloud API calls)
- **Multi-model support** - Mistral, Llama2, OpenHermes compatible
- **Context building** - Includes flow data, history, and statistics
- **Incident correlation** - Links related events
- **Timeout handling** - Graceful fallback if model slow
- **Configurable system prompt** - Customize AI behavior

**Configuration:**
```env
AI_ENABLED=true
AI_MODEL=mistral:7b
AI_OLLAMA_URL=http://localhost:11434
AI_TIMEOUT=30                    # Seconds to wait for response
AI_SYSTEM_PROMPT="You are a network security analyst..."
```

**Example AI Output:**
```
"Detected DNS tunneling attempt from 192.168.1.50 to external resolver.
Domain entropy is unusually high (7.8/8.0), suggesting data exfiltration.
Recommend: Block source IP, investigate compromised host, check for C2 callbacks."
```

---

### **4. `persistence/` - Data Storage & Retrieval**

**Purpose:** Persistent storage of events, incidents, and AI queries using SQLite.

**Location:** `backend/persistence/`

**Files:**
- `db.py` - Async SQLite database operations
- `repositories/` - (placeholder for DAO pattern classes)
- `migrations/` - (placeholder for schema versioning)
- `README.md` - Comprehensive database documentation
- `__init__.py` - Module exports

**Key Features:**
- **Optional persistence** - Can be disabled via `DB_ENABLED=false`
- **Async operations** - Non-blocking database access
- **Batch inserts** - Events buffered for performance
- **Automatic cleanup** - Old data pruned based on retention policy
- **Write-Ahead Logging** - WAL mode for concurrent access
- **Indexed queries** - Fast lookups on timestamp, anomaly, severity

**Stored Data:**
1. **Events table** - Network flows with anomaly detection results
2. **Incidents table** - User-created incident reports with status
3. **Query history table** - AI chat interactions and responses
4. **Metrics table** - (Optional) Historical system performance

**Configuration:**
```env
DB_ENABLED=true
DB_PATH=packetflow.db
DB_RETENTION_DAYS=7              # Keep data for 7 days
DB_BATCH_SIZE=100                # Insert 100 events per transaction
DB_CLEANUP_INTERVAL_HOURS=24     # Run cleanup daily
DB_STORE_EVENTS=true
DB_STORE_INCIDENTS=true
DB_STORE_QUERIES=true
DB_STORE_METRICS=false
```

**Database Schema:**
- Events: timestamp, src/dst/proto, flows, bytes, anomaly_score, severity, AI explanation
- Incidents: id, title, description, severity, status, assigned_to, related events
- Queries: query text, response, model, response time

**For detailed database documentation, see:** `persistence/README.md`

---

### **5. `observability/` - Monitoring & Metrics**

**Purpose:** Track system health, performance, and provide operational insights.

**Location:** `backend/observability/`

**Subdirectories:**

#### **`observability/metrics/` - Prometheus Metrics**

**Files:**
- `metrics.py` - Prometheus counter/gauge definitions

**Metrics Tracked:**
- `packets_captured` - Total packets processed
- `packets_dropped` - Packets lost due to queue overflow
- `active_flows` - Current unique flows being tracked
- `events_generated` - Anomalies detected
- `ai_explanations_generated` - AI-processed events
- `ai_errors` - Failed AI requests
- `database_writes` - Successful database operations
- `database_errors` - Database failure count

**Configuration:**
```env
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=8001             # Metrics endpoint: :8001/metrics
```

---

#### **`observability/logging/` - Structured Logging**

**Files:**
- (placeholder for custom logging handlers)

**Purpose:** Structured logging for troubleshooting and auditing.

**Log Levels:**
- `DEBUG` - Detailed internal operations
- `INFO` - Key milestones (startup, events processed, anomalies)
- `WARNING` - Non-fatal issues (queue pressure, slow responses)
- `ERROR` - Failures (capture errors, AI timeouts, DB issues)
- `CRITICAL` - System-level failures

**Configuration:**
```env
LOG_LEVEL=INFO
LOG_FILE=packetflow.log
```

---

### **6. `infrastructure/` - System Operations & Lifecycle**

**Purpose:** Handle application lifecycle, task management, and signal handling.

**Location:** `backend/infrastructure/`

**Subdirectories:**

#### **`infrastructure/tasks/` - Task Management**

**Files:**
- `manager.py` - Restart manager with exponential backoff

**Purpose:** Gracefully restart failed tasks without crashing the system.

**Features:**
- **Automatic restart** - Restarts crashed tasks with backoff
- **Exponential backoff** - 1s  2s  4s  8s (max 30s)
- **Logging** - Tracks restarts for debugging
- **Non-blocking** - Doesn't freeze the event loop

**Example:**
```python
from infrastructure.tasks import run_with_restart

async def unstable_task():
    while True:
        # May fail
        await do_something()

# Automatically restarts if task fails
await run_with_restart(unstable_task, max_retries=5)
```

---

#### **`infrastructure/signals/` - Signal Handling**

**Files:**
- (placeholder for graceful shutdown handlers)

**Purpose:** Handle OS signals (SIGTERM, SIGINT) for clean shutdown.

---

#### **`infrastructure/cleanup/` - Resource Cleanup**

**Files:**
- (placeholder for cleanup operations)

**Purpose:** Database, queue, and resource cleanup on shutdown.

---

### **7. `tests/` - Test Suite**

**Purpose:** Automated testing across unit, integration, and end-to-end scenarios.

**Location:** `backend/tests/`

**Test Types:**

#### **Unit Tests** (`tests/unit/`)
- Individual component testing (capture, condenser, AI agent)
- Mock external dependencies (TShark, Ollama)
- Fast execution (~seconds)

#### **Integration Tests** (`tests/integration/`)
- Multi-component workflows (capture  condense  AI)
- Real database operations
- Medium execution (~minutes)

#### **End-to-End Tests** (`tests/e2e/`)
- Full stack testing (from packet to WebSocket)
- Real Ollama inference
- Slow execution (~minutes)

#### **Quick Tests** (root level)
- `test_client.py` - WebSocket client for manual testing
- `test_enhanced_backend.py` - Backend functionality tests
- `test_improvements.py` - New feature validation
- `test_pcap.py` - PCAP file replay testing
- `simple_pcap_test.py` - Quick PCAP validation

---

##  Development Utilities

**Location:** `backend/utils/`

Diagnostic and development tools:

- **`check_system.py`** - Verify system prerequisites (TShark, Ollama, Python version)
- **`diagnose_capture.py`** - Debug packet capture issues
- **`diagnose_pcap.py`** - Analyze PCAP files for traffic patterns
- **`download_pcaps.py`** - Fetch public PCAP datasets for testing
- **`format_logs.py`** - Pretty-print and filter log files
- **`switch_condenser.py`** - Legacy utility to toggle between original/enhanced (deprecated)

**Usage:**
```bash
python utils/check_system.py         # Verify setup
python utils/diagnose_capture.py     # Troubleshoot capture
python utils/download_pcaps.py       # Get test data
```

---

##  Running the Backend

### **Quick Start (Mock Mode - No Dependencies)**

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Backend starts on `http://localhost:8000` with simulated network traffic.

### **With PCAP Replay (Test Recorded Attack)**

```bash
# Edit .env
MOCK_MODE=false
PCAP_FILE=test-data/dns-remoteshell.pcap
PCAP_SPEED=1.0
PCAP_LOOP=true

# Run
python main.py
```

### **With Live Capture (Real Network Traffic)**

**Prerequisites:** TShark installed, admin/sudo rights

```bash
# Edit .env
MOCK_MODE=false
PCAP_FILE=                           # Leave empty
CAPTURE_INTERFACE=en0                # Your network interface

# Run
sudo python main.py
```

### **With AI Reasoning (Local Ollama)**

**Prerequisites:** Ollama running with model pulled

```bash
# Terminal 1: Start Ollama
ollama serve

# Terminal 2: Pull model
ollama pull mistral:7b

# Terminal 3: Start backend (with AI enabled)
python main.py
```

---

##  Data Flow Pipeline

```
Packet Source (Capture)
     packet_queue (1000 max)
    Flow Condenser (Aggregation + Anomaly Detection)
     event_queue (100 max)
    AI Agent (Generate Explanations)
     output_queue (100 max)
    WebSocket Server (Broadcast to Clients)
    Persistence (Save to SQLite)
    Frontend (React UI Display)
```

---

##  Configuration Deep Dive

### **All Configuration Options** (in `.env`)

```env
# CAPTURE CONFIGURATION
MOCK_MODE=true                       # Use simulated traffic
PCAP_FILE=test-data/dns-remoteshell.pcap  # PCAP file to replay (empty = live)
PCAP_SPEED=1.0                       # Playback speed
PCAP_LOOP=true                       # Loop file indefinitely
CAPTURE_INTERFACE=en0                # Network interface for live capture

# CONDENSER CONFIGURATION
CONDENSER_TIME_WINDOW=5              # Group packets by window (seconds)
Z_SCORE_THRESHOLD=3                  # Z-score anomaly threshold
IQR_MULTIPLIER=1.5                   # IQR multiplier
EWMA_ALPHA=0.2                       # EWMA smoothing factor
ANOMALY_THRESHOLD=0.5                # Minimum score to flag anomaly
PORT_SCAN_THRESHOLD=20               # Unique ports to trigger alert

# AI CONFIGURATION
AI_ENABLED=true                      # Enable AI explanations
AI_MODEL=mistral:7b                  # Model name
AI_OLLAMA_URL=http://localhost:11434 # Ollama endpoint
AI_TIMEOUT=30                        # Response timeout (seconds)
AI_MODE=local                        # local|remote|mock

# SERVER CONFIGURATION
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
LOG_LEVEL=INFO
LOG_FILE=packetflow.log

# DATABASE CONFIGURATION
DB_ENABLED=true
DB_PATH=packetflow.db
DB_RETENTION_DAYS=7
DB_BATCH_SIZE=100
DB_CLEANUP_INTERVAL_HOURS=24
DB_STORE_EVENTS=true
DB_STORE_INCIDENTS=true
DB_STORE_QUERIES=true
DB_STORE_METRICS=false

# PROMETHEUS CONFIGURATION
PROMETHEUS_ENABLED=true
PROMETHEUS_PORT=8001
```

---

##  Common Tasks

### **Run Tests**
```bash
# All tests
python -m pytest tests/

# Unit tests only
python -m pytest tests/unit/

# With coverage
python -m pytest tests/ --cov=core --cov=api
```

### **Check System Prerequisites**
```bash
python utils/check_system.py
```

### **Debug Packet Capture**
```bash
python utils/diagnose_capture.py
```

### **Query Stored Events**
```bash
curl http://localhost:8000/api/events?anomaly_only=true&limit=50
```

### **Check Database Statistics**
```bash
curl http://localhost:8000/api/database/stats
```

### **Monitor Metrics**
```bash
curl http://localhost:8000/metrics  # Prometheus format
```

---

##  Troubleshooting

### **No events appearing**
1. Check backend is running: `curl http://localhost:8000/status`
2. Verify `.env` configuration (especially `MOCK_MODE`)
3. Check logs: `tail -f packetflow.log`
4. If using live capture, verify TShark is installed and you have admin rights

### **AI explanations not appearing**
1. Check Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify model is pulled: `ollama list`
3. Check timeout settings in `.env`
4. System works without AI, but explanations will be empty

### **Database is locked**
1. Ensure only one backend instance is running
2. Close any SQLite browser tools accessing the database
3. Delete `packetflow.db-shm` and `packetflow.db-wal` files if stuck

### **High memory usage**
1. Enable database storage: `DB_ENABLED=true`
2. Reduce `DB_RETENTION_DAYS` (e.g., 3 instead of 7)
3. Check for memory leaks: `python -m tracemalloc main.py`

---

##  Architecture Principles

1. **Async-first** - All I/O is non-blocking using asyncio
2. **Queue-based decoupling** - Stages connected via async queues, not direct calls
3. **Configuration-driven** - All behavior controlled via `.env`, no hardcoded values
4. **Observable** - Every component exposes metrics and structured logs
5. **Resilient** - Failed tasks auto-restart with backoff
6. **Privacy-first** - Local AI reasoning, no cloud dependencies
7. **Testable** - Each component mockable and independently testable
8. **Scalable** - Modular structure supports horizontal scaling

---

##  Additional Documentation

- **Database Setup:** `persistence/README.md`
- **Bug Report:** `BACKEND_BUG_REPORT.md`
- **Project Description:** `project_Description.md`

---

##  Contributing

When adding new features:

1. **Place code in appropriate directory** following the 7-tier structure
2. **Add configuration** to `config/settings.py` if needed
3. **Export from module `__init__.py`** for clean imports
4. **Add tests** in `tests/` (unit/integration/e2e)
5. **Update this README** with new features/endpoints
6. **Follow async patterns** - never use blocking calls

---

##  License

See main project LICENSE file.
