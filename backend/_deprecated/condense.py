"""
condense.py - Industrial-grade packet aggregation and anomaly detection
Features: Multiple detection algorithms, statistical analysis, adaptive thresholds,
behavioral profiling, and pattern recognition.
"""

import asyncio
import logging
import math
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
from statistics import mean, stdev

logger = logging.getLogger(__name__)


class FlowCondenser:
    """
    Industrial-grade flow condenser with advanced anomaly detection.
    
    Detection Methods:
    1. Statistical (Z-score, IQR)
    2. Time-series (EWMA, trend analysis)
    3. Behavioral (protocol patterns, entropy)
    4. Threshold (absolute limits)
    """
    
    def __init__(
        self, 
        window_size: int = 10, 
        anomaly_threshold: float = 3.0,  # Z-score threshold
        min_flows_for_alert: int = 10,
        warmup_windows: int = 10,  # Longer warmup for better baseline
        preserve_payloads: bool = True,
        max_sample_payloads: int = 5,
        # Advanced parameters
        use_adaptive_threshold: bool = True,
        sensitivity: str = "medium"  # low, medium, high
    ):
        """
        Initialize industrial-grade flow condenser.
        
        Args:
            window_size: Time window in seconds
            anomaly_threshold: Z-score threshold (typically 3.0 for 99.7% confidence)
            min_flows_for_alert: Minimum packets before alerting
            warmup_windows: Number of windows for baseline (10+ recommended)
            preserve_payloads: Preserve sample payloads
            max_sample_payloads: Maximum samples per flow
            use_adaptive_threshold: Dynamically adjust thresholds
            sensitivity: Detection sensitivity (low/medium/high)
        """
        self.window_size = window_size
        self.anomaly_threshold = anomaly_threshold
        self.min_flows_for_alert = min_flows_for_alert
        self.warmup_windows = warmup_windows
        self.preserve_payloads = preserve_payloads
        self.max_sample_payloads = max_sample_payloads
        self.use_adaptive_threshold = use_adaptive_threshold
        
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
            "packet_sizes": deque(maxlen=100),  # For entropy calculation
            "inter_arrival_times": deque(maxlen=100),  # Timing patterns
        })
        
        # Enhanced baseline with statistical metrics
        self.baseline: Dict[Tuple, Dict] = defaultdict(lambda: {
            # Central tendency
            "avg_packets": 0,
            "avg_bytes": 0,
            "median_packets": 0,
            
            # Dispersion
            "std_packets": 0,
            "std_bytes": 0,
            
            # Range
            "min_packets": float('inf'),
            "max_packets": 0,
            "p25_packets": 0,  # 25th percentile
            "p75_packets": 0,  # 75th percentile
            "iqr": 0,  # Interquartile range
            
            # Time-series
            "ewma_packets": 0,  # Exponentially weighted moving average
            "ewma_alpha": 0.3,
            
            # Historical data
            "history": deque(maxlen=100),  # Last 100 observations
            "sample_count": 0,
            
            # Rate tracking
            "packets_per_second": 0,
            "bytes_per_second": 0,
            
            # Behavioral
            "typical_packet_size": 0,
            "size_variance": 0,
        })
        
        # Global statistics for cross-flow analysis
        self.global_stats = {
            "total_flows": 0,
            "active_hosts": set(),
            "protocol_distribution": defaultdict(int),
            "port_scan_tracker": defaultdict(set),  # src -> set of dst_ports
            "connection_matrix": defaultdict(lambda: defaultdict(int)),  # src -> dst -> count
        }
        
        self.condensed_count = 0
        self.anomaly_count = 0
        
    async def process_packets(
        self, 
        packet_queue: asyncio.Queue,
        event_queue: asyncio.Queue
    ):
        """Process packets with advanced tracking."""
        logger.info(f"Starting industrial-grade packet condensation...")
        logger.info(f"Detection: Z-score={self.thresholds['z_score']}, IQR multiplier={self.thresholds['iqr_mult']}")
        
        # Start periodic flow emission
        asyncio.create_task(self._periodic_emission(event_queue))
        
        while True:
            try:
                packet = await packet_queue.get()
                
                logger.debug(f"Processing packet: {packet.get('src')} -> {packet.get('dst')} [{packet.get('proto')}]")
                
                flow_key = self._create_flow_key(packet)
                flow = self.flows[flow_key]
                
                # Update flow statistics
                flow["packet_count"] += 1
                flow["total_bytes"] += packet.get("length", 0)
                
                if flow["first_seen"] is None:
                    flow["first_seen"] = packet["timestamp"]
                    flow["last_packet_time"] = datetime.fromisoformat(packet["timestamp"])
                else:
                    # Track inter-arrival times for timing analysis
                    current_time = datetime.fromisoformat(packet["timestamp"])
                    iat = (current_time - flow["last_packet_time"]).total_seconds()
                    flow["inter_arrival_times"].append(iat)
                    flow["last_packet_time"] = current_time
                
                flow["last_seen"] = packet["timestamp"]
                
                # Track packet sizes for entropy/variance analysis
                flow["packet_sizes"].append(packet.get("length", 0))
                
                # Store packet for recent history
                flow["packets"].append(packet)
                
                # Extract payload samples
                if self.preserve_payloads and len(flow["sample_payloads"]) < self.max_sample_payloads:
                    payload_sample = self._extract_payload_sample(packet)
                    if payload_sample:
                        flow["sample_payloads"].append(payload_sample)
                
                # Update protocol stats
                self._update_protocol_stats(flow, packet)
                
                # Update global statistics for cross-flow analysis
                self._update_global_stats(packet, flow_key)
                
                # Keep only recent packets
                if len(flow["packets"]) > 100:
                    flow["packets"] = flow["packets"][-100:]
                
            except Exception as e:
                logger.error(f"Error processing packet: {e}")
                await asyncio.sleep(0.1)
    
    def _update_global_stats(self, packet: Dict, flow_key: Tuple):
        """Update global statistics for cross-flow correlation."""
        src, dst, proto, src_port, dst_port = flow_key
        
        # Track unique hosts
        self.global_stats["active_hosts"].add(src)
        self.global_stats["active_hosts"].add(dst)
        
        # Protocol distribution
        self.global_stats["protocol_distribution"][proto] += 1
        
        # Port scan detection: track unique ports per source
        if proto in ["TCP", "UDP"]:
            self.global_stats["port_scan_tracker"][src].add(dst_port)
        
        # Connection matrix for behavioral analysis
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
        
        if "payload_text" in sample or "payload_base64" in sample or any(k in sample for k in ["http", "dns", "tls"]):
            return sample
        return None
    
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
                    logger.info(f" Warmup complete after {self.windows_observed} windows. Advanced anomaly detection active.")
                    logger.info(f" Baseline established for {len(self.baseline)} flows")
                
                events = self._condense_flows()
                
                if self.is_warmed_up:
                    logger.info(f"Emitting {len(events)} condensed events")
                else:
                    logger.info(f"Warmup {self.windows_observed}/{self.warmup_windows}: {len(events)} flows observed")
                
                for event in events:
                    await event_queue.put(event)
                    self.condensed_count += 1
                    
                    if not self.is_warmed_up:
                        logger.debug(f"[WARMUP] {event['src']} -> {event['dst']} [{event['proto']}] {event['flows']} pkts")
                    else:
                        logger.info(f"Event: {event['src']} -> {event['dst']} [{event['proto']}] {event['flows']} pkts")
                    
                    if event.get("is_anomaly", False):
                        self.anomaly_count += 1
                        logger.warning(f" ANOMALY [{event['severity'].upper()}]: {event['summary']}")
                
            except Exception as e:
                logger.error(f"Error in periodic emission: {e}")
    
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
        """
        Condense flows with industrial-grade anomaly detection.
        Uses multiple detection methods for robust analysis.
        """
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
            
            # Calculate basic metrics
            packet_count = flow_data["packet_count"]
            total_bytes = flow_data["total_bytes"]
            avg_packet_size = total_bytes / packet_count if packet_count > 0 else 0
            
            # Get baseline
            baseline = self.baseline[flow_key]
            
            # Run multi-method anomaly detection
            anomaly_results = self._detect_anomalies_multi_method(
                flow_key, flow_data, packet_count, total_bytes, baseline
            )
            
            is_anomaly = anomaly_results["is_anomaly"]
            anomaly_score = anomaly_results["score"]
            severity = anomaly_results["severity"]
            detection_methods = anomaly_results["methods"]
            anomaly_reason = anomaly_results["reason"]
            
            # Update baseline with new observation
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
                "summary": self._generate_summary(flow_key, flow_data, is_anomaly, anomaly_reason, severity),
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
    
    def _detect_anomalies_multi_method(
        self, 
        flow_key: Tuple, 
        flow_data: Dict,
        packet_count: int,
        total_bytes: int,
        baseline: Dict
    ) -> Dict:
        """
        Industrial-grade multi-method anomaly detection.
        Combines statistical, behavioral, and threshold methods.
        """
        methods_triggered = []
        max_score = 0.0
        severity = "normal"
        reason = ""
        
        # Don't detect during warmup
        if not self.is_warmed_up or baseline["sample_count"] < self.warmup_windows:
            return {
                "is_anomaly": False,
                "score": 0.0,
                "severity": "normal",
                "methods": [],
                "reason": "",
                "z_score": 0.0
            }
        
        # Method 1: Z-Score (Statistical)
        if baseline["std_packets"] > 0 and packet_count >= self.min_flows_for_alert:
            z_score = (packet_count - baseline["avg_packets"]) / baseline["std_packets"]
            
            if abs(z_score) >= self.thresholds["z_score"]:
                methods_triggered.append("Z-Score")
                score = min(abs(z_score) / (self.thresholds["z_score"] * 2), 1.0)
                max_score = max(max_score, score)
                reason = f"Statistical anomaly: Z-score={z_score:.2f}, {packet_count} pkts vs baseline {baseline['avg_packets']:.0f}{baseline['std_packets']:.0f}"
        
        # Method 2: IQR (Interquartile Range)
        if baseline["iqr"] > 0:
            lower_fence = baseline["p25_packets"] - (self.thresholds["iqr_mult"] * baseline["iqr"])
            upper_fence = baseline["p75_packets"] + (self.thresholds["iqr_mult"] * baseline["iqr"])
            
            if packet_count < lower_fence or packet_count > upper_fence:
                methods_triggered.append("IQR")
                distance = abs(packet_count - baseline["median_packets"])
                score = min(distance / (baseline["iqr"] * self.thresholds["iqr_mult"] * 2), 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"Outlier detected: {packet_count} pkts outside IQR range [{lower_fence:.0f}, {upper_fence:.0f}]"
        
        # Method 3: EWMA (Exponentially Weighted Moving Average)
        ewma = baseline["ewma_packets"]
        if ewma > 0:
            ratio = packet_count / ewma
            if ratio >= self.thresholds["rate_mult"]:
                methods_triggered.append("EWMA")
                score = min((ratio - self.thresholds["rate_mult"]) / self.thresholds["rate_mult"], 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"Sudden spike: {ratio:.1f} expected EWMA rate ({packet_count} vs {ewma:.0f})"
        
        # Method 4: Rate-based (Packets per second)
        if baseline["packets_per_second"] > 0:
            current_rate = packet_count / self.window_size
            rate_ratio = current_rate / baseline["packets_per_second"]
            
            if rate_ratio >= self.thresholds["rate_mult"]:
                methods_triggered.append("Rate")
                score = min((rate_ratio - self.thresholds["rate_mult"]) / self.thresholds["rate_mult"], 1.0)
                max_score = max(max_score, score)
                if not reason:
                    reason = f"High packet rate: {current_rate:.1f} pps vs baseline {baseline['packets_per_second']:.1f} pps"
        
        # Method 5: Behavioral (Protocol-specific patterns)
        behavioral_score = self._detect_behavioral_anomalies(flow_key, flow_data, baseline)
        if behavioral_score > 0.5:
            methods_triggered.append("Behavioral")
            max_score = max(max_score, behavioral_score)
            if not reason:
                reason = "Unusual behavioral pattern detected"
        
        # Method 6: Port Scan Detection
        src = flow_key[0]
        if len(self.global_stats["port_scan_tracker"].get(src, set())) > 20:
            methods_triggered.append("PortScan")
            max_score = max(max_score, 0.8)
            if not reason:
                reason = f"Possible port scan: {len(self.global_stats['port_scan_tracker'][src])} ports contacted"
        
        # Determine severity based on score
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
            "z_score": z_score if 'z_score' in locals() else 0.0
        }
    
    def _detect_behavioral_anomalies(self, flow_key: Tuple, flow_data: Dict, baseline: Dict) -> float:
        """Detect behavioral anomalies based on protocol patterns."""
        score = 0.0
        
        # Packet size entropy (uniform vs varied)
        if len(flow_data["packet_sizes"]) > 10:
            sizes = list(flow_data["packet_sizes"])
            entropy = self._calculate_entropy(sizes)
            
            # Very uniform packet sizes (potential tunnel/exfiltration)
            if entropy < 0.5:
                score = max(score, 0.6)
            
            # Check for packet size patterns
            typical_size = baseline.get("typical_packet_size", 0)
            if typical_size > 0:
                current_avg = mean(sizes)
                if abs(current_avg - typical_size) / typical_size > 0.5:
                    score = max(score, 0.4)
        
        # Inter-arrival time analysis
        if len(flow_data["inter_arrival_times"]) > 10:
            iats = list(flow_data["inter_arrival_times"])
            iat_entropy = self._calculate_entropy([int(x * 1000) for x in iats])  # ms resolution
            
            # Very regular timing (potential automated/scripted)
            if iat_entropy < 0.3:
                score = max(score, 0.5)
        
        return score
    
    def _calculate_entropy(self, values: List[int]) -> float:
        """Calculate Shannon entropy of a value distribution."""
        if not values:
            return 0.0
        
        # Create frequency distribution
        freq_dist = defaultdict(int)
        for val in values:
            freq_dist[val] += 1
        
        # Calculate entropy
        total = len(values)
        entropy = 0.0
        for count in freq_dist.values():
            p = count / total
            if p > 0:
                entropy -= p * math.log2(p)
        
        # Normalize to [0, 1]
        max_entropy = math.log2(len(freq_dist)) if len(freq_dist) > 1 else 1
        return entropy / max_entropy if max_entropy > 0 else 0.0
    
    def _update_baseline(self, baseline: Dict, packet_count: int, total_bytes: int, flow_data: Dict):
        """Update baseline with advanced statistical tracking."""
        # Add to history
        baseline["history"].append(packet_count)
        
        if baseline["sample_count"] == 0:
            # Initial observation
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
            # Update moving averages
            alpha = 0.2  # Exponential moving average weight
            baseline["avg_packets"] = (1 - alpha) * baseline["avg_packets"] + alpha * packet_count
            baseline["avg_bytes"] = (1 - alpha) * baseline["avg_bytes"] + alpha * total_bytes
            
            # Update EWMA with custom alpha
            ewma_alpha = baseline["ewma_alpha"]
            baseline["ewma_packets"] = (1 - ewma_alpha) * baseline["ewma_packets"] + ewma_alpha * packet_count
            
            # Update range
            baseline["min_packets"] = min(baseline["min_packets"], packet_count)
            baseline["max_packets"] = max(baseline["max_packets"], packet_count)
            
            # Calculate statistics from history
            if len(baseline["history"]) >= 5:
                history_list = list(baseline["history"])
                
                # Standard deviation
                if len(history_list) > 1:
                    baseline["std_packets"] = stdev(history_list)
                
                # Median and percentiles
                sorted_history = sorted(history_list)
                n = len(sorted_history)
                baseline["median_packets"] = sorted_history[n // 2]
                baseline["p25_packets"] = sorted_history[n // 4]
                baseline["p75_packets"] = sorted_history[(3 * n) // 4]
                baseline["iqr"] = baseline["p75_packets"] - baseline["p25_packets"]
            
            # Update rates
            baseline["packets_per_second"] = (1 - alpha) * baseline["packets_per_second"] + alpha * (packet_count / self.window_size)
            baseline["bytes_per_second"] = (1 - alpha) * baseline["bytes_per_second"] + alpha * (total_bytes / self.window_size)
            
            # Update packet size tracking
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
        """Calculate behavioral metrics for the flow."""
        metrics = {}
        
        # Packet size metrics
        if len(flow_data["packet_sizes"]) > 0:
            sizes = list(flow_data["packet_sizes"])
            metrics["avg_packet_size"] = mean(sizes)
            metrics["packet_size_entropy"] = self._calculate_entropy(sizes)
            if len(sizes) > 1:
                metrics["packet_size_stddev"] = stdev(sizes)
        
        # Timing metrics
        if len(flow_data["inter_arrival_times"]) > 0:
            iats = list(flow_data["inter_arrival_times"])
            metrics["avg_inter_arrival_time"] = mean(iats)
            metrics["timing_entropy"] = self._calculate_entropy([int(x * 1000) for x in iats])
            if len(iats) > 1:
                metrics["timing_stddev"] = stdev(iats)
        
        return metrics
    
    def _serialize_protocol_stats(self, stats: Dict) -> Dict:
        """Serialize protocol stats for JSON output."""
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
        severity: str = "normal"
    ) -> str:
        """Generate human-readable summary."""
        src, dst, proto, src_port, dst_port = flow_key
        packet_count = flow_data["packet_count"]
        total_bytes = flow_data["total_bytes"]
        
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
            return f"{icon} ANOMALY [{severity.upper()}]: {anomaly_reason} | {src}  {dst} ({service})"
        else:
            return f"{proto} traffic: {src}  {dst} ({service}), {packet_count} packets, {total_bytes} bytes"
    
    def get_stats(self) -> Dict:
        """Get condenser statistics."""
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
        }
