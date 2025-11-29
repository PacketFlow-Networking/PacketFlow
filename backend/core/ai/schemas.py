"""
Pydantic schemas for structured AI responses with Instructor.

These models define the schema for AI-generated network security analysis.
They are used with Instructor to guarantee valid, type-safe responses from
the remote UCY ChatGPT API.

Instructor handles:
- Automatic retry on validation failures
- JSON parsing and Pydantic validation
- Type-safe structured outputs
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ThreatIndicator(BaseModel):
    """A specific threat indicator found in the network event."""
    type: Literal[
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
        "suspicious_traffic"
    ] = Field(description="Type of threat indicator detected")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence score (0.0-1.0)")
    evidence: str = Field(description="Specific evidence supporting this indicator (e.g., packet patterns, byte counts, timing)")
    explanation: str = Field(
        description="Clear explanation of WHY this is suspicious and HOW it was detected",
        max_length=150
    )


class Recommendation(BaseModel):
    """An actionable security recommendation."""
    action: str = Field(description="Specific action to take (e.g., 'Block IP', 'Investigate', 'Monitor')")
    priority: Literal["critical", "high", "medium", "low"] = Field(
        description="Priority level for this recommendation"
    )
    details: str = Field(
        description="Detailed explanation of why and how to implement this action",
        max_length=200
    )


class NetworkEventAnalysis(BaseModel):
    """Structured analysis of a network security event with detailed explainability."""
    brief_summary: str = Field(
        description="One-line summary for chat display (50-80 chars)",
        min_length=30,
        max_length=80
    )
    summary: str = Field(
        description="2-3 sentence summary of the security event and its significance",
        max_length=300
    )
    threat_level: Literal["critical", "high", "medium", "low", "info"] = Field(
        description="Overall threat level assessment"
    )
    
    # EXPLAINABILITY: What happened?
    what_happened: str = Field(
        description="Clear explanation of WHAT anomalous behavior was observed (traffic patterns, volumes, protocols)",
        max_length=200
    )
    
    # EXPLAINABILITY: Why is it suspicious?
    why_suspicious: str = Field(
        description="Detailed explanation of WHY this behavior is considered suspicious or anomalous compared to normal patterns",
        max_length=200
    )
    
    # EXPLAINABILITY: How was it detected?
    detection_method: str = Field(
        description="Explanation of HOW the anomaly was detected (which statistical methods, thresholds, rules were triggered)",
        max_length=150
    )
    
    # EXPLAINABILITY: What are the indicators?
    threat_indicators: List[ThreatIndicator] = Field(
        description="List of specific threat indicators found with explanations",
        min_length=0,
        max_length=5
    )
    
    # EXPLAINABILITY: What should be done?
    recommendations: List[Recommendation] = Field(
        description="Actionable recommendations for responding to this event",
        min_length=1,
        max_length=3
    )
    
    # EXPLAINABILITY: Attack context
    attack_context: Optional[str] = Field(
        None,
        description="Context about the potential attack type, attacker objectives, and typical attack patterns",
        max_length=200
    )
    
    # EXPLAINABILITY: Technical details
    technical_details: Optional[dict] = Field(
        None,
        description="Key technical metrics (flow count, byte rate, packet sizes, protocols, ports) that triggered the detection"
    )
    
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Overall confidence in this analysis (0.0-1.0)"
    )


class IncidentCorrelation(BaseModel):
    """Correlation analysis for multiple related events."""
    incident_title: str = Field(description="Short title for the correlated incident")
    description: str = Field(description="Detailed description of the correlated incident")
    severity: Literal["critical", "high", "medium", "low"] = Field(
        description="Overall severity of the correlated incident"
    )
    attack_stage: Optional[Literal[
        "reconnaissance",
        "initial_access",
        "execution",
        "persistence",
        "privilege_escalation",
        "defense_evasion",
        "credential_access",
        "discovery",
        "lateral_movement",
        "collection",
        "exfiltration",
        "impact"
    ]] = Field(None, description="MITRE ATT&CK stage if applicable")
    related_event_count: int = Field(description="Number of events correlated into this incident")
    timeline: str = Field(description="Timeline of the attack progression")
    recommendations: List[Recommendation] = Field(
        description="Incident-level recommendations",
        min_length=1,
        max_length=5
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
