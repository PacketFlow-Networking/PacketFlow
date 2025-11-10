import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, Line } from '@react-three/drei';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Activity, Filter, X } from 'lucide-react';
import * as THREE from 'three';

interface Node3D {
  id: string;
  ip: string;
  type: 'internal' | 'external';
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

interface TopologyFilters {
  showInternal: boolean;
  showExternal: boolean;
  minAnomalyScore: number;
  minTraffic: number;
}

function NetworkNode({ node, onClick }: { node: Node3D; onClick: () => void }) {
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
        <sphereGeometry args={[size, 16, 16]} />
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
          <sphereGeometry args={[2, 8, 8]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      )}
      <Html center distanceFactor={15} style={{ pointerEvents: 'none' }}>
        <div className="text-white text-[10px] font-mono whitespace-nowrap bg-black/50 px-1 rounded">
          {node.ip}
        </div>
      </Html>
    </group>
  );
}

function NetworkLink({ link }: { link: Link3D }) {
  const source = typeof link.source === 'string' ? { x: 0, y: 0, z: 0 } : link.source;
  const target = typeof link.target === 'string' ? { x: 0, y: 0, z: 0 } : link.target;

  const points = useMemo(() => [
    new THREE.Vector3(source.x || 0, source.y || 0, source.z || 0),
    new THREE.Vector3(target.x || 0, target.y || 0, target.z || 0),
  ], [source.x, source.y, source.z, target.x, target.y, target.z]);

  const color = link.anomalies > 0 ? '#ef4444' : '#64748b';
  const opacity = link.anomalies > 0 ? 0.8 : 0.4;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      opacity={opacity}
      transparent
    />
  );
}

export default function ThreeDTopologyView() {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<Node3D | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filters, setFilters] = useState<TopologyFilters>({
    showInternal: true,
    showExternal: true,
    minAnomalyScore: 0,
    minTraffic: 0,
  });

  // Fetch data from backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch('http://localhost:8000/api/network_graph');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.nodes && data.links) {
          // Run force simulation to calculate positions
          const processedData = await runSimulation(data.nodes, data.links);
          setGraphData(processedData);
        } else {
          throw new Error('Invalid data format from server');
        }
      } catch (err) {
        console.error('Failed to fetch network graph:', err);
        setError(err instanceof Error ? err.message : 'Failed to load network data');
        // Set empty data on error
        setGraphData({ nodes: [], links: [] });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Run 3D force simulation
  const runSimulation = async (nodes: Node3D[], links: Link3D[]): Promise<GraphData> => {
    return new Promise((resolve) => {
      // Create a simple force simulation
      const width = 800, height = 600, depth = 600;
      
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
          // Random initial position for internal nodes
          node.x = (Math.random() - 0.5) * width;
          node.y = (Math.random() - 0.5) * height;
          node.z = (Math.random() - 0.5) * depth;
        }
      });

      // Simple attraction/repulsion simulation
      for (let i = 0; i < 100; i++) {
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-panel">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-info" />
          <h1 className="text-xl font-bold text-text">3D Network Topology</h1>
          <span className="text-sm text-text-dim">
            {filteredData.nodes.length} nodes, {filteredData.links.length} connections
          </span>
        </div>

        <div className="flex items-center gap-2">
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
            <Canvas camera={{ position: [0, 0, 500], fov: 75 }}>
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

              {/* Render nodes */}
              {filteredData.nodes.map((node) => (
                <NetworkNode
                  key={node.id}
                  node={node}
                  onClick={() => setSelectedNode(node)}
                />
              ))}
            </Canvas>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-panel/90 backdrop-blur-sm border border-border rounded-lg p-4 text-xs">
            <div className="font-semibold text-text mb-3">Legend</div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <span className="text-text-dim">Internal Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-text-dim">External Host</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <span className="text-text-dim">Warning (0.4-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-text-dim">Critical (&gt;0.7)</span>
              </div>
            </div>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-4 right-4 bg-panel/90 backdrop-blur-sm border border-border rounded-lg p-3 text-xs text-text-dim">
            <div className="font-semibold mb-2">Controls</div>
            <div>🖱️ Left drag: Rotate</div>
            <div>🖱️ Right drag: Pan</div>
            <div>🖱️ Scroll: Zoom</div>
            <div>🖱️ Click node: Details</div>
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
