# PacketFlow Frontend

> Intelligent User Interface for real-time network analysis with AI-powered insights

## 📚 Documentation

**All documentation has been organized into the [`docs/`](./docs/) folder.**

- **[Documentation Index](./docs/INDEX.md)** - Complete navigation guide
- **[Feature Progress](./docs/PROGRESS.md)** - Track completion status (9/25 features = 36%)
- **[Code Quality Audit](./docs/FRONTEND_AUDIT_REPORT.md)** - TypeScript strictness & architecture review
- **[Architecture Overview](./docs/DATA_FLOW_EXPLAINED.md)** - Data flow and state management

##  Overview

This is the frontend for PacketFlow - a modern, explainable, real-time UI for network monitoring and AI-assisted analysis. Built with React, TypeScript, and Tailwind CSS for performance and developer experience.

##  Architecture

### Tech Stack
- **Framework**: React 18.2 with TypeScript
- **Build Tool**: Vite 5.0
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 4.4
- **Charts**: Recharts 2.10
- **Icons**: Lucide React 0.303
- **Date/Time**: Day.js 1.11

### Project Structure
```
frontend/
 src/
    components/          # UI components
       ChatPanel.tsx      # AI chat interface
       EventStream.tsx    # Live event feed
       GraphView.tsx      # Timeline visualization
       MetricsBar.tsx     # System metrics display
       TooltipModal.tsx   # Event detail modal
    hooks/               # Custom React hooks
       useWebSocket.ts    # WebSocket connection
       useApi.ts          # REST API interactions
    context/             # Global state
       store.ts           # Zustand store
    config/              # Configuration
       graph.config.ts    # Graph display settings
    types/               # TypeScript types
       index.ts           # Shared type definitions
    styles/              # Global styles
       globals.css        # Tailwind + custom CSS
    App.tsx              # Main app component
    main.tsx             # React entry point
 index.html               # HTML template
 vite.config.ts          # Vite configuration
 tailwind.config.js      # Tailwind configuration
 tsconfig.json           # TypeScript config
 package.json            # Dependencies
```

##  Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn
- Backend running on `http://localhost:8000`

### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

### Build for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

##  Features

### 1. Real-Time Event Streaming
- Live network events via WebSocket
- Automatic reconnection with exponential backoff
- Event deduplication and aggregation
- Max 200 events retained (configurable)

### 2. AI Chat Interface
- Natural language queries about network activity
- Contextual AI responses with confidence levels
- Message feedback (/)
- Auto-scroll to latest messages
- Reference links to related events

### 3. Interactive Timeline Graph
- 60-point rolling window (10 minutes)
- 10-second aggregation buckets
- Anomaly markers (clickable)
- Real-time updates without lag
- Memory-efficient (~6KB footprint)

### 4. System Metrics Dashboard
- Packets/sec with color-coded thresholds
- Active flow count
- Anomalies per minute
- System uptime
- Connection status indicator

### 5. Event Detail Modal
- Full event metadata
- AI-generated insights
- Source/destination analysis
- Raw JSON inspection
- Severity-based highlighting

### 6. Mock Mode
- Simulates backend when offline
- Generates synthetic data
- Toggle via settings button
- Useful for UI development/demos

##  Configuration

### Backend Connection

Edit `src/hooks/useWebSocket.ts` and `src/hooks/useApi.ts`:

```typescript
const WS_URL = 'ws://localhost:8000/ws/updates';
const API_BASE = 'http://localhost:8000';
```

### Graph Settings

Edit `src/config/graph.config.ts`:

```typescript
export const GRAPH_CONFIG = {
  MAX_POINTS: 60,           // Number of data points
  BUCKET_SIZE_MS: 10000,    // Aggregation window (10s)
  RETENTION_MS: 600000,     // Memory retention (10 min)
  MAX_ANOMALY_MARKERS: 15,  // Max anomaly dots
  ANOMALY_THRESHOLD: 0.5,   // Min score to display
  CRITICAL_THRESHOLD: 0.8,  // Critical severity cutoff
};
```

### Theme Colors

Edit `tailwind.config.js` or `src/styles/globals.css`:

```css
:root {
  --color-base: #0B1220;       /* Background */
  --color-panel: #111827;      /* Cards/panels */
  --color-text: #E5E7EB;       /* Primary text */
  --color-info: #38BDF8;       /* Info/links */
  --color-warn: #F59E0B;       /* Warnings */
  --color-critical: #EF4444;   /* Critical alerts */
  --color-ok: #10B981;         /* Success/OK */
}
```

##  API Integration

### WebSocket Messages

The frontend expects WebSocket messages in this format:

```json
{
  "type": "network_event",
  "data": {
    "timestamp": "2025-10-15T15:30:45.123Z",
    "src": "192.168.1.10",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "flows": 500,
    "total_bytes": 125000,
    "avg_packet_size": 250,
    "anomaly_score": 0.91,
    "is_anomaly": true,
    "summary": "DNS spike detected (5 normal rate)",
    "ai_explanation": "High-frequency DNS queries detected...",
    "ai_processed": true
  }
}
```

### REST Endpoints

#### GET `/status`
Returns system metrics:
```json
{
  "total_packets": 1543,
  "packets_per_sec": 845,
  "active_flows": 42,
  "total_anomalies": 3,
  "anomalies_per_min": 0.5,
  "uptime_seconds": 3600
}
```

#### POST `/query`
Send natural language query:
```json
{
  "question": "What anomalies occurred in the last hour?"
}
```

Response:
```json
{
  "answer": "Three anomalies were detected: DNS spike at 15:30...",
  "confidence": "high"
}
```

##  IUI Design Principles

### 1. Human-AI Collaboration
- AI as co-analyst, not oracle
- Feedback mechanisms (/)
- Transparent reasoning

### 2. Cognitive Efficiency
- Progressive disclosure
- Signal over noise
- Minimal manual filtering

### 3. Transparency & Explainability
- Every AI claim links to source data
- Visual correlation (markers  chat)
- Event ID traceability

### 4. Timely Feedback
- 1s latency target
- Optimistic UI updates
- Smooth animations

### 5. Trust & Accountability
- Timestamps on all AI outputs
- Confidence levels shown
- Clear auto vs. manual labels

##  Development

### Mock Mode

Enable mock mode for development without backend:

```typescript
// Toggle via UI button (settings icon bottom-right)
// Or programmatically:
const { mockMode, toggleMockMode } = useStore();
toggleMockMode();
```

Mock mode:
- Generates synthetic events every 5s
- Returns simulated AI responses
- Shows system metrics with random values
- Displays "MOCK MODE" badge

### Type Safety

All types are defined in `src/types/index.ts`:

```typescript
interface NetworkEvent {
  id: string;
  timestamp: string;
  src: string;
  dst: string;
  proto: string;
  flows: number;
  anomaly_score: number;
  summary: string;
  // ... more fields
}

interface AIMessage {
  id: string;
  timestamp: string;
  content: string;
  event_ids: string[];
  confidence?: 'low' | 'medium' | 'high';
  type: 'insight' | 'warning' | 'summary' | 'response';
}
```

### State Management

Zustand provides a clean API:

```typescript
import { useStore } from './context/store';

// In component:
const { events, addEvent, selectEvent } = useStore();

// Add event
addEvent(newEvent);

// Select for detail view
selectEvent(eventId);

// Get all messages (sorted)
const messages = useStore(getAllMessages);
```

##  Troubleshooting

### WebSocket won't connect
1. Check backend is running on port 8000
2. Verify CORS settings in backend
3. Check browser console for errors
4. Try enabling mock mode to test UI

### Graph not updating
1. Verify events are being received
2. Check `BUCKET_SIZE_MS` configuration
3. Ensure events have valid timestamps
4. Look for console errors

### Styling issues
1. Run `npm install` to ensure Tailwind is installed
2. Check `tailwind.config.js` content paths
3. Verify `postcss.config.js` exists
4. Restart dev server after config changes

### Performance issues
1. Reduce `MAX_POINTS` in graph config
2. Increase `BUCKET_SIZE_MS` for less granularity
3. Lower `STATUS_POLL_INTERVAL` in useApi
4. Check for memory leaks in browser DevTools

##  Performance Metrics

### Current Targets
- **Latency**: 1s event  UI update
- **Memory**: ~6KB graph data + ~200 events (~50KB)
- **Render**: 60fps during updates
- **Network**: ~1KB/s WebSocket traffic

### Monitoring

Enable React DevTools Profiler:
```bash
# Development mode includes profiling
npm run dev
```

Check memory usage:
```typescript
import { estimateMemoryUsage } from './config/graph.config';
console.log(estimateMemoryUsage());
```

##  Contributing

### Code Style
- Use TypeScript for all new files
- Follow existing component patterns
- Add JSDoc comments for complex functions
- Use semantic HTML and ARIA labels

### Component Guidelines
- Keep components under 300 lines
- Extract reusable logic into hooks
- Use Zustand for shared state only
- Prefer composition over inheritance

### Testing (Future)
```bash
# Placeholder for future test setup
npm run test
```

##  Security Notes

- **No external APIs**: All processing is local
- **CORS**: Backend must allow origin
- **WebSocket**: Uses standard `ws://` (upgrade to `wss://` for production)
- **XSS Protection**: React escapes by default
- **No localStorage**: All state in memory (session-only)

##  Further Reading

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Recharts](https://recharts.org/en-US/)

##  License

See root project LICENSE file.

---

**Built with  for explainable AI-assisted network analysis**
