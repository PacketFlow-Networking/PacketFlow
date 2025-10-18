# Frontend README - Updated Architecture

## Overview

The AINetUI frontend is a React + TypeScript application that displays real-time network analysis data. It connects to the backend via WebSocket and displays:

- Network topology with individual IP addresses
- Event stream with anomaly detection
- AI-generated insights and recommendations
- Real-time statistics and metrics

## Key Architecture Change

**All data generation (both real and mock) now happens in the backend.**

The frontend is purely a display layer that receives data via WebSocket.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
# http://localhost:5173
```

**Important**: The backend must be running for the frontend to display any data!

```bash
# In another terminal, start the backend
cd ../backend
python main.py
```

## Project Structure

```
src/
 components/
    TopologyView.tsx          # Network topology visualization (D3.js)
    EventStream.tsx           # Live event feed
    ChatPanel.tsx             # AI chat interface
    GraphView.tsx             # Time-series charts
    ...
 hooks/
    useWebSocket.ts           # WebSocket connection to backend
    useApi.ts                 # REST API calls
 context/
    store.ts                  # Global state (Zustand)
 types/
    index.ts                  # TypeScript interfaces
 App.tsx                       # Main application
```

## How Data Flows

### Real Network Data
```
Network  Backend (TShark)  WebSocket  Frontend Store  Components
```

### Mock Data (for testing)
```
Backend Mock Generator  WebSocket  Frontend Store  Components
```

**Note**: Mock mode is configured in the backend `.env` file, not in the frontend.

## Key Components

### TopologyView
Displays network topology as a force-directed graph using D3.js.

**Features:**
- Individual IP addresses as nodes (not grouped)
- Color coding: blue (internal), green (external), yellow/red (anomalies)
- Interactive: drag nodes, zoom, pan, click for details
- Filters: protocol, anomaly score, traffic volume

### EventStream
Real-time feed of network events.

**Features:**
- Filter by severity, protocol, IP, port
- Click events for detailed view
- Export to JSON/CSV
- Anomaly highlighting

### ChatPanel
Natural language interface to query the AI assistant.

**Features:**
- Ask questions about network activity
- Get AI explanations for anomalies
- View related events inline

## WebSocket Connection

The frontend connects to: `ws://localhost:8000/ws/updates`

Events are automatically added to the global store and displayed in real-time.

### Message Format

Backend sends events in this format:

```json
{
  "type": "network_event",
  "data": {
    "timestamp": "2025-01-15T10:30:45Z",
    "src": "192.168.1.10",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "flows": 45,
    "anomaly_score": 0.85,
    "summary": "High DNS query volume detected"
  }
}
```

## State Management

Uses Zustand for global state:

```typescript
const { events, addEvent, connected } = useStore();
```

### Key State:
- `events`: Array of network events
- `aiMessages`: AI-generated insights
- `connected`: WebSocket connection status
- `filters`: Active filters
- `incidents`: Tracked security incidents

## Environment Variables

Create `.env` in the frontend directory (optional):

```bash
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000/ws/updates
```

Defaults are already set in the code.

## Development

### Available Commands

```bash
npm run dev          # Start dev server (hot reload)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **D3.js** - Network topology visualization
- **Recharts** - Time-series charts
- **Zustand** - State management
- **Lucide React** - Icons

## Topology Visualization

The network topology displays **actual IP addresses** as nodes:

- Each unique IP gets its own node
- Node size scales with traffic volume
- Links show connections between IPs
- Colors indicate internal/external/anomaly status

### Controls

- **Mouse wheel**: Zoom in/out
- **Drag background**: Pan
- **Drag node**: Reposition
- **Click node**: View details
- **Lock button**: Freeze layout
- **Pause button**: Stop animation

### Filters

- Show/hide internal or external hosts
- Minimum anomaly score threshold
- Minimum traffic volume
- Protocol selection

## Mock Data (Backend-Generated)

When the backend is in mock mode, it generates:

- **17 internal IPs** across multiple subnets
- **16 external IPs** (DNS, CDN, cloud, suspicious)
- **Realistic traffic patterns** (HTTP, DNS, TLS)
- **Attack scenarios** every 30 seconds:
  - C2 beaconing
  - DNS tunneling
  - Lateral movement
  - Data exfiltration

## Removed Features

The following features were removed as data generation moved to backend:

-  Frontend mock data generator (`utils/mockData.ts`)
-  TopologyDemo component (replaced by backend mock)
-  Frontend-side mock mode toggle (now backend config)

## Troubleshooting

### "Disconnected" status
- Ensure backend is running: `http://localhost:8000/status`
- Check WebSocket URL in browser DevTools  Network  WS
- Verify firewall isn't blocking port 8000

### "No events appearing"
- Check backend logs for "Emitting X condensed events"
- Ensure backend mock mode is enabled if not capturing real traffic
- Wait for warmup period (~10 windows)

### "Only seeing a few IPs"
- In mock mode, diverse IPs appear gradually
- Wait 30 seconds for anomaly scenarios
- Check backend is using updated `capture.py`

### TypeScript errors
```bash
npm run type-check
```

### Build fails
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Contributing

### Adding a New Component

1. Create in `src/components/YourComponent.tsx`
2. Use TypeScript interfaces from `src/types/`
3. Access global state via `useStore()`
4. Follow existing patterns for WebSocket data

### Modifying the Topology

Edit `src/components/TopologyView.tsx`. Key sections:

- `graphData` computation: How nodes/links are built
- D3 force simulation: Layout algorithm
- Node rendering: Visual appearance
- Filters: Data filtering logic

## Production Build

```bash
npm run build
```

Output: `dist/` directory

Serve with any static file server:

```bash
npm install -g serve
serve -s dist
```

Or use with the backend's production deployment.

## API Reference

### WebSocket Events

Frontend listens for these event types:

- `connected` - Connection established
- `keepalive` - Connection health check
- `network_event` - New network event with data

### REST Endpoints (via useApi)

- `GET /status` - Backend status and metrics
- `POST /query` - Send natural language query to AI

## Summary

**The frontend is now a pure display layer.** All datawhether real network traffic or mock data for testingcomes from the backend via WebSocket. This creates a cleaner architecture and makes the frontend easier to develop and test.

For backend configuration (including mock mode), see `backend/README.md`.
