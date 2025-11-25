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
import httpx
from openai import AsyncOpenAI
import instructor

from schemas import AIExplanationResponse, ChatResponse, EventQueryResponse

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
        remote_model: str = "llama3.1:latest",
        remote_websearch: bool = False,
        remote_client_rag: bool = False,
        # Common settings
        timeout: int = 30,
        max_tokens: int = 800,
        system_prompt: str = None,
        # Correlation settings
        correlation_window: int = 300,  # 5 minutes
        max_memory_events: int = 100,
        # Throttling settings (prevent server spam)
        max_pending_requests: int = 3,  # Drop requests if more are waiting
        min_request_interval: float = 0.5  # Minimum seconds between requests
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
        self.incident_clusters: List[Dict] = []

        # HTTP session and counters
        self.session: Optional[aiohttp.ClientSession] = None
        self.query_count = 0
        self.error_count = 0
        self.incidents_detected = 0
        
        # Instructor-patched AsyncOpenAI client for structured outputs
        self.openai_client: Optional[AsyncOpenAI] = None

        # Advanced throttling system - prevents server spam
        self.ai_query_lock = asyncio.Lock()
        self.pending_requests = 0
        self.max_pending_requests = max_pending_requests
        self.min_request_interval = min_request_interval
        self.last_request_time = 0.0
        self.dropped_requests = 0
        
    def _default_system_prompt(self) -> str:
        """Generate default system prompt for network security analysis."""
        return """You are an expert network security analyst AI assistant.

Your role is to:
1. Analyze network anomalies and explain them clearly
2. Assess security implications and threat levels
3. Provide actionable recommendations
4. Correlate related events into security incidents

Output format:
- Use clear, concise language (2-4 sentences)
- Start with the most important information
- Reference specific IPs, ports, and protocols
- End with a specific recommendation

When analyzing anomalies:
- Consider attack patterns (DDoS, port scanning, data exfiltration, C2 traffic)
- Assess if the behavior is likely benign, suspicious, or malicious
- Suggest specific next steps for the analyst

Be direct and actionable. Avoid unnecessary hedging."""
        
    async def initialize(self):
        """Initialize HTTP session and test connection."""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.timeout)
        )
        
        # Initialize instructor-patched OpenAI client
        # CRITICAL: Use base URL WITH /v1 but WITHOUT /chat/completions (client appends it)
        # For UCY server: use 'https://chatucy.cs.ucy.ac.cy/ollama/v1' 
        # AsyncOpenAI will make it: 'https://chatucy.cs.ucy.ac.cy/ollama/v1/chat/completions'
        
        # Get base URL from config (constructor parameters passed from main.py)
        if self.mode == 'remote':
            # Use remote_url but strip /chat/completions to get base
            base_url = self.remote_url.replace('/chat/completions', '').replace('/v1/chat/completions', '/v1')
        else:
            # Use ollama_url but strip /chat/completions to get base
            base_url = self.ollama_url.replace('/chat/completions', '').replace('/v1/chat/completions', '/v1')
        
        logger.info(f"[STARTUP] Creating AsyncOpenAI client with base_url: {base_url}")
        
        # Create AsyncOpenAI client with custom base URL and disabled SSL verification
        self.openai_client = AsyncOpenAI(
            base_url=base_url,
            api_key="ollama",
            http_client=httpx.AsyncClient(verify=False, timeout=120.0)
        )
        
        logger.info(f"[STARTUP] AsyncOpenAI client created with base_url: {self.openai_client.base_url}")
        
        # Patch with instructor for structured outputs
        self.openai_client = instructor.patch(
            self.openai_client,
            mode=instructor.Mode.JSON
        )
        
        logger.info(f"[STARTUP] AsyncOpenAI client patched with instructor (JSON mode)")
        logger.info(f"Enhanced AI Agent initialized in {self.mode.upper()} mode")
        logger.info(f"Correlation window: {self.correlation_window}s, Max memory: {self.max_memory_events} events")
        logger.info(f"Base URL: {base_url}")
        
        # Test connection at startup - exit if fails
        logger.info("Testing connection to AI service...")
        try:
            connection_ok = await self._test_connection()
            if not connection_ok:
                logger.error("❌ FATAL: Could not connect to AI service at startup")
                logger.error(f"Base URL: {base_url}")
                logger.error(f"Model: {self.remote_model if self.mode == 'remote' else self.local_model}")
                raise RuntimeError(f"Failed to connect to AI service at {base_url}")
        except Exception as e:
            logger.error(f"❌ FATAL: AI connection test failed: {e}")
            raise
    
    async def _test_connection(self):
        """Test connection to AI service (called on-demand, not at startup)."""
        # Get base URL from config
        if self.mode == 'remote':
            base_url = self.remote_url.replace('/chat/completions', '').replace('/v1/chat/completions', '/v1')
        else:
            base_url = self.ollama_url.replace('/chat/completions', '').replace('/v1/chat/completions', '/v1')
        
        model = self.remote_model if self.mode == 'remote' else self.local_model
        
        logger.info(f"{self.mode.upper()} mode configured: {base_url}")
        logger.info(f"Model: {model}")
        logger.info(f"Using OpenAI-compatible endpoint with Instructor for structured outputs")
        
        # Try a simple test query to verify connectivity
        try:
            test_response = await self.openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": "Test connection"}],
                max_tokens=10,
                timeout=5.0  # Shorter timeout for test
            )
            logger.info(f"✓ Connection test successful")
            return True
        except Exception as e:
            logger.error(f"✗ Connection test failed: {e}")
            return False
    
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
                event = await event_queue.get()
                
                is_anomaly = event.get("is_anomaly", False)
                severity = event.get("severity", "low")
                is_warmup = event.get("is_warmup", False)
                
                # Skip AI during warmup
                if is_warmup:
                    event["ai_explanation"] = None
                    event["ai_processed"] = False
                    event["ai_mode"] = None
                    await output_queue.put(event)
                    continue
                
                # Add to memory for correlation
                self.recent_events.append(event)
                
                # Analyze medium+ anomalies
                if is_anomaly and severity in ["medium", "high", "critical"]:
                    logger.info(f"Analyzing {severity} anomaly with enhanced AI...")
                    
                    # Check for correlated events
                    correlated_events = self._find_correlated_events(event)
                    
                    # Generate structured explanation using queue-based system (ONE at a time)
                    explanation = await self._generate_structured_explanation_queued(
                        event,
                        correlated_events
                    )
                    
                    event["ai_explanation"] = explanation["text"]
                    event["ai_confidence"] = explanation["confidence"]
                    event["ai_threat_level"] = explanation["threat_level"]
                    event["ai_recommendations"] = explanation["recommendations"]
                    event["ai_evidence"] = explanation["evidence"]
                    event["ai_important_factors"] = explanation.get("important_factors", [])
                    event["ai_payload_evidence"] = explanation.get("payload_evidence", [])
                    event["ai_counterfactual"] = explanation.get("counterfactual_reasoning", "")
                    event["ai_correlated_events"] = len(correlated_events)
                    event["ai_processed"] = True
                    event["ai_mode"] = self.mode
                    
                    self.query_count += 1
                    
                    # Check if this is part of a larger incident
                    if len(correlated_events) >= 2:
                        incident = self._create_incident(event, correlated_events)
                        event["ai_incident"] = incident
                        self.incidents_detected += 1
                        logger.warning(f"INCIDENT DETECTED: {incident['title']}")
                else:
                    # Normal traffic - no AI analysis needed
                    event["ai_explanation"] = None
                    event["ai_processed"] = False
                
                await output_queue.put(event)
                
            except Exception as e:
                # Use exception logging to capture full traceback for diagnosis
                logger.exception("Error processing event")
                self.error_count += 1
                
                # Forward event without AI
                event["ai_explanation"] = "AI analysis unavailable"
                event["ai_processed"] = False
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
    
    async def _generate_structured_explanation_queued(
        self, 
        event: Dict,
        correlated_events: List[Dict]
    ) -> Dict:
        """
        Throttled wrapper for AI queries - prevents server spam.
        
        Features:
        - Only ONE active request at a time (lock-based)
        - Drops requests if too many are pending (max 3 waiting)
        - Enforces minimum 500ms interval between requests
        - Tracks dropped requests for monitoring
        """
        # Check if too many requests are pending - drop this one to prevent spam
        if self.pending_requests >= self.max_pending_requests:
            self.dropped_requests += 1
            logger.warning(
                f"⚠️ AI request DROPPED (too many pending: {self.pending_requests}). "
                f"Total dropped: {self.dropped_requests}"
            )
            return {
                "text": "AI analysis skipped (rate limited)",
                "confidence": "low",
                "threat_level": "unknown",
                "recommendations": ["Review manually"],
                "evidence": self._extract_evidence(event),
                "important_factors": [],
                "payload_evidence": [],
                "counterfactual_reasoning": ""
            }
        
        # Increment pending counter
        self.pending_requests += 1
        
        try:
            async with self.ai_query_lock:
                # Enforce minimum interval between requests
                current_time = asyncio.get_event_loop().time()
                time_since_last = current_time - self.last_request_time
                
                if time_since_last < self.min_request_interval:
                    wait_time = self.min_request_interval - time_since_last
                    logger.debug(f"⏱️ Rate limiting: waiting {wait_time:.2f}s before next request")
                    await asyncio.sleep(wait_time)
                
                # Only one query can pass through this lock at a time
                logger.debug(f"🔄 AI query starting (pending: {self.pending_requests})")
                result = await self._generate_structured_explanation(event, correlated_events)
                
                self.last_request_time = asyncio.get_event_loop().time()
                logger.debug(f"✅ AI query completed")
                
                return result
        finally:
            # Always decrement pending counter
            self.pending_requests -= 1
    
    async def _generate_structured_explanation(
        self, 
        event: Dict,
        correlated_events: List[Dict]
    ) -> Dict:
        """Generate structured explanation with evidence and recommendations."""
        try:
            prompt = self._build_structured_prompt(event, correlated_events)
            
            # Get structured response from instructor-patched client
            if self.mode == 'local':
                ai_response: AIExplanationResponse = await self._query_local(prompt, AIExplanationResponse)
            else:
                ai_response: AIExplanationResponse = await self._query_remote(prompt, AIExplanationResponse)
            
            # Convert Pydantic model to dict format expected by downstream code
            evidence = self._extract_evidence(event, correlated_events)
            
            return {
                "text": ai_response.explanation,
                "confidence": ai_response.confidence,
                "threat_level": ai_response.threat_level,
                "recommendations": ai_response.recommendations,
                "evidence": evidence,
                "important_factors": ai_response.important_factors,
                "payload_evidence": ai_response.payload_evidence or [],
                "counterfactual_reasoning": ai_response.counterfactual_reasoning or ""
            }
            
        except Exception as e:
            # Log full traceback to aid debugging
            logger.exception("AI generation error")
            return {
                "text": f"AI analysis failed: {str(e)[:50]}",
                "confidence": "low",
                "threat_level": "unknown",
                "recommendations": ["Review manually"],
                "evidence": self._extract_evidence(event),
                "important_factors": [],
                "payload_evidence": [],
                "counterfactual_reasoning": ""
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
        
        # Add CONTRASTIVE EXPLANATION context (Why X instead of Y?)
        prompt += f"\n\n=== CONTRASTIVE ANALYSIS ==="
        prompt += f"\n WHY THIS IS ANOMALOUS (vs normal traffic):"
        prompt += f"\n  • Observed: {flows} flows (Score: {anomaly_score:.2f})"
        prompt += f"\n  • Expected: ~{int(baseline_avg)} flows (Normal baseline)"
        prompt += f"\n  • Difference: {flows - baseline_avg:.0f} flows ({((flows/max(baseline_avg,1))-1)*100:.0f}% above normal)"
        
        if detection_methods:
            prompt += f"\n  • Detection: {', '.join(detection_methods)}"
            prompt += f"\n  • Why not normal? These specific statistical methods flagged this as outlier behavior"
        
        if threat_indicators:
            prompt += f"\n\n WHY THESE THREATS (vs benign activity):"
            for threat in threat_indicators[:3]:  # Top 3 threats
                if threat == 'DNS_TUNNELING':
                    prompt += f"\n  • {threat}: Long domain names/high entropy (vs typical short DNS queries)"
                elif threat == 'PORT_SCAN':
                    prompt += f"\n  • {threat}: Multiple ports targeted (vs normal single-port connections)"
                elif threat == 'SQL_INJECTION':
                    prompt += f"\n  • {threat}: SQL keywords in payload (vs clean HTTP requests)"
                elif threat == 'XSS_ATTEMPT':
                    prompt += f"\n  • {threat}: Script tags in payload (vs normal form data)"
                elif threat == 'BRUTE_FORCE':
                    prompt += f"\n  • {threat}: Rapid authentication attempts (vs sporadic normal logins)"
                else:
                    prompt += f"\n  • {threat}: Pattern-based detection (vs expected protocol behavior)"
        
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
        
        # EXPLAINABLE AI: Include actual payload samples for forensic analysis
        if "sample_payloads" in event and event["sample_payloads"]:
            prompt += f"\n\n=== PAYLOAD EVIDENCE (Forensic Data) ==="
            payload_samples = event["sample_payloads"][:3]  # First 3 samples
            
            for i, sample in enumerate(payload_samples, 1):
                prompt += f"\n\nSample {i} (Length: {sample.get('length', 0)} bytes):"
                
                # Show decoded text payload if available
                if "payload_text" in sample and sample["payload_text"]:
                    text = sample["payload_text"][:300]  # First 300 chars
                    prompt += f"\n  Text Content: {repr(text)}"
                
                # Show protocol-specific parsed data
                if "dns" in sample:
                    dns = sample["dns"]
                    if "query_name" in dns:
                        prompt += f"\n  DNS Query: {dns['query_name']}"
                    if "query_type" in dns:
                        prompt += f"\n  DNS Type: {dns['query_type']}"
                
                if "http" in sample:
                    http = sample["http"]
                    if "method" in http and "uri" in http:
                        prompt += f"\n  HTTP: {http['method']} {http['uri']}"
                    if "host" in http:
                        prompt += f"\n  Host: {http['host']}"
                    if "user_agent" in http:
                        prompt += f"\n  User-Agent: {http['user_agent'][:100]}"
                
                if "tls" in sample:
                    tls = sample["tls"]
                    if "server_name" in tls:
                        prompt += f"\n  TLS SNI: {tls['server_name']}"
                    if "version" in tls:
                        prompt += f"\n  TLS Version: {tls['version']}"
                
                if "tcp_flags" in sample:
                    flags = sample["tcp_flags"]
                    flag_str = ",".join([k.upper() for k, v in flags.items() if v])
                    prompt += f"\n  TCP Flags: [{flag_str}]"
        
        # Protocol-specific analysis
        if "protocol_stats" in event:
            stats = event["protocol_stats"]
            prompt += f"\n\n=== PROTOCOL STATISTICS ==="
            
            if "dns" in stats:
                dns = stats["dns"]
                unique_queries = len(dns.get("query_names", []))
                if unique_queries > 0:
                    prompt += f"\n DNS: {unique_queries} unique domains queried"
                    # Show sample queries if available
                    sample_queries = dns.get("query_names", [])[:5]
                    if sample_queries:
                        prompt += f"\n  Domains: {', '.join(sample_queries)}"
            
            if "http" in stats:
                http = stats["http"]
                methods = http.get("methods", {})
                if methods:
                    # Handle both dict and list types
                    if isinstance(methods, dict):
                        prompt += f"\n HTTP Methods: {methods}"
                    else:
                        prompt += f"\n HTTP Methods: {list(methods)}"
                hosts = http.get("hosts", [])
                if hosts:
                    prompt += f"\n  Target Hosts: {', '.join(list(hosts)[:5])}"
                user_agents = http.get("user_agents", [])
                if user_agents:
                    prompt += f"\n  User Agents: {len(user_agents)} unique"
            
            if "tls" in stats:
                tls = stats["tls"]
                versions = tls.get("versions", {})
                if versions:
                    # Handle both dict and list types
                    if isinstance(versions, dict):
                        prompt += f"\n TLS Versions: {versions}"
                    else:
                        prompt += f"\n TLS Versions: {list(versions)}"
                servers = tls.get("server_names", [])
                if servers:
                    prompt += f"\n  Server Names: {', '.join(list(servers)[:5])}"
        
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
You MUST respond with valid JSON matching the AIExplanationResponse schema:

{
  "explanation": "2-3 sentences explaining WHY this is anomalous INSTEAD OF normal traffic",
  "important_factors": ["Top factor 1", "Top factor 2", "Top factor 3"],
  "threat_level": "low|medium|high|critical",
  "confidence": "low|medium|high",
  "recommendations": ["Action 1", "Action 2"],
  "evidence_summary": "Brief summary of key evidence (optional)",
  "payload_evidence": ["Specific suspicious pattern 1", "Pattern 2"],
  "counterfactual_reasoning": "What would make this normal traffic"
}

EXPLAINABLE AI Requirements:
- explanation: 2-3 sentences with CONTRASTIVE reasoning (why anomaly vs normal)
- important_factors: Exactly 1-3 most critical factors FROM THE DATA ABOVE
- payload_evidence: Quote SPECIFIC suspicious strings/patterns from payload samples (if provided)
- counterfactual_reasoning: "This would be normal if: [specific conditions]"
- threat_level: Must be one of: low, medium, high, critical
- confidence: Must be one of: low, medium, high (based on evidence quality)
- recommendations: 1-3 specific actionable steps

Return ONLY valid JSON. No markdown, no code blocks, just the JSON object."""
        
        return prompt
    
    # _parse_ai_response is no longer needed with Instructor's structured outputs
    # The Pydantic models handle validation and structure automatically
    
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
    
    async def _query_local(self, prompt: str, response_model=AIExplanationResponse) -> Any:
        """Query using instructor-patched OpenAI client with structured output."""
        try:
            response = await self.openai_client.chat.completions.create(
                model=self.local_model,
                response_model=response_model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_retries=2,
                timeout=120.0  # 2 minutes
            )
            return response
        except Exception as e:
            logger.error(f"Structured query error: {e}")
            raise Exception(f"AI_QUERY_ERROR: {str(e)[:200]}")
    
    async def _query_remote(self, prompt: str, response_model=AIExplanationResponse) -> Any:
        """Query using instructor-patched OpenAI client with structured output.
        
        Note: Both local and remote now use the same OpenAI-compatible endpoint,
        so this method is now identical to _query_local.
        """
        return await self._query_local(prompt, response_model)

    
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
                        f"  [{time_only}] {src} → {dst} ({proto}) "
                        f"Score: {score:.2f} | Threats: {threats}"
                    )
            else:
                context_parts.append("(No recent anomalies detected)")
            
            context = "\n".join(context_parts)
            
            # Query AI with structured ChatResponse
            if self.mode == 'local':
                chat_response: ChatResponse = await self._query_local(context, ChatResponse)
            else:
                chat_response: ChatResponse = await self._query_remote(context, ChatResponse)
            
            # Extract event IDs/timestamps mentioned in context
            event_ids = [e.get('timestamp', e.get('id')) for e in recent_events if e.get('timestamp') or e.get('id')]
            
            self.query_count += 1
            
            return {
                'type': 'chat_response',
                'query': query,
                'response': chat_response.answer,
                'event_ids': event_ids[:20],  # Link to relevant events (max 20)
                'timestamp': datetime.now().isoformat(),
                'model': self.remote_model if self.mode == 'remote' else self.local_model,
                'ai_mode': self.mode,
                'confidence': chat_response.confidence,
                'events_analyzed': len(recent_events),
                'follow_up_suggestions': chat_response.follow_up_suggestions or []
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
        Kept for backward compatibility - returns string instead of dict.
        """
        logger.warning("query_chat() is deprecated. Use process_chat_query() instead.")
        try:
            # Use the new structured method and extract just the response text
            result = await self.process_chat_query(user_message, include_events=True)
            return result.get('response', 'Error processing query')
            
        except Exception as e:
            logger.error(f"Chat query error: {e}")
            return f"Error: {str(e)[:100]}"
    
    async def query_event(self, event: Dict, user_question: str = None) -> Dict[str, Any]:
        """Query AI about a specific event on-demand with structured response."""
        try:
            if user_question:
                prompt = f"""Event Details:
- Source: {event.get('src')}:{event.get('src_port', 'N/A')}
- Destination: {event.get('dst')}:{event.get('dst_port', 'N/A')}
- Protocol: {event.get('proto')}
- Packets: {event.get('flows')}
- Bytes: {event.get('total_bytes')}
- Severity: {event.get('severity', 'normal')}
- Summary: {event.get('summary')}

User Question: {user_question}

Provide a concise, structured analysis."""
            else:
                prompt = self._build_structured_prompt(event, [])
            
            # Get structured EventQueryResponse
            if self.mode == 'local':
                event_response: EventQueryResponse = await self._query_local(prompt, EventQueryResponse)
            else:
                event_response: EventQueryResponse = await self._query_remote(prompt, EventQueryResponse)
            
            self.query_count += 1
            
            return {
                'type': 'event_query_response',
                'analysis': event_response.analysis,
                'severity_assessment': event_response.severity_assessment,
                'next_steps': event_response.next_steps,
                'confidence': event_response.confidence,
                'event_timestamp': event.get('timestamp')
            }
            
        except Exception as e:
            logger.error(f"On-demand query error: {e}")
            return {
                'type': 'event_query_response',
                'analysis': f"Error querying AI: {str(e)[:100]}",
                'severity_assessment': 'unknown',
                'next_steps': ['Review manually'],
                'confidence': 'low'
            }
    
    async def close(self):
        """Close HTTP sessions."""
        if self.session:
            await self.session.close()
        
        if self.openai_client and hasattr(self.openai_client, 'close'):
            try:
                # Close the underlying httpx client
                if hasattr(self.openai_client, '_client') and hasattr(self.openai_client._client, 'close'):
                    await self.openai_client._client.aclose()
            except Exception as e:
                logger.warning(f"Error closing OpenAI client: {e}")
        
        logger.info(
            f"Enhanced AI Agent ({self.mode}) closed. "
            f"Queries: {self.query_count}, Dropped: {self.dropped_requests}, "
            f"Incidents: {self.incidents_detected}, Errors: {self.error_count}"
        )
    
    def get_stats(self) -> Dict:
        """Get enhanced agent statistics."""
        return {
            "mode": self.mode,
            "model": self.remote_model if self.mode == 'remote' else self.local_model,
            "queries_processed": self.query_count,
            "queries_dropped": self.dropped_requests,
            "pending_requests": self.pending_requests,
            "incidents_detected": self.incidents_detected,
            "errors": self.error_count,
            "url": self.remote_url if self.mode == 'remote' else self.ollama_url,
            "correlation_window": self.correlation_window,
            "events_in_memory": len(self.recent_events),
            "throttle_config": {
                "max_pending": self.max_pending_requests,
                "min_interval_ms": int(self.min_request_interval * 1000)
            }
        }
    
    def switch_mode(self, new_mode: Literal['local', 'remote']):
        """Switch between local and remote mode."""
        if new_mode not in ['local', 'remote']:
            raise ValueError("Mode must be 'local' or 'remote'")
        
        old_mode = self.mode
        self.mode = new_mode
        logger.info(f"AI mode switched from {old_mode} to {new_mode}")
