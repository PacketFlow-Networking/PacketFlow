# PacketFlow - AI-Powered Network Security Monitoring

<div align="center">
  <img src="./frontend/public/images/logo/light/packetflow-long-light.svg" alt="PacketFlow Logo" width="300">
</div>

**Privacy-First Network Intelligence with Local LLM Reasoning**

PacketFlow is a real-time network security monitoring interface that combines live packet capture with local AI analysis. Think: "Wireshark meets ChatGPT, but entirely offline." The system captures network packets, detects anomalies using 8 statistical methods, and generates human-readable security insightsall locally with zero cloud dependencies.

---

##  System Concept

### The Problem
Traditional network monitoring tools generate overwhelming amounts of raw data. Security analysts struggle to:
- Identify meaningful patterns in packet floods
- Understand "why" an alert was triggered
- Prioritize threats among thousands of events
- Learn network security concepts in context

### The Solution
PacketFlow bridges the gap between raw network data and actionable intelligence by:
1. **Condensing** packet streams into meaningful flow events
2. **Detecting** anomalies using 8 statistical and behavioral methods
3. **Explaining** threats in natural language via local LLM
4. **Teaching** users with contextual help and adaptive UI
5. **Tracking** security incidents through their lifecycle

**Privacy-First Design**: All processing happens locally. No telemetry, no cloud APIs, no data leaving your network.

---

##  Architecture Overview

### Data Flow Pipeline
```
                     TShark      Condenser     AI Agent     WebSocket    (Capture)           (Analysis)          (Ollama)           (FastAPI)                                                                                                                                                                                                                                                                                                            React UI                                                                          (Zustand)                                                                      ```

### Backend (Python 3.11+)
- **Packet Capture**: Mock/PCAP/Live using TShark with flexible configuration
- **Flow Condenser**: Aggregates packets into flows with 8 anomaly detection methods
  - Z-Score, IQR, EWMA, Rate-Based, Behavioral, Port Scan, Protocol-Specific, Payload Analysis
- **AI Agent**: Generates threat explanations using Ollama (mistral:7b, llama2)
- **Database**: SQLite with async support for event/incident persistence
- **WebSocket Server**: Real-time event broadcasting via FastAPI

### Frontend (React 18 + TypeScript)
- **Event Stream**: Live security events with filtering, search, and sorting
- **Graph Visualization**: Network topology with D3.js force-directed layout
- **AI Chat**: Natural language queries about network activity
- **Incident Management**: Track, investigate, and resolve security incidents
- **Alert Configuration**: Sensitivity tuning, custom thresholds, IP lists, custom rules
- **Intelligent UI (IUI)**: Adaptive interface with contextual help, glossary, learning

---

##  Key Features

### Security Monitoring
- **8 Anomaly Detection Methods**: Multi-layered statistical and behavioral analysis
- **Severity Scoring**: CRITICAL (0.9+)  HIGH  MEDIUM  LOW (0.3-0.5)
- **Real-Time Events**: Live packet stream condensed into meaningful flow events
- **Threat Indicators**: DNS tunneling, port scanning, protocol anomalies, payload threats
- **Network Topology**: Interactive graph showing host communication patterns

### AI-Powered Intelligence
- **Natural Language Chat**: Query network activity conversationally
- **Automated Explanations**: LLM generates threat analysis for anomalies
- **Incident Correlation**: Links related anomalies into security incidents
- **Local Processing**: Ollama serves open-source models on-premise (no cloud APIs)
- **Context-Aware**: Sliding window maintains recent network state for reasoning

### Intelligent User Interface (IUI)
**Goal**: Enhance analyst effectiveness through adaptive, educational interface

#### Phase 1 Features (Completed):
1. **Proactive Suggestions**: Context-aware recommendations (investigation, action, filter, insight, learning)
2. **Event Feedback**: Label events as true/false positive to improve detection
3. **User Profile & Learning**: Interface adapts to expertise level (novice/intermediate/expert)
4. **Glossary & Help**: 50+ searchable security/network terms with contextual tooltips
5. **Keyboard Shortcuts**: Efficient navigation with globally accessible commands

### Incident Management
- **Lifecycle Tracking**: open  investigating  resolved/false_positive
- **Event Linking**: Associate multiple anomalies with single incident
- **Collaboration**: Notes, assignments, tags, severity levels
- **State Management**: Immediate UI updates, persistent storage
- **Search & Filter**: By title, description, tags, status, severity

### Alert Configuration
- **Sensitivity Slider**: Global anomaly threshold (0-100)
- **Custom Thresholds**: anomaly_score, flow_rate, packet_rate, byte_rate
- **IP Lists**: Whitelist/blacklist with comments
- **Custom Rules**: Field-based conditions  actions (notify, create_incident, log, sound)
- **Notifications**: Toggle sound, toast messages, auto-incident creation

---

##  Backend Architecture Overview

The backend follows a **7-tier functional architecture** designed for scalability, testability, and maintainability:

```
Tier 1: CONFIG           Centralized environment-based configuration
Tier 2: API              REST/WebSocket endpoints (FastAPI)
Tier 3: CORE             Business logic (capture, condense, AI)
Tier 4: PERSISTENCE      SQLite database operations & schema
Tier 5: OBSERVABILITY    Prometheus metrics & structured logging
Tier 6: INFRASTRUCTURE   Task management, signal handling, cleanup
Tier 7: TESTS            Unit, integration, end-to-end testing
```

### Key Components

#### **Capture** (`core/capture/`)
Multi-source packet acquisition: mock simulated traffic, PCAP file replay, or live TShark capture. Configurable via `MOCK_MODE`, `PCAP_FILE`, or `CAPTURE_INTERFACE`.

#### **Condenser** (`core/condense/`)
Industrial-grade flow aggregation with **8-method anomaly detection**:
- Z-Score, IQR, EWMA (statistical methods)
- Rate-Based, Behavioral, Port Scan (threshold-based)
- Protocol-Specific, Payload Threats (signature-based)
- Severity scoring (0.0-1.0), warmup phase (50s), automatic cleanup every 5 min

#### **AI Agent** (`core/ai/`)
Local LLM reasoning via Ollama (mistral:7b, llama2, openhermes). Generates natural language threat analysis, incident correlation, no cloud dependencies. Timeout handling with graceful fallback.

#### **Database** (`persistence/`)
Async SQLite with batch inserts, indexed queries, automatic retention-based cleanup. Stores events, incidents, query history, optional metrics. Schema versioning ready.

#### **Observability** (`observability/`)
Prometheus metrics (packets, flows, anomalies, AI accuracy) and structured logging (DEBUG/INFO/WARNING/ERROR/CRITICAL). Configurable via `LOG_LEVEL` and `PROMETHEUS_ENABLED`.

#### **Infrastructure** (`infrastructure/`)
Task restart manager with exponential backoff, signal handling for graceful shutdown, resource cleanup. Ensures stability without freezing event loop.

**For detailed backend architecture**: See `backend/README.md`

---

##  Frontend Component Organization

The frontend components are organized into **6 logical categories** for maintainability and scalability:

### Core Components (`src/components/core/`)
**Main application views and state management**
- **ChatPanel** - Natural language query interface to AI
- **MetricsBar** - System performance metrics display
- **StatsDashboard** - Network statistics visualization
- **TopologyView** - Network topology graph visualization

### Events Components (`src/components/events/`)
**Event stream and data analysis views**
- **EventStream** - Real-time security event list with live updates
- **FilterBar** - Multi-criteria event filtering (protocol, IP, severity, etc.)
- **GraphView** - Statistical graph visualization with Recharts
- **ExportMenu** - Export events to CSV/JSON formats

### Modal Components (`src/components/modals/`)
**Dialog boxes for details and interactions**
- **AIDetailsModal** - Detailed AI analysis and explanations
- **EventDetailsModal** - Event inspection and metadata
- **TooltipModal** - Contextual help and information

### Panel Components (`src/components/panels/`)
**Analysis and informational panels**
- **AIExplanationPanel** - AI-generated threat analysis
- **FeedbackPanel** - User feedback collection for ML improvement
- **GlossaryPanel** - Searchable security/network terminology
- **IncidentPanel** - Incident creation, tracking, investigation
- **ProactiveSuggestions** - Context-aware AI recommendations

### Shared Components (`src/components/shared/`)
**Reusable utility components**
- **ExpandableText** - Collapsible text sections
- **KeyboardShortcuts** - Global keyboard shortcut handler
- **ShortcutHint** - Display keyboard shortcut hints

### Feature-Specific Directories
- **alerts/** - Alert configuration and sensitivity tuning (7 files)
- **incidents/** - Incident management UI (2 files)
- **Toast/** - Toast notification system (5 files)
- **topology/** - Network visualization implementation (1 file)

### Component Organization Benefits
 **Clear separation of concerns** - Easy to find related components  
 **Scalability** - Room to grow within each category  
 **Code reusability** - Shared components centralized  
 **Maintainability** - Logical grouping reduces cognitive load  
 **Developer onboarding** - Clear structure for new team members  

**For detailed component documentation**: See `frontend/README.md`  "Component Organization" section

---

### Prerequisites
- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **Ollama** (optional, for AI features)
- **TShark** (optional, for live capture - macOS/Linux/Windows)

### Installation & Setup

#### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py  # Starts on http://localhost:8000
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

#### 3. AI Engine (Optional but Recommended)
```bash
# Install Ollama from https://ollama.ai
ollama serve
# In another terminal:
ollama pull mistral:7b
```

#### 4. Access the UI
Open http://localhost:5173 in your browser

### Configuration
Edit `backend/.env` to control data source:

```bash
# Mock mode (no TShark needed) - generates realistic attack traffic
MOCK_MODE=true

# Replay PCAP file (great for demos)
MOCK_MODE=false
PCAP_FILE=dns-remoteshell.pcap
PCAP_LOOP=true
PCAP_SPEED=1.0

# Live capture (requires TShark + admin/root rights)
MOCK_MODE=false
CAPTURE_INTERFACE=5  # Use tshark -D to find yours

# AI Settings
AI_MODE=local  # or 'remote' for external API
OLLAMA_URL=http://localhost:11434
LOCAL_AI_MODEL=mistral:7b
AI_TIMEOUT=30

# Database
DB_ENABLED=true
DB_PATH=logs/packetflow.db
DB_RETENTION_DAYS=7
```

---

##  Data Sources

### Mock Mode (Default)
- Generates realistic DNS, HTTP, HTTPS traffic
- Includes simulated anomalies (DNS floods, port scans)
- Perfect for testing without network setup
- No TShark or root privileges needed

### PCAP Replay
- Load pre-recorded capture files
- Supports the included `dns-remoteshell.pcap` (DNS tunneling attack)
- Great for demos and training
- Configurable playback speed

### Live Capture
- Real-time network monitoring
- Requires TShark installed and admin rights
- Filters available per interface
- Full network context available to AI

---

##  Technology Stack

### Backend
- **Framework**: FastAPI (async REST/WebSocket)
- **Packet Processing**: TShark CLI, JSON parsing
- **Async**: Python asyncio with queues
- **Database**: SQLite with aiosqlite
- **AI/ML**: Ollama (local LLM), NumPy (statistics), Regex (patterns)
- **Monitoring**: Prometheus metrics, comprehensive logging

### Frontend
- **Framework**: React 18 + TypeScript (strict mode)
- **State Management**: Zustand (persistent localStorage)
- **Build**: Vite
- **Styling**: Tailwind CSS
- **Visualization**: Recharts (stats), D3.js (topology graph)
- **Utilities**: axios (API), ws (WebSocket)

---

##  Project Structure

```
PacketFlow/
 backend/                          # Python 3.11+ async pipeline (7-tier architecture)
    core/                         # Tier 3: Business logic & data processing
       capture/                  # Packet acquisition (TShark, PCAP, mock modes)
       condense/                 # Flow aggregation & 8-method anomaly detection
       ai/                       # LLM reasoning, incident correlation, Ollama integration
    api/                          # Tier 2: FastAPI REST/WebSocket endpoints
    persistence/                  # Tier 4: Async SQLite operations, database schema
    config/                       # Tier 1: Centralized configuration from .env
    observability/                # Tier 5: Prometheus metrics, structured logging
    infrastructure/               # Tier 6: Task management, signal handling, cleanup
    tests/                        # Tier 7: Unit, integration, end-to-end tests
    docs/                         # Architecture and operational documentation
    utils/                        # Development utilities (diagnostics, PCAP tools)
    main.py                       # Entry point (Tier 7 orchestrator)
    requirements.txt              # Python dependencies
    pyproject.toml                # Python project metadata
    Dockerfile                    # Container configuration
    README.md                     # Backend architecture deep dive
    .env                          # Configuration via environment variables
 frontend/                         # React 18 + TypeScript UI (6-category component organization)
    docs/                         # Documentation index & feature guides (19 files)
    src/                          # TypeScript source code
       components/               # React components (39 files, 6 categories)
          core/                 # Main views: ChatPanel, MetricsBar, StatsDashboard, TopologyView
          events/               # Event views: EventStream, FilterBar, GraphView, ExportMenu
          modals/               # Dialogs: AIDetailsModal, EventDetailsModal, TooltipModal
          panels/               # Analysis: AIExplanation, Feedback, Glossary, Incident, Suggestions
          shared/               # Utilities: ExpandableText, KeyboardShortcuts, ShortcutHint
          alerts/               # Feature: Alert configuration & sensitivity tuning
          incidents/            # Feature: Incident management UI
          Toast/                # Feature: Toast notification system
          topology/             # Feature: Network visualization
       context/                  # State management: Zustand store with persistence
       hooks/                    # Custom hooks: useWebSocket, useApi
       types/                    # TypeScript interfaces for network events, UI state
       utils/                    # Helper functions: export, formatting
       styles/                   # Tailwind CSS: globals, color palette, theme
       config/                   # Application configuration: graph layout, constants
       main.tsx                  # React entry point
       App.tsx                   # Root component with main views
    index.html                    # HTML template
    package.json                  # Node dependencies, scripts
    vite.config.ts                # Build configuration
    tsconfig.json                 # TypeScript configuration (strict mode)
    tailwind.config.js            # Tailwind CSS setup
    postcss.config.js             # PostCSS configuration
    README.md                     # Frontend dev guide with component organization
    Dockerfile                    # Container configuration
 .github/
    copilot-instructions.md       # Developer guidelines & patterns
 docker-compose.yml                # Multi-container deployment
 nginx.conf                        # Reverse proxy config
 README.md                         # This file
```

---

##  Development

### Backend Development
```bash
cd backend

# Run with mock mode
python main.py

# Run with PCAP replay
MOCK_MODE=false PCAP_FILE=dns-remoteshell.pcap python main.py

# Run tests
pytest tests/

# Check logs
tail -f logs/packetflow.log
```

### Frontend Development
```bash
cd frontend

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Key Files for Common Tasks

#### Backend: Add New Anomaly Detection Method
- File: `backend/core/condense/condenser.py`
- Method: Add to `_detect_anomalies()`
- Also: Update `ThreatIndicator` enum
- Documentation: `backend/README.md`  Condenser section

#### Backend: Change AI Behavior
- System Prompt: `backend/.env`  `AI_SYSTEM_PROMPT`
- Logic: `backend/core/ai/ai_agent.py`  `_build_context()`
- Config: `backend/config/settings.py`  `AIConfig` class

#### Backend: Add REST Endpoint
- File: `backend/api/websocket_server.py`
- Add: FastAPI route with `@app.get()` or `@app.post()`
- Security: Add `@limiter.limit("10/minute")` for rate limiting
- Metrics: Import from `backend/observability/metrics.py`

#### Frontend: Add New Component
- Location: `frontend/src/components/{core|events|modals|panels|shared}/`
- Export: Add to `frontend/src/components/{category}/index.ts`
- Usage: Import from category folder in `App.tsx` or other components
- Types: Update `frontend/src/types/index.ts` if needed

#### Frontend: Add New UI View
- Create: Component in appropriate category (typically `core/` or `events/`)
- Register: Add tab to view switcher in `frontend/src/App.tsx`
- Import: Use centralized exports from `components/{category}/index.ts`
- State: Manage with Zustand store in `frontend/src/context/store.ts`

---

##  Performance Characteristics

### Latency
- **Packet to Event**: <1 second (5s window default)
- **Event to AI Explanation**: 5-30 seconds (depends on model & latency)
- **AI to WebSocket Broadcast**: <100ms
- **WebSocket to Frontend**: <50ms

### Throughput
- **Mock Mode**: 1000+ events/minute (simulated)
- **PCAP Replay**: Configurable (default 1x realtime)
- **Live Capture**: Depends on interface volume, typically 10-100 events/minute per flow

### Memory
- **Backend**: ~200MB baseline + 10-50MB for buffers
- **Frontend**: ~150MB baseline + event cache
- **Database**: Grows ~1-5MB/day depending on settings

---

##  Security Considerations

### Privacy
-  All processing local (no cloud APIs by default)
-  Database encrypted at rest (can add SQLCipher)
-  CORS validation for WebSocket connections
-  API key validation for protected endpoints

### Production Deployment
-  Change `API_KEY` in `.env`
-  Use HTTPS for frontend (nginx with Let's Encrypt)
-  Run backend on internal network only
-  Consider firewall rules for TShark interface

---

##  Known Issues & Limitations

### Current Limitations
1. **Single-machine only**: No distributed deployment yet
2. **Limited PCAP size**: ~100MB files recommended (buffer can be increased)
3. **AI latency**: Depends on Ollama model performance
4. **Protocol coverage**: ~40 common protocols supported

### Known Issues
See `backend/BACKEND_BUG_REPORT.md` for detailed bug tracking and fixes applied.

---

##  Documentation

### Architecture & Design
- **Root README** - This file (high-level overview)
- **Backend Architecture**: `backend/README.md` (7-tier design, all components)
- **Frontend Architecture**: `frontend/README.md` (6-category organization, components)
- **Frontend Organization**: `frontend/docs/INDEX.md` (documentation index & navigation)

### Backend Implementation
- **Backend Patterns**: `.github/copilot-instructions.md` (conventions, examples, workflows)
- **Database Schema**: `backend/persistence/README.md` (SQL schema, queries, retention)
- **Data Sources**: Analysis of mock mode, PCAP replay, live capture modes

### Frontend Features (9/25 Complete)
- **Feature Documentation**: `frontend/docs/FEATURE_*.md` (6 completed features)
- **IUI Phase 1**: `frontend/docs/IUI_PHASE1_COMPLETE.md` (adaptive UI features)
- **Data Flow**: `frontend/docs/DATA_FLOW_EXPLAINED.md` (state, WebSocket, rendering)

### Reference & Guides
- **Copilot Instructions**: `.github/copilot-instructions.md` (development guidelines)
- **Configuration Guide**: Embedded in root `.env` with inline comments
- **API Reference**: WebSocket format and REST endpoints documented in `backend/api/`

---

##  Use Cases

### Security Operations Center (SOC)
- Real-time monitoring of network traffic
- Incident detection and investigation
- Team collaboration on threat analysis

### Education & Training
- Interactive learning with PCAP replay
- AI-powered explanations of network anomalies
- Glossary and contextual help for learning

### Network Troubleshooting
- Traffic analysis and pattern identification
- Protocol debugging
- Topology visualization

### Research
- Algorithm testing and ML experimentation
- Privacy-preserving analytics
- Local LLM integration patterns

---

##  Contributing

1. Read `.github/copilot-instructions.md` for patterns and conventions
2. Follow the 7-tier backend architecture
3. TypeScript strict mode for frontend
4. Test before committing
5. Update documentation when adding features

---

##  Metrics & Monitoring

### Available Metrics
- Packets processed per second
- Anomalies detected per minute
- AI processing latency
- Database query performance
- WebSocket connection count

### Prometheus Endpoint
```
GET http://localhost:8000/metrics
```

---

##  Roadmap

### Phase 2 (Planned)
- Multi-user support with role-based access
- Distributed deployment (multiple capture nodes)
- Advanced incident correlation
- Custom detection rule builder

### Research Focus
- Multi-agent decomposition for fault tolerance
- Federated learning across organizations
- Enhanced IUI with reinforcement learning
- Real-time threat intelligence integration

---

##  Support & Resources

- **Repository**: [github.com/kkraso01/PacketFlow](https://github.com/kkraso01/PacketFlow)
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **PR Reviews**: Follow contribution guidelines

---

##  License

See LICENSE file in repository root.

---

**Status**: Active Development | Phase 1 Complete | Production-Ready for Single-Machine Deployment  
**Privacy**: 100% Local Processing | No Cloud Dependencies | Fully Offline Capable

---

## Quick Reference

### Environment Variables (`.env`)
| Setting | Default | Description |
|---------|---------|-------------|
| `MOCK_MODE` | true | Use simulated traffic |
| `PCAP_FILE` | empty | Path to PCAP file for replay |
| `WINDOW_SIZE` | 5 | Flow aggregation window (seconds) |
| `ANOMALY_THRESHOLD` | 2.5 | Detection threshold multiplier |
| `AI_MODE` | remote | 'local' (Ollama) or 'remote' (API) |
| `DB_ENABLED` | true | Enable persistent storage |
| `DB_RETENTION_DAYS` | 7 | Delete events older than N days |

### Common Commands

```bash
# Backend
cd backend && python main.py                    # Start with mock mode
MOCK_MODE=false PCAP_FILE=*.pcap python main.py  # Start with PCAP
pytest tests/                                   # Run tests

# Frontend
cd frontend && npm run dev                      # Dev server
npm run build                                   # Production build
npm run preview                                 # Preview build

# Database
sqlite3 logs/packetflow.db ".schema"            # View schema
sqlite3 logs/packetflow.db "SELECT COUNT(*) FROM events;"  # Count events

# AI
ollama serve                                    # Start Ollama
ollama pull mistral:7b                          # Download model
ollama list                                     # List installed models
```
