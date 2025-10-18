// Core data types matching backend structures

export interface NetworkEvent {
  id: string;
  timestamp: string;
  src: string;
  dst: string;
  proto: string;
  flows: number;
  avg_size?: number;
  throughput?: number;
  anomaly_score: number;
  summary: string;
  severity?: string;
  src_port?: number;
  dst_port?: number;
  // Detection metadata
  detection_methods?: string[];
  z_score?: number;
  iqr_multiplier?: number;
  baseline_rate?: number;
  current_rate?: number;
  // Behavioral metrics
  packet_rate?: number;
  byte_rate?: number;
  unique_ports?: number;
  connection_attempts?: number;
  // Related context
  related_event_ids?: string[];
  tags?: string[];
}

export interface AIMessage {
  id: string;
  timestamp: string;
  content: string;
  event_ids: string[];
  confidence?: 'low' | 'medium' | 'high';
  type: 'insight' | 'warning' | 'summary' | 'response';
}

export interface UserMessage {
  id: string;
  timestamp: string;
  content: string;
  type: 'user';
}

export type Message = AIMessage | UserMessage;

export interface SystemStatus {
  packets_per_sec: number;
  active_flows: number;
  anomalies_per_min: number;
  uptime_seconds: number;
}

export interface WebSocketMessage {
  kind: 'event' | 'ai';
  payload: NetworkEvent | Omit<AIMessage, 'id' | 'timestamp'>;
}

export interface MessageFeedback {
  messageId: string;
  rating: 'up' | 'down' | null;
}

export type SeverityLevel = 'info' | 'warn' | 'critical' | 'ok' | 'low' | 'medium' | 'high' | 'normal';

export interface AnomalyMarker {
  timestamp: number;
  severity: SeverityLevel;
  eventId: string;
  score: number;
}

// Filter types
export interface EventFilters {
  searchQuery: string;
  severities: SeverityLevel[];
  protocols: string[];
  ports: number[];
  onlyAnomalies: boolean;
  timeRange: 'all' | '5m' | '15m' | '30m' | '1h';
}

export const DEFAULT_FILTERS: EventFilters = {
  searchQuery: '',
  severities: [],
  protocols: [],
  ports: [],
  onlyAnomalies: false,
  timeRange: 'all',
};

// Incident types
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'false_positive';
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface IncidentNote {
  id: string;
  timestamp: string;
  author: string;
  content: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  event_ids: string[];
  notes: IncidentNote[];
  tags: string[];
  assigned_to?: string;
}

// Alert Configuration types
export type AlertCondition = 'greater_than' | 'less_than' | 'equals' | 'contains';
export type AlertAction = 'notify' | 'create_incident' | 'log' | 'sound';

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  field: 'anomaly_score' | 'flows' | 'proto' | 'src' | 'dst' | 'src_port' | 'dst_port';
  condition: AlertCondition;
  value: string | number;
  actions: AlertAction[];
  severity: IncidentSeverity;
  description?: string;
  created_at: string;
}

export interface IPListEntry {
  ip: string;
  comment?: string;
  added_at: string;
}

export interface AlertConfiguration {
  // Global sensitivity (0-100, affects anomaly score threshold)
  sensitivity: number;
  
  // Custom thresholds
  thresholds: {
    anomaly_score: number;
    flow_rate: number;
    packet_rate: number;
    byte_rate: number;
  };
  
  // IP lists
  whitelist: IPListEntry[];
  blacklist: IPListEntry[];
  
  // Alert rules
  rules: AlertRule[];
  
  // Notification settings
  notifications: {
    enabled: boolean;
    sound: boolean;
    toast: boolean;
    autoIncident: boolean;
  };
}

export const DEFAULT_ALERT_CONFIG: AlertConfiguration = {
  sensitivity: 50, // Medium sensitivity
  thresholds: {
    anomaly_score: 0.8,
    flow_rate: 1000,
    packet_rate: 10000,
    byte_rate: 1000000,
  },
  whitelist: [],
  blacklist: [],
  rules: [],
  notifications: {
    enabled: true,
    sound: true,
    toast: true,
    autoIncident: false,
  },
};
