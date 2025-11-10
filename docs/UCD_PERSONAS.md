# User-Centered Design: Personas & Scenarios
## AINetUI - Intelligent User Interface Documentation

---

## Overview

This document presents **three carefully crafted personas** representing the target user archetypes for AINetUI. Each persona embodies specific characteristics, goals, and pain points that directly inform the adaptive design decisions in our intelligent user interface.

Following the **User-Centered Design (UCD)** principles, these personas are:
1. Based on real-world security analyst roles
2. Used to guide adaptation goals and feature prioritization
3. Validated through iterative testing and refinement

---

## Persona 1: Novice Analyst Anna

### Demographics
- **Name**: Anna Martinez
- **Age**: 24
- **Role**: Junior Security Operations Center (SOC) Analyst
- **Experience**: 6 months in cybersecurity
- **Education**: BS in Computer Science (recently graduated)
- **Technical Background**: Basic networking, minimal security experience

### Context & Environment
- **Organization**: Medium-sized enterprise (500-1000 employees)
- **Team**: 5-person SOC team, works night shifts
- **Tools Used**: SIEM (minimal experience), basic firewall logs
- **Primary Task**: Monitor alerts, escalate suspicious activity to senior analysts

### Goals
1. **Learning Goal**: Understand network security concepts while working
2. **Task Goal**: Identify genuine threats without missing critical alerts
3. **Career Goal**: Build confidence to handle incidents independently

### Pain Points
- **Overwhelmed** by technical jargon (DNS tunneling, Z-scores, IQR)
- **Uncertain** which events require immediate action vs. investigation
- **Anxious** about missing critical threats or generating false escalations
- **Struggles** to correlate multiple related events into coherent incidents

### Cognitive Style
- **Predicted**: Initially **Unknown**, likely to develop **Analyst** style
- **Behavior**: Reads event details carefully, frequently uses filters to drill down
- **Preference**: Step-by-step guidance, needs contextual help

### How AINetUI Adapts for Anna

| Adaptive Feature | Implementation | Rationale |
|------------------|----------------|-----------|
| **Explainability** | Natural language explanations for every anomaly | Builds mental model of threats |
| **Contextual Glossary** | Hover tooltips on terms like "Z-Score", "DNS Tunneling" | Reduces cognitive load, facilitates learning |
| **Proactive Suggestions** | High-priority suggestions with clear actions ("Create Incident", "Filter by IP") | Provides guidance without overwhelming |
| **Severity Indicators** | Color-coded badges (Critical/High/Medium) with explanations | Helps prioritize which events need immediate attention |
| **Learning Progress Tracking** | Tracks concepts seen, tooltips dismissed | Gradually reduces hand-holding as expertise grows |

### Scenario: Anna's First DNS Tunneling Detection

**Setting**: 2:00 AM on a Tuesday, Anna is monitoring the AINetUI dashboard alone.

**Trigger**: A **Critical** alert appears: "⚠ ANOMALY [CRITICAL]: DNS spike detected: 192.168.1.50 → 8.8.8.8 (score: 0.92)"

**Anna's Actions**:
1. **Clicks on the event** → EventDetailsModal opens, tracking her detail expansion
2. **Reads AI Explanation**: "This is a DNS tunneling attempt. The source sent 500 DNS queries in 10 seconds—far exceeding the baseline of 15 queries. The domain names are unusually long (>60 characters) with high entropy, indicating data exfiltration."
3. **Hovers over "DNS Tunneling"** → Glossary tooltip appears: "A technique where attackers encode data in DNS queries to bypass firewalls..."
4. **Sees Proactive Suggestion**: "🔍 Multiple anomalies from 192.168.1.50 detected. Consider creating an incident."
5. **Clicks "Create Incident"** → Incident panel opens with pre-filled details

**Outcome**: 
- Anna successfully escalates a genuine threat within 3 minutes
- **Learning**: Gained understanding of DNS tunneling indicators
- **Confidence**: Increased due to clear guidance and validation
- **System Adaptation**: AINetUI infers Anna prefers detailed explanations, continues providing educational content

---

## Persona 2: Intermediate Analyst Ian

### Demographics
- **Name**: Ian Chen
- **Age**: 31
- **Role**: Security Analyst
- **Experience**: 4 years in cybersecurity
- **Education**: MS in Information Security
- **Technical Background**: Strong networking, proficient in Python, SIEM expert

### Context & Environment
- **Organization**: Large financial institution (5000+ employees)
- **Team**: 15-person SOC, handles 500+ alerts daily
- **Tools Used**: Splunk, CrowdStrike, custom scripts
- **Primary Task**: Investigate complex incidents, tune detection rules

### Goals
1. **Efficiency Goal**: Quickly triage alerts to focus on high-value investigations
2. **Accuracy Goal**: Reduce false positives through better filtering
3. **Insight Goal**: Identify attack patterns across multiple events

### Pain Points
- **Alert Fatigue**: Too many low-priority alerts obscure real threats
- **Context Switching**: Difficult to correlate events across multiple tools
- **Time Pressure**: Limited time to investigate each alert thoroughly
- **Trust Issues**: Skeptical of AI explanations that lack evidence

### Cognitive Style
- **Predicted**: **Analyst** (prefers detailed lists, uses filters extensively)
- **Behavior**: Rapidly applies filters, opens multiple detail views, cross-references IPs
- **Preference**: Data-driven insights, wants to verify AI reasoning

### How AINetUI Adapts for Ian

| Adaptive Feature | Implementation | Rationale |
|------------------|----------------|-----------|
| **Contrastive Explanations** | "Why anomaly instead of normal?" format with baseline comparisons | Satisfies need for evidence-based reasoning |
| **Selective Factors** | "Top 3 Most Important Factors" instead of overwhelming detail | Respects time constraints |
| **Advanced Filtering** | Custom rules, IP blacklist/whitelist, sensitivity tuning | Enables precision tuning to reduce noise |
| **Event Correlation** | Auto-links related events within 5-minute windows | Reduces context switching |
| **Feedback Loop** | Can label events as true/false positive to improve accuracy | Builds trust through transparency |

### Scenario: Ian Tunes Detection to Reduce False Positives

**Setting**: 10:00 AM on a Friday, Ian notices recurring false positives from a known backup server.

**Trigger**: Ian sees 15 "High" severity alerts from 192.168.10.50 (backup server) in the past hour.

**Ian's Actions**:
1. **Applies filter**: `src:192.168.10.50` → Sees pattern of high flow volume during scheduled backups
2. **Reviews AI Explanation**: "Flow volume (8000 packets) exceeds baseline (500 packets) by 1500%. **CONTRASTIVE**: Normal traffic for this source averages 500 packets/min. This spike is 16x above normal."
3. **Opens Alert Config** (Ctrl+,) → Adds `192.168.10.50` to whitelist with comment "Backup server"
4. **Labels events as "False Positive"** → Provides feedback: "Expected behavior during backup window"
5. **Adjusts sensitivity** slider from 50% to 60% to reduce similar false positives

**Outcome**:
- Ian reduced 15 false positives to zero for future backup cycles
- **System Adaptation**: AINetUI learns Ian is an Analyst (high filter usage, deep drill-downs)
- **Trust Built**: Ian sees his feedback reflected in improved detection accuracy
- **Efficiency Gain**: Saves ~20 minutes per shift by eliminating noise

---

## Persona 3: Expert Architect Eve

### Demographics
- **Name**: Eve Nakamura
- **Age**: 42
- **Role**: Principal Security Architect
- **Experience**: 18 years in cybersecurity
- **Education**: PhD in Computer Science (focus: Intrusion Detection)
- **Technical Background**: Deep expertise in ML, threat intelligence, APT analysis

### Context & Environment
- **Organization**: Global telecommunications provider (50,000+ employees)
- **Team**: Leads a 30-person security engineering team
- **Tools Used**: Custom ML pipelines, threat intel platforms, SOAR
- **Primary Task**: Design detection strategies, respond to nation-state threats

### Goals
1. **Strategic Goal**: Identify advanced persistent threats (APTs) and zero-day exploits
2. **Architecture Goal**: Optimize detection pipeline for high-fidelity alerts
3. **Research Goal**: Develop novel threat detection techniques

### Pain Points
- **Signal-to-Noise**: Needs extremely high precision (>95% accuracy)
- **Complexity**: Requires deep technical detail and raw data access
- **Automation**: Wants AI to handle routine tasks, escalate only unknowns
- **Transparency**: Must audit AI decisions for compliance and research

### Cognitive Style
- **Predicted**: **Wholist** (prefers global view, sees patterns at network level)
- **Behavior**: Starts with topology view, looks for multi-host patterns, minimal clicking
- **Preference**: Visual correlation, high-level summaries with drill-down on demand

### How AINetUI Adapts for Eve

| Adaptive Feature | Implementation | Rationale |
|------------------|----------------|-----------|
| **Default Topology View** | System infers Wholist style, defaults to network graph | Matches mental model of seeing "the big picture" |
| **Incident Auto-Correlation** | AI clusters related anomalies into incidents automatically | Saves time on manual correlation |
| **Confidence Scoring** | Every AI explanation includes confidence level (low/medium/high) | Enables risk-based prioritization |
| **Raw Evidence Access** | Provides packet counts, baselines, detection methods used | Supports audit and research needs |
| **Predictive Alerts** | "Traffic spike predicted in 5 minutes" based on trends | Proactive rather than reactive posture |

### Scenario: Eve Investigates a Multi-Stage APT

**Setting**: 3:00 PM on a Wednesday, Eve is reviewing the week's incidents.

**Trigger**: AINetUI auto-creates incident: "INC-20251110-150324: Suspicious Activity from 192.168.1.45" (3 correlated events)

**Eve's Actions**:
1. **Opens Topology View** (her default, inferred by system) → Sees 192.168.1.45 communicating with 5 external IPs
2. **Clicks on incident** → Reviews incident details:
   - Event 1: Port scan (20+ unique ports) - 14:58
   - Event 2: HTTP POST with suspicious payload (SQL injection patterns) - 15:01
   - Event 3: Large data transfer to unknown IP (50MB in 2 minutes) - 15:03
3. **Reads AI Explanation**: "**CONTRASTIVE**: This multi-stage attack pattern (recon → exploitation → exfiltration) is NOT consistent with legitimate application behavior. **MOST IMPORTANT FACTORS**: (1) Temporal clustering (5 minutes), (2) Attack kill-chain progression, (3) External C2 communication."
4. **Checks confidence**: "High (data quality: 95%, pattern match: 92%, historical context: 88%)"
5. **Exports incident** → Generates MITRE ATT&CK mapping report for threat intel team

**Outcome**:
- Eve identified a genuine APT in < 5 minutes (vs. hours of manual correlation)
- **System Adaptation**: AINetUI confirms Eve's Wholist style, continues prioritizing topology view
- **Strategic Value**: Incident data feeds Eve's research on automated APT detection
- **Compliance**: Full audit trail of AI reasoning meets regulatory requirements

---

## Persona Comparison Matrix

| Characteristic | Anna (Novice) | Ian (Intermediate) | Eve (Expert) |
|----------------|---------------|-------------------|--------------|
| **Primary Need** | Learn & Guidance | Efficiency & Control | Insight & Strategy |
| **Cognitive Style** | Developing Analyst | Strong Analyst | Wholist |
| **Default View** | Events (detailed) | Events (filtered) | Topology (global) |
| **AI Interaction** | Relies heavily | Validates critically | Uses selectively |
| **Adaptation Focus** | Educational | Customization | Automation |
| **Success Metric** | Correct escalations | Time-to-triage | APT detection rate |

---

## Design Implications

### 1. **Progressive Disclosure**
- **Anna**: Show all explanations by default
- **Ian**: Collapsible sections, prioritize top factors
- **Eve**: Summary cards with expand-on-demand

### 2. **Adaptive Defaults**
- **Novice**: Events view, all tooltips enabled, proactive suggestions on
- **Intermediate**: Events view, selective tooltips, custom filters
- **Expert**: Topology view, tooltips off (unless explicitly hovering), auto-incident creation

### 3. **Feedback Integration**
- **Anna**: Feedback teaches the user (e.g., "Your label helped identify this pattern")
- **Ian**: Feedback refines detection rules (e.g., "Sensitivity adjusted based on your input")
- **Eve**: Feedback contributes to research (e.g., "Your insight added to threat intel corpus")

---

## Validation & Iteration

These personas are **living documents** that should be:
1. **Validated** through user interviews with real SOC analysts
2. **Refined** based on analytics data (e.g., actual interaction patterns)
3. **Updated** as the AINetUI system evolves

**Next Steps for UCD Process**:
- [ ] Conduct formative usability testing with 3 users per persona
- [ ] Measure task completion time and error rates
- [ ] Iterate on adaptive features based on empirical data

---

## References
- Nielsen, J. (1993). *Usability Engineering*. Academic Press.
- Cooper, A. (2004). *The Inmates Are Running the Asylum*. Sams Publishing.
- HCI Course Material: User Modeling, Persona Development, Scenario-Based Design
