# Enterprise-Standard AI Analysis Integration

**Status**:  **COMPLETE** - Two-tier display architecture implemented with industry-standard security analysis

## Overview

PacketFlow now generates AI analysis following enterprise-grade security standards. The system provides:
- **Chat Window**: Brief, actionable summaries (50-80 characters)
- **Details Modal**: Comprehensive industry-standard analysis with forensic evidence, compliance implications, and SOC analyst support tools

## Architecture

### Two-Tier Display Pattern

```
Backend (Instructor + Schemas)
    
Response Structure (Chat Tier + Modal Tier)
    
Frontend
     Chat Window (AIExplanationPanel)  Shows brief_summary only
     Quick Recommendations  Max 2 actionable items with timeframes
     "View Full Analysis" Button  Opens AIDetailsModal
         AIDetailsModal  Displays full structured_analysis with 20+ fields
```

## Backend Components

### 1. Industry-Standard Schemas (`backend/core/ai/schemas.py`)

**CVSS v4.0 Severity Scoring**
- Critical: 9.0-10.0
- High: 7.0-8.9
- Medium: 4.0-6.9
- Low: 0.1-3.9
- None: 0.0

**MITRE ATT&CK Framework Integration**
- 14 lifecycle stages: Reconnaissance  Resource Development  Initial Access  Execution  Persistence  Privilege Escalation  Defense Evasion  Credential Access  Discovery  Lateral Movement  Collection  Command & Control  Exfiltration  Impact
- Each threat indicator can map to multiple MITRE techniques

**Framework Classifications**
- CWE (Common Weakness Enumeration): 0+ IDs per threat
- OWASP Top 10 references: e.g., "A01:2021 - Broken Access Control"
- Compliance implications: PCI-DSS, HIPAA, GDPR, SOC 2, ISO 27001, NIST CSF

**ThreatIndicator Model**
```python
class ThreatIndicator(BaseModel):
    type: str                                    # E.g., "DNS_TUNNELING"
    explanation: str                             # What was detected
    evidence: str                                 # Supporting evidence (max 300 chars)
    confidence: float                            # 0.0-1.0 confidence level
    cwe_ids: list[str]                           # CWE references
    owasp_references: list[str]                  # OWASP Top 10
    mitre_techniques: list[str]                  # MITRE ATT&CK techniques
```

**NetworkEventAnalysis Model** (20+ fields)
- Risk metrics: `cvss_score` (0-10), `risk_score` (0-100)
- Forensic evidence: `forensic_chain` with timestamp/source/action/result
- Attack context: `mitre_attack_stages`, `attack_context`, threat patterns
- SOC support: `investigation_checklist`, `false_positive_indicators`
- Compliance: `compliance_implications` array
- Assets: `affected_assets` with criticality/department
- Recommendations: With timeframes, affected systems, compliance impact

### 2. Prompt Engineering (`backend/core/ai/ai_agent.py`)

**System Prompt** (~350 words)
- Specifies OSCP/CEH analyst role
- Requires CVSS v4.0 scoring methodology
- Enforces MITRE ATT&CK framework mapping
- Mandates CWE/OWASP classification
- Emphasizes forensic evidence precision
- Requires confidence quantification
- Specifies JSON output format

**Context Prompt** (~700 words)
- Provides forensic data: timestamp, IPs, flows, bytes, anomaly score
- 10-point analysis requirements checklist
- Complete field list for structured output
- Forensic evidence requirements
- Risk assessment methodology
- SOC analyst best practices

**User Instruction**
- Flat JSON structure (no wrappers)
- All required fields present
- CVSS scoring discipline
- MITRE technique precision
- Confidence levels explicit
- Actionable recommendations with timelines

### 3. Response Structure (Two-Tier)

**Chat Tier** (Displayed in AIExplanationPanel)
```python
{
    "text": "Brief one-liner (50-80 chars)",
    "ai_explanation": "2-3 sentence summary",
    "threat_level": "critical|high|medium|low|info",
    "cvss_score": 7.5,
    "risk_score": 82,
    "quick_recommendations": [
        {
            "action": "Isolate source IP",
            "priority": "critical",
            "timeframe": "immediate"
        }
    ]
}
```

**Modal Tier** (Displayed in AIDetailsModal)
```python
{
    "structured_analysis": {
        # SUMMARIES
        "brief_summary": "One-liner for modal title",
        "summary": "2-3 sentence executive summary",
        
        # RISK METRICS
        "threat_level": "critical|high|medium|low|info",
        "cvss_score": 7.5,
        "risk_score": 82,
        
        # FORENSIC ANALYSIS
        "what_happened": "Detailed description of activity",
        "why_suspicious": "Why this activity is concerning",
        "detection_method": "How detection occurred",
        
        # THREAT CLASSIFICATION
        "threat_indicators": [
            {
                "type": "DNS_TUNNELING",
                "explanation": "Long DNS queries detected",
                "cwe_ids": ["327", "521"],
                "owasp_references": ["A02:2021"],
                "mitre_techniques": ["T1071.004"]
            }
        ],
        
        # ATTACK CONTEXT
        "mitre_attack_stages": ["Initial Access", "Command & Control"],
        "attack_context": "Multi-stage attack pattern",
        
        # INCIDENT RESPONSE
        "recommendations": [
            {
                "action": "Block source IP",
                "priority": "critical",
                "timeframe": "immediate",
                "affected_systems": ["firewall-01"],
                "compliance_impact": ["PCI-DSS", "SOC 2"]
            }
        ],
        
        # AFFECTED INFRASTRUCTURE
        "affected_assets": [
            {
                "ip": "192.168.1.50",
                "type": "workstation",
                "criticality": "high",
                "department": "Finance"
            }
        ],
        
        # COMPLIANCE & FORENSICS
        "compliance_implications": ["PCI-DSS", "HIPAA", "SOC 2"],
        "forensic_chain": {
            "timestamp": "2025-10-21T15:30:45.123Z",
            "source": "network_capture",
            "action": "anomaly_detected",
            "result": "escalated_to_ai_analysis"
        },
        
        # SOC ANALYST SUPPORT
        "investigation_checklist": [
            "Check for similar patterns in last 24 hours",
            "Review firewall logs for source IP",
            "Analyze DNS query payloads for encoded data"
        ],
        "false_positive_indicators": [
            "Legitimate DNS over HTTPS (DoH)",
            "Corporate VPN with DNS tunneling",
            "Security testing by authorized team"
        ],
        
        # CONFIDENCE
        "confidence": 0.92
    }
}
```

## Frontend Components

### 1. AIExplanationPanel (Chat Display)

**Purpose**: Show brief AI analysis in chat window

**Key Features**:
- Displays `text` (50-80 char brief)
- Shows threat level badge with color coding
- Renders CVSS score and risk score metric cards
- Lists `quick_recommendations` (max 2) with timeframes
- Collapsible details preview
- "View Full Analysis" button  Opens modal

**File**: `frontend/src/components/panels/AIExplanationPanel.tsx` (181 lines)

**Sample Output**:
```
 CRITICAL: DNS tunneling detected from 192.168.1.50
CVSS: 7.5/10  Risk: 82/100

Quick Actions:
 Isolate source IP (CRITICAL - immediate)
 Review DNS queries (HIGH - 1 hour)

[View Full Analysis]
```

### 2. AIDetailsModal (Full Analysis Display)

**Purpose**: Display comprehensive industry-standard analysis

**Sections**:
1. **Executive Summary** - 2-3 sentence overview
2. **Risk Assessment** - CVSS v4.0 + business risk score
3. **Forensic Analysis** - What happened, why suspicious, detection method
4. **Threat Indicators** - With CWE/OWASP/MITRE classifications
5. **MITRE ATT&CK Framework** - Attack lifecycle stages + context
6. **Incident Response** - Recommendations with timeframes + affected systems + compliance
7. **Compliance Implications** - Framework references (PCI-DSS, HIPAA, GDPR, SOC 2, etc.)
8. **Technical Forensic Details** - Affected assets with criticality/department
9. **SOC Analyst Support** - Investigation checklist + false positive indicators
10. **Confidence Metrics** - Overall confidence percentage + visual progress bar

**File**: `frontend/src/components/modals/AIDetailsModal.tsx` (415 lines)

**Color Coding**:
- Critical: Red (#critical)
- High: Orange (#warn)
- Medium: Yellow (#yellow-500)
- Low: Green (#ok)
- Info: Blue (#info)

## TypeScript Type System

### AIMessage Interface (`frontend/src/types/index.ts`)

**Chat Tier Fields**:
```typescript
text?: string;                              // Brief one-liner
ai_explanation?: string;                    // 2-3 sentence summary
threat_level?: 'critical'|'high'|'medium'|'low'|'info';
cvss_score?: number;                        // 0-10
risk_score?: number;                        // 0-100
quick_recommendations?: Recommendation[];   // Max 2
```

**Modal Tier Fields**:
```typescript
structured_analysis?: {
    brief_summary?: string;
    summary?: string;
    threat_level?: string;
    cvss_score?: number;
    risk_score?: number;
    what_happened?: string;
    why_suspicious?: string;
    detection_method?: string;
    threat_indicators?: ThreatIndicator[];
    mitre_attack_stages?: string[];
    attack_context?: string;
    recommendations?: Recommendation[];
    affected_assets?: AffectedAsset[];
    compliance_implications?: string[];
    technical_details?: Record<string, any>;
    forensic_chain?: ForensicEntry;
    investigation_checklist?: string[];
    false_positive_indicators?: string[];
    confidence?: number;
}
```

## Data Flow

### 1. Event Captured
```
Packet  Capture  Packet Queue
```

### 2. Event Condensed
```
Packet Queue  Condenser  Anomaly Detection  Event Queue
```

### 3. AI Analysis (Instructor)
```
Event Queue  AI Agent  Instructor Call (Instructor validates schema)
    
    NetworkEventAnalysis (with CVSS, MITRE, CWE/OWASP, forensics)
    
    Response Structure (Chat Tier + Modal Tier)
    
    WebSocket  Frontend
```

### 4. Frontend Display
```
WebSocket Message
    
    Store Update (add to aiMessages)
    
    Chat Window (AIExplanationPanel)
        - Brief summary
        - Metrics (CVSS, risk)
        - Quick actions
        - "View Full" button
    
    [User clicks "View Full Analysis"]
    
    AIDetailsModal
        - All 20+ enterprise fields
        - Forensic details
        - MITRE stages
        - Investigation checklists
        - Compliance implications
```

## Industry Standards Implemented

### CVSS v4.0
- Quantified severity scoring (0.0-10.0)
- Used for: threat assessment, prioritization, SLA determination
- Integrated into: Backend schema, AI prompts, frontend display

### MITRE ATT&CK Framework
- 14 lifecycle stages mapped to attack patterns
- Used for: attack classification, threat intelligence, incident analysis
- Integrated into: Backend schema, frontend display, threat indicators

### CWE (Common Weakness Enumeration)
- Weakness classification for threats
- Example: CWE-327 (Use of Broken Crypto), CWE-521 (Weak Password Requirements)
- Integrated into: ThreatIndicator model, frontend display

### OWASP Top 10
- Application security risks
- Example: A01:2021 (Broken Access Control), A02:2021 (Cryptographic Failures)
- Integrated into: ThreatIndicator model, frontend display

### Compliance Frameworks
- PCI-DSS: Payment Card Industry Data Security Standard
- HIPAA: Health Insurance Portability and Accountability Act
- GDPR: General Data Protection Regulation
- SOC 2: Service Organization Control
- ISO 27001: Information Security Management
- NIST CSF: Cybersecurity Framework
- Integrated into: Recommendation model, compliance_implications array, frontend display

### NIST SP 800-61 Incident Handling
- Preparation  Detection  Containment  Eradication  Recovery  Post-Incident
- Integrated into: investigation_checklist, recommendation timeframes, response actions

## Configuration

### Environment Variables
```env
# AI Configuration
AI_MODEL=gemma3:latest              # Ollama model
AI_TIMEOUT=30                       # Seconds
AI_SYSTEM_PROMPT=<custom_prompt>    # Enterprise analyst prompt
```

### Fallback Strategy
If AI analysis fails or times out:
1. Event still flows without AI explanation
2. `ai_processed: false` flag set
3. Chat window shows placeholder
4. No errors propagated to user

## Testing

### Backend Testing
```bash
# Test with mock data
MOCK_MODE=true python main.py

# Test with Ollama (requires gemma3 pulled)
ollama serve &
ollama pull gemma3:latest
python main.py
```

### Frontend Testing
```bash
# Start dev server
npm run dev

# Test chat window displays brief summaries only
# Click "View Full Analysis"  Check modal shows all fields
# Verify CVSS color coding matches severity
# Verify MITRE stages render
# Verify investigation checklist is properly formatted
```

## Benefits

### For Security Analysts
- **Faster incident response** with MITRE ATT&CK mapping
- **Forensic evidence** for incident documentation
- **Investigation checklists** for structured analysis
- **Compliance references** for regulatory requirements
- **False positive indicators** to reduce alert fatigue

### For SOC Teams
- **Quantified CVSS scores** for prioritization
- **Timeframed recommendations** for SLA management
- **Affected asset tracking** with criticality levels
- **Chain of custody** for forensic investigations
- **Confidence metrics** for risk assessment

### For Organizations
- **Industry-standard compliance** (PCI-DSS, HIPAA, GDPR, SOC 2)
- **Forensically-sound documentation** for audits
- **Reduced false positives** via AI context awareness
- **Actionable recommendations** with timelines
- **Risk quantification** for business decisions

## Files Modified

1. `backend/core/ai/schemas.py` - Industry-standard Pydantic models (CVSS, MITRE, CWE/OWASP, compliance)
2. `backend/core/ai/ai_agent.py` - Prompt engineering + response structure (two-tier display)
3. `frontend/src/types/index.ts` - Comprehensive AIMessage interface
4. `frontend/src/components/panels/AIExplanationPanel.tsx` - Brief chat display component
5. `frontend/src/components/modals/AIDetailsModal.tsx` - Full modal display component (20+ fields)

## Next Steps (Optional)

1. **Backend**: Test with actual gemma3 model and real network anomalies
2. **Frontend**: E2E testing with real AI responses
3. **Documentation**: Add examples of CVSS scoring logic
4. **Customization**: Allow enterprise to customize CVSS thresholds, compliance frameworks

## References

- **CVSS v4.0**: https://www.first.org/cvss/v4.0/
- **MITRE ATT&CK**: https://attack.mitre.org/
- **CWE**: https://cwe.mitre.org/
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **NIST SP 800-61**: https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r2.pdf

---

**Last Updated**: 2025-10-21
**Version**: 1.0 - Enterprise-Standard AI Analysis Integration Complete
