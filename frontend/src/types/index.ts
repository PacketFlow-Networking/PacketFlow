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
  is_anomaly?: boolean;
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
  
  // CHAT DISPLAY: Brief fields only
  text?: string;                    // Brief summary for chat window (one-liner)
  ai_explanation?: string;          // 2-3 sentence summary for tooltips
  threat_level?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvss_score?: number;              // CVSS v4.0 score (0-10)
  risk_score?: number;              // Business risk score (0-100)
  quick_recommendations?: Array<{   // Max 2 recommendations for chat
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    timeframe?: 'immediate' | '1_hour' | '4_hours' | '24_hours' | 'asap';
  }>;
  
  // LEGACY/BASIC FIELDS: For fallback compatibility
  brief_summary?: string;           // Short summary for chat display
  full_summary?: string;            // Full 2-3 sentence summary
  what_happened?: string;           // Observable behavior
  why_suspicious?: string;          // Why anomalous
  detection_method?: string;        // How detected
  attack_context?: string;          // Attack type & objectives
  threat_indicators?: Array<{
    type: string;
    confidence: number;
    evidence: string;
    explanation: string;
    cwe_ids?: string[];
    owasp_references?: string[];
    mitre_techniques?: string[];
  }>;
  recommendations?: Array<{
    action: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    details: string;
    timeframe?: 'immediate' | '1_hour' | '4_hours' | '24_hours' | 'asap';
    affected_systems?: string[];
    compliance_impact?: string[];
  }>;
  technical_details?: Record<string, any>;
  
  // FULL MODAL DISPLAY: Industry-standard structured analysis
  structured_analysis?: {
    // EXECUTIVE SUMMARIES
    brief_summary?: string;
    summary?: string;
    threat_level?: 'critical' | 'high' | 'medium' | 'low' | 'info';
    cvss_score?: number;
    risk_score?: number;
    
    // FORENSIC ANALYSIS
    what_happened?: string;
    why_suspicious?: string;
    detection_method?: string;
    
    // THREAT CLASSIFICATION
    threat_indicators?: Array<{
      type: string;
      confidence: number;
      evidence: string;
      explanation: string;
      cwe_ids?: string[];
      owasp_references?: string[];
      mitre_techniques?: string[];
    }>;
    
    // INCIDENT RESPONSE
    recommendations?: Array<{
      action: string;
      priority: 'critical' | 'high' | 'medium' | 'low';
      details: string;
      timeframe?: 'immediate' | '1_hour' | '4_hours' | '24_hours' | 'asap';
      affected_systems?: string[];
      compliance_impact?: string[];
    }>;
    
    // ATTACK CONTEXT & FRAMEWORK MAPPING
    attack_context?: string;
    mitre_attack_stages?: string[];
    
    // FORENSIC EVIDENCE
    technical_details?: Record<string, any>;
    affected_assets?: Array<{
      ip?: string;
      type?: string;
      criticality?: string;
      department?: string;
    }>;
    compliance_implications?: string[];
    forensic_chain?: Record<string, any>;
    
    // SOC ANALYST SUPPORT
    investigation_checklist?: string[];
    false_positive_indicators?: string[];
    
    // CONFIDENCE & UNCERTAINTY
    confidence?: number;
    explanation_confidence?: {
      confidence: number;
      detection_methods: Array<{
        name: string;
        triggered: boolean;
        confidence: number;
      }>;
      threat_distribution: Array<{
        threat_type: string;
        probability: number;
      }>;
    };
  };
}

// IUI Feature: Explanation Confidence Display
export interface DetectionMethod {
  name: string;
  triggered: boolean;
  confidence: number; // 0-1
}

export interface ThreatProbability {
  threat_type: string;
  probability: number; // 0-1
}

export interface ExplanationConfidence {
  confidence: number; // 0-1 (HIGH: 0.9+, MEDIUM: 0.7-0.9, LOW: <0.7)
  detection_methods: DetectionMethod[];
  threat_distribution: ThreatProbability[];
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
  yValue?: number;
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

// ============================================================================
// Intelligent User Interface (IUI) Types
// ============================================================================

// 1. Explainable AI Types
export interface AIReasoningStep {
  step: number;
  description: string;
  evidence: string[];
  confidence: number;
  metric?: string;
  value?: number;
}

export interface DecisionFactor {
  factor: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface AlternativeHypothesis {
  hypothesis: string;
  probability: number;
  why_rejected: string;
}

export interface AIExplanation {
  event_id: string;
  reasoning_chain: AIReasoningStep[];
  decision_factors: DecisionFactor[];
  alternative_hypotheses: AlternativeHypothesis[];
  confidence_breakdown: {
    data_quality: number;
    pattern_match: number;
    historical_context: number;
    overall: number;
  };
}

// 2. Proactive Suggestions Types
export type SuggestionType = 'investigation' | 'action' | 'filter' | 'insight' | 'learning';
export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface ProactiveSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  description: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
  timestamp: string;
  expires_at?: string;
}

// 3. User Profile & Learning Types
export type ExpertiseLevel = 'novice' | 'intermediate' | 'expert';
export type PreferredView = 'auto' | 'events' | 'topology' | 'stats';
export type CognitiveStyle = 'wholist' | 'analyst' | 'unknown';
export type UIComplexityMode = 'novice' | 'intermediate' | 'expert' | 'auto';

// Adaptive UI Tracking
export interface AdaptiveUIMetrics {
  click_depth_samples: number[]; // Track click depths for avg calculation
  time_on_details_ms: number[]; // Time spent on event/incident details
  filter_complexity_scores: number[]; // 0-10 scale based on filter combinations
  terminology_searches: string[]; // Track glossary/help searches
  advanced_feature_usage: {
    raw_data_views: number;
    advanced_filters: number;
    technical_details_expansions: number;
    custom_alert_rules: number;
    manual_incident_creation: number;
  };
  session_start: string;
  last_evaluation: string;
}

export interface InteractionHistory {
  view_switches: string[];
  event_clicks: number;
  detail_expansions: number;
  filter_applications: number;
  topology_views: number;
  list_views: number;
  avg_click_depth: number;
  session_start: string;
}

export interface UserProfile {
  expertise_level: ExpertiseLevel;
  interaction_count: number;
  preferred_views: string[];
  preferred_default_view: PreferredView;
  cognitive_style: CognitiveStyle;
  interaction_history: InteractionHistory;
  onboarding_completed: boolean;
  alert_history: {
    true_positives: number;
    false_positives: number;
    accuracy_rate: number;
  };
  learning_progress: {
    concepts_seen: string[];
    tooltips_dismissed: string[];
    tutorials_completed: string[];
  };
  usability_metrics?: UsabilityMetrics;
  // Adaptive UI Complexity
  ui_complexity_mode: UIComplexityMode;
  adaptive_ui_metrics: AdaptiveUIMetrics;
  created_at: string;
  last_interaction: string;
}
export const DEFAULT_USER_PROFILE: UserProfile = {
  expertise_level: 'intermediate',
  interaction_count: 0,
  preferred_views: ['events'],
  preferred_default_view: 'auto',
  cognitive_style: 'unknown',
  interaction_history: {
    view_switches: [],
    event_clicks: 0,
    detail_expansions: 0,
    filter_applications: 0,
    topology_views: 0,
    list_views: 0,
    avg_click_depth: 0,
    session_start: new Date().toISOString(),
  },
  onboarding_completed: false,
  alert_history: {
    true_positives: 0,
    false_positives: 0,
    accuracy_rate: 0,
  },
  learning_progress: {
    concepts_seen: [],
    tooltips_dismissed: [],
    tutorials_completed: [],
  },
  usability_metrics: {
    task_timings: [],
    error_log: [],
    confusion_points: [],
    sus_surveys: [],
  },
  ui_complexity_mode: 'auto',
  adaptive_ui_metrics: {
    click_depth_samples: [],
    time_on_details_ms: [],
    filter_complexity_scores: [],
    terminology_searches: [],
    advanced_feature_usage: {
      raw_data_views: 0,
      advanced_filters: 0,
      technical_details_expansions: 0,
      custom_alert_rules: 0,
      manual_incident_creation: 0,
    },
    session_start: new Date().toISOString(),
    last_evaluation: new Date().toISOString(),
  },
  created_at: new Date().toISOString(),
  last_interaction: new Date().toISOString(),
};

// 4. Interactive Teaching Types
export type FeedbackLabel = 'true_positive' | 'false_positive' | 'missed_detection';

export interface EventFeedback {
  event_id: string;
  user_label: FeedbackLabel;
  corrected_severity?: SeverityLevel;
  user_explanation?: string;
  timestamp: string;
  incorporated: boolean;
}

// SUS (System Usability Scale) Survey Types
export interface SUSResponse {
  q1: number; // 1-5 scale
  q2: number;
  q3: number;
  q4: number;
  q5: number;
  q6: number;
  q7: number;
  q8: number;
  q9: number;
  q10: number;
  score: number; // Calculated score (0-100)
  timestamp: string;
}

export interface TaskTiming {
  task_name: string;
  duration_ms: number;
  success: boolean;
  timestamp: string;
}

export interface ErrorLogEntry {
  error_type: string;
  context: string;
  timestamp: string;
  resolved: boolean;
}

export interface ConfusionPoint {
  feature: string;
  description: string;
  timestamp: string;
}

export interface UsabilityMetrics {
  task_timings: TaskTiming[];
  error_log: ErrorLogEntry[];
  confusion_points: ConfusionPoint[];
  sus_surveys: SUSResponse[];
}

// 5. Predictive Analytics Types
export type PredictionType = 'traffic_spike' | 'attack_escalation' | 'resource_exhaustion' | 'anomaly_burst';

export interface Prediction {
  id: string;
  type: PredictionType;
  probability: number;
  timeframe: string;
  reasoning: string;
  preventive_actions: string[];
  confidence: number;
  based_on_events: string[];
  timestamp: string;
}

// 6. Contextual Help Types
export interface ConceptDefinition {
  term: string;
  definition: string;
  category: 'security' | 'network' | 'statistics' | 'protocol';
  learn_more_url?: string;
  related_terms?: string[];
}

export interface ContextualTip {
  id: string;
  context: 'event_view' | 'chat' | 'topology' | 'stats' | 'alerts';
  trigger: string;
  content: string;
  shown_count: number;
  max_show_count: number;
}

// Extended NetworkEvent with IUI metadata
export interface EnhancedNetworkEvent extends NetworkEvent {
  ai_explanation?: AIExplanation;
  user_feedback?: EventFeedback;
  predictions?: Prediction[];
  related_suggestions?: string[]; // IDs of related suggestions
}
