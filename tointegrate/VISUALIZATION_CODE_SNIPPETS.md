# Ready-to-Copy Code Snippets

Complete, ready-to-use code snippets for integrating visualizations.

---

## Snippet 1: Updated App.tsx Structure

Complete replacement for the main layout section:

```tsx
// frontend/src/App.tsx

import { useEffect, useState } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { useStore } from './context/store';
import { useToast } from './context/ToastContext';
import { KeyboardShortcutsHelp, useKeyboardShortcuts } from './components/KeyboardShortcuts';
import MetricsBar from './components/MetricsBar';
import ChatPanel from './components/ChatPanel';
import GraphView from './components/GraphView';                    // NEW
import EventStream from './components/EventStream';
import StatsDashboard from './components/StatsDashboard';
import TopologyView from './components/TopologyView';             // NEW
import IncidentPanel from './components/IncidentPanel';
import ThreeDTopologyModal from './components/ThreeDTopologyModal'; // NEW
import AlertConfigModal from './components/alerts/AlertConfigModal';
import { Settings, BarChart3, List, MessageSquare, AlertTriangle, Network, Box } from 'lucide-react';

function App() {
  useWebSocket();
  const { events } = useStore();
  const { showInfo } = useToast();

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [show3DTopology, setShow3DTopology] = useState(false);     // NEW
  
  // NEW: Active tab state for Topology
  const [activeTab, setActiveTab] = useState<'events' | 'stats' | 'topology'>('events');
  const [leftPanelTab, setLeftPanelTab] = useState<'chat' | 'incidents'>('chat');

  // NEW: Tab change handler
  const handleTabChange = (newTab: 'events' | 'stats' | 'topology') => {
    setActiveTab(newTab);
  };

  useKeyboardShortcuts({
    onShowHelp: () => setShowShortcutsHelp(true),
    onOpenAlertConfig: () => setShowAlertConfig(true),
    onShowTopology: () => handleTabChange('topology'),             // NEW
    onOpen3DTopology: () => setShow3DTopology(true),              // NEW
    isModalOpen: showShortcutsHelp || showAlertConfig || show3DTopology,
  });

  return (
    <div className="h-screen flex flex-col bg-base">
      <MetricsBar />

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Chat/Incidents */}
        <div className="w-[500px] border-r border-border flex flex-col">
          <div className="flex items-center border-b border-border bg-panel">
            <button
              onClick={() => setLeftPanelTab('chat')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                leftPanelTab === 'chat'
                  ? 'text-text border-info'
                  : 'text-text-dim border-transparent hover:text-text'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setLeftPanelTab('incidents')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                leftPanelTab === 'incidents'
                  ? 'text-text border-info'
                  : 'text-text-dim border-transparent hover:text-text'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Incidents
            </button>
          </div>
          {leftPanelTab === 'chat' ? <ChatPanel /> : <IncidentPanel />}
        </div>

        {/* Right Panel - Timeline + Tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Timeline Graph - NEW */}
          <div className="h-1/2 border-b border-border">
            <GraphView />
          </div>

          {/* Tab Content - Events/Stats/Topology */}
          <div className="h-1/2 flex flex-col">
            {/* Tab Header */}
            <div className="flex items-center border-b border-border bg-panel">
              <button
                onClick={() => handleTabChange('events')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'events'
                    ? 'text-text border-info'
                    : 'text-text-dim border-transparent hover:text-text'
                }`}
              >
                <List className="w-4 h-4" />
                Events
              </button>
              <button
                onClick={() => handleTabChange('stats')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'stats'
                    ? 'text-text border-info'
                    : 'text-text-dim border-transparent hover:text-text'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Statistics
              </button>
              <button
                onClick={() => handleTabChange('topology')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === 'topology'
                    ? 'text-text border-info'
                    : 'text-text-dim border-transparent hover:text-text'
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
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden">
              {activeTab === 'events' && <EventStream />}
              {activeTab === 'stats' && <StatsDashboard />}
              {activeTab === 'topology' && <TopologyView />}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Topology Modal - NEW */}
      <ThreeDTopologyModal
        isOpen={show3DTopology}
        onClose={() => setShow3DTopology(false)}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Alert Configuration Modal */}
      <AlertConfigModal
        isOpen={showAlertConfig}
        onClose={() => setShowAlertConfig(false)}
      />

      {/* Floating hint */}
      {!showShortcutsHelp && !showAlertConfig && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-xs text-text-dim">
          Press <kbd className="px-2 py-1 bg-panel border border-border rounded text-text">?</kbd> for shortcuts
        </div>
      )}
    </div>
  );
}

export default App;
```

---

## Snippet 2: Keyboard Shortcuts Addition

Add these to your `KeyboardShortcuts.tsx`:

```tsx
// In useKeyboardShortcuts hook handler

case 't':
  // Cycle through tabs
  const tabs: Array<'events' | 'stats' | 'topology'> = ['events', 'stats', 'topology'];
  const currentIndex = tabs.indexOf(activeTab);
  const nextTab = tabs[(currentIndex + 1) % tabs.length];
  setActiveTab(nextTab);
  showInfo(`Switched to ${nextTab}`, `Now viewing ${nextTab}`);
  e.preventDefault();
  break;

case 'n':
  // Jump to topology
  setActiveTab('topology');
  showInfo('Network Topology', 'Viewing network topology graph');
  e.preventDefault();
  break;

// Ctrl+Shift+3 for 3D view
if (e.ctrlKey && e.shiftKey && e.key === '#') {
  setShow3DTopology(true);
  showInfo('3D Topology', 'Opening immersive 3D network view');
  e.preventDefault();
  break;
}
```

---

## Snippet 3: Minimal Zustand Store Update

Ensure your store has these fields (add if missing):

```typescript
// frontend/src/context/store.ts

interface NetworkEvent {
  id: string;
  timestamp: string;           // ISO 8601: "2025-11-29T15:30:45.123Z"
  src: string;                // "192.168.1.10"
  dst: string;                // "8.8.8.8"
  proto: string;              // "TCP", "UDP", "DNS", etc.
  flows: number;              // 500
  avg_size: number;           // 250
  anomaly_score: number;      // 0-1, e.g., 0.91
  is_anomaly?: boolean;
  detection_methods?: string[];
  threat_indicators?: string[];
  ai_explanation?: string;
  ai_processed?: boolean;
}

interface Store {
  // ... existing fields ...
  
  // Add these if missing:
  events: NetworkEvent[];
  selectedEventId: string | null;
  selectEvent: (id: string | null) => void;
  addEvent: (event: NetworkEvent) => void;
  clearOldEvents: (olderThanMs: number) => void;
}

// In create function:
export const useStore = create<Store>((set) => ({
  // ... existing implementation ...
  
  selectedEventId: null,
  selectEvent: (id: string | null) => set({ selectedEventId: id }),
  
  addEvent: (event: NetworkEvent) => set((state) => {
    // Limit to 200 events to prevent memory bloat
    const updated = [event, ...state.events].slice(0, 200);
    return { events: updated };
  }),
  
  clearOldEvents: (olderThanMs: number) => set((state) => {
    const cutoff = Date.now() - olderThanMs;
    return {
      events: state.events.filter(e => 
        new Date(e.timestamp).getTime() > cutoff
      )
    };
  }),
}));
```

---

## Snippet 4: Backend Endpoint (Optional)

For 3D topology to work, add this endpoint to your FastAPI backend:

```python
# backend/websocket_server.py or new routes file

from typing import List, Dict, Any
from pydantic import BaseModel

class Node(BaseModel):
    id: str
    ip: str
    type: str  # "internal" or "external"
    physical_room: str
    anomalyScore: float
    eventCount: int
    totalBytes: int

class Link(BaseModel):
    source: str
    target: str
    value: float  # flow count
    semanticDistance: float
    anomalies: int

class NetworkGraph(BaseModel):
    nodes: List[Node]
    links: List[Link]

@app.get("/api/network_graph", response_model=NetworkGraph)
async def get_network_graph():
    """Returns graph data for 3D topology visualization"""
    
    # Build nodes from events
    nodes: Dict[str, Node] = {}
    links: Dict[str, Dict[str, Any]] = {}
    
    # TODO: Populate from your event store/database
    # Example:
    
    return NetworkGraph(
        nodes=list(nodes.values()),
        links=[
            Link(
                source=source_id,
                target=target_id,
                value=data["flows"],
                semanticDistance=data["distance"],
                anomalies=data["anomalies"]
            )
            for (source_id, target_id), data in links.items()
        ]
    )
```

---

## Snippet 5: TypeScript Type Definitions

Add to your `frontend/src/types/index.ts`:

```typescript
// Network Event Type
export interface NetworkEvent {
  id: string;
  timestamp: string;                    // ISO 8601
  src: string;                         // Source IP
  dst: string;                         // Destination IP
  proto: string;                       // Protocol
  flows: number;                       // Flow count
  avg_size: number;                    // Average packet size
  anomaly_score: number;               // 0-1
  is_anomaly?: boolean;
  detection_methods?: string[];
  threat_indicators?: string[];
  ai_explanation?: string;
  ai_processed?: boolean;
}

// Graph Data Types
export interface TopologyNode {
  id: string;
  label: string;
  type: 'internal' | 'external';
  anomalyScore: number;
  eventCount: number;
  totalBytes: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface TopologyLink {
  source: string | TopologyNode;
  target: string | TopologyNode;
  value: number;
  anomalies: number;
  protocols: Set<string>;
}

export interface AnomalyMarker {
  timestamp: number;
  severity: 'critical' | 'warn';
  eventId: string;
  score: number;
  yValue: number;
}
```

---

## Snippet 6: Component Import Template

Use this template when importing visualization components:

```tsx
// In your main App or container component

// Timeline graph (use in top panel)
import GraphView from './components/GraphView';

// 2D topology (use in tab content)
import TopologyView from './components/TopologyView';

// 3D modal container
import ThreeDTopologyModal from './components/ThreeDTopologyModal';

// Icons from lucide-react
import { 
  Network,      // For topology tab
  Box,          // For 3D view
  TrendingUp,   // Used in GraphView
  Activity      // Used in TopologyView
} from 'lucide-react';

// Utilities
import { GRAPH_CONFIG } from './config/graph.config';
import { useStore } from './context/store';
```

---

## Snippet 7: CSS Classes Reference

Tailwind classes used in visualizations (ensure your theme supports these):

```tsx
// Colors (from your theme)
className="text-info"              // #38BDF8 (Cyan)
className="bg-warn"                // #F59E0B (Amber)
className="text-critical"          // #EF4444 (Red)
className="bg-base"                // Background
className="bg-panel"               // Panel background
className="border-border"          // Border color

// Sizing
className="h-1/2"                  // 50% height
className="w-[500px]"              // Fixed width
className="flex-1"                 // Flex grow

// Layout
className="flex flex-col min-h-0"  // Flex column with no height overflow
className="border-b border-border"  // Bottom border
```

---

## Snippet 8: WebSocket Event Handler

Update your WebSocket handler to populate the store:

```typescript
// In your useWebSocket hook

const handleWebSocketMessage = (data: any) => {
  if (data.type === 'network_event') {
    const event: NetworkEvent = {
      id: data.data.id || `event-${Date.now()}`,
      timestamp: data.data.timestamp,
      src: data.data.src,
      dst: data.data.dst,
      proto: data.data.proto,
      flows: data.data.flows || 0,
      avg_size: data.data.avg_size || 0,
      anomaly_score: data.data.anomaly_score || 0,
      is_anomaly: data.data.is_anomaly || false,
      detection_methods: data.data.detection_methods,
      threat_indicators: data.data.threat_indicators,
      ai_explanation: data.data.ai_explanation,
      ai_processed: data.data.ai_processed || false
    };
    
    // Add to store
    addEvent(event);
    
    // Periodically clean old events
    if (Math.random() < 0.01) {  // ~1% of events
      clearOldEvents(10 * 60 * 1000);  // Keep 10 minutes
    }
  }
};
```

---

## Snippet 9: Testing with Mock Data

Generate mock events for testing visualizations:

```typescript
// frontend/src/utils/mockData.ts

import { NetworkEvent } from '../types';

export function generateMockEvent(): NetworkEvent {
  const internalIPs = [
    '192.168.1.10',
    '192.168.1.15',
    '192.168.1.20',
    '192.168.2.30',
    '192.168.2.35'
  ];
  
  const externalIPs = [
    '8.8.8.8',
    '1.1.1.1',
    '208.67.222.123',
    '9.9.9.9'
  ];
  
  const protocols = ['TCP', 'UDP', 'DNS', 'HTTP', 'HTTPS', 'ICMP'];
  
  const src = internalIPs[Math.floor(Math.random() * internalIPs.length)];
  const dst = externalIPs[Math.floor(Math.random() * externalIPs.length)];
  
  // Occasionally create anomaly
  const isAnomaly = Math.random() < 0.1;
  
  return {
    id: `event-${Date.now()}-${Math.random()}`,
    timestamp: new Date().toISOString(),
    src,
    dst,
    proto: protocols[Math.floor(Math.random() * protocols.length)],
    flows: Math.floor(Math.random() * 1000) + (isAnomaly ? 500 : 0),
    avg_size: Math.floor(Math.random() * 500) + 50,
    anomaly_score: isAnomaly ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3,
    is_anomaly: isAnomaly,
    detection_methods: isAnomaly ? ['Z-Score', 'Rate-Based'] : [],
    threat_indicators: isAnomaly ? ['HIGH_FLOW_RATE'] : [],
    ai_processed: isAnomaly,
    ai_explanation: isAnomaly ? 'Unusual traffic pattern detected' : undefined
  };
}

// Usage in development:
// setInterval(() => {
//   const event = generateMockEvent();
//   addEvent(event);
// }, 1000);
```

---

## Snippet 10: Error Handling Template

Add error boundaries and error handling:

```tsx
// frontend/src/components/VisualizationErrorBoundary.tsx

import React, { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class VisualizationErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`Error in ${this.props.componentName}:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-base">
          <div className="text-center p-6 bg-panel rounded-lg border border-red-500/30">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">
              {this.props.componentName} Error
            </h3>
            <p className="text-text-dim text-sm mb-4">
              {this.state.error?.message || 'An error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-info hover:bg-info/90 text-base rounded transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage:
// <VisualizationErrorBoundary componentName="Network Topology">
//   <TopologyView />
// </VisualizationErrorBoundary>
```

---

## Snippet 11: Performance Monitoring

Monitor visualization performance:

```typescript
// frontend/src/hooks/usePerformanceMonitor.ts

import { useEffect } from 'react';

export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 1000) {
        console.warn(
          `${componentName} took ${duration.toFixed(0)}ms to render`
        );
      }
    };
  }, [componentName]);
}

// Usage in components:
// usePerformanceMonitor('TopologyView');
```

---

All snippets are ready to copy and paste. Reference `VISUALIZATION_EXTRACTION.md` for detailed explanations.
