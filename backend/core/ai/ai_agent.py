"""
ai_agent.py - Enhanced AI reasoning module with structured outputs
Features:
- Dual-mode support (local Ollama / remote UCY server)
- Structured explanations with evidence references
- Incident correlation across multiple anomalies
- Chat interface for interactive queries
- Confidence scoring and threat assessment
- Actionable recommendations
"""

import asyncio
import logging
from typing import Dict, Optional, Literal, List, Any
from collections import deque
from datetime import datetime
import aiohttp
import json

# Import Instructor client for structured AI analysis
try:
    from core.ai.instructor_client import InstructorClient
    INSTRUCTOR_AVAILABLE = True
except ImportError:
    INSTRUCTOR_AVAILABLE = False
    logger.warning("Instructor client not available - structured analysis disabled")

logger = logging.getLogger(__name__)


class AIAgent:
    """Enhanced AI agent with incident correlation and structured explanations."""
    
    def __init__(
        self, 
        mode: Literal['local', 'remote'] = 'local',
        # Local settings
        ollama_url: str = "http://localhost:11434",
        local_model: str = "mistral:7b",
        # Remote settings
        remote_url: str = "https://chatucy.cs.ucy.ac.cy/api/send_message",
        remote_model: str = "gemma3",
        remote_websearch: bool = False,
        remote_client_rag: bool = False,
        # Common settings
        timeout: int = 30,
        max_tokens: int = 800,
        system_prompt: str = None,
        # Correlation settings
        correlation_window: int = 300,  # 5 minutes
        max_memory_events: int = 100
    ):
        """
        Initialize enhanced AI agent.
        
        Args:
            mode: 'local' for Ollama or 'remote' for UCY server
            correlation_window: Time window in seconds for correlating related events
            max_memory_events: Maximum number of recent events to keep in memory
        """
        self.mode = mode
        
        # Local settings
        self.ollama_url = ollama_url
        self.local_model = local_model
        
        # Remote settings
        self.remote_url = remote_url
        self.remote_model = remote_model
        self.remote_websearch = remote_websearch
        self.remote_client_rag = remote_client_rag
        
        # Common settings
        self.timeout = timeout
        self.max_tokens = max_tokens
        self.system_prompt = system_prompt or self._default_system_prompt()
        
        # Event memory for correlation
        self.correlation_window = correlation_window
        self.max_memory_events = max_memory_events
        self.recent_events = deque(maxlen=max_memory_events)
        # Use bounded deque for incident clusters to prevent memory leak
        self.incident_clusters: deque = deque(maxlen=50)  # Keep last 50 incidents
        
        # CRITICAL FIX: Add sequence counter to prevent out-of-order event processing
        # Ensures frontend can sort events chronologically even if AI processing is slow
        self.event_sequence = 0
        
        # AI Request limiting: Semaphore to ensure max 1 concurrent AI request
        self.ai_request_semaphore = asyncio.Semaphore(1)
        self.ai_request_queue: asyncio.Queue = asyncio.Queue()  # Queue for pending AI requests
        self.ai_requests_pending = 0
        self.ai_requests_processed = 0
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.query_count = 0
        self.error_count = 0
        self.incidents_detected = 0
        
        # Initialize Instructor client for structured analysis
        self.instructor_client: Optional[InstructorClient] = None
        if INSTRUCTOR_AVAILABLE and mode == 'remote':
            try:
                self.instructor_client = InstructorClient(
                    base_url=remote_url,
                    model=remote_model,
                    timeout=timeout
                )
                logger.info("Instructor client initialized for structured AI analysis")
            except Exception as e:
                logger.warning(f"Failed to initialize Instructor client: {e}")
        
    def _default_system_prompt(self) -> str:
        """Generate default system prompt for industry-standard network security analysis."""
        return """You are an expert network security analyst with certifications (OSCP, CEH, GCIH).

ANALYSIS FRAMEWORK:
1. **Forensic Evidence**: What specific traffic patterns, byte counts, timing anomalies were observed?
2. **Root Cause Analysis**: How does this deviate from baseline? What known attack patterns match?
3. **MITRE ATT&CK Mapping**: Which lifecycle stages (reconnaissance  impact) does this represent?
4. **CVSS v4.0 Scoring**: Quantify severity: attack complexity, privileges needed, user interaction, scope, CIA impact
5. **Risk Assessment**: Multiply likelihood  impact  asset_criticality for business context
6. **Compliance Impact**: Which regulations are implicated (PCI-DSS, HIPAA, GDPR, SOC 2)?
7. **Incident Response**: Prioritize actions with timeframes (immediate, 1hr, 4hr, 24hr)

OWASP/CWE CLASSIFICATION:
- Map indicators to CWE (Common Weakness Enumeration) and OWASP Top 10
- Reference specific vulnerability classes (injection, authentication bypass, etc.)

OUTPUT REQUIREMENTS:
- Use technical precision: "DNS queries with 95-character subdomains" not "suspicious DNS"
- Include forensic metrics: packet count, byte rate, entropy scores, geolocation
- Avoid vague hedging; state confidence levels explicitly (95% certain vs. 45% possible)
- Provide investigation checklists for SOC analysts
- Flag potential false positives (authorized penetration tests, backup windows)
- Reference threat intelligence: known APT groups, malware families, IoCs

THREAT INTEL CONTEXT:
- Consider historical attack patterns and trend analysis
- Evaluate attacker sophistication (script-kiddie, organized crime, nation-state)
- Assess attack objectives (financial gain, espionage, data destruction)
- Reference known TTPs (Tactics, Techniques, Procedures) from open-source intel (MITRE, Shodan, VirusTotal)"""
        
    async def initialize(self):
        """Initialize HTTP session and test connection."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        
        logger.info(f"Enhanced AI Agent initialized in {self.mode.upper()} mode")
        logger.info(f"Correlation window: {self.correlation_window}s, Max memory: {self.max_memory_events} events")
        
        # Test connection
        try:
            await self._test_connection()
        except Exception as e:
            logger.warning(f"Could not connect to AI service: {e}")
            logger.warning("AI explanations will be disabled until service is available.")
    
    def _sanitize_recommendation_timeframe(self, timeframe: str) -> str:
        """
        Normalize recommendation timeframe to valid enum values.
        
        Converts variations like 'immediate (< 15min)' to 'immediate'.
        """
        if not timeframe:
            return "asap"
        
        timeframe = str(timeframe).lower().strip()
        valid_values = ["immediate", "1_hour", "4_hours", "24_hours", "asap"]
        
        # Check if exact match
        if timeframe in valid_values:
            return timeframe
        
        # Try to extract valid value from string
        for valid in valid_values:
            if valid in timeframe:
                return valid
        
        # Fallback mapping for common variations
        if "immediate" in timeframe or "now" in timeframe or "urgent" in timeframe:
            return "immediate"
        if "1" in timeframe and "hour" in timeframe:
            return "1_hour"
        if "4" in timeframe and "hour" in timeframe:
            return "4_hours"
        if "24" in timeframe or "day" in timeframe:
            return "24_hours"
        
        return "asap"
    
    def _sanitize_threat_indicators(self, indicators: List[Dict]) -> List[Dict]:
        """
        Ensure all threat indicators have required fields.
        Fixes missing 'explanation' and other common issues.
        """
        if not indicators:
            return []
        
        sanitized = []
        for indicator in indicators:
            if not isinstance(indicator, dict):
                continue
            
            # Ensure explanation field exists
            if "explanation" not in indicator or not indicator.get("explanation"):
                # Generate explanation from evidence if missing
                indicator["explanation"] = indicator.get("evidence", "Anomaly detected")[:300]
            
            # Ensure confidence is a float
            if "confidence" in indicator:
                try:
                    indicator["confidence"] = float(indicator["confidence"])
                    indicator["confidence"] = max(0.0, min(1.0, indicator["confidence"]))
                except (ValueError, TypeError):
                    indicator["confidence"] = 0.5
            else:
                indicator["confidence"] = 0.5
            
            # Ensure lists are lists
            for field in ["cwe_ids", "owasp_references", "mitre_techniques"]:
                if field not in indicator:
                    indicator[field] = []
                elif not isinstance(indicator[field], list):
                    indicator[field] = []
            
            sanitized.append(indicator)
        
        return sanitized
    
    def _sanitize_attack_context(self, attack_context: Any) -> Optional[str]:
        """Convert attack_context to string if it's a dict or other type."""
        if not attack_context:
            return None
        
        if isinstance(attack_context, str):
            return attack_context
        
        if isinstance(attack_context, dict):
            # Convert dict to string description
            parts = []
            if attack_context.get("type"):
                parts.append(f"Attack type: {attack_context['type']}")
            if attack_context.get("attacker_objectives"):
                parts.append(f"Objectives: {attack_context['attacker_objectives']}")
            if attack_context.get("historical_patterns"):
                parts.append(f"Historical patterns: {attack_context['historical_patterns']}")
            
            return ". ".join(parts) if parts else str(attack_context)
        
        return str(attack_context)
    
    async def _test_connection(self):
        """Test connection to AI service."""
        if self.mode == 'local':
            try:
                async with self.session.get(f"{self.ollama_url}/api/tags", timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = [m["name"] for m in data.get("models", [])]
                        logger.info(f"Connected to Ollama. Available models: {models}")
                        
                        model_exists = any(self.local_model in m for m in models)
                        if not model_exists:
                            logger.warning(
                                f"Model '{self.local_model}' not found. "
                                f"Run: ollama pull {self.local_model}"
                            )
                    else:
                        logger.error(f"Ollama API returned status {response.status}")
            except asyncio.TimeoutError:
                logger.error(f"Timeout connecting to Ollama at {self.ollama_url} (is it running?)")
                raise
            except aiohttp.ClientConnectionError as e:
                logger.error(f"Connection refused to Ollama at {self.ollama_url}: {e}")
                raise
            except Exception as e:
                logger.error(f"Error testing Ollama connection: {type(e).__name__}: {e}")
                raise
        else:
            logger.info(f"Remote mode configured: {self.remote_url}")
            logger.info(f"Model: {self.remote_model}")
    
    async def process_events(
        self,
        event_queue: asyncio.Queue,
        output_queue: asyncio.Queue
    ):
        """
        Process events with enhanced correlation and structured analysis.
        
        Args:
            event_queue: Queue receiving condensed events
            output_queue: Queue to send events with AI responses
        """
        logger.info("Enhanced AI processing started (correlation enabled)...")
        
        while True:
            try:
                # Add timeout to prevent hanging if event_queue is stuck
                try:
                    event = await asyncio.wait_for(event_queue.get(), timeout=30.0)
                except asyncio.TimeoutError:
                    logger.warning("Event queue timeout (30s) - may indicate pipeline stall")
                    continue
                
                # CRITICAL FIX: Add sequence number to prevent out-of-order event processing
                # Frontend can use this to maintain chronological order despite variable AI processing times
                self.event_sequence += 1
                event["event_sequence"] = self.event_sequence
                
                is_anomaly = event.get("is_anomaly", False)
                severity = event.get("severity", "low")
                is_warmup = event.get("is_warmup", False)
                
                # Debug: Log ALL event status (not just anomalies)
                logger.info(f"Event {event['src']}  {event['dst']} | is_anomaly={is_anomaly}, severity={severity}, warmup={is_warmup}, score={event.get('anomaly_score', 0):.2f}")
                
                # Skip AI during warmup
                if is_warmup:
                    logger.info(f"  SKIP: Warmup phase")
                    event["ai_explanation"] = None
                    event["ai_processed"] = False
                    event["ai_mode"] = None
                    event["ai_timestamp"] = None
                    await output_queue.put(event)
                    continue
                
                # Skip non-anomalies
                if not is_anomaly or severity not in ["medium", "high", "critical"]:
                    logger.info(f"  SKIP: Not anomaly or severity too low ({severity})")
                    event["ai_explanation"] = None
                    event["ai_processed"] = False
                    event["ai_timestamp"] = None
                    await output_queue.put(event)
                    continue
                
                # Add to memory for correlation
                self.recent_events.append(event)
                
                # Analyze medium+ anomalies
                logger.info(f"  ANALYZE: {severity.upper()} anomaly - calling AI...")
                
                # Check for correlated events
                correlated_events = self._find_correlated_events(event)
                
                # Generate structured explanation WITH semaphore to limit concurrent requests to 1
                self.ai_requests_pending += 1
                logger.info(f"  AI Request queued (pending: {self.ai_requests_pending}, processed: {self.ai_requests_processed})")
                
                async with self.ai_request_semaphore:
                    # Semaphore acquired - now we have exclusive access to AI
                    logger.info(f"  AI Request processing (was pending: {self.ai_requests_pending})")
                    explanation = await self._generate_structured_explanation(
                        event, 
                        correlated_events
                    )
                    self.ai_requests_processed += 1
                    self.ai_requests_pending -= 1
                
                event["ai_explanation"] = explanation.get("text", "")
                event["ai_confidence"] = explanation.get("confidence", "medium")
                event["ai_threat_level"] = explanation.get("threat_level", "medium")
                event["ai_recommendations"] = explanation.get("recommendations", [])
                event["ai_evidence"] = explanation.get("evidence", {})
                event["ai_correlated_events"] = len(correlated_events)
                event["ai_processed"] = True
                event["ai_mode"] = self.mode
                event["ai_timestamp"] = datetime.now().isoformat()
                
                # Add structured analysis if available (from Instructor)
                if "structured_analysis" in explanation:
                    event["ai_analysis"] = explanation["structured_analysis"]
                
                self.query_count += 1
                
                # Check if this is part of a larger incident
                if len(correlated_events) >= 2:
                    incident = self._create_incident(event, correlated_events)
                    event["ai_incident"] = incident
                    self.incidents_detected += 1
                    logger.warning(f"INCIDENT DETECTED: {incident['title']}")
                
                await output_queue.put(event)
                
            except Exception as e:
                logger.error(f"Error processing event: {type(e).__name__}: {e}", exc_info=True)
                self.error_count += 1
                
                # Forward event without AI
                event["ai_explanation"] = "AI analysis unavailable"
                event["ai_processed"] = False
                event["ai_timestamp"] = datetime.now().isoformat()
                await output_queue.put(event)
                
                await asyncio.sleep(1)
    
    def _find_correlated_events(self, current_event: Dict) -> List[Dict]:
        """Find events correlated with the current anomaly."""
        if not self.recent_events:
            return []
        
        correlated = []
        current_time = datetime.fromisoformat(current_event["timestamp"])
        current_src = current_event.get("src")
        current_dst = current_event.get("dst")
        current_proto = current_event.get("proto")
        
        for event in reversed(self.recent_events):
            if event.get("timestamp") == current_event.get("timestamp"):
                continue
            
            event_time = datetime.fromisoformat(event["timestamp"])
            if (current_time - event_time).total_seconds() > self.correlation_window:
                break
            
            if not event.get("is_anomaly", False):
                continue
            
            same_src = event.get("src") == current_src
            same_dst = event.get("dst") == current_dst
            same_proto = event.get("proto") == current_proto
            
            if same_src or (same_dst and same_proto):
                correlated.append(event)
        
        return correlated
    
    async def _generate_structured_explanation(
        self, 
        event: Dict,
        correlated_events: List[Dict]
    ) -> Dict:
        """Generate structured explanation with evidence and recommendations."""
        try:
            # Try Instructor-based structured analysis first (remote mode only)
            if self.instructor_client and self.mode == 'remote':
                try:
                    from core.ai.schemas import NetworkEventAnalysis
                    
                    # Build context for structured analysis (let Instructor handle schema injection)
                    context = f"""NETWORK SECURITY INCIDENT ANALYSIS - Industry Standard Report

=== FORENSIC DATA ===
Timestamp: {event.get('timestamp', 'N/A')}
Source IP: {event.get('src', 'unknown')}  Destination IP: {event.get('dst', 'unknown')}
Protocol: {event.get('proto', 'unknown')} | Flow Count: {event.get('flows', 0)} | Total Bytes: {event.get('total_bytes', 0):,}
Avg Packet Size: {event.get('avg_packet_size', 0)} bytes | Anomaly Score: {event.get('anomaly_score', 0.0):.3f}
Baseline Expected: ~{event.get('baseline_avg', 0)} flows | Anomaly Multiplier: {event.get('flows', 1) / max(event.get('baseline_avg', 1), 1):.1f}x

=== DETECTION ANALYSIS ===
Statistical Methods: {', '.join(event.get('detection_methods', ['Unknown'])) if event.get('detection_methods') else 'Unknown'}
Threat Indicators: {', '.join(event.get('threat_indicators', ['None'])) if event.get('threat_indicators') else 'None'}
Event Summary: {event.get('summary', 'N/A')}

=== ANALYSIS REQUIREMENTS (NIST/CVSS/MITRE) ===
1. Provide FORENSIC DESCRIPTION: What traffic patterns, sizes, timing anomalies were observed?
2. Provide ROOT CAUSE ANALYSIS: Baseline deviation + matching attack patterns + threat intel
3. Map to MITRE ATT&CK Framework: Which attack stages (reconnaissance, command_and_control, exfiltration)?
4. Assign CVSS v4.0 SCORE (0.0-10.0) based on attack complexity, privileges needed, impact scope
5. Calculate RISK SCORE: (likelihood  impact  asset_criticality) resulting in 0-100 score
6. Identify COMPLIANCE IMPACT: PCI-DSS, HIPAA, GDPR, SOC 2, ISO 27001 implications
7. Provide INVESTIGATION CHECKLIST: Specific actions for SOC analysts (logs to review, tools to run)
8. Include RECOMMENDATIONS with TIMEFRAMES: Use ONLY these exact values for timeframe: "immediate", "1_hour", "4_hours", "24_hours", "asap"
9. Assign CWE/OWASP REFERENCES: Weakness Enumeration and OWASP Top 10 classifications
10. Flag FALSE POSITIVE INDICATORS: Authorized activities, scheduled tasks, maintenance windows

=== CRITICAL JSON SCHEMA REQUIREMENTS ===
THREAT_INDICATORS SCHEMA (EACH object MUST have ALL these fields):
{{
  "type": "string (reconnaissance|port_scan|dns_tunneling|data_exfiltration|brute_force|ddos|malware_beacon|sql_injection|xss|command_injection|lateral_movement|privilege_escalation|suspicious_traffic|c2_communication|vulnerability_scan|zero_day_exploit|ransomware_activity)",
  "confidence": float (0.0-1.0),
  "evidence": "string (specific forensic evidence with metrics)",
  "explanation": "string (WHY this is suspicious - REQUIRED FIELD, DO NOT OMIT)",
  "cwe_ids": ["list of CWE IDs like CWE-89"],
  "owasp_references": ["list like OWASP-1"],
  "mitre_techniques": ["list like T1046"]
}}

RECOMMENDATIONS SCHEMA (EACH object MUST have ALL these fields):
{{
  "action": "string (specific executable action)",
  "priority": "string (critical|high|medium|low)",
  "details": "string (implementation details)",
  "timeframe": "string (MUST BE: immediate, 1_hour, 4_hours, 24_hours, or asap - NO OTHER VALUES)",
  "affected_systems": ["list of IPs/hostnames"],
  "compliance_impact": ["list of compliance frameworks"]
}}

ATTACK_CONTEXT (MUST be a STRING, not a dict):
"string description of attack type, objectives, TTPs, historical context"

RETURN ONLY FLAT JSON with ALL required fields at root level (NO wrapper object):
- brief_summary: One-line executive summary (50-80 chars)
- summary: Executive summary with business impact (2-3 sentences)
- threat_level: "critical" (9-10), "high" (7-8.9), "medium" (4-6.9), "low" (0.1-3.9), "info" (0)
- cvss_score: CVSS v4.0 score (0.0-10.0)
- risk_score: Business risk score (0-100)
- what_happened: Forensic description of observed behavior
- why_suspicious: Deviation analysis + attack pattern matching
- detection_method: Statistical methods used (Z-Score, IQR, EWMA, entropy analysis)
- threat_indicators: Array of threat indicator objects (EACH MUST have explanation field)
- recommendations: Array of recommendation objects (timeframe MUST be: immediate, 1_hour, 4_hours, 24_hours, or asap)
- attack_context: STRING description of attack (NOT a dict)
- mitre_attack_stages: Array of applicable MITRE lifecycle stages
- technical_details: Dict with forensic metrics (flows, bytes, packet sizes, geolocation, timing)
- affected_assets: Array with ip, type, criticality, department
- compliance_implications: Array of frameworks affected
- forensic_chain: Dict with timestamps, data sources, integrity details
- investigation_checklist: Array of specific SOC analyst actions
- false_positive_indicators: Array of potential false positive causes
- confidence: Float 0.0-1.0 based on signal strength and evidence quality"""
                    
                    system_prompt = """You are a security analyst. Output ONLY valid JSON matching this EXACT schema. DO NOT WRAP IN CODE BLOCKS.

CRITICAL REQUIREMENTS:
1. Output ONLY raw JSON - NO markdown code blocks, NO ```json markers, NO explanations
2. Every field MUST be present (no omissions)
3. brief_summary MUST be 20-80 characters long
4. investigation_checklist MUST be STRINGS ONLY - see example below

FIELD REQUIREMENTS:
- brief_summary: string 20-80 chars (NOT 30!) example: "Unusual network activity detected"
- summary: string 50-1000 chars
- threat_level: "critical"|"high"|"medium"|"low"|"info"
- cvss_score: float 0.0-10.0
- risk_score: float 0-100
- what_happened: string 1-400 chars
- why_suspicious: string 1-600 chars
- detection_method: string 1-300 chars
- threat_indicators: array, min 1 item, each object MUST have ALL: type, confidence (0.0-1.0), evidence, explanation, cwe_ids, owasp_references, mitre_techniques
- recommendations: array, min 1 item, each object MUST have ALL: action, priority (critical|high|medium|low), details, timeframe (immediate|1_hour|4_hours|24_hours|asap), affected_systems, compliance_impact
- attack_context: string 1-400 chars (REQUIRED)
- confidence: float 0.0-1.0
- mitre_attack_stages: array of strings
- technical_details: object or null
- affected_assets: array or empty
- compliance_implications: array or empty
- forensic_chain: object or null
- false_positive_indicators: array or empty
- investigation_checklist: ARRAY OF STRINGS ONLY - example: ["Review logs for IOCs", "Run vulnerability scan"] NOT [{"action": "..."}]

JSON FORMAT EXAMPLE (investigation_checklist as STRINGS):
{"investigation_checklist": ["Check firewall logs", "Review DNS queries", "Analyze packet capture"]}
NOT: {"investigation_checklist": [{"action": "Check logs"}, {"action": "Review DNS"}]}

OUTPUT RULES - CRITICAL:
 ONLY JSON, NO code blocks, NO explanation
 NO markdown formatting
 Every field present and non-null
 brief_summary minimum 20 chars (not 30!)
 All arrays have required items
 investigation_checklist items are plain strings"""
                    
                    # Get structured analysis from Instructor
                    # MD_JSON mode automatically:
                    # 1. Injects schema into prompt
                    # 2. Validates against NetworkEventAnalysis model
                    # 3. Retries on validation failure
                    try:
                        analysis = await self.instructor_client.create_completion(
                            response_model=NetworkEventAnalysis,
                            messages=[
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": context}
                            ]
                        )
                        logger.info(" Instructor validation successful")
                    except Exception as validation_error:
                        logger.error(f"Instructor validation failed after retries: {validation_error}")
                        raise  # No fallback - enforce schema strictly
                    
                    
                    # Build response with two-tier display:
                    # 1. Chat window: brief_summary (one-liner for quick reading)
                    # 2. Modal/Details: full structured analysis with all industry-standard fields
                    try:
                        # Handle both NetworkEventAnalysis objects and dict responses
                        recommendations = []
                        if hasattr(analysis, 'recommendations'):  # Pydantic object
                            recommendations = analysis.recommendations
                        elif isinstance(analysis, dict) and 'recommendations' in analysis:  # Dict fallback
                            recommendations = analysis.get('recommendations', [])
                        
                        # Safely extract recommendation data
                        quick_recs = []
                        if recommendations:
                            for r in recommendations[:2]:
                                if isinstance(r, dict):  # Dict format (from fallback AI)
                                    quick_recs.append({
                                        "action": r.get("action", ""),
                                        "priority": r.get("priority", "medium"),
                                        "timeframe": r.get("timeframe", "asap")
                                    })
                                else:  # Pydantic object
                                    quick_recs.append({
                                        "action": r.action,
                                        "priority": r.priority,
                                        "timeframe": r.timeframe
                                    })
                        
                        return {
                            # CHAT WINDOW: Brief, one-line display
                            "text": analysis.brief_summary if hasattr(analysis, 'brief_summary') else analysis.get('text', ''),
                            "ai_explanation": analysis.summary if hasattr(analysis, 'summary') else analysis.get('ai_explanation', ''),
                            "confidence": "high" if (analysis.confidence if hasattr(analysis, 'confidence') else 0.5) > 0.8 else "medium" if (analysis.confidence if hasattr(analysis, 'confidence') else 0.5) > 0.5 else "low",
                            "threat_level": analysis.threat_level if hasattr(analysis, 'threat_level') else analysis.get('threat_level', 'medium'),
                            "cvss_score": analysis.cvss_score if hasattr(analysis, 'cvss_score') else 5.0,
                            "risk_score": analysis.risk_score if hasattr(analysis, 'risk_score') else 50,
                            
                            # QUICK ACTIONS: For chat-level recommendations
                            "quick_recommendations": quick_recs,
                            
                            # EVIDENCE for chat hover
                            "evidence": analysis.get('evidence', {}) if isinstance(analysis, dict) else self._extract_evidence(event),
                            
                            # FULL STRUCTURED ANALYSIS: Only for modal/details view
                            "structured_analysis": {
                                # EXECUTIVE SUMMARIES
                                "brief_summary": analysis.get('text', '') if isinstance(analysis, dict) else analysis.brief_summary,
                                "summary": analysis.get('ai_explanation', '') if isinstance(analysis, dict) else analysis.summary,
                                "threat_level": analysis.get('threat_level', 'medium') if isinstance(analysis, dict) else analysis.threat_level,
                                "cvss_score": analysis.get('cvss_score', 5.0) if isinstance(analysis, dict) else analysis.cvss_score,
                                "risk_score": analysis.get('risk_score', 50) if isinstance(analysis, dict) else analysis.risk_score,
                                
                                # FORENSIC ANALYSIS
                                "what_happened": analysis.get('text', '') if isinstance(analysis, dict) else analysis.what_happened,
                                "why_suspicious": analysis.get('ai_explanation', '') if isinstance(analysis, dict) else analysis.why_suspicious,
                                "detection_method": "Statistical anomaly detection" if isinstance(analysis, dict) else analysis.detection_method,
                                
                                # THREAT CLASSIFICATION
                                "threat_indicators": [
                                    {
                                        "type": ti.get('type', 'suspicious_traffic') if isinstance(ti, dict) else ti.type,
                                        "confidence": ti.get('confidence', 0.5) if isinstance(ti, dict) else ti.confidence,
                                        "evidence": ti.get('evidence', '') if isinstance(ti, dict) else ti.evidence,
                                        "explanation": ti.get('explanation', '') if isinstance(ti, dict) else ti.explanation,
                                        "cwe_ids": ti.get('cwe_ids', []) if isinstance(ti, dict) else (ti.cwe_ids or []),
                                        "owasp_references": ti.get('owasp_references', []) if isinstance(ti, dict) else (ti.owasp_references or []),
                                        "mitre_techniques": ti.get('mitre_techniques', []) if isinstance(ti, dict) else (ti.mitre_techniques or [])
                                    }
                                    for ti in (analysis.get('threat_indicators', []) if isinstance(analysis, dict) else (analysis.threat_indicators or []))
                                ],
                                
                                # INCIDENT RESPONSE - Handle both dict recommendations (strings) and Pydantic Recommendation objects
                                "recommendations": [
                                    {
                                        "action": r if isinstance(r, str) else (r.get('action', '') if isinstance(r, dict) else r.action),
                                        "priority": "medium" if isinstance(r, str) else (r.get('priority', 'medium') if isinstance(r, dict) else r.priority),
                                        "details": "See action above" if isinstance(r, str) else (r.get('details', '') if isinstance(r, dict) else r.details),
                                        "timeframe": "asap" if isinstance(r, str) else (r.get('timeframe', 'asap') if isinstance(r, dict) else r.timeframe),
                                        "affected_systems": [] if isinstance(r, str) else (r.get('affected_systems', []) if isinstance(r, dict) else (r.affected_systems or [])),
                                        "compliance_impact": [] if isinstance(r, str) else (r.get('compliance_impact', []) if isinstance(r, dict) else (r.compliance_impact or []))
                                    }
                                    for r in (analysis.get('recommendations', []) if isinstance(analysis, dict) else (analysis.recommendations or []))
                                ],
                                
                                # ATTACK CONTEXT & FRAMEWORK MAPPING
                                "attack_context": analysis.get('text', '') if isinstance(analysis, dict) else analysis.attack_context,
                                "mitre_attack_stages": [] if isinstance(analysis, dict) else (analysis.mitre_attack_stages or []),
                                
                                # FORENSIC EVIDENCE
                                "technical_details": analysis.get('evidence', {}) if isinstance(analysis, dict) else (analysis.technical_details or {}),
                                "affected_assets": [] if isinstance(analysis, dict) else (analysis.affected_assets or []),
                                "compliance_implications": [] if isinstance(analysis, dict) else (analysis.compliance_implications or []),
                                "forensic_chain": {} if isinstance(analysis, dict) else (analysis.forensic_chain or {}),
                                
                                # SOC ANALYST SUPPORT
                                "investigation_checklist": [] if isinstance(analysis, dict) else (analysis.investigation_checklist or []),
                                "false_positive_indicators": [] if isinstance(analysis, dict) else (analysis.false_positive_indicators or []),
                                
                                # CONFIDENCE & UNCERTAINTY
                                "confidence": analysis.get('confidence', 'medium') if isinstance(analysis, dict) else analysis.confidence,
                                
                                # IUI FEATURE: Explanation confidence with detection methods and threat distribution
                                "explanation_confidence": self._compute_explanation_confidence(event, analysis)
                            }
                        }
                    except AttributeError as attr_err:
                        logger.error(f"Missing attribute in analysis object: {attr_err}")
                        logger.error(f"Analysis object attributes: {vars(analysis)}")
                        raise
                    
                except Exception as instructor_error:
                    logger.warning(f"Instructor analysis failed, falling back to basic AI: {instructor_error}")
            
            # Fallback to basic AI analysis
            prompt = self._build_structured_prompt(event, correlated_events)
            
            if self.mode == 'local':
                raw_response = await self._query_local(prompt)
            else:
                raw_response = await self._query_remote(prompt)
            
            structured = self._parse_ai_response(raw_response, event, correlated_events)
            
            return structured
            
        except Exception as e:
            logger.error(f"AI generation error: {e}")
            return {
                "text": f"AI analysis failed: {str(e)[:50]}",
                "confidence": "low",
                "threat_level": "unknown",
                "recommendations": ["Review manually"],
                "evidence": self._extract_evidence(event)
            }
    
    def _build_structured_prompt(self, event: Dict, correlated: List[Dict]) -> str:
        """Build enhanced prompt with correlation context and related events analysis."""
        src = event.get("src", "unknown")
        dst = event.get("dst", "unknown")
        proto = event.get("proto", "unknown")
        flows = event.get("flows", 0)
        severity = event.get("severity", "normal")
        anomaly_score = event.get("anomaly_score", 0.0)
        baseline_avg = event.get("baseline_avg", 0)
        summary = event.get("summary", "")
        detection_methods = event.get("detection_methods", [])
        threat_indicators = event.get("threat_indicators", [])
        
        prompt = f"""Network Security Analysis Request

=== CURRENT EVENT ===
Timestamp: {event.get('timestamp', 'N/A')}
Source: {src}  Destination: {dst}
Protocol: {proto}
Volume: {flows} flows (expected: ~{int(baseline_avg)})
Total Bytes: {event.get('total_bytes', 0):,}
Anomaly Score: {anomaly_score:.2f} ({severity.upper()})
Detection Methods: {', '.join(detection_methods) if detection_methods else 'None'}"""
        
        if threat_indicators:
            prompt += f"\n Threat Indicators: {', '.join(threat_indicators)}"
        
        prompt += f"\nSummary: {summary}"
        
        # Enhanced related events analysis
        if self.recent_events:
            prompt += f"\n\n=== RELATED EVENTS (Last {self.correlation_window}s) ==="
            
            # Analyze patterns from recent events
            events_list = list(self.recent_events)[-20:]  # Last 20 events
            
            # Group by source IP
            events_by_source = {}
            events_by_threat = {}
            
            for prev_event in events_list:
                prev_src = prev_event.get('src', 'unknown')
                
                # Group by source
                if prev_src not in events_by_source:
                    events_by_source[prev_src] = []
                events_by_source[prev_src].append(prev_event)
                
                # Group by threat type
                for threat in prev_event.get('threat_indicators', []):
                    if threat not in events_by_threat:
                        events_by_threat[threat] = []
                    events_by_threat[threat].append(prev_event)
            
            # Analyze current source's activity
            if src in events_by_source and len(events_by_source[src]) > 1:
                src_events = events_by_source[src]
                unique_dests = set(e.get('dst', 'N/A') for e in src_events[-5:])
                unique_protos = set(e.get('proto', 'N/A') for e in src_events[-5:])
                
                prompt += f"\n\n Activity from {src}:"
                prompt += f"\n  - Total events: {len(src_events)}"
                prompt += f"\n  - Destinations: {', '.join(list(unique_dests)[:5])}"
                prompt += f"\n  - Protocols: {', '.join(unique_protos)}"
                
                # Check for escalation
                scores = [e.get('anomaly_score', 0) for e in src_events[-5:]]
                if len(scores) >= 2 and scores[-1] > scores[0]:
                    prompt += f"\n  -  ESCALATING: Score increased from {scores[0]:.2f}  {scores[-1]:.2f}"
            
            # Analyze threat patterns
            for threat in threat_indicators:
                if threat in events_by_threat and len(events_by_threat[threat]) > 1:
                    threat_events = events_by_threat[threat]
                    unique_sources = set(e.get('src') for e in threat_events)
                    
                    prompt += f"\n\n {threat} Pattern:"
                    prompt += f"\n  - Seen {len(threat_events)} times from {len(unique_sources)} sources"
                    prompt += f"\n  - Sources: {', '.join(list(unique_sources)[:5])}"
                    
                    if len(unique_sources) >= 3:
                        prompt += f"\n  -  MULTI-SOURCE ATTACK: Possible botnet or coordinated effort"
            
            # Show recent timeline
            prompt += f"\n\n Recent Timeline (last 5 events):"
            for prev_event in events_list[-5:]:
                timestamp = prev_event.get('timestamp', 'N/A')
                # Extract time only (HH:MM:SS)
                time_only = timestamp[-12:-4] if len(timestamp) > 12 else timestamp
                prev_src = prev_event.get('src', 'N/A')
                prev_dst = prev_event.get('dst', 'N/A')
                prev_proto = prev_event.get('proto', 'N/A')
                prev_score = prev_event.get('anomaly_score', 0)
                prev_threats = ', '.join(prev_event.get('threat_indicators', [])) or 'None'
                
                prompt += f"\n  [{time_only}] {prev_src}  {prev_dst} ({prev_proto}) "
                prompt += f"Score: {prev_score:.2f} | Threats: {prev_threats}"
        
        if correlated:
            prompt += f"\n\n=== CORRELATED ANOMALIES ({len(correlated)} events) ==="
            for i, ce in enumerate(correlated[:3], 1):
                prompt += f"\n{i}. {ce.get('src')}  {ce.get('dst')} [{ce.get('proto')}] " \
                         f"({ce.get('severity')} severity, {ce.get('flows')} pkts)"
                ce_threats = ', '.join(ce.get('threat_indicators', []))
                if ce_threats:
                    prompt += f" | Threats: {ce_threats}"
        
        # Protocol-specific analysis
        if "protocol_stats" in event:
            stats = event["protocol_stats"]
            
            if "dns" in stats:
                dns = stats["dns"]
                unique_queries = len(dns.get("query_names", []))
                if unique_queries > 0:
                    prompt += f"\n\n DNS Analysis: {unique_queries} unique domains queried"
                    # Show sample queries if available
                    sample_queries = dns.get("query_names", [])[:3]
                    if sample_queries:
                        prompt += f"\n  Sample queries: {', '.join(sample_queries)}"
            
            if "http" in stats:
                http = stats["http"]
                methods = http.get("methods", {})
                if methods:
                    prompt += f"\n\n HTTP Analysis: Methods used: {dict(methods)}"
                hosts = http.get("hosts", [])
                if hosts:
                    prompt += f"\n  Target hosts: {', '.join(hosts[:3])}"
        
        # Add context for specific attack types
        if 'DNS_TUNNELING' in threat_indicators:
            prompt += "\n\n Context: DNS tunneling uses DNS queries to exfiltrate data or establish C2 channels. Look for long domain names, high entropy, or unusual query patterns."
        elif 'PORT_SCAN' in threat_indicators:
            prompt += "\n\n Context: Port scanning is reconnaissance activity, often precedes targeted attacks. Multiple destination ports from single source indicate scanning."
        elif 'BRUTE_FORCE' in threat_indicators:
            prompt += "\n\n Context: Brute force attacks attempt to guess credentials through repeated login attempts. High frequency of authentication requests is suspicious."
        elif 'SQL_INJECTION' in threat_indicators or 'XSS_ATTEMPT' in threat_indicators:
            prompt += "\n\n Context: Web application attack detected. Payload contains suspicious patterns targeting application vulnerabilities."
        elif 'C2_BEACON' in threat_indicators:
            prompt += "\n\n Context: Command & Control beacon traffic shows regular periodic communication patterns typical of compromised systems."
        
        prompt += """\n\n=== ANALYSIS REQUEST ===
Provide your analysis in this format:

EXPLANATION: [2-3 sentence explanation of what's happening and why it's significant]

THREAT ASSESSMENT: [low/medium/high/critical]

CONFIDENCE: [low/medium/high]

RECOMMENDATIONS:
1. [Immediate action to take]
2. [Follow-up investigation step]

Keep it concise and actionable. Focus on the most important findings."""
        
        return prompt
    
    def _parse_ai_response(
        self, 
        raw_response: str, 
        event: Dict,
        correlated: List[Dict]
    ) -> Dict:
        """Parse AI response into structured format."""
        lines = raw_response.strip().split('\n')
        
        explanation = ""
        threat_level = "medium"
        confidence = "medium"
        recommendations = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.upper().startswith("EXPLANATION:"):
                current_section = "explanation"
                explanation = line.split(":", 1)[1].strip() if ":" in line else ""
            elif line.upper().startswith("THREAT") and "ASSESSMENT" in line.upper():
                current_section = "threat"
                for level in ["critical", "high", "medium", "low"]:
                    if level in line.lower():
                        threat_level = level
                        break
            elif line.upper().startswith("CONFIDENCE:"):
                current_section = "confidence"
                for level in ["high", "medium", "low"]:
                    if level in line.lower():
                        confidence = level
                        break
            elif line.upper().startswith("RECOMMENDATION"):
                current_section = "recommendations"
            elif current_section == "explanation" and not line.startswith(("THREAT", "CONFIDENCE", "RECOMMENDATION")):
                explanation += " " + line
            elif current_section == "recommendations":
                line_clean = line.lstrip("123456789.-) ")
                if line_clean and len(line_clean) > 5:
                    recommendations.append(line_clean)
        
        explanation = explanation.strip()
        if not explanation:
            explanation = self._clean_explanation(raw_response)
            if any(word in raw_response.lower() for word in ["critical", "severe", "attack"]):
                threat_level = "high"
            if any(word in raw_response.lower() for word in ["definitely", "clearly", "certainly"]):
                confidence = "high"
        
        evidence = self._extract_evidence(event, correlated)
        
        return {
            "text": explanation,
            "confidence": confidence,
            "threat_level": threat_level,
            "recommendations": recommendations if recommendations else ["Review event manually", "Check source host logs"],
            "evidence": evidence
        }
    
    def _extract_evidence(self, event: Dict, correlated: List[Dict] = None) -> Dict:
        """Extract evidence references from event."""
        evidence = {
            "event_id": event.get("timestamp"),
            "source_ip": event.get("src"),
            "dest_ip": event.get("dst"),
            "protocol": event.get("proto"),
            "packet_count": event.get("flows"),
            "baseline_expected": int(event.get("baseline_avg", 0)),
            "anomaly_multiplier": f"{event.get('flows', 0) / max(event.get('baseline_avg', 1), 1):.1f}x",
        }
        
        if correlated:
            evidence["correlated_events"] = len(correlated)
            evidence["correlation_window"] = f"{self.correlation_window}s"
        
        if "sample_payloads" in event and event["sample_payloads"]:
            evidence["payload_samples_available"] = len(event["sample_payloads"])
        
        return evidence
    
    def _create_incident(self, main_event: Dict, correlated: List[Dict]) -> Dict:
        """Create incident object from correlated anomalies."""
        all_events = [main_event] + correlated
        protocols = set(e.get("proto") for e in all_events)
        sources = set(e.get("src") for e in all_events)
        
        if len(sources) == 1 and "DNS" in protocols:
            incident_type = "DNS Exfiltration / Tunneling"
        elif len(sources) == 1 and len(protocols) > 2:
            incident_type = "Port Scan / Reconnaissance"
        elif "TCP" in protocols and len(correlated) > 3:
            incident_type = "DDoS / Flooding Attack"
        else:
            incident_type = "Suspicious Activity"
        
        incident = {
            "id": f"INC-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "title": f"{incident_type} from {main_event.get('src')}",
            "type": incident_type,
            "severity": self._calculate_incident_severity(all_events),
            "event_count": len(all_events),
            "time_span": self._calculate_timespan(all_events),
            "affected_hosts": list(sources),
            "protocols": list(protocols),
            "first_seen": min(e.get("timestamp") for e in all_events),
            "last_seen": max(e.get("timestamp") for e in all_events),
        }
        
        self.incident_clusters.append(incident)
        
        return incident
    
    def _calculate_incident_severity(self, events: List[Dict]) -> str:
        """Calculate overall incident severity from multiple events."""
        severities = [e.get("severity", "low") for e in events]
        severity_scores = {
            "critical": 4,
            "high": 3,
            "medium": 2,
            "low": 1
        }
        
        max_score = max(severity_scores.get(s, 1) for s in severities)
        
        if len(events) >= 5 and max_score < 4:
            max_score = min(max_score + 1, 4)
        
        for severity, score in severity_scores.items():
            if score == max_score:
                return severity
        
        return "medium"
    
    def _calculate_timespan(self, events: List[Dict]) -> str:
        """Calculate time span of incident."""
        try:
            times = [datetime.fromisoformat(e.get("timestamp")) for e in events]
            span = max(times) - min(times)
            
            if span.total_seconds() < 60:
                return f"{int(span.total_seconds())}s"
            elif span.total_seconds() < 3600:
                return f"{int(span.total_seconds() / 60)}m"
            else:
                return f"{span.total_seconds() / 3600:.1f}h"
        except:
            return "unknown"
    
    async def _query_local(self, prompt: str) -> str:
        """Query local Ollama instance."""
        payload = {
            "model": self.local_model,
            "prompt": f"{self.system_prompt}\n\n{prompt}",
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": self.max_tokens,  # Use configured max_tokens
            }
        }
        
        async with self.session.post(
            f"{self.ollama_url}/api/generate",
            json=payload
        ) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("response", "").strip()
            else:
                error_text = await response.text()
                logger.error(f"Ollama API error: {response.status} - {error_text}")
                return "AI analysis failed"
    
    async def _query_remote(self, prompt: str) -> str:
        """Query remote UCY server."""
        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        payload = {
            "model": self.remote_model,
            "messages": messages,
            "websearch": self.remote_websearch,
            "clientSideRag": self.remote_client_rag
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "*/*",
        }
        
        async with self.session.post(
            self.remote_url,
            json=payload,
            headers=headers
        ) as response:
            if response.status == 200:
                content = await response.text()
                
                try:
                    data = json.loads(content)
                    if isinstance(data, dict):
                        return data.get("response", data.get("content", content)).strip()
                    else:
                        return content.strip()
                except json.JSONDecodeError:
                    return content.strip()
            else:
                error_text = await response.text()
                logger.error(f"Remote API error: {response.status} - {error_text}")
                return "Remote AI analysis failed"
    
    def _clean_explanation(self, explanation: str) -> str:
        """Clean up AI explanation text."""
        prefixes = [
            "Here's my analysis:",
            "Analysis:",
            "Explanation:",
            "Summary:",
            "Here is",
            "Based on",
        ]
        
        for prefix in prefixes:
            if explanation.lower().startswith(prefix.lower()):
                explanation = explanation[len(prefix):].strip()
        
        explanation = explanation.replace("**", "").replace("*", "")
        
        # No hard truncation - let full response through
        # The frontend can handle display truncation if needed
        
        return explanation
    
    async def process_chat_query(self, query: str, include_events: bool = True) -> Dict[str, Any]:
        """
        NEW: Process user chat query with full event context.
        
        This is the unified entry point for all chat-based AI queries,
        providing event context, linked events, and structured responses.
        
        Args:
            query: User's natural language question
            include_events: Whether to include recent network events as context
            
        Returns:
            Dict with response, linked event_ids, confidence, timestamp, etc.
        """
        try:
            # Build context from recent events
            recent_events = []
            if include_events and self.recent_events:
                # Get last 50 events, filter for anomalies
                all_events = list(self.recent_events)
                recent_events = [
                    e for e in all_events[-50:] 
                    if e.get('anomaly_score', 0) > 0.3
                ][:20]  # Keep top 20 anomalous events
            
            # Build enhanced chat context
            context_parts = [
                "=== USER QUERY ===",
                query,
                "",
                "=== RECENT NETWORK ACTIVITY ===",
            ]
            
            if recent_events:
                context_parts.append(f"Last {len(recent_events)} anomalous events:")
                for event in recent_events[-10:]:  # Show last 10
                    timestamp = event.get('timestamp', 'N/A')
                    # Extract time only
                    time_only = timestamp[-12:-4] if len(timestamp) > 12 else timestamp
                    src = event.get('src', 'N/A')
                    dst = event.get('dst', 'N/A')
                    proto = event.get('proto', 'N/A')
                    score = event.get('anomaly_score', 0)
                    threats = ', '.join(event.get('threat_indicators', [])) or 'None'
                    
                    context_parts.append(
                        f"  [{time_only}] {src}  {dst} ({proto}) "
                        f"Score: {score:.2f} | Threats: {threats}"
                    )
            else:
                context_parts.append("(No recent anomalies detected)")
            
            # Add instructions for AI
            context_parts.extend([
                "",
                "=== INSTRUCTIONS ===",
                "Provide a concise, actionable answer based on the network activity above.",
                "Reference specific events if relevant. Be direct and helpful."
            ])
            
            context = "\n".join(context_parts)
            
            # Query AI
            if self.mode == 'local':
                response = await self._query_local(context)
            else:
                response = await self._query_remote(context)
            
            response = self._clean_explanation(response)
            
            # Extract event IDs/timestamps mentioned in context
            event_ids = [e.get('timestamp', e.get('id')) for e in recent_events if e.get('timestamp') or e.get('id')]
            
            # Determine confidence based on available context
            confidence = 'high' if len(recent_events) >= 5 else \
                        'medium' if len(recent_events) > 0 else 'low'
            
            self.query_count += 1
            
            return {
                'type': 'chat_response',
                'query': query,
                'response': response,
                'event_ids': event_ids[:20],  # Link to relevant events (max 20)
                'timestamp': datetime.now().isoformat(),
                'model': self.remote_model if self.mode == 'remote' else self.local_model,
                'ai_mode': self.mode,
                'confidence': confidence,
                'events_analyzed': len(recent_events)
            }
            
        except Exception as e:
            logger.error(f"Chat query error: {e}")
            return {
                'type': 'chat_response',
                'query': query,
                'response': f"Error processing query: {str(e)[:200]}",
                'event_ids': [],
                'timestamp': datetime.now().isoformat(),
                'error': True,
                'confidence': 'low'
            }
    
    async def query_chat(self, user_message: str, context_events: List[Dict] = None) -> str:
        """
        DEPRECATED: Use process_chat_query() instead.
        Kept for backward compatibility.
        """
        logger.warning("query_chat() is deprecated. Use process_chat_query() instead.")
        try:
            context = "Recent network activity:\n"
            events_to_use = context_events if context_events else list(self.recent_events)[-10:]
            
            for event in events_to_use:
                if event.get("is_anomaly"):
                    context += f"- {event.get('summary', 'Anomaly')}\n"
            
            prompt = f"""{context}

User Question: {user_message}

Provide a helpful answer based on the network activity above. Be specific and reference particular events if relevant."""
            
            if self.mode == 'local':
                response = await self._query_local(prompt)
            else:
                response = await self._query_remote(prompt)
            
            self.query_count += 1
            return self._clean_explanation(response)
            
        except Exception as e:
            logger.error(f"Chat query error: {e}")
            return f"Error: {str(e)[:100]}"
    
    async def query_event(self, event: Dict, user_question: str = None) -> str:
        """Query AI about a specific event on-demand."""
        try:
            if user_question:
                prompt = f"""Event Details:
- Source: {event.get('src')}:{event.get('src_port')}
- Destination: {event.get('dst')}:{event.get('dst_port')}
- Protocol: {event.get('proto')}
- Packets: {event.get('flows')}
- Bytes: {event.get('total_bytes')}
- Severity: {event.get('severity', 'normal')}
- Summary: {event.get('summary')}

User Question: {user_question}

Provide a concise answer (2-3 sentences)."""
            else:
                prompt = self._build_structured_prompt(event, [])
            
            if self.mode == 'local':
                response = await self._query_local(prompt)
            else:
                response = await self._query_remote(prompt)
            
            self.query_count += 1
            return response
            
        except Exception as e:
            logger.error(f"On-demand query error: {e}")
            return f"Error querying AI: {str(e)[:100]}"
    
    async def close(self):
        """Close HTTP session."""
        if self.session:
            await self.session.close()
            logger.info(
                f"Enhanced AI Agent ({self.mode}) closed. "
                f"Queries: {self.query_count}, Incidents: {self.incidents_detected}, "
                f"Errors: {self.error_count}"
            )
    
    def get_stats(self) -> Dict:
        """Get enhanced agent statistics."""
        return {
            "mode": self.mode,
            "model": self.remote_model if self.mode == 'remote' else self.local_model,
            "queries_processed": self.query_count,
            "incidents_detected": self.incidents_detected,
            "errors": self.error_count,
            "url": self.remote_url if self.mode == 'remote' else self.ollama_url,
            "correlation_window": self.correlation_window,
            "events_in_memory": len(self.recent_events)
        }
    
    def _compute_explanation_confidence(self, event: Dict, analysis: Any) -> Optional[Dict]:
        """
        Compute explanation confidence with detection methods and threat distribution.
        
        Returns dict with:
        - confidence: 0.0-1.0 (HIGH: 0.9+, MEDIUM: 0.7-0.9, LOW: <0.7)
        - detection_methods: List of detection method objects
        - threat_distribution: Probability distribution of threat types
        """
        try:
            # Extract anomaly score (use as base confidence)
            anomaly_score = float(event.get('anomaly_score', 0.5))
            
            # Extract detection methods used
            detection_methods = event.get('detection_methods', [])
            threat_indicators = []
            
            if hasattr(analysis, 'threat_indicators') and analysis.threat_indicators:
                threat_indicators = analysis.threat_indicators
            elif isinstance(analysis, dict) and 'threat_indicators' in analysis:
                threat_indicators = analysis['threat_indicators']
            
            # Map backend detection methods to frontend format
            method_names = [
                "Z-Score",
                "IQR",
                "EWMA",
                "Rate-Based",
                "Behavioral",
                "Port Scan",
                "Protocol-Specific",
                "Payload Threats"
            ]
            
            # Mark which methods were triggered
            computed_methods = []
            triggered_count = 0
            
            for method_name in method_names:
                triggered = method_name in detection_methods if isinstance(detection_methods, list) else False
                if triggered:
                    triggered_count += 1
                
                # Confidence per method: anomaly_score for triggered, 0.2 for not triggered
                method_confidence = anomaly_score if triggered else 0.2
                
                computed_methods.append({
                    "name": method_name,
                    "triggered": triggered,
                    "confidence": min(1.0, max(0.0, method_confidence))
                })
            
            # Calculate overall confidence based on methods triggered
            # More methods triggered = higher confidence
            triggered_ratio = triggered_count / len(method_names) if method_names else 0.5
            overall_confidence = (anomaly_score * 0.6) + (triggered_ratio * 0.4)
            overall_confidence = min(1.0, max(0.0, overall_confidence))
            
            # Build threat distribution from threat_indicators
            threat_distribution = []
            
            if threat_indicators:
                for ti in threat_indicators:
                    threat_type = ti.get('type') if isinstance(ti, dict) else (ti.type if hasattr(ti, 'type') else 'unknown')
                    ti_confidence = ti.get('confidence', 0.5) if isinstance(ti, dict) else (ti.confidence if hasattr(ti, 'confidence') else 0.5)
                    
                    threat_distribution.append({
                        "threat_type": threat_type,
                        "probability": min(1.0, max(0.0, ti_confidence))
                    })
            
            # Normalize threat probabilities to sum to ~1.0
            if threat_distribution:
                total = sum(t['probability'] for t in threat_distribution)
                if total > 0:
                    threat_distribution = [
                        {
                            "threat_type": t["threat_type"],
                            "probability": t["probability"] / total
                        }
                        for t in threat_distribution
                    ]
            else:
                # Fallback: add generic threats based on anomaly score
                if anomaly_score > 0.8:
                    threat_distribution = [
                        {"threat_type": "suspicious_traffic", "probability": 0.6},
                        {"threat_type": "attack_attempt", "probability": 0.3},
                        {"threat_type": "anomalous_behavior", "probability": 0.1}
                    ]
                elif anomaly_score > 0.5:
                    threat_distribution = [
                        {"threat_type": "potential_threat", "probability": 0.5},
                        {"threat_type": "unusual_pattern", "probability": 0.5}
                    ]
                else:
                    threat_distribution = [
                        {"threat_type": "benign", "probability": 0.7},
                        {"threat_type": "normal_variation", "probability": 0.3}
                    ]
            
            return {
                "confidence": overall_confidence,
                "detection_methods": computed_methods,
                "threat_distribution": threat_distribution
            }
        
        except Exception as e:
            logger.warning(f"Failed to compute explanation confidence: {e}")
            return None
    
    def switch_mode(self, new_mode: Literal['local', 'remote']):
        """Switch between local and remote mode."""
        if new_mode not in ['local', 'remote']:
            raise ValueError("Mode must be 'local' or 'remote'")
        
        old_mode = self.mode
        self.mode = new_mode
        logger.info(f"AI mode switched from {old_mode} to {new_mode}")

