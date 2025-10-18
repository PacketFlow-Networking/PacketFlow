import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  NetworkEvent, 
  AIMessage, 
  UserMessage, 
  SystemStatus, 
  MessageFeedback, 
  EventFilters, 
  DEFAULT_FILTERS, 
  Incident, 
  IncidentStatus, 
  IncidentNote,
  AlertConfiguration,
  AlertRule,
  IPListEntry
} from '../types';
import { DEFAULT_FILTERS as FILTERS, DEFAULT_ALERT_CONFIG } from '../types';

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
}

export const useStore = create<UIState>(
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
  
  resetAlertConfig: () => set({ alertConfig: DEFAULT_ALERT_CONFIG })
    }),
    {
      name: 'ainetui-alert-config',
      partialize: (state) => ({ 
        alertConfig: state.alertConfig,
        mockMode: state.mockMode
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
