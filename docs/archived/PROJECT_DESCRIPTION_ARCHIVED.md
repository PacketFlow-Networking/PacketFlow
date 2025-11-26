# 📦 ARCHIVED: Project Description (Consolidated into README.md)

**Consolidated**: November 2025  
**Status**: Archived for reference only - all content merged into main README.md

---

# PacketFlow - AI-Powered Network Security Monitoring

## Project Overview
**PacketFlow** is a privacy-first, real-time network security monitoring interface that combines packet capture with local LLM reasoning. It transforms raw network telemetry into actionable intelligence through automated anomaly detection and natural language explanations—entirely offline with zero cloud dependencies.

**Concept**: "Wireshark meets ChatGPT, but privacy-first"

## Core Architecture
```
TShark Capture → Flow Condenser → AI Agent (Ollama) → WebSocket (FastAPI) → React UI (Zustand)
```

**Backend (Python)**: Async pipeline with packet capture, 8-method anomaly detection, local LLM reasoning
**Frontend (React/TypeScript)**: Real-time event stream, network topology graph, AI chat, incident management

## Key Features

### 1. Security Monitoring
- **8 Anomaly Detection Methods**: Z-Score, IQR, EWMA, Rate-Based, Behavioral, Port Scan, Protocol-Specific, Payload Analysis
- **Severity Scoring**: CRITICAL (0.9+) → HIGH (0.7-0.9) → MEDIUM (0.5-0.7) → LOW (0.3-0.5)
- **Real-Time Events**: Live packet stream condensed into meaningful flow events
- **Network Topology**: Interactive D3.js graph showing host communication patterns

### 2. AI-Powered Intelligence
- **Natural Language Chat**: Query network activity conversationally
- **Automated Explanations**: LLM generates threat analysis for anomalies
- **Local Processing**: Ollama serves mistral:7b/llama2 on-premise (no cloud APIs)
- **Context-Aware**: Sliding window maintains recent network state for LLM reasoning

### 3. Intelligent User Interface (IUI)
**Goal**: Enhance analyst effectiveness through adaptive, educational interface

#### Phase 1 Features (Completed):
1. **Proactive Suggestions**: Context-aware recommendations (investigation/action/filter/insight/learning)
2. **Event Feedback System**: Label true/false positives to improve detection accuracy
3. **User Profile & Adaptive Learning**: Interface adapts to expertise level (novice/intermediate/expert)
4. **Glossary & Contextual Help**: 50+ searchable security terms with tooltips
5. **Keyboard Shortcuts**: Efficient navigation (?, Ctrl+,, Ctrl+K, Ctrl+N)

#### Design Principles:
- **Privacy-First**: All intelligence runs locally
- **Progressive Disclosure**: Show basic info first, details on demand
- **Non-Intrusive**: Suggestions don't block workflow
- **Educational**: Every interaction teaches security concepts

### 4. Incident Management
- **Lifecycle Tracking**: open → investigating → resolved/false_positive
- **Event Linking**: Associate multiple events with single incident
- **Collaboration**: Notes, assignments, tags
- **State Management**: Zustand store with `selectedIncidentId` for immediate UI updates
- **Search & Filter**: By title, description, tags, status, severity

### 5. Alert Configuration
- **Sensitivity Slider**: Global anomaly threshold (0-100)
- **Custom Thresholds**: anomaly_score, flow_rate, packet_rate, byte_rate
- **IP Lists**: Whitelist/blacklist with comments
- **Custom Rules**: Field-based conditions → actions (notify, create_incident, log, sound)

## Technology Stack

**Backend**: Python 3.11+, FastAPI, asyncio, TShark (optional), Ollama
**Frontend**: React 18, TypeScript, Zustand, Vite, Tailwind CSS, D3.js
**AI/ML**: Ollama (local LLM), NumPy (statistical detection), Regex (payload analysis)

## Data Sources (Configurable via `.env`)
- **Mock Mode**: Simulated packets (default, no TShark needed)
- **PCAP Replay**: Load capture files (e.g., `dns-remoteshell.pcap`)
- **Live Capture**: Real-time monitoring (requires TShark + admin rights)

## Project Goals

### Research Objectives:
1. **Real-Time Intelligence**: Integrate streaming network data with LLM reasoning
2. **Natural Language Interaction**: Enable conversational network queries
3. **Data Condensation**: Automated feature extraction via sliding windows
4. **Privacy-Preserving AI**: Deploy open-source LLMs locally (no cloud)
5. **Human-Centered Design**: Intuitive IUI blending chat, visuals, transparent reasoning
6. **Analyst Empowerment**: Reduce cognitive load, accelerate root-cause diagnosis
7. **Scalability**: Explore multi-agent decomposition for fault tolerance

### Expected Outcomes:
- Faster incident detection/response (reduced MTTD/MTTR)
- Lower analyst workload through automated summarization
- Enhanced interpretability and trust in AI diagnostics
- Transferable framework for domain-specific LLM applications

## IUI Metrics & Success Criteria
- **User Engagement**: Track suggestions clicked, glossary searches, shortcuts used
- **Detection Accuracy**: Monitor false positive rate reduction via feedback
- **Learning Progress**: Measure concepts learned, expertise progression
- **Time to Resolution**: Incident creation → resolution duration
- **User Satisfaction**: Self-reported confidence increase

## Use Cases
1. **SOC Operations**: Real-time monitoring, incident tracking, team collaboration
2. **Education & Training**: Interactive learning with glossary, PCAP replay, AI explanations
3. **Network Troubleshooting**: Traffic analysis, protocol debugging, topology visualization
4. **Research**: Algorithm testing, ML experimentation, privacy-preserving analytics

## Current State
- ✅ **Backend Pipeline**: Capture, condenser, AI agent, WebSocket server
- ✅ **Frontend Core**: Event stream, topology, chat, stats dashboard
- ✅ **IUI Phase 1**: All 5 features complete (suggestions, feedback, learning, glossary, shortcuts)
- ✅ **Incident Management**: Full lifecycle with state management
- ✅ **Alert System**: Sensitivity, thresholds, IP lists, custom rules

## Quick Start
```bash
# Backend (port 8000)
cd backend && pip install -r requirements.txt && python main.py

# Frontend (port 5173)
cd frontend && npm install && npm run dev

# AI Engine (optional)
ollama serve && ollama pull mistral:7b
```

## Project Structure
```
PacketFlow/
├── backend/           # Python: capture, condenser, AI agent, WebSocket
├── frontend/src/      # React: components, context (store.ts), hooks, types
├── .github/           # copilot-instructions.md (developer guidelines)
├── docs/archived/     # Historical documentation
└── README.md          # Main documentation (consolidated)
```

## Key Innovation
**Intelligent Interfaces for Cybersecurity**: PacketFlow demonstrates how local LLMs + adaptive UIs can transform complex security data into accessible, conversational intelligence without compromising privacy. The IUI research focuses on guiding analysts through investigation workflows, teaching security concepts contextually, and adapting to user expertise—creating a collaborative human-AI partnership for network defense.

---

## 📍 See Also
- **Main Documentation**: [README.md](../../README.md)
- **Backend Guide**: [backend/README.md](../../backend/README.md)
- **Frontend Guide**: [frontend/README.md](../../frontend/README.md)

---

**Repository**: [github.com/kkraso01/PacketFlow](https://github.com/kkraso01/PacketFlow)  
**Status**: Active Development | IUI Phase 1 Complete | Production-Ready  
**Privacy**: 100% Local Processing | No Cloud Dependencies
