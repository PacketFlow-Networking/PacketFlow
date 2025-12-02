import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  NetworkEvent, 
  AIMessage, 
  UserMessage, 
  SystemStatus, 
  EventFilters, 
  Incident, 
  IncidentStatus, 
  IncidentNote,
  AlertConfiguration,
  AlertRule,
  IPListEntry,
  UserProfile,
  ProactiveSuggestion,
  EventFeedback,
  Prediction,
  ContextualTip,
  PreferredView,
  UIComplexityMode,
  ExpertiseLevel
} from '../types';
import { DEFAULT_FILTERS as FILTERS, DEFAULT_ALERT_CONFIG, DEFAULT_USER_PROFILE } from '../types';
import { evaluateRules, getActionsFromRules, getHighestSeverity } from '../utils/ruleEvaluator';

interface UIState {
  // Data
  events: NetworkEvent[];
  aiMessages: AIMessage[];
  userMessages: UserMessage[];
  status: SystemStatus | null;
  incidents: Incident[];
  
  // UI State
  connected: boolean;
  selectedEventId: string | null;
  selectedIncidentId: string | null;
  focusedMessageId: string | null;
  feedback: Record<string, 'up' | 'down'>;
  filters: EventFilters;
  previousFilters: EventFilters | null; // For undo functionality
  alertConfig: AlertConfiguration;
  
  // IUI State
  userProfile: UserProfile;
  suggestions: ProactiveSuggestion[];
  eventFeedback: Record<string, EventFeedback>; // event_id -> feedback
  predictions: Prediction[];
  contextualTips: ContextualTip[];
  dismissedSuggestions: string[];
  
  // Actions
  addEvent: (event: NetworkEvent) => void;
  addAIMessage: (message: AIMessage) => void;
  addUserMessage: (message: UserMessage) => void;
  updateStatus: (status: SystemStatus) => void;
  setConnected: (connected: boolean) => void;
  selectEvent: (eventId: string | null) => void;
  selectIncident: (incidentId: string | null) => void;
  focusMessage: (messageId: string | null) => void;
  setFeedback: (messageId: string, rating: 'up' | 'down' | null) => void;
  clearOldEvents: (maxAge: number) => void;
  setFilters: (filters: Partial<EventFilters>) => void;
  resetFilters: () => void;
  undoFilters: () => void; // Restore previous filter state
  
  // Incident actions
  addIncident: (incident: Incident) => void;
  updateIncident: (id: string, updates: Partial<Incident>) => void;
  deleteIncident: (id: string) => void;
  addIncidentNote: (incidentId: string, note: IncidentNote) => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
  
  // Alert configuration actions
  updateAlertConfig: (config: Partial<AlertConfiguration>) => void;
  setSensitivity: (sensitivity: number) => void;
  updateThresholds: (thresholds: Partial<AlertConfiguration['thresholds']>) => void;
  addWhitelistIP: (entry: IPListEntry) => void;
  removeWhitelistIP: (ip: string) => void;
  addBlacklistIP: (entry: IPListEntry) => void;
  removeBlacklistIP: (ip: string) => void;
  addAlertRule: (rule: AlertRule) => void;
  updateAlertRule: (id: string, updates: Partial<AlertRule>) => void;
  deleteAlertRule: (id: string) => void;
  toggleAlertRule: (id: string) => void;
  resetAlertConfig: () => void;
  
  // IUI Actions
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  trackInteraction: (interactionType: string) => void;
  addSuggestion: (suggestion: ProactiveSuggestion) => void;
  dismissSuggestion: (id: string) => void;
  clearExpiredSuggestions: () => void;
  addEventFeedback: (feedback: EventFeedback) => void;
  addPrediction: (prediction: Prediction) => void;
  clearOldPredictions: (maxAge: number) => void;
  markConceptSeen: (concept: string) => void;
  dismissTooltip: (tooltipId: string) => void;
  clearChat: () => void; // Clear chat messages (privacy)
  
  // Adaptive UI Complexity Actions
  setUIComplexityMode: (mode: UIComplexityMode) => void;
  trackClickDepth: (depth: number) => void;
  trackDetailViewTime: (durationMs: number) => void;
  trackFilterComplexity: (score: number) => void;
  trackTerminologySearch: (term: string) => void;
  trackAdvancedFeatureUse: (feature: keyof UserProfile['adaptive_ui_metrics']['advanced_feature_usage']) => void;
  evaluateAndAdaptComplexity: () => void;
  getEffectiveComplexityLevel: () => ExpertiseLevel;
  
  // Onboarding
  completeOnboarding: () => void;
  setPreferredDefaultView: (view: PreferredView) => void;
}

export const useStore = create<UIState>()(
  persist(
    (set) => ({
  // Initial state
  events: [],
  aiMessages: [],
  userMessages: [],
  status: null,
  incidents: [],
  connected: false,
  selectedEventId: null,
  selectedIncidentId: null,
  focusedMessageId: null,
  feedback: {},
  filters: FILTERS,
  previousFilters: null,
  alertConfig: DEFAULT_ALERT_CONFIG,
  
  // IUI Initial state
  userProfile: DEFAULT_USER_PROFILE,
  suggestions: [],
  eventFeedback: {},
  predictions: [],
  contextualTips: [],
  dismissedSuggestions: [],
  
  // Actions
  addEvent: (event) => set((state) => {
    // Evaluate alert rules against the event
    const matchedRules = evaluateRules(state.alertConfig.rules, event);
    const actions = getActionsFromRules(matchedRules);
    const severity = getHighestSeverity(matchedRules);

    // Execute actions if rules matched
    if (matchedRules.length > 0) {
      console.log(`[Alert Rules] ${matchedRules.length} rule(s) matched for event ${event.id}`);
      
      // Handle create_incident action
      if (actions.includes('create_incident')) {
        const incident: Incident = {
          id: crypto.randomUUID(),
          title: `Alert: ${matchedRules[0].name}`,
          description: `Auto-generated from rule: ${matchedRules.map(r => r.name).join(', ')}\n\nEvent: ${event.src} → ${event.dst} (${event.proto})\nAnomaly Score: ${event.anomaly_score}`,
          severity: severity || 'medium',
          status: 'open',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          event_ids: [event.id],
          tags: matchedRules.map(r => r.name),
          notes: []
        };
        
        // Add incident to state
        state.incidents.push(incident);
        state.selectedIncidentId = incident.id;
      }
      
      // Note: 'notify', 'log', and 'sound' actions are handled by the UI components
      // that listen to the alertConfig.rules and check matched rules
    }

    return {
      events: [event, ...state.events].slice(0, 200), // Keep last 200 events
      incidents: state.incidents // Updated if incident was created
    };
  }),
  
  addAIMessage: (message) => set((state) => ({
    aiMessages: [...state.aiMessages, message].slice(0, 500) // Keep last 500 messages
  })),
  
  addUserMessage: (message) => set((state) => ({
    userMessages: [...state.userMessages, message].slice(0, 500) // Keep last 500 messages
  })),
  
  updateStatus: (status) => set({ status }),
  
  setConnected: (connected) => set({ connected }),
  
  selectEvent: (eventId) => set({ selectedEventId: eventId }),
  
  selectIncident: (incidentId) => set({ selectedIncidentId: incidentId }),
  
  focusMessage: (messageId) => set({ focusedMessageId: messageId }),
  
  setFeedback: (messageId, rating) => set((state) => {
    const newFeedback = { ...state.feedback };
    if (rating === null) {
      delete newFeedback[messageId];
    } else {
      newFeedback[messageId] = rating;
    }
    return { feedback: newFeedback };
  }),
  
  clearOldEvents: (maxAge) => set((state) => {
    const now = Date.now();
    return {
      events: state.events.filter(e => 
        now - new Date(e.timestamp).getTime() < maxAge
      )
    };
  }),
  
  setFilters: (newFilters) => set((state) => ({
    previousFilters: state.filters, // Save current filters before updating
    filters: { ...state.filters, ...newFilters }
  })),
  
  resetFilters: () => set((state) => ({
    previousFilters: state.filters, // Save current filters before reset
    filters: FILTERS
  })),
  
  undoFilters: () => set((state) => {
    if (!state.previousFilters) return {}; // No previous state to restore
    return {
      previousFilters: null, // Clear undo history after restore
      filters: state.previousFilters
    };
  }),
  
  // Incident actions
  addIncident: (incident) => set((state) => ({
    incidents: [incident, ...state.incidents],
    selectedIncidentId: incident.id // Automatically select newly created incident
  })),
  
  updateIncident: (id, updates) => set((state) => ({
    incidents: state.incidents.map(inc => 
      inc.id === id 
        ? { ...inc, ...updates, updated_at: new Date().toISOString() }
        : inc
    )
  })),
  
  deleteIncident: (id) => set((state) => ({
    incidents: state.incidents.filter(inc => inc.id !== id),
    selectedIncidentId: state.selectedIncidentId === id ? null : state.selectedIncidentId
  })),
  
  addIncidentNote: (incidentId, note) => set((state) => ({
    incidents: state.incidents.map(inc =>
      inc.id === incidentId
        ? { 
            ...inc, 
            notes: [...inc.notes, note],
            updated_at: new Date().toISOString()
          }
        : inc
    )
  })),
  
  updateIncidentStatus: (id, status) => set((state) => ({
    incidents: state.incidents.map(inc =>
      inc.id === id
        ? { 
            ...inc, 
            status,
            updated_at: new Date().toISOString(),
            resolved_at: status === 'resolved' || status === 'false_positive' 
              ? new Date().toISOString() 
              : undefined
          }
        : inc
    ),
    // Clear selection if incident is being resolved/closed
    selectedIncidentId: 
      (status === 'resolved' || status === 'false_positive') && state.selectedIncidentId === id
        ? null
        : state.selectedIncidentId
  })),
  
  // Alert configuration actions
  updateAlertConfig: (config) => set((state) => ({
    alertConfig: { ...state.alertConfig, ...config }
  })),
  
  setSensitivity: (sensitivity) => set((state) => ({
    alertConfig: { 
      ...state.alertConfig, 
      sensitivity,
      thresholds: {
        ...state.alertConfig.thresholds,
        anomaly_score: 1 - (sensitivity / 100) // Higher sensitivity = lower threshold
      }
    }
  })),
  
  updateThresholds: (thresholds) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      thresholds: { ...state.alertConfig.thresholds, ...thresholds }
    }
  })),
  
  addWhitelistIP: (entry) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      whitelist: [...state.alertConfig.whitelist, entry]
    }
  })),
  
  removeWhitelistIP: (ip) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      whitelist: state.alertConfig.whitelist.filter(e => e.ip !== ip)
    }
  })),
  
  addBlacklistIP: (entry) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      blacklist: [...state.alertConfig.blacklist, entry]
    }
  })),
  
  removeBlacklistIP: (ip) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      blacklist: state.alertConfig.blacklist.filter(e => e.ip !== ip)
    }
  })),
  
  addAlertRule: (rule) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      rules: [...state.alertConfig.rules, rule]
    }
  })),
  
  updateAlertRule: (id, updates) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      rules: state.alertConfig.rules.map(rule =>
        rule.id === id ? { ...rule, ...updates } : rule
      )
    }
  })),
  
  deleteAlertRule: (id) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      rules: state.alertConfig.rules.filter(rule => rule.id !== id)
    }
  })),
  
  toggleAlertRule: (id) => set((state) => ({
    alertConfig: {
      ...state.alertConfig,
      rules: state.alertConfig.rules.map(rule =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      )
    }
  })),
  
  resetAlertConfig: () => set({ alertConfig: DEFAULT_ALERT_CONFIG }),
  
  // IUI Action implementations
  updateUserProfile: (updates) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      ...updates,
      last_interaction: new Date().toISOString()
    }
  })),
  
  trackInteraction: (_interactionType: string) => set((state) => {
    const newCount = state.userProfile.interaction_count + 1;
    
    // Trigger adaptive UI evaluation every 30 interactions
    if (newCount % 30 === 0 && state.userProfile.ui_complexity_mode === 'auto') {
      // Use setTimeout to avoid blocking
      setTimeout(() => {
        useStore.getState().evaluateAndAdaptComplexity();
      }, 0);
    }
    
    return {
      userProfile: {
        ...state.userProfile,
        interaction_count: newCount,
        last_interaction: new Date().toISOString()
      }
    };
  }),
  
  addSuggestion: (suggestion) => set((state) => ({
    suggestions: [suggestion, ...state.suggestions].slice(0, 10) // Keep last 10
  })),
  
  dismissSuggestion: (id) => set((state) => ({
    suggestions: state.suggestions.filter(s => s.id !== id),
    dismissedSuggestions: [...state.dismissedSuggestions, id]
  })),
  
  clearExpiredSuggestions: () => set((state) => {
    const now = new Date().getTime();
    return {
      suggestions: state.suggestions.filter(s => 
        !s.expires_at || new Date(s.expires_at).getTime() > now
      )
    };
  }),
  
  addEventFeedback: (feedback) => set((state) => ({
    eventFeedback: {
      ...state.eventFeedback,
      [feedback.event_id]: feedback
    },
    userProfile: {
      ...state.userProfile,
      alert_history: {
        ...state.userProfile.alert_history,
        true_positives: feedback.user_label === 'true_positive' 
          ? state.userProfile.alert_history.true_positives + 1 
          : state.userProfile.alert_history.true_positives,
        false_positives: feedback.user_label === 'false_positive' 
          ? state.userProfile.alert_history.false_positives + 1 
          : state.userProfile.alert_history.false_positives,
        accuracy_rate: ((state.userProfile.alert_history.true_positives + (feedback.user_label === 'true_positive' ? 1 : 0)) / 
          (state.userProfile.alert_history.true_positives + state.userProfile.alert_history.false_positives + 1)) * 100
      }
    }
  })),
  
  addPrediction: (prediction) => set((state) => ({
    predictions: [prediction, ...state.predictions].slice(0, 5) // Keep last 5
  })),
  
  clearOldPredictions: (maxAge) => set((state) => {
    const now = Date.now();
    return {
      predictions: state.predictions.filter(p => 
        now - new Date(p.timestamp).getTime() < maxAge
      )
    };
  }),
  
  markConceptSeen: (concept) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      learning_progress: {
        ...state.userProfile.learning_progress,
        concepts_seen: [...new Set([...state.userProfile.learning_progress.concepts_seen, concept])]
      }
    }
  })),
  
  dismissTooltip: (tooltipId) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      learning_progress: {
        ...state.userProfile.learning_progress,
        tooltips_dismissed: [...new Set([...state.userProfile.learning_progress.tooltips_dismissed, tooltipId])]
      }
    }
  })),

  clearChat: () => set({
    aiMessages: [],
    userMessages: []
  }),

  completeOnboarding: () => set((state) => ({
    userProfile: {
      ...state.userProfile,
      onboarding_completed: true
    }
  })),

  setPreferredDefaultView: (view: PreferredView) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      preferred_default_view: view
    }
  })),

  // Adaptive UI Complexity Actions Implementation
  setUIComplexityMode: (mode: UIComplexityMode) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      ui_complexity_mode: mode,
      // If manually set, update expertise level to match (unless auto)
      expertise_level: mode === 'auto' 
        ? state.userProfile.expertise_level 
        : mode as ExpertiseLevel
    }
  })),

  trackClickDepth: (depth: number) => set((state) => {
    const metrics = state.userProfile.adaptive_ui_metrics || {
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
    };
    
    const samples = [...(metrics.click_depth_samples || []), depth];
    // Keep last 100 samples
    const trimmed = samples.slice(-100);
    
    return {
      userProfile: {
        ...state.userProfile,
        adaptive_ui_metrics: {
          ...metrics,
          click_depth_samples: trimmed
        }
      }
    };
  }),

  trackDetailViewTime: (durationMs: number) => set((state) => {
    const metrics = state.userProfile.adaptive_ui_metrics || {};
    const samples = [...(metrics.time_on_details_ms || []), durationMs];
    // Keep last 100 samples
    const trimmed = samples.slice(-100);
    
    return {
      userProfile: {
        ...state.userProfile,
        adaptive_ui_metrics: {
          ...metrics,
          time_on_details_ms: trimmed
        }
      }
    };
  }),

  trackFilterComplexity: (score: number) => set((state) => {
    const metrics = state.userProfile.adaptive_ui_metrics || {};
    const scores = [...(metrics.filter_complexity_scores || []), score];
    // Keep last 50 filter applications
    const trimmed = scores.slice(-50);
    
    return {
      userProfile: {
        ...state.userProfile,
        adaptive_ui_metrics: {
          ...metrics,
          filter_complexity_scores: trimmed
        }
      }
    };
  }),

  trackTerminologySearch: (term: string) => set((state) => {
    const metrics = state.userProfile.adaptive_ui_metrics || {};
    const searches = [...(metrics.terminology_searches || []), term];
    // Keep last 50 searches
    const trimmed = searches.slice(-50);
    
    return {
      userProfile: {
        ...state.userProfile,
        adaptive_ui_metrics: {
          ...metrics,
          terminology_searches: trimmed
        }
      }
    };
  }),

  trackAdvancedFeatureUse: (feature) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      adaptive_ui_metrics: {
        ...state.userProfile.adaptive_ui_metrics,
        advanced_feature_usage: {
          ...state.userProfile.adaptive_ui_metrics.advanced_feature_usage,
          [feature]: state.userProfile.adaptive_ui_metrics.advanced_feature_usage[feature] + 1
        }
      }
    }
  })),

  evaluateAndAdaptComplexity: () => set((state) => {
    // Only evaluate if in auto mode
    if (state.userProfile.ui_complexity_mode !== 'auto') {
      return state;
    }

    const metrics = state.userProfile.adaptive_ui_metrics;
    const profile = state.userProfile;
    
    // Calculate complexity score (0-100)
    let complexityScore = 0;
    let factorCount = 0;

    // 1. Average Click Depth (0-20 points)
    // Novice: 1-2 clicks, Intermediate: 2-4, Expert: 4+
    if (metrics.click_depth_samples.length > 5) {
      const avgDepth = metrics.click_depth_samples.reduce((a, b) => a + b, 0) / metrics.click_depth_samples.length;
      complexityScore += Math.min(20, avgDepth * 4);
      factorCount++;
    }

    // 2. Time on Details (0-20 points)
    // Novice: <30s, Intermediate: 30-120s, Expert: 120s+
    if (metrics.time_on_details_ms.length > 3) {
      const avgTime = metrics.time_on_details_ms.reduce((a, b) => a + b, 0) / metrics.time_on_details_ms.length;
      const avgTimeSeconds = avgTime / 1000;
      complexityScore += Math.min(20, (avgTimeSeconds / 120) * 20);
      factorCount++;
    }

    // 3. Filter Complexity (0-20 points)
    // Scale: 0-10, where 10 is most complex
    if (metrics.filter_complexity_scores.length > 0) {
      const avgComplexity = metrics.filter_complexity_scores.reduce((a, b) => a + b, 0) / metrics.filter_complexity_scores.length;
      complexityScore += (avgComplexity / 10) * 20;
      factorCount++;
    }

    // 4. Terminology Searches (0-20 points, inverse)
    // More searches = novice, fewer = expert
    const searchCount = metrics.terminology_searches.length;
    const searchScore = Math.max(0, 20 - (searchCount * 0.5));
    complexityScore += searchScore;
    factorCount++;

    // 5. Advanced Feature Usage (0-20 points)
    const advancedUsage = Object.values(metrics.advanced_feature_usage).reduce((a, b) => a + b, 0);
    complexityScore += Math.min(20, advancedUsage * 2);
    factorCount++;

    // Normalize to 0-100
    const normalizedScore = factorCount > 0 ? complexityScore / factorCount * 5 : 0;

    // Determine expertise level
    let newLevel: ExpertiseLevel;
    if (normalizedScore < 35) {
      newLevel = 'novice';
    } else if (normalizedScore < 70) {
      newLevel = 'intermediate';
    } else {
      newLevel = 'expert';
    }

    // Only update if changed and we have enough data
    const hasEnoughData = (
      metrics.click_depth_samples.length >= 10 ||
      profile.interaction_count >= 20 ||
      advancedUsage >= 5
    );

    if (hasEnoughData && newLevel !== profile.expertise_level) {
      return {
        userProfile: {
          ...profile,
          expertise_level: newLevel,
          adaptive_ui_metrics: {
            ...metrics,
            last_evaluation: new Date().toISOString()
          }
        }
      };
    }

    return state;
  }),

  getEffectiveComplexityLevel: () => {
    const state = useStore.getState();
    const mode = state.userProfile.ui_complexity_mode;
    
    if (mode === 'auto') {
      return state.userProfile.expertise_level;
    }
    
    return mode as ExpertiseLevel;
  }
    }),
    {
      name: 'packetflow-store',
      partialize: (state) => ({ 
        alertConfig: state.alertConfig,
        userProfile: state.userProfile,
        dismissedSuggestions: state.dismissedSuggestions,
        eventFeedback: state.eventFeedback,
        selectedIncidentId: state.selectedIncidentId
      }),
      // Custom serialization to handle edge cases
      serialize: (state) => {
        // Ensure all arrays and objects are proper types before serialization
        return JSON.stringify(state);
      },
      deserialize: (str) => {
        try {
          const parsed = JSON.parse(str);
          // Ensure tooltips_dismissed is always an array
          if (parsed.userProfile?.learning_progress?.tooltips_dismissed && 
              typeof parsed.userProfile.learning_progress.tooltips_dismissed === 'object' &&
              !Array.isArray(parsed.userProfile.learning_progress.tooltips_dismissed)) {
            parsed.userProfile.learning_progress.tooltips_dismissed = [];
          }
          // Ensure dismissedSuggestions is always an array
          if (parsed.dismissedSuggestions && !Array.isArray(parsed.dismissedSuggestions)) {
            parsed.dismissedSuggestions = [];
          }
          return parsed;
        } catch {
          // If parsing fails, return empty object and store will use defaults
          return {};
        }
      }
    }
  )
);

// Selectors
export const getEventById = (state: UIState, id: string): NetworkEvent | undefined => 
  state.events.find(e => e.id === id);

export const getRelatedEvents = (state: UIState, eventIds: string[]): NetworkEvent[] =>
  state.events.filter(e => eventIds.includes(e.id));

export const getAllMessages = (state: UIState): (AIMessage | UserMessage)[] => {
  const combined = [
    ...state.aiMessages.map(m => ({ ...m, timestamp: m.timestamp })),
    ...state.userMessages.map(m => ({ ...m, timestamp: m.timestamp }))
  ];
  return combined.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};

export const getIncidentById = (state: UIState, id: string): Incident | undefined =>
  state.incidents.find(i => i.id === id);

export const getIncidentsByStatus = (state: UIState, status: IncidentStatus): Incident[] =>
  state.incidents.filter(i => i.status === status);
