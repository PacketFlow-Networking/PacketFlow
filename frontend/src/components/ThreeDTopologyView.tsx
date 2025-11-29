import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Filter, X, Layers, Lock, Unlock, Pause, Play } from 'lucide-react';
import * as THREE from 'three';
import { useStore } from '../context/store';
import { GRAPH_CONFIG } from '../config/graph.config';

interface Node3D {
  id: string;
  ip: string;
  type: 'internal' | 'external';
  physical_room?: string; // NEW: Physical room/subnet zone
  anomalyScore: number;
  eventCount: number;
  totalBytes: number;
  lat?: number;
  lon?: number;
  semanticVector?: number[];
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
  fz?: number | null;
  cluster?: number; // Semantic cluster ID
}

interface Link3D {
  source: string | Node3D;
  target: string | Node3D;
  value: number;
  semanticDistance: number;
  anomalies: number;
}

interface GraphData {
  nodes: Node3D[];
  links: Link3D[];
}

interface Cluster {
  id: number;
  nodes: Node3D[];
  center: { x: number; y: number; z: number };
  color: string;
  name: string;
  type: 'internal_room' | 'dmz' | 'external';
}

interface PhysicalRoom {
  name: string;
  nodes: Node3D[];
  center: { x: number; y: number; z: number };
  color: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

type ViewMode = 'semantic' | 'physical' | 'hybrid';

interface TopologyFilters {
  showInternal: boolean;
  showExternal: boolean;
  minAnomalyScore: number;
  minTraffic: number;
}

function NetworkNode({ node, onClick, showLabels }: { node: Node3D; onClick: () => void; showLabels: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    if (node.anomalyScore > 0.7) return '#ef4444';
    if (node.anomalyScore > 0.4) return '#f59e0b';
    return node.type === 'internal' ? '#3b82f6' : '#10b981';
  }, [node.anomalyScore, node.type]);

  const size = useMemo(() => {
    return 5 + Math.sqrt(node.eventCount || 1) * 0.5;
  }, [node.eventCount]);

  return (
    <group position={[node.x || 0, node.y || 0, node.z || 0]}>
      <mesh ref={meshRef} onClick={onClick}>
        {/* Reduced poly count: 16,16 -> 8,8 for 4x faster rendering */}
        <sphereGeometry args={[size, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          metalness={0.5}
          roughness={0.5}
        />
      </mesh>
      {node.anomalyScore > 0.5 && (
        <mesh position={[0, size + 3, 0]}>
          {/* Reduced poly count: 8,8 -> 4,4 */}
          <sphereGeometry args={[2, 4, 4]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
      {/* Only show labels when enabled (expensive DOM operations) */}
      {showLabels && (
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <div className="text-white text-xs font-mono whitespace-nowrap bg-black/80 px-2 py-1 rounded shadow-lg">
            {node.ip}
          </div>
        </Html>
      )}
    </group>
  );
}

function NetworkLink({ link }: { link: Link3D }) {
  // Ensure source and target are node objects with positions
  const sourceNode = typeof link.source === 'string' ? null : link.source;
  const targetNode = typeof link.target === 'string' ? null : link.target;
  
  // Skip rendering if we don't have proper node references
  if (!sourceNode || !targetNode) return null;

  const points = useMemo(() => [
    new THREE.Vector3(sourceNode.x || 0, sourceNode.y || 0, sourceNode.z || 0),
    new THREE.Vector3(targetNode.x || 0, targetNode.y || 0, targetNode.z || 0),
  ], [sourceNode.x, sourceNode.y, sourceNode.z, targetNode.x, targetNode.y, targetNode.z]);

  // Color based on anomalies
  const color = link.anomalies > 0 ? '#ef4444' : '#64748b';
  
  // Line width based on connection strength (like 2D view)
  const lineWidth = Math.min(Math.sqrt(link.value) / 2, 5);
  
  // Higher opacity for anomalies, lower for normal traffic (0.4-0.6 range)
  const opacity = link.anomalies > 0 ? 0.7 : 0.4;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      opacity={opacity}
      transparent
    />
  );
}

// Cluster Detection Algorithm - Groups nodes that communicate heavily with each other
function detectClusters(nodes: Node3D[], links: Link3D[]): Cluster[] {
  // Build adjacency matrix for communication strength
  const adjacency: Map<string, Map<string, number>> = new Map();
  
  links.forEach(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    
    if (!adjacency.has(sourceId)) adjacency.set(sourceId, new Map());
    if (!adjacency.has(targetId)) adjacency.set(targetId, new Map());
    
    adjacency.get(sourceId)!.set(targetId, link.value);
    adjacency.get(targetId)!.set(sourceId, link.value);
  });
  
  // Assign clusters using greedy connected components
  const nodeClusterMap = new Map<string, number>();
  let currentCluster = 0;
  
  const assignCluster = (nodeId: string, clusterId: number) => {
    if (nodeClusterMap.has(nodeId)) return;
    
    nodeClusterMap.set(nodeId, clusterId);
    const neighbors = adjacency.get(nodeId);
    
    if (neighbors) {
      // Sort neighbors by communication strength
      const sortedNeighbors = Array.from(neighbors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Only consider top 10 strongest connections
      
      sortedNeighbors.forEach(([neighborId, strength]) => {
        if (strength > 10 && !nodeClusterMap.has(neighborId)) { // Threshold for cluster membership
          assignCluster(neighborId, clusterId);
        }
      });
    }
  };
  
  // Assign internal nodes to clusters
  nodes.filter(n => n.type === 'internal').forEach(node => {
    if (!nodeClusterMap.has(node.id)) {
      assignCluster(node.id, currentCluster++);
    }
  });
  
  // External nodes get their own "external" cluster
  nodes.filter(n => n.type === 'external').forEach(node => {
    nodeClusterMap.set(node.id, 9999); // Special external cluster
  });
  
  // Update nodes with cluster assignments
  nodes.forEach(node => {
    node.cluster = nodeClusterMap.get(node.id) || 0;
  });
  
  // Build cluster objects
  const clusterMap = new Map<number, Node3D[]>();
  nodes.forEach(node => {
    const cId = node.cluster || 0;
    if (!clusterMap.has(cId)) clusterMap.set(cId, []);
    clusterMap.get(cId)!.push(node);
  });
  
  const clusterColors = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];
  
  const clusters: Cluster[] = [];
  clusterMap.forEach((clusterNodes, clusterId) => {
    if (clusterNodes.length === 0) return;
    
    // Calculate cluster center
    const centerX = clusterNodes.reduce((sum, n) => sum + (n.x || 0), 0) / clusterNodes.length;
    const centerY = clusterNodes.reduce((sum, n) => sum + (n.y || 0), 0) / clusterNodes.length;
    const centerZ = clusterNodes.reduce((sum, n) => sum + (n.z || 0), 0) / clusterNodes.length;
    
    const isExternal = clusterId === 9999;
    const type = isExternal ? 'external' : 
                 clusterNodes.some(n => n.anomalyScore > 0.5) ? 'dmz' : 'internal_room';
    
    clusters.push({
      id: clusterId,
      nodes: clusterNodes,
      center: { x: centerX, y: centerY, z: centerZ },
      color: isExternal ? '#64748b' : clusterColors[clusterId % clusterColors.length],
      name: isExternal ? 'External Network' : `Room ${clusterId + 1} (${clusterNodes.length} hosts)`,
      type
    });
  });
  
  return clusters;
}

// Physical Room Detection - Groups nodes by subnet/zone
function detectPhysicalRooms(nodes: Node3D[]): PhysicalRoom[] {
  const roomMap = new Map<string, Node3D[]>();
  
  // Group nodes by physical_room attribute
  nodes.forEach(node => {
    const roomName = node.physical_room || 'Unknown';
    if (!roomMap.has(roomName)) {
      roomMap.set(roomName, []);
    }
    roomMap.get(roomName)!.push(node);
  });
  
  const roomColors = [
    '#3b82f6', // Blue - Workstations
    '#10b981', // Green - Servers
    '#f59e0b', // Amber - DMZ
    '#8b5cf6', // Purple - IoT
    '#ec4899', // Pink - Admin
    '#14b8a6', // Teal - Development
    '#f97316', // Orange - Production
    '#06b6d4', // Cyan - Management
  ];
  
  const rooms: PhysicalRoom[] = [];
  let colorIndex = 0;
  
  roomMap.forEach((roomNodes, roomName) => {
    if (roomNodes.length === 0) return;
    
    // Calculate center
    const centerX = roomNodes.reduce((sum, n) => sum + (n.x || 0), 0) / roomNodes.length;
    const centerY = roomNodes.reduce((sum, n) => sum + (n.y || 0), 0) / roomNodes.length;
    const centerZ = roomNodes.reduce((sum, n) => sum + (n.z || 0), 0) / roomNodes.length;
    
    // Calculate bounding box
    const bounds = {
      minX: Math.min(...roomNodes.map(n => n.x || 0)),
      maxX: Math.max(...roomNodes.map(n => n.x || 0)),
      minY: Math.min(...roomNodes.map(n => n.y || 0)),
      maxY: Math.max(...roomNodes.map(n => n.y || 0)),
      minZ: Math.min(...roomNodes.map(n => n.z || 0)),
      maxZ: Math.max(...roomNodes.map(n => n.z || 0)),
    };
    
    // Assign color (external gets gray, others get vibrant colors)
    const color = roomName === 'External Network' ? '#64748b' : roomColors[colorIndex++ % roomColors.length];
    
    rooms.push({
      name: roomName,
      nodes: roomNodes,
      center: { x: centerX, y: centerY, z: centerZ },
      color,
      bounds
    });
  });
  
  return rooms;
}

// Physical Room Boundary Component (Translucent Box)
function PhysicalRoomBoundary({ room }: { room: PhysicalRoom }) {
  const width = (room.bounds.maxX - room.bounds.minX) + 120; // Increased padding
  const height = (room.bounds.maxY - room.bounds.minY) + 120;
  const depth = (room.bounds.maxZ - room.bounds.minZ) + 120;
  
  // Don't render if room is too small
  if (width < 20 || height < 20 || depth < 20) return null;
  
  return (
    <group position={[room.center.x, room.center.y, room.center.z]}>
      {/* Highly transparent box - only wireframe visible */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={room.color}
          transparent
          opacity={0.02}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Subtle wireframe edges only */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(width, height, depth)]} />
        <lineBasicMaterial color={room.color} linewidth={1} opacity={0.35} transparent />
      </lineSegments>
      {/* Room label at top corner */}
      <Html center distanceFactor={30} position={[0, height / 2 + 15, 0]}>
        <div 
          className="text-white text-sm font-bold whitespace-nowrap px-3 py-1.5 rounded-lg shadow-lg border-2"
          style={{ 
            backgroundColor: room.color + 'F0',
            borderColor: room.color,
            backdropFilter: 'blur(8px)'
          }}
        >
          📍 {room.name} ({room.nodes.length} hosts)
        </div>
      </Html>
    </group>
  );
}

// Cluster Visualization Component
function ClusterBoundary({ cluster }: { cluster: Cluster }) {
  const boundary = useMemo(() => {
    if (cluster.nodes.length < 3) return null;
    
    // Calculate bounding sphere radius
    const maxDist = cluster.nodes.reduce((max, node) => {
      const dx = (node.x || 0) - cluster.center.x;
      const dy = (node.y || 0) - cluster.center.y;
      const dz = (node.z || 0) - cluster.center.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      return Math.max(max, dist);
    }, 0);
    
    const radius = maxDist + 30; // Add padding
    
    return { center: cluster.center, radius };
  }, [cluster]);
  
  if (!boundary) return null;
  
  return (
    <group position={[boundary.center.x, boundary.center.y, boundary.center.z]}>
      {/* Highly transparent sphere boundary - barely visible fill */}
      <mesh>
        <sphereGeometry args={[boundary.radius, 16, 16]} />
        <meshBasicMaterial
          color={cluster.color}
          transparent
          opacity={0.02}
          wireframe={false}
        />
      </mesh>
      {/* Subtle wireframe outline only */}
      <mesh>
        <sphereGeometry args={[boundary.radius + 2, 16, 16]} />
        <meshBasicMaterial
          color={cluster.color}
          transparent
          opacity={0.15}
          wireframe={true}
        />
      </mesh>
      {/* Cluster label */}
      <Html center distanceFactor={20}>
        <div 
          className="text-white text-sm font-semibold whitespace-nowrap px-3 py-1 rounded-full shadow-lg"
          style={{ 
            backgroundColor: cluster.color + 'CC',
            border: `2px solid ${cluster.color}`
          }}
        >
          {cluster.name}
        </div>
      </Html>
    </group>
  );
}

export default function ThreeDTopologyView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [physicalRooms, setPhysicalRooms] = useState<PhysicalRoom[]>([]);
  const [showClusters, setShowClusters] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('hybrid'); // semantic, physical, or hybrid
  const [showLabels, setShowLabels] = useState(false); // Labels off by default for performance
  const [isLocked, setIsLocked] = useState(false); // Lock layout for stability
  const [isPaused, setIsPaused] = useState(false); // Pause simulation
  
  const [filters, setFilters] = useState<TopologyFilters>({
    showInternal: true,
    showExternal: true,
    minAnomalyScore: 0,
    minTraffic: 0,
  });

  // Get data from Zustand store instead of API
  const { events } = useStore();

  // Process events into graph data
  useEffect(() => {
    if (events.length === 0) {
      setIsLoading(false);
      setGraphData({ nodes: [], links: [] });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nodeMap = new Map<string, Node3D>();
      const linkMap = new Map<string, Link3D>();

      const isInternal = (ip: string): boolean => {
        return (
          ip.startsWith('10.') ||
          ip.startsWith('192.168.') ||
          ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./i) !== null ||
          ip === 'localhost' ||
          ip.startsWith('127.')
        );
      };

      // Build nodes and links from events
      events.forEach((event) => {
        const eventBytes = (event.avg_size || 0) * event.flows;
        
        if (!nodeMap.has(event.src)) {
          nodeMap.set(event.src, {
            id: event.src,
            ip: event.src,
            type: isInternal(event.src) ? 'internal' : 'external',
            anomalyScore: event.anomaly_score || 0,
            eventCount: 1,
            totalBytes: eventBytes
          });
        }

        if (!nodeMap.has(event.dst)) {
          nodeMap.set(event.dst, {
            id: event.dst,
            ip: event.dst,
            type: isInternal(event.dst) ? 'internal' : 'external',
            anomalyScore: event.anomaly_score || 0,
            eventCount: 1,
            totalBytes: eventBytes
          });
        }

        const srcNode = nodeMap.get(event.src)!;
        const dstNode = nodeMap.get(event.dst)!;
        srcNode.anomalyScore = Math.max(srcNode.anomalyScore, event.anomaly_score || 0);
        dstNode.anomalyScore = Math.max(dstNode.anomalyScore, event.anomaly_score || 0);
        srcNode.eventCount++;
        dstNode.eventCount++;
        srcNode.totalBytes += eventBytes;
        dstNode.totalBytes += eventBytes;

        const linkKey = `${event.src}-${event.dst}`;
        if (!linkMap.has(linkKey)) {
          linkMap.set(linkKey, {
            source: srcNode,  // Store node reference, not string
            target: dstNode,  // Store node reference, not string
            value: 1,
            semanticDistance: 1,
            anomalies: event.anomaly_score > 0.5 ? 1 : 0
          });
        } else {
          const link = linkMap.get(linkKey)!;
          link.value++;
          if (event.anomaly_score > 0.5) link.anomalies++;
        }
      });

      const nodes = Array.from(nodeMap.values());
      const links = Array.from(linkMap.values());

      // Run force simulation to calculate positions
      runSimulation(nodes, links).then(processedData => {
        // Update link references to use positioned nodes
        const finalLinks = processedData.links.map(link => ({
          ...link,
          source: processedData.nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id)) || link.source,
          target: processedData.nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id)) || link.target,
        }));
        
        const dataWithLinks = { ...processedData, links: finalLinks };
        
        // Detect semantic clusters
        const detectedClusters = detectClusters(dataWithLinks.nodes, dataWithLinks.links);
        setClusters(detectedClusters);

        // Detect physical rooms
        const detectedRooms = detectPhysicalRooms(dataWithLinks.nodes);
        setPhysicalRooms(detectedRooms);

        setGraphData(dataWithLinks);
        setIsLoading(false);
      });
    } catch (err) {
      console.error('Failed to process network data:', err);
      setError(err instanceof Error ? err.message : 'Failed to process network data');
      setGraphData({ nodes: [], links: [] });
      setIsLoading(false);
    }
  }, [events]);

  // Run 3D force simulation with physical room awareness
  const runSimulation = async (nodes: Node3D[], links: Link3D[]): Promise<GraphData> => {
    return new Promise((resolve) => {
      // Group nodes by physical room for spatial separation
      const roomOffsets = new Map<string, { x: number; y: number; z: number }>();
      const uniqueRooms = Array.from(new Set(nodes.map(n => n.physical_room || 'Unknown')));
      
      // Create spatial layout for rooms (arrange in a grid pattern with more spacing)
      const roomsPerRow = Math.ceil(Math.sqrt(uniqueRooms.length));
      const roomSpacing = 600;  // Increased spacing to prevent overlap
      
      uniqueRooms.forEach((room, index) => {
        const row = Math.floor(index / roomsPerRow);
        const col = index % roomsPerRow;
        roomOffsets.set(room, {
          x: (col - roomsPerRow / 2) * roomSpacing,
          y: 0,
          z: (row - roomsPerRow / 2) * roomSpacing
        });
      });
      
      // Initialize positions
      nodes.forEach((node) => {
        if (node.lat !== undefined && node.lon !== undefined) {
          // Convert lat/lon to 3D coordinates (simplified sphere projection)
          const phi = (90 - node.lat) * (Math.PI / 180);
          const theta = (node.lon + 180) * (Math.PI / 180);
          const radius = 300;
          
          node.x = radius * Math.sin(phi) * Math.cos(theta);
          node.y = radius * Math.cos(phi);
          node.z = radius * Math.sin(phi) * Math.sin(theta);
        } else {
          // Position within physical room zone
          const roomOffset = roomOffsets.get(node.physical_room || 'Unknown') || { x: 0, y: 0, z: 0 };
          node.x = roomOffset.x + (Math.random() - 0.5) * 200;
          node.y = roomOffset.y + (Math.random() - 0.5) * 200;
          node.z = roomOffset.z + (Math.random() - 0.5) * 200;
        }
      });

      // Optimized force simulation - reduced from 100 to 50 iterations
      // Still provides good layout but 2x faster initial load
      const iterations = Math.min(50, nodes.length > 50 ? 30 : 50);
      
      // Skip simulation if paused
      if (!isPaused) {
        for (let i = 0; i < iterations; i++) {
          // Repulsion between all nodes
          for (let j = 0; j < nodes.length; j++) {
            for (let k = j + 1; k < nodes.length; k++) {
              const node1 = nodes[j];
              const node2 = nodes[k];
              
              const dx = (node2.x || 0) - (node1.x || 0);
              const dy = (node2.y || 0) - (node1.y || 0);
              const dz = (node2.z || 0) - (node1.z || 0);
              
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
              const force = 1000 / (dist * dist);
              
              node1.x! -= (dx / dist) * force;
              node1.y! -= (dy / dist) * force;
              node1.z! -= (dz / dist) * force;
              
              node2.x! += (dx / dist) * force;
              node2.y! += (dy / dist) * force;
              node2.z! += (dz / dist) * force;
            }
          }
          
          // Attraction for linked nodes
          links.forEach(link => {
            const sourceNode = nodes.find(n => n.id === (typeof link.source === 'string' ? link.source : link.source.id));
            const targetNode = nodes.find(n => n.id === (typeof link.target === 'string' ? link.target : link.target.id));
            
            if (sourceNode && targetNode) {
              const dx = (targetNode.x || 0) - (sourceNode.x || 0);
              const dy = (targetNode.y || 0) - (sourceNode.y || 0);
              const dz = (targetNode.z || 0) - (sourceNode.z || 0);
              
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
              const force = dist * 0.01;
              
              sourceNode.x! += (dx / dist) * force;
              sourceNode.y! += (dy / dist) * force;
              sourceNode.z! += (dz / dist) * force;
              
              targetNode.x! -= (dx / dist) * force;
              targetNode.y! -= (dy / dist) * force;
              targetNode.z! -= (dz / dist) * force;
            }
          });
          
          // Center force
          nodes.forEach(node => {
            node.x! *= 0.95;
            node.y! *= 0.95;
            node.z! *= 0.95;
          });
        }
      }

      // Lock nodes in place if layout is locked
      if (isLocked) {
        nodes.forEach(node => {
          node.fx = node.x;
          node.fy = node.y;
          node.fz = node.z;
        });
      }

      resolve({ nodes, links });
    });
  };

  // Apply filters
  const filteredData = useMemo(() => {
    const filteredNodes = graphData.nodes.filter(node => {
      if (node.type === 'internal' && !filters.showInternal) return false;
      if (node.type === 'external' && !filters.showExternal) return false;
      if (node.anomalyScore < filters.minAnomalyScore) return false;
      if (node.totalBytes < filters.minTraffic) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, filters]);

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  return (
    <div className="w-full h-full bg-base flex flex-col">
      {/* Header - Higher z-index to prevent overlap */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel relative z-20">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-info" />
          <h1 className="text-xl font-bold text-text">3D Network Topology</h1>
          <span className="text-sm text-text-dim">
            {filteredData.nodes.length} nodes, {filteredData.links.length} connections
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-panel-hover rounded p-1">
            <button
              onClick={() => setViewMode('semantic')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'semantic' 
                  ? 'bg-info text-base shadow' 
                  : 'text-text hover:bg-border'
              }`}
              title="Show communication-based clusters"
            >
              💬 Semantic
            </button>
            <button
              onClick={() => setViewMode('physical')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'physical' 
                  ? 'bg-info text-base shadow' 
                  : 'text-text hover:bg-border'
              }`}
              title="Show subnet-based physical rooms"
            >
              📍 Physical
            </button>
            <button
              onClick={() => setViewMode('hybrid')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'hybrid' 
                  ? 'bg-info text-base shadow' 
                  : 'text-text hover:bg-border'
              }`}
              title="Show both layers"
            >
              🔀 Hybrid
            </button>
          </div>

          {/* Lock/Unlock Button */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`px-3 py-2 rounded flex items-center gap-2 transition-colors ${
              isLocked ? 'bg-amber-500/20 text-amber-400' : 'hover:bg-panel-hover text-text'
            }`}
            title={isLocked ? "Unlock Layout" : "Lock Layout"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Pause/Play Button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            disabled={isLocked}
            className={`px-3 py-2 rounded flex items-center gap-2 transition-colors ${
              isPaused 
                ? 'bg-info/20 text-info' 
                : isLocked
                ? 'opacity-50 cursor-not-allowed text-text'
                : 'hover:bg-panel-hover text-text'
            }`}
            title={isPaused ? "Resume Simulation" : "Pause Simulation"}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded flex items-center gap-2 transition-colors ${
              showFilters ? 'bg-info text-base' : 'bg-panel-hover hover:bg-border text-text'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm">Filters</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main 3D Canvas */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-base z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-info mx-auto mb-4" />
                <p className="text-text">Loading network data...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-base z-10">
              <div className="text-center max-w-md">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-text mb-2">Failed to load network data</p>
                <p className="text-sm text-text-dim mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-info text-base rounded hover:bg-info/80 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-text-dim">
                <p className="text-lg mb-2">No network data to display</p>
                <p className="text-sm">Adjust filters or wait for events</p>
              </div>
            </div>
          )}

          {!isLoading && !error && filteredData.nodes.length > 0 && (
            <Canvas 
              camera={{ position: [0, 0, 500], fov: 75 }}
              performance={{ min: 0.5 }}
              dpr={[1, 2]}
              gl={{ 
                antialias: false,
                powerPreference: 'high-performance',
                alpha: false
              }}
            >
              <color attach="background" args={['#0b1220']} />
              <ambientLight intensity={0.5} />
              <pointLight position={[100, 100, 100]} intensity={1} />
              <pointLight position={[-100, -100, -100]} intensity={0.5} />
              
              <OrbitControls
                enableDamping
                dampingFactor={0.05}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
              />

              {/* Render links */}
              {filteredData.links.map((link, i) => (
                <NetworkLink key={i} link={link} />
              ))}

              {/* Render semantic cluster boundaries (communication-based) */}
              {showClusters && (viewMode === 'semantic' || viewMode === 'hybrid') && clusters.map((cluster) => (
                <ClusterBoundary key={`cluster-${cluster.id}`} cluster={cluster} />
              ))}

              {/* Render physical room boundaries (subnet-based) */}
              {showClusters && (viewMode === 'physical' || viewMode === 'hybrid') && physicalRooms.map((room) => (
                <PhysicalRoomBoundary key={`room-${room.name}`} room={room} />
              ))}

              {/* Render nodes */}
              {filteredData.nodes.map((node) => (
                <NetworkNode
                  key={node.id}
                  node={node}
                  onClick={() => setSelectedNode(node)}
                  showLabels={showLabels}
                />
              ))}
            </Canvas>
          )}

          {/* Legend - Enhanced visibility */}
          <div className="absolute bottom-4 left-4 bg-panel/95 backdrop-blur-md border-2 border-border rounded-lg p-4 text-xs max-w-xs shadow-2xl">
            <div className="font-bold text-text mb-3 text-sm">Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-300" />
                <span className="text-text">Internal Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 border border-green-300" />
                <span className="text-text">External Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500 border border-amber-300" />
                <span className="text-text">Warning (0.4-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 border border-red-300" />
                <span className="text-text">Critical (&gt;0.7)</span>
              </div>
              {viewMode !== 'physical' && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-text font-medium text-xs mb-1">💬 Semantic Clusters</div>
                  <div className="text-text-dim text-[10px]">Spheres = Heavy communication</div>
                </div>
              )}
              {viewMode !== 'semantic' && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-text font-medium text-xs mb-1">📍 Physical Rooms</div>
                  <div className="text-text-dim text-[10px]">Boxes = Subnet zones</div>
                </div>
              )}
            </div>
          </div>

          {/* Controls hint - repositioned to top-right to avoid overlaps */}
          <div className="absolute top-20 right-4 bg-panel/95 backdrop-blur-md border-2 border-border rounded-lg p-3 text-xs shadow-2xl">
            <div className="font-bold text-text mb-2 text-sm">Controls</div>
            <div className="text-text">🖱️ Left: Rotate</div>
            <div className="text-text">🖱️ Right: Pan</div>
            <div className="text-text">🖱️ Scroll: Zoom</div>
            <div className="text-text">🖱️ Click: Details</div>
            
            {/* Performance toggle */}
            <div className="mt-3 pt-3 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  className="rounded"
                />
                <span className="text-text text-xs">Show IP Labels</span>
              </label>
              <div className="text-text-dim text-[10px] mt-1">
                ⚡ Disable for better performance
              </div>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="w-64 border-l border-border bg-panel p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="p-1 hover:bg-panel-hover rounded"
              >
                <X className="w-4 h-4 text-text" />
              </button>
            </div>

            {/* Node Type Filters */}
            <div className="mb-4">
              <div className="text-sm font-medium text-text mb-2">Node Types</div>
              <label className="flex items-center gap-2 mb-1">
                <input
                  type="checkbox"
                  checked={filters.showInternal}
                  onChange={(e) => setFilters({...filters, showInternal: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm text-text-dim">Internal</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.showExternal}
                  onChange={(e) => setFilters({...filters, showExternal: e.target.checked})}
                  className="rounded"
                />
                <span className="text-sm text-text-dim">External</span>
              </label>
            </div>
            
            {/* Room Boundaries Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showClusters}
                  onChange={(e) => setShowClusters(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-text">Show Boundaries</span>
              </label>
              <p className="text-xs text-text-dim mt-1 ml-6">
                {viewMode === 'semantic' && 'Visualize communication patterns'}
                {viewMode === 'physical' && 'Visualize subnet-based zones'}
                {viewMode === 'hybrid' && 'Show both semantic & physical layers'}
              </p>
            </div>

            {/* View Mode Info */}
            <div className="mb-4 p-3 bg-info/10 border border-info/30 rounded text-xs">
              <div className="font-medium text-info mb-1">
                {viewMode === 'semantic' && '💬 Semantic View'}
                {viewMode === 'physical' && '📍 Physical View'}
                {viewMode === 'hybrid' && '🔀 Hybrid View'}
              </div>
              <div className="text-text-dim">
                {viewMode === 'semantic' && 'Groups nodes by communication patterns (who talks to whom)'}
                {viewMode === 'physical' && 'Groups nodes by IP subnet (192.168.1.x, 10.0.0.x, etc.)'}
                {viewMode === 'hybrid' && 'Shows both communication clusters and physical subnets'}
              </div>
            </div>

            {/* Anomaly Score Filter */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text">Min Anomaly Score</span>
                <span className="text-xs text-text-dim">{filters.minAnomalyScore.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={filters.minAnomalyScore}
                onChange={(e) => setFilters({...filters, minAnomalyScore: parseFloat(e.target.value)})}
                className="w-full"
              />
            </div>

            {/* Traffic Volume Filter */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text">Min Traffic</span>
                <span className="text-xs text-text-dim">{formatBytes(filters.minTraffic)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000000"
                step="100000"
                value={filters.minTraffic}
                onChange={(e) => setFilters({...filters, minTraffic: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => setFilters({
                showInternal: true,
                showExternal: true,
                minAnomalyScore: 0,
                minTraffic: 0,
              })}
              className="w-full py-2 px-3 bg-panel-hover hover:bg-border text-sm text-text rounded transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="w-80 border-l border-border bg-panel p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-panel-hover rounded"
              >
                <X className="w-4 h-4 text-text" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-text-dim mb-1">IP Address</div>
                <div className="text-sm font-mono text-text break-all">
                  {selectedNode.ip}
                </div>
              </div>

              <div>
                <div className="text-xs text-text-dim mb-1">Type</div>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                  selectedNode.type === 'internal' 
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  {selectedNode.type === 'internal' ? 'Internal' : 'External'}
                </div>
              </div>

              {selectedNode.physical_room && (
                <div>
                  <div className="text-xs text-text-dim mb-1">Physical Room</div>
                  <div className="text-sm text-text bg-panel-hover px-2 py-1 rounded">
                    📍 {selectedNode.physical_room}
                  </div>
                </div>
              )}

              {selectedNode.lat !== undefined && selectedNode.lon !== undefined && (
                <div>
                  <div className="text-xs text-text-dim mb-1">Location</div>
                  <div className="text-sm text-text">
                    {selectedNode.lat.toFixed(2)}°, {selectedNode.lon.toFixed(2)}°
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-text-dim mb-1">Anomaly Score</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-panel-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        selectedNode.anomalyScore > 0.7 ? 'bg-red-500' :
                        selectedNode.anomalyScore > 0.4 ? 'bg-amber-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${selectedNode.anomalyScore * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-text font-mono">
                    {selectedNode.anomalyScore.toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-text-dim mb-1">Events</div>
                <div className="text-sm text-text">{selectedNode.eventCount}</div>
              </div>

              <div>
                <div className="text-xs text-text-dim mb-1">Total Traffic</div>
                <div className="text-sm text-text">{formatBytes(selectedNode.totalBytes)}</div>
              </div>

              {selectedNode.semanticVector && (
                <div>
                  <div className="text-xs text-text-dim mb-1">Semantic Vector</div>
                  <div className="text-xs font-mono text-text-dim break-all">
                    [{selectedNode.semanticVector.map(v => v.toFixed(3)).join(', ')}]
                  </div>
                </div>
              )}

              {selectedNode.anomalyScore > 0.5 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <div className="flex items-start gap-2">
                    <div className="text-red-400 text-xl">⚠️</div>
                    <div>
                      <div className="text-sm font-medium text-red-400 mb-1">
                        Suspicious Activity
                      </div>
                      <div className="text-xs text-text-dim">
                        This host has shown anomalous behavior. Review related events for details.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
