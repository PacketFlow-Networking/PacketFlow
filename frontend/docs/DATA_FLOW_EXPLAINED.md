# Data Flow Explanation: Mock Mode ON vs OFF

## Current State (After My Changes)

###  MOCK MODE OFF (Production/Real Network Monitoring)

**What Happens:**

```
Your Network
    
TShark (Backend) captures REAL packets
    
condense.py processes packets  Extracts REAL IPs (192.168.x.x, 8.8.8.8, etc.)
    
WebSocket sends events with REAL source/destination IPs
    
useWebSocket.ts receives and parses events
    
Global Store (Zustand) stores events
    
TopologyView reads from store  Displays ACTUAL network IPs
```

**IP Sources:**
-  **Real IPs from YOUR actual network traffic**
-  Whatever devices are on your network
-  Whatever external services you're accessing
-  Completely dynamic based on live packet capture

**Example Topology:**
```
[Your Laptop: 192.168.1.105]  [Router: 192.168.1.1]
[Your PC: 192.168.1.107]  [Google DNS: 8.8.8.8]
[Work Server: 10.0.5.23]  [GitHub: 140.82.121.4]
```

**How to Use:**
```bash
# Terminal 1: Start backend (captures real packets)
cd backend
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# In browser: Make sure the gear icon is NOT spinning (Mock Mode OFF)
```

---

###  MOCK MODE ON (Testing/Demo Without Backend)

**What Happens:**

```
App.tsx Mock Generator (useEffect hook)
    
Calls generateMockEvent() from mockData.ts every 3-8 seconds
    
Uses HARDCODED IP pool:
    - 12 fixed IPs (6 internal, 6 external)
    - ['192.168.1.10', '192.168.1.15', '192.168.1.20',
       '10.0.0.5', '10.0.0.10', '172.16.0.1',
       '8.8.8.8', '1.1.1.1', '208.67.222.222',
       '142.250.185.46', '151.101.1.69', '104.16.132.229']
    
Randomly picks src and dst from these 12 IPs
    
addEvent() adds to Global Store
    
TopologyView reads from store  Displays these MOCK IPs
```

**IP Sources:**
-  **Fake IPs from hardcoded list in mockData.ts**
-  Only 12 different IPs total
-  Random connections between these IPs
-  No real network traffic involved

**Example Topology (Limited):**
```
[192.168.1.10]  [8.8.8.8]
[10.0.0.5]  [142.250.185.46]
[192.168.1.15]  [1.1.1.1]
(Only combinations of the 12 hardcoded IPs)
```

**How to Use:**
```bash
# Just start frontend (no backend needed)
cd frontend
npm run dev

# In browser: Click the gear icon to make it spin (Mock Mode ON)
```

---

##  The TopologyDemo Component (Optional Enhancement)

This is what I created to make Mock Mode more interesting:

**What It Does:**
- Runs ONCE when mounted
- Clears existing events
- Generates ~75 events with MORE diverse IPs:
  - 17 internal IPs (across multiple subnets)
  - 16 external IPs (DNS, CDN, cloud services)
- Creates realistic attack scenarios

**How to Use:**
Add to `App.tsx`:
```typescript
import TopologyDemo from './components/topology/TopologyDemo';

function App() {
  return (
    <div className="h-screen flex flex-col bg-base">
      <TopologyDemo />  {/* Add this line */}
      <MetricsBar />
      {/* ... rest of code */}
    </div>
  );
}
```

**When to Use:**
-  Testing the UI without backend
-  Demonstrations/screenshots
-  Development of new features
-  NOT for production (it's test data)

---

##  Data Flow Comparison Table

| Aspect | Mock Mode OFF | Mock Mode ON | Mock Mode ON + TopologyDemo |
|--------|---------------|--------------|------------------------------|
| **IP Source** | Real network packets | 12 hardcoded IPs | 33 hardcoded IPs (17+16) |
| **Backend Required** |  Yes (Python) |  No |  No |
| **Data Accuracy** | Real traffic | Fake random | Fake but realistic scenarios |
| **IP Diversity** | Unlimited | Very limited (12) | Moderate (33) |
| **Traffic Pattern** | Actual network | Random | Scripted scenarios |
| **Best For** | Production use | Quick testing | Demo/development |

---

##  What You See in TopologyView

**The TopologyView component ALWAYS works the same way:**

1. Reads events from the global store
2. Creates a node for EACH UNIQUE IP address (src or dst)
3. Creates links between nodes based on traffic
4. Labels each node with the FULL IP address (e.g., `192.168.1.10`)
5. Colors nodes based on:
   - Blue = Internal (RFC1918: 10.x, 172.16.x, 192.168.x)
   - Green = External
   - Yellow/Red = Has anomalies

**My Changes:**
-  Made node labels show FULL IP instead of just last octet
-  Added monospace font for better readability
-  Enhanced mock data (via TopologyDemo) for richer testing

---

##  Quick Test Guide

### Test 1: See Real Network IPs
```bash
# Start backend + frontend
cd backend && python main.py
cd frontend && npm run dev
# Gear icon should NOT spin
# Browse some websites, ping servers
# Watch topology show YOUR actual IPs!
```

### Test 2: See Mock Data (Simple)
```bash
# Just frontend
cd frontend && npm run dev
# Click gear icon (should spin)
# See 12 hardcoded IPs in random combinations
```

### Test 3: See Enhanced Mock Data
```bash
# Edit App.tsx to add <TopologyDemo />
cd frontend && npm run dev
# Click gear icon (should spin)
# See 33 diverse IPs with realistic attack scenarios
```

---

##  Key Takeaways

1. **TopologyView doesn't generate IPs** - it just displays what's in the store
2. **In production (Mock OFF)** - Backend captures real packets with real IPs
3. **In testing (Mock ON)** - Frontend generates fake events with hardcoded IPs
4. **TopologyDemo** - Optional enhancement for better mock data during development
5. **My changes** - Made IP labels clearer and mock data more diverse

The topology visualization itself is the same in both modesit just receives different data sources!
