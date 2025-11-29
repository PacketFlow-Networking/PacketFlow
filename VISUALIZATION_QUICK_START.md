# Visualization Implementation Quick Reference

**For quickly copy-pasting visualization features into another branch**

## Step 1: Install Dependencies (1 min)

```bash
npm install d3@^7.8.5 d3-force-3d@^3.0.6 three@^0.169.0 \
  @react-three/fiber@^8.18.0 @react-three/drei@^9.122.0 \
  recharts@^2.10.3 dayjs@^1.11.10 --save

npm install --save-dev @types/d3@^7.4.3
```

## Step 2: Copy Files (5 min)

### From suprdev branch:
```
frontend/src/
├── components/GraphView.tsx
├── components/TopologyView.tsx
├── components/ThreeDTopologyModal.tsx
├── components/topology/
│   ├── index.ts
│   ├── README.md
│   ├── IMPLEMENTATION.md
│   ├── USAGE.md
│   └── DRIFT_FIX.md
├── pages/ThreeDTopologyView.tsx
└── config/graph.config.ts
```

## Step 3: Update App.tsx (10 min)

### 3a. Add Imports
```tsx
import TopologyView from './components/TopologyView';
import ThreeDTopologyModal from './components/ThreeDTopologyModal';
import GraphView from './components/GraphView';
import { Network, Box } from 'lucide-react';
```

### 3b. Add State
```tsx
const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'topology'>('events');
const [show3DTopology, setShow3DTopology] = useState(false);
```

### 3c. Add Tab Handler
```tsx
const handleTabChange = (newTab: 'events' | 'stats' | 'topology') => {
  setActiveTab(newTab);
};
```

### 3d. Add Timeline Graph (top-right half)
```tsx
<div className="h-1/2 border-b border-border">
  <GraphView />
</div>
```

### 3e. Add Tab Buttons
```tsx
{/* In your tab header section */}
<button
  onClick={() => handleTabChange('topology')}
  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
    activeTab === 'topology'
      ? 'text-text border-info'
      : 'text-text-dim border-transparent hover:text-text hover:bg-panel-hover'
  }`}
>
  <Network className="w-4 h-4" />
  Topology
</button>

<button
  onClick={() => setShow3DTopology(true)}
  className="flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 border-transparent hover:text-text hover:bg-panel-hover text-text-dim"
  title="Open 3D immersive network view"
>
  <Box className="w-4 h-4" />
  3D View
</button>
```

### 3f. Add Tab Content (bottom-right half)
```tsx
{activeTab === 'events' ? (
  <EventStream />
) : activeTab === 'stats' ? (
  <StatsDashboard />
) : (
  <TopologyView />
)}
```

### 3g. Add 3D Modal
```tsx
<ThreeDTopologyModal
  isOpen={show3DTopology}
  onClose={() => setShow3DTopology(false)}
/>
```

## Step 4: Update Keyboard Shortcuts (5 min)

In `KeyboardShortcuts.tsx`, add:

```tsx
{
  key: 'n',
  description: 'Jump to Network Topology view',
  action: () => {
    handleTabChange('topology');
    showInfo('Network Topology', 'Viewing network topology graph');
  }
}

{
  key: 'Ctrl+Shift+3',
  description: 'Open 3D Topology view',
  action: () => {
    setShow3DTopology(true);
    showInfo('3D Topology', 'Opening immersive 3D network view');
  }
}
```

## Step 5: Verify Store Integration (5 min)

In your Zustand store, ensure you have:

```typescript
// Must have events array with this structure:
interface NetworkEvent {
  id: string;
  timestamp: string;        // ISO 8601
  src: string;             // Source IP
  dst: string;             // Destination IP
  proto: string;           // Protocol
  flows: number;           // Flow count
  avg_size: number;        // Packet size
  anomaly_score: number;   // 0-1
  is_anomaly: boolean;
}

// Must have methods:
events: NetworkEvent[]
selectEvent: (id: string | null) => void
```

## Step 6: Create Backend Endpoint (Optional but Recommended)

For 3D view to work, create endpoint:

```python
# backend/websocket_server.py or similar
@app.get("/api/network_graph")
async def get_network_graph():
    """Returns graph data for 3D visualization"""
    return {
        "nodes": [
            {
                "id": "192.168.1.10",
                "ip": "192.168.1.10",
                "type": "internal",
                "physical_room": "192.168.1.0",
                "anomalyScore": 0.25,
                "eventCount": 45,
                "totalBytes": 125000
            }
        ],
        "links": [
            {
                "source": "192.168.1.10",
                "target": "8.8.8.8",
                "value": 500,
                "semanticDistance": 2.5,
                "anomalies": 0
            }
        ]
    }
```

## Step 7: Test (5 min)

1. Start frontend: `npm run dev`
2. Check for TypeScript errors: should be none
3. Open app in browser
4. Check console for warnings
5. Verify tabs render (Events, Statistics, Topology, 3D View)
6. Click Topology tab → should see 2D graph
7. Click 3D View button → should see 3D modal
8. Test filters, zoom, node selection

## Configuration Options

### graph.config.ts Tuning

```typescript
// For more history:
MAX_POINTS: 120,        // 20 minutes instead of 10

// For finer granularity:
BUCKET_SIZE_MS: 5000,   // 5-second buckets instead of 10

// For more retention:
RETENTION_MS: 1800000,  // 30 minutes instead of 10

// For stricter anomaly highlighting:
ANOMALY_THRESHOLD: 0.7, // Only show high scores
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| "Cannot find module 'd3'" | Missing dependencies | Run npm install with d3 packages |
| Topology tab shows blank | No events in store | Add mock data or wait for WebSocket |
| 3D view loads forever | Backend endpoint missing | Create `/api/network_graph` endpoint |
| Timeline shows no data | Store structure mismatch | Check event has: src, dst, flows, anomaly_score |
| Clusters not showing | Toggle off (check button) | Click cluster toggle button |
| Performance lag with 500+ nodes | Too much rendering | Disable labels, reduce max clusters |

## File Size Reference

- GraphView.tsx: ~550 lines
- TopologyView.tsx: ~1,150 lines
- ThreeDTopologyView.tsx: ~1,035 lines
- ThreeDTopologyModal.tsx: ~112 lines
- graph.config.ts: ~119 lines
- **Total: ~3,000 lines of code**

## Integration Time Estimate

| Task | Time |
|------|------|
| Install dependencies | 2 min |
| Copy files | 3 min |
| Update App.tsx | 10 min |
| Update KeyboardShortcuts.tsx | 5 min |
| Test & debug | 10 min |
| **Total** | **~30 minutes** |

## Minimal Setup (Just 2D)

If you only want 2D topology without 3D:

1. Skip `ThreeDTopologyView.tsx` and `ThreeDTopologyModal.tsx`
2. Skip `@react-three/*` and `three` packages
3. Just copy: `GraphView.tsx`, `TopologyView.tsx`, `graph.config.ts`
4. Update App.tsx without 3D button
5. **Total time: ~15 minutes**

## Full Feature Set

All 3 visualizations working together:

- Timeline graph (top-right)
- 2D topology (bottom-right)
- 3D immersive view (modal)
- All filters, zoom, clustering
- Node position persistence
- Semantic + physical grouping
- **Setup time: ~30 minutes**

---

## Branch Merge Strategy

Recommended approach:

```bash
# 1. Create feature branch
git checkout -b feature/add-visualizations

# 2. Install deps
npm install [packages]

# 3. Copy files one at a time
#    Commit after each component

# 4. Update App.tsx and test each section
#    Commit after tabs, commit after 3D

# 5. Full test
npm run dev

# 6. Create PR with detailed description
```

---

## Support Files

Included in this repo:
- `VISUALIZATION_EXTRACTION.md` - Complete technical guide
- `frontend/src/components/topology/README.md` - User documentation
- `frontend/src/components/topology/IMPLEMENTATION.md` - Dev notes
- This file - Quick checklist

Start with this file for a quick copy-paste workflow.
Use VISUALIZATION_EXTRACTION.md for detailed understanding.
Refer to component-specific docs for advanced customization.
