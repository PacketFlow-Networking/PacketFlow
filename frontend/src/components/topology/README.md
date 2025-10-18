# Network Topology View

## Overview
The Network Topology View provides an interactive, force-directed graph visualization of network communications. It helps analysts understand:
- Who is talking to whom
- Traffic volumes and patterns
- Anomalous connections
- Internal vs. external hosts

## Features

###  Visual Design
- **Force-directed graph** using D3.js for natural network layout
- **Color-coded nodes**:
  -  Blue: Internal hosts (RFC1918 addresses)
  -  Green: External hosts
  -  Yellow: Medium anomaly (0.4-0.7)
  -  Red: High anomaly (>0.7)
- **Sized by activity**: Node size increases with event count
- **Link thickness**: Represents traffic volume
- **Animated arrows**: Show traffic direction
- **Anomaly indicators**: Red dot badge on suspicious nodes

###  Interactive Controls
- **Click & drag nodes**: Reposition manually
- **Zoom controls**: +/- buttons and mouse wheel
- **Pan**: Drag background
- **Reset view**: Return to default zoom/position
- **Node selection**: Click any node to see details

###  Filtering Options
Advanced filters to focus on relevant data:
- **Node type**: Show/hide internal or external hosts
- **Anomaly threshold**: Filter by minimum anomaly score (0.0-1.0)
- **Traffic volume**: Filter by minimum bytes transferred
- **Protocol selection**: Filter by TCP, UDP, ICMP, HTTP, HTTPS, DNS

###  Node Details Panel
When a node is selected, view:
- IP address
- Type (internal/external)
- Anomaly score with visual gauge
- Event count
- Total traffic volume (formatted)
- Suspicious activity warning (if applicable)

###  Keyboard Shortcuts
- `n` - Jump directly to topology view
- `t` - Cycle through Events/Stats/Topology tabs
- Click filters icon to toggle filter panel
- Click node to select, click background to deselect

## Technical Details

### Data Processing
The topology view processes network events to build a graph structure:
1. **Node aggregation**: Groups events by source/destination IP
2. **Link creation**: Connects communicating hosts
3. **Metric calculation**: Computes anomaly scores, traffic volumes
4. **Protocol tracking**: Records which protocols used per connection
5. **RFC1918 detection**: Automatically classifies internal/external

### Graph Algorithm
Uses D3's force simulation with:
- **Link force**: Maintains edge distances
- **Charge force**: Repels nodes for clarity
- **Center force**: Keeps graph centered
- **Collision force**: Prevents node overlap

### Performance
- Efficient React memo and useMemo hooks
- D3 handles layout calculations off main thread
- Filters applied before graph construction
- Supports hundreds of nodes without lag

## Usage Tips

###  Investigation Workflow
1. **Overview**: Start with all filters enabled to see full network
2. **Focus on anomalies**: Raise anomaly threshold to 0.5+ to find suspicious activity
3. **Examine connections**: Click red nodes to see details
4. **Check protocols**: Filter by protocol to investigate specific traffic types
5. **Export findings**: Take screenshots or note IPs for incident reports

###  Common Use Cases
- **Lateral movement detection**: Look for internalinternal connections
- **Command & control**: Find internalexternal anomalous connections
- **Traffic baseline**: Understand normal network topology
- **Incident response**: Quickly visualize affected systems

###  Known Limitations
- Large networks (>500 nodes) may impact performance
- Layout stabilizes over ~2-3 seconds
- Very dense graphs may require manual repositioning
- No persistence of node positions across sessions

## Integration Points

### Data Source
- Consumes events from Zustand store (`useStore`)
- Real-time updates as new events arrive
- Filters apply to store's event array

### Store Integration
```typescript
const { events } = useStore();
```

### Responsive Layout
- Fills available container height
- Adapts to window resize
- Mobile-friendly (touch gestures for zoom/pan)

## Future Enhancements
Potential improvements for future versions:
- [ ] Grouping/clustering of nodes
- [ ] Time-based playback
- [ ] Geolocation mapping
- [ ] Subnet visualization
- [ ] Export topology as image/SVG
- [ ] Custom node icons
- [ ] Link labels with packet counts
- [ ] Community detection algorithms
- [ ] 3D topology view option
- [ ] Historical comparison mode

## Dependencies
- React 18+
- D3.js v7
- Lucide React (icons)
- TailwindCSS (styling)

## Files
- `TopologyView.tsx` - Main component
- `../types/index.ts` - NetworkEvent interface
- `../context/store.ts` - Global state management

## Performance Tips
For optimal performance with large networks:
1. Use protocol filters to reduce node count
2. Increase minimum traffic threshold
3. Filter out low anomaly scores
4. Consider time-based filtering in EventStream first

---

**Last Updated**: October 16, 2025  
**Version**: 1.0.0  
**Status**:  Complete
