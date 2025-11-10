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
        self.incident_clusters: List[Dict] = []
        
        self.session: Optional[aiohttp.ClientSession] = None
        self.query_count = 0
        self.error_count = 0
        self.incidents_detected = 0
        
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
        
        logger.info(f"Enhanced AI Agent initialized in {self.mode.upper()} mode")
        logger.info(f"Correlation window: {self.correlation_window}s, Max memory: {self.max_memory_events} events")
        
        # Test connection
        try:
            await self._test_connection()
        except Exception as e:
            logger.warning(f"Could not connect to AI service: {e}")
            logger.warning("AI explanations will be disabled until service is available.")
    
    async def _test_connection(self):
        """Test connection to AI service."""
        if self.mode == 'local':
            async with self.session.get(f"{self.ollama_url}/api/tags") as response:
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
                    raise Exception(f"HTTP {response.status}")
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
                    
                    # Generate structured explanation
                    explanation = await self._generate_structured_explanation(
                        event, 
                        correlated_events
                    )
                    
                    event["ai_explanation"] = explanation["text"]
                    event["ai_confidence"] = explanation["confidence"]
                    event["ai_threat_level"] = explanation["threat_level"]
                    event["ai_recommendations"] = explanation["recommendations"]
                    event["ai_evidence"] = explanation["evidence"]
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
                logger.error(f"Error processing event: {e}")
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
    
    async def _generate_structured_explanation(
        self, 
        event: Dict,
        correlated_events: List[Dict]
    ) -> Dict:
        """Generate structured explanation with evidence and recommendations."""
        try:
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
Provide your analysis in this CONTRASTIVE and SELECTIVE format:

EXPLANATION: [2-3 sentences explaining WHY this is anomalous INSTEAD OF being normal traffic. Reference the specific deviations from baseline and why alternative explanations were rejected.]

MOST IMPORTANT FACTORS (Selective - top 3 only):
1. [Factor]: [Why this is critical]
2. [Factor]: [Why this is critical]
3. [Factor]: [Why this is critical]

THREAT ASSESSMENT: [low/medium/high/critical]

CONFIDENCE: [low/medium/high]

RECOMMENDATIONS:
1. [Immediate action to take]
2. [Follow-up investigation step]

Be CONTRASTIVE (explain why anomaly instead of normal) and SELECTIVE (only the top factors)."""
        
        return prompt
    
    def _parse_ai_response(
        self, 
        raw_response: str, 
        event: Dict,
        correlated: List[Dict]
    ) -> Dict:
        """Parse AI response into structured format with contrastive reasoning."""
        lines = raw_response.strip().split('\n')
        
        explanation = ""
        threat_level = "medium"
        confidence = "medium"
        recommendations = []
        important_factors = []
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            if line.upper().startswith("EXPLANATION:"):
                current_section = "explanation"
                explanation = line.split(":", 1)[1].strip() if ":" in line else ""
            elif "MOST IMPORTANT" in line.upper() or "IMPORTANT FACTORS" in line.upper():
                current_section = "factors"
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
            elif current_section == "explanation" and not any(keyword in line.upper() for keyword in ["MOST IMPORTANT", "THREAT", "CONFIDENCE", "RECOMMENDATION"]):
                explanation += " " + line
            elif current_section == "factors":
                line_clean = line.lstrip("123456789.-) ")
                if line_clean and len(line_clean) > 5:
                    important_factors.append(line_clean)
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
            "evidence": evidence,
            "important_factors": important_factors[:3] if important_factors else [
                f"Flow volume {event.get('flows')} vs baseline {int(event.get('baseline_avg', 0))}",
                f"Anomaly score: {event.get('anomaly_score', 0):.2f}",
                f"Detection: {', '.join(event.get('detection_methods', ['Unknown']))}"
            ]
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
                        f"  [{time_only}] {src} → {dst} ({proto}) "
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
    
    def switch_mode(self, new_mode: Literal['local', 'remote']):
        """Switch between local and remote mode."""
        if new_mode not in ['local', 'remote']:
            raise ValueError("Mode must be 'local' or 'remote'")
        
        old_mode = self.mode
        self.mode = new_mode
        logger.info(f"AI mode switched from {old_mode} to {new_mode}")
