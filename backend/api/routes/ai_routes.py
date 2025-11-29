"""
API routes for AI-powered network security analysis.

Provides endpoints for:
- Structured event analysis with schema validation
- Incident correlation across multiple events
- Interactive chat queries about network security
"""
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from core.ai.instructor_client import InstructorClient
from core.ai.schemas import NetworkEventAnalysis, IncidentCorrelation, ChatQueryResponse
from config import config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI"])


# Request/Response models
class AnalyzeEventRequest(BaseModel):
    """Request to analyze a network event with structured output."""
    event: dict = Field(..., description="Network event data to analyze")
    include_context: bool = Field(default=True, description="Include recent event context")


class CorrelateIncidentRequest(BaseModel):
    """Request to correlate multiple events into an incident."""
    event_ids: list[str] = Field(..., description="List of event IDs to correlate")
    events_data: list[dict] = Field(..., description="Full event data for correlation")


class ChatRequest(BaseModel):
    """Request for interactive chat query."""
    question: str = Field(..., description="User's security question")
    include_events: bool = Field(default=True, description="Include recent event context")


# Initialize Instructor client lazily
_instructor_client: Optional[InstructorClient] = None


def get_instructor_client() -> InstructorClient:
    """Get or create the Instructor client instance."""
    global _instructor_client
    
    if _instructor_client is None:
        if config.ai.mode != "remote":
            raise HTTPException(
                status_code=503,
                detail="Structured AI endpoints require AI_MODE=remote in .env"
            )
        
        _instructor_client = InstructorClient(
            base_url=config.ai.remote_url,
            model=config.ai.remote_model,
            timeout=config.ai.timeout,
            temperature=config.ai.temperature
        )
        logger.info("Initialized InstructorClient for structured AI responses")
    
    return _instructor_client


@router.post("/analyze-event", response_model=NetworkEventAnalysis)
async def analyze_event_structured(request: AnalyzeEventRequest):
    """
    Analyze a network event with structured, validated output.
    
    Returns a NetworkEventAnalysis with:
    - Summary of the security event
    - Threat level assessment
    - Specific threat indicators with evidence
    - Actionable recommendations
    - Confidence score
    """
    try:
        client = get_instructor_client()
        
        event = request.event
        
        # Build comprehensive explainability-focused prompt
        prompt = f"""Analyze this network security anomaly and provide DETAILED EXPLAINABILITY:

=== EVENT DATA ===
Source IP: {event.get('src', 'unknown')}
Destination IP: {event.get('dst', 'unknown')}
Protocol: {event.get('proto', 'unknown')}
Flow Count: {event.get('flows', 0)}
Total Bytes: {event.get('total_bytes', 0)}
Average Packet Size: {event.get('avg_packet_size', 0)} bytes
Anomaly Score: {event.get('anomaly_score', 0.0)}
Detection Methods Used: {', '.join(event.get('detection_methods', []))}
Threat Indicators: {', '.join(event.get('threat_indicators', []))}
System Summary: {event.get('summary', 'No summary available')}

=== REQUIRED EXPLAINABILITY ===
0. BRIEF SUMMARY: Create a one-line summary (50-80 chars) for chat sidebar display
1. WHAT HAPPENED: Describe the observable anomalous behavior

1. WHAT HAPPENED: Describe the specific anomalous behavior observed in the traffic
2. WHY SUSPICIOUS: Explain why this deviates from normal network patterns
3. DETECTION METHOD: Explain how the detection methods (Z-Score, IQR, Rate-Based, etc.) identified this
4. THREAT INDICATORS: For each indicator, provide evidence AND explanation
5. ATTACK CONTEXT: What type of attack this might be and attacker objectives
6. TECHNICAL DETAILS: Key metrics that triggered the alert

Provide comprehensive security analysis with explainable threat indicators and actionable recommendations."""
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert network security analyst. Analyze events and provide structured, actionable security insights."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        response = await client.create_completion(
            messages=messages,
            response_model=NetworkEventAnalysis
        )
        
        logger.info(f"Structured analysis complete: threat_level={analysis.threat_level}, confidence={analysis.confidence}")
        return analysis
        
    except Exception as e:
        logger.error(f"Error in structured event analysis: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze event: {str(e)}"
        )


@router.post("/correlate-incident", response_model=IncidentCorrelation)
async def correlate_incident_structured(request: CorrelateIncidentRequest):
    """
    Correlate multiple events into a structured incident report.
    
    Returns an IncidentCorrelation with:
    - Incident title and description
    - Severity assessment
    - Attack stage classification (MITRE ATT&CK)
    - Timeline of attack progression
    - Incident-level recommendations
    """
    try:
        client = get_instructor_client()
        
        if len(request.events_data) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 events required for correlation"
            )
        
        # Build correlation prompt
        events_summary = []
        for i, event in enumerate(request.events_data[:10], 1):  # Limit to 10 events
            events_summary.append(f"""Event {i}:
- Time: {event.get('timestamp', 'unknown')}
- {event.get('src', 'unknown')}  {event.get('dst', 'unknown')} ({event.get('proto', 'unknown')})
- Anomaly Score: {event.get('anomaly_score', 0.0)}
- Detection: {', '.join(event.get('detection_methods', []))}
- Threats: {', '.join(event.get('threat_indicators', []))}
- Summary: {event.get('summary', 'N/A')}""")
        
        prompt = f"""Analyze these {len(request.events_data)} correlated network security events:

{chr(10).join(events_summary)}

Correlate these events into a comprehensive incident report. Identify the attack pattern, progression timeline, and provide incident-level recommendations."""
        
        messages = [
            {
                "role": "system",
                "content": "You are an expert security incident analyst. Correlate multiple events into comprehensive incident reports with MITRE ATT&CK classification."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        incident = await client.create_completion(
            messages=messages,
            response_model=IncidentCorrelation
        )
        
        logger.info(f"Incident correlation complete: {incident.incident_title} (severity={incident.severity})")
        return incident
        
    except Exception as e:
        logger.error(f"Error in incident correlation: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to correlate incident: {str(e)}"
        )


@router.post("/chat", response_model=ChatQueryResponse)
async def chat_structured(request: ChatRequest):
    """
    Interactive chat interface for network security queries.
    
    Returns a ChatQueryResponse with:
    - Clear answer to the question
    - Confidence score
    - Related event IDs
    - Follow-up question suggestions
    """
    try:
        client = get_instructor_client()
        
        messages = [
            {
                "role": "system",
                "content": "You are a helpful network security assistant. Answer questions clearly and suggest related event IDs when relevant."
            },
            {
                "role": "user",
                "content": request.question
            }
        ]
        
        response = await client.create_completion(
            messages=messages,
            response_model=ChatQueryResponse
        )
        
        logger.info(f"Chat query processed: confidence={response.confidence}, related_events={len(response.related_events)}")
        return response
        
    except Exception as e:
        logger.error(f"Error in chat query: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat query: {str(e)}"
        )
