# 3D & 2D Network Visualization Extraction Guide

**Date**: November 2025  
**Source Branch**: suprdev  
**Target**: Implementation in branches without visualization features

This document contains all necessary information to implement 3D and 2D network topology visualizations in another branch.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Dependencies](#dependencies)
3. [File Structure](#file-structure)
4. [Component Implementation](#component-implementation)
5. [Configuration](#configuration)
6. [Integration Points](#integration-points)
7. [Data Flow](#data-flow)
8. [Key Features](#key-features)

---

## Architecture Overview

### Visualization Stack

**2D Topology View** (D3.js Force-Directed Graph)
- Interactive force-directed graph for network visualization
- Real-time node/link updates
- Semantic clustering (communication-based grouping)
- Physical room detection (subnet-based grouping)
- Advanced filtering system
- Drag-and-drop node positioning

**3D Topology View** (Three.js + React Three Fiber)
- Immersive 3D visualization using Three.js
- WebGL-based rendering for high performance
- Orbit camera controls
- Cluster boundaries and physical room boundaries
- Node position persistence
- Label rendering (optional for performance)

**2D Timeline Graph** (Recharts)
- Time-series visualization of network activity
- Flow rate tracking with 10-second buckets
- Anomaly marker highlighting
- Interactive tooltips
- Memory-efficient data point retention

### Data Flow

```
Events (Zustand Store)
    ↓
GraphView (Timeline)
    ↓
TopologyView (2D)  ThreeDTopologyView (3D)
    ↓                       ↓
Force Simulation            Force Simulation (3D)
    ↓                       ↓
Cluster Detection           Cluster Detection
    ↓                       ↓
D3.js Rendering             Three.js Rendering
```

---

## Dependencies

### Required npm Packages

```json
{
  "d3": "^7.8.5",
  "d3-force-3d": "^3.0.6",
  "three": "^0.169.0",
  "@react-three/fiber": "^8.18.0",
  "@react-three/drei": "^9.122.0",
  "recharts": "^2.10.3",
  "dayjs": "^1.11.10",
  "lucide-react": "^0.303.0"
}
```

### Installation

```bash
npm install d3@^7.8.5 d3-force-3d@^3.0.6 three@^0.169.0 \
  @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 \
  recharts@^2.10.3 dayjs@^1.11.10 lucide-react@^0.303.0
```

### Type Definitions

```bash
npm install --save-dev @types/d3@^7.4.3
```

---

## File Structure

### Files to Create/Copy

```
frontend/src/
├── components/
│   ├── GraphView.tsx                          # 2D Timeline Graph
│   ├── TopologyView.tsx                       # 2D Network Topology (D3.js)
│   ├── ThreeDTopologyModal.tsx               # 3D Modal Container
│   ├── topology/
│   │   ├── index.ts                           # Module exports
│   │   ├── README.md                          # User documentation
│   │   ├── IMPLEMENTATION.md                  # Technical implementation notes
│   │   ├── USAGE.md                           # Usage guide
│   │   └── DRIFT_FIX.md                       # Known issues and fixes
│   └── [other existing components]
├── pages/
│   └── ThreeDTopologyView.tsx                # 3D Visualization Component
├── config/
│   └── graph.config.ts                        # Graph configuration constants
└── styles/
    └── [existing tailwind config]
```

---

## Component Implementation

### 1. GraphView.tsx (2D Timeline)

**Purpose**: Real-time network activity timeline with anomaly markers

**Key Features**:
- 60-point time series with 10-second buckets
- Flow rate visualization (line chart)
- Critical/warning anomaly markers
- Statistics (total flows, average, peak)
- Memory-efficient (600KB for 10 minutes of data)

**Dependencies**: Recharts, dayjs

**Integration**: Top-right panel in main view (h-1/2 of right panel)

```tsx
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import dayjs from 'dayjs';
import { useStore } from '../context/store';
```

**State Management**:
- Events from Zustand store
- Maintains history in ref (not causing re-renders)
- Auto-cleans old data beyond retention window

**Performance**: ~100 bytes per data point, 10-minute retention = ~60KB

---

### 2. TopologyView.tsx (2D D3.js Graph)

**Purpose**: Force-directed graph visualization of network topology

**Key Features**:
- 1000+ node support with smooth animations
- Color-coded nodes (internal/external/anomaly levels)
- Link thickness by traffic volume
- Directional arrows showing traffic flow
- Node drag-and-drop with position persistence
- Zoom/pan controls with smooth transitions
- Advanced filtering system
- Semantic clustering (communication-based)
- Physical room detection (subnet-based)
- Three view modes: Semantic, Physical, Hybrid

**Algorithms**:

#### Cluster Detection Algorithm
```
Input: Nodes, Links
Output: Clusters grouped by communication strength

1. Build adjacency matrix from links
2. For each unvisited node:
   - Create new cluster
   - Recursively add neighbors with strong connections
   - Threshold: 10 units of traffic
3. Update node cluster IDs
4. Calculate cluster centers and colors
5. Return cluster objects with metadata
```

#### Physical Room Detection Algorithm
```
Input: Nodes
Output: Rooms grouped by subnet

1. Extract subnet from IP (first 3 octets)
2. Group nodes by subnet
3. Calculate bounding boxes with 60px padding
4. Assign colors from palette
5. Return room objects with boundaries
```

**D3 Forces**:
- Link force: 100px edge distance
- Charge force: -300 strength (repulsion)
- Center force: Keeps graph centered
- Collision force: 30px radius prevents overlap
- Alpha decay: 0.05 (faster settling)
- Velocity decay: 0.4 (more friction)

**Interactions**:
- Click node → show details panel
- Drag node → reposition + persist
- Drag background → pan
- Mouse wheel → zoom
- Buttons: Zoom ±, Reset, Lock/Unlock, Pause/Play
- Filter panel: Toggle with icon
- Cluster toggle: Show/hide boundaries
- View mode selector: Semantic/Physical/Hybrid

**Node Details Panel**:
- IP address (monospace)
- Type badge (internal/external)
- Anomaly score gauge
- Event count
- Total traffic (formatted)
- Suspicious activity warning (if > 0.5)

**Legend**:
- Blue: Internal hosts
- Green: External hosts
- Yellow: Medium anomaly (0.4-0.7)
- Red: Critical anomaly (>0.7)
- Ovals: Semantic clusters
- Rectangles: Physical rooms

---

### 3. ThreeDTopologyView.tsx (3D Three.js)

**Purpose**: Immersive 3D network visualization

**Key Features**:
- Three.js WebGL rendering
- Orbit camera controls (mouse drag/scroll)
- Node sphere rendering (reduced poly count for performance)
- Link line rendering
- Cluster boundaries (semi-transparent spheres)
- Physical room boundaries (translucent boxes)
- Label rendering (toggleable)
- Filter system matching 2D view
- 30-second auto-refresh

**Performance Optimizations**:
- Reduced polygon counts: Sphere 8,8 → 4,4
- Labels off by default (expensive DOM)
- Single geometry reuse
- Lazy loading via React.lazy()
- Suspense fallback loading state

**Components**:

#### NetworkNode Component
```tsx
- Sphere geometry (adaptive size based on event count)
- Color by anomaly score
- Emissive material for glow
- Optional labels with HTML
- Anomaly indicator (small sphere on top)
```

#### NetworkLink Component
```tsx
- Line segments connecting nodes
- Color red if anomalous
- Opacity based on anomalies count
```

#### PhysicalRoomBoundary Component
```tsx
- Translucent box geometry
- Wireframe edges
- Room label at top
```

#### ClusterBoundary Component
```tsx
- Semi-transparent sphere
- Wireframe outline
- Cluster name label
```

**Data Fetching**:
- GET `/api/network_graph` from backend
- Refreshes every 30 seconds
- Runs force simulation on load

**3D Force Simulation**:
- Spatial separation by room
- 600px room spacing
- Sphere projection for lat/lon (if available)
- Similar forces to 2D (link, charge, center, collision)

---

### 4. ThreeDTopologyModal.tsx (Modal Container)

**Purpose**: Full-screen modal for immersive 3D experience

**Features**:
- 98vw × 98vh viewport
- Lazy-loaded 3D content
- Suspense with loading spinner
- Escape key to close
- Click backdrop to close
- Smooth transition animations
- Keyboard hint

**State Management**:
- `isOpen`: Boolean prop
- `onClose`: Callback function
- `isFullyMounted`: Small delay for smooth transition

---

### 5. graph.config.ts (Configuration)

**Purpose**: Centralized graph settings

**Constants**:
```typescript
MAX_POINTS: 60              // Data points to keep in memory
BUCKET_SIZE_MS: 10000       // 10-second time buckets
RETENTION_MS: 600000        // 10 minutes
MAX_ANOMALY_MARKERS: 15     // Markers on timeline
ANOMALY_THRESHOLD: 0.5      // Minimum score to show marker
CRITICAL_THRESHOLD: 0.8     // Critical severity threshold
```

**Memory Estimation**:
- 60 points × 100 bytes = 6KB
- 15 markers × 80 bytes = 1.2KB
- **Total**: ~8KB per session

---

## Integration Points

### 1. App.tsx Modifications

**Add Imports**:
```tsx
import TopologyView from './components/TopologyView';
import ThreeDTopologyModal from './components/ThreeDTopologyModal';
import GraphView from './components/GraphView';
```

**Add States**:
```tsx
const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'topology'>('events');
const [show3DTopology, setShow3DTopology] = useState(false);
```

**Add Tab Buttons** (in Tab Header):
```tsx
<button onClick={() => handleTabChange('topology')}>
  <Network className="w-4 h-4" />
  Topology
</button>

<button onClick={() => setShow3DTopology(true)}>
  <Box className="w-4 h-4" />
  3D View
</button>
```

**Add Layout**:
```tsx
// Timeline graph (top-right, h-1/2)
<div className="h-1/2 border-b border-border">
  <GraphView />
</div>

// Tab content (bottom-right, h-1/2)
<div className="h-1/2">
  {activeTab === 'topology' && <TopologyView />}
  {/* ... other tabs */}
</div>

// 3D Modal
<ThreeDTopologyModal 
  isOpen={show3DTopology}
  onClose={() => setShow3DTopology(false)}
/>
```

### 2. Keyboard Shortcuts Integration

**In KeyboardShortcuts.tsx**:
```tsx
// Add shortcut handlers
{
  key: 't',
  description: 'Cycle through Events/Stats/Topology tabs',
  action: onToggleTab
}

{
  key: 'n',
  description: 'Jump to Network Topology view',
  action: onShowTopology
}

{
  key: 'Ctrl+Shift+3',
  description: 'Open 3D Topology view',
  action: onOpen3DTopology
}
```

### 3. Store Integration (Zustand)

**Required Store State**:
```typescript
// From context/store.ts
events: NetworkEvent[]  // Array of events with: timestamp, src, dst, proto, flows, anomaly_score, etc.
selectedEventId: string | null
selectEvent: (id: string | null) => void
```

**Event Type Required**:
```typescript
interface NetworkEvent {
  id: string;
  timestamp: string;          // ISO 8601
  src: string;               // Source IP
  dst: string;               // Destination IP
  proto: string;             // Protocol (TCP, UDP, DNS, etc.)
  flows: number;             // Number of flows
  avg_size: number;          // Average packet size
  anomaly_score: number;     // 0-1 anomaly score
  is_anomaly: boolean;
  detection_methods?: string[];
  threat_indicators?: string[];
  ai_explanation?: string;
}
```

---

## Configuration

### GraphView Configuration

**In graph.config.ts**:
```typescript
export const GRAPH_CONFIG = {
  MAX_POINTS: 60,                    // Keep 60 data points
  BUCKET_SIZE_MS: 10000,             // 10-second aggregation
  RETENTION_MS: 600000,              // 10-minute retention
  MAX_ANOMALY_MARKERS: 15,
  ANOMALY_THRESHOLD: 0.5,
  CRITICAL_THRESHOLD: 0.8,
};
```

**Tuning Guidelines**:
- Increase `MAX_POINTS` for longer history (at cost of memory)
- Decrease `BUCKET_SIZE_MS` for finer granularity
- Adjust thresholds based on your anomaly detection sensitivity

### TopologyView Configuration

**Filter Defaults**:
```typescript
const defaultFilters = {
  showInternal: true,
  showExternal: true,
  minAnomalyScore: 0,
  minTraffic: 0,
  selectedProtocols: new Set(['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'])
};
```

**Color Palette**:
```typescript
// Node colors
internal: '#3b82f6'         // Blue
external: '#10b981'         // Green
warning: '#f59e0b'          // Amber (0.4-0.7)
critical: '#ef4444'         // Red (>0.7)

// Cluster colors (cycle)
['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6']
```

### ThreeDTopologyView Configuration

**Simulation Parameters**:
```typescript
nodePositions: Map<string, {x, y, z}>  // Persist positions
room spacing: 600px                     // Distance between rooms
label distance: 10                      // Label popup distance factor
refresh interval: 30000ms               // 30-second update
```

---

## Data Flow

### 1. Event Ingestion

```
Backend WebSocket
    ↓ (network_event message)
Zustand Store (events array)
    ↓
GraphView (read events, aggregate to buckets)
    ↓ (chartData)
Recharts (render timeline)

Zustand Store (events array)
    ↓
TopologyView (read events, build graph)
    ↓ (graphData: nodes + links)
Cluster Detection
    ↓ (semantic clusters)
Physical Room Detection
    ↓ (subnet-based rooms)
D3.js Force Simulation
    ↓ (positioned nodes)
D3 Rendering (SVG)
```

### 2. Node Position Persistence

**2D Topology**:
```typescript
nodePositionsRef: Map<string, {x, y}>
    ↓
On drag: Save to ref
    ↓
On new events: Restore initial positions
    ↓
Center new nodes near existing clusters
```

**3D Topology**:
```typescript
graphData fetched from /api/network_graph
    ↓
Run 3D force simulation
    ↓
Position by room (600px spacing)
    ↓
Three.js renders
```

### 3. Filtering Flow

```
User adjusts filters (TopologyView)
    ↓
Update local state
    ↓
Recompute graphData (filtered events)
    ↓
Rerun cluster detection
    ↓
Rerun force simulation (gentle alpha restart)
    ↓
D3 updates SVG with transitions
```

---

## Key Features

### Feature 1: Semantic Clustering

**Algorithm**: Communication-strength based grouping

**Use Case**: Identify server groups, workstation clusters, DMZ zones

**Visual**: Dashed ovals with semi-transparent fill

**Configuration**:
- Threshold: 10 units of traffic for cluster membership
- Max neighbors: 10 strongest connections per node
- Excludes external nodes (separate "External Network" cluster)

**Example Output**:
```
Cluster 0 (Blue): 5 internal hosts with heavy inter-communication
Cluster 1 (Green): 3 database servers
Cluster 2 (Amber): 2 DMZ hosts (high anomaly)
External Network (Gray): 12 external IPs
```

### Feature 2: Physical Room Detection

**Algorithm**: RFC1918 subnet extraction + grouping

**Use Case**: Visualize network segmentation by floor, department, zone

**Visual**: Solid rectangles with wireframe edges

**Configuration**:
- Subnet extraction: First 3 octets (Class C)
- Custom physical_room attribute (future)
- 60px padding for readability

**Example Output**:
```
192.168.1.0 (Blue): 8 workstations
192.168.2.0 (Green): 3 servers
10.0.0.0 (Amber): 5 IoT devices
```

### Feature 3: Interactive Node Selection

**Single Node Selection**:
- Click node → details panel slides in
- Shows: IP, type, anomaly score gauge, event count, total traffic
- Warning banner if anomaly > 0.5

**Keyboard Support**:
- Escape → deselect
- Arrow keys → navigate (future enhancement)

**Visual Feedback**:
- Selected node highlighted
- Details panel on right side
- Click background to deselect

### Feature 4: Real-Time Updates

**Update Strategy**:
- New events added to store
- Graph recalculated (filtered)
- Gentle force simulation restart (α = 0.02)
- Smooth D3 transitions (300ms)
- Existing nodes barely move
- New nodes settle into place

**Performance**:
- Handles 100+ events/second
- 500+ node graph (~2-3s settle time)
- Smooth 60fps animations

### Feature 5: View Modes

**Semantic Mode**:
- Shows communication-based clusters only
- Ovals represent "logical groups"
- Best for: Finding server clusters, DMZ zones

**Physical Mode**:
- Shows subnet-based rooms only
- Rectangles represent physical zones
- Best for: Network infrastructure view

**Hybrid Mode**:
- Shows both clusters AND rooms
- Reveals relationships between physical and logical topology
- Best for: Comprehensive view

### Feature 6: 3D Immersive View

**Advantages**:
- Shows spatial relationships
- More intuitive for large networks (1000+ nodes)
- Cluster visualization more apparent
- Room boundaries clearly separated in Z-axis

**Controls**:
- Mouse drag: Orbit camera
- Scroll: Zoom in/out
- Right-click drag: Pan (Three.js default)
- Escape: Close modal

**Performance**:
- Reduced polygon counts for speed
- Labels optional (toggle in UI)
- 30-second auto-refresh

---

## Implementation Checklist

- [ ] Install dependencies (d3, three, @react-three/*, recharts)
- [ ] Create `src/config/graph.config.ts`
- [ ] Create `src/components/GraphView.tsx`
- [ ] Create `src/components/TopologyView.tsx`
- [ ] Create `src/pages/ThreeDTopologyView.tsx`
- [ ] Create `src/components/ThreeDTopologyModal.tsx`
- [ ] Create `src/components/topology/` directory with docs
- [ ] Update `App.tsx` with new tabs and modal
- [ ] Update `KeyboardShortcuts.tsx` with new shortcuts
- [ ] Verify Zustand store has required event structure
- [ ] Test with mock data
- [ ] Configure graph settings if needed
- [ ] Create backend endpoint: `GET /api/network_graph` (for 3D)

---

## Backend Endpoint Required

**For 3D Topology**:
```http
GET /api/network_graph

Response:
{
  "nodes": [
    {
      "id": "192.168.1.10",
      "ip": "192.168.1.10",
      "type": "internal",
      "physical_room": "192.168.1.0",
      "anomalyScore": 0.25,
      "eventCount": 45,
      "totalBytes": 125000,
      "lat": 48.8566,        // optional
      "lon": 2.3522          // optional
    }
  ],
  "links": [
    {
      "source": "192.168.1.10",
      "target": "8.8.8.8",
      "value": 500,           // flow count
      "semanticDistance": 2.5,
      "anomalies": 0
    }
  ]
}
```

**For WebSocket Events**:
```json
{
  "type": "network_event",
  "data": {
    "id": "event-123",
    "timestamp": "2025-11-29T15:30:45.123Z",
    "src": "192.168.1.10",
    "dst": "8.8.8.8",
    "proto": "UDP",
    "flows": 500,
    "avg_size": 250,
    "anomaly_score": 0.91,
    "is_anomaly": true,
    "detection_methods": ["Z-Score", "Protocol"],
    "threat_indicators": ["DNS_TUNNELING"],
    "ai_explanation": "Detected DNS tunneling attempt..."
  }
}
```

---

## Troubleshooting

### Timeline Graph Shows No Data
- Check Zustand store has events
- Verify `BUCKET_SIZE_MS` and `RETENTION_MS` configuration
- Look for console warnings in `graph.config.ts` validation

### Topology Graph Shows No Nodes
- Check event store has events with src/dst/proto fields
- Verify filter settings (may be too restrictive)
- Check RFC1918 detection logic for your IPs
- Test with mock data first

### 3D View Loads Slowly
- Reduce node count with filters
- Toggle labels off (`showLabels: false`)
- Check WebGL support in browser
- Monitor memory in DevTools

### Cluster Detection Not Working
- Verify links have `value` > 10 (threshold)
- Check nodes have strong connections
- Increase communication strength threshold if too sparse
- Test with dense graph (many internal connections)

### Performance Issues
- Reduce `MAX_POINTS` in graph config
- Increase `BUCKET_SIZE_MS` for coarser timeline
- Decrease `MAX_ANOMALY_MARKERS`
- Disable cluster rendering for large graphs
- Use React DevTools Profiler to identify bottlenecks

---

## Future Enhancements

1. **Animated flow arrows** - Show packet flow in real-time
2. **Protocol-based coloring** - Color links by protocol
3. **Geo visualization** - Map nodes on world map (with lat/lon)
4. **Time playback** - Rewind/forward through events
5. **Multi-select** - Select node groups for analysis
6. **Custom layouts** - Hierarchical, circular, tree layouts
7. **Export/Import** - Save topology snapshots
8. **VR support** - Immersive VR topology exploration
9. **Real-time collaboration** - Shared topology views
10. **AI insights** - AI-generated topology interpretations

---

## Reference Files

All implementation files from the suprdev branch are included in this extraction. Key files:

- `frontend/src/components/GraphView.tsx` - Timeline graph
- `frontend/src/components/TopologyView.tsx` - 2D topology
- `frontend/src/pages/ThreeDTopologyView.tsx` - 3D topology
- `frontend/src/components/ThreeDTopologyModal.tsx` - 3D modal
- `frontend/src/config/graph.config.ts` - Configuration
- `frontend/src/App.tsx` - Integration example
- `frontend/package.json` - Dependencies

---

## Support

For questions about specific implementations:
1. Check component documentation in `topology/` subdirectory
2. Review TypeScript interfaces for data structures
3. Test with mock data first before integrating real events
4. Use browser DevTools for performance profiling
5. Check console for validation warnings in graph.config.ts

---

**End of Extraction Document**
