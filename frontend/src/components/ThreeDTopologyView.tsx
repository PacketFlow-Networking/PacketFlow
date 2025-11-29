import { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../context/store';
import { GRAPH_CONFIG } from '../config/graph.config';
import { Layers, ZoomIn, ZoomOut, Maximize2, Filter, Info, Lock, Unlock, Pause, Play, X } from 'lucide-react';
import type { NetworkEvent } from '../types';

interface Node3D {
  id: string;
  ip: string;
  label?: string;
  position: [number, number, number];
  anomalyScore: number;
  eventCount: number;
  type: 'internal' | 'external';
  cluster?: number;
  physicalRoom?: string;
}

interface Cluster3D {
  id: number;
  nodes: Node3D[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  color: string;
}

interface PhysicalRoom3D {
  name: string;
  nodes: Node3D[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  color: string;
}

type ViewMode3D = 'semantic' | 'physical' | 'hybrid';

function detectClusters3D(nodes: Node3D[]): Cluster3D[] {
  const internalNodes = nodes.filter(n => n.type === 'internal');
  const externalNodes = nodes.filter(n => n.type === 'external');
  
  const adjacency: Map<string, Set<string>> = new Map();
  internalNodes.forEach(node => {
    adjacency.set(node.id, new Set());
  });

  // Build adjacency from event patterns (simplified)
  internalNodes.forEach((node, idx) => {
    if (idx < internalNodes.length - 1) {
      const neighbors = internalNodes.slice(Math.max(0, idx - 2), Math.min(internalNodes.length, idx + 3));
      neighbors.forEach(neighbor => {
        if (neighbor.id !== node.id) {
          adjacency.get(node.id)?.add(neighbor.id);
        }
      });
    }
  });

  const nodeClusterMap = new Map<string, number>();
  let currentCluster = 0;

  const assignCluster = (nodeId: string, clusterId: number) => {
    if (nodeClusterMap.has(nodeId)) return;
    nodeClusterMap.set(nodeId, clusterId);
    
    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      neighbors.forEach(neighborId => {
        if (!nodeClusterMap.has(neighborId)) {
          assignCluster(neighborId, clusterId);
        }
      });
    }
  };

  internalNodes.forEach(node => {
    if (!nodeClusterMap.has(node.id)) {
      assignCluster(node.id, currentCluster++);
    }
  });

  externalNodes.forEach(node => {
    nodeClusterMap.set(node.id, 9999);
  });

  nodes.forEach(node => {
    node.cluster = nodeClusterMap.get(node.id) || 0;
  });

  const clusterMap = new Map<number, Node3D[]>();
  nodes.forEach(node => {
    const cId = node.cluster || 0;
    if (!clusterMap.has(cId)) clusterMap.set(cId, []);
    clusterMap.get(cId)!.push(node);
  });

  const clusterColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
  ];

  const clusters: Cluster3D[] = [];
  clusterMap.forEach((clusterNodes, clusterId) => {
    if (clusterNodes.length === 0) return;

    const xs = clusterNodes.map(n => n.position[0]);
    const ys = clusterNodes.map(n => n.position[1]);
    const zs = clusterNodes.map(n => n.position[2]);

    const padding = 30;
    clusters.push({
      id: clusterId,
      nodes: clusterNodes,
      bounds: {
        minX: Math.min(...xs) - padding,
        maxX: Math.max(...xs) + padding,
        minY: Math.min(...ys) - padding,
        maxY: Math.max(...ys) + padding,
        minZ: Math.min(...zs) - padding,
        maxZ: Math.max(...zs) + padding,
      },
      color: clusterId === 9999 ? '#64748b' : clusterColors[clusterId % clusterColors.length],
    });
  });

  return clusters;
}

function detectPhysicalRooms3D(nodes: Node3D[]): PhysicalRoom3D[] {
  const roomMap = new Map<string, Node3D[]>();

  const getSubnet = (ip: string): string => {
    const parts = ip.split('.');
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
    return 'Unknown';
  };

  nodes.filter(n => n.type === 'internal').forEach(node => {
    const subnet = getSubnet(node.ip);
    node.physicalRoom = subnet;

    if (!roomMap.has(subnet)) {
      roomMap.set(subnet, []);
    }
    roomMap.get(subnet)!.push(node);
  });

  const roomColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  ];

  const rooms: PhysicalRoom3D[] = [];
  let colorIndex = 0;

  roomMap.forEach((roomNodes, roomName) => {
    if (roomNodes.length === 0) return;

    const xs = roomNodes.map(n => n.position[0]);
    const ys = roomNodes.map(n => n.position[1]);
    const zs = roomNodes.map(n => n.position[2]);

    const padding = 40;
    rooms.push({
      name: roomName,
      nodes: roomNodes,
      bounds: {
        minX: Math.min(...xs) - padding,
        maxX: Math.max(...xs) + padding,
        minY: Math.min(...ys) - padding,
        maxY: Math.max(...ys) + padding,
        minZ: Math.min(...zs) - padding,
        maxZ: Math.max(...zs) + padding,
      },
      color: roomColors[colorIndex % roomColors.length],
    });

    colorIndex++;
  });

  return rooms;
}

function WireframeBox({ bounds, color, opacity = 0.2 }: { bounds: any; color: string; opacity?: number }) {
  const geometry = new THREE.BoxGeometry(
    bounds.maxX - bounds.minX,
    bounds.maxY - bounds.minY,
    bounds.maxZ - bounds.minZ
  );
  
  const material = new THREE.LineBasicMaterial({ 
    color: new THREE.Color(color),
    transparent: true,
    opacity: opacity,
    linewidth: 2
  });

  const wireframe = new THREE.EdgesGeometry(geometry);
  const line = new THREE.LineSegments(wireframe, material);

  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;

  return (
    <group position={[centerX, centerY, centerZ]}>
      <primitive object={line} />
    </group>
  );
}

function NetworkNode({ node }: { node: Node3D }) {
  const isAnomalous = node.anomalyScore > GRAPH_CONFIG.ANOMALY_THRESHOLD;
  const color = isAnomalous
    ? node.anomalyScore > GRAPH_CONFIG.CRITICAL_THRESHOLD
      ? new THREE.Color('#ef4444')
      : new THREE.Color('#f59e0b')
    : node.type === 'internal'
    ? new THREE.Color('#3b82f6')
    : new THREE.Color('#10b981');

  const size = Math.max(2, Math.min(8, 2 + (node.eventCount / 50) * 2));

  return (
    <group position={node.position}>
      <mesh>
        <sphereGeometry args={[size, 16, 16]} />
        <meshPhongMaterial
          color={color}
          emissive={isAnomalous ? color : new THREE.Color(0x000000)}
          emissiveIntensity={isAnomalous ? 0.5 : 0}
        />
      </mesh>
      {isAnomalous && (
        <mesh position={[0, size + 1, 0]}>
          <sphereGeometry args={[0.8, 8, 8]} />
          <meshPhongMaterial color={new THREE.Color('#ef4444')} emissive={new THREE.Color('#ef4444')} emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function NetworkScene({ viewMode, showBoundaries }: { viewMode: ViewMode3D; showBoundaries: boolean }) {
  const { events } = useStore();
  const [nodes, setNodes] = useState<Node3D[]>([]);
  const [clusters, setClusters] = useState<Cluster3D[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom3D[]>([]);
  const [links, setLinks] = useState<Array<{ src: Node3D; dst: Node3D; count: number }>>([]);
  const lineGroupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef<Map<string, { vx: number; vy: number; vz: number }>>(new Map());

  useEffect(() => {
    const nodeMap = new Map<string, Node3D>();

    const isInternal = (ip: string): boolean => {
      return (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./i) !== null
      );
    };

    events.slice(0, 100).forEach((event, idx) => {
      if (!nodeMap.has(event.src)) {
        nodeMap.set(event.src, {
          id: event.src,
          ip: event.src,
          label: event.src.split('.').pop() || event.src,
          position: [(idx % 10) * 50 - 225, Math.random() * 200 - 100, (Math.floor(idx / 10)) * 50 - 150] as [number, number, number],
          anomalyScore: event.anomaly_score || 0,
          eventCount: 1,
          type: isInternal(event.src) ? 'internal' : 'external'
        });
      }

      if (!nodeMap.has(event.dst)) {
        nodeMap.set(event.dst, {
          id: event.dst,
          ip: event.dst,
          label: event.dst.split('.').pop() || event.dst,
          position: [(idx % 10) * 50 - 225, Math.random() * 200 - 100, (Math.floor(idx / 10)) * 50 - 150] as [number, number, number],
          anomalyScore: event.anomaly_score || 0,
          eventCount: 1,
          type: isInternal(event.dst) ? 'internal' : 'external'
        });
      }

      const srcNode = nodeMap.get(event.src)!;
      const dstNode = nodeMap.get(event.dst)!;
      srcNode.anomalyScore = Math.max(srcNode.anomalyScore, event.anomaly_score || 0);
      dstNode.anomalyScore = Math.max(dstNode.anomalyScore, event.anomaly_score || 0);
      srcNode.eventCount++;
      dstNode.eventCount++;
    });

    const nodeList = Array.from(nodeMap.values());
    setNodes(nodeList);

    // Detect clusters and rooms
    const detectedClusters = detectClusters3D(nodeList);
    setClusters(detectedClusters);

    const detectedRooms = detectPhysicalRooms3D(nodeList);
    setRooms(detectedRooms);

    // Build links
    const connectionMap = new Map<string, number>();
    events.slice(0, 50).forEach(event => {
      const key = `${event.src}-${event.dst}`;
      connectionMap.set(key, (connectionMap.get(key) || 0) + 1);
    });

    const linkList = Array.from(connectionMap.entries()).map(([key, count]) => {
      const [src, dst] = key.split('-');
      const srcNode = nodeList.find(n => n.id === src);
      const dstNode = nodeList.find(n => n.id === dst);
      return srcNode && dstNode ? { src: srcNode, dst: dstNode, count } : null;
    }).filter((l): l is any => l !== null);

    setLinks(linkList);
  }, [events]);

  // Draw lines for connections
  useEffect(() => {
    if (lineGroupRef.current) {
      lineGroupRef.current.clear();

      links.forEach((link, idx) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          'position',
          new THREE.BufferAttribute(
            new Float32Array([
              link.src.position[0],
              link.src.position[1],
              link.src.position[2],
              link.dst.position[0],
              link.dst.position[1],
              link.dst.position[2]
            ]),
            3
          )
        );

        const material = new THREE.LineBasicMaterial({
          color: new THREE.Color(link.count > 5 ? '#ef4444' : '#64748b'),
          transparent: true,
          opacity: link.count > 5 ? 0.6 : 0.2,
          linewidth: 1
        });

        const line = new THREE.Line(geometry, material);
        lineGroupRef.current?.add(line);
      });
    }
  }, [links]);

  return (
    <group>
      <group ref={lineGroupRef} />
      
      {/* Render cluster boundaries in semantic or hybrid mode */}
      {showBoundaries && (viewMode === 'semantic' || viewMode === 'hybrid') &&
        clusters.map((cluster) => (
          <WireframeBox
            key={`cluster-${cluster.id}`}
            bounds={cluster.bounds}
            color={cluster.color}
            opacity={0.15}
          />
        ))
      }

      {/* Render room boundaries in physical or hybrid mode */}
      {showBoundaries && (viewMode === 'physical' || viewMode === 'hybrid') &&
        rooms.map((room, idx) => (
          <WireframeBox
            key={`room-${idx}`}
            bounds={room.bounds}
            color={room.color}
            opacity={0.1}
          />
        ))
      }

      {nodes.map(node => (
        <NetworkNode key={node.id} node={node} />
      ))}
    </group>
  );
}

export default function ThreeDTopologyView() {
  const { events } = useStore();
  const [viewMode, setViewMode] = useState<ViewMode3D>('hybrid');
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);

  return (
    <div className="w-full h-full flex flex-col bg-base">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text">3D Network Topology</h2>
          <span className="text-xs text-text-dim">({events.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`p-2 rounded transition-colors ${
              isLocked ? 'bg-warn/20 text-warn' : 'hover:bg-panel-hover text-text'
            }`}
            title={isLocked ? "Unlock Layout" : "Lock Layout"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-panel-hover rounded transition-colors"
            title={isPaused ? "Resume" : "Pause"}
            disabled={isLocked}
          >
            {isPaused ? <Play className="w-4 h-4 text-text" /> : <Pause className="w-4 h-4 text-text" />}
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded transition-colors ${
              showFilters ? 'bg-info text-base' : 'hover:bg-panel-hover text-text'
            }`}
            title="Toggle Options"
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowBoundaries(!showBoundaries)}
            className={`p-2 rounded transition-colors ${
              showBoundaries ? 'bg-info text-base' : 'hover:bg-panel-hover text-text'
            }`}
            title="Toggle Boundaries"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 bg-panel/50 px-3 py-2 border border-border rounded-lg">
          <span className="text-xs font-medium text-text-dim">View:</span>
          <button
            onClick={() => setViewMode('semantic')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'semantic' ? 'bg-info text-base font-medium' : 'text-text-dim hover:bg-panel-hover hover:text-text'
            }`}
          >
            Logical
          </button>
          <button
            onClick={() => setViewMode('physical')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'physical' ? 'bg-info text-base font-medium' : 'text-text-dim hover:bg-panel-hover hover:text-text'
            }`}
          >
            Physical
          </button>
          <button
            onClick={() => setViewMode('hybrid')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              viewMode === 'hybrid' ? 'bg-info text-base font-medium' : 'text-text-dim hover:bg-panel-hover hover:text-text'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {/* Main canvas area */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 relative">
          <Canvas camera={{ position: [0, 0, 400], near: 0.1, far: 10000 }} gl={{ antialias: true }}>
            <PerspectiveCamera makeDefault position={[0, 0, 400]} fov={75} />
            <OrbitControls autoRotate={false} />

            <ambientLight intensity={0.6} />
            <pointLight position={[100, 100, 100]} intensity={1} />
            <pointLight position={[-100, -100, -100]} intensity={0.5} />

            <NetworkScene 
              viewMode={viewMode} 
              showBoundaries={showBoundaries}
            />
            <gridHelper args={[1000, 50]} />
          </Canvas>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-panel border border-border rounded p-3 text-xs max-w-xs pointer-events-none">
            <div className="font-semibold text-text mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-text-dim">Internal Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-text-dim">External Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-text-dim">Warning (0.4-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-text-dim">Critical (&gt;0.7)</span>
              </div>
            </div>
          </div>

          {/* Info panel */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-text-dim max-w-xs pointer-events-none">
            <p className="font-semibold text-text mb-2">3D Controls</p>
            <p>🖱️ Drag to orbit • 🔄 Scroll to zoom • Double-click to reset</p>
          </div>
        </div>

        {/* Options panel */}
        {showFilters && (
          <div className="w-64 border-l border-border bg-panel p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Options</h3>
              <button onClick={() => setShowFilters(false)} className="p-1 hover:bg-panel-hover rounded">
                <X className="w-4 h-4 text-text" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showBoundaries}
                    onChange={(e) => setShowBoundaries(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-xs text-text">Show Boundaries</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPaused}
                    onChange={(e) => setIsPaused(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-xs text-text">Pause Simulation</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isLocked}
                    onChange={(e) => setIsLocked(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-xs text-text">Lock Positions</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
