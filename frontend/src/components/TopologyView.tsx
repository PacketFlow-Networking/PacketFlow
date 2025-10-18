import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useStore } from '../context/store';
import * as d3 from 'd3';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter, 
  Info,
  AlertTriangle,
  Activity,
  X,
  Pause,
  Play,
  Lock,
  Unlock
} from 'lucide-react';
import type { NetworkEvent } from '../types';

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
  value: number; // traffic volume
  anomalies: number;
  protocols: Set<string>;
}

export interface TopologyFilters {
  showInternal: boolean;
  showExternal: boolean;
  minAnomalyScore: number;
  minTraffic: number;
  selectedProtocols: Set<string>;
}

export default function TopologyView() {
  const { events } = useStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  const zoomBehaviorRef = useRef<any>(null);
  const nodePositionsRef = useRef<Map<string, {x: number, y: number}>>(new Map());
  
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [filters, setFilters] = useState<TopologyFilters>({
    showInternal: true,
    showExternal: true,
    minAnomalyScore: 0,
    minTraffic: 0,
    selectedProtocols: new Set(['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'])
  });

  // Build graph data from events
  const graphData = useMemo(() => {
    const nodeMap = new Map<string, TopologyNode>();
    const linkMap = new Map<string, TopologyLink>();

    // Helper to determine if IP is internal (RFC1918)
    const isInternal = (ip: string): boolean => {
      return (
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./i) !== null ||
        ip === 'localhost' ||
        ip.startsWith('127.')
      );
    };

    // Process events
    events.forEach(event => {
      // Skip if protocol not in filter
      if (!filters.selectedProtocols.has(event.proto)) return;

      // Process source node
      if (!nodeMap.has(event.src)) {
        const savedPos = nodePositionsRef.current.get(event.src);
        nodeMap.set(event.src, {
          id: event.src,
          label: event.src,
          type: isInternal(event.src) ? 'internal' : 'external',
          anomalyScore: 0,
          eventCount: 0,
          totalBytes: 0,
          x: savedPos?.x,
          y: savedPos?.y
        });
      }
      const srcNode = nodeMap.get(event.src)!;
      srcNode.anomalyScore = Math.max(srcNode.anomalyScore, event.anomaly_score);
      srcNode.eventCount++;
      srcNode.totalBytes += (event.avg_size || 0) * event.flows;

      // Process destination node
      if (!nodeMap.has(event.dst)) {
        const savedPos = nodePositionsRef.current.get(event.dst);
        nodeMap.set(event.dst, {
          id: event.dst,
          label: event.dst,
          type: isInternal(event.dst) ? 'internal' : 'external',
          anomalyScore: 0,
          eventCount: 0,
          totalBytes: 0,
          x: savedPos?.x,
          y: savedPos?.y
        });
      }
      const dstNode = nodeMap.get(event.dst)!;
      dstNode.anomalyScore = Math.max(dstNode.anomalyScore, event.anomaly_score);
      dstNode.eventCount++;
      dstNode.totalBytes += (event.avg_size || 0) * event.flows;

      // Process link
      const linkKey = `${event.src}-${event.dst}`;
      if (!linkMap.has(linkKey)) {
        linkMap.set(linkKey, {
          source: event.src,
          target: event.dst,
          value: 0,
          anomalies: 0,
          protocols: new Set()
        });
      }
      const link = linkMap.get(linkKey)!;
      link.value += event.flows;
      if (event.anomaly_score > 0.5) link.anomalies++;
      link.protocols.add(event.proto);
    });

    // Apply filters
    const nodes = Array.from(nodeMap.values()).filter(node => {
      if (node.type === 'internal' && !filters.showInternal) return false;
      if (node.type === 'external' && !filters.showExternal) return false;
      if (node.anomalyScore < filters.minAnomalyScore) return false;
      if (node.totalBytes < filters.minTraffic) return false;
      return true;
    });

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = Array.from(linkMap.values()).filter(link => {
      const srcId = typeof link.source === 'string' ? link.source : link.source.id;
      const dstId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(srcId) && nodeIds.has(dstId);
    });

    return { nodes, links };
  }, [events, filters]);

  // Initialize D3 visualization
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (graphData.nodes.length === 0) {
      // Clear if no data
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      d3.select(svgRef.current).selectAll('*').remove();
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    
    // Only create zoom once
    if (!zoomBehaviorRef.current) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          if (gRef.current) {
            d3.select(gRef.current).attr('transform', event.transform);
          }
        });
      
      svg.call(zoom);
      zoomBehaviorRef.current = zoom;
    }

    // Clear only if this is first render or significant change
    const isFirstRender = !gRef.current;
    if (isFirstRender) {
      svg.selectAll('*').remove();
      svg.attr('width', width).attr('height', height);
      
      const g = svg.append('g');
      gRef.current = g.node();
      
      // Define arrow markers
      const defs = svg.append('defs');
      
      defs.append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#64748b');

      defs.append('marker')
        .attr('id', 'arrow-anomaly')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 20)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#ef4444');
    }

    const g = d3.select(gRef.current!);

    // Update or create simulation
    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation(graphData.nodes as any)
        .force('link', d3.forceLink(graphData.links)
          .id((d: any) => d.id)
          .distance(100))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30))
        .alphaDecay(0.05) // Faster decay to settle quickly
        .alphaMin(0.001) // Stop earlier
        .velocityDecay(0.4); // More friction
    } else {
      // Update simulation with new data
      simulationRef.current.nodes(graphData.nodes as any);
      const linkForce = simulationRef.current.force('link') as d3.ForceLink<any, any>;
      if (linkForce) {
        linkForce.links(graphData.links);
      }
      // Only restart with very low alpha for minor adjustments
      simulationRef.current.alpha(0.1).restart();
    }

    const simulation = simulationRef.current;

    // Drag behavior
    const drag = d3.drag<SVGGElement, any>()
      .on('start', (event) => {
        if (!event.active) simulation.alphaTarget(0.1).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      })
      .on('drag', (event) => {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        // Save position
        nodePositionsRef.current.set(event.subject.id, { x: event.x, y: event.y });
      })
      .on('end', (event) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep node pinned after drag
        event.subject.fx = event.x;
        event.subject.fy = event.y;
        // Save final position
        nodePositionsRef.current.set(event.subject.id, { x: event.x, y: event.y });
      });

    // Update links
    const link = g.selectAll<SVGLineElement, any>('line')
      .data(graphData.links, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)
      .join(
        enter => enter.append('line')
          .attr('stroke', (d: any) => d.anomalies > 0 ? '#ef4444' : '#64748b')
          .attr('stroke-width', (d: any) => Math.min(Math.sqrt(d.value) / 2, 5))
          .attr('stroke-opacity', 0.6)
          .attr('marker-end', (d: any) => d.anomalies > 0 ? 'url(#arrow-anomaly)' : 'url(#arrow)'),
        update => update
          .attr('stroke', (d: any) => d.anomalies > 0 ? '#ef4444' : '#64748b')
          .attr('stroke-width', (d: any) => Math.min(Math.sqrt(d.value) / 2, 5))
          .attr('marker-end', (d: any) => d.anomalies > 0 ? 'url(#arrow-anomaly)' : 'url(#arrow)')
      );

    // Update nodes
    const node = g.selectAll<SVGGElement, TopologyNode>('g.node')
      .data(graphData.nodes, (d: TopologyNode) => d.id)
      .join(
        enter => {
          const nodeGroup = enter.append('g')
            .attr('class', 'node')
            .call(drag);

          nodeGroup.append('circle')
            .attr('r', (d: any) => 8 + Math.sqrt(d.eventCount) * 2)
            .attr('fill', (d: any) => {
              if (d.anomalyScore > 0.7) return '#ef4444';
              if (d.anomalyScore > 0.4) return '#f59e0b';
              return d.type === 'internal' ? '#3b82f6' : '#10b981';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .attr('cursor', 'pointer')
            .on('click', (_event: any, d: any) => {
              setSelectedNode(d);
            });

          // Full IP label
          nodeGroup.append('text')
            .text((d: any) => d.label)
            .attr('x', 0)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .attr('fill', '#e2e8f0')
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .attr('pointer-events', 'none');

          return nodeGroup;
        },
        update => {
          update.select('circle')
            .attr('r', (d: any) => 8 + Math.sqrt(d.eventCount) * 2)
            .attr('fill', (d: any) => {
              if (d.anomalyScore > 0.7) return '#ef4444';
              if (d.anomalyScore > 0.4) return '#f59e0b';
              return d.type === 'internal' ? '#3b82f6' : '#10b981';
            });
          return update;
        }
      );

    // Add/update anomaly indicators
    node.selectAll('circle.anomaly-indicator').remove();
    node.filter((d: any) => d.anomalyScore > 0.5)
      .append('circle')
      .attr('class', 'anomaly-indicator')
      .attr('r', 4)
      .attr('cx', 10)
      .attr('cy', -10)
      .attr('fill', '#ef4444')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => {
        // Save positions
        nodePositionsRef.current.set(d.id, { x: d.x, y: d.y });
        return `translate(${d.x},${d.y})`;
      });
    });

    // Auto-stop when settled
    simulation.on('end', () => {
      console.log('Simulation settled');
    });

    // Pause/resume or lock
    if (isPaused || isLocked) {
      simulation.stop();
    }

    // If locked, pin all nodes
    if (isLocked) {
      graphData.nodes.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });
    }

    return () => {
      // Don't stop simulation on cleanup, let it continue
    };
  }, [graphData, isPaused, isLocked]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      1.3
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(
      zoomBehaviorRef.current.scaleBy,
      1 / 1.3
    );
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).call(
      zoomBehaviorRef.current.transform,
      d3.zoomIdentity
    );
  }, []);

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }, []);

  return (
    <div className="h-full flex flex-col bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-panel">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-info" />
          <h2 className="text-lg font-semibold text-text">Network Topology</h2>
          <span className="text-xs text-text-dim">
            {graphData.nodes.length} nodes, {graphData.links.length} connections
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Lock/Unlock */}
          <button
            onClick={() => {
              setIsLocked(!isLocked);
              if (!isLocked) {
                setIsPaused(false); // Unlock also unpauses
              }
            }}
            className={`p-2 rounded transition-colors ${
              isLocked ? 'bg-warn/20 text-warn' : 'hover:bg-panel-hover text-text'
            }`}
            title={isLocked ? "Unlock Layout (Allow Movement)" : "Lock Layout (Freeze Positions)"}
          >
            {isLocked ? (
              <Lock className="w-4 h-4" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
          </button>

          {/* Pause/Play */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-panel-hover rounded transition-colors"
            title={isPaused ? "Resume Animation" : "Pause Animation"}
            disabled={isLocked}
          >
            {isPaused ? (
              <Play className="w-4 h-4 text-text" />
            ) : (
              <Pause className="w-4 h-4 text-text" />
            )}
          </button>

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-panel-hover rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-text" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-panel-hover rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-text" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-panel-hover rounded transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-4 h-4 text-text" />
          </button>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded transition-colors ${
              showFilters ? 'bg-info text-base' : 'hover:bg-panel-hover text-text'
            }`}
            title="Toggle Filters"
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Main graph */}
        <div ref={containerRef} className="flex-1 relative">
          <svg ref={svgRef} className="w-full h-full" />

          {graphData.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-text-dim">
                <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No network data to display</p>
                <p className="text-sm mt-1">
                  Adjust filters or wait for events
                </p>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-panel border border-border rounded p-3 text-xs">
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

            {/* Protocol Filter */}
            <div className="mb-4">
              <div className="text-sm font-medium text-text mb-2">Protocols</div>
              {['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'].map(proto => (
                <label key={proto} className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={filters.selectedProtocols.has(proto)}
                    onChange={(e) => {
                      const newSet = new Set(filters.selectedProtocols);
                      if (e.target.checked) {
                        newSet.add(proto);
                      } else {
                        newSet.delete(proto);
                      }
                      setFilters({...filters, selectedProtocols: newSet});
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-text-dim">{proto}</span>
                </label>
              ))}
            </div>

            {/* Reset Filters */}
            <button
              onClick={() => setFilters({
                showInternal: true,
                showExternal: true,
                minAnomalyScore: 0,
                minTraffic: 0,
                selectedProtocols: new Set(['TCP', 'UDP', 'ICMP', 'HTTP', 'HTTPS', 'DNS'])
              })}
              className="w-full py-2 px-3 bg-panel-hover hover:bg-border text-sm text-text rounded transition-colors"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Node Details Panel */}
        {selectedNode && (
          <div className="w-64 border-l border-border bg-panel p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text">Node Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-panel-hover rounded"
              >
                <X className="w-4 h-4 text-text" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-xs text-text-dim mb-1">IP Address</div>
                <div className="text-sm font-mono text-text break-all">
                  {selectedNode.label}
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

              {selectedNode.anomalyScore > 0.5 && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
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
