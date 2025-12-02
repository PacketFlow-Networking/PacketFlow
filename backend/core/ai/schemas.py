"""
Pydantic schemas for industry-standard structured AI responses following NIST, CVSS, MITRE ATT&CK, and OWASP frameworks.

These models define the schema for AI-generated network security analysis.
They are used with Instructor to guarantee valid, type-safe responses from
the remote UCY ChatGPT API with compliance and forensic considerations.

Instructor handles:
- Automatic retry on validation failures
- JSON parsing and Pydantic validation
- Type-safe structured outputs
- Enterprise security reporting standards
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from enum import Enum


class DetectionMethod(BaseModel):
    """Detection method with confidence score."""
    name: str = Field(
        ..., 
        description="Name of detection method (Z-Score, IQR, EWMA, Rate-Based, Behavioral, Port Scan, Protocol-Specific, Payload Threats)"
    )
    triggered: bool = Field(..., description="Whether this method flagged the event")
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Confidence score for this method (0.0-1.0)"
    )


class ThreatProbability(BaseModel):
    """Threat type with probability distribution."""
    threat_type: str = Field(
        ..., 
        description="Type of threat (dns_tunneling, c2_beaconing, lateral_movement, port_scan, etc.)"
    )
    probability: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Probability this threat type is occurring (0.0-1.0)"
    )


class ExplanationConfidence(BaseModel):
    """Enhanced explanation with confidence metrics."""
    confidence: float = Field(
        ..., 
        ge=0.0, 
        le=1.0, 
        description="Overall confidence in explanation (0.9+: HIGH, 0.7-0.9: MEDIUM, <0.7: LOW)"
    )
    detection_methods: List[DetectionMethod] = Field(
        ...,
        description="List of detection methods and their status",
        min_items=1,
        max_items=8
    )
    threat_distribution: List[ThreatProbability] = Field(
        ...,
        description="Probability distribution of threat types",
        min_items=1,
        max_items=10
    )


class MITREATTACKStage(str, Enum):
    """MITRE ATT&CK Framework attack stages."""
    RECONNAISSANCE = "reconnaissance"
    RESOURCE_DEVELOPMENT = "resource_development"
    INITIAL_ACCESS = "initial_access"
    EXECUTION = "execution"
    PERSISTENCE = "persistence"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DEFENSE_EVASION = "defense_evasion"
    CREDENTIAL_ACCESS = "credential_access"
    DISCOVERY = "discovery"
    LATERAL_MOVEMENT = "lateral_movement"
    COLLECTION = "collection"
    COMMAND_AND_CONTROL = "command_and_control"
    EXFILTRATION = "exfiltration"
    IMPACT = "impact"


class CVSSSeverity(str, Enum):
    """CVSS v4.0 Severity Ratings (NIST standard)."""
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ThreatIndicator(BaseModel):
    """Industry-standard threat indicator with CWE/OWASP/MITRE classification."""
    type: Literal[
        "reconnaissance",
        "port_scan",
        "dns_tunneling",
        "data_exfiltration",
        "brute_force",
        "ddos",
        "malware_beacon",
        "sql_injection",
        "xss",
        "command_injection",
        "lateral_movement",
        "privilege_escalation",
        "suspicious_traffic",
        "c2_communication",
        "vulnerability_scan",
        "zero_day_exploit",
        "ransomware_activity"
    ] = Field(..., description="Type of threat indicator detected (OWASP/CWE classification)")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    evidence: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Specific forensic evidence with network metrics (packet patterns, flow analysis, byte counts, timing, geolocation)"
    )
    explanation: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Why this is suspicious with detection methodology and baseline deviation"
    )
    cwe_ids: List[str] = Field(
        default_factory=list,
        description="Related CWE (Common Weakness Enumeration) IDs"
    )
    owasp_references: List[str] = Field(
        default_factory=list,
        description="Related OWASP Top 10 categories"
    )
    mitre_techniques: List[str] = Field(
        default_factory=list,
        description="MITRE ATT&CK technique IDs (e.g., 'T1046' for Network Service Discovery)"
    )


class Recommendation(BaseModel):
    """Enterprise-grade actionable security recommendation with compliance and timeline context."""
    action: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Specific, executable action (e.g., 'Block IP 192.168.1.50 at firewall', 'Isolate host for forensics')"
    )
    priority: Literal["critical", "high", "medium", "low"] = Field(
        ...,
        description="Priority using CVSS 4.0 severity ratings"
    )
    details: str = Field(
        ...,
        min_length=1,
        max_length=600,
        description="Implementation details: why, how, expected impact, success metrics"
    )
    timeframe: Literal["immediate", "1_hour", "4_hours", "24_hours", "asap"] = Field(
        ...,
        description="Recommended implementation timeframe"
    )
    affected_systems: List[str] = Field(
        default_factory=list,
        description="Affected systems/IPs this action targets"
    )
    compliance_impact: List[str] = Field(
        default_factory=list,
        description="Compliance frameworks affected (e.g., 'PCI-DSS 6.2', 'HIPAA 164.312(b)', 'GDPR Article 32')"
    )


class NetworkEventAnalysis(BaseModel):
    """Industry-standard structured analysis following NIST, CVSS v4.0, MITRE ATT&CK, and OWASP frameworks."""
    brief_summary: str = Field(
        ...,
        min_length=20,
        max_length=80,
        description="Executive one-liner for dashboard (20-80 chars)"
    )
    summary: str = Field(
        ...,
        min_length=50,
        max_length=1000,
        description="Executive summary with business impact (2-3 sentences)"
    )
    threat_level: Literal["critical", "high", "medium", "low", "info"] = Field(
        ...,
        description="CVSS v4.0 severity: critical (9.0-10.0), high (7.0-8.9), medium (4.0-6.9), low (0.1-3.9), info (0.0)"
    )
    cvss_score: float = Field(
        ...,
        description="CVSS v4.0 base score (0.0-10.0) for risk quantification",
        ge=0.0,
        le=10.0
    )
    risk_score: float = Field(
        ...,
        description="Business risk: likelihood  impact  asset_value (0-100)",
        ge=0.0,
        le=100.0
    )
    
    # FORENSIC ANALYSIS: What happened?
    what_happened: str = Field(
        ...,
        min_length=1,
        max_length=400,
        description="Technical forensic description: traffic patterns, volumes, protocols, packet signatures, anomaly indicators"
    )
    
    # ROOT CAUSE ANALYSIS: Why is it suspicious?
    why_suspicious: str = Field(
        ...,
        min_length=1,
        max_length=600,
        description="Deviation from baseline + historical attack pattern comparison + threat intelligence context"
    )
    
    # DETECTION METHODOLOGY: How was it detected?
    detection_method: str = Field(
        ...,
        min_length=1,
        max_length=300,
        description="Statistical methods (Z-Score, IQR, EWMA), thresholds, behavioral models, rule-based engines used"
    )
    
    # THREAT INDICATORS: Industry-classified indicators
    threat_indicators: List[ThreatIndicator] = Field(
        ...,
        min_length=1,
        max_length=8,
        description="Identified threats with CWE/OWASP/MITRE classifications"
    )
    
    # INCIDENT RESPONSE: Actionable recommendations
    recommendations: List[Recommendation] = Field(
        ...,
        min_length=1,
        max_length=5,
        description="Prioritized response actions with timelines and compliance impact"
    )
    
    # ATTACK CONTEXT: MITRE ATT&CK mapping
    attack_context: str = Field(
        ...,
        min_length=1,
        max_length=400,
        description="Attack classification: type, attacker objectives, TTPs, historical context, known variants"
    )
    
    mitre_attack_stages: List[str] = Field(
        default_factory=list,
        description="MITRE ATT&CK Framework attack lifecycle stages"
    )
    
    # TECHNICAL EVIDENCE: Forensic details
    technical_details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Forensic evidence: flow metrics, byte rates, packet sizes, protocols, ports, geolocation, timing"
    )
    
    affected_assets: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Affected resources (e.g., [{'ip': '192.168.1.50', 'type': 'workstation', 'criticality': 'high', 'department': 'Finance'}])"
    )
    
    compliance_implications: List[str] = Field(
        default_factory=list,
        description="Applicable frameworks: PCI-DSS, HIPAA, GDPR, SOC 2, NIST CSF, ISO 27001"
    )
    
    forensic_chain: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Chain of custody: timestamps, data sources, integrity hashes, analyst notes"
    )
    
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence (0.0-1.0): signal strength, evidence quality, model accuracy"
    )
    
    # IUI FEATURE: Explanation confidence with detection methods and threat distribution
    explanation_confidence: Optional[ExplanationConfidence] = Field(
        default=None,
        description="Enhanced confidence metrics including detection methods and threat distribution"
    )
    
    false_positive_indicators: List[str] = Field(
        default_factory=list,
        description="Potential false positive causes (authorized activity, scheduled tasks, etc.)"
    )
    
    investigation_checklist: List[str] = Field(
        default_factory=list,
        description="SOC analyst investigation steps as strings (e.g., 'Review network logs for IOCs', 'Run packet capture tool')"
    )


class IncidentCorrelation(BaseModel):
    """Enterprise-grade incident correlation following NIST SP 800-61 and MITRE frameworks."""
    incident_title: str = Field(
        description="Executive incident title for SIEM/ticketing systems",
        max_length=100
    )
    description: str = Field(
        description="Incident narrative for security reports and compliance documentation",
        max_length=2000
    )
    severity: Literal["critical", "high", "medium", "low"] = Field(
        description="Aggregated severity using CVSS v4.0"
    )
    cvss_score: Optional[float] = Field(
        default=None,
        description="Aggregated CVSS v4.0 score for the incident",
        ge=0.0,
        le=10.0
    )
    attack_stages: List[str] = Field(
        default_factory=list,
        description="MITRE ATT&CK Framework stages observed in attack sequence"
    )
    related_event_count: int = Field(description="Number of correlated events")
    timeline: str = Field(
        description="Chronological attack progression with timestamps and IOCs",
        max_length=1500
    )
    attack_pattern: Optional[str] = Field(
        default=None,
        description="Identified pattern (e.g., 'APT28 Intrusion', 'Ransomware Deployment Chain')",
        max_length=200
    )
    threat_actors: List[Dict[str, str]] = Field(
        default_factory=list,
        description="Threat actor profiles with motivation and history"
    )
    affected_data: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Data at risk: type, count, sensitivity, regulatory impact"
    )
    estimated_impact: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Business impact: financial loss, data breach size, compliance violations, recovery time"
    )
    recommendations: List[Recommendation] = Field(
        description="Cascading response recommendations with priority ordering",
        min_length=1,
        max_length=8
    )


class ChatQueryResponse(BaseModel):
    """Structured response for user chat queries about network security."""
    answer: str = Field(
        description="Clear, concise answer to the user's question",
        max_length=1000
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence in the accuracy of this answer (0.0-1.0)"
    )
    related_events: List[str] = Field(
        description="List of event IDs related to this answer",
        max_length=10,
        default_factory=list
    )
    follow_up_questions: List[str] = Field(
        description="Suggested follow-up questions the user might ask",
        max_length=3,
        default_factory=list
    )
