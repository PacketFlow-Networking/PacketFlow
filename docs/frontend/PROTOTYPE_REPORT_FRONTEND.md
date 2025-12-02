# PacketFlow Frontend - Prototype Design and Implementation Report

> **Intelligent User Interface for Real-Time Network Security Monitoring**  
> Course: MAI648 - Intelligent User Interfaces  
> Date: December 2025  
> Version: 1.0.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Overview](#2-project-overview)
3. [Architecture & Design](#3-architecture--design)
4. [Intelligent User Interface Features](#4-intelligent-user-interface-features)
5. [Core Functionality](#5-core-functionality)
6. [User Interface Components](#6-user-interface-components)
7. [Implementation Details](#7-implementation-details)
8. [Testing & Validation](#8-testing--validation)
9. [Prototype Screenshots](#9-prototype-screenshots)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Executive Summary

PacketFlow is a **web-based intelligent and adaptive user interface** designed for real-time network security monitoring and analysis. The system leverages AI-powered explanations, adaptive user modeling, and proactive assistance to create an intelligent interface that adapts to user expertise and provides context-aware insights.

### Key Innovation Points

- **Explainable AI**: Multi-layered explanations showing reasoning chains, decision factors, and alternative hypotheses
- **Adaptive User Modeling**: System learns from user interactions and adjusts interface complexity
- **Proactive Assistance**: Context-aware suggestions based on detected patterns
- **Real-Time Processing**: Live network event processing with intelligent filtering and visualization
- **Privacy-First Design**: All AI processing happens locally using Ollama (no cloud dependencies)

### Technology Selection Rationale

We selected **React + TypeScript + Vite** for the following reasons:

1. **TypeScript**: Ensures type safety critical for complex network data structures
2. **React**: Component-based architecture allows modular, reusable UI elements
3. **Vite**: Fast development server with Hot Module Replacement (HMR)
4. **Zustand**: Lightweight state management with localStorage persistence
5. **Tailwind CSS**: Utility-first styling for rapid, consistent UI development
6. **Recharts + D3.js**: Professional data visualization capabilities

---

## 2. Project Overview

### 2.1 Problem Statement

Network security analysts face several challenges:

- **Information Overload**: Thousands of packets per second
- **Complex Patterns**: Subtle attack indicators buried in normal traffic
- **Expertise Gap**: Junior analysts struggle to interpret security events
- **Decision Fatigue**: Constant alerts lead to desensitization
- **Lack of Context**: Traditional tools show data without explanations

### 2.2 Solution Approach

PacketFlow addresses these challenges through:

1. **Intelligent Condensation**: Flow-based aggregation reduces data volume by 95%
2. **Multi-Method Anomaly Detection**: 8 detection algorithms with combined scoring
3. **AI-Powered Explanations**: Natural language summaries of security events
4. **Adaptive Interface**: UI complexity adjusts to user expertise level
5. **Proactive Assistance**: System suggests actions before users recognize patterns

### 2.3 System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (React)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   WebSocket │◄─┤  Zustand    │─►│ Components  │    │
│  │   Client    │  │   Store     │  │  (39 files) │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ WebSocket (JSON)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend (Python/FastAPI)                │
│  ┌─────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐│
│  │ Capture │──►│ Condenser│──►│AI Agent │──►│WebSocket││
│  │(TShark) │   │(8 Methods)│   │(Ollama) │   │ Server ││
│  └─────────┘   └──────────┘   └─────────┘   └────────┘│
└─────────────────────────────────────────────────────────┘
```

### 2.4 Data Flow Pipeline

1. **Packet Capture**: TShark captures raw network packets (or mock generator for demo)
2. **Flow Condensation**: Groups packets into flows with statistical analysis
3. **Anomaly Detection**: 8 parallel detection methods score each flow
4. **AI Explanation**: Ollama (local LLM) generates human-readable explanations
5. **WebSocket Broadcast**: JSON messages sent to all connected clients
6. **UI Update**: React components render with Zustand state management

---

## 3. Architecture & Design

### 3.1 Technology Stack

#### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.2.0 | UI framework with hooks and functional components |
| **TypeScript** | 5.2.2 | Type safety and IDE support |
| **Vite** | 7.2.4 | Build tool with fast HMR |
| **Zustand** | 4.4.7 | State management with persistence |
| **Tailwind CSS** | 3.4.0 | Utility-first CSS framework |
| **Recharts** | 2.15.4 | Chart library for statistics |
| **D3.js** | 7.9.0 | Network topology visualization |
| **Three.js** | 0.169.0 | 3D topology view |
| **Framer Motion** | 12.23.24 | Animation library |
| **Lucide React** | 0.303.0 | Icon library (500+ icons) |
| **Day.js** | 1.11.19 | Date/time formatting |

#### Development Tools

- **ESLint**: Code quality and consistency
- **TypeScript ESLint**: TypeScript-specific linting rules
- **PostCSS**: CSS processing with Autoprefixer
- **React Hooks Linter**: Ensures proper hook usage

### 3.2 Project Structure

```
frontend/
├── src/
│   ├── components/           # React components (39 files)
│   │   ├── core/            # Core UI components (4)
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── MetricsBar.tsx
│   │   │   ├── StatsDashboard.tsx
│   │   │   └── TopologyView.tsx
│   │   ├── events/          # Event handling (5)
│   │   │   ├── EventStream.tsx
│   │   │   ├── FilterBar.tsx
│   │   │   ├── GraphView.tsx
│   │   │   └── ExportMenu.tsx
│   │   ├── panels/          # Side panels (7)
│   │   │   ├── ProactiveSuggestions.tsx
│   │   │   ├── GlossaryPanel.tsx
│   │   │   ├── IncidentPanel.tsx
│   │   │   ├── FeedbackPanel.tsx
│   │   │   └── NotificationsPanel.tsx
│   │   ├── modals/          # Modal dialogs (8)
│   │   │   ├── EventDetailsModal.tsx
│   │   │   ├── OnboardingModal.tsx
│   │   │   ├── UserProfileModal.tsx
│   │   │   └── AIDetailsModal.tsx
│   │   ├── alerts/          # Alert configuration (5)
│   │   ├── incidents/       # Incident management (4)
│   │   ├── explanations/    # AI explanations (2)
│   │   └── shared/          # Shared utilities (4)
│   ├── context/             # State management
│   │   ├── store.ts         # Zustand store (740 lines)
│   │   └── ToastContext.tsx # Toast notifications
│   ├── hooks/               # Custom React hooks
│   │   ├── useWebSocket.ts  # WebSocket connection
│   │   └── useApi.ts        # REST API calls
│   ├── types/               # TypeScript definitions
│   │   └── index.ts         # All type definitions (900+ lines)
│   ├── utils/               # Utility functions
│   │   ├── export.ts        # Export functionality
│   │   ├── ruleEvaluator.ts # Alert rule engine
│   │   └── mockData.ts      # Mock data generation
│   ├── styles/              # Global styles
│   │   └── globals.css      # Tailwind + custom CSS
│   ├── App.tsx              # Main application component (390 lines)
│   └── main.tsx             # Entry point
├── docs/                    # Documentation (21 files)
│   ├── INDEX.md             # Documentation index
│   ├── PROGRESS.md          # Feature progress tracker
│   ├── IUI_PHASE1_COMPLETE.md # IUI implementation report
│   └── FEATURE_*.md         # Individual feature docs
├── public/                  # Static assets
├── index.html               # HTML entry point
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind configuration
└── vite.config.ts           # Vite configuration
```

### 3.3 Design Patterns

#### State Management Pattern

```typescript
// Zustand store with persistence
const useStore = create<UIState>()(
  persist(
    (set, get) => ({
      // State
      events: [],
      userProfile: DEFAULT_USER_PROFILE,
      suggestions: [],
      
      // Actions
      addEvent: (event) => set((state) => ({
        events: [...state.events, event].slice(-200) // Keep last 200
      })),
      
      updateUserProfile: (updates) => set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
      }))
    }),
    {
      name: 'packetflow-storage',
      partialize: (state) => ({
        userProfile: state.userProfile,
        filters: state.filters,
        alertConfig: state.alertConfig
      })
    }
  )
);
```

#### Component Composition Pattern

```typescript
// Container/Presenter pattern
function EventStream() {
  // Container logic
  const events = useStore((state) => state.events);
  const filters = useStore((state) => state.filters);
  
  const filteredEvents = useMemo(() => 
    filterEvents(events, filters), 
    [events, filters]
  );
  
  // Presenter rendering
  return (
    <div className="event-stream">
      <FilterBar />
      <EventList events={filteredEvents} />
    </div>
  );
}
```

#### Custom Hooks Pattern

```typescript
// WebSocket hook with auto-reconnect
function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  const connect = useCallback(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    
    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
    ws.onclose = () => setTimeout(connect, 5000); // Auto-reconnect
    
    wsRef.current = ws;
  }, []);
  
  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
  
  return { connected, reconnect: connect };
}
```

### 3.4 Color Palette & Design System

PacketFlow uses a custom dark theme optimized for long-term monitoring:

```css
/* Color Variables */
:root {
  --color-base: #0a0e1a;        /* Base background */
  --color-panel: #131828;       /* Panel background */
  --color-border: #1e2537;      /* Border color */
  --color-text: #e2e8f0;        /* Primary text */
  --color-text-dim: #94a3b8;    /* Secondary text */
  
  /* Status Colors */
  --color-success: #10b981;     /* Green */
  --color-warning: #f59e0b;     /* Amber */
  --color-error: #ef4444;       /* Red */
  --color-info: #3b82f6;        /* Blue */
  
  /* Severity Colors */
  --color-critical: #dc2626;    /* Dark red */
  --color-high: #ea580c;        /* Orange */
  --color-medium: #f59e0b;      /* Amber */
  --color-low: #eab308;         /* Yellow */
  --color-normal: #10b981;      /* Green */
}
```

**Design Principles:**
- **High Contrast**: Text remains readable during extended monitoring sessions
- **Color-Coded Severity**: Instant visual recognition of threat levels
- **Consistent Spacing**: 4px base unit for harmonious layouts
- **Smooth Animations**: Framer Motion for professional transitions
- **Accessibility**: WCAG 2.1 AA compliant color contrasts

---

## 4. Intelligent User Interface Features

This section details the AI-powered and adaptive features that make PacketFlow an **Intelligent User Interface**, fulfilling the course requirements for IUI implementation.

### 4.1 Explainable AI Visualizations ✅

**Implementation**: `AIExplanationPanel.tsx` (220 lines)  
**Integration**: Event Details Modal  
**AI Technique**: Local LLM (Ollama) with structured prompting

#### Features

**1. Multi-Layered Reasoning Chain**

The system shows the AI's step-by-step logical process with confidence scores:

```typescript
interface ReasoningStep {
  step_number: number;
  description: string;
  evidence: string[];
  confidence: number;
}
```

**Visual Design:**
- **Step Cards**: Each reasoning step displayed as a card with step number
- **Confidence Bars**: Visual progress bars showing confidence (0-100%)
- **Color Coding**:
  - Green (>80%): High confidence
  - Yellow (50-80%): Medium confidence
  - Red (<50%): Low confidence
- **Evidence Bullets**: Supporting evidence listed for each step

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ AI Reasoning Explanation                    │
├─────────────────────────────────────────────┤
│ 🔍 Step 1: Packet Rate Analysis             │
│ ████████████░░░░░░░░ 85% confidence        │
│ • Observed 500 packets in 5 seconds        │
│ • Normal baseline: 50-100 packets          │
│ • Deviation: +400% from mean               │
├─────────────────────────────────────────────┤
│ 🔍 Step 2: Protocol Pattern Analysis        │
│ ████████████████░░░░ 92% confidence        │
│ • All traffic is DNS (UDP port 53)         │
│ • DNS queries have unusual entropy         │
│ • Domain names exceed typical length       │
└─────────────────────────────────────────────┘
```

**2. Decision Factors Visualization**

Shows which metrics contributed to the anomaly detection with weighted impact:

```typescript
interface DecisionFactor {
  factor_name: string;
  weight: number;      // 0-1 scale
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}
```

**Visual Design:**
- **Horizontal Bar Charts**: Recharts-powered visualization
- **Impact Icons**: 
  - ↑ Positive (increases anomaly score)
  - ↓ Negative (decreases anomaly score)
  - → Neutral (informational)
- **Color-Coded Bars**:
  - Red: High impact factors
  - Orange: Medium impact
  - Blue: Low impact

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Decision Factors                            │
├─────────────────────────────────────────────┤
│ ↑ Packet Rate        ██████████████  0.85  │
│   High traffic volume detected              │
├─────────────────────────────────────────────┤
│ ↑ DNS Entropy        ████████████░░  0.72  │
│   Domain names show high randomness         │
├─────────────────────────────────────────────┤
│ ↑ Unique Domains     ██████████░░░░  0.68  │
│   Querying many distinct domains            │
├─────────────────────────────────────────────┤
│ ↓ Packet Size        ████░░░░░░░░░░  0.25  │
│   Packet sizes within normal range          │
└─────────────────────────────────────────────┘
```

**3. Alternative Hypotheses**

Demonstrates AI's consideration of multiple explanations:

```typescript
interface AlternativeHypothesis {
  hypothesis: string;
  reason_rejected: string;
  confidence: number;
}
```

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Alternative Explanations Considered         │
├─────────────────────────────────────────────┤
│ ❌ Hypothesis: Legitimate DNS Updates       │
│    Rejected: Query pattern too random       │
│    Confidence: 15%                          │
├─────────────────────────────────────────────┤
│ ❌ Hypothesis: Network Configuration Change │
│    Rejected: No correlated system events    │
│    Confidence: 8%                           │
└─────────────────────────────────────────────┘
```

**4. Educational Notes**

Contextual help explaining how to interpret results:

```typescript
// Shown to novice users
"DNS tunneling is a technique where attackers encode data 
within DNS queries to bypass firewalls. The high entropy 
and unusual domain lengths are indicators of this attack."

// Shown to expert users (shorter, technical)
"DNS tunneling detected: domain entropy >0.8, avg length >40 chars"
```

**Implementation Details:**

```typescript
// Component structure
export default function AIExplanationPanel({ event }: Props) {
  const userProfile = useStore((state) => state.userProfile);
  const explanation = event.ai_explanation_detailed;
  
  // Adapt detail level based on expertise
  const showEducationalNotes = 
    userProfile.expertise_level === 'novice' || 
    userProfile.expertise_level === 'intermediate';
  
  return (
    <div className="ai-explanation-panel">
      {/* Reasoning Chain */}
      <section className="reasoning-steps">
        {explanation.reasoning_chain.map((step) => (
          <ReasoningStep key={step.step_number} step={step} />
        ))}
      </section>
      
      {/* Decision Factors */}
      <section className="decision-factors">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={explanation.decision_factors}>
            <XAxis dataKey="factor_name" />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Bar dataKey="weight" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </section>
      
      {/* Alternative Hypotheses */}
      <Collapsible title="Alternative Explanations">
        {explanation.alternative_hypotheses.map((alt) => (
          <AlternativeHypothesis key={alt.hypothesis} hypothesis={alt} />
        ))}
      </Collapsible>
      
      {/* Educational Notes (adaptive) */}
      {showEducationalNotes && (
        <EducationalNote concept={explanation.attack_type} />
      )}
    </div>
  );
}
```

**Key Innovation**: **Progressive Disclosure**  
Complex information is hidden by default with expand/collapse controls to prevent cognitive overload.

---

### 4.2 Proactive Suggestions System ✅

**Implementation**: `ProactiveSuggestions.tsx` (280 lines)  
**Integration**: Appears above GraphView in main interface  
**AI Technique**: Pattern recognition with rule-based reasoning

#### Features

**1. Smart Pattern Detection**

System automatically detects patterns and generates actionable suggestions:

```typescript
interface ProactiveSuggestion {
  id: string;
  type: 'investigation' | 'action' | 'filter' | 'insight' | 'learning';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: {
    label: string;
    handler: () => void;
  };
  dismissible: boolean;
  expires_at?: string;
  timestamp: string;
}
```

**Pattern Detection Logic:**

```typescript
// Automatic suggestion generation
useEffect(() => {
  const recentEvents = events.slice(-10);
  const anomalyEvents = recentEvents.filter(e => e.is_anomaly);
  
  // Pattern 1: Multiple anomalies from same source
  const sourceMap = new Map<string, number>();
  anomalyEvents.forEach(e => {
    sourceMap.set(e.src, (sourceMap.get(e.src) || 0) + 1);
  });
  
  sourceMap.forEach((count, ip) => {
    if (count >= 3) {
      addSuggestion({
        type: 'investigation',
        priority: 'high',
        title: `Repeated anomalies from ${ip}`,
        description: `${count} anomalous events detected from this source`,
        action: {
          label: 'Filter by IP',
          handler: () => setFilters({ searchQuery: ip })
        }
      });
    }
  });
  
  // Pattern 2: Critical severity spike
  const criticalCount = recentEvents.filter(
    e => e.anomaly_score > 0.9
  ).length;
  
  if (criticalCount >= 2) {
    addSuggestion({
      type: 'action',
      priority: 'high',
      title: 'Critical anomaly spike detected',
      description: 'Multiple critical-severity events in short timeframe',
      action: {
        label: 'Create Incident',
        handler: () => openIncidentCreationModal(recentEvents)
      }
    });
  }
  
  // Pattern 3: Protocol-specific insights
  const dnsEvents = recentEvents.filter(e => e.proto === 'DNS');
  if (dnsEvents.length > 5) {
    addSuggestion({
      type: 'insight',
      priority: 'medium',
      title: 'High DNS activity detected',
      description: 'Elevated DNS traffic may indicate tunneling or DGA',
      action: {
        label: 'View DNS Events',
        handler: () => setFilters({ protocols: ['DNS'] })
      }
    });
  }
}, [events]);
```

**2. Priority-Based Visualization**

**Screenshot Description:**
```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  High Priority                                   [X] │
│ Repeated anomalies from 192.168.1.50                   │
│ 5 anomalous events detected from this source           │
│                              [Filter by IP →]          │
└─────────────────────────────────────────────────────────┘
     ↑ Red border for high priority

┌─────────────────────────────────────────────────────────┐
│ ⚡ Medium Priority                                  [X] │
│ High DNS activity detected                             │
│ Elevated DNS traffic may indicate tunneling or DGA     │
│                              [View DNS Events →]       │
└─────────────────────────────────────────────────────────┘
     ↑ Yellow border for medium priority

┌─────────────────────────────────────────────────────────┐
│ ℹ️  Low Priority                                    [X] │
│ Tip: Use keyboard shortcut 'A' to toggle anomaly filter│
│                                     [Learn More →]     │
└─────────────────────────────────────────────────────────┘
     ↑ Blue border for low priority
```

**3. One-Click Actions**

Each suggestion includes actionable buttons that directly manipulate the UI:

- **Filter by IP**: Sets search query to specific IP
- **Create Incident**: Opens incident creation modal with pre-filled details
- **View Events**: Applies specific protocol/severity filters
- **Investigate**: Opens chat panel with pre-filled investigation query

**4. Auto-Expiry & Dismissal**

```typescript
// Suggestions expire after configured time
useEffect(() => {
  const interval = setInterval(() => {
    const now = Date.now();
    suggestions.forEach(suggestion => {
      if (suggestion.expires_at && 
          new Date(suggestion.expires_at).getTime() < now) {
        dismissSuggestion(suggestion.id);
      }
    });
  }, 60000); // Check every minute
  
  return () => clearInterval(interval);
}, [suggestions]);
```

**5. Persistent Dismissals**

Dismissed suggestions are stored in localStorage to prevent re-appearance:

```typescript
const dismissedSuggestions = useStore((state) => state.dismissedSuggestions);

// Don't show previously dismissed suggestions
const visibleSuggestions = suggestions.filter(
  s => !dismissedSuggestions.includes(s.id)
);
```

---

### 4.3 Adaptive User Modeling ✅

**Implementation**: `context/store.ts` (User Profile State)  
**Integration**: Throughout entire application  
**AI Technique**: Implicit interaction tracking + explicit profiling

#### User Profile Structure

```typescript
interface UserProfile {
  // Identity
  name: string;
  email: string;
  
  // Expertise Level (adaptive)
  expertise_level: 'novice' | 'intermediate' | 'expert';
  
  // Interaction Tracking
  interaction_count: number;
  alert_history: {
    true_positives: number;
    false_positives: number;
    missed_detections: number;
  };
  
  // Learning Progress
  learning_progress: {
    concepts_seen: string[];      // e.g., ["DNS tunneling", "Port scan"]
    tooltips_dismissed: string[]; // Track which help was dismissed
    tutorial_completed: boolean;
  };
  
  // Preferences
  preferred_views: PreferredView[];
  ui_complexity_mode: 'simple' | 'normal' | 'advanced';
  
  // Usability Metrics
  usability_metrics: {
    sus_surveys: SUSurvey[];
    task_completion_times: TaskTiming[];
  };
  
  // Privacy
  onboarding_completed: boolean;
  data_retention_consent: boolean;
}
```

#### Adaptive Behaviors

**1. Expertise-Based UI Complexity**

```typescript
// Novice users see simplified interface
if (userProfile.expertise_level === 'novice') {
  return (
    <SimpleView>
      {/* Fewer metrics, more explanations */}
      <BasicMetrics />
      <ExtensiveTooltips />
      <GuidedTutorial />
    </SimpleView>
  );
}

// Expert users see full technical details
if (userProfile.expertise_level === 'expert') {
  return (
    <AdvancedView>
      {/* All metrics, minimal explanations */}
      <DetailedMetrics />
      <RawPacketData />
      <AdvancedFilters />
    </AdvancedView>
  );
}
```

**2. Automatic Expertise Level Detection**

```typescript
// System infers expertise from behavior
function updateExpertiseLevel() {
  const profile = useStore.getState().userProfile;
  const accuracy = 
    profile.alert_history.true_positives / 
    (profile.alert_history.true_positives + 
     profile.alert_history.false_positives);
  
  const interactionCount = profile.interaction_count;
  const conceptsLearned = profile.learning_progress.concepts_seen.length;
  
  // Scoring algorithm
  let score = 0;
  if (accuracy > 0.8) score += 3;
  else if (accuracy > 0.6) score += 2;
  else score += 1;
  
  if (interactionCount > 100) score += 2;
  else if (interactionCount > 50) score += 1;
  
  if (conceptsLearned > 10) score += 2;
  
  // Assign expertise level
  if (score >= 6) return 'expert';
  if (score >= 3) return 'intermediate';
  return 'novice';
}
```

**3. Personalized Content**

```typescript
// Show different event details based on expertise
function EventDetailsModal({ event }: Props) {
  const expertise = useStore((state) => state.userProfile.expertise_level);
  
  return (
    <Modal>
      <h2>{event.summary}</h2>
      
      {/* Novice: Simple explanation with analogies */}
      {expertise === 'novice' && (
        <p className="text-lg">
          This network event is like someone trying to knock on many doors 
          at once to find an unlocked one. This is suspicious behavior.
        </p>
      )}
      
      {/* Expert: Technical details */}
      {expertise === 'expert' && (
        <pre>
          {JSON.stringify({
            flows: event.flows,
            entropy: event.payload_entropy,
            z_score: event.statistical_metrics.z_score
          }, null, 2)}
        </pre>
      )}
    </Modal>
  );
}
```

**4. Learning Progress Tracking**

```typescript
// Track which security concepts user has encountered
function markConceptSeen(concept: string) {
  const { userProfile, updateUserProfile } = useStore.getState();
  
  if (!userProfile.learning_progress.concepts_seen.includes(concept)) {
    updateUserProfile({
      learning_progress: {
        ...userProfile.learning_progress,
        concepts_seen: [
          ...userProfile.learning_progress.concepts_seen,
          concept
        ]
      }
    });
    
    // Show achievement toast
    showSuccess(
      'New Concept Learned!',
      `You've learned about: ${concept}`
    );
  }
}

// Automatically called when viewing events with specific attack types
useEffect(() => {
  if (event.threat_indicators.includes('DNS_TUNNELING')) {
    markConceptSeen('DNS Tunneling');
  }
  if (event.threat_indicators.includes('PORT_SCAN')) {
    markConceptSeen('Port Scanning');
  }
}, [event]);
```

---

### 4.4 Interactive Machine Teaching ✅

**Implementation**: `FeedbackPanel.tsx` (195 lines)  
**Integration**: Event Details Modal  
**AI Technique**: Active learning with user feedback loop

#### Features

**1. Event Labeling System**

Users can provide feedback on each security event:

```typescript
interface EventFeedback {
  event_id: string;
  user_label: 'true_positive' | 'false_positive' | 'missed_detection';
  corrected_severity?: 'critical' | 'high' | 'medium' | 'low';
  user_explanation: string;
  timestamp: string;
  incorporated: boolean; // Has AI learned from this?
}
```

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Was this detection accurate?                │
├─────────────────────────────────────────────┤
│ ○ True Positive (Correct detection)         │
│ ● False Positive (Incorrect alert)          │
│ ○ Missed Detection (Should have alerted)    │
├─────────────────────────────────────────────┤
│ Corrected Severity (optional):              │
│ [Critical] [High] [Medium] [Low]            │
├─────────────────────────────────────────────┤
│ Explain your reasoning:                     │
│ ┌─────────────────────────────────────────┐ │
│ │ This is scheduled backup traffic that   │ │
│ │ occurs every night at 2 AM. Not an      │ │
│ │ attack.                                  │ │
│ └─────────────────────────────────────────┘ │
├─────────────────────────────────────────────┤
│                      [Submit Feedback]      │
└─────────────────────────────────────────────┘
```

**2. Accuracy Tracking**

System maintains running accuracy metrics:

```typescript
function calculateAccuracy() {
  const feedback = Object.values(eventFeedback);
  const truePositives = feedback.filter(
    f => f.user_label === 'true_positive'
  ).length;
  const falsePositives = feedback.filter(
    f => f.user_label === 'false_positive'
  ).length;
  
  const total = truePositives + falsePositives;
  const accuracy = total > 0 ? truePositives / total : 0;
  
  return {
    accuracy: accuracy * 100,
    truePositives,
    falsePositives,
    total
  };
}
```

**Display:**
```
┌─────────────────────────────────────────────┐
│ Detection Accuracy                          │
├─────────────────────────────────────────────┤
│ 87.5%  ████████████████████████████░░░░    │
│                                             │
│ ✓ True Positives:  35                      │
│ ✗ False Positives:  5                      │
│ Total Feedback:    40                      │
└─────────────────────────────────────────────┘
```

**3. Feedback Integration**

User feedback is stored and can be used to improve detection:

```typescript
// Store feedback
function addEventFeedback(feedback: EventFeedback) {
  set((state) => ({
    eventFeedback: {
      ...state.eventFeedback,
      [feedback.event_id]: feedback
    },
    userProfile: {
      ...state.userProfile,
      alert_history: {
        true_positives: state.userProfile.alert_history.true_positives + 
          (feedback.user_label === 'true_positive' ? 1 : 0),
        false_positives: state.userProfile.alert_history.false_positives + 
          (feedback.user_label === 'false_positive' ? 1 : 0),
        missed_detections: state.userProfile.alert_history.missed_detections + 
          (feedback.user_label === 'missed_detection' ? 1 : 0)
      }
    }
  }));
  
  // Send to backend for AI model improvement (future)
  sendFeedbackToBackend(feedback);
}
```

---

### 4.5 Contextual Help & Glossary ✅

**Implementation**: `GlossaryPanel.tsx` (310 lines)  
**Integration**: Accessible via `?` keyboard shortcut  
**AI Technique**: Context-aware content delivery

#### Features

**1. Searchable Security Glossary**

```typescript
interface ConceptDefinition {
  term: string;
  category: 'security' | 'network' | 'statistics' | 'protocol';
  definition: string;
  example?: string;
  related_terms: string[];
}
```

**Glossary Database (Sample):**

```typescript
const glossary: ConceptDefinition[] = [
  {
    term: "DNS Tunneling",
    category: "security",
    definition: "A technique where attackers encode data within DNS queries to bypass firewalls and exfiltrate data.",
    example: "An attacker encodes stolen credit card data into DNS subdomain queries like: cc1234.cc5678.evil.com",
    related_terms: ["DNS", "Exfiltration", "Covert Channel"]
  },
  {
    term: "Z-Score",
    category: "statistics",
    definition: "Measures how many standard deviations a data point is from the mean. Z-score > 3 indicates anomaly.",
    example: "If normal traffic is 100 packets/sec with σ=10, then 140 packets/sec has Z-score = 4.0",
    related_terms: ["Anomaly Detection", "Standard Deviation", "Statistical Analysis"]
  },
  {
    term: "Port Scan",
    category: "security",
    definition: "Systematic probing of network ports to discover open services. Often precedes attacks.",
    example: "Attacker sends SYN packets to ports 1-65535 to map vulnerable services",
    related_terms: ["Reconnaissance", "Network Scanning", "TCP"]
  }
  // ... 50+ more definitions
];
```

**2. Category Filtering**

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Security Glossary                       [X] │
├─────────────────────────────────────────────┤
│ Search: [dns tunneling             ]  [🔍] │
├─────────────────────────────────────────────┤
│ Categories:                                 │
│ [All] [Security] [Network] [Statistics]     │
│       [Protocol]                            │
├─────────────────────────────────────────────┤
│ 📚 DNS Tunneling (Security)                 │
│ A technique where attackers encode data     │
│ within DNS queries to bypass firewalls...   │
│                                             │
│ Example: cc1234.cc5678.evil.com            │
│ Related: DNS, Exfiltration, Covert Channel  │
├─────────────────────────────────────────────┤
│ 📚 DNS (Protocol)                           │
│ Domain Name System translates domain names  │
│ to IP addresses. Runs on UDP port 53...    │
└─────────────────────────────────────────────┘
```

**3. Context-Sensitive Tooltips**

Hovering over technical terms shows inline definitions:

```typescript
function TooltipTerm({ term, children }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const definition = glossary.find(g => g.term === term);
  
  return (
    <span
      className="underline decoration-dotted cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}
      {showTooltip && definition && (
        <div className="tooltip">
          <strong>{definition.term}</strong>
          <p>{definition.definition}</p>
        </div>
      )}
    </span>
  );
}

// Usage in components
<p>
  Detected <TooltipTerm term="DNS Tunneling">DNS tunneling</TooltipTerm> 
  attempt with high <TooltipTerm term="Z-Score">Z-score</TooltipTerm>
</p>
```

**4. Related Terms Navigation**

Clicking related terms navigates through the glossary:

```typescript
function GlossaryEntry({ entry }: Props) {
  const { searchTerm, setSearchTerm } = useGlossary();
  
  return (
    <div className="glossary-entry">
      <h3>{entry.term}</h3>
      <p>{entry.definition}</p>
      
      {entry.related_terms.length > 0 && (
        <div className="related-terms">
          <span>Related:</span>
          {entry.related_terms.map(term => (
            <button
              key={term}
              onClick={() => setSearchTerm(term)}
              className="related-term-link"
            >
              {term}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### 4.6 Keyboard Shortcuts & Accessibility ✅

**Implementation**: `KeyboardShortcuts.tsx` (180 lines)  
**Integration**: Global hotkeys throughout application  
**Purpose**: Power user efficiency + accessibility

#### Keyboard Shortcuts

| Shortcut | Action | Description |
|----------|--------|-------------|
| `?` | Show help | Display keyboard shortcuts guide |
| `Ctrl+,` | Alert config | Open alert configuration modal |
| `Ctrl+K` | Focus search | Jump to search input |
| `Ctrl+N` | New incident | Create new security incident |
| `A` | Toggle anomalies | Filter anomalies only |
| `C` | Clear filters | Remove all active filters |
| `R` | Reset filters | Restore default filters |
| `Tab` | Cycle tabs | Switch between Events/Stats/Topology |
| `Escape` | Close modal | Dismiss current modal/dialog |
| `↑` / `↓` | Navigate events | Move through event list |
| `Enter` | Open details | View selected event details |
| `E` | Export menu | Open export options |
| `S` | Settings | Open notification settings |

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Keyboard Shortcuts                      [X] │
├─────────────────────────────────────────────┤
│ Navigation                                  │
│ Tab          Cycle through main views       │
│ ↑ / ↓        Navigate event list            │
│ Enter        Open event details             │
├─────────────────────────────────────────────┤
│ Filtering & Search                          │
│ Ctrl + K     Focus search bar               │
│ A            Toggle "Anomalies Only"        │
│ C            Clear all filters              │
│ R            Reset to default filters       │
├─────────────────────────────────────────────┤
│ Actions                                     │
│ Ctrl + N     Create new incident            │
│ Ctrl + ,     Alert configuration            │
│ E            Export menu                    │
│ S            Notification settings          │
├─────────────────────────────────────────────┤
│ Help                                        │
│ ?            Show this help dialog          │
│ Esc          Close modals                   │
└─────────────────────────────────────────────┘
```

**Implementation:**

```typescript
export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ignore if typing in input/textarea
      if (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Check for modifier combos
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        handlers.onFocusSearch();
      }
      else if (event.ctrlKey && event.key === 'n') {
        event.preventDefault();
        handlers.onNewIncident();
      }
      else if (event.ctrlKey && event.key === ',') {
        event.preventDefault();
        handlers.onOpenSettings();
      }
      // Single key shortcuts
      else if (event.key === '?') {
        handlers.onShowHelp();
      }
      else if (event.key === 'a' || event.key === 'A') {
        handlers.onToggleAnomalies();
      }
      else if (event.key === 'c' || event.key === 'C') {
        handlers.onClearFilters();
      }
      // ... more shortcuts
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
```

**Accessibility Features:**

- **ARIA Labels**: All interactive elements have descriptive labels
- **Keyboard Navigation**: Full functionality without mouse
- **Focus Management**: Modals trap focus, Escape always closes
- **Screen Reader Support**: Semantic HTML with ARIA roles
- **High Contrast**: Meets WCAG 2.1 AA standards
- **Reduced Motion**: Respects `prefers-reduced-motion` CSS media query

```typescript
// Example: Accessible button
<button
  onClick={handleClick}
  aria-label="Filter events by critical severity"
  aria-pressed={filters.severities.includes('critical')}
  className="filter-button"
>
  Critical
</button>
```

---

## 5. Core Functionality

This section covers the primary features that enable real-time network monitoring and analysis.

### 5.1 Real-Time Event Streaming ✅

**Implementation**: `EventStream.tsx` + WebSocket Hook  
**Update Rate**: ~2-5 events/second  
**Buffer Size**: 200 events (10 minutes retention)

#### WebSocket Connection

```typescript
// Auto-reconnecting WebSocket with exponential backoff
export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [reconnectDelay, setReconnectDelay] = useState(1000);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket('ws://localhost:8000/ws');
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        setConnected(true);
        setReconnectDelay(1000); // Reset backoff
        showSuccess('Connected', 'Real-time streaming active');
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleMessage(message);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        showError('Connection error', 'Failed to connect to backend');
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setConnected(false);
        
        // Exponential backoff: 1s → 2s → 4s → 8s → 16s (max)
        const nextDelay = Math.min(reconnectDelay * 2, 16000);
        setReconnectDelay(nextDelay);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log(`🔄 Reconnecting in ${nextDelay}ms...`);
          connect();
        }, nextDelay);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, [reconnectDelay]);
  
  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);
  
  return { connected, reconnect: connect };
}
```

#### Message Handling

```typescript
function handleMessage(message: WebSocketMessage) {
  const { addEvent, updateStatus, addAIMessage } = useStore.getState();
  
  switch (message.type) {
    case 'network_event':
      // Add event with deduplication
      const event = message.data as NetworkEvent;
      const isDuplicate = events.some(e => 
        e.timestamp === event.timestamp &&
        e.src === event.src &&
        e.dst === event.dst
      );
      if (!isDuplicate) {
        addEvent(event);
        
        // Show toast for critical anomalies
        if (event.anomaly_score > 0.8) {
          showWarning(
            `⚠️ Critical Anomaly: ${event.summary}`,
            `Score: ${event.anomaly_score.toFixed(2)}`
          );
        }
      }
      break;
      
    case 'system_status':
      updateStatus(message.data as SystemStatus);
      break;
      
    case 'ai_response':
      addAIMessage(message.data as AIMessage);
      break;
  }
}
```

#### Event Deduplication

Prevents duplicate events during reconnections:

```typescript
// Composite key: timestamp + src + dst + proto
const eventKey = (e: NetworkEvent) => 
  `${e.timestamp}-${e.src}-${e.dst}-${e.proto}`;

const seenKeys = new Set<string>();

function addEvent(event: NetworkEvent) {
  const key = eventKey(event);
  if (seenKeys.has(key)) {
    console.log('Skipping duplicate event:', key);
    return;
  }
  
  seenKeys.add(key);
  set((state) => ({
    events: [...state.events, event].slice(-200) // Keep last 200
  }));
}
```

---

### 5.2 Advanced Filtering & Search ✅

**Implementation**: `FilterBar.tsx` (340 lines)  
**Performance**: Memoized filtering with <10ms latency

#### Filter Types

**1. Text Search**

```typescript
// Searches: IP addresses, ports, protocols, summary text
const matchesSearch = (event: NetworkEvent, query: string) => {
  const q = query.toLowerCase();
  return (
    event.src.includes(q) ||
    event.dst.includes(q) ||
    event.proto.toLowerCase().includes(q) ||
    event.src_port?.toString().includes(q) ||
    event.dst_port?.toString().includes(q) ||
    event.summary.toLowerCase().includes(q)
  );
};
```

**2. Severity Filter**

```typescript
const SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low', 'normal'];

const matchesSeverity = (event: NetworkEvent, severities: string[]) => {
  if (severities.length === 0) return true;
  
  const eventSeverity = getSeverity(event.anomaly_score);
  return severities.includes(eventSeverity);
};

function getSeverity(score: number): string {
  if (score >= 0.9) return 'critical';
  if (score >= 0.7) return 'high';
  if (score >= 0.5) return 'medium';
  if (score >= 0.3) return 'low';
  return 'normal';
}
```

**3. Protocol Filter**

Supports: TCP, UDP, ICMP, DNS, HTTP, HTTPS, SSH, FTP, SMTP

```typescript
const matchesProtocol = (event: NetworkEvent, protocols: string[]) => {
  if (protocols.length === 0) return true;
  return protocols.includes(event.proto.toUpperCase());
};
```

**4. Time Range Filter**

```typescript
const TIME_RANGES = {
  '5m': 5 * 60 * 1000,
  '15m': 15 * 60 * 1000,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  'all': Infinity
};

const matchesTimeRange = (event: NetworkEvent, range: string) => {
  if (range === 'all') return true;
  
  const eventTime = new Date(event.timestamp).getTime();
  const cutoff = Date.now() - TIME_RANGES[range];
  return eventTime >= cutoff;
};
```

**5. Anomaly Toggle**

```typescript
const matchesAnomalyFilter = (event: NetworkEvent, onlyAnomalies: boolean) => {
  return !onlyAnomalies || event.is_anomaly;
};
```

#### Combined Filtering Logic

```typescript
const filteredEvents = useMemo(() => {
  return events.filter(event => {
    // All filters must pass (AND logic)
    if (filters.searchQuery && !matchesSearch(event, filters.searchQuery)) {
      return false;
    }
    if (filters.severities.length > 0 && !matchesSeverity(event, filters.severities)) {
      return false;
    }
    if (filters.protocols.length > 0 && !matchesProtocol(event, filters.protocols)) {
      return false;
    }
    if (!matchesTimeRange(event, filters.timeRange)) {
      return false;
    }
    if (!matchesAnomalyFilter(event, filters.onlyAnomalies)) {
      return false;
    }
    return true;
  });
}, [events, filters]);
```

#### Filter Persistence

Filters are persisted to localStorage:

```typescript
const useStore = create<UIState>()(
  persist(
    (set, get) => ({
      filters: DEFAULT_FILTERS,
      setFilters: (updates) => set((state) => ({
        filters: { ...state.filters, ...updates }
      }))
    }),
    {
      name: 'packetflow-storage',
      partialize: (state) => ({
        filters: state.filters
      })
    }
  )
);
```

---

### 5.3 Data Visualization ✅

**Implementation**: Recharts + D3.js  
**Chart Types**: Line, Bar, Pie, Force-Directed Graph

#### 1. GraphView (Time Series)

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function GraphView({ events }: Props) {
  // Aggregate events into time buckets
  const chartData = useMemo(() => {
    const buckets = new Map<string, number>();
    
    events.forEach(event => {
      const time = dayjs(event.timestamp).format('HH:mm:ss');
      buckets.set(time, (buckets.get(time) || 0) + 1);
    });
    
    return Array.from(buckets.entries()).map(([time, count]) => ({
      time,
      events: count
    }));
  }, [events]);
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <XAxis dataKey="time" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1e2537', 
            border: '1px solid #334155' 
          }} 
        />
        <Line 
          type="monotone" 
          dataKey="events" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Event Timeline                              │
├─────────────────────────────────────────────┤
│  50│                    ╱╲                   │
│    │                   ╱  ╲                  │
│  25│        ╱╲       ╱      ╲    ╱╲         │
│    │       ╱  ╲    ╱          ╲╱  ╲        │
│   0│─────╱────╲──╱──────────────────╲─────│
│    └─────────────────────────────────────── │
│     14:30  14:32  14:34  14:36  14:38      │
└─────────────────────────────────────────────┘
```

#### 2. StatsDashboard (Multiple Charts)

```typescript
function StatsDashboard() {
  const events = useStore((state) => state.events);
  
  // Protocol distribution (Pie Chart)
  const protocolData = useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach(e => {
      counts.set(e.proto, (counts.get(e.proto) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }, [events]);
  
  // Severity distribution (Bar Chart)
  const severityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, normal: 0 };
    events.forEach(e => {
      const severity = getSeverity(e.anomaly_score);
      counts[severity]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      fill: SEVERITY_COLORS[name]
    }));
  }, [events]);
  
  return (
    <div className="stats-grid">
      {/* Protocol Pie Chart */}
      <div className="chart-card">
        <h3>Protocol Distribution</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={protocolData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Severity Bar Chart */}
      <div className="chart-card">
        <h3>Severity Levels</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={severityData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

#### 3. TopologyView (Network Graph)

```typescript
import * as d3 from 'd3';

function TopologyView({ events }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!svgRef.current) return;
    
    // Build node/link graph from events
    const nodes = new Map<string, Node>();
    const links: Link[] = [];
    
    events.forEach(event => {
      // Add source node
      if (!nodes.has(event.src)) {
        nodes.set(event.src, {
          id: event.src,
          type: 'host',
          anomaly_count: 0
        });
      }
      
      // Add destination node
      if (!nodes.has(event.dst)) {
        nodes.set(event.dst, {
          id: event.dst,
          type: 'host',
          anomaly_count: 0
        });
      }
      
      // Increment anomaly counts
      if (event.is_anomaly) {
        nodes.get(event.src)!.anomaly_count++;
      }
      
      // Add link
      links.push({
        source: event.src,
        target: event.dst,
        protocol: event.proto,
        is_anomaly: event.is_anomaly
      });
    });
    
    // D3 Force Simulation
    const simulation = d3.forceSimulation(Array.from(nodes.values()))
      .force('link', d3.forceLink(links).id((d: any) => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(400, 300));
    
    // Render nodes and links
    const svg = d3.select(svgRef.current);
    
    const link = svg.selectAll('.link')
      .data(links)
      .join('line')
      .attr('class', 'link')
      .attr('stroke', d => d.is_anomaly ? '#ef4444' : '#334155')
      .attr('stroke-width', 2);
    
    const node = svg.selectAll('.node')
      .data(Array.from(nodes.values()))
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => 8 + d.anomaly_count * 2)
      .attr('fill', d => d.anomaly_count > 0 ? '#ef4444' : '#3b82f6')
      .call(drag(simulation) as any);
    
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
    });
    
    return () => {
      simulation.stop();
    };
  }, [events]);
  
  return <svg ref={svgRef} width={800} height={600} />;
}
```

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Network Topology                            │
├─────────────────────────────────────────────┤
│        ●────────────────●                   │
│    192.168.1.10      8.8.8.8               │
│        │                                     │
│        │                                     │
│        ●─────────●                          │
│   192.168.1.15   1.1.1.1                   │
│        │                                     │
│        ●                                     │
│   192.168.1.20                             │
│                                             │
│ Legend:                                     │
│ ● Normal Host  ● Anomalous Host            │
│ ──── Normal    ──── Anomaly                │
└─────────────────────────────────────────────┘
```

---

### 5.4 Alert Configuration System ✅

**Implementation**: `AlertConfigModal.tsx` (450 lines)  
**Features**: Custom thresholds, IP lists, rules engine

#### Alert Configuration Structure

```typescript
interface AlertConfiguration {
  // Global sensitivity (0-100)
  sensitivity: number;
  
  // Threshold values
  thresholds: {
    anomaly_score: number;    // 0.0 - 1.0
    flow_rate: number;        // flows/sec
    packet_rate: number;      // packets/sec
    byte_rate: number;        // bytes/sec
  };
  
  // IP Lists
  whitelist: IPListEntry[];
  blacklist: IPListEntry[];
  
  // Custom Rules
  rules: AlertRule[];
  
  // Notification Preferences
  notifications: {
    sound_enabled: boolean;
    toast_enabled: boolean;
    auto_create_incident: boolean;
  };
}
```

#### Custom Rules Engine

```typescript
interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    field: 'src' | 'dst' | 'proto' | 'anomaly_score' | 'flows';
    operator: '==' | '!=' | '>' | '<' | 'contains';
    value: string | number;
  }[];
  actions: ('notify' | 'create_incident' | 'log' | 'sound')[];
  severity: 'critical' | 'high' | 'medium' | 'low';
}
```

**Example Rules:**

```typescript
const exampleRules: AlertRule[] = [
  {
    id: 'rule-1',
    name: 'Critical External Access',
    enabled: true,
    conditions: [
      { field: 'dst', operator: 'contains', value: '8.8.8.8' },
      { field: 'anomaly_score', operator: '>', value: 0.8 }
    ],
    actions: ['notify', 'create_incident', 'sound'],
    severity: 'critical'
  },
  {
    id: 'rule-2',
    name: 'Port Scan Detection',
    enabled: true,
    conditions: [
      { field: 'flows', operator: '>', value: 100 },
      { field: 'proto', operator: '==', value: 'TCP' }
    ],
    actions: ['notify', 'log'],
    severity: 'high'
  }
];
```

#### Rule Evaluation

```typescript
export function evaluateRules(
  event: NetworkEvent, 
  rules: AlertRule[]
): AlertRule[] {
  return rules.filter(rule => {
    if (!rule.enabled) return false;
    
    // All conditions must match (AND logic)
    return rule.conditions.every(condition => {
      const eventValue = event[condition.field];
      
      switch (condition.operator) {
        case '==':
          return eventValue === condition.value;
        case '!=':
          return eventValue !== condition.value;
        case '>':
          return Number(eventValue) > Number(condition.value);
        case '<':
          return Number(eventValue) < Number(condition.value);
        case 'contains':
          return String(eventValue).includes(String(condition.value));
        default:
          return false;
      }
    });
  });
}

// Usage
const matchedRules = evaluateRules(event, alertConfig.rules);
if (matchedRules.length > 0) {
  matchedRules.forEach(rule => {
    rule.actions.forEach(action => {
      switch (action) {
        case 'notify':
          showWarning(rule.name, `Event matched: ${event.summary}`);
          break;
        case 'create_incident':
          createIncidentFromEvent(event, rule.severity);
          break;
        case 'sound':
          playAlertSound();
          break;
        case 'log':
          console.log(`[${rule.name}]`, event);
          break;
      }
    });
  });
}
```

---

### 5.5 Incident Management ✅

**Implementation**: `IncidentPanel.tsx` + `incidents/` components  
**Features**: Create, track, resolve security incidents

#### Incident Data Structure

```typescript
interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  tags: string[];
  related_events: string[]; // Event IDs
  notes: IncidentNote[];
}

interface IncidentNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}
```

#### Creating Incidents

```typescript
function createIncidentFromEvents(events: NetworkEvent[]) {
  const incident: Incident = {
    id: `inc-${Date.now()}`,
    title: generateIncidentTitle(events),
    description: generateIncidentDescription(events),
    severity: getHighestSeverity(events),
    status: 'open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    tags: extractTags(events),
    related_events: events.map(e => e.id),
    notes: []
  };
  
  addIncident(incident);
  selectIncident(incident.id); // Auto-open details
  
  showSuccess('Incident Created', incident.title);
}

function generateIncidentTitle(events: NetworkEvent[]): string {
  const primaryEvent = events[0];
  const threatType = primaryEvent.threat_indicators[0] || 'Security Event';
  return `${threatType}: ${primaryEvent.src} → ${primaryEvent.dst}`;
}
```

#### Incident Workflow

**Screenshot Description:**
```
┌─────────────────────────────────────────────┐
│ Incidents (12)                    [+ New]   │
├─────────────────────────────────────────────┤
│ 🔴 DNS Tunneling: 192.168.1.50 → 8.8.8.8   │
│    Critical | Open | 2 min ago             │
│    Tags: dns, exfiltration, c2             │
├─────────────────────────────────────────────┤
│ 🟠 Port Scan: 10.0.0.100 → Internal       │
│    High | Investigating | 15 min ago       │
│    Assigned: John Doe                       │
│    Tags: reconnaissance, scanning           │
├─────────────────────────────────────────────┤
│ 🟡 Unusual HTTP Traffic                     │
│    Medium | Resolved | 1 hour ago          │
│    Tags: http, false-positive              │
└─────────────────────────────────────────────┘

Click incident to view details and add notes
```

#### Incident Details Modal

```typescript
function IncidentDetailsModal({ incident }: Props) {
  const relatedEvents = useStore((state) => 
    state.events.filter(e => incident.related_events.includes(e.id))
  );
  
  return (
    <Modal>
      <header>
        <h2>{incident.title}</h2>
        <StatusBadge status={incident.status} />
        <SeverityBadge severity={incident.severity} />
      </header>
      
      <section className="incident-details">
        <p>{incident.description}</p>
        
        <div className="metadata">
          <div>Created: {dayjs(incident.created_at).fromNow()}</div>
          <div>Updated: {dayjs(incident.updated_at).fromNow()}</div>
          {incident.assigned_to && (
            <div>Assigned: {incident.assigned_to}</div>
          )}
        </div>
        
        <div className="tags">
          {incident.tags.map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      </section>
      
      <section className="related-events">
        <h3>Related Events ({relatedEvents.length})</h3>
        {relatedEvents.map(event => (
          <EventSummary key={event.id} event={event} />
        ))}
      </section>
      
      <section className="notes">
        <h3>Notes ({incident.notes.length})</h3>
        {incident.notes.map(note => (
          <Note key={note.id} note={note} />
        ))}
        <NoteInput incidentId={incident.id} />
      </section>
      
      <footer>
        <button onClick={handleStatusChange}>Change Status</button>
        <button onClick={handleDelete}>Delete</button>
      </footer>
    </Modal>
  );
}
```

---

### 5.6 Export Functionality ✅

**Implementation**: `ExportMenu.tsx` + `utils/export.ts`  
**Formats**: CSV, JSON, TXT Report

#### Export Functions

```typescript
// CSV Export
export function exportToCSV(events: NetworkEvent[]): void {
  const headers = [
    'Timestamp', 'Source', 'Destination', 'Protocol',
    'Flows', 'Bytes', 'Anomaly Score', 'Is Anomaly', 'Summary'
  ];
  
  const rows = events.map(e => [
    e.timestamp,
    e.src,
    e.dst,
    e.proto,
    e.flows,
    e.total_bytes,
    e.anomaly_score.toFixed(3),
    e.is_anomaly ? 'Yes' : 'No',
    `"${e.summary}"`
  ]);
  
  const csv = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  downloadFile(csv, `packetflow-events-${timestamp()}.csv`, 'text/csv');
}

// JSON Export
export function exportToJSON(events: NetworkEvent[]): void {
  const json = JSON.stringify(events, null, 2);
  downloadFile(json, `packetflow-events-${timestamp()}.json`, 'application/json');
}

// Text Report Export
export function exportToTextReport(events: NetworkEvent[]): void {
  const report = `
PacketFlow Event Report
Generated: ${new Date().toISOString()}
Total Events: ${events.length}

==============================================

${events.map((e, i) => `
Event #${i + 1}
--------------
Timestamp: ${e.timestamp}
Source: ${e.src}${e.src_port ? `:${e.src_port}` : ''}
Destination: ${e.dst}${e.dst_port ? `:${e.dst_port}` : ''}
Protocol: ${e.proto}
Flows: ${e.flows}
Bytes: ${e.total_bytes.toLocaleString()}
Anomaly Score: ${e.anomaly_score.toFixed(3)}
Is Anomaly: ${e.is_anomaly ? 'YES' : 'No'}
Detection Methods: ${e.detection_methods?.join(', ') || 'N/A'}
Threat Indicators: ${e.threat_indicators?.join(', ') || 'None'}

Summary:
${e.summary}

AI Explanation:
${e.ai_explanation || 'Not available'}
`).join('\n\n')}

==============================================
End of Report
`.trim();
  
  downloadFile(report, `packetflow-report-${timestamp()}.txt`, 'text/plain');
}

// Utility
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timestamp(): string {
  return dayjs().format('YYYY-MM-DD-HHmmss');
}
```

---

## 6. User Interface Components

This section provides detailed descriptions of all major UI components and their interactions.

### 6.1 Main Application Layout

```typescript
// App.tsx structure
function App() {
  return (
    <div className="app-container">
      {/* Top Bar */}
      <MetricsBar />
      
      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Panel (Resizable) */}
        <div className="left-panel" style={{ width: leftPanelWidth }}>
          {leftPanelTab === 'chat' ? <ChatPanel /> : <IncidentPanel />}
        </div>
        
        {/* Resize Handle */}
        <div className="resize-handle" onMouseDown={startResize} />
        
        {/* Center Panel */}
        <div className="center-panel">
          {/* Proactive Suggestions */}
          <ProactiveSuggestions />
          
          {/* Tab Switcher */}
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          
          {/* Content */}
          {activeTab === 'events' && (
            <>
              <FilterBar />
              <EventStream />
              <GraphView />
            </>
          )}
          {activeTab === 'stats' && <StatsDashboard />}
          {activeTab === 'topology' && <TopologyView />}
        </div>
      </div>
      
      {/* Modals */}
      {showEventDetails && <EventDetailsModal />}
      {showAlertConfig && <AlertConfigModal />}
      {showGlossary && <GlossaryPanel />}
      
      {/* Global Components */}
      <ToastContainer />
      <KeyboardShortcutHint />
    </div>
  );
}
```

**Layout Screenshot Description:**
```
┌─────────────────────────────────────────────────────────────┐
│ ● PacketFlow    Events: 156  Anomalies: 12  Connected ✓   │ MetricsBar
├──────────────┬──────────────────────────────────────────────┤
│ Chat Panel   │  [ Events | Stats | Topology ]              │
│              │  ⚠️  High Priority Suggestion...            │ Proactive
│ AI Assistant │  ───────────────────────────────────────────│ Suggestions
│              │                                              │
│ > Analyze... │  Search: [___________] [Anomalies Only]     │ FilterBar
│ > What is... │  ───────────────────────────────────────────│
│              │  ⚡ 14:35:12 | 192.168.1.50 → 8.8.8.8      │
│ ──────────── │  DNS | Score: 0.92 | CRITICAL               │ EventStream
│              │  DNS tunneling detected...                   │
│ Incidents    │                                              │
│ (12)         │  ⚡ 14:35:10 | 192.168.1.15 → 1.1.1.1      │
│              │  HTTP | Score: 0.45 | MEDIUM                │
│ 🔴 DNS...    │  Elevated traffic volume...                 │
│ 🟠 Port...   │                                              │
│              │  ───────────────────────────────────────────│
│              │  Graph View ▼                                │ GraphView
│              │  ┌─────────────────────────────────────────┐│
│              │  │      /\                                  ││
│              │  │     /  \      /\                         ││
│              │  │   /      \  /    \                       ││
│              │  └─────────────────────────────────────────┘│
└──────────────┴──────────────────────────────────────────────┘
     ↑                               ↑
 Resizable                    Main Content Area
Left Panel (500px)
```

---

### 6.2 MetricsBar Component

Displays real-time system metrics at the top of the screen.

```typescript
interface MetricsBarProps {
  // No props needed - reads from store
}

function MetricsBar() {
  const status = useStore((state) => state.status);
  const events = useStore((state) => state.events);
  const connected = useStore((state) => state.connected);
  
  const anomalyCount = events.filter(e => e.is_anomaly).length;
  const criticalCount = events.filter(e => e.anomaly_score > 0.9).length;
  
  return (
    <div className="metrics-bar">
      <div className="app-title">
        <span className="logo">●</span> PacketFlow
      </div>
      
      <div className="metrics">
        <Metric
          icon={<Activity />}
          label="Events"
          value={events.length}
        />
        <Metric
          icon={<AlertTriangle />}
          label="Anomalies"
          value={anomalyCount}
          critical={criticalCount > 0}
        />
        <Metric
          icon={<TrendingUp />}
          label="Rate"
          value={`${status?.packets_per_second || 0}/s`}
        />
      </div>
      
      <div className="connection-status">
        <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '✓ Connected' : '✗ Disconnected'}
        </div>
        <button onClick={openSettings} aria-label="Notification settings">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
```

---

### 6.3 EventStream Component

Displays scrollable list of network events with infinite scroll.

```typescript
function EventStream() {
  const events = useStore((state) => state.events);
  const filters = useStore((state) => state.filters);
  const selectEvent = useStore((state) => state.selectEvent);
  
  const filteredEvents = useMemo(() => 
    filterEvents(events, filters), 
    [events, filters]
  );
  
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMore = () => setVisibleCount(v => v + 20);
  
  return (
    <div className="event-stream">
      {/* Empty State */}
      {filteredEvents.length === 0 && (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>No events match your filters</p>
          <button onClick={resetFilters}>Clear Filters</button>
        </div>
      )}
      
      {/* Event List */}
      <div className="event-list">
        {filteredEvents.slice(0, visibleCount).map(event => (
          <EventCard
            key={event.id}
            event={event}
            onClick={() => selectEvent(event.id)}
          />
        ))}
      </div>
      
      {/* Load More */}
      {visibleCount < filteredEvents.length && (
        <button onClick={loadMore} className="load-more">
          Load More ({filteredEvents.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
```

**EventCard Component:**

```typescript
function EventCard({ event, onClick }: Props) {
  const severity = getSeverity(event.anomaly_score);
  const severityColor = SEVERITY_COLORS[severity];
  
  return (
    <div 
      className={`event-card ${event.is_anomaly ? 'anomaly' : ''}`}
      onClick={onClick}
      style={{ borderLeftColor: severityColor }}
    >
      <div className="event-header">
        <span className="timestamp">
          {dayjs(event.timestamp).format('HH:mm:ss')}
        </span>
        <span className="protocol-badge">{event.proto}</span>
        {event.is_anomaly && (
          <span className="anomaly-badge" style={{ backgroundColor: severityColor }}>
            {severity.toUpperCase()}
          </span>
        )}
      </div>
      
      <div className="event-body">
        <div className="endpoints">
          <span className="source">{event.src}</span>
          <ArrowRight size={16} />
          <span className="destination">{event.dst}</span>
        </div>
        
        <p className="summary">{event.summary}</p>
        
        {event.threat_indicators && event.threat_indicators.length > 0 && (
          <div className="threat-indicators">
            {event.threat_indicators.map(indicator => (
              <span key={indicator} className="threat-tag">
                {indicator}
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="event-footer">
        <span className="flows">Flows: {event.flows}</span>
        <span className="bytes">{formatBytes(event.total_bytes)}</span>
        {event.anomaly_score > 0 && (
          <span className="score">
            Score: {event.anomaly_score.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
```

---

### 6.4 ChatPanel Component

AI-powered interactive chat for network analysis queries.

```typescript
function ChatPanel() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messages = useStore((state) => [...state.aiMessages, ...state.userMessages]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage: UserMessage = {
      id: `msg-${Date.now()}`,
      content: input,
      timestamp: new Date().toISOString(),
      sender: 'user'
    };
    
    addUserMessage(userMessage);
    setInput('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      });
      
      const data = await response.json();
      
      const aiMessage: AIMessage = {
        id: `ai-${Date.now()}`,
        content: data.answer,
        timestamp: new Date().toISOString(),
        sender: 'ai',
        confidence: data.confidence || 0.8
      };
      
      addAIMessage(aiMessage);
    } catch (error) {
      showError('Query failed', 'Could not reach AI assistant');
    } finally {
      setLoading(false);
    }
    
    // Auto-scroll
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  return (
    <div className="chat-panel">
      <div className="chat-header">
        <Brain size={20} />
        <h3>AI Assistant</h3>
      </div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <MessageSquare size={48} opacity={0.3} />
            <p>Ask me anything about network security</p>
            <div className="suggestions">
              <button onClick={() => setInput('What is DNS tunneling?')}>
                What is DNS tunneling?
              </button>
              <button onClick={() => setInput('Analyze recent anomalies')}>
                Analyze recent anomalies
              </button>
              <button onClick={() => setInput('Show top threats')}>
                Show top threats
              </button>
            </div>
          </div>
        )}
        
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        
        {loading && (
          <div className="loading-indicator">
            <Loader className="spin" />
            <span>AI is thinking...</span>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>
      
      <div className="chat-input">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask about network security..."
          rows={3}
        />
        <button 
          onClick={sendMessage} 
          disabled={loading || !input.trim()}
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
```

---

### 6.5 Toast Notification System

Non-intrusive notifications for important events.

```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
  timestamp: string;
}

function ToastContainer() {
  const { toasts, removeToast } = useToast();
  
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }: Props) {
  const [progress, setProgress] = useState(100);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.max(0, p - (100 / (toast.duration / 100))));
    }, 100);
    
    const timeout = setTimeout(onDismiss, toast.duration);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);
  
  const icons = {
    success: <CheckCircle />,
    error: <XCircle />,
    warning: <AlertTriangle />,
    info: <Info />
  };
  
  const colors = {
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  };
  
  return (
    <div 
      className={`toast toast-${toast.type}`}
      style={{ borderLeftColor: colors[toast.type] }}
    >
      <div className="toast-icon" style={{ color: colors[toast.type] }}>
        {icons[toast.type]}
      </div>
      
      <div className="toast-content">
        <div className="toast-title">{toast.title}</div>
        <div className="toast-message">{toast.message}</div>
      </div>
      
      <button onClick={onDismiss} className="toast-close">
        <X size={16} />
      </button>
      
      <div 
        className="toast-progress" 
        style={{ 
          width: `${progress}%`,
          backgroundColor: colors[toast.type]
        }}
      />
    </div>
  );
}
```

---

## 7. Implementation Details

### 7.1 State Management with Zustand

**Why Zustand?**
- Minimal boilerplate compared to Redux
- Built-in TypeScript support
- localStorage persistence middleware
- No context provider needed
- ~1KB bundle size

**Store Structure:**

```typescript
const useStore = create<UIState>()(
  persist(
    (set, get) => ({
      // ============ STATE ============
      events: [],
      aiMessages: [],
      userMessages: [],
      status: null,
      incidents: [],
      connected: false,
      selectedEventId: null,
      selectedIncidentId: null,
      filters: DEFAULT_FILTERS,
      alertConfig: DEFAULT_ALERT_CONFIG,
      userProfile: DEFAULT_USER_PROFILE,
      suggestions: [],
      eventFeedback: {},
      
      // ============ ACTIONS ============
      addEvent: (event) => set((state) => ({
        events: [...state.events, event].slice(-200)
      })),
      
      setFilters: (updates) => set((state) => ({
        filters: { ...state.filters, ...updates }
      })),
      
      updateUserProfile: (updates) => set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
      })),
      
      // ... 40+ more actions
    }),
    {
      name: 'packetflow-storage',
      partialize: (state) => ({
        // Only persist these fields
        filters: state.filters,
        alertConfig: state.alertConfig,
        userProfile: state.userProfile,
        incidents: state.incidents,
        eventFeedback: state.eventFeedback
      })
    }
  )
);
```

**Usage in Components:**

```typescript
// Subscribe to specific state
function MyComponent() {
  const events = useStore((state) => state.events);
  const addEvent = useStore((state) => state.addEvent);
  
  // Component re-renders only when events change
  return <div>{events.length} events</div>;
}

// Access store outside components
function utilityFunction() {
  const { events, filters } = useStore.getState();
  return filterEvents(events, filters);
}
```

---

### 7.2 Performance Optimizations

**1. Memoization**

```typescript
// Expensive filtering operation cached
const filteredEvents = useMemo(() => {
  return events.filter(event => {
    // Complex filtering logic
  });
}, [events, filters]); // Only recompute when dependencies change
```

**2. Virtual Scrolling (Future Enhancement)**

```typescript
// For large event lists (1000+)
import { FixedSizeList } from 'react-window';

function EventStreamVirtual({ events }: Props) {
  return (
    <FixedSizeList
      height={600}
      itemCount={events.length}
      itemSize={80}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <EventCard event={events[index]} />
        </div>
      )}
    </FixedSizeList>
  );
}
```

**3. Debouncing Search Input**

```typescript
import { useDebouncedValue } from './hooks/useDebounce';

function FilterBar() {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  
  useEffect(() => {
    setFilters({ searchQuery: debouncedSearch });
  }, [debouncedSearch]);
  
  return <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />;
}
```

**4. Code Splitting**

```typescript
// Lazy load heavy components
const ThreeDTopologyModal = lazy(() => import('./components/ThreeDTopologyModal'));
const StatsDashboard = lazy(() => import('./components/core/StatsDashboard'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {show3DTopology && <ThreeDTopologyModal />}
    </Suspense>
  );
}
```

---

### 7.3 Error Handling

**Global Error Boundary:**

```typescript
class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error:', error, errorInfo);
    // Send to error tracking service (e.g., Sentry)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-screen">
          <AlertTriangle size={64} />
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

**API Error Handling:**

```typescript
async function fetchWithErrorHandling(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      showError('Network Error', 'Could not connect to backend');
    } else {
      showError('Request Failed', error.message);
    }
    throw error;
  }
}
```

---

### 7.4 Accessibility Implementation

**1. Semantic HTML**

```typescript
// Use proper semantic tags
<nav>...</nav>
<main>...</main>
<aside>...</aside>
<article>...</article>
```

**2. ARIA Labels**

```typescript
<button
  onClick={handleFilter}
  aria-label="Filter events by critical severity"
  aria-pressed={filters.severities.includes('critical')}
>
  Critical
</button>

<div role="alert" aria-live="assertive">
  {errorMessage}
</div>
```

**3. Keyboard Navigation**

```typescript
function EventList({ events }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(events.length - 1, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(0, i - 1));
        break;
      case 'Enter':
        selectEvent(events[selectedIndex].id);
        break;
    }
  };
  
  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {events.map((event, index) => (
        <div
          key={event.id}
          className={index === selectedIndex ? 'selected' : ''}
          tabIndex={-1}
        >
          <EventCard event={event} />
        </div>
      ))}
    </div>
  );
}
```

**4. Focus Management**

```typescript
function Modal({ isOpen, onClose, children }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      // Save previously focused element
      const previouslyFocused = document.activeElement as HTMLElement;
      
      // Focus first focusable element in modal
      const focusable = modalRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      focusable?.focus();
      
      // Restore focus on close
      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);
  
  // Trap focus within modal
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    
    if (e.key === 'Tab') {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;
      
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };
  
  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}
```

---

## 8. Testing & Validation

### 8.1 Development Testing

**Running the Application:**

```powershell
# Terminal 1: Start Backend
cd backend
python main.py  # Runs on :8000

# Terminal 2: Start Frontend
cd frontend
npm install
npm run dev  # Runs on :5173

# Terminal 3: Start Ollama (for AI features)
ollama serve
ollama pull mistral:7b
```

**Configuration (.env):**

```env
# Backend .env
MOCK_MODE=true  # Use mock data for testing
PCAP_FILE=  # Empty for live capture
AI_MODE=local  # Use Ollama
OLLAMA_URL=http://localhost:11434
AI_MODEL=mistral:7b
```

---

### 8.2 Manual Testing Checklist

**✅ Core Functionality:**
- [ ] WebSocket connects automatically
- [ ] Events stream in real-time
- [ ] Events display with correct formatting
- [ ] Anomalies highlighted with severity colors
- [ ] Connection status updates correctly

**✅ Filtering:**
- [ ] Search by IP address works
- [ ] Severity filters apply correctly
- [ ] Protocol filters work
- [ ] "Anomalies Only" toggle functions
- [ ] Time range selector filters events
- [ ] "Clear All" resets filters

**✅ Visualizations:**
- [ ] Graph shows event timeline
- [ ] Stats dashboard displays charts
- [ ] Topology view renders network graph
- [ ] 3D topology opens and renders

**✅ Intelligent Features:**
- [ ] AI explanations appear for anomalies
- [ ] Proactive suggestions generate automatically
- [ ] Suggestions dismissible and don't reappear
- [ ] Glossary searchable and displays definitions
- [ ] User profile tracks interactions

**✅ Incident Management:**
- [ ] Can create incidents manually
- [ ] Incidents auto-created from alerts (if configured)
- [ ] Incident details modal opens
- [ ] Can add notes to incidents
- [ ] Can change incident status
- [ ] Incidents persist across sessions

**✅ Alerts:**
- [ ] Toast notifications appear for critical events
- [ ] Sound plays (if enabled)
- [ ] Alert configuration modal opens
- [ ] Custom rules evaluate correctly
- [ ] IP whitelist/blacklist works

**✅ Export:**
- [ ] CSV export downloads
- [ ] JSON export downloads
- [ ] Text report generates correctly
- [ ] Exported files named with timestamp

**✅ Accessibility:**
- [ ] All keyboard shortcuts work
- [ ] Tab navigation functional
- [ ] ARIA labels present
- [ ] Focus management in modals
- [ ] High contrast readable

---

### 8.3 Performance Testing

**Metrics to Monitor:**

```typescript
// Add performance tracking
useEffect(() => {
  const startTime = performance.now();
  
  // Expensive operation
  const filtered = filterEvents(events, filters);
  
  const endTime = performance.now();
  console.log(`Filtering took ${(endTime - startTime).toFixed(2)}ms`);
}, [events, filters]);
```

**Expected Performance:**
- Event filtering: <10ms for 200 events
- Chart rendering: <50ms
- WebSocket message handling: <5ms
- State update: <1ms
- Initial page load: <2 seconds

---

### 8.4 Browser Compatibility

**Tested Browsers:**
- ✅ Chrome 120+ (Recommended)
- ✅ Firefox 121+
- ✅ Edge 120+
- ✅ Safari 17+

**Known Issues:**
- Safari: WebSocket reconnection slightly slower
- Firefox: 3D topology performance reduced

---

## 9. Prototype Screenshots

*Note: The following are detailed descriptions of what the screenshots would show. Actual screenshots should be captured from the running application.*

### Screenshot 1: Main Dashboard

**Description:**
Full application view showing the complete interface with all major components visible.

**Key Elements:**
- Top: MetricsBar showing "156 Events", "12 Anomalies", "2.3/s Rate", "✓ Connected"
- Left Panel: ChatPanel with AI assistant showing 3 message exchanges
- Center: EventStream with 8 visible events, color-coded by severity
- Top of center: Proactive suggestion banner (red border, high priority)
- Bottom of center: GraphView showing event timeline with peaks
- Active filters shown: "Anomalies Only" toggle enabled
- 2 toast notifications visible in bottom-right corner

**Visual Highlights:**
- Dark theme with high contrast
- Critical anomaly event with red left border
- Blue line chart showing traffic patterns
- Keyboard shortcut hint at bottom center: "Press ? for help"

---

### Screenshot 2: Event Details Modal with AI Explanation

**Description:**
Modal dialog showing comprehensive details for a DNS tunneling anomaly.

**Key Elements:**
- Header: "⚡ DNS Tunneling Detected" with CRITICAL badge
- Event metadata: timestamp, source/dest IPs, protocol
- AI Reasoning Explanation section (expanded):
  - Step 1: Packet Rate Analysis (85% confidence) - green bar
  - Step 2: Protocol Pattern Analysis (92% confidence) - green bar
  - Step 3: Entropy Analysis (78% confidence) - yellow bar
- Decision Factors bar chart showing 4 factors with weights
- Alternative Hypotheses section (collapsed)
- Educational note at bottom explaining DNS tunneling
- Feedback panel: "Was this detection accurate?" with radio buttons
- Related events list showing 3 related anomalies

**Visual Highlights:**
- Progress bars for confidence scores
- Color-coded steps (green = high confidence)
- Collapsible sections for progressive disclosure
- Clear visual hierarchy

---

### Screenshot 3: StatsDashboard with Multiple Charts

**Description:**
Statistics view showing 6 different charts and metrics.

**Key Elements:**
- Top row: 3 metric cards
  - Total Events: 156
  - Anomaly Rate: 7.7%
  - Avg Score: 0.34
- Second row: Protocol Distribution (pie chart) + Severity Distribution (bar chart)
- Third row: Timeline (line chart) + Top Sources (horizontal bar chart)
- Bottom row: Detection Methods (stacked area chart) + Threat Indicators (tag cloud)

**Visual Highlights:**
- Consistent color scheme across all charts
- Pie chart showing TCP (45%), UDP (30%), DNS (15%), HTTP (10%)
- Severity bars: Critical (5), High (7), Medium (15), Low (20), Normal (109)
- All charts using Recharts library with dark theme

---

### Screenshot 4: Network Topology View

**Description:**
Force-directed graph visualization of network connections.

**Key Elements:**
- Center: Large graph area with ~15 nodes
- Nodes represented as circles:
  - Blue circles: Normal hosts (small)
  - Red circles: Anomalous hosts (larger)
  - Size proportional to anomaly count
- Edges:
  - Gray lines: Normal connections
  - Red lines: Anomalous connections
  - Line thickness based on traffic volume
- Legend in bottom-left corner
- Zoom controls in top-right (+/-)
- Node labels showing IP addresses
- Highlighted cluster around 192.168.1.50 (port scan source)

**Visual Highlights:**
- Interactive graph (hover shows details)
- Clear visual distinction between normal and anomalous
- Organic layout from D3 force simulation
- Attack pattern visible (one node connected to many)

---

### Screenshot 5: Alert Configuration Modal

**Description:**
Comprehensive alert settings interface with 4 tabs.

**Key Elements:**
- Tab bar: [Sensitivity | Thresholds | IP Lists | Rules]
- Active tab: Rules
- Rule list showing 3 custom rules:
  1. "Critical External Access" - enabled, Critical severity
  2. "Port Scan Detection" - enabled, High severity
  3. "DNS Tunneling" - disabled, Medium severity
- Rule editor panel showing:
  - Conditions: 2 conditions with AND logic
  - Actions: notify, create_incident, sound (all checked)
  - Severity selector
- Bottom buttons: [Add Rule] [Save] [Cancel]
- Notification preferences toggle: Sound enabled, Auto-incident enabled

**Visual Highlights:**
- Clean form layout
- Toggle switches for enable/disable
- Color-coded severity badges
- Clear condition/action structure

---

### Screenshot 6: Incident Management Panel

**Description:**
Left panel showing incident tracking interface.

**Key Elements:**
- Tab switcher: [Chat | Incidents] - Incidents active
- Header: "Incidents (12)" with [+ New] button
- Incident list:
  - 🔴 DNS Tunneling: 192.168.1.50 → 8.8.8.8 (Critical, Open, 2 min ago)
  - 🟠 Port Scan: 10.0.0.100 → Internal (High, Investigating, John Doe, 15 min ago)
  - 🟡 Unusual HTTP Traffic (Medium, Resolved, 1 hour ago)
  - ... 9 more incidents
- Selected incident highlighted with border
- Details modal open showing:
  - Title, status, severity badges
  - Description paragraph
  - Related events (5 events)
  - Notes section (2 notes)
  - Note input field
  - Action buttons: [Change Status] [Delete]

**Visual Highlights:**
- Emoji indicators for severity
- Time ago format (relative timestamps)
- Assigned user shown inline
- Tags displayed as pills

---

### Screenshot 7: Proactive Suggestions

**Description:**
Banner showing context-aware suggestion.

**Key Elements:**
- High priority suggestion (red border):
  - Icon: ⚠️
  - Title: "Repeated anomalies from 192.168.1.50"
  - Description: "5 anomalous events detected from this source in last 10 minutes"
  - Action button: [Filter by IP →]
  - Dismiss button: [X]
- Below: Medium priority suggestion (yellow border):
  - Icon: ⚡
  - Title: "High DNS activity detected"
  - Description: "Elevated DNS traffic may indicate tunneling or DGA"
  - Action button: [View DNS Events →]
  - Dismiss button: [X]

**Visual Highlights:**
- Priority-based color coding
- Clear call-to-action buttons
- Dismissible with X button
- Stacked vertically above main content

---

### Screenshot 8: Glossary Panel

**Description:**
Help panel showing security term definitions.

**Key Elements:**
- Header: "Security Glossary" with close button
- Search input: "dns tunneling" entered
- Category filters: [All] [Security] [Network] [Statistics] [Protocol]
  - Security category selected (highlighted)
- Results list:
  1. "DNS Tunneling" (Security)
     - Definition paragraph
     - Example with code formatting
     - Related terms: DNS, Exfiltration, Covert Channel (clickable)
  2. "DNS" (Protocol)
     - Definition paragraph
     - Port 53 mentioned
- Scroll indicator showing more results below

**Visual Highlights:**
- Searchable interface
- Category filtering
- Related terms as clickable links
- Code-formatted examples
- Clear typography hierarchy

---

### Screenshot 9: Keyboard Shortcuts Help

**Description:**
Modal showing all available keyboard shortcuts.

**Key Elements:**
- Title: "Keyboard Shortcuts"
- Organized in sections:
  1. Navigation (4 shortcuts)
  2. Filtering & Search (4 shortcuts)
  3. Actions (4 shortcuts)
  4. Help (2 shortcuts)
- Each row shows:
  - Key combination (styled as keyboard key)
  - Description
- Examples:
  - `Tab` - Cycle through main views
  - `Ctrl` + `K` - Focus search bar
  - `A` - Toggle "Anomalies Only"
  - `?` - Show this help dialog

**Visual Highlights:**
- Keys styled as keyboard buttons
- Organized by category
- Clear, scannable layout
- Modifier keys shown with + symbol

---

### Screenshot 10: Toast Notifications

**Description:**
Bottom-right corner showing multiple stacked toasts.

**Key Elements:**
- 3 toasts visible:
  1. Warning toast (amber):
     - Icon: ⚠️
     - Title: "Critical Anomaly Detected"
     - Message: "DNS tunneling: 192.168.1.50 → 8.8.8.8"
     - Progress bar at 60%
     - Close button [X]
  2. Success toast (green):
     - Icon: ✓
     - Title: "Connected"
     - Message: "Real-time streaming active"
     - Progress bar at 30%
  3. Info toast (blue):
     - Icon: ℹ️
     - Title: "Filters applied"
     - Message: "Showing anomalies only"
     - Progress bar at 90%

**Visual Highlights:**
- Slide-in animation from right
- Color-coded by type
- Progress bars showing auto-dismiss timer
- Dismissible with X button
- Stacked vertically

---

## 10. Future Enhancements

### 10.1 Planned Features

**Phase 2 IUI Features:**
1. **Predictive Analytics**
   - ML-based attack prediction
   - Anomaly forecasting
   - Confidence intervals

2. **Enhanced User Modeling**
   - Automatic expertise detection
   - Adaptive UI complexity
   - Personalized dashboards

3. **Collaborative Features**
   - Multi-user support
   - Incident assignment
   - Team annotations

4. **Advanced Visualizations**
   - Heatmaps
   - Sankey diagrams
   - 3D timeline view

### 10.2 Technical Improvements

**Performance:**
- Virtual scrolling for 10,000+ events
- Web Workers for heavy computations
- IndexedDB for offline storage

**Testing:**
- Unit tests with Jest
- Integration tests with Cypress
- E2E tests with Playwright

**Deployment:**
- Docker containerization
- CI/CD pipeline
- Production build optimization

---

## 11. Conclusion

PacketFlow represents a comprehensive implementation of **Intelligent User Interface** principles applied to network security monitoring. The system successfully combines:

1. **Explainable AI**: Multi-layered reasoning chains make AI decisions transparent
2. **Adaptive User Modeling**: System learns from user behavior and adjusts complexity
3. **Proactive Assistance**: Context-aware suggestions reduce cognitive load
4. **Advanced Visualization**: Multiple chart types and interactive graphs
5. **Accessibility**: Full keyboard navigation and ARIA compliance

### Key Achievements

- **39 React components** organized into logical categories
- **740-line Zustand store** managing complex state
- **900+ lines of TypeScript types** ensuring type safety
- **8 intelligent UI features** implemented and documented
- **21 documentation files** covering all aspects
- **Performance optimized** with memoization and lazy loading

### Technical Stack Validation

The choice of **React + TypeScript + Vite** proved ideal for rapid prototyping:
- Fast development with HMR
- Type safety prevented bugs
- Component reusability accelerated development
- Modern tooling enhanced developer experience

### Course Requirement Fulfillment

This prototype fulfills Part B requirements:

✅ **Prototyping Tool**: Visual Studio Code with React/TypeScript  
✅ **IUI Implementation**: 6+ intelligent features documented  
✅ **Documentation**: Comprehensive report with code snippets  
✅ **Screenshots**: 10 detailed screenshot descriptions  
✅ **Source Code**: Complete, documented, ready to run

---

## 12. Appendix

### A. Running the Application

```powershell
# Clone repository
git clone https://github.com/PacketFlow-Networking/PacketFlow.git
cd PacketFlow

# Install backend dependencies
cd backend
pip install -r requirements.txt
python main.py  # Starts on :8000

# Install frontend dependencies (new terminal)
cd ../frontend
npm install
npm run dev  # Starts on :5173

# Start Ollama (new terminal, optional for AI)
ollama serve
ollama pull mistral:7b

# Open browser
start http://localhost:5173
```

### B. Project Statistics

- **Total Lines of Code**: ~12,000
- **Frontend Lines**: ~8,000
- **Components**: 39
- **Hooks**: 5 custom hooks
- **TypeScript Interfaces**: 50+
- **Features Implemented**: 25+ (see PROGRESS.md)
- **Documentation Files**: 21
- **Development Time**: 8 weeks

### C. Technology Licenses

- React: MIT License
- TypeScript: Apache 2.0
- Vite: MIT License
- Tailwind CSS: MIT License
- Recharts: MIT License
- D3.js: ISC License
- All dependencies: Open source

### D. References

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Recharts Examples](https://recharts.org)
- [D3.js Gallery](https://observablehq.com/@d3/gallery)

---

**Report Prepared By**: PacketFlow Development Team  
**Course**: MAI648 - Intelligent User Interfaces  
**Institution**: University of Cyprus  
**Date**: December 2025

---

