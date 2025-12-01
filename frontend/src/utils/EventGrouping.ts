import type { NetworkEvent } from '../types';

export interface EventGroup {
  id: string; // Composite key for the group
  groupKey: string; // Human-readable key: "192.168.1.10|UDP|DNS_TUNNELING"
  events: NetworkEvent[];
  count: number;
  avgAnomalyScore: number;
  maxAnomalyScore: number;
  minAnomalyScore: number;
  firstTimestamp: string;
  lastTimestamp: string;
  timeSpanSeconds: number;
  src: string;
  dst: string;
  proto: string;
  primaryThreatIndicator?: string;
  isExpanded?: boolean; // UI state
}

/**
 * Creates a composite grouping key from event properties
 * Pattern: src|proto|threat_type
 */
function createGroupKey(event: NetworkEvent): string {
  const threatType = event.summary?.match(/\[(.*?)\]/)?.[1] || 'UNKNOWN';
  return `${event.src}|${event.proto}|${threatType}`;
}

/**
 * Groups events by source IP, protocol, and primary threat type
 * Returns sorted array (highest anomaly score first)
 */
export function groupEvents(events: NetworkEvent[]): EventGroup[] {
  const groupMap = new Map<string, NetworkEvent[]>();

  // Group events by composite key
  for (const event of events) {
    const key = createGroupKey(event);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key)!.push(event);
  }

  // Convert to EventGroup objects
  const groups: EventGroup[] = [];

  groupMap.forEach((events, key) => {
    const scores = events.map(e => e.anomaly_score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Sort events within group by timestamp (newest first)
    const sortedEvents = [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const firstEvent = sortedEvents[sortedEvents.length - 1];
    const lastEvent = sortedEvents[0];

    const timeSpanSeconds =
      (new Date(lastEvent.timestamp).getTime() - new Date(firstEvent.timestamp).getTime()) / 1000;

    const threatIndicator = events[0].summary?.match(/\[(.*?)\]/)?.[1] || 'UNKNOWN';

    groups.push({
      id: key, // Use groupKey as stable ID
      groupKey: key,
      events: sortedEvents,
      count: events.length,
      avgAnomalyScore: avgScore,
      maxAnomalyScore: maxScore,
      minAnomalyScore: minScore,
      firstTimestamp: firstEvent.timestamp,
      lastTimestamp: lastEvent.timestamp,
      timeSpanSeconds: Math.max(0, timeSpanSeconds),
      src: firstEvent.src,
      dst: firstEvent.dst,
      proto: firstEvent.proto,
      primaryThreatIndicator: threatIndicator,
      isExpanded: false,
    });
  });

  // Sort by max anomaly score (descending)
  return groups.sort((a, b) => b.maxAnomalyScore - a.maxAnomalyScore);
}

/**
 * Formats time span for display
 * Examples: "5s", "2m 30s", "1h 15m"
 */
export function formatTimeSpan(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Determines group severity based on anomaly scores
 */
export function getGroupSeverity(group: EventGroup): 'critical' | 'high' | 'medium' | 'low' {
  const score = group.maxAnomalyScore;
  if (score >= 0.9) return 'critical';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

/**
 * Calculates visual metrics for group representation
 */
export function getGroupMetrics(group: EventGroup) {
  return {
    severity: getGroupSeverity(group),
    eventDensity: group.timeSpanSeconds > 0 ? group.count / group.timeSpanSeconds : group.count,
    scoreVariance:
      group.maxAnomalyScore - group.minAnomalyScore,
    isRecent: (Date.now() - new Date(group.lastTimestamp).getTime()) / 1000 < 60,
  };
}
