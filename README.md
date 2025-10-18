# AINetUI  AI-Augmented Network Analyst Interface

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**AINetUI** is an intelligent user interface for real-time network analysis that integrates live packet capture, streaming data condensation, and local large language model (LLM) reasoning to assist analysts in understanding network behavior, anomalies, and security events.

##  Features

- **Real-time Packet Capture** - Stream network packets using TShark
- **Intelligent Aggregation** - Condense packets into meaningful flow events
- **AI-Powered Analysis** - Local LLM generates human-readable explanations
- **Anomaly Detection** - Automatically identify unusual network behavior
- **WebSocket Streaming** - Real-time updates to connected clients
- **Privacy-First** - All AI inference happens locally, no cloud APIs
- **Mock Mode** - Test without real network capture

##  Architecture

```
          
   Capture     Condenser     AI Agent   
  (TShark/          (Flow              (Ollama    
   Mock)            Aggregation)        LLM)      
          
                                                  
                                                  
                                          
                                            WebSocket   
                                             Server     
                                            (FastAPI)   
                                          
```

##  Quick Start

### Prerequisites

- Python 3.11 or higher
- [Ollama](https://ollama.ai) (for AI features)
- TShark/Wireshark (optional, for real packet capture)

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/AINetUI.git
cd AINetUI
```

2. **Install dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

3. **Install Ollama and download a model:**
```bash
# Install from: https://ollama.ai
# Then pull a model:
ollama pull llama2
```

4. **Configure the application:**
```bash
cp backend/.env.example backend/.env
# Edit .env if needed
```

5. **Run the backend:**
```bash
python backend/main.py
```

The server will start at `http://localhost:8000`

### Testing

Test the WebSocket connection:
```bash
python backend/test_client.py
```

Test REST API endpoints:
```bash
python backend/test_client.py --api-test
```

Or use curl:
```bash
curl http://localhost:8000/status
```

##  API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service information |
| `/status` | GET | System statistics and metrics |
| `/health` | GET | Health check |
| `/ws/updates` | WebSocket | Real-time event stream |

##  Configuration

Configuration is done via environment variables (`.env` file):

```env
# Capture Settings
CAPTURE_INTERFACE=eth0        # Network interface to monitor
MOCK_MODE=true                # Use simulated data (true) or real capture (false)

# Condenser Settings
WINDOW_SIZE=10                # Time window in seconds for aggregation
ANOMALY_THRESHOLD=5.0         # Multiplier for anomaly detection (5 = anomaly)

# AI Agent Settings
OLLAMA_URL=http://localhost:11434
AI_MODEL=llama2               # Model: llama2, mistral, openhermes, etc.
AI_TIMEOUT=30                 # Request timeout in seconds

# Server Settings
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

##  Docker Deployment

Run with Docker Compose:

```bash
docker-compose up -d
```

This will start:
- Backend service on port 8000
- Ollama service on port 11434

Wait for Ollama to download the model on first run:
```bash
docker-compose exec ollama ollama pull llama2
```

##  Project Structure

```
AINetUI/
 backend/
    capture.py              # Packet capture module
    condense.py             # Flow aggregation and anomaly detection
    ai_agent.py             # LLM integration
    websocket_server.py     # FastAPI WebSocket server
    main.py                 # Application entry point
    test_client.py          # WebSocket test client
    requirements.txt        # Python dependencies
    .env.example            # Configuration template
    Dockerfile              # Docker container definition
    README.md               # Backend documentation
 docker-compose.yml          # Multi-service orchestration
 README.md                   # This file
 instructions.md             # Project specifications
```

##  Example WebSocket Message

Events are streamed in real-time via WebSocket:

```json
{
  "type": "network_event",
  "data": {
    "timestamp": "2024-10-09T15:30:50.123456",
    "src": "192.168.1.50",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "src_port": 52341,
    "dst_port": 53,
    "flows": 500,
    "total_bytes": 32000,
    "avg_packet_size": 64,
    "duration": 10,
    "is_anomaly": true,
    "anomaly_score": 0.91,
    "summary": " ANOMALY: UDP spike detected (10.2 normal rate) from 192.168.1.50 to 8.8.8.8 (DNS)",
    "ai_explanation": "This appears to be a DNS amplification attack or DNS tunneling attempt. The unusually high volume of DNS queries suggests malicious activity. Recommended action: Block or rate-limit traffic from this source IP.",
    "ai_processed": true
  },
  "timestamp": "2024-10-09T15:30:50.456789"
}
```

##  Mock Mode

The system includes a mock mode that generates simulated network traffic for testing:

- Normal traffic patterns from multiple hosts
- Periodic anomaly spikes (DNS floods)
- Realistic packet characteristics

Enable mock mode in `.env`:
```env
MOCK_MODE=true
```

##  Real Packet Capture

To capture real network traffic:

1. **Find your network interface:**
```bash
# Windows
ipconfig

# Linux/macOS
ifconfig
# or
ip link show
```

2. **Update configuration:**
```env
MOCK_MODE=false
CAPTURE_INTERFACE=Wi-Fi  # or eth0, en0, etc.
```

3. **Run with appropriate permissions:**
```bash
# Linux/macOS
sudo python backend/main.py

# Windows
# Run terminal as Administrator
python backend/main.py
```

##  AI Models

Supported models (via Ollama):

- **llama2** (7B) - General purpose, good balance
- **mistral** (7B) - Fast and efficient
- **openhermes** (7B) - Fine-tuned for instructions
- **codellama** (7B) - Code-aware analysis

Install additional models:
```bash
ollama pull mistral
ollama pull openhermes
```

Then update `.env`:
```env
AI_MODEL=mistral
```

##  Performance

Typical performance on consumer hardware:

- **Packet Processing**: 1000-5000 packets/second
- **Event Aggregation**: Real-time (10s windows)
- **AI Response Time**: 2-5 seconds (7B models)
- **Memory Usage**: 2-4 GB (backend + LLM)

##  Security & Privacy

- All data processing happens locally
- No external API calls
- No packet payloads are logged
- AI reasoning is auditable (source data included)
- WebSocket connections are not authenticated (add in production)

##  Roadmap

### Phase 1: Backend MVP 
- [x] Packet capture (TShark + mock)
- [x] Flow condensation
- [x] Anomaly detection
- [x] Local LLM integration
- [x] WebSocket streaming

### Phase 2: Frontend UI
- [ ] React dashboard
- [ ] Real-time visualizations
- [ ] Chat interface for queries
- [ ] Anomaly timeline
- [ ] Network topology view

### Phase 3: Advanced Features
- [ ] Persistent storage (TimescaleDB)
- [ ] Advanced anomaly algorithms
- [ ] Multi-agent AI system
- [ ] Custom detection rules
- [ ] Alert system

### Phase 4: Production Ready
- [ ] Authentication & authorization
- [ ] TLS/SSL support
- [ ] Rate limiting
- [ ] Performance optimization
- [ ] Comprehensive testing

##  Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

##  Development Guidelines

- Use Python type hints
- Follow PEP 8 style guide
- Add docstrings to functions
- Include inline comments for clarity
- Use structured logging
- Handle exceptions gracefully

##  Troubleshooting

### Ollama connection failed
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve
```

### TShark not found
```bash
# Use mock mode instead
MOCK_MODE=true

# Or install TShark
# Windows: https://www.wireshark.org/download.html
# Linux: sudo apt-get install tshark
# macOS: brew install wireshark
```

### Permission denied
```bash
# Use mock mode
MOCK_MODE=true

# Or run with elevated privileges
sudo python backend/main.py  # Linux/macOS
# Run as Administrator on Windows
```

### No events appearing
- Check logs in `backend/ainetui.log`
- Verify correct network interface
- Ensure queues aren't backing up
- Try mock mode to isolate issues

##  Documentation

- [Backend README](backend/README.md) - Detailed backend documentation
- [Instructions](instructions.md) - Project specifications
- [API Documentation](http://localhost:8000/docs) - Interactive API docs (when running)

##  License

MIT License - see [LICENSE](LICENSE) file for details

##  Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Web framework
- [Ollama](https://ollama.ai/) - Local LLM serving
- [TShark](https://www.wireshark.org/) - Packet capture
- [Uvicorn](https://www.uvicorn.org/) - ASGI server

##  Contact

For questions or support, please open an issue on GitHub.

---

**Built with  for network analysts and security professionals**
