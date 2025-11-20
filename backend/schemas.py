"""
schemas.py - Pydantic schemas for structured AI responses
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal


class AIExplanationResponse(BaseModel):
    """
    Structured response for network anomaly explanations.
    Forces the LLM to return validated, parseable data.
    """
    explanation: str = Field(
        description="2-3 sentence explanation of WHY this is anomalous INSTEAD OF normal traffic. "
                    "Reference specific deviations from baseline and why alternative explanations were rejected."
    )
    
    important_factors: List[str] = Field(
        description="Top 3 most critical factors that make this anomalous. "
                    "Be selective - only the most important evidence.",
        min_length=1,
        max_length=3
    )
    
    threat_level: Literal["low", "medium", "high", "critical"] = Field(
        description="Assessed threat level based on severity and potential impact"
    )
    
    confidence: Literal["low", "medium", "high"] = Field(
        description="Confidence in the analysis based on available evidence"
    )
    
    recommendations: List[str] = Field(
        description="2-3 specific actionable recommendations for the analyst",
        min_length=1,
        max_length=3
    )
    
    evidence_summary: Optional[str] = Field(
        default=None,
        description="Brief summary of key evidence (IPs, ports, packet counts)"
    )
    
    payload_evidence: Optional[List[str]] = Field(
        default=None,
        description="Specific suspicious patterns found in packet payloads (e.g., SQL keywords, script tags, encoded data)",
        max_length=5
    )
    
    counterfactual_reasoning: Optional[str] = Field(
        default=None,
        description="What would have made this traffic normal? (e.g., 'If packet count was <50 and no SQL keywords in payload')"
    )


class ChatResponse(BaseModel):
    """
    Structured response for chat queries about network activity.
    """
    answer: str = Field(
        description="Clear, concise answer to the user's question based on network activity context"
    )
    
    referenced_events: List[str] = Field(
        default_factory=list,
        description="Timestamps or IDs of events mentioned in the answer"
    )
    
    confidence: Literal["low", "medium", "high"] = Field(
        description="Confidence in the answer based on available network data"
    )
    
    follow_up_suggestions: Optional[List[str]] = Field(
        default=None,
        description="Suggested follow-up questions the user might ask",
        max_length=2
    )


class EventQueryResponse(BaseModel):
    """
    Structured response for on-demand event queries.
    """
    analysis: str = Field(
        description="Analysis of the specific event in context of the user's question"
    )
    
    severity_assessment: Literal["benign", "suspicious", "malicious", "unknown"] = Field(
        description="Assessment of whether the event is benign or malicious"
    )
    
    next_steps: List[str] = Field(
        description="Specific next steps the analyst should take",
        min_length=1,
        max_length=3
    )
    
    confidence: Literal["low", "medium", "high"] = Field(
        description="Confidence in the analysis"
    )
