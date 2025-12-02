import { useMemo, useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { TrendingUp, ChevronUp, ChevronDown } from 'lucide-react';
import dayjs from 'dayjs';
import { useStore } from '../../context/store';
import { GRAPH_CONFIG } from '../../config/graph.config';
import type { AnomalyMarker } from '../../types';

interface DataPoint {
  timestamp: number;
  count: number;
  maxAnomalyScore: number;
}

interface GraphViewProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

const GraphView = ({ onCollapseChange }: GraphViewProps) => {
  const { events, focusMessage } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    onCollapseChange?.(newState);
  };
  
  // Use a ref to maintain history across renders without causing re-renders
  const historyRef = useRef<Map<number, DataPoint>>(new Map());
  
  // Update history when new events arrive
  useEffect(() => {
    if (events.length === 0) return;
    
    const now = Date.now();
    const cutoffTime = now - GRAPH_CONFIG.RETENTION_MS;
    
    // Process new events and update buckets
    events.forEach(event => {
      const timestamp = new Date(event.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / GRAPH_CONFIG.BUCKET_SIZE_MS) * GRAPH_CONFIG.BUCKET_SIZE_MS;
      
      // Skip old events
      if (bucketKey < cutoffTime) return;
      
      const existing = historyRef.current.get(bucketKey);
      
      if (!existing) {
        historyRef.current.set(bucketKey, {
          timestamp: bucketKey,
          count: event.flows,
          maxAnomalyScore: event.anomaly_score
        });
      } else {
        // Update existing bucket
        existing.count += event.flows;
        existing.maxAnomalyScore = Math.max(existing.maxAnomalyScore, event.anomaly_score);
      }
    });
    
    // Clean up old data points to save memory
    for (const [key, value] of historyRef.current.entries()) {
      if (value.timestamp < cutoffTime) {
        historyRef.current.delete(key);
      }
    }
    
    // Limit total data points (keep most recent)
    if (historyRef.current.size > GRAPH_CONFIG.MAX_POINTS) {
      const sorted = Array.from(historyRef.current.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      historyRef.current.clear();
      sorted.slice(0, GRAPH_CONFIG.MAX_POINTS).forEach(([key, value]) => {
        historyRef.current.set(key, value);
      });
    }
  }, [events]);
  
  // Prepare chart data from history
  const chartData = useMemo(() => {
    if (historyRef.current.size === 0) return [];
    
    return Array.from(historyRef.current.values())
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events]); // Re-compute when events change to trigger re-render
  
  // Identify anomaly markers from recent events
  const anomalyMarkers = useMemo((): AnomalyMarker[] => {
    return events
      .filter(e => e.anomaly_score >= GRAPH_CONFIG.ANOMALY_THRESHOLD)
      .slice(0, GRAPH_CONFIG.MAX_ANOMALY_MARKERS)
      .map(e => {
        const timestamp = new Date(e.timestamp).getTime();
        const bucketKey = Math.floor(timestamp / GRAPH_CONFIG.BUCKET_SIZE_MS) * GRAPH_CONFIG.BUCKET_SIZE_MS;
        
        // Find the corresponding data point
        const dataPoint = historyRef.current.get(bucketKey);
        
        const marker: AnomalyMarker = {
          timestamp: bucketKey,
          severity: e.anomaly_score >= GRAPH_CONFIG.CRITICAL_THRESHOLD ? 'critical' : 'warn',
          eventId: e.id,
          score: e.anomaly_score,
          yValue: dataPoint?.count || 0
        };
        return marker;
      })
      .filter(m => m.yValue! > 0); // Only show markers with valid y values
  }, [events]);

  const handleMarkerClick = (marker: AnomalyMarker) => {
    // Focus on related AI message if exists
    focusMessage(marker.eventId);
  };

  const formatXAxis = (timestamp: number) => {
    return dayjs(timestamp).format('HH:mm:ss');
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="panel p-3 border border-border shadow-lg">
          <p className="text-sm text-text-dim mb-1">
            {dayjs(data.timestamp).format('HH:mm:ss')}
          </p>
          <p className="text-sm font-semibold text-text">
            Flows: {data.count.toLocaleString()}
          </p>
          {data.maxAnomalyScore > 0 && (
            <p className="text-xs text-warn mt-1">
              Max anomaly: {(data.maxAnomalyScore * 100).toFixed(0)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate stats for display
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const totalFlows = chartData.reduce((sum, d) => sum + d.count, 0);
    const avgFlows = totalFlows / chartData.length;
    const maxFlows = Math.max(...chartData.map(d => d.count));
    const dataPoints = chartData.length;
    const timeSpanMin = (dataPoints * GRAPH_CONFIG.BUCKET_SIZE_MS) / 60000;
    
    return { totalFlows, avgFlows, maxFlows, dataPoints, timeSpanMin };
  }, [chartData]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Mini Graph - Collapsed State */}
      {isCollapsed ? (
        <div className="h-16 p-2 relative">
          {/* Expand button */}
          <button
            onClick={toggleCollapse}
            className="absolute top-2 right-2 p-1.5 text-text-dim hover:text-text bg-panel/80 hover:bg-panel border border-border rounded transition-colors z-20"
            title="Expand graph"
          >
            <ChevronDown className="w-4 h-4" />
          </button>

          {/* Mini chart */}
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-text-dim">Waiting for data...</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 2, right: 25, left: 25, bottom: 15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  stroke="#9CA3AF"
                  style={{ fontSize: '9px' }}
                  tickCount={3}
                  minTickGap={40}
                  height={15}
                />
                <YAxis
                  stroke="#9CA3AF"
                  style={{ fontSize: '9px' }}
                  tickCount={2}
                  width={20}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#38BDF8"
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                {/* Anomaly markers - mini version */}
                {anomalyMarkers.map((marker, idx) => (
                  <ReferenceDot
                    key={`${marker.eventId}-${idx}`}
                    x={marker.timestamp}
                    y={marker.yValue}
                    r={4}
                    fill={marker.severity === 'critical' ? '#EF4444' : '#F59E0B'}
                    stroke={marker.severity === 'critical' ? '#DC2626' : '#D97706'}
                    strokeWidth={1}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      ) : (
        /* Full Chart - Expanded State */
        <>
          <div className="flex-1 p-4 flex gap-4">
            {/* Legend */}
            <div className="flex flex-col gap-3 text-sm py-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-info rounded-full"></div>
                <span className="text-text-dim whitespace-nowrap">Flow Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-warn rounded-full"></div>
                <span className="text-text-dim whitespace-nowrap">Warning Anomaly</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-critical rounded-full"></div>
                <span className="text-text-dim whitespace-nowrap">Critical Anomaly</span>
              </div>
            </div>

            {/* Chart */}
            <div className="flex-1 relative">
              {/* Collapse button overlay */}
              <button
                onClick={toggleCollapse}
                className="absolute top-2 right-2 z-20 p-1.5 text-text-dim hover:text-text bg-panel/80 hover:bg-panel border border-border rounded transition-colors"
                title="Minimize graph"
              >
                <ChevronUp className="w-4 h-4" />
              </button>

              {chartData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-border border-t-info rounded-full animate-spin"></div>
                    <p className="text-text-dim">Waiting for network data...</p>
                    <p className="text-xs text-text-dim mt-1">Capture must be running</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                      minTickGap={30}
                    />
                    <YAxis
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Flows', angle: -90, position: 'insideLeft', style: { fill: '#9CA3AF' } }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                      isAnimationActive={false} // Disable animation for performance
                    />
                    
                    {/* Anomaly markers */}
                    {anomalyMarkers.map((marker, idx) => (
                      <ReferenceDot
                        key={`${marker.eventId}-${idx}`}
                        x={marker.timestamp}
                        y={marker.yValue}
                        r={8}
                        fill={marker.severity === 'critical' ? '#EF4444' : '#F59E0B'}
                        stroke={marker.severity === 'critical' ? '#DC2626' : '#D97706'}
                        strokeWidth={2}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleMarkerClick(marker)}
                        className="animate-pulse-slow"
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GraphView;
