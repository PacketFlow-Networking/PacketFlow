# Network Topology Changes

## Summary of Changes

The network topology visualization has been updated to display **actual IP addresses** as nodes instead of generic "internal" and "external" labels.

## Changes Made

### 1. TopologyView.tsx
- **Changed**: Node labels now display full IP addresses (e.g., `192.168.1.10`) instead of just the last octet
- **Changed**: Labels use monospace font for better readability of IP addresses
- **Changed**: Font size slightly reduced to accommodate full IPs
- The topology already creates individual nodes for each unique IP address

### 2. TopologyDemo.tsx
- **Added**: More diverse internal hosts (17 hosts across different subnets):
  - Workstations: `192.168.1.x`
  - Servers: `192.168.2.x`
  - DMZ: `10.0.0.x`
  - Admin: `172.16.5.x`
  - IoT: `192.168.3.x`

- **Added**: More diverse external hosts (16 hosts):
  - DNS servers (Google, Cloudflare)
  - Popular services (Reddit, GitHub, Microsoft, AWS, etc.)
  - CDN services (Akamai, CloudFront)
  - Suspicious/unknown hosts for anomaly demonstration

- **Increased**: Baseline events from 30 to 60 for richer topology
- **Added**: More suspicious traffic patterns showcasing:
  - Multiple hosts connecting to same C2 server
  - IoT device anomalies
  - Internal reconnaissance
  - DMZ to internal scanning

## How to Use

### Testing the Topology

1. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Enable Mock Mode**:
   - Click the settings gear icon in the bottom-right corner
   - This will activate the mock data generator

3. **View the Topology**:
   - Click the "Topology" tab in the lower panel
   - You should see a network graph with individual IP addresses as nodes

4. **Load Demo Data** (Optional):
   
   If you want to load the enhanced demo data with diverse IPs, import the `TopologyDemo` component in your `App.tsx`:

   ```typescript
   import TopologyDemo from './components/topology/TopologyDemo';
   
   function App() {
     // ... existing code ...
     
     return (
       <div className="h-screen flex flex-col bg-base">
         <TopologyDemo />  {/* Add this line */}
         {/* ... rest of your JSX ... */}
       </div>
     );
   }
   ```

   This will generate a rich set of network events with:
   - 17 internal hosts
   - 16 external hosts
   - ~75 total events showing various traffic patterns
   - Multiple anomalies demonstrating different attack scenarios

## Features

### Node Types
- **Blue nodes**: Internal hosts (RFC1918 addresses)
- **Green nodes**: External hosts
- **Yellow/Orange nodes**: Hosts with medium anomaly scores (0.4-0.7)
- **Red nodes**: Hosts with high anomaly scores (>0.7)

### Visual Indicators
- **Node size**: Scales with number of events
- **Link thickness**: Represents traffic volume
- **Red links**: Connections with anomalies
- **Red dot badge**: Indicates high anomaly score on node

### Interactions
- **Click a node**: View detailed information in the side panel
- **Drag nodes**: Reposition for better view
- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag the background
- **Lock button**: Freeze the layout to prevent movement
- **Pause button**: Stop the force simulation

### Filters
- Toggle internal/external hosts
- Filter by minimum anomaly score
- Filter by minimum traffic volume
- Filter by protocol types

## Network Architecture Visualization

The demo data creates a realistic network with:

```
Internet
   
    DNS Servers (8.8.8.8, 1.1.1.1, etc.)
    CDN/Cloud Services (AWS, Akamai, GitHub)
    Suspicious Hosts (45.76.139.42, 198.51.100.23)
   
   
DMZ (10.0.0.x)
   
   
Internal Network
    Workstations (192.168.1.x)
    Servers (192.168.2.x)
    IoT Devices (192.168.3.x)
    Admin Systems (172.16.5.x)
```

## Anomaly Scenarios Demonstrated

1. **Lateral Movement**: Workstation  Database Server
2. **Command & Control**: Multiple internal hosts  Same external C2 server
3. **Port Scanning**: DMZ host  Internal servers
4. **DNS Tunneling**: IoT device  DNS server with high query volume
5. **Data Exfiltration**: Admin host  Cloud storage with large transfers
6. **Internal Reconnaissance**: Workstation scanning web servers

## Troubleshooting

### Not seeing many nodes?
- Make sure mock mode is enabled
- Check the console for any errors
- Try importing `TopologyDemo` component to load demo data
- Adjust filters (make sure "Show Internal" and "Show External" are both checked)

### Nodes are too clustered?
- Use the zoom controls to zoom out
- Drag nodes to reposition them
- Click the Lock button to freeze the layout once you like it

### Performance issues?
- Reduce the number of baseline events in TopologyDemo (line 76)
- Increase the `minTraffic` filter to show only high-volume connections
- Enable the anomaly filter to show only suspicious hosts

## Future Enhancements

Potential improvements for the topology view:

1. **Node Grouping**: Automatically group nodes by subnet
2. **Time Slider**: Show topology evolution over time
3. **Traffic Animation**: Animate packets flowing along links
4. **Geolocation**: Show external IPs on a world map
5. **Export**: Export topology as image or GraphML
6. **Threat Highlighting**: Automatically highlight attack chains
7. **Node Details**: Show more metrics (bandwidth, packet loss, etc.)
8. **Custom Layouts**: Alternative layout algorithms (hierarchical, circular)
