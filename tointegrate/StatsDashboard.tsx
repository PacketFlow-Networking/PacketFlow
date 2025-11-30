import { useMemo, useCallback } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Network, Shield, Activity, Clock } from 'lucide-react';
import { useStore } from '../context/store';

const StatsDashboard = () => {
  const { events } = useStore();

  // Helper functions - defined before useMemo
  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  const formatTimeLabel = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  // Helper function to identify application protocol from port
  const identifyApplicationProtocol = useCallback((proto: string, srcPort?: number, dstPort?: number): string => {
    // Use the lower port number as it's typically the service port
    const port = srcPort && dstPort ? Math.min(srcPort, dstPort) : (srcPort || dstPort || 0);
    
    // Well-known port mappings
    const portMap: Record<number, string> = {
      20: 'FTP-Data',
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      67: 'DHCP',
      68: 'DHCP',
      69: 'TFTP',
      80: 'HTTP',
      110: 'POP3',
      123: 'NTP',
      143: 'IMAP',
      161: 'SNMP',
      162: 'SNMP-Trap',
      389: 'LDAP',
      443: 'HTTPS',
      445: 'SMB',
      465: 'SMTPS',
      514: 'Syslog',
      587: 'SMTP-Submission',
      636: 'LDAPS',
      993: 'IMAPS',
      995: 'POP3S',
      1433: 'MSSQL',
      1521: 'Oracle',
      3306: 'MySQL',
      3389: 'RDP',
      5432: 'PostgreSQL',
      5900: 'VNC',
      6379: 'Redis',
      8080: 'HTTP-Alt',
      8443: 'HTTPS-Alt',
      9200: 'Elasticsearch',
      27017: 'MongoDB',
    };

    if (port && portMap[port]) {
      return portMap[port];
    }

    // If no specific application identified, return transport protocol
    return proto.toUpperCase();
  }, []);

  // Calculate statistics
  const stats = useMemo(() => {
    if (events.length === 0) {
      return {
        topTalkersByPackets: [],
        topTalkersByBytes: [],
        protocolDistribution: [],
        applicationProtocolDistribution: [],
        anomalyRate: [],
        detectionMethods: [],
        totalEvents: 0,
        totalAnomalies: 0,
        avgAnomalyScore: 0,
      };
    }

    // Top talkers by packets
    const packetsByIP: Record<string, number> = {};
    events.forEach(event => {
      packetsByIP[event.src] = (packetsByIP[event.src] || 0) + event.flows;
      packetsByIP[event.dst] = (packetsByIP[event.dst] || 0) + event.flows;
    });
    const topTalkersByPackets = Object.entries(packetsByIP)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, packets]) => ({ ip, packets }));

    // Top talkers by bytes
    const bytesByIP: Record<string, number> = {};
    events.forEach(event => {
      const bytes = event.throughput || 0;
      bytesByIP[event.src] = (bytesByIP[event.src] || 0) + bytes;
      bytesByIP[event.dst] = (bytesByIP[event.dst] || 0) + bytes;
    });
    const topTalkersByBytes = Object.entries(bytesByIP)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, bytes]) => ({ 
        ip, 
        bytes,
        bytesFormatted: formatBytes(bytes)
      }));

    // Transport layer protocol distribution (TCP, UDP, etc.)
    const protocolCounts: Record<string, number> = {};
    events.forEach(event => {
      protocolCounts[event.proto] = (protocolCounts[event.proto] || 0) + 1;
    });
    const protocolDistribution = Object.entries(protocolCounts)
      .map(([protocol, count]) => ({ protocol, count }))
      .sort((a, b) => b.count - a.count);

    // Application layer protocol distribution (DNS, HTTP, IMAP, etc.)
    const appProtocolCounts: Record<string, number> = {};
    events.forEach(event => {
      const appProto = identifyApplicationProtocol(event.proto, event.src_port, event.dst_port);
      appProtocolCounts[appProto] = (appProtocolCounts[appProto] || 0) + 1;
    });
    const applicationProtocolDistribution = Object.entries(appProtocolCounts)
      .map(([protocol, count]) => ({ protocol, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 application protocols

    // Anomaly rate over time (last 10 time buckets)
    const bucketSize = 5 * 60 * 1000; // 5 minutes
    const buckets: Record<number, { total: number; anomalies: number }> = {};
    
    events.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const bucketKey = Math.floor(eventTime / bucketSize);
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { total: 0, anomalies: 0 };
      }
      
      buckets[bucketKey].total += 1;
      if (event.anomaly_score > 0.3) {
        buckets[bucketKey].anomalies += 1;
      }
    });

    const anomalyRate = Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .slice(-10)
      .map(([bucket, data]) => ({
        time: formatTimeLabel(Number(bucket) * bucketSize),
        rate: (data.anomalies / data.total) * 100,
        anomalies: data.anomalies,
        total: data.total,
      }));

    // Detection methods
    const methodCounts: Record<string, number> = {};
    events.forEach(event => {
      if (event.detection_methods) {
        event.detection_methods.forEach(method => {
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        });
      }
    });
    const detectionMethods = Object.entries(methodCounts)
      .map(([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);

    // Summary stats
    const anomalies = events.filter(e => e.anomaly_score > 0.3);
    const avgAnomalyScore = anomalies.length > 0
      ? anomalies.reduce((sum, e) => sum + e.anomaly_score, 0) / anomalies.length
      : 0;

    return {
      topTalkersByPackets,
      topTalkersByBytes,
      protocolDistribution,
      applicationProtocolDistribution,
      anomalyRate,
      detectionMethods,
      totalEvents: events.length,
      totalAnomalies: anomalies.length,
      avgAnomalyScore,
    };
  }, [events, formatBytes, formatTimeLabel, identifyApplicationProtocol]);

  // Colors for charts
  const PROTOCOL_COLORS = [
    '#38BDF8', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
    '#F97316', // orange
    '#A855F7', // violet
  ];

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Activity className="w-12 h-12 text-text-dim mb-3" />
        <p className="text-text-dim">No data available yet</p>
        <p className="text-sm text-text-dim mt-1">Statistics will appear once events are captured</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar bg-base">
      {/* Header */}
      <div className="p-6 border-b border-border bg-panel sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-info" />
            <h2 className="text-lg font-semibold text-text">Statistics Dashboard</h2>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-text-dim">Total Events: </span>
              <span className="text-text font-semibold">{stats.totalEvents}</span>
            </div>
            <div>
              <span className="text-text-dim">Anomalies: </span>
              <span className="text-warn font-semibold">{stats.totalAnomalies}</span>
            </div>
            <div>
              <span className="text-text-dim">Avg Score: </span>
              <span className="text-info font-semibold">{(stats.avgAnomalyScore * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Top Row - Top Talkers */}
        <div className="grid grid-cols-2 gap-6">
          {/* Top Talkers by Packets */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-info" />
              <h3 className="font-semibold text-text">Top Talkers by Packets</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topTalkersByPackets} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis 
                  dataKey="ip" 
                  type="category" 
                  width={120}
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Bar dataKey="packets" fill="#38BDF8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Talkers by Bytes */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-ok" />
              <h3 className="font-semibold text-text">Top Talkers by Bytes</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topTalkersByBytes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis 
                  dataKey="ip" 
                  type="category" 
                  width={120}
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => formatBytes(value)}
                />
                <Bar dataKey="bytes" fill="#10B981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Middle Row - Protocol Distributions & Anomaly Rate */}
        <div className="grid grid-cols-3 gap-6">
          {/* Transport Layer Protocol Distribution */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-warn" />
              <h3 className="font-semibold text-text">Transport Protocols</h3>
            </div>
            <div className="text-xs text-text-dim mb-3">TCP, UDP, ICMP</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.protocolDistribution}
                  dataKey="count"
                  nameKey="protocol"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ protocol, percent }) => `${protocol} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {stats.protocolDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Application Layer Protocol Distribution */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-info" />
              <h3 className="font-semibold text-text">Application Protocols</h3>
            </div>
            <div className="text-xs text-text-dim mb-3">DNS, HTTP, IMAP, etc.</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={stats.applicationProtocolDistribution}
                  dataKey="count"
                  nameKey="protocol"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ protocol, percent }) => 
                    percent > 0.05 ? `${protocol} ${(percent * 100).toFixed(0)}%` : ''
                  }
                  labelLine={false}
                >
                  {stats.applicationProtocolDistribution.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROTOCOL_COLORS[index % PROTOCOL_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Anomaly Rate Over Time */}
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-critical" />
              <h3 className="font-semibold text-text">Anomaly Rate Over Time</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.anomalyRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="time" 
                  stroke="#9CA3AF"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#9CA3AF"
                  label={{ value: 'Anomaly %', angle: -90, position: 'insideLeft', fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#E5E7EB' }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bottom Row - Detection Methods */}
        {stats.detectionMethods.length > 0 && (
          <div className="panel p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-info" />
              <h3 className="font-semibold text-text">Detection Methods</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.detectionMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="method" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  style={{ fontSize: '11px' }}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111827', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="panel p-4">
            <p className="text-xs text-text-dim mb-1">Total Events</p>
            <p className="text-2xl font-bold text-text">{stats.totalEvents}</p>
          </div>
          <div className="panel p-4">
            <p className="text-xs text-text-dim mb-1">Total Anomalies</p>
            <p className="text-2xl font-bold text-warn">{stats.totalAnomalies}</p>
          </div>
          <div className="panel p-4">
            <p className="text-xs text-text-dim mb-1">Anomaly Rate</p>
            <p className="text-2xl font-bold text-critical">
              {stats.totalEvents > 0 ? ((stats.totalAnomalies / stats.totalEvents) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="panel p-4">
            <p className="text-xs text-text-dim mb-1">Avg Anomaly Score</p>
            <p className="text-2xl font-bold text-info">
              {(stats.avgAnomalyScore * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsDashboard;
