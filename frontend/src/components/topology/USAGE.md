# Network Topology View - Quick Reference Guide

##  Quick Start

### Opening the Topology View
1. **Tab click**: Click the "Topology" tab at the bottom of the main panel
2. **Keyboard**: Press `n` to jump directly to topology
3. **Cycle tabs**: Press `t` to cycle through Events  Stats  Topology

### First Look
When you open the topology view, you'll see:
- A force-directed graph with nodes (hosts) and links (connections)
- Nodes colored by type and threat level
- Connections showing traffic flow with arrows
- Zoom/filter controls in the header
- A legend in the bottom-left corner

---

##  Understanding the Visualization

### Node Colors
| Color | Meaning | When to Investigate |
|-------|---------|---------------------|
|  Blue | Internal host (RFC1918) | Normal - part of your network |
|  Green | External host | Normal - internet destinations |
|  Yellow | Medium anomaly (0.4-0.7) | Review for unusual patterns |
|  Red | High anomaly (>0.7) | **Urgent - investigate immediately** |

### Node Features
- **Size**: Larger = more events/activity
- **Red badge**: Indicates anomalous behavior
- **Label**: Shows last octet or host identifier

### Link Features
- **Thickness**: Thicker = higher traffic volume
- **Color**: 
  - Gray = normal traffic
  - Red = includes anomalous flows
- **Arrow**: Shows traffic direction (src  dst)

---

##  Common Investigation Patterns

### 1. Finding Suspicious Hosts
**Goal**: Identify compromised or malicious systems

**Steps**:
1. Look for **red nodes** (high anomaly score)
2. Check **connections**: Who are they talking to?
3. Click the node to see details panel
4. Review anomaly score, traffic volume, event count

**Red flags**:
- Internal host  unknown external IP
- Unusual internal-to-internal connections
- High traffic to single destination

---

### 2. Detecting Lateral Movement
**Goal**: Find attackers moving through your network

**Steps**:
1. Filter: Set "Min Anomaly Score" to 0.5+
2. Look for: Blue  Blue connections (internal-to-internal)
3. Focus on: Connections between different subnets
4. Investigate: Workstations connecting to servers/databases

**Indicators**:
- Workstation  Server connections
- Multiple internal hosts with red badges
- Unusual protocol use (e.g., RDP from workstation)

---

### 3. Command & Control Detection
**Goal**: Identify beaconing or C2 communication

**Steps**:
1. Filter: Check "External" hosts only
2. Look for: Blue  Green connections with red badges
3. Check: Regular, periodic traffic patterns
4. Investigate: Unknown external destinations

**Indicators**:
- Periodic outbound HTTPS to unknown IP
- High anomaly score on external connection
- Single internal host  single external IP

---

### 4. Data Exfiltration
**Goal**: Find unauthorized data transfers

**Steps**:
1. Filter: Set "Min Traffic" slider high (1MB+)
2. Look for: Thick links leaving network
3. Check: Internal  External with high volume
4. Investigate: Large transfers to unexpected destinations

**Indicators**:
- Very thick outbound links
- High byte count in node details
- Unusual times (after hours)

---

##  Using Filters Effectively

### Filter Panel
Click the **Filter** icon (top-right) to open filter panel

### Filter Strategy by Scenario

| Scenario | Filters to Use |
|----------|----------------|
| **Overview** | All on, Min Anomaly: 0 |
| **Threat Hunting** | All on, Min Anomaly: 0.5-0.7 |
| **Incident Response** | All on, Min Anomaly: 0.8+ |
| **Performance Issues** | All on, Min Traffic: 10MB+ |
| **DNS Investigation** | Protocol: DNS only |
| **External Focus** | Show External only |

### Progressive Filtering
1. Start with everything visible
2. Gradually increase anomaly threshold
3. Reduce clutter by hiding normal traffic
4. Focus on specific protocols if needed

---

##  Interactive Controls

### Zoom & Pan
| Action | Method |
|--------|--------|
| Zoom in | Click `+` button OR mouse wheel up |
| Zoom out | Click `-` button OR mouse wheel down |
| Reset view | Click reset button (square icon) |
| Pan | Click-drag on background |

### Node Interaction
| Action | Method |
|--------|--------|
| Select node | Click on any node |
| Drag node | Click-drag node to reposition |
| Close details | Click X in details panel |
| Deselect | Click on background |

### Layout Tips
- **Let it settle**: Graph takes 2-3 seconds to stabilize
- **Manually arrange**: Drag nodes to organize by subnet/role
- **Zoom for detail**: Zoom in on dense areas
- **Reset if lost**: Use reset button to return to overview

---

##  Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `n` | Open topology view |
| `t` | Cycle tabs (Events/Stats/Topology) |
| `f` or `/` | Focus search (in Events view) |
| `?` | Show all keyboard shortcuts |

---

##  Pro Tips

### Performance
- **Large networks**: Use filters to reduce node count
- **Slow rendering**: Increase Min Traffic threshold
- **Too cluttered**: Hide low anomaly scores

### Investigation Workflow
1. **Scan**: Overview at default zoom
2. **Filter**: Raise anomaly threshold
3. **Focus**: Click suspicious red nodes
4. **Correlate**: Switch to Events tab to see details
5. **Document**: Screenshot topology for reports

### Best Practices
- Review topology every 15-30 minutes during active monitoring
- Set filters before zooming in to reduce clutter
- Use protocol filters to investigate specific traffic types
- Compare current topology to known baseline
- Look for unusual patterns, not just red nodes

---

##  Alert Response Checklist

When you see a red node:

- [ ] Click node to view details panel
- [ ] Note IP address and anomaly score
- [ ] Check total traffic volume
- [ ] Review event count
- [ ] Identify all connected nodes
- [ ] Switch to Events tab
- [ ] Filter events for this IP
- [ ] Review event details
- [ ] Check incident panel for existing tickets
- [ ] Create incident if needed
- [ ] Document findings

---

##  Interpreting the Graph

### Healthy Network
- Mostly blue and green nodes
- Few or no yellow/red nodes
- Clear hub-and-spoke patterns
- Predictable connections

### Suspicious Network
- Multiple red nodes
- Unexpected internal connections
- Unknown external destinations
- Thick links to strange IPs

### During Attack
- New red nodes appearing
- Increasing link thickness
- Unusual patterns forming
- Rapid topology changes

---

##  Related Features

- **Events Tab**: See detailed event list for any host
- **Statistics Tab**: View aggregate metrics
- **Incident Panel**: Track investigation progress
- **Alert Config**: Tune anomaly detection
- **Export**: Save topology state (screenshot)

---

##  Troubleshooting

### No nodes showing
- **Cause**: No events in store
- **Fix**: Enable mock mode or wait for real traffic

### Graph too cluttered
- **Cause**: Too many nodes
- **Fix**: Increase filters (anomaly, traffic, protocols)

### Can't find specific host
- **Cause**: Filtered out
- **Fix**: Reset filters or adjust thresholds

### Layout keeps moving
- **Cause**: Force simulation stabilizing
- **Fix**: Wait 2-3 seconds, or drag nodes to fix position

### Slow performance
- **Cause**: Too many nodes (>500)
- **Fix**: Filter by time range in Events, then view topology

---

##  Learn More

- Full documentation: `src/components/topology/README.md`
- Keyboard shortcuts: Press `?` in app
- Alert configuration: Press `Ctrl+,`

---

**Version**: 1.0  
**Last Updated**: October 16, 2025  
**Feature Status**:  Complete
