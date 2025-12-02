# AINetUI - AI-Powered Network Security Monitoring

**Privacy-First Network Intelligence with Local LLM Reasoning**

AINetUI is a real-time network security monitoring interface that combines live packet capture with local AI analysis. Think: "Wireshark meets ChatGPT, but entirely offline." The system captures network packets, detects anomalies using 8 statistical methods, and generates human-readable security insightsall locally with zero cloud dependencies.

---

##  System Concept

### The Problem
Traditional network monitoring tools generate overwhelming amounts of raw data. Security analysts struggle to:
- Identify meaningful patterns in packet floods
- Understand "why" an alert was triggered
- Prioritize threats among thousands of events
- Learn network security concepts in context

### The Solution
AINetUI bridges the gap between raw network data and actionable intelligence by:
1. **Condensing** packet streams into meaningful flow events
2. **Detecting** anomalies using statistical and behavioral methods
3. **Explaining** threats in natural language via local LLM
4. **Teaching** users with contextual help and adaptive UI

**Privacy-First Design**: All processing happens locally. No telemetry, no cloud APIs, no data leaving your network.

---

##  Architecture Overview

```
                     TShark      Condenser    AI Agent     WebSocket   (Capture)           (Analysis)         (Ollama)           (FastAPI)                                                                                                                                                                                                                                                                                                   React UI                                                                       (Zustand)                                                                   ```

### Backend Pipeline (Python)
- **Packet Capture**: Mock/PCAP/Live using TShark
- **Flow Condenser**: Aggregates packets into flows with 8 anomaly detection methods
- **AI Agent**: Generates explanations using Ollama (mistral:7b, llama2)
- **WebSocket Server**: Real-time event broadcasting via FastAPI

### Frontend (React + TypeScript)
- **Event Stream**: Live security events with filtering and search
- **Graph Visualization**: Network topology with D3.js force-directed layout
- **AI Chat**: Natural language queries about network activity
- **Incident Management**: Track, investigate, and resolve security incidents
- **Intelligent UI**: Adaptive interface with contextual help and learning features

---

##  Quick Start

### Prerequisites
- **Python 3.11+** (backend)
- **Node.js 18+** (frontend)
- **Ollama** (optional, for AI features)
- **TShark** (optional, for live capture)

### Installation & Setup

#### 1. Backend
```powershell
cd backend
pip install -r requirements.txt
python main.py  # Starts on http://localhost:8000
```

#### 2. Frontend
```powershell
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

#### 3. AI Engine (Optional)
```powershell
ollama serve
ollama pull mistral:7b
```

### Configuration
Edit `backend/.env` to control data source:
```bash
# Mock mode (no TShark needed) - default for testing
MOCK_MODE=true

# Replay PCAP file (great for demos)
MOCK_MODE=false
PCAP_FILE=dns-remoteshell.pcap
PCAP_LOOP=true

# Live capture (requires TShark + admin rights)
MOCK_MODE=false
PCAP_FILE=
```

---

##  Features

### Core Security Monitoring
- **8-Method Anomaly Detection**: Z-Score, IQR, EWMA, Rate-Based, Behavioral, Port Scan, Protocol-Specific, Payload Analysis
- **Real-Time Event Stream**: Live security events with severity classification
- **Network Topology**: Interactive graph showing host relationships
- **Statistics Dashboard**: Packet rates, protocol distribution, flow metrics

### AI-Powered Analysis
- **Natural Language Explanations**: "Why is this traffic suspicious?"
- **Interactive Chat**: Ask questions about network activity
- **Threat Intelligence**: Pattern recognition and attack identification
- **Contextual Learning**: Educational tooltips and security glossary

### Intelligent User Interface (IUI)
1. **Proactive Suggestions**: Context-aware recommendations based on current events
2. **Event Feedback System**: Mark false positives to improve detection accuracy
3. **User Profile & Adaptive Learning**: Interface adapts to expertise level (novice/intermediate/expert)
4. **Glossary & Contextual Help**: Searchable security terms with tooltips
5. **Keyboard Shortcuts**: Efficient navigation (?, Ctrl+,, Ctrl+K, Ctrl+N)

### Incident Management
- **Create & Track Incidents**: Convert events into trackable security incidents
- **Status Management**: open  investigating  resolved/false_positive
- **Notes & Collaboration**: Add comments and assign to analysts
- **Event Linking**: Associate multiple events with a single incident
- **Search & Filter**: Find incidents by title, tags, status, severity

### Alert Configuration
- **Sensitivity Slider**: Adjust global anomaly threshold (0-100)
- **Custom Thresholds**: Fine-tune anomaly_score, flow_rate, packet_rate, byte_rate
- **IP Lists**: Whitelist and blacklist with comments
- **Custom Rules**: Field-based conditions with actions (notify, create_incident, log, sound)
- **Notification Settings**: Control sound, toast, auto-incident creation

---

##  Intelligent User Interface (IUI) Project Requirements

### Objective
Enhance traditional security monitoring with intelligent features that:
- **Guide** users through complex security analysis
- **Teach** security concepts in context
- **Adapt** to user expertise level
- **Predict** potential threats before escalation

### Phase 1 - Completed Features

#### 1. Proactive Suggestions
- **Context-Aware Recommendations**: System analyzes current events and suggests next steps
- **Priority Levels**: high/medium/low based on threat severity
- **Suggestion Types**: investigation, action, filter, insight, learning
- **Auto-Dismissal**: Suggestions expire after timeframe or when no longer relevant

#### 2. Event Feedback System
- **User Labeling**: Mark events as true_positive, false_positive, missed_detection
- **Accuracy Tracking**: Monitor detection system performance over time
- **Severity Correction**: Users can adjust severity levels with explanations
- **Learning Loop**: Feedback influences future detection and suggestions

#### 3. User Profile & Adaptive Learning
- **Expertise Levels**: novice (basic explanations), intermediate (balanced), expert (technical details)
- **Interaction Tracking**: System learns from user behavior patterns
- **Alert History**: Track true/false positive rates per user
- **Learning Progress**: Track concepts seen, tooltips dismissed, tutorials completed
- **Persistent State**: User profile saved to localStorage across sessions

#### 4. Glossary & Contextual Help
- **Searchable Security Terms**: 50+ definitions for network and security concepts
- **Categorization**: security, network, statistics, protocol
- **Context-Sensitive Tooltips**: Hover over terms for instant definitions
- **Keyboard Shortcut**: Press `?` to access help modal
- **Related Terms**: Cross-linking for deeper learning

#### 5. Keyboard Shortcuts & Efficiency
- **Global Shortcuts**: Quick access to common actions
  - `?` - Show shortcuts help
  - `Ctrl+,` - Alert configuration
  - `Ctrl+K` - Focus search
  - `Ctrl+N` - New incident
  - `Ctrl+[1-3]` - Switch between event/stats/topology views
  - `Ctrl+L` - Toggle left panel (chat/incidents)
- **Visual Hints**: Non-intrusive bottom-center hint display
- **Efficiency Gains**: Reduce mouse usage, speed up common workflows

### Design Principles
1. **Privacy-First**: All intelligence runs locally, no cloud dependencies
2. **Progressive Disclosure**: Show basic info first, detail on demand
3. **Non-Intrusive**: Suggestions don't block primary workflow
4. **Accessible**: Keyboard navigation, clear visual hierarchy
5. **Educational**: Every interaction is an opportunity to learn

### Metrics & Success Criteria
- **User Engagement**: Track feature usage (suggestions clicked, glossary searches, shortcuts used)
- **Detection Accuracy**: Monitor false positive rate reduction through feedback
- **Learning Progress**: Measure concepts learned, expertise level progression
- **Time to Resolution**: Track incident creation to resolution time
- **User Satisfaction**: Self-reported expertise confidence increase

---

##  Anomaly Detection Methods

### Statistical Methods
1. **Z-Score**: Detects sudden spikes (3 threshold)
2. **IQR (Interquartile Range)**: Robust median-based outlier detection
3. **EWMA (Exponential Weighted Moving Average)**: Trend change detection
4. **Rate-Based**: Packets/second and bytes/second thresholds

### Behavioral Analysis
5. **Behavioral Metrics**: Packet size entropy, inter-arrival timing patterns
6. **Port Scan Detection**: Tracks unique dest ports per source (20+ in 5min = anomaly)

### Protocol-Specific Detection
7. **DNS**: Tunneling (long domains, high entropy), excessive queries
8. **HTTP**: Suspicious methods (PUT, DELETE), unusual paths, SQL injection attempts
9. **TLS**: Weak ciphers, unusual certificate patterns

### Payload Analysis
10. **Threat Signatures**: Regex patterns for SQL injection, XSS, command injection, directory traversal

**Severity Scoring**:
- 0.9+  CRITICAL - 0.7-0.9  HIGH - 0.5-0.7  MEDIUM - 0.3-0.5  LOW 
---

##  Technology Stack

### Backend
- **Python 3.11+**: Core language
- **FastAPI**: WebSocket server and REST API
- **asyncio**: Asynchronous pipeline processing
- **TShark**: Packet capture (optional)
- **Ollama**: Local LLM inference

### Frontend
- **React 18**: UI framework
- **TypeScript**: Type-safe development
- **Zustand**: State management (lighter than Redux)
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first styling
- **D3.js**: Network topology visualization
- **dayjs**: Date/time formatting
- **lucide-react**: Icon library

### AI/ML
- **Ollama**: Local LLM serving (mistral:7b, llama2, openhermes)
- **Statistical Methods**: NumPy-based anomaly detection
- **Pattern Matching**: Regex-based threat signatures

---

##  Project Structure

```
AINetUI/
 backend/
    capture.py              # Packet capture (mock/PCAP/live)
    condense_enhanced.py    # Flow aggregation + anomaly detection
    ai_agent.py             # LLM reasoning and explanations
    websocket_server.py     # FastAPI WebSocket server
    config.py               # Configuration management
    task_manager.py         # Async task lifecycle
    metrics.py              # Prometheus metrics (optional)
    requirements.txt        # Python dependencies
 frontend/
    src/
       components/         # React components
          alerts/         # Alert configuration system
          incidents/      # Incident management
          topology/       # Network graph visualization
          EventStream.tsx
          ChatPanel.tsx
          StatsDashboard.tsx
          ...
       context/
          store.ts        # Zustand state management
          ToastContext.tsx
       hooks/
          useWebSocket.ts # Auto-reconnecting WebSocket
          useApi.ts
       types/
          index.ts        # TypeScript type definitions
       App.tsx             # Main application component
    package.json
    vite.config.ts
 .github/
    copilot-instructions.md # Developer guidelines
 docker-compose.yml          # Container orchestration
 dns-remoteshell.pcap        # Demo PCAP file (DNS tunneling)
 README.MD                   # This file
```

---

##  Use Cases

### Security Operations Center (SOC)
- **Real-time monitoring**: Live threat detection on network perimeter
- **Incident tracking**: Convert alerts into trackable cases
- **Team collaboration**: Assign incidents, add notes, share insights
- **Shift handoffs**: Persistent state for continuity

### Education & Training
- **Security concepts**: Interactive glossary with 50+ terms
- **Attack scenarios**: Load PCAP files of real attacks
- **AI explanations**: Understand "why" something is malicious
- **Progressive learning**: Interface adapts to skill level

### Network Troubleshooting
- **Traffic analysis**: Identify bandwidth hogs and unusual patterns
- **Protocol issues**: Detect misconfigurations and errors
- **Topology view**: Visualize host communication patterns
- **Historical replay**: Analyze PCAP files from past incidents

### Research & Development
- **Algorithm testing**: Compare anomaly detection methods
- **ML experimentation**: Train on labeled events (user feedback)
- **Privacy research**: Study network behavior without cloud dependencies
- **Interface design**: Test IUI concepts in real-world scenarios

---

##  Roadmap

### Phase 2 - In Progress
- [ ] Enhanced topology with subnet grouping
- [ ] Export reports (PDF/CSV)
- [ ] Multi-user support with authentication
- [ ] Historical data persistence (database)
- [ ] Advanced filtering with saved queries

### Phase 3 - Planned
- [ ] Predictive analytics (ML-based threat forecasting)
- [ ] Integration with SIEM systems
- [ ] Mobile-responsive design
- [ ] Dark/light theme customization
- [ ] Plugin architecture for custom detectors

---

##  Contributing

This project is part of a research initiative on Intelligent User Interfaces for cybersecurity. Contributions welcome!

### Areas for Contribution
- **Anomaly Detection**: New statistical methods or ML models
- **UI/UX**: Accessibility improvements, design enhancements
- **Documentation**: Tutorials, video walkthroughs, use case studies
- **Testing**: PCAP files with labeled attacks, unit tests
- **IUI Features**: Novel intelligent interface concepts

---

##  License

[Specify your license here - MIT, Apache 2.0, GPL, etc.]

---

##  Contact

**Project**: AINetUI (PacketFlow)  
**Repository**: [github.com/kkraso01/PacketFlow](https://github.com/kkraso01/PacketFlow)  
**Documentation**: See `/frontend/*_COMPLETE.md` for feature details

---

##  Acknowledgments

- **Ollama Team**: Local LLM inference engine
- **FastAPI**: Modern Python web framework
- **React Community**: UI component ecosystem
- **Zustand**: Elegant state management
- **Wireshark/TShark**: Industry-standard packet analysis

---

**Built with  for privacy-conscious security professionals**
