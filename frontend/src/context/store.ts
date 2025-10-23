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
  ContextualTip
} from '../types';
import { DEFAULT_FILTERS as FILTERS, DEFAULT_ALERT_CONFIG, DEFAULT_USER_PROFILE } from '../types';

interface UIState {
  // Data
  events: NetworkEvent[];
  aiMessages: AIMessage[];
  userMessages: UserMessage[];
  status: SystemStatus | null;
  incidents: Incident[];
  
  // UI State
  connected: boolean;
  mockMode: boolean;
  selectedEventId: string | null;
  focusedMessageId: string | null;
  feedback: Record<string, 'up' | 'down'>;
  filters: EventFilters;
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
  toggleMockMode: () => void;
  selectEvent: (eventId: string | null) => void;
  focusMessage: (messageId: string | null) => void;
  setFeedback: (messageId: string, rating: 'up' | 'down' | null) => void;
  clearOldEvents: (maxAge: number) => void;
  setFilters: (filters: Partial<EventFilters>) => void;
  resetFilters: () => void;
  
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
  mockMode: false,
  selectedEventId: null,
  focusedMessageId: null,
  feedback: {},
  filters: FILTERS,
  alertConfig: DEFAULT_ALERT_CONFIG,
  
  // IUI Initial state
  userProfile: DEFAULT_USER_PROFILE,
  suggestions: [],
  eventFeedback: {},
  predictions: [],
  contextualTips: [],
  dismissedSuggestions: [],
  
  // Actions
  addEvent: (event) => set((state) => ({
    events: [event, ...state.events].slice(0, 200) // Keep last 200 events
  })),
  
  addAIMessage: (message) => set((state) => ({
    aiMessages: [...state.aiMessages, message]
  })),
  
  addUserMessage: (message) => set((state) => ({
    userMessages: [...state.userMessages, message]
  })),
  
  updateStatus: (status) => set({ status }),
  
  setConnected: (connected) => set({ connected }),
  
  toggleMockMode: () => set((state) => ({ mockMode: !state.mockMode })),
  
  selectEvent: (eventId) => set({ selectedEventId: eventId }),
  
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
    filters: { ...state.filters, ...newFilters }
  })),
  
  resetFilters: () => set({ filters: FILTERS }),
  
  // Incident actions
  addIncident: (incident) => set((state) => ({
    incidents: [incident, ...state.incidents]
  })),
  
  updateIncident: (id, updates) => set((state) => ({
    incidents: state.incidents.map(inc => 
      inc.id === id 
        ? { ...inc, ...updates, updated_at: new Date().toISOString() }
        : inc
    )
  })),
  
  deleteIncident: (id) => set((state) => ({
    incidents: state.incidents.filter(inc => inc.id !== id)
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
    )
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
  
  trackInteraction: (_interactionType: string) => set((state) => ({
    userProfile: {
      ...state.userProfile,
      interaction_count: state.userProfile.interaction_count + 1,
      last_interaction: new Date().toISOString()
    }
  })),
  
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
  }))
    }),
    {
      name: 'ainetui-store',
      partialize: (state) => ({ 
        alertConfig: state.alertConfig,
        mockMode: state.mockMode,
        userProfile: state.userProfile,
        dismissedSuggestions: state.dismissedSuggestions,
        eventFeedback: state.eventFeedback
      })
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
