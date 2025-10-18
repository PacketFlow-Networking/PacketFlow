import type { NetworkEvent } from '../types';

/**
 * Export events as CSV
 */
export const exportToCSV = (events: NetworkEvent[], filename: string = 'events.csv') => {
  if (events.length === 0) {
    alert('No events to export');
    return;
  }

  // CSV headers
  const headers = [
    'Timestamp',
    'Source IP',
    'Source Port',
    'Destination IP',
    'Destination Port',
    'Protocol',
    'Flows',
    'Bytes',
    'Anomaly Score',
    'Severity',
    'Summary'
  ];

  // Convert events to CSV rows
  const rows = events.map(event => [
    event.timestamp,
    event.src || '',
    event.src_port?.toString() || '',
    event.dst || '',
    event.dst_port?.toString() || '',
    event.proto || '',
    event.flows?.toString() || '',
    event.throughput?.toString() || '',
    event.anomaly_score?.toFixed(3) || '',
    event.severity || '',
    `"${(event.summary || '').replace(/"/g, '""')}"` // Escape quotes
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Export events as JSON
 */
export const exportToJSON = (events: NetworkEvent[], filename: string = 'events.json') => {
  if (events.length === 0) {
    alert('No events to export');
    return;
  }

  // Create formatted JSON
  const jsonContent = JSON.stringify(events, null, 2);

  // Create blob and download
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Export events as formatted text report
 */
export const exportToText = (events: NetworkEvent[], filename: string = 'events.txt') => {
  if (events.length === 0) {
    alert('No events to export');
    return;
  }

  const lines = [
    '='.repeat(80),
    'AINetUI Network Events Report',
    '='.repeat(80),
    `Generated: ${new Date().toLocaleString()}`,
    `Total Events: ${events.length}`,
    '',
    '='.repeat(80),
    ''
  ];

  events.forEach((event, index) => {
    lines.push(`Event #${index + 1}`);
    lines.push('-'.repeat(80));
    lines.push(`Timestamp:       ${new Date(event.timestamp).toLocaleString()}`);
    lines.push(`Source:          ${event.src}${event.src_port ? ':' + event.src_port : ''}`);
    lines.push(`Destination:     ${event.dst}${event.dst_port ? ':' + event.dst_port : ''}`);
    lines.push(`Protocol:        ${event.proto}`);
    lines.push(`Flows:           ${event.flows}`);
    if (event.throughput) {
      lines.push(`Bytes:           ${event.throughput}`);
    }
    lines.push(`Anomaly Score:   ${(event.anomaly_score * 100).toFixed(1)}%`);
    if (event.severity) {
      lines.push(`Severity:        ${event.severity.toUpperCase()}`);
    }
    lines.push(`Summary:         ${event.summary}`);
    lines.push('');
  });

  lines.push('='.repeat(80));
  lines.push('End of Report');
  lines.push('='.repeat(80));

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Export statistics summary
 */
export const exportStatsSummary = (events: NetworkEvent[], filename: string = 'stats-summary.txt') => {
  if (events.length === 0) {
    alert('No events to export');
    return;
  }

  // Calculate statistics
  const totalEvents = events.length;
  const anomalies = events.filter(e => e.anomaly_score > 0.3).length;
  const critical = events.filter(e => e.severity === 'critical' || e.anomaly_score >= 0.8).length;
  const high = events.filter(e => e.severity === 'high' || (e.anomaly_score >= 0.5 && e.anomaly_score < 0.8)).length;

  // Protocol distribution
  const protocols = events.reduce((acc, e) => {
    acc[e.proto] = (acc[e.proto] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top sources
  const sources = events.reduce((acc, e) => {
    acc[e.src] = (acc[e.src] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topSources = Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top destinations
  const destinations = events.reduce((acc, e) => {
    acc[e.dst] = (acc[e.dst] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topDestinations = Object.entries(destinations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Build report
  const lines = [
    '='.repeat(80),
    'AINetUI Statistics Summary',
    '='.repeat(80),
    `Generated: ${new Date().toLocaleString()}`,
    `Time Period: ${new Date(events[events.length - 1].timestamp).toLocaleString()} - ${new Date(events[0].timestamp).toLocaleString()}`,
    '',
    '='.repeat(80),
    'OVERVIEW',
    '='.repeat(80),
    `Total Events:        ${totalEvents}`,
    `Anomalies:           ${anomalies} (${(anomalies / totalEvents * 100).toFixed(1)}%)`,
    `Critical:            ${critical} (${(critical / totalEvents * 100).toFixed(1)}%)`,
    `High Severity:       ${high} (${(high / totalEvents * 100).toFixed(1)}%)`,
    '',
    '='.repeat(80),
    'PROTOCOL DISTRIBUTION',
    '='.repeat(80),
    ...Object.entries(protocols)
      .sort((a, b) => b[1] - a[1])
      .map(([proto, count]) => `${proto.padEnd(15)} ${count.toString().padStart(8)} (${(count / totalEvents * 100).toFixed(1)}%)`),
    '',
    '='.repeat(80),
    'TOP 10 SOURCE IPs',
    '='.repeat(80),
    ...topSources.map(([ip, count]) => `${ip.padEnd(20)} ${count.toString().padStart(8)} events`),
    '',
    '='.repeat(80),
    'TOP 10 DESTINATION IPs',
    '='.repeat(80),
    ...topDestinations.map(([ip, count]) => `${ip.padEnd(20)} ${count.toString().padStart(8)} events`),
    '',
    '='.repeat(80),
    'End of Summary',
    '='.repeat(80)
  ];

  const textContent = lines.join('\n');
  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
  downloadBlob(blob, filename);
};

/**
 * Helper function to trigger download
 */
const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

/**
 * Generate filename with timestamp
 */
export const generateFilename = (prefix: string, extension: string): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}.${extension}`;
};
