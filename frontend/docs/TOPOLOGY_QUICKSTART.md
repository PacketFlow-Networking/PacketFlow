# Network Topology - Quick Start Guide

## What Was Changed?

Your network topology now shows **individual IP addresses** instead of generic nodes!

### Before
```
[Internal] -----> [External]
```

### After
```
[192.168.1.10] -----> [8.8.8.8]
[192.168.1.15] -----> [45.76.139.42]
[192.168.2.20] -----> [52.84.23.112]
     ...
```

## Files Modified

1. **TopologyView.tsx**
   - Line ~322: Changed node labels to show full IP addresses
   - Added monospace font for IP readability

2. **TopologyDemo.tsx** 
   - Expanded from 6 to 17 internal hosts
   - Expanded from 6 to 16 external hosts
   - Increased events from 30 to 60
   - Added 8 diverse attack scenarios

## Quick Test (3 Steps)

### Step 1: Start the Frontend
```bash
cd frontend
npm run dev
```

### Step 2: Enable Mock Mode
- Click the **spinning gear icon** in the bottom-right corner
- The icon will turn yellow/orange when active

### Step 3: View Topology
- Click the **"Topology"** tab in the bottom panel
- You should see a network graph with individual IP addresses!

## Want the Enhanced Demo Data?

If you want to see the rich topology with 17 internal + 16 external hosts:

**Edit `App.tsx`:**

```typescript
// Add this import at the top
import TopologyDemo from './components/topology/TopologyDemo';

// Add this line right after the opening <div> in the return statement
function App() {
  return (
    <div className="h-screen flex flex-col bg-base">
      <TopologyDemo />  {/* <-- Add this line */}
      <MetricsBar />
      {/* rest of your code... */}
    </div>
  );
}
```

That's it! The topology will now show a complex network with:
-  17 internal hosts across 5 subnets
-  16 external services (DNS, CDN, Cloud, etc.)
-  8 attack scenarios (C2, lateral movement, exfiltration, etc.)
-  ~75 total events with realistic traffic patterns

## Topology Features

### Node Colors
-  **Blue** = Internal hosts (RFC1918)
-  **Green** = External hosts
-  **Yellow** = Warning (anomaly score 0.4-0.7)
-  **Red** = Critical (anomaly score > 0.7)

### Controls
- **Mouse Wheel** = Zoom in/out
- **Drag Background** = Pan the view
- **Drag Node** = Reposition a node
- **Click Node** = See details in side panel
- ** Lock Button** = Freeze layout (prevent auto-positioning)
- ** Pause Button** = Stop physics simulation

### Filters
- Show/hide internal or external nodes
- Filter by minimum anomaly score
- Filter by minimum traffic volume
- Filter by protocol type

## Troubleshooting

### "I don't see many nodes"
-  Make sure mock mode is enabled (gear icon spinning)
-  Check that filters are not too restrictive
-  Try adding `<TopologyDemo />` for rich demo data

### "Nodes are overlapping"
-  Zoom out using the zoom buttons or mouse wheel
-  Drag nodes to reposition them
-  Click the Lock button once positioned

### "The topology is empty"
-  Switch to the "Topology" tab
-  Enable mock mode
-  Wait a few seconds for events to generate

## Network Layout

The demo creates this network structure:

```
                    Internet
                       
    
                                        
DNS Servers     Cloud Services    Suspicious IPs
(8.8.8.8)       (AWS, GitHub)    (45.76.139.42)
                                        
    
                       
                   DMZ Layer
                  (10.0.0.x)
                       
        
                                    
   Workstations    Servers      IoT Devices
  (192.168.1.x) (192.168.2.x) (192.168.3.x)
```

## Need More Help?

Check these files:
- `TOPOLOGY_CHANGES.md` - Detailed technical changes
- `HOW_TO_ADD_TOPOLOGY_DEMO.tsx` - Step-by-step integration guide
- `TopologyView.tsx` - Main topology component source
- `TopologyDemo.tsx` - Demo data generator source

Enjoy your new IP-based network topology! 
