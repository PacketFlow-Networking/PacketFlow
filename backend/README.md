# AINetUI Backend

##  Quick Start Guide

### Prerequisites

1. **Python 3.11+** installed
2. **Ollama** (for AI features) - Download from https://ollama.ai
3. **TShark** (optional, for real packet capture) - Part of Wireshark

### Installation

1. **Install Python dependencies:**
```bash
cd backend
pip install -r requirements.txt
```

2. **Install Ollama (for AI features):**
```bash
# Download and install from: https://ollama.ai
# Then pull a model:
ollama pull llama2
# Or use a smaller/faster model:
ollama pull mistral
```

3. **Install TShark (optional, for real capture):**
```bash
# Windows: Install Wireshark from https://www.wireshark.org/download.html
# Linux: sudo apt-get install tshark
# macOS: brew install wireshark
```

### Configuration

Copy the example environment file and customize:
```bash
cp .env.example .env
# Edit .env with your settings
```

**Key configuration options:**
- `MOCK_MODE=true` - Use simulated packets (no TShark required)
- `MOCK_MODE=false` - Capture real network packets (requires TShark)
- `CAPTURE_INTERFACE` - Network interface to capture (e.g., `eth0`, `Wi-Fi`, `en0`)
- `AI_MODEL` - Ollama model to use (`llama2`, `mistral`, `openhermes`)

### Running the Backend

**Option 1: Mock Mode (Recommended for testing)**
```bash
python main.py
```

This will start the backend in mock mode with simulated network traffic.

**Option 2: Real Packet Capture**
```bash
# Edit .env: set MOCK_MODE=false
# Set your network interface: CAPTURE_INTERFACE=Wi-Fi (or eth0, en0, etc.)
# Run with appropriate permissions:
python main.py
```

**Note:** Real packet capture may require administrator/root privileges.

### Verify It's Working

1. **Check the server status:**
```bash
curl http://localhost:8000/status
```

2. **View system health:**
```bash
curl http://localhost:8000/health
```

3. **Connect via WebSocket:**
```javascript
// In browser console or Node.js:
const ws = new WebSocket('ws://localhost:8000/ws/updates');
ws.onmessage = (event) => console.log(JSON.parse(event.data));
```

### Example Output

When running in mock mode, you should see logs like:

```
2024-10-09 15:30:45 - capture - INFO - Starting packet capture in MOCK mode
2024-10-09 15:30:45 - condense - INFO - Starting packet condensation...
2024-10-09 15:30:45 - ai_agent - INFO - Connected to Ollama. Available models: ['llama2']
2024-10-09 15:30:45 - websocket_server - INFO - WebSocket event streaming started...
INFO:     Started server process [12345]
INFO:     Uvicorn running on http://0.0.0.0:8000
```

After a few seconds, you'll see events being processed:
```
2024-10-09 15:31:00 - condense - INFO - Generating anomaly spike...
```

### WebSocket Message Format

The backend streams JSON messages via WebSocket:

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
    "is_anomaly": true,
    "anomaly_score": 0.91,
    "summary": " ANOMALY: UDP spike detected (10.2 normal rate) from 192.168.1.50 to 8.8.8.8 (DNS)",
    "ai_explanation": "This appears to be a DNS amplification attack or DNS tunneling attempt. The unusually high volume of DNS queries suggests malicious activity. Recommended action: Block or rate-limit traffic from this source IP.",
    "ai_processed": true
  },
  "timestamp": "2024-10-09T15:30:50.456789"
}
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Root endpoint with service info |
| `/status` | GET | Detailed system statistics |
| `/health` | GET | Health check |
| `/ws/updates` | WebSocket | Real-time event stream |

### Troubleshooting

**"Ollama not found" or AI timeouts:**
- Ensure Ollama is running: `ollama serve`
- Verify the URL in `.env` is correct (default: `http://localhost:11434`)
- Pull a model: `ollama pull llama2`

**"TShark not found":**
- Set `MOCK_MODE=true` in `.env` to use simulated data
- Or install TShark/Wireshark for real packet capture

**Permission denied for packet capture:**
- On Linux/Mac: Run with `sudo python main.py`
- On Windows: Run terminal as Administrator
- Or use `MOCK_MODE=true` to avoid needing permissions

**No events appearing:**
- Check logs in `ainetui.log`
- Verify queue sizes aren't backing up
- In real capture mode, ensure you're using the correct network interface

### Testing with a Simple Client

Create `test_client.py`:

```python
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/updates"
    async with websockets.connect(uri) as websocket:
        print("Connected to AINetUI Backend")
        
        # Receive messages
        async for message in websocket:
            data = json.loads(message)
            print(f"\n[{data['type']}]")
            
            if data['type'] == 'network_event':
                event = data['data']
                print(f"  {event['summary']}")
                if event.get('ai_explanation'):
                    print(f"  AI: {event['ai_explanation']}")

asyncio.run(test_websocket())
```

Run: `python test_client.py`

### Performance Tuning

- **Adjust window size:** Smaller windows = faster updates, more events
- **Anomaly threshold:** Lower = more sensitive, higher = fewer false positives
- **AI timeout:** Increase if using slower models or hardware
- **Queue sizes:** Modify in `main.py` if experiencing backpressure

### Next Steps

1. Build the React frontend to visualize these events
2. Add more sophisticated anomaly detection algorithms
3. Implement persistent storage (TimescaleDB, InfluxDB)
4. Add authentication and access control
5. Create custom AI agents for specific detection tasks

### Development Tips

- Logs are written to both console and `ainetui.log`
- Use `MOCK_MODE=true` for development without requiring network capture
- The mock mode automatically generates anomaly spikes every 30 iterations
- All modules are async-first for maximum throughput

### Architecture Overview

```
          
   Capture     Condenser     AI Agent   
  (TShark/          (Flow              (Ollama    
   Mock)            Aggregation)        LLM)      
          
                                                  
                                                  
                                          
                                            WebSocket   
                                             Server     
                                            (FastAPI)   
                                          
                                                  
                                                  
                                          
                                             Frontend   
                                            (React UI)  
                                          
```

### License

MIT License - See LICENSE file for details
