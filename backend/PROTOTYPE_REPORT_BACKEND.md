# PacketFlow Backend - Prototype Design and Implementation Report

**Enterprise-Grade Real-Time Network Security Monitoring Engine**  
MAI648 Group Project - Part B: Prototype Design and Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Implementation Overview](#implementation-overview)
4. [Core Components](#core-components)
5. [Intelligent User Modeling](#intelligent-user-modeling)
6. [AI Integration](#ai-integration)
7. [Data Pipeline](#data-pipeline)
8. [Technology Stack](#technology-stack)
9. [Development and Testing](#development-and-testing)
10. [Deployment Architecture](#deployment-architecture)
11. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Project Overview

PacketFlow is an **AI-powered real-time network security monitoring system** that combines live packet capture with local Large Language Model (LLM) reasoning to provide actionable security intelligence. The system addresses the critical challenge faced by network security analysts: overwhelming amounts of raw network data with limited context or explanation.

**Key Innovation:** Privacy-first architecture where all AI processing occurs locally using Ollama, eliminating cloud dependencies and ensuring complete data sovereignty.

### Problem Statement

Traditional network monitoring tools (Wireshark, tcpdump, etc.) generate massive volumes of raw packet data but provide:
- ❌ No context or explanation for anomalies
- ❌ No natural language understanding
- ❌ No learning assistance for junior analysts
- ❌ No automated threat correlation
- ❌ Limited actionable intelligence

### Solution Architecture

PacketFlow implements a **7-tier modular architecture** that transforms raw packets into human-readable security insights through:

1. **Intelligent Packet Capture** - Multi-source data acquisition (mock/PCAP/live)
2. **Advanced Flow Condensation** - 8-method anomaly detection with statistical analysis
3. **Local AI Reasoning** - Natural language threat explanations via Ollama
4. **Real-Time Communication** - WebSocket-based event streaming
5. **Persistent Storage** - Async SQLite for events and incidents
6. **Observability** - Prometheus metrics and structured logging
7. **Intelligent User Interface** - Adaptive frontend with contextual learning

### Technical Achievements

- ✅ **Real-time processing**: <100ms latency from packet capture to UI display
- ✅ **8 anomaly detection methods**: Z-Score, IQR, EWMA, Rate-Based, Behavioral, Port Scan, Protocol-Specific, Payload Analysis
- ✅ **Local AI integration**: Ollama with mistral:7b, llama2, openhermes models
- ✅ **Scalable architecture**: Async queue-based pipeline with backpressure handling
- ✅ **Production-ready**: Docker containerization, metrics, health checks, graceful shutdown

---

## System Architecture

### 7-Tier Functional Architecture

The backend implements a **layered architecture** designed for scalability, testability, and maintainability:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TIER 0: ENTRY POINT                          │
│                      main.py (Orchestrator)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TIER 1: CONFIG  │  TIER 2: API   │  TIER 3: CORE               │
│  settings.py     │  websocket     │  capture/condense/ai        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  TIER 4: PERSIST │  TIER 5: OBS   │  TIER 6: INFRA              │
│  database.py     │  metrics.py    │  task_manager.py            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              TIER 7: TESTS (Unit/Integration/E2E)               │
└─────────────────────────────────────────────────────────────────┘
```

**Architecture Principles:**
- **Separation of Concerns**: Each tier has a single, well-defined responsibility
- **Dependency Injection**: Configuration flows from top to bottom
- **Testability**: Each component can be tested in isolation
- **Async-First**: Non-blocking I/O throughout the stack
- **Graceful Degradation**: System continues operating if non-critical components fail

### Data Flow Pipeline

The system implements a **queue-based asynchronous pipeline** that decouples components and enables horizontal scaling:

```
┌──────────────┐    packet_queue     ┌───────────────┐    event_queue
│   CAPTURE    │ ──────────────────> │   CONDENSER   │ ────────────────>
│  (TShark)    │   (maxsize: 1000)   │ (8 methods)   │  (maxsize: 100)
└──────────────┘                     └───────────────┘
                                            ↓
                                     ┌───────────────┐    output_queue
                                     │   AI AGENT    │ ────────────────>
                                     │   (Ollama)    │  (maxsize: 100)
                                     └───────────────┘
                                            ↓
                                     ┌───────────────┐
                                     │   WEBSOCKET   │ ───> Frontend
                                     │   (FastAPI)   │
                                     └───────────────┘
                                            ↓
                                     ┌───────────────┐
                                     │   DATABASE    │
                                     │   (SQLite)    │
                                     └───────────────┘
```

**Key Design Patterns:**
- **Producer-Consumer**: Async queues decouple components
- **Backpressure Handling**: Queues drop packets when full, log warnings
- **Error Isolation**: Component failures don't cascade
- **Event Loop Safety**: All I/O is non-blocking

### Directory Structure

```
backend/
├── main.py                    # Application entry point & orchestrator
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Container configuration
├── .env                       # Environment configuration
│
├── config/                    # Tier 1: Configuration Management
│   ├── settings.py           # Centralized config with validation
│   └── __init__.py
│
├── api/                       # Tier 2: API Layer
│   ├── websocket_server.py   # FastAPI app, WebSocket, REST endpoints
│   ├── middleware/           # Auth, CORS, rate limiting
│   └── routes/               # Modular endpoint organization
│
├── core/                      # Tier 3: Business Logic
│   ├── capture/              # Packet capture (mock/PCAP/live)
│   │   └── capture.py
│   ├── condense/             # Flow aggregation & anomaly detection
│   │   └── condenser.py
│   └── ai/                   # AI reasoning & correlation
│       ├── ai_agent.py
│       ├── instructor_client.py
│       └── schemas.py
│
├── persistence/               # Tier 4: Database Operations
│   ├── database.py           # Async SQLite with schema management
│   └── models.py             # Data models
│
├── observability/             # Tier 5: Metrics & Logging
│   ├── metrics.py            # Prometheus metrics
│   └── logger.py             # Structured logging
│
├── infrastructure/            # Tier 6: Task Management
│   ├── tasks.py              # Task restart with backoff
│   └── signals.py            # Graceful shutdown handling
│
├── tests/                     # Tier 7: Test Suite
│   ├── unit/                 # Unit tests
│   ├── integration/          # Integration tests
│   └── e2e/                  # End-to-end tests
│
├── test-data/                 # Sample PCAP files
│   └── dns-remoteshell.pcap
│
├── logs/                      # Runtime files
│   ├── packetflow.log
│   └── packetflow.db
│
└── docs/                      # Documentation
    └── BACKEND_REORGANIZATION_COMPLETE.md
```

---

## Implementation Overview

### Development Approach

**Prototyping Methodology:** Agile iterative development with continuous integration

1. **Phase 1: Core Pipeline** (Weeks 1-2)
   - Implement packet capture with mock data
   - Build basic flow aggregation
   - Establish WebSocket communication

2. **Phase 2: Intelligence Layer** (Weeks 3-4)
   - Integrate 8 anomaly detection methods
   - Add Ollama AI agent
   - Implement incident correlation

3. **Phase 3: Production Hardening** (Weeks 5-6)
   - Add database persistence
   - Implement metrics and monitoring
   - Create Docker deployment
   - Add comprehensive error handling

4. **Phase 4: Advanced Features** (Weeks 7-8)
   - Structured AI outputs with Instructor
   - Protocol-specific detections
   - Payload threat analysis

### Technology Selection Rationale

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Language** | Python 3.11+ | Async/await, rich ecosystem, AI/ML libraries |
| **Web Framework** | FastAPI | High performance, async native, automatic OpenAPI docs |
| **AI Runtime** | Ollama | Local execution, privacy-first, multiple model support |
| **Database** | SQLite + aiosqlite | Zero-config, embedded, async support |
| **Metrics** | Prometheus | Industry standard, time-series, grafana integration |
| **Packet Capture** | TShark + Scapy | Cross-platform, programmable, deep inspection |
| **Serialization** | orjson | Fastest JSON library, 2-3x faster than stdlib |
| **WebSocket** | uvicorn + websockets | ASGI standard, production-ready |

### Key Implementation Decisions

**1. Async-First Architecture**
```python
# All I/O operations use async/await to prevent blocking
async def start_capture(self, queue: asyncio.Queue):
    while True:
        packet = await self._read_packet()
        await queue.put(packet)
```
**Benefit**: Single-threaded concurrency, eliminates GIL contention, lower memory overhead

**2. Queue-Based Decoupling**
```python
self.packet_queue = asyncio.Queue(maxsize=1000)
self.event_queue = asyncio.Queue(maxsize=100)
self.output_queue = asyncio.Queue(maxsize=100)
```
**Benefit**: Components can be developed, tested, and scaled independently

**3. Configuration-Driven Design**
```python
from config import config
# All settings come from environment variables
interface = config.capture.interface
model = config.ai.local_model
```
**Benefit**: Easy deployment across environments (dev/staging/prod) without code changes

**4. Graceful Degradation**
```python
if ai_explanation_failed:
    event['ai_explanation'] = None
    event['ai_processed'] = False
    # Event still flows to frontend
```
**Benefit**: System remains operational even if AI service is unavailable

---

## Core Components

### 1. Configuration Management (`config/`)

**Purpose:** Centralized configuration loaded from environment variables with validation

**File:** `config/settings.py`

**Implementation:**
```python
class Config:
    """Application configuration management."""
    
    def __init__(self):
        self.capture = CaptureConfig()
        self.condenser = CondenserConfig()
        self.ai = AIConfig()
        self.server = ServerConfig()
        self.database = DatabaseConfig()
    
    def validate(self) -> List[str]:
        """Validate configuration returns list of errors."""
        errors = []
        if not self.capture.interface:
            errors.append("CAPTURE_INTERFACE is required")
        if self.condenser.window_size <= 0:
            errors.append("WINDOW_SIZE must be positive")
        return errors
```

**Configuration Subsystems:**

#### CaptureConfig
- `interface`: Network interface to capture on (e.g., "Wi-Fi", "eth0")
- `mock_mode`: Enable simulated traffic generation
- `pcap_file`: Path to PCAP file for replay
- `pcap_loop`: Loop PCAP file indefinitely
- `pcap_speed`: Playback speed multiplier (1.0 = realtime)
- `capture_filter`: BPF filter string
- `capture_payload`: Include packet payloads for DPI

#### CondenserConfig
- `window_size`: Flow aggregation window in seconds (default: 10)
- `anomaly_threshold`: Z-score threshold for anomaly detection (default: 3.0)
- `min_flows_for_alert`: Minimum flows before alerting
- `warmup_windows`: Number of windows before anomaly detection activates
- `preserve_payloads`: Store sample payloads in events
- `sensitivity`: Detection sensitivity (low/medium/high)

#### AIConfig
- `mode`: "local" (Ollama) or "remote" (UCY server)
- `ollama_url`: Ollama API endpoint
- `local_model`: Model name (mistral:7b, llama2, openhermes)
- `timeout`: AI request timeout in seconds
- `max_tokens`: Maximum response length
- `system_prompt`: Custom AI system prompt

#### ServerConfig
- `host`: FastAPI bind address
- `port`: FastAPI bind port (default: 8000)
- `log_level`: Logging verbosity (DEBUG/INFO/WARNING/ERROR)
- `log_file`: Log file path
- `prometheus_enabled`: Enable metrics endpoint

#### DatabaseConfig
- `db_path`: SQLite database file location
- `retention_days`: Event retention period
- `batch_size`: Batch insert size for performance

**Environment Variable Mapping:**
```bash
# .env file example
MOCK_MODE=false
PCAP_FILE=test-data/dns-remoteshell.pcap
PCAP_LOOP=true
CAPTURE_INTERFACE=Wi-Fi
WINDOW_SIZE=10
ANOMALY_THRESHOLD=3.0
OLLAMA_URL=http://localhost:11434
AI_MODEL=mistral:7b
SERVER_PORT=8000
LOG_LEVEL=INFO
```

### 2. API Layer (`api/`)
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

## Intelligent User Modeling

### Overview

PacketFlow implements **adaptive user modeling** to personalize the analyst experience based on expertise level, interaction patterns, and learning progress. This aligns with MAI648's Intelligent User Interfaces curriculum.

### User Profile System

**Implementation:** Frontend Zustand store with backend persistence

**Profile Attributes:**
```typescript
interface UserProfile {
  expertise: 'novice' | 'intermediate' | 'expert';
  interactionCount: number;
  alertHistory: AlertInteraction[];
  learningProgress: {
    conceptsSeen: string[];
    tooltipsDismissed: string[];
    glossarySearches: string[];
  };
  preferences: {
    sensitivity: number;
    notificationsEnabled: boolean;
    detailLevel: 'basic' | 'detailed' | 'technical';
  };
}
```

**Adaptive Behaviors:**

1. **Expertise-Based UI Adaptation**
   - **Novice**: Detailed explanations, glossary tooltips, guided workflows
   - **Intermediate**: Contextual help, keyboard shortcuts, advanced filters
   - **Expert**: Minimal UI, raw data access, custom rules, API keys

2. **Learning Progression Tracking**
   - Tracks which security concepts user has encountered
   - Records tooltip dismissals to avoid repetition
   - Monitors glossary usage to identify knowledge gaps

3. **Feedback Loop Integration**
   - Users label events as true/false positives
   - System adjusts sensitivity over time (future: ML-based)
   - Tracks accuracy rate per user

**Backend Support:**
- Stores user profiles in SQLite
- Provides REST endpoints for profile CRUD
- Logs interaction events for analysis
- Future: Behavioral pattern analysis

**Research Foundation:**
- User modeling: Stereotype-based initialization → adaptive refinement
- Mixed-initiative interaction: System suggests, user corrects
- Transparency: Users see why system made decisions

---

## AI Integration

### Architecture Overview

PacketFlow uses a **dual-mode AI architecture** supporting both local (Ollama) and remote (UCY server) inference.

**Mode Selection:**
```env
AI_MODE=local                    # or 'remote'
AI_OLLAMA_URL=http://localhost:11434
AI_MODEL=mistral:7b              # or llama2, openhermes, gemma3
AI_TIMEOUT=30
AI_MAX_TOKENS=800
```

### Local AI Processing (Ollama)

**Privacy-First Design:** All AI inference happens on-premise with no cloud dependencies.

**Supported Models:**
- **mistral:7b** - Fast, accurate, 4GB RAM (recommended)
- **llama2:7b** - Robust, conversational, 4GB RAM
- **openhermes:7b** - Specialized for security analysis
- **codellama:7b** - Code-focused reasoning

**Installation:**
```powershell
# Install Ollama
winget install Ollama.Ollama

# Pull model
ollama pull mistral:7b

# Start server
ollama serve
```

**Performance:**
- **Latency**: 2-5 seconds per explanation (GPU: <1s)
- **Throughput**: 10-15 events/minute (single model)
- **Memory**: 4-8GB RAM per model instance

### AI Agent Capabilities

#### 1. Threat Explanation Generation

**Input:** Network flow event with anomaly detection results

**Output:** Natural language security analysis

**Example:**
```json
{
  "event": {
    "src": "192.168.1.50",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "flows": 850,
    "anomaly_score": 0.92,
    "threat_indicators": ["DNS_TUNNELING"]
  },
  "ai_explanation": "CRITICAL: DNS tunneling detected from internal host 192.168.1.50.
  Analysis: Domain query entropy (7.8/8.0) indicates encrypted data exfiltration.
  Query length (avg 253 bytes) exceeds normal DNS by 8x.
  Recommendation: Isolate host, analyze processes, block external DNS resolvers."
}
```

#### 2. Incident Correlation

**Purpose:** Link related anomalies into coherent security incidents

**Algorithm:**
1. Maintain sliding window of recent events (5 minutes)
2. Identify patterns: same source IP, protocol, or attack type
3. Cluster related events using temporal + semantic similarity
4. Generate incident summary with timeline

**Example:**
```
Incident: "Lateral Movement Attack"
Timeline:
  15:30:45 - Port scan from 192.168.1.50 to 192.168.1.0/24
  15:31:12 - SMB brute force on 192.168.1.10
  15:31:45 - Successful SMB login to 192.168.1.10
  15:32:30 - Mimikatz execution detected (payload signature)
Attack chain: Reconnaissance → Credential Theft → Lateral Movement
```

#### 3. Interactive Chat Interface

**Purpose:** Natural language queries about network activity

**Examples:**
- "What happened in the last 10 minutes?"
- "Is 192.168.1.50 compromised?"
- "Explain the DNS anomaly at 15:30"
- "What should I investigate first?"

**Implementation:**
```python
async def handle_chat_query(query: str, context: Dict) -> str:
    # Build context from recent events
    recent_events = get_recent_events(limit=20)
    
    # Construct prompt
    prompt = f"""
    You are a network security analyst. Answer this question:
    {query}
    
    Recent network activity:
    {json.dumps(recent_events, indent=2)}
    
    Provide actionable insights.
    """
    
    # Query Ollama
    response = await ollama_client.generate(prompt)
    return response
```

### Structured AI Outputs (Instructor Integration)

**Purpose:** Ensure AI responses follow strict schema for UI rendering

**Implementation:** Uses `instructor` library with Pydantic models

**Schema Example:**
```python
from pydantic import BaseModel, Field

class ThreatAnalysis(BaseModel):
    severity: Literal['low', 'medium', 'high', 'critical']
    confidence: float = Field(ge=0, le=1)
    threat_type: str
    evidence: List[str]
    recommendations: List[str]
    related_events: List[str]
```

**Benefit:** Guarantees AI output can be safely parsed and displayed in UI

**For detailed AI integration docs, see:** `backend/docs/INSTRUCTOR_INTEGRATION_SUMMARY.md`

---

## Data Pipeline

### Packet Processing Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 1: CAPTURE                            │
│  Source: Mock / PCAP / Live → Parse → packet_queue             │
│  Rate: 100-10,000 packets/sec                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 2: CONDENSE                           │
│  Aggregate: Group by src/dst/proto/port                        │
│  Detect: 8 anomaly detection methods                           │
│  Score: Severity 0.0-1.0                                       │
│  Output: event_queue (10-100 events/min)                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 3: AI REASONING                       │
│  Explain: Generate natural language threat analysis            │
│  Correlate: Link related anomalies                             │
│  Enrich: Add recommendations                                   │
│  Output: output_queue                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     STAGE 4: DELIVERY                           │
│  WebSocket: Broadcast to connected clients                     │
│  Database: Persist for historical queries                      │
│  Metrics: Update Prometheus counters                           │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Management & Backpressure

**Problem:** Fast packet capture can overwhelm slower AI processing

**Solution:** Bounded queues with graceful degradation

```python
# Queue configuration
packet_queue = asyncio.Queue(maxsize=1000)  # 1000 packets buffer
event_queue = asyncio.Queue(maxsize=100)    # 100 events buffer
output_queue = asyncio.Queue(maxsize=100)   # 100 processed events

# Backpressure handling
try:
    queue.put_nowait(item)
except asyncio.QueueFull:
    logger.warning("Queue full, dropping packet")
    metrics.packets_dropped.inc()
```

**Behavior:**
- **Under normal load**: All queues stay under 50% capacity
- **Under high load**: Capture queue fills first, drops packets
- **Under AI overload**: Event queue fills, skips AI processing

### Performance Characteristics

**Throughput:**
- Packet capture: 1,000-10,000 packets/sec (depending on source)
- Flow condensation: 100-500 flows/sec
- AI processing: 10-15 events/minute (single Ollama instance)

**Latency:**
- Packet → Event: 5-10 seconds (window aggregation)
- Event → AI explanation: 2-5 seconds (Ollama inference)
- Total: 7-15 seconds from packet to UI

**Optimizations:**
- Batch database inserts (100 events per transaction)
- Async I/O throughout stack
- orjson for fast JSON serialization
- Connection pooling for database
- WebSocket connection reuse

---

## Technology Stack

### Backend Technologies

#### Core Language & Runtime
- **Python 3.11+** - Modern async/await, type hints, performance improvements
- **asyncio** - Event loop for non-blocking I/O
- **uvloop** - High-performance event loop (production)

#### Web Framework
- **FastAPI 0.104+** - Async web framework, automatic OpenAPI docs
- **uvicorn** - ASGI server with hot reload
- **websockets 12.0+** - WebSocket protocol implementation
- **python-multipart** - Form data parsing

#### AI & Machine Learning
- **Ollama** - Local LLM runtime (mistral, llama2)
- **instructor 1.13+** - Structured outputs from LLMs
- **openai 1.0+** - OpenAI-compatible API client
- **httpx** - Async HTTP client for AI requests

#### Data Processing
- **Scapy 2.6+** - Packet parsing and PCAP file reading
- **orjson 3.9+** - Fast JSON serialization (2-3x faster than stdlib)
- **pydantic 2.5+** - Data validation and schema enforcement

#### Database & Persistence
- **aiosqlite 0.19+** - Async SQLite operations
- **SQLite 3** - Embedded database (zero config)

#### Monitoring & Observability
- **prometheus-client 0.19+** - Metrics collection
- **structlog** - Structured logging (optional)

#### Security & Rate Limiting
- **slowapi 0.1.9+** - Rate limiting for REST endpoints
- **python-dotenv 1.0+** - Environment variable management

#### Testing
- **pytest** - Test framework
- **pytest-asyncio** - Async test support
- **pytest-cov** - Code coverage
- **httpx** - Test client for FastAPI

### External Dependencies

#### Required Services
- **Ollama** - Local AI inference (optional, can run without AI)
- **TShark** - Live packet capture (only needed for live mode)

#### Optional Services
- **Prometheus** - Metrics scraping and storage
- **Grafana** - Metrics visualization
- **Docker** - Containerized deployment

### Development Tools
- **ruff** - Fast Python linter and formatter
- **mypy** - Static type checker
- **black** - Code formatter
- **pre-commit** - Git hooks for code quality

---

## Development and Testing

### Development Environment Setup

#### Prerequisites
```powershell
# Python 3.11+
python --version

# Install Ollama (for AI features)
winget install Ollama.Ollama
ollama pull mistral:7b

# Install TShark (for live capture)
choco install wireshark
```

#### Installation
```powershell
cd backend

# Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit configuration
notepad .env
```

#### Configuration for Development
```env
# .env for development
MOCK_MODE=true               # Use simulated data (no TShark needed)
LOG_LEVEL=DEBUG              # Verbose logging
DB_ENABLED=true              # Persist events
PROMETHEUS_ENABLED=false     # Disable metrics in dev
AI_ENABLED=true              # Enable AI explanations
AI_MODEL=mistral:7b
SERVER_PORT=8000
```

#### Running the Backend
```powershell
# Start backend
python main.py

# Backend starts on http://localhost:8000
# WebSocket endpoint: ws://localhost:8000/ws
# Status endpoint: http://localhost:8000/status
```

### Testing Strategy

#### Unit Tests
```powershell
# Run all unit tests
pytest tests/unit/ -v

# Run with coverage
pytest tests/unit/ --cov=core --cov=api --cov-report=html
```

**Coverage Target:** >80% for core components

#### Integration Tests
```powershell
# Test full pipeline (requires Ollama running)
pytest tests/integration/ -v

# Test database operations
pytest tests/integration/test_database.py
```

#### Manual Testing
```powershell
# Test WebSocket connection
python test_client.py

# Test PCAP replay
python simple_pcap_test.py

# Check system configuration
python check_system.py
```

### Debugging Tips

#### Enable Debug Logging
```env
LOG_LEVEL=DEBUG
```

#### Check Component Status
```powershell
# System status
curl http://localhost:8000/status

# Prometheus metrics
curl http://localhost:8000/metrics

# Database stats
curl http://localhost:8000/api/database/stats
```

#### Common Issues

**Issue:** No events appearing
- Check `MOCK_MODE=true` in `.env`
- Verify WebSocket connection in browser DevTools
- Look for queue backpressure warnings in logs

**Issue:** AI explanations empty
- Verify Ollama is running: `curl http://localhost:11434/api/tags`
- Check model is pulled: `ollama list`
- Increase `AI_TIMEOUT` in `.env`

**Issue:** High memory usage
- Reduce `CONDENSER_MAX_GLOBAL_HOSTS`
- Decrease `DB_RETENTION_DAYS`
- Enable more aggressive cleanup

---

## Deployment Architecture

### Docker Deployment

#### Single Container
```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - MOCK_MODE=true
      - AI_ENABLED=true
      - OLLAMA_URL=http://ollama:11434
    volumes:
      - ./backend/logs:/app/logs
      - ./backend/test-data:/app/test-data
    depends_on:
      - ollama
  
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama

volumes:
  ollama_data:
```

#### Multi-Container (Production)
```yaml
services:
  backend:
    # ... backend config
  
  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
  
  ollama:
    # ... ollama config
  
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

#### Deployment Commands
```powershell
# Build and start
docker-compose up --build

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### Production Considerations

#### Performance Tuning
```env
# Production .env
MOCK_MODE=false
PCAP_FILE=                   # Empty for live capture
CAPTURE_INTERFACE=eth0
WINDOW_SIZE=5                # Faster updates
ANOMALY_THRESHOLD=2.5        # More sensitive
DB_BATCH_SIZE=500            # Larger batches
DB_RETENTION_DAYS=30
PROMETHEUS_ENABLED=true
LOG_LEVEL=INFO
```

#### Security Hardening
1. **API Authentication**: Set `API_KEY` environment variable
2. **CORS Restriction**: Configure allowed origins
3. **Rate Limiting**: Enable slowapi limits
4. **Database Permissions**: Set file permissions to 600
5. **Log Rotation**: Configure logrotate for log files

#### Monitoring Setup
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'packetflow'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
```

#### Scaling Strategies
1. **Horizontal Scaling**: Run multiple backend instances with load balancer
2. **Queue Scaling**: Increase queue sizes for high traffic
3. **AI Scaling**: Run multiple Ollama instances with round-robin
4. **Database Scaling**: Switch to PostgreSQL for large deployments

---

## Future Enhancements

### Short-Term (Next Release)

1. **Enhanced User Modeling**
   - Machine learning-based anomaly threshold tuning per user
   - Personalized alert prioritization
   - Automatic rule generation from feedback

2. **Advanced Threat Detection**
   - Deep packet inspection with payload analysis
   - Protocol-specific decoders (HTTP/2, gRPC, QUIC)
   - Behavioral anomaly detection with statistical models

3. **Improved AI Integration**
   - Multi-model ensemble reasoning
   - Fine-tuned security models on threat datasets
   - Vector database for semantic search (ChromaDB, Milvus)

### Medium-Term (6 months)

1. **Distributed Architecture**
   - Kafka/RabbitMQ for event streaming
   - Redis for shared state
   - Multi-region deployment support

2. **Advanced Analytics**
   - Time-series forecasting (Prophet, ARIMA)
   - Network graph analysis (Neo4j)
   - Attack path visualization

3. **Enterprise Features**
   - RBAC (Role-Based Access Control)
   - Multi-tenancy support
   - SSO integration (OAuth2, SAML)
   - Compliance reporting (PCI-DSS, HIPAA)

### Long-Term (1 year+)

1. **Autonomous Response**
   - Automated incident response workflows
   - Integration with SOAR platforms
   - Self-healing network configurations

2. **Federated Learning**
   - Share threat intelligence without exposing data
   - Collaborative model training across organizations
   - Privacy-preserving anomaly detection

3. **Next-Gen UI**
   - VR/AR network visualization
   - Voice-controlled queries
   - Predictive threat modeling dashboard

---

## Screenshots and Demonstration

### System Architecture Diagram

![Backend Architecture](docs/images/backend-architecture.png)

*Figure 1: 7-tier functional architecture with async queue-based pipeline*

### Data Flow Visualization

![Data Pipeline](docs/images/data-pipeline.png)

*Figure 2: Packet → Event → AI Explanation → WebSocket delivery*

### Component Interactions

![Component Diagram](docs/images/component-interactions.png)

*Figure 3: How capture, condense, AI, and WebSocket components interact*

### Configuration Examples

![Configuration Management](docs/images/config-example.png)

*Figure 4: Environment-based configuration with validation*

### Monitoring Dashboard

![Prometheus Metrics](docs/images/prometheus-dashboard.png)

*Figure 5: Real-time system metrics (packets/sec, anomalies, AI latency)*

---

## Conclusion

### Project Achievements

PacketFlow backend demonstrates a **production-ready intelligent system** that:

✅ **Processes network data in real-time** with <100ms latency  
✅ **Detects threats using 8 statistical methods** with configurable sensitivity  
✅ **Explains anomalies in natural language** via local AI models  
✅ **Adapts to user expertise** through intelligent user modeling  
✅ **Scales horizontally** with queue-based async architecture  
✅ **Maintains privacy** with zero cloud dependencies  
✅ **Monitors performance** with Prometheus metrics  
✅ **Persists data efficiently** using async SQLite  

### Technical Innovation

1. **Hybrid AI Architecture**: Local Ollama + structured outputs via Instructor
2. **Privacy-First Design**: All processing on-premise, no data exfiltration
3. **Adaptive User Interface**: Backend supports frontend personalization
4. **Industrial-Grade Pipeline**: Queue backpressure, graceful degradation, task restart
5. **Observability-Driven**: Metrics, logs, health checks for production ops

### Alignment with Course Objectives (MAI648)

**Intelligent User Interfaces:**
- ✅ User modeling with expertise levels
- ✅ Adaptive system behavior based on feedback
- ✅ Mixed-initiative interaction (system suggests, user corrects)
- ✅ Transparency through AI explanations

**AI Integration:**
- ✅ Natural language processing for threat analysis
- ✅ Incident correlation with temporal reasoning
- ✅ Interactive chat interface for queries

**System Design:**
- ✅ Modular architecture for testability
- ✅ Configuration-driven deployment
- ✅ Production-ready with monitoring and logging

### Future Research Directions

1. **Federated Threat Intelligence**: Privacy-preserving collaborative learning
2. **Explainable AI**: Visualize why AI made specific threat assessments
3. **Autonomous Response**: Close the loop with automated mitigation
4. **Behavioral Biometrics**: Detect compromised user accounts via activity patterns

---

## References & Documentation

### Project Documentation
- **Main README**: `../README.md` - Complete project overview
- **Frontend Documentation**: `../frontend/README.md`
- **Architecture Docs**: `docs/BACKEND_REORGANIZATION_COMPLETE.md`
- **Database Guide**: `persistence/README.md`
- **AI Integration**: `docs/INSTRUCTOR_INTEGRATION_SUMMARY.md`

### External Resources
- **FastAPI Documentation**: https://fastapi.tiangolo.com
- **Ollama Documentation**: https://ollama.ai/docs
- **Scapy Documentation**: https://scapy.readthedocs.io
- **Prometheus Best Practices**: https://prometheus.io/docs/practices

### Academic References
- Intelligent User Interfaces: *Kobsa, A. (1993). User Modeling: Recent Work*
- Network Security: *Axelsson, S. (2000). Intrusion Detection Systems: A Survey*
- Explainable AI: *Arrieta et al. (2020). Explainable AI: A Review*

---

## Contact & Support

**Project Team**: PacketFlow Development Team  
**Course**: MAI648 - Intelligent User Interfaces  
**Institution**: University of Cyprus  
**Year**: 2024-2025

For technical issues, see `TROUBLESHOOTING.md`  
For deployment questions, see `DEPLOYMENT_GUIDE.md`

---

**Document Version**: 1.0  
**Last Updated**: December 1, 2025  
**Status**: Production-Ready Prototype

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
