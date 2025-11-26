# PacketFlow - Copilot Instructions

## Project Overview
PacketFlow is an **AI-powered real-time network security monitoring interface** that combines live packet capture with local LLM reasoning. Think: "Wireshark meets ChatGPT, but privacy-first." The system captures network packets, condenses them into meaningful flow events, detects anomalies, and generates human-readable security insights—all locally with no cloud dependencies.

**Architecture Pattern**: Classic async pipeline with queue-based decoupling:
```
Capture  Condenser  AI Agent  WebSocket  React UI
(TShark)  (Flow+Stats) (Ollama)   (FastAPI)   (Zustand)
```

## Critical Workflows

### Running the Full Stack
```powershell
# Terminal 1: Backend (Python 3.11+)
cd backend
pip install -r requirements.txt
python main.py  # Starts on :8000, uses mock mode by default

# Terminal 2: Frontend (Node 18+)
cd frontend
npm install
npm run dev  # Starts on :5173

# Terminal 3: Ollama (for AI features)
ollama serve
ollama pull mistral:7b  # or llama2, openhermes
```

**Important**: Backend `.env` controls data source:
- `MOCK_MODE=true`  Simulated packets (no TShark needed)
- `MOCK_MODE=false` + `PCAP_FILE=dns-remoteshell.pcap`  Replay PCAP
- `MOCK_MODE=false` + empty `PCAP_FILE`  Live capture (requires TShark + admin rights)

### Testing Individual Components
```powershell
# Test WebSocket connection
python backend/test_client.py

# Test packet capture only
python backend/capture.py

# Test condenser with sample data
python backend/simple_pcap_test.py
```

## Data Flow Architecture

### Backend Pipeline (Async Queues)
1. **`capture.py`**  Reads packets (mock/PCAP/live)  `packet_queue` (1000 max)
2. **`condense_enhanced.py`**  Aggregates flows, detects 8 anomaly types  `event_queue` (100 max)
3. **`ai_agent.py`**  Generates explanations via Ollama  `output_queue` (100 max)
4. **`websocket_server.py`**  Broadcasts to all connected clients

**Key Pattern**: All queues are `asyncio.Queue` with backpressure handling. If queues fill up, components log warnings and may drop packets (see `task_manager.py` for restart logic).

### Frontend State Flow (Zustand)
- **`useWebSocket.ts`**: Auto-reconnecting WebSocket with exponential backoff (20s  40s  60s max)
- **`store.ts`**: Single source of truth, persisted to localStorage (filters, alerts, incidents, selectedIncidentId)
- **`App.tsx`**: Orchestrates 6 main views (events/stats/topology + chat/incidents)

**Critical Detail**: Events are deduplicated by `timestamp + src + dst + proto` composite key to avoid duplicates during reconnects.

**State Management Patterns**:
- `selectedEventId` - Tracks active event for details modal
- `selectedIncidentId` - Tracks active incident, auto-set on creation, auto-cleared on deletion
- All selections persist to localStorage for session continuity

## Project-Specific Conventions

### Backend Patterns
1. **Config via `config.py`**: All settings are loaded from `.env`  `config.py`  passed to components. Never hardcode URLs or thresholds.
   ```python
   from config import config
   # Use: config.capture.interface, config.ai.ollama_url, etc.
   ```

2. **Logging Standard**: Use module-level loggers with context:
   ```python
   logger = logging.getLogger(__name__)
   logger.info(f"Processing {count} packets in {duration:.2f}s")
   ```

3. **Error Handling**: Graceful degradationif Ollama fails, events still flow without `ai_explanation`. Check `ai_processed` flag.

4. **Queue Patterns**: Always use `queue.get()` with timeout and `queue.put_nowait()` with `try/except QueueFull`.

### Frontend Patterns
1. **TypeScript Strictness**: All network data types are in `frontend/src/types/index.ts`. Never use `any` for event/message types.

2. **Zustand Actions**: State mutations only through store actions (`addEvent`, `setFilters`, `selectIncident`), never direct assignment.

3. **Component Organization**:
   - `components/`  UI components (alerts/, incidents/, topology/ subdirs for features)
   - `hooks/`  Side effects (useWebSocket, useApi)
   - `context/`  Global state (store.ts, ToastContext.tsx)

4. **Tailwind CSS**: Custom color palette in `globals.css` (`--color-base`, `--color-panel`, etc.). Don't use arbitrary values.

5. **Memory Management**: `clearOldEvents(10 * 60 * 1000)` runs every 60s to prevent memory leaks (keeps last 200 events).

6. **UI Positioning**: Floating elements (keyboard shortcuts, tooltips) positioned at `bottom-center` (`left-1/2 -translate-x-1/2`) to avoid panel interference.

## The "Flow Condenser" Brain

**Most unique/complex component**: `backend/condense_enhanced.py` implements 8-method anomaly detection:

1. **Z-Score**: Detects sudden spikes (3 threshold)
2. **IQR**: Robust median-based detection
3. **EWMA**: Exponentially weighted moving average for trend changes
4. **Rate-Based**: Packets/second threshold
5. **Behavioral**: Packet size entropy, inter-arrival timing
6. **Port Scan**: Tracks unique dest ports per source (20+ in 5min  anomaly)
7. **Protocol-Specific**: DNS tunneling (long domains, high entropy), HTTP attacks (suspicious methods), TLS weaknesses
8. **Payload Threats**: Regex patterns for SQL injection, XSS, command injection, directory traversal

**Warmup Phase**: First 10 time windows (default: 50 seconds) establish baselines before anomaly detection activates. Check `is_warmed_up` flag.

**Severity Scoring**:
- `0.9+`  CRITICAL 
- `0.7-0.9`  HIGH 
- `0.5-0.7`  MEDIUM 
- `0.3-0.5`  LOW 

**Memory Cleanup**: Runs every 5 minutes to prevent leaks (see `_cleanup_old_data()` method).

## Integration Points

### WebSocket Message Format (Backend  Frontend)
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
    "summary": " ANOMALY [CRITICAL]: DNS spike detected...",
    "ai_explanation": "Detected DNS tunneling attempt...",
    "ai_processed": true
  }
}
```

### REST API Endpoints (FastAPI)
- `GET /status`  System metrics (packets/sec, flows, anomalies, uptime)
- `GET /health`  Health check for load balancers
- `GET /metrics`  Prometheus metrics (if enabled)
- `POST /query`  Send natural language query to AI (rate-limited: 10/min)

### AI Agent Modes (`config.ai.mode`)
- `local`  Ollama at `localhost:11434` (default, privacy-first)
- `remote`  External API (e.g., UCY ChatGPT proxy) with optional web search
- `mock`  Returns canned responses (testing without AI)

## Common Pitfalls & Solutions

### "No events appearing in frontend"
1. Check backend is running: `curl http://localhost:8000/status`
2. Check WebSocket connection in browser DevTools  Network  WS
3. Verify `.env` has `MOCK_MODE=true` for testing
4. Look for queue backpressure warnings in `backend/logs/packetflow.log`

### "AI explanations are empty"
1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check model is pulled: `ollama list` (should show mistral:7b or llama2)
3. Look for AI timeout errors in logs (increase `AI_TIMEOUT` in `.env`)
4. Fallback: Events still flow without AI, check `ai_processed: false`

### "Port scan detection not working"
- Port scan tracking uses a **5-minute sliding window** (`_cleanup_old_data()` runs every 5min)
- Requires 20+ unique destination ports from same source
- Check `port_scan_tracker` dict size in logs

### "Frontend shows stale data"
- Events are limited to last 200 (see `store.ts`  `addEvent`)
- `clearOldEvents(600000)` removes events older than 10 minutes
- Refresh browser to clear persisted Zustand state if needed

## Testing Patterns

### Backend Mock Data
Default mock mode generates:
- **Normal traffic**: HTTP, DNS, HTTPS from 3 workstation IPs (192.168.1.10/15/20)
- **Anomaly spikes**: Every 30 iterations  100-packet DNS flood from 192.168.1.50
- **Attack scenarios**: C2 beaconing, lateral movement, data exfiltration

### Using Real PCAP for Demos
```powershell
# Edit backend/.env
MOCK_MODE=false
PCAP_FILE=dns-remoteshell.pcap
PCAP_LOOP=true
PCAP_SPEED=1.0

# Restart backend
cd backend
python main.py
```
The `dns-remoteshell.pcap` file contains DNS tunneling attack trafficgreat for live demos.

## Key Files for Common Tasks

### Add new anomaly detection method
- Edit: `backend/condense_enhanced.py`  `_detect_anomalies()` method
- Add new threat indicator to: `backend/condense_enhanced.py`  `ThreatIndicator` enum
- Update docs: `CONDENSER_EXPLAINED.md`

### Add new UI visualization
- Create component in: `frontend/src/components/`
- Add to main view switcher: `frontend/src/App.tsx`  `activeTab` state
- Import types from: `frontend/src/types/index.ts`

### Change AI prompt/behavior
- Edit system prompt: `backend/.env`  `AI_SYSTEM_PROMPT`
- Or modify: `backend/ai_agent.py`  `_build_context()` method

### Add new REST endpoint
- Edit: `backend/websocket_server.py`  FastAPI app
- Add rate limiting: Use `@limiter.limit("10/minute")` decorator
- Add Prometheus metrics: Import from `metrics.py`

### Modify incident management
- State management: `frontend/src/context/store.ts`
- Main panel: `frontend/src/components/IncidentPanel.tsx`
- Create modal: `frontend/src/components/incidents/CreateIncidentModal.tsx`
- Details modal: `frontend/src/components/incidents/IncidentDetailsModal.tsx`
- Pattern: Use `selectIncident(id)` for state changes, `addIncident()` auto-selects new incidents

## Documentation Index
- **Architecture**: `NEW_ARCHITECTURE.md`, `CONDENSER_EXPLAINED.md`
- **Data sources**: `DATA_SOURCE_ANALYSIS.md` (mock vs PCAP vs live)
- **Backend details**: `backend/README.md`
- **Frontend details**: `frontend/README.md`
- **Deployment**: `docker-compose.yml`, `backend/Dockerfile`
- **Features**: `frontend/FEATURE_*_COMPLETE.md` (6 features), `frontend/IUI_PHASE1_COMPLETE.md`

## Intelligent User Interface (IUI) Features

### Phase 1 Completed Features:
1. **Proactive Suggestions** (`ProactiveSuggestions.tsx`)
   - Context-aware recommendations based on current events
   - Priority levels (high/medium/low)
   - Types: investigation, action, filter, insight, learning
   - Auto-dismissal and expiration

2. **Event Feedback System** (`FeedbackPanel.tsx`)
   - Users can label events: true_positive, false_positive, missed_detection
   - Tracks accuracy rate in user profile
   - Correctable severity levels
   - Used to improve future detections

3. **User Profile & Adaptive Learning**
   - Expertise levels: novice, intermediate, expert
   - Tracks interaction count and alert history
   - Learning progress (concepts seen, tooltips dismissed)
   - Stored in `store.ts` and persisted to localStorage

4. **Glossary & Contextual Help** (`GlossaryPanel.tsx`)
   - Searchable security/network term definitions
   - Categories: security, network, statistics, protocol
   - Context-sensitive tooltips throughout UI
   - Keyboard shortcut: `?` for help, displayed at bottom-center

5. **Keyboard Shortcuts** (`KeyboardShortcuts.tsx`)
   - Global shortcuts for common actions
   - `?` - Show shortcuts help
   - `Ctrl+,` - Alert configuration
   - `Ctrl+K` - Focus search
   - `Ctrl+N` - New incident
   - Tab navigation and panel toggling
   - Hint displayed at bottom-center to avoid panel interference

### Alert Configuration System (Feature 4):
- **Sensitivity slider**: Adjusts global anomaly threshold (0-100)
- **Custom thresholds**: anomaly_score, flow_rate, packet_rate, byte_rate
- **IP Lists**: Whitelist and blacklist with comments
- **Custom Rules**: Field-based conditions with actions (notify, create_incident, log, sound)
- **Notifications**: Toggle sound, toast, auto-incident creation
- Accessible via `Ctrl+,` shortcut

### Incident Management (Feature 7):
- **State Pattern**: Centralized `selectedIncidentId` in Zustand store
- **Auto-Selection**: Creating incident automatically opens details modal
- **Immediate Updates**: All mutations trigger instant UI refresh
- **Features**: Create, view, edit, delete, add notes, change status, assign, tag
- **Statuses**: open, investigating, resolved, false_positive
- **Severities**: critical, high, medium, low
- **Search & Filter**: By title, description, tags, status
- Left panel toggle between Chat and Incidents

## Development Guidelines
- **Python**: Use type hints, async/await, structured logging
- **TypeScript**: Strict mode, no `any`, prefer interfaces over types
- **Commits**: Link to issue numbers, keep < 300 lines changed
- **Docs**: Update `*_COMPLETE.md` files when finishing features
