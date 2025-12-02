"""
condense_enhanced.py - Enhanced industrial-grade packet aggregation with:
- Protocol-specific anomaly detection (DNS, HTTP, TLS)
- Payload-based threat detection (lightweight patterns)
- Improved port scan detection with time decay
- Global stats cleanup to prevent memory leaks
- Detection metrics tracking

MEMORY OPTIMIZATIONS:
- Time-based cleanup of old data
- Bounded data structures (deques with maxlen)
- Efficient pattern matching (no heavy regex)
- No ML models (pure statistical/heuristic)
"""

import asyncio
import logging
import math
import re
import base64
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from statistics import mean, stdev

logger = logging.getLogger(__name__)


class DetectionMetrics:
    """Track detection performance metrics (lightweight)."""
    
    def __init__(self):
        self.total_detections = 0
        self.by_method = defaultdict(int)  # method -> count
        self.by_severity = defaultdict(int)  # severity -> count
        self.by_protocol = defaultdict(int)  # protocol -> count
        
    def record_detection(self, methods: List[str], severity: str, protocol: str):
        """Record a detection event."""
        self.total_detections += 1
        self.by_severity[severity] += 1
        self.by_protocol[protocol] += 1
        
        for method in methods:
            self.by_method[method] += 1
    
    def get_stats(self) -> Dict:
        """Get metrics summary."""
        return {
            "total": self.total_detections,
            "by_method": dict(self.by_method),
            "by_severity": dict(self.by_severity),
            "by_protocol": dict(self.by_protocol)
        }


class FlowCondenser:
    """
    Enhanced industrial-grade flow condenser with:
    - Protocol-specific detection
    - Lightweight payload analysis
    - Memory-efficient operations
    """
    
    def __init__(
        self, 
        window_size: int = 10, 
        anomaly_threshold: float = 3.0,
        min_flows_for_alert: int = 10,
        warmup_windows: int = 3,
        preserve_payloads: bool = True,
        max_sample_payloads: int = 5,
        use_adaptive_threshold: bool = True,
        sensitivity: str = "medium",
        # NEW: Cleanup parameters
        cleanup_interval: int = 300,  # 5 minutes
        port_scan_window: int = 300,  # 5 minutes for port scan tracking
        max_global_hosts: int = 1000,  # Limit tracked hosts
    ):
        """Initialize enhanced flow condenser."""
        self.window_size = window_size
        self.anomaly_threshold = anomaly_threshold
        self.min_flows_for_alert = min_flows_for_alert
        self.warmup_windows = warmup_windows
        self.preserve_payloads = preserve_payloads
        self.max_sample_payloads = max_sample_payloads
        self.use_adaptive_threshold = use_adaptive_threshold
        self.cleanup_interval = cleanup_interval
        self.port_scan_window = port_scan_window
        self.max_global_hosts = max_global_hosts
        
        # Sensitivity mapping
        self.sensitivity_map = {
            "low": {"z_score": 3.5, "iqr_mult": 3.0, "rate_mult": 8.0},
            "medium": {"z_score": 3.0, "iqr_mult": 2.5, "rate_mult": 5.0},
            "high": {"z_score": 2.5, "iqr_mult": 2.0, "rate_mult": 3.0}
        }
        self.thresholds = self.sensitivity_map.get(sensitivity, self.sensitivity_map["medium"])
        
        # Warmup tracking
        self.windows_observed = 0
        self.is_warmed_up = False
        
        # Flow tracking
        self.flows: Dict[Tuple, Dict] = defaultdict(lambda: {
            "packet_count": 0,
            "total_bytes": 0,
            "first_seen": None,
            "last_seen": None,
            "packets": [],
            "sample_payloads": [],
            "protocol_stats": {},
            "packet_sizes": deque(maxlen=100),
            "inter_arrival_times": deque(maxlen=100),
        })
        
        # Baseline tracking
        self.baseline: Dict[Tuple, Dict] = defaultdict(lambda: {
            "avg_packets": 0,
            "avg_bytes": 0,
            "median_packets": 0,
            "std_packets": 0,
            "std_bytes": 0,
            "min_packets": float('inf'),
            "max_packets": 0,
            "p25_packets": 0,
            "p75_packets": 0,
            "iqr": 0,
            "ewma_packets": 0,
            "ewma_alpha": 0.3,
            "history": deque(maxlen=100),
            "sample_count": 0,
            "packets_per_second": 0,
            "bytes_per_second": 0,
            "typical_packet_size": 0,
            "size_variance": 0,
        })
        
        # Global statistics (with cleanup)
        self.global_stats = {
            "total_flows": 0,
            "active_hosts": set(),
            "protocol_distribution": defaultdict(int),
            # NEW: Port scan tracking with timestamps
            "port_scan_tracker": defaultdict(lambda: deque(maxlen=100)),  # src -> [(port, timestamp), ...]
            "connection_matrix": defaultdict(lambda: defaultdict(int)),
        }
        
        # NEW: Detection metrics
        self.metrics = DetectionMetrics()
        
        self.condensed_count = 0
        self.anomaly_count = 0
        self.last_cleanup = datetime.now()
        
    async def process_packets(
        self, 
        packet_queue: asyncio.Queue,
        event_queue: asyncio.Queue
    ):
        """Process packets with enhanced tracking."""
        logger.info(f" Starting ENHANCED packet condensation...")
        logger.info(f" Detection: Z-score={self.thresholds['z_score']}, IQR={self.thresholds['iqr_mult']}")
        logger.info(f" Cleanup: Every {self.cleanup_interval}s, Port scan window: {self.port_scan_window}s")
        
        # Start periodic tasks
        asyncio.create_task(self._periodic_emission(event_queue))
        asyncio.create_task(self._periodic_cleanup())
        
        while True:
            try:
                packet = await packet_queue.get()
                
                flow_key = self._create_flow_key(packet)
                flow = self.flows[flow_key]
                
                # Update flow statistics
                flow["packet_count"] += 1
                flow["total_bytes"] += packet.get("length", 0)
                
                if flow["first_seen"] is None:
                    flow["first_seen"] = packet["timestamp"]
                    flow["last_packet_time"] = datetime.fromisoformat(packet["timestamp"])
                else:
                    current_time = datetime.fromisoformat(packet["timestamp"])
                    iat = (current_time - flow["last_packet_time"]).total_seconds()
                    flow["inter_arrival_times"].append(iat)
                    flow["last_packet_time"] = current_time
                
                flow["last_seen"] = packet["timestamp"]
                flow["packet_sizes"].append(packet.get("length", 0))
                flow["packets"].append(packet)
                
                # Extract payload samples
                if self.preserve_payloads and len(flow["sample_payloads"]) < self.max_sample_payloads:
                    payload_sample = self._extract_payload_sample(packet)
                    if payload_sample:
                        flow["sample_payloads"].append(payload_sample)
                
                # Update protocol stats
                self._update_protocol_stats(flow, packet)
                
                # Update global statistics
                self._update_global_stats(packet, flow_key)
                
                # Keep only recent packets (memory limit)
                if len(flow["packets"]) > 100:
                    flow["packets"] = flow["packets"][-100:]
                
            except Exception as e:
                logger.error(f" Error processing packet: {e}")
                await asyncio.sleep(0.1)
    
    async def _periodic_cleanup(self):
        """Periodically clean up old data to prevent memory leaks."""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval)
                
                logger.info(" Running global statistics cleanup...")
                
                current_time = datetime.now()
                
                # Clean port scan tracker (remove entries older than window)
                cutoff_time = current_time - timedelta(seconds=self.port_scan_window)
                cleaned_ports = 0
                
                for src in list(self.global_stats["port_scan_tracker"].keys()):
                    tracker = self.global_stats["port_scan_tracker"][src]
                    # Keep only recent port contacts
                    original_len = len(tracker)
                    # Convert to list, filter, convert back
                    recent = [(port, ts) for port, ts in tracker if ts > cutoff_time]
                    tracker.clear()
                    tracker.extend(recent)
                    
                    cleaned_ports += (original_len - len(tracker))
                    
                    # Remove empty trackers
                    if len(tracker) == 0:
                        del self.global_stats["port_scan_tracker"][src]
                
                # Limit active hosts set (keep most recent)
                if len(self.global_stats["active_hosts"]) > self.max_global_hosts:
                    # Keep random sample (simple approach)
                    hosts_list = list(self.global_stats["active_hosts"])
                    self.global_stats["active_hosts"] = set(hosts_list[-self.max_global_hosts:])
                    logger.info(f"   Limited active hosts to {self.max_global_hosts}")
                
                # Clean connection matrix (remove entries with low counts)
                cleaned_conns = 0
                for src in list(self.global_stats["connection_matrix"].keys()):
                    for dst in list(self.global_stats["connection_matrix"][src].keys()):
                        if self.global_stats["connection_matrix"][src][dst] < 2:
                            del self.global_stats["connection_matrix"][src][dst]
                            cleaned_conns += 1
                    
                    # Remove empty sources
                    if len(self.global_stats["connection_matrix"][src]) == 0:
                        del self.global_stats["connection_matrix"][src]
                
                logger.info(f" Cleanup complete: {cleaned_ports} old ports, {cleaned_conns} low-count connections removed")
                
                self.last_cleanup = current_time
                
            except Exception as e:
                logger.error(f" Error in cleanup: {e}")
    
    def _update_global_stats(self, packet: Dict, flow_key: Tuple):
        """Update global statistics with memory limits."""
        src, dst, proto, src_port, dst_port = flow_key
        
        # Track unique hosts (with limit)
        if len(self.global_stats["active_hosts"]) < self.max_global_hosts:
            self.global_stats["active_hosts"].add(src)
            self.global_stats["active_hosts"].add(dst)
        
        # Protocol distribution
        self.global_stats["protocol_distribution"][proto] += 1
        
        # Port scan detection with timestamps
        if proto in ["TCP", "UDP"] and dst_port > 0:
            self.global_stats["port_scan_tracker"][src].append((dst_port, datetime.now()))
        
        # Connection matrix
        self.global_stats["connection_matrix"][src][dst] += 1
    
    def _extract_payload_sample(self, packet: Dict) -> Optional[Dict]:
        """Extract payload sample from packet."""
        sample = {
            "timestamp": packet.get("timestamp"),
            "length": packet.get("length", 0),
        }
        
        if "payload_text" in packet:
            sample["payload_text"] = packet["payload_text"][:500]
        
        if "payload_base64" in packet:
            sample["payload_base64"] = packet["payload_base64"][:1000]
        
        if "http" in packet:
            sample["http"] = packet["http"]
        if "dns" in packet:
            sample["dns"] = packet["dns"]
        if "tls" in packet:
            sample["tls"] = packet["tls"]
        if "tcp_flags" in packet:
            sample["tcp_flags"] = packet["tcp_flags"]
        
        return sample if len(sample) > 2 else None
    
    def _update_protocol_stats(self, flow: Dict, packet: Dict):
        """Update protocol-specific statistics."""
        stats = flow["protocol_stats"]
        
        # HTTP stats
        if "http" in packet:
            if "http" not in stats:
                stats["http"] = {
                    "methods": defaultdict(int),
                    "status_codes": defaultdict(int),
                    "hosts": deque(maxlen=50),
                    "user_agents": deque(maxlen=20),
                }
            http_data = packet["http"]
            if "method" in http_data:
                stats["http"]["methods"][http_data["method"]] += 1
            if "status_code" in http_data:
                stats["http"]["status_codes"][http_data["status_code"]] += 1
            if "host" in http_data and http_data["host"] not in stats["http"]["hosts"]:
                stats["http"]["hosts"].append(http_data["host"])
            if "user_agent" in http_data and http_data["user_agent"] not in stats["http"]["user_agents"]:
                stats["http"]["user_agents"].append(http_data["user_agent"])
        
        # DNS stats
        if "dns" in packet:
            if "dns" not in stats:
                stats["dns"] = {
                    "query_names": deque(maxlen=100),
                    "query_types": defaultdict(int),
                }
            dns_data = packet["dns"]
            if "query_name" in dns_data and dns_data["query_name"] not in stats["dns"]["query_names"]:
                stats["dns"]["query_names"].append(dns_data["query_name"])
            if "query_type" in dns_data:
                stats["dns"]["query_types"][dns_data["query_type"]] += 1
        
        # TLS stats
        if "tls" in packet:
            if "tls" not in stats:
                stats["tls"] = {
                    "versions": deque(maxlen=10),
                    "server_names": deque(maxlen=50),
                }
            tls_data = packet["tls"]
            if "version" in tls_data and tls_data["version"] not in stats["tls"]["versions"]:
                stats["tls"]["versions"].append(tls_data["version"])
            if "server_name" in tls_data and tls_data["server_name"] not in stats["tls"]["server_names"]:
                stats["tls"]["server_names"].append(tls_data["server_name"])
        
        # TCP flags
        if "tcp_flags" in packet:
            if "tcp_flags" not in stats:
                stats["tcp_flags"] = defaultdict(int)
            flags = packet["tcp_flags"]
            for flag, value in flags.items():
                if value:
                    stats["tcp_flags"][flag] += 1
    
    async def _periodic_emission(self, event_queue: asyncio.Queue):
        """Periodically emit condensed flow events."""
        while True:
            try:
                await asyncio.sleep(self.window_size)
                
                self.windows_observed += 1
                
                if not self.is_warmed_up and self.windows_observed >= self.warmup_windows:
                    self.is_warmed_up = True
                    logger.info(f" Warmup complete after {self.windows_observed} windows")
                    logger.info(f" Baseline established for {len(self.baseline)} flows")
                
                events = self._condense_flows()
                
                if self.is_warmed_up:
                    logger.info(f" Emitting {len(events)} events")
                else:
                    logger.info(f" Warmup {self.windows_observed}/{self.warmup_windows}: {len(events)} flows")
                
                for event in events:
                    await event_queue.put(event)
                    self.condensed_count += 1
                    
                    if event.get("is_anomaly", False):
                        self.anomaly_count += 1
                        logger.warning(f" ANOMALY [{event['severity'].upper()}]: {event['summary']}")
                        
                        # Record metrics
                        self.metrics.record_detection(
                            event.get("detection_methods", []),
                            event.get("severity", "low"),
                            event.get("proto", "unknown")
                        )
                
            except Exception as e:
                logger.error(f" Error in emission: {e}")
    
    def _create_flow_key(self, packet: Dict) -> Tuple:
        """Create 5-tuple flow key."""
        return (
            packet.get("src", "unknown"),
            packet.get("dst", "unknown"),
            packet.get("proto", "unknown"),
            packet.get("src_port", 0),
            packet.get("dst_port", 0)
        )
    
    def _condense_flows(self) -> List[Dict]:
        """Condense flows with enhanced detection."""
        events = []
        current_time = datetime.now()
        flows_to_remove = []
        
        for flow_key, flow_data in self.flows.items():
            if flow_data["packet_count"] == 0:
                continue
            
            # Check flow age
            if flow_data["last_seen"]:
                try:
                    last_seen = datetime.fromisoformat(flow_data["last_seen"])
                    age = (current_time - last_seen).total_seconds()
                    
                    if age > self.window_size * 2:
                        flows_to_remove.append(flow_key)
                        continue
                except:
                    pass
            
            packet_count = flow_data["packet_count"]
            total_bytes = flow_data["total_bytes"]
            avg_packet_size = total_bytes / packet_count if packet_count > 0 else 0
            
            baseline = self.baseline[flow_key]
            
            # Run ENHANCED multi-method detection
            anomaly_results = self._detect_anomalies_enhanced(
                flow_key, flow_data, packet_count, total_bytes, baseline
            )
            
            is_anomaly = anomaly_results["is_anomaly"]
            anomaly_score = anomaly_results["score"]
            severity = anomaly_results["severity"]
            detection_methods = anomaly_results["methods"]
            anomaly_reason = anomaly_results["reason"]
            threat_indicators = anomaly_results.get("threat_indicators", [])
            
            # Update baseline
            self._update_baseline(baseline, packet_count, total_bytes, flow_data)
            
            # Prepare protocol stats
            protocol_stats = self._serialize_protocol_stats(flow_data["protocol_stats"])
            
            # Create event
            event = {
                "timestamp": current_time.isoformat(),
                "src": flow_key[0],
                "dst": flow_key[1],
                "proto": flow_key[2],
                "src_port": flow_key[3],
                "dst_port": flow_key[4],
                "flows": packet_count,
                "total_bytes": total_bytes,
                "avg_packet_size": avg_packet_size,
                "duration": self.window_size,
                "is_anomaly": is_anomaly,
                "anomaly_score": anomaly_score,
                "severity": severity,
                "detection_methods": detection_methods,
                "threat_indicators": threat_indicators,  # NEW
                "summary": self._generate_summary(flow_key, flow_data, is_anomaly, anomaly_reason, severity, threat_indicators),
                "baseline_avg": baseline["avg_packets"],
                "baseline_std": baseline["std_packets"],
                "z_score": anomaly_results.get("z_score", 0),
                "is_warmup": not self.is_warmed_up,
            }
            
            # Add payload samples
            if self.preserve_payloads and flow_data["sample_payloads"]:
                event["sample_payloads"] = flow_data["sample_payloads"]
            
            # Add protocol stats
            if protocol_stats:
                event["protocol_stats"] = protocol_stats
            
            # Add behavioral metrics
            event["behavioral_metrics"] = self._calculate_behavioral_metrics(flow_data)
            
            events.append(event)
            
            # Reset flow counters
            flow_data["packet_count"] = 0
            flow_data["total_bytes"] = 0
            flow_data["packets"] = []
            flow_data["sample_payloads"] = []
            flow_data["protocol_stats"] = {}
        
        # Clean up old flows
        for flow_key in flows_to_remove:
            del self.flows[flow_key]
        
        return events
    
    def _detect_anomalies_enhanced(
        self, 
        flow_key: Tuple, 
        flow_data: Dict,
        packet_count: int,
        total_bytes: int,
        baseline: Dict
    ) -> Dict:
        """
        ENHANCED multi-method anomaly detection with:
        - Protocol-specific detection
        - Lightweight payload analysis
        - Improved port scan detection
        """
        methods_triggered = []
        threat_indicators = []
        max_score = 0.0
        severity = "normal"
        reason = ""
        z_score = 0.0
        
        # Don't detect during warmup
        if not self.is_warmed_up or baseline["sample_count"] < self.warmup_windows:
            return {
                "is_anomaly": False,
                "score": 0.0,
                "severity": "normal",
                "methods": [],
                "reason": "",
                "z_score": 0.0,
                "threat_indicators": []
            }
        
        # Method 1: Z-Score
        if baseline["std_packets"] > 0 and packet_count >= self.min_flows_for_alert:
            z_score = (packet_count - baseline["avg_packets"]) / baseline["std_packets"]
            
            if abs(z_score) >= self.thresholds["z_score"]:
                methods_triggered.append("Z-Score")
                score = min(abs(z_score) / (self.thresholds["z_score"] * 2), 1.0)
                max_score = max(max_score, score)
                reason = f"Statistical anomaly: Z={z_score:.2f}, {packet_count} pkts vs {baseline['avg_packets']:.0f}{baseline['std_packets']:.0f}"
        
        # Method 2: IQR
        if baseline["iqr"] > 0:
            lower_fence = baseline["p25_packets"] - (self.thresholds["iqr_mult"] * baseline["iqr"])
            upper_fence = baseline["p75_packets"] + (self.thresholds["iqr_mult"] * baseline["iqr"])
            
            if packet_count < lower_fence or packet_count > upper_fence:
                methods_triggered.append("IQR")
                distance = abs(packet_count - baseline["median_packets"])
                score = min(distance / (baseline["iqr"] * self.thresholds["iqr_mult"] * 2), 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"Outlier: {packet_count} pkts outside [{lower_fence:.0f}, {upper_fence:.0f}]"
        
        # Method 3: EWMA
        ewma = baseline["ewma_packets"]
        if ewma > 0:
            ratio = packet_count / ewma
            if ratio >= self.thresholds["rate_mult"]:
                methods_triggered.append("EWMA")
                score = min((ratio - self.thresholds["rate_mult"]) / self.thresholds["rate_mult"], 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"Spike: {ratio:.1f}x EWMA ({packet_count} vs {ewma:.0f})"
        
        # Method 4: Rate-based
        if baseline["packets_per_second"] > 0:
            current_rate = packet_count / self.window_size
            rate_ratio = current_rate / baseline["packets_per_second"]
            
            if rate_ratio >= self.thresholds["rate_mult"]:
                methods_triggered.append("Rate")
                score = min((rate_ratio - self.thresholds["rate_mult"]) / self.thresholds["rate_mult"], 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"High rate: {current_rate:.1f} pps vs {baseline['packets_per_second']:.1f} pps"
        
        # Method 5: Behavioral
        behavioral_score = self._detect_behavioral_anomalies(flow_key, flow_data, baseline)
        if behavioral_score > 0.5:
            methods_triggered.append("Behavioral")
            max_score = max(max_score, behavioral_score)
            if not reason:
                reason = "Unusual behavioral pattern"
        
        # Method 6: ENHANCED Port Scan Detection (with time window)
        src = flow_key[0]
        port_tracker = self.global_stats["port_scan_tracker"].get(src, deque())
        
        # Count unique ports in recent window
        cutoff_time = datetime.now() - timedelta(seconds=self.port_scan_window)
        recent_ports = set(port for port, ts in port_tracker if ts > cutoff_time)
        
        if len(recent_ports) > 20:
            methods_triggered.append("PortScan")
            max_score = max(max_score, 0.8)
            threat_indicators.append(f"PORT_SCAN_{len(recent_ports)}_PORTS")
            if not reason:
                reason = f"Port scan: {len(recent_ports)} ports in {self.port_scan_window}s"
        
        # NEW Method 7: Protocol-Specific Detection
        protocol_score, protocol_threats = self._detect_protocol_anomalies(flow_key, flow_data)
        if protocol_score > 0.4:
            methods_triggered.append("Protocol")
            max_score = max(max_score, protocol_score)
            threat_indicators.extend(protocol_threats)
            if not reason:
                reason = f"Protocol anomaly: {', '.join(protocol_threats)}"
        
        # NEW Method 8: Lightweight Payload Analysis
        payload_score, payload_threats = self._detect_payload_threats(flow_data)
        if payload_score > 0.5:
            methods_triggered.append("Payload")
            max_score = max(max_score, payload_score)
            threat_indicators.extend(payload_threats)
            if not reason:
                reason = f"Payload threats: {', '.join(payload_threats)}"
        
        # Determine severity
        if max_score >= 0.9:
            severity = "critical"
        elif max_score >= 0.7:
            severity = "high"
        elif max_score >= 0.5:
            severity = "medium"
        elif max_score >= 0.3:
            severity = "low"
        
        is_anomaly = len(methods_triggered) > 0
        
        return {
            "is_anomaly": is_anomaly,
            "score": max_score,
            "severity": severity,
            "methods": methods_triggered,
            "reason": reason,
            "z_score": z_score,
            "threat_indicators": threat_indicators
        }
    
    def _detect_protocol_anomalies(self, flow_key: Tuple, flow_data: Dict) -> Tuple[float, List[str]]:
        """
        NEW: Detect protocol-specific anomalies.
        Returns (score, threat_indicators)
        """
        score = 0.0
        threats = []
        proto = flow_key[2]
        stats = flow_data.get("protocol_stats", {})
        
        # DNS Anomalies
        if proto == "UDP" and "dns" in stats:
            dns = stats["dns"]
            query_names = list(dns.get("query_names", []))
            
            if query_names:
                # Check for suspiciously long domain names (tunneling)
                avg_length = mean(len(q) for q in query_names)
                if avg_length > 40:
                    score = max(score, 0.7)
                    threats.append("DNS_LONG_QUERIES")
                
                # Check for high entropy in domain names (DGA)
                high_entropy_count = sum(1 for q in query_names if self._domain_entropy(q) > 3.5)
                if high_entropy_count > len(query_names) * 0.5:
                    score = max(score, 0.8)
                    threats.append("DNS_HIGH_ENTROPY")
                
                # Check for suspicious TLDs
                suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top']
                suspicious_count = sum(1 for q in query_names if any(q.endswith(tld) for tld in suspicious_tlds))
                if suspicious_count > len(query_names) * 0.3:
                    score = max(score, 0.6)
                    threats.append("DNS_SUSPICIOUS_TLD")
        
        # HTTP Anomalies
        if proto == "TCP" and "http" in stats:
            http = stats["http"]
            methods = dict(http.get("methods", {}))
            
            # Suspicious HTTP methods
            suspicious_methods = ['TRACE', 'CONNECT', 'OPTIONS', 'DEBUG']
            if any(method in methods for method in suspicious_methods):
                score = max(score, 0.7)
                threats.append("HTTP_SUSPICIOUS_METHOD")
            
            # Too many different user agents (possible bot)
            user_agents = list(http.get("user_agents", []))
            if len(user_agents) > 10:
                score = max(score, 0.5)
                threats.append("HTTP_MULTIPLE_UA")
        
        # TLS Anomalies
        if proto == "TCP" and "tls" in stats:
            tls = stats["tls"]
            versions = list(tls.get("versions", []))
            
            # Check for old TLS versions
            old_versions = ['TLS 1.0', 'TLS 1.1', 'SSL 3.0', 'SSL 2.0']
            if any(v in versions for v in old_versions):
                score = max(score, 0.6)
                threats.append("TLS_OLD_VERSION")
        
        return score, threats
    
    def _detect_payload_threats(self, flow_data: Dict) -> Tuple[float, List[str]]:
        """
        NEW: Lightweight payload-based threat detection.
        Uses simple pattern matching (no heavy regex).
        Returns (score, threat_indicators)
        """
        score = 0.0
        threats = []
        
        samples = flow_data.get("sample_payloads", [])
        if not samples:
            return 0.0, []
        
        for sample in samples:
            payload_text = sample.get("payload_text", "").lower()
            
            if not payload_text:
                continue
            
            # SQL Injection patterns (simple check)
            sql_keywords = ['union select', 'drop table', 'insert into', '1=1', 'or 1=1', "' or '"]
            if any(kw in payload_text for kw in sql_keywords):
                score = max(score, 0.9)
                threats.append("SQL_INJECTION")
            
            # XSS patterns
            xss_patterns = ['<script', 'javascript:', 'onerror=', 'onload=']
            if any(pat in payload_text for pat in xss_patterns):
                score = max(score, 0.8)
                threats.append("XSS_ATTEMPT")
            
            # Command injection
            cmd_patterns = ['; cat ', '| cat ', '; ls ', '| ls ', '; wget ', '; curl ']
            if any(pat in payload_text for pat in cmd_patterns):
                score = max(score, 0.9)
                threats.append("COMMAND_INJECTION")
            
            # Directory traversal
            if '../' in payload_text or '..\\' in payload_text:
                score = max(score, 0.7)
                threats.append("DIRECTORY_TRAVERSAL")
            
            # Check for high base64 content (possible exfiltration)
            if 'payload_base64' in sample:
                b64_data = sample['payload_base64']
                if len(b64_data) > 500:
                    try:
                        decoded = base64.b64decode(b64_data)
                        # Check entropy of decoded data
                        if self._calculate_entropy(list(decoded)) > 0.9:
                            score = max(score, 0.7)
                            threats.append("HIGH_ENTROPY_DATA")
                    except:
                        pass
        
        return score, threats
    
    def _domain_entropy(self, domain: str) -> float:
        """Calculate entropy of domain name (for DGA detection)."""
        if not domain:
            return 0.0
        
        # Simple character entropy
        freq = defaultdict(int)
        for char in domain.lower():
            if char.isalnum():
                freq[char] += 1
        
        total = sum(freq.values())
        if total == 0:
            return 0.0
        
        entropy = 0.0
        for count in freq.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    def _detect_behavioral_anomalies(self, flow_key: Tuple, flow_data: Dict, baseline: Dict) -> float:
        """Detect behavioral anomalies."""
        score = 0.0
        
        # Packet size entropy
        if len(flow_data["packet_sizes"]) > 10:
            sizes = list(flow_data["packet_sizes"])
            entropy = self._calculate_entropy(sizes)
            
            if entropy < 0.5:
                score = max(score, 0.6)
            
            typical_size = baseline.get("typical_packet_size", 0)
            if typical_size > 0:
                current_avg = mean(sizes)
                if abs(current_avg - typical_size) / typical_size > 0.5:
                    score = max(score, 0.4)
        
        # Inter-arrival time analysis
        if len(flow_data["inter_arrival_times"]) > 10:
            iats = list(flow_data["inter_arrival_times"])
            iat_entropy = self._calculate_entropy([int(x * 1000) for x in iats])
            
            if iat_entropy < 0.3:
                score = max(score, 0.5)
        
        return score
    
    def _calculate_entropy(self, values: List[int]) -> float:
        """Calculate Shannon entropy."""
        if not values:
            return 0.0
        
        freq_dist = defaultdict(int)
        for val in values:
            freq_dist[val] += 1
        
        total = len(values)
        entropy = 0.0
        for count in freq_dist.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)
        
        max_entropy = math.log2(len(freq_dist)) if len(freq_dist) > 1 else 1
        return entropy / max_entropy if max_entropy > 0 else 0.0
    
    def _update_baseline(self, baseline: Dict, packet_count: int, total_bytes: int, flow_data: Dict):
        """Update baseline statistics."""
        baseline["history"].append(packet_count)
        
        if baseline["sample_count"] == 0:
            baseline["avg_packets"] = packet_count
            baseline["avg_bytes"] = total_bytes
            baseline["median_packets"] = packet_count
            baseline["min_packets"] = packet_count
            baseline["max_packets"] = packet_count
            baseline["ewma_packets"] = packet_count
            baseline["packets_per_second"] = packet_count / self.window_size
            baseline["bytes_per_second"] = total_bytes / self.window_size
            
            if len(flow_data["packet_sizes"]) > 0:
                baseline["typical_packet_size"] = mean(flow_data["packet_sizes"])
        else:
            alpha = 0.2
            baseline["avg_packets"] = (1 - alpha) * baseline["avg_packets"] + alpha * packet_count
            baseline["avg_bytes"] = (1 - alpha) * baseline["avg_bytes"] + alpha * total_bytes
            
            ewma_alpha = baseline["ewma_alpha"]
            baseline["ewma_packets"] = (1 - ewma_alpha) * baseline["ewma_packets"] + ewma_alpha * packet_count
            
            baseline["min_packets"] = min(baseline["min_packets"], packet_count)
            baseline["max_packets"] = max(baseline["max_packets"], packet_count)
            
            if len(baseline["history"]) >= 5:
                history_list = list(baseline["history"])
                
                if len(history_list) > 1:
                    baseline["std_packets"] = stdev(history_list)
                
                sorted_history = sorted(history_list)
                n = len(sorted_history)
                baseline["median_packets"] = sorted_history[n // 2]
                baseline["p25_packets"] = sorted_history[n // 4]
                baseline["p75_packets"] = sorted_history[(3 * n) // 4]
                baseline["iqr"] = baseline["p75_packets"] - baseline["p25_packets"]
            
            baseline["packets_per_second"] = (1 - alpha) * baseline["packets_per_second"] + alpha * (packet_count / self.window_size)
            baseline["bytes_per_second"] = (1 - alpha) * baseline["bytes_per_second"] + alpha * (total_bytes / self.window_size)
            
            if len(flow_data["packet_sizes"]) > 0:
                current_avg_size = mean(flow_data["packet_sizes"])
                if baseline["typical_packet_size"] == 0:
                    baseline["typical_packet_size"] = current_avg_size
                else:
                    baseline["typical_packet_size"] = (1 - alpha) * baseline["typical_packet_size"] + alpha * current_avg_size
                
                if len(flow_data["packet_sizes"]) > 1:
                    baseline["size_variance"] = stdev(flow_data["packet_sizes"])
        
        baseline["sample_count"] += 1
    
    def _calculate_behavioral_metrics(self, flow_data: Dict) -> Dict:
        """Calculate behavioral metrics."""
        metrics = {}
        
        if len(flow_data["packet_sizes"]) > 0:
            sizes = list(flow_data["packet_sizes"])
            metrics["avg_packet_size"] = mean(sizes)
            metrics["packet_size_entropy"] = self._calculate_entropy(sizes)
            if len(sizes) > 1:
                metrics["packet_size_stddev"] = stdev(sizes)
        
        if len(flow_data["inter_arrival_times"]) > 0:
            iats = list(flow_data["inter_arrival_times"])
            metrics["avg_inter_arrival_time"] = mean(iats)
            metrics["timing_entropy"] = self._calculate_entropy([int(x * 1000) for x in iats])
            if len(iats) > 1:
                metrics["timing_stddev"] = stdev(iats)
        
        return metrics
    
    def _serialize_protocol_stats(self, stats: Dict) -> Dict:
        """Serialize protocol stats."""
        serialized = {}
        
        for proto, proto_stats in stats.items():
            serialized[proto] = {}
            for key, value in proto_stats.items():
                if isinstance(value, (set, deque)):
                    serialized[proto][key] = list(value)
                elif isinstance(value, defaultdict):
                    serialized[proto][key] = dict(value)
                else:
                    serialized[proto][key] = value
        
        return serialized
    
    def _generate_summary(
        self, 
        flow_key: Tuple, 
        flow_data: Dict, 
        is_anomaly: bool,
        anomaly_reason: str,
        severity: str = "normal",
        threat_indicators: List[str] = None
    ) -> str:
        """Generate human-readable summary."""
        src, dst, proto, src_port, dst_port = flow_key
        packet_count = flow_data["packet_count"]
        
        port_services = {
            80: "HTTP", 443: "HTTPS", 53: "DNS", 22: "SSH",
            3389: "RDP", 21: "FTP", 25: "SMTP", 3306: "MySQL",
            5432: "PostgreSQL", 6379: "Redis", 27017: "MongoDB"
        }
        service = port_services.get(dst_port, f"Port {dst_port}")
        
        if not self.is_warmed_up:
            return f"[BASELINE] {proto} traffic: {src}  {dst} ({service}), {packet_count} packets"
        
        if is_anomaly:
            severity_icons = {
                "critical": "",
                "high": "", 
                "medium": "",
                "low": ""
            }
            icon = severity_icons.get(severity, "")
            
            threat_str = ""
            if threat_indicators:
                threat_str = f" | Threats: {', '.join(threat_indicators[:3])}"
            
            return f"{icon} ANOMALY [{severity.upper()}]: {anomaly_reason} | {src}  {dst} ({service}){threat_str}"
        else:
            return f"{proto} traffic: {src}  {dst} ({service}), {packet_count} packets"
    
    def get_stats(self) -> Dict:
        """Get comprehensive statistics."""
        return {
            "active_flows": len(self.flows),
            "condensed_events": self.condensed_count,
            "anomalies_detected": self.anomaly_count,
            "baseline_entries": len(self.baseline),
            "warmup_complete": self.is_warmed_up,
            "windows_observed": self.windows_observed,
            "payload_preservation": self.preserve_payloads,
            "unique_hosts": len(self.global_stats["active_hosts"]),
            "detection_thresholds": self.thresholds,
            "detection_metrics": self.metrics.get_stats(),
            "last_cleanup": self.last_cleanup.isoformat(),
        }
