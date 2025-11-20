# Part B – Prototype Design and Implementation: Prototype Design Report

## 1. Overview of the Prototype

The implemented prototype represents a privacy-first, AI-powered network security monitoring system designed to provide real-time threat detection and human-centered anomaly analysis. The system integrates live packet capture with local large language model reasoning to deliver contextual security insights without reliance on cloud infrastructure. The prototype addresses the need for transparent, adaptive interfaces in network security operations, particularly focusing on reducing cognitive load through intelligent assistance and user-centered design.

The system enables security practitioners to monitor network traffic streams, visualize network topology, analyze anomalous behaviors through multi-method statistical detection, and manage security incidents through an adaptive interface that learns from user interactions. The prototype emphasizes explainability by generating natural language descriptions of detected threats and adapting its presentation based on inferred user cognitive styles.

## 2. Prototype Architecture

The architecture follows an asynchronous pipeline pattern with queue-based decoupling between components. The backend implements a four-stage processing pipeline: packet capture, flow condensation, AI reasoning, and real-time broadcasting. Packet data originates from three configurable sources—simulated mock streams, PCAP file replay, or live network capture—feeding into bounded asynchronous queues to prevent memory overflow.

The flow condenser component aggregates individual packets into network flows, applying eight distinct anomaly detection methods including z-score deviation, interquartile range analysis, exponentially weighted moving averages, behavioral entropy analysis, port scan detection, and protocol-specific heuristics. Detection operates on sliding time windows with a warmup phase to establish statistical baselines before activating anomaly alerting. Detected anomalies receive severity scoring based on composite method triggering and threat indicator presence.

The AI reasoning layer operates in dual modes: local execution using Ollama-hosted language models or remote API integration. The agent maintains event memory for temporal correlation, clusters related anomalies into potential security incidents, and generates structured explanations with confidence scoring and actionable recommendations. All AI processing occurs asynchronously to prevent blocking the primary detection pipeline.

The frontend architecture implements real-time state management through persistent stores that track events, user interactions, incidents, alert configurations, and adaptive learning metrics. WebSocket communication maintains bidirectional connectivity with automatic reconnection logic and exponential backoff. The interface presents six primary views—event stream, statistical dashboard, network topology, conversational chat, incident management, and glossary documentation—with adaptive default view selection based on inferred user preferences.

## 3. Intelligent User Interface Features

The prototype implements multiple adaptive mechanisms aligned with human-centered design principles for intelligent interfaces. Cognitive style inference operates by tracking user behavior patterns across topology view frequency, detail expansion depth, and filter application habits. After accumulating sufficient interaction data, the system categorizes users as wholist or analyst thinkers and adjusts default view presentations accordingly—spatial visualizations for wholists and detailed event lists for analysts.

Proactive suggestion generation analyzes recent event patterns to surface context-aware recommendations. The system identifies patterns such as repeated anomalies from identical sources, critical severity spikes, or suspicious protocol combinations, then generates prioritized suggestions with action handlers. Suggestions include investigation prompts, filtering recommendations, and learning resources, with temporal expiration and user-dismissible controls.

Explanation generation leverages local language models to transform statistical anomaly metrics into human-readable security narratives. Each detected anomaly receives contextual analysis referencing specific network indicators, threat assessments, and recommended response actions. The system structures explanations with evidence grounding, confidence levels, and correlation to related events.

A contextual glossary provides just-in-time learning support, offering searchable definitions for detection methods, network protocols, security metrics, and threat patterns. The system tracks concept exposure to build user knowledge profiles and reduce redundant explanations over time.

Event feedback mechanisms enable users to label detections as true positives, false positives, or missed threats, with optional explanatory comments. The system tracks feedback submission rates and accuracy trends within user profiles, establishing a feedback loop for improving future detection accuracy through user-contributed ground truth.

User control and transparency features include manual override of adaptive behaviors, inspection of inferred cognitive style metrics with supporting evidence, three-step onboarding tutorials explaining adaptive mechanisms, and comprehensive documentation of adaptation logic accessible through help panels.

## 4. Interaction and User Workflow

Primary user workflows center on continuous monitoring, anomaly investigation, and incident response coordination. The monitoring workflow presents real-time event streams with configurable filtering by severity, protocol, source addresses, and anomaly thresholds. Users apply filters through direct manipulation controls or accept system-generated suggestions to focus attention on relevant subsets.

The investigation workflow begins when users select events from the stream to examine detailed attributes including detection methods triggered, threat indicators identified, historical baseline comparisons, and AI-generated explanations. Users can request additional analysis through conversational queries, enabling natural language interaction with the AI reasoning system. The interface supports topology-based investigation through force-directed graph visualization showing communication patterns, anomaly concentration, and cluster detection.

Incident management workflows enable users to aggregate related events into formal incident records with status tracking, assignee designation, severity classification, and threaded notes. The system automatically selects newly created incidents and maintains state synchronization across all interface panels. Users can transition incident statuses through investigative stages and attach relevant events as supporting evidence.

Alert configuration workflows provide hierarchical control through four panels: global sensitivity adjustment via slider control, custom threshold specification for metrics including anomaly scores and flow rates, IP whitelist and blacklist management with safety warnings for suspicious additions, and custom rule creation using field-based conditions with associated actions.

The system implements keyboard-driven navigation for efficiency, supporting shortcuts for view switching, filter toggling, search focusing, and alert configuration access. Visual feedback mechanisms including toast notifications and status indicators maintain system state visibility throughout all workflows.

## 5. Prototype Status and Completeness

The prototype achieves full implementation of core functional requirements and intelligent interface features as specified in the project analysis phase. All backend components operate in production-ready states with error handling, memory management, queue backpressure handling, and graceful degradation when optional services become unavailable.

Anomaly detection functionality implements all planned methods with configurable sensitivity, warmup phase management, and automatic baseline adaptation. The AI reasoning system supports both local and remote execution modes with structured output generation, incident correlation logic, and conversational query processing.

Frontend implementation delivers all planned visualization modes including tabular event streams, statistical dashboards with temporal charts, two-dimensional and three-dimensional topology representations, and integrated incident management interfaces. State persistence ensures workflow continuity across sessions through local storage synchronization.

Intelligent interface features reach complete implementation status including cognitive style inference with behavioral tracking, proactive suggestion generation with contextual relevance scoring, user feedback collection with accuracy trend analysis, adaptive view selection with manual override capabilities, contextual help systems with glossary integration, and onboarding tutorials with progressive disclosure patterns.

Usability refinements address heuristic evaluation findings including system status visibility through adaptation notifications, user control through preference override mechanisms, consistency through standardized component positioning, error prevention through confirmation dialogs for destructive actions, and recognition support through cognitive style insight displays.

The prototype demonstrates readiness for evaluation through think-aloud protocols, system usability scale assessment, and comparative analysis against baseline non-adaptive interfaces. The implemented feature set supports all planned evaluation scenarios including expert versus novice user workflows, wholist versus analyst cognitive style adaptations, and feedback-driven improvement cycles.
