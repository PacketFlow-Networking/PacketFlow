# PacketFlow Frontend

> Intelligent User Interface for real-time network analysis with AI-powered insights

##  Documentation

**All documentation has been organized into the [`docs/`](./docs/) folder.**

- **[Documentation Index](./docs/INDEX.md)** - Complete navigation guide
- **[Feature Progress](./docs/PROGRESS.md)** - Track completion status (9/25 features = 36%)
- **[Code Quality Audit](./docs/FRONTEND_AUDIT_REPORT.md)** - TypeScript strictness & architecture review
- **[Architecture Overview](./docs/DATA_FLOW_EXPLAINED.md)** - Data flow and state management

##  Overview

This is the frontend for PacketFlow - a modern, explainable, real-time UI for network monitoring and AI-assisted analysis. Built with React, TypeScript, and Tailwind CSS for performance and developer experience.

##  Architecture

### Tech Stack
- **Framework**: React 18.2 with TypeScript 5.2
- **Build Tool**: Vite 7.2.4 (latest)
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 4.4 with localStorage persistence
- **Charts**: Recharts 2.10
- **Visualization**: D3.js 7.8.5 (topology)
- **Icons**: Lucide React 0.303
- **Date/Time**: Day.js 1.11

### Folder Structure
```
frontend/
 docs/                    #  All documentation (19 files)
    INDEX.md            # Navigation guide
    FEATURE_*.md        # Feature documentation
    PROGRESS.md         # Completion tracker
    ...more docs...
 src/
    components/         # React components (organized, 39 files)
       core/          #  Core UI layout components (4 files)
          ChatPanel.tsx
          MetricsBar.tsx
          StatsDashboard.tsx
          TopologyView.tsx
          index.ts
       events/        #  Event handling components (5 files)
          EventStream.tsx
          FilterBar.tsx
          GraphView.tsx
          ExportMenu.tsx
          index.ts
       modals/        #  Reusable modal components (4 files)
          AIDetailsModal.tsx
          EventDetailsModal.tsx
          TooltipModal.tsx
          index.ts
       panels/        #  Side panel components (6 files)
          AIExplanationPanel.tsx
          FeedbackPanel.tsx
          GlossaryPanel.tsx
          IncidentPanel.tsx
          ProactiveSuggestions.tsx
          index.ts
       shared/        #  Shared utility components (4 files)
          ExpandableText.tsx
          KeyboardShortcuts.tsx
          ShortcutHint.tsx
          index.ts
       alerts/        #  Alert configuration system (7 files)
       incidents/     #  Incident management (2 files)
       topology/      #  Network topology visualization (1 file)
       Toast/         #  Toast notifications (5 files)
    hooks/             # Custom hooks
       useWebSocket.ts    # Auto-reconnecting WebSocket
       useApi.ts          # REST API layer
    context/           # Global state
       store.ts           # Zustand store with 40+ actions
       ToastContext.tsx   # Toast state management
    types/             # TypeScript definitions
       index.ts           # 300+ lines of type definitions
    utils/             # Utilities
       export.ts          # CSV/JSON/text export
       graph.config.ts    # Graph configuration
    styles/            # Global styling
       globals.css        # Tailwind + custom CSS
    config/            # App configuration
    App.tsx            # Main component
 package.json           # Dependencies (0 vulnerabilities )
 vite.config.ts         # Vite configuration (optimized)
 tsconfig.json          # TypeScript config (strict mode, no unused checks)
 index.html             # HTML entry point
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

### Completed Features (9/25 = 36%)
 **Real-Time Event Streaming** - Live WebSocket with auto-reconnect  
 **Export Functionality** - CSV, JSON, text, and statistics formats  
 **Toast Notifications** - 4 types with sound alerts  
 **Event Details Modal** - Full metadata and AI insights  
 **Reactive UI** - Real-time updates with 1s latency target  
 **Keyboard Shortcuts** - `?` for help, `Ctrl+K` for search  
 **Glossary & Help** - Contextual tooltips and definitions  
 **Alert Configuration** - Sensitivity, thresholds, IP lists, custom rules  
 **Incident Management** - Create, track, resolve security incidents  

### IUI Phase 1 Features (Complete)
-  Proactive suggestions based on context
-  Event feedback system (true/false positive labeling)
-  User profile tracking (expertise level, interaction count)
-  Learning progress (concepts seen, tutorials completed)
-  Adaptive UI based on expertise level

### In Development / Planned
-  Predictive analytics
-  Advanced filtering UI
-  Mobile responsiveness
-  Custom dashboards
-  Report generation (PDF)
-  And 13 more features...

See [PROGRESS.md](./docs/PROGRESS.md) for detailed status.

### 1. Real-Time Event Streaming
- Live network events via WebSocket
- Auto-reconnect with exponential backoff (20s  40s  60s)
- Event deduplication and aggregation
- Stores last 200 events in memory

### 2. AI Chat Interface
- Natural language queries about network activity
- Contextual AI responses with confidence levels
- Message feedback (true/false positive)
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
- Full event metadata display
- AI-generated insights and explanations
- Source/destination port analysis
- Raw JSON inspection
- Severity-based highlighting

### 6. Mock Mode
- Simulates backend when offline
- Generates synthetic data patterns
- Toggle via settings button
- Useful for UI development/demos

### 7. Network Topology Visualization
- Force-directed D3 graph
- Interactive node/link selection
- Anomaly highlighting
- Real-time updates

### 8. Incident Management System
- Create and track security incidents
- Assign status (open, investigating, resolved, false_positive)
- Add notes and tags
- Link events to incidents
- Auto-selection on creation

### 9. Alert Configuration
- Global sensitivity slider (0-100)
- Custom thresholds per metric
- IP whitelist/blacklist
- Custom alert rules with conditions
- Sound and toast notifications

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

##  Component Organization

### Architecture Overview

Components are organized into **6 logical categories** for maintainability and scalability:

```
src/components/
 core/           # Main layout & stateful containers
 events/         # Event display & filtering
 modals/         # Reusable dialog components
 panels/         # Sidebar panel components
 shared/         # Utility & helper components
 alerts/         # Alert configuration UI
 incidents/      # Incident management UI
 topology/       # Network visualization
 Toast/          # Notification system
```

### Core Components (`core/`)
**Purpose:** Main application layout and dashboard containers

| Component | Purpose |
|-----------|---------|
| `ChatPanel` | AI chat interface for natural language queries |
| `MetricsBar` | Top status bar with connection & performance metrics |
| `StatsDashboard` | System statistics with charts (packets, flows, protocols) |
| `TopologyView` | D3 force-directed network graph visualization |

**Usage:**
```typescript
import { ChatPanel, MetricsBar, StatsDashboard } from '@/components/core';
```

### Events Components (`events/`)
**Purpose:** Display, filter, and export network events

| Component | Purpose |
|-----------|---------|
| `EventStream` | Main event list with real-time updates |
| `FilterBar` | Search, severity, protocol, time range filters |
| `GraphView` | 60-point timeline with anomaly markers |
| `ExportMenu` | CSV/JSON/text export functionality |

**Usage:**
```typescript
import { EventStream, FilterBar, GraphView, ExportMenu } from '@/components/events';
```

### Modal Components (`modals/`)
**Purpose:** Reusable dialog windows for detailed views

| Component | Purpose |
|-----------|---------|
| `EventDetailsModal` | Full event metadata with AI insights |
| `AIDetailsModal` | Detailed AI message with reasoning |
| `TooltipModal` | Contextual information popups |

**Usage:**
```typescript
import { EventDetailsModal, AIDetailsModal } from '@/components/modals';
```

### Panel Components (`panels/`)
**Purpose:** Left/right sidebar panels with related information

| Component | Purpose |
|-----------|---------|
| `IncidentPanel` | Create/track security incidents |
| `ChatPanel` | AI chat with message history |
| `AIExplanationPanel` | Detailed anomaly explanations |
| `FeedbackPanel` | Event labeling (true/false positive) |
| `GlossaryPanel` | Security & network term definitions |
| `ProactiveSuggestions` | Context-aware recommendations |

**Usage:**
```typescript
import { 
  IncidentPanel, 
  AIExplanationPanel, 
  FeedbackPanel, 
  GlossaryPanel,
  ProactiveSuggestions 
} from '@/components/panels';
```

### Shared Components (`shared/`)
**Purpose:** Reusable utility and helper components

| Component | Purpose |
|-----------|---------|
| `ExpandableText` | Collapsible text sections |
| `KeyboardShortcuts` | Shortcut help modal |
| `ShortcutHint` | Bottom-right shortcut indicator |

**Usage:**
```typescript
import { ExpandableText, KeyboardShortcutsHelp, ShortcutHint } from '@/components/shared';
```

### Feature-Specific Directories

#### `alerts/` - Alert Configuration System
- `SensitivityPanel` - Global anomaly threshold slider
- `ThresholdsPanel` - Custom metric thresholds
- `RulesPanel` - Custom alert rule builder
- `IPListPanel` - Whitelist/blacklist management
- `NotificationsPanel` - Sound & toast settings

#### `incidents/` - Incident Management
- `CreateIncidentModal` - New incident form
- `IncidentDetailsModal` - View/edit incident details

#### `topology/` - Network Visualization
- `TopologyView` - (moved to `core/`) D3 force-directed graph

#### `Toast/` - Notification System
- `Toast` - Individual notification component
- `ToastContainer` - Container for multiple toasts
- `ToastContext` - Global toast state

### Import Patterns

**Prefer folder imports with index.ts:**
```typescript
//  GOOD - Clean, organized
import { ChatPanel, MetricsBar } from '@/components/core';
import { EventStream, FilterBar } from '@/components/events';

//  AVOID - Direct file imports
import ChatPanel from '@/components/core/ChatPanel';
import MetricsBar from '@/components/core/MetricsBar';
```

### Adding New Components

1. **Identify category** - Which folder does it belong in?
2. **Create component** - Add `.tsx` file to appropriate folder
3. **Export from index.ts** - Add to folder's `index.ts`
4. **Update imports** - Use folder imports in App.tsx

Example:
```typescript
// src/components/panels/CustomPanel.tsx
export const CustomPanel = () => { /* ... */ };

// src/components/panels/index.ts
export { CustomPanel } from './CustomPanel';

// src/App.tsx
import { CustomPanel } from '@/components/panels';
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

### Setup & Installation

**Requirements:**
- Node.js 18+
- npm or yarn
- Backend running on `http://localhost:8000`

**Quick Start:**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173` in your browser.

### Available Scripts

```bash
npm run dev       # Start dev server with hot reload
npm run build     # Production build with optimizations
npm run preview   # Preview production build locally
npm run lint      # Run ESLint checks
```

### Recent Updates

**Fixed Issues:**
-  npm audit vulnerabilities (0 remaining)
  - Updated Vite to 7.2.4
  - Fixed esbuild, glob, js-yaml vulnerabilities
  - See [package.json](./package.json) for versions

-  TypeScript configuration
  - Removed `ignoreDeprecations` (caused build errors)
  - Configured path alias `@/*` for imports
  - Full type safety enabled (strict: true)
  - Added `vite/client` types for import.meta support

-  Module imports
  - Fixed Vite config path resolution using `node:path`
  - Using relative path aliases (`@/*: ./src/*`)
  - ES module compatibility

-  Documentation organization
  - Consolidated 19 markdown files to `docs/` folder
  - Created INDEX.md navigation
  - Clean root directory structure

-  **Component Reorganization** (NEW!)
  - Organized 39 components into 6 logical categories
  - Created `core/`, `events/`, `modals/`, `panels/`, `shared/` folders
  - Added index.ts files for clean imports
  - Updated all 50+ import paths across codebase
  - Build succeeds: 2.90s, optimized chunks (851 kB total, 251 kB gzip)
  - See [Component Organization](#-component-organization) section for details

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
  // ... 20+ more fields
}

interface Incident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  notes: IncidentNote[];
  // ... and more
}
```

### State Management

Zustand provides clean, type-safe state:

```typescript
import { useStore } from './context/store';

// In component:
const { events, addEvent, selectEvent, incidents } = useStore();

// Add event
addEvent(newEvent);

// Select for detail view
selectEvent(eventId);

// Create incident (auto-selects)
const newIncident = { /* ... */ };
useStore.getState().addIncident(newIncident);
```

**Store includes:**
- 40+ actions
- localStorage persistence
- Zustand middleware integration
- Type-safe selectors

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
- **No localStorage for secrets**: Only persists UI preferences

---

##  Project Status

### Code Quality
-  **TypeScript**: 95%+ typed, strict mode enabled
-  **Dependencies**: 0 vulnerabilities (all patched)
-  **Organization**: 7-tier architecture with clear separation
-  **Documentation**: 19 markdown files with navigation index
-  **Naming**: Full PacketFlow branding (no AINetUI references)

### Feature Completion
- **9/25 features completed (36%)**
- **IUI Phase 1: Complete**
- See [PROGRESS.md](./docs/PROGRESS.md) for detailed breakdown

### Performance
- **WebSocket latency**: <500ms reconnect
- **Event rendering**: 60fps during updates
- **Memory usage**: ~50KB for 200 events + UI
- **Bundle size**: ~200KB gzipped

### Browser Support
-  Chrome/Chromium 90+
-  Firefox 88+
-  Safari 14+
-  Edge 90+

---

##  Documentation

All documentation is in [`docs/`](./docs/) folder:

| Document | Purpose |
|----------|---------|
| [INDEX.md](./docs/INDEX.md) | Navigation hub for all docs |
| [PROGRESS.md](./docs/PROGRESS.md) | Feature completion tracker |
| [FRONTEND_AUDIT_REPORT.md](./docs/FRONTEND_AUDIT_REPORT.md) | Code quality analysis |
| [DATA_FLOW_EXPLAINED.md](./docs/DATA_FLOW_EXPLAINED.md) | Architecture details |
| [FEATURE_*.md](./docs/FEATURE_1_COMPLETE.md) | Individual feature docs (6 files) |
| [IUI_PHASE1_COMPLETE.md](./docs/IUI_PHASE1_COMPLETE.md) | AI UI features |

---

##  Further Reading

- [React Documentation](https://react.dev)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Recharts](https://recharts.org/en-US/)
- [D3.js](https://d3js.org/)

##  License

See root project LICENSE file.

---

**Built with  for explainable AI-assisted network analysis**
