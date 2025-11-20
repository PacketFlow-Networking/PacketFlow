"""
capture.py - Real-time packet capture module with PCAP replay support
Captures network packets using TShark and streams them to an async queue.
Includes packet payloads for deep packet inspection (DPI) capabilities.
NEW: Supports reading from PCAP files and looping for testing.
"""

import asyncio
import orjson
import logging
import subprocess
import json
import base64
import os
from typing import Dict, Optional
from datetime import datetime
import urllib.request

try:
    from scapy.all import rdpcap, Ether, IP, IPv6, TCP, UDP, DNS, Raw, DNSQR, DNSRR
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False
    logger.warning("Scapy not available. Install with: pip install scapy")

logger = logging.getLogger(__name__)


class PacketCapture:
    """Captures network packets using TShark and parses them into structured data with payloads."""
    
    def __init__(
        self, 
        interface: str = "eth0", 
        mock_mode: bool = False,
        pcap_file: str = None,
        pcap_loop: bool = True,
        pcap_speed: float = 1.0,
        capture_filter: str = "",
        capture_payload: bool = True,
        max_payload_bytes: int = 1500
    ):
        """
        Initialize packet capture.
        
        Args:
            interface: Network interface to capture on (e.g., 'eth0', 'Wi-Fi')
            mock_mode: If True, generate simulated packets instead of real capture
            pcap_file: Path to PCAP file to replay (if set, uses file instead of live capture)
            pcap_loop: If True, loop the PCAP file indefinitely
            pcap_speed: Playback speed multiplier (1.0 = realtime, 2.0 = 2x speed)
            capture_filter: BPF filter string (e.g., 'tcp port 80')
            capture_payload: If True, capture packet payloads (default: True)
            max_payload_bytes: Maximum payload bytes to capture per packet (default: 1500)
        """
        self.interface = interface
        self.mock_mode = mock_mode
        self.pcap_file = pcap_file
        self.pcap_loop = pcap_loop
        self.pcap_speed = pcap_speed
        self.capture_filter = capture_filter
        self.capture_payload = capture_payload
        self.max_payload_bytes = max_payload_bytes
        self.process: Optional[subprocess.Popen] = None
        self.packet_count = 0
        self.packets_dropped = 0  # Track TShark packet drops
        
    async def start_capture(self, queue: asyncio.Queue):
        """
        Start capturing packets and pushing them to the queue.
        
        Args:
            queue: Async queue to send parsed packets to
        """
        if self.mock_mode:
            logger.info("Starting packet capture in MOCK mode (with simulated payloads)")
            await self._mock_capture(queue)
        elif self.pcap_file:
            logger.info(f"Starting PCAP replay from: {self.pcap_file} (loop={self.pcap_loop}, speed={self.pcap_speed}x)")
            await self._pcap_replay(queue)
        else:
            logger.info(f"Starting packet capture on interface: {self.interface} (payload capture: {self.capture_payload})")
            await self._real_capture(queue)
    
    async def _pcap_replay(self, queue: asyncio.Queue):
        """Replay packets from a PCAP file using native Python scapy library."""
        if not os.path.exists(self.pcap_file):
            logger.error(f"PCAP file not found: {self.pcap_file}")
            logger.info("Falling back to mock mode...")
            await self._mock_capture(queue)
            return
        
        if not SCAPY_AVAILABLE:
            logger.error("Scapy not installed. Install with: pip install scapy")
            logger.info("Falling back to mock mode...")
            await self._mock_capture(queue)
            return
        
        try:
            loop_count = 0
            
            while True:
                loop_count += 1
                logger.info(f"Playing PCAP file (loop {loop_count})...")
                
                # Read PCAP file using scapy (handles both .pcap and .pcapng)
                logger.info(f"Reading PCAP file with scapy: {self.pcap_file}")
                packets = await asyncio.to_thread(rdpcap, self.pcap_file)
                
                logger.info(f"Loaded {len(packets)} packets from PCAP")
                
                packet_count_loop = 0
                last_packet_time = None
                
                # Process each packet
                for pkt in packets:
                    try:
                        parsed = self._parse_scapy_packet(pkt)
                        
                        if parsed:
                            # Add realistic timing based on packet timestamps
                            if hasattr(pkt, 'time') and last_packet_time and self.pcap_speed > 0:
                                delay = (pkt.time - last_packet_time) / self.pcap_speed
                                
                                # Limit delay to reasonable bounds (0-10 seconds)
                                if 0 < delay < 10:
                                    await asyncio.sleep(delay)
                            
                            if hasattr(pkt, 'time'):
                                last_packet_time = pkt.time
                            
                            await queue.put(parsed)
                            self.packet_count += 1
                            packet_count_loop += 1
                            
                            # Log progress every 100 packets
                            if packet_count_loop % 100 == 0:
                                logger.info(f"Replayed {packet_count_loop} packets from PCAP (total: {self.packet_count})")
                    
                    except Exception as e:
                        logger.debug(f"Error parsing packet: {e}")
                        continue
                
                logger.info(f"PCAP replay complete: {packet_count_loop} packets from loop {loop_count}")
                
                # If not looping, break
                if not self.pcap_loop:
                    logger.info("PCAP replay finished (loop disabled)")
                    break
                
                # Small delay between loops
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"PCAP replay error: {e}")
            logger.info("Falling back to mock mode...")
            await self._mock_capture(queue)
    
    async def _real_capture(self, queue: asyncio.Queue):
        """Capture real packets using TShark EK format with payload data."""
        try:
            # Use EK format - one JSON object per line (efficient!)
            cmd = [
                "tshark",
                "-i", self.interface,
                "-l",  # Line buffered
                "-T", "ek",  # Elasticsearch format - one JSON per line
                "-x",  # Include hex dump for payload extraction
                "-B", "64",  # 64MB ring buffer to prevent packet drops
            ]
            
            # Add BPF filter if specified
            if self.capture_filter:
                cmd.extend(["-f", self.capture_filter])
            
            logger.info(f"Starting TShark with EK format + hex dump for payload capture")
            
            # Start TShark process with larger buffer
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                limit=10 * 1024 * 1024  # 10MB buffer for large packets
            )
            
            # Start stderr monitoring task
            asyncio.create_task(self._monitor_tshark_errors())
            
            # Read packets line by line
            packet_count_local = 0
            async for line in self.process.stdout:
                try:
                    line_str = line.decode('utf-8').strip()
                    
                    # Skip empty lines and index lines
                    if not line_str or line_str.startswith('{"index"'):
                        continue
                    
                    # Skip "Capturing on" and packet count messages
                    if "Capturing" in line_str or "packets captured" in line_str:
                        continue
                    
                    # Parse JSON packet
                    try:
                        packet_data = orjson.loads(line_str)
                        parsed = self._parse_ek_packet(packet_data)
                        
                        if parsed:
                            await queue.put(parsed)
                            self.packet_count += 1
                            packet_count_local += 1
                            
                            # Log every 50 packets
                            if packet_count_local % 50 == 0:
                                logger.info(f"Captured {packet_count_local} packets (with payloads)")
                    except json.JSONDecodeError:
                        # Skip lines that aren't JSON
                        continue
                            
                except Exception as e:
                    logger.debug(f"Error processing line: {e}")
                    
        except FileNotFoundError:
            logger.error("TShark not found. Please install Wireshark/TShark.")
            logger.info("Falling back to mock mode...")
            await self._mock_capture(queue)
        except Exception as e:
            logger.error(f"Capture error: {e}")
            
    async def _monitor_tshark_errors(self):
        """Monitor TShark stderr for packet drops and errors."""
        if not self.process or not self.process.stderr:
            return
        
        import re
        try:
            async for line in self.process.stderr:
                line_str = line.decode('utf-8', errors='ignore').strip()
                
                # Look for packet drop messages
                if 'packets dropped' in line_str.lower():
                    # Extract number: "123 packets dropped by kernel"
                    match = re.search(r'(\d+)\s+packets?\s+dropped', line_str, re.IGNORECASE)
                    if match:
                        dropped = int(match.group(1))
                        self.packets_dropped += dropped
                        logger.warning(f" TShark dropped {dropped} packets (total: {self.packets_dropped})")
                
                # Log other important errors
                elif 'error' in line_str.lower() or 'warning' in line_str.lower():
                    logger.debug(f"TShark: {line_str}")
        except Exception as e:
            logger.debug(f"Error monitoring TShark stderr: {e}")
    
    def _parse_ek_packet(self, packet_data: Dict) -> Optional[Dict]:
        """
        Parse TShark EK format JSON packet with payload extraction.
        
        Args:
            packet_data: EK format packet with layers
            
        Returns:
            Parsed packet dictionary with payload or None
        """
        try:
            layers = packet_data.get("layers", {})
            
            if not layers:
                return None
            
            # Get timestamp from frame layer
            frame = layers.get("frame", {})
            timestamp = frame.get("frame_frame_time_epoch", str(datetime.now().timestamp()))
            length = int(frame.get("frame_frame_len", 0))
            
            # Extract raw packet bytes if available
            raw_packet = frame.get("frame_frame_raw", None)
            
            # Get IP layer (try both IPv4 and IPv6)
            ip = layers.get("ip", layers.get("ipv6", {}))
            
            if not ip:
                logger.debug("No IP layer found")
                return None
            
            # Extract IPs
            src = ip.get("ip_ip_src", ip.get("ipv6_ipv6_src"))
            dst = ip.get("ip_ip_dst", ip.get("ipv6_ipv6_dst"))
            
            if not src or not dst:
                return None
            
            # Get protocol
            proto_num = str(ip.get("ip_ip_proto", ip.get("ipv6_ipv6_nxt", "0")))
            proto_map = {
                "1": "ICMP",
                "2": "IGMP",
                "6": "TCP",
                "17": "UDP",
                "41": "IPv6",
                "47": "GRE",
                "50": "ESP",
                "51": "AH",
                "58": "ICMPv6",
                "89": "OSPF",
                "132": "SCTP",
            }
            proto = proto_map.get(proto_num, f"IP_{proto_num}")
            
            # Get ports and protocol-specific data
            src_port = 0
            dst_port = 0
            tcp_flags = None
            tcp_seq = None
            tcp_ack = None
            payload_data = None
            payload_text = None
            http_data = None
            dns_data = None
            tls_data = None
            
            # TCP specifics
            if proto == "TCP":
                tcp = layers.get("tcp", {})
                src_port = int(tcp.get("tcp_tcp_srcport", 0))
                dst_port = int(tcp.get("tcp_tcp_dstport", 0))
                
                # TCP flags
                flags_raw = tcp.get("tcp_tcp_flags", {})
                if isinstance(flags_raw, dict):
                    tcp_flags = {
                        "syn": flags_raw.get("tcp_tcp_flags_syn", "0") == "1",
                        "ack": flags_raw.get("tcp_tcp_flags_ack", "0") == "1",
                        "fin": flags_raw.get("tcp_tcp_flags_fin", "0") == "1",
                        "rst": flags_raw.get("tcp_tcp_flags_reset", "0") == "1",
                        "psh": flags_raw.get("tcp_tcp_flags_push", "0") == "1",
                    }
                
                # Sequence numbers
                tcp_seq = tcp.get("tcp_tcp_seq", None)
                tcp_ack = tcp.get("tcp_tcp_ack", None)
                
                # TCP payload
                payload_data = tcp.get("tcp_tcp_payload", None)
                
                # Check for HTTP
                if "http" in layers:
                    http = layers.get("http", {})
                    http_data = {
                        "method": http.get("http_http_request_method", None),
                        "uri": http.get("http_http_request_uri", None),
                        "host": http.get("http_http_host", None),
                        "user_agent": http.get("http_http_user_agent", None),
                        "status_code": http.get("http_http_response_code", None),
                        "content_type": http.get("http_http_content_type", None),
                    }
                    # Clean up None values
                    http_data = {k: v for k, v in http_data.items() if v is not None}
                
                # Check for TLS/SSL
                if "tls" in layers or "ssl" in layers:
                    tls = layers.get("tls", layers.get("ssl", {}))
                    tls_data = {
                        "version": tls.get("tls_tls_record_version", None),
                        "handshake_type": tls.get("tls_tls_handshake_type", None),
                        "server_name": tls.get("tls_tls_handshake_extensions_server_name", None),
                        "cipher_suites": tls.get("tls_tls_handshake_ciphersuites", None),
                    }
                    tls_data = {k: v for k, v in tls_data.items() if v is not None}
            
            # UDP specifics
            elif proto == "UDP":
                udp = layers.get("udp", {})
                src_port = int(udp.get("udp_udp_srcport", 0))
                dst_port = int(udp.get("udp_udp_dstport", 0))
                
                # UDP payload
                payload_data = udp.get("udp_udp_payload", None)
                
                # Check for DNS
                if "dns" in layers:
                    dns = layers.get("dns", {})
                    dns_data = {
                        "query_name": dns.get("dns_dns_qry_name", None),
                        "query_type": dns.get("dns_dns_qry_type", None),
                        "response_code": dns.get("dns_dns_flags_rcode", None),
                        "answers": dns.get("dns_dns_resp_name", None),
                        "transaction_id": dns.get("dns_dns_id", None),
                    }
                    dns_data = {k: v for k, v in dns_data.items() if v is not None}
            
            # Try to decode payload as text if it exists
            if payload_data and self.capture_payload:
                try:
                    # Payload is usually in hex format in TShark
                    if isinstance(payload_data, str):
                        # Convert hex string to bytes
                        payload_bytes = bytes.fromhex(payload_data.replace(":", ""))
                        # Limit payload size
                        if len(payload_bytes) > self.max_payload_bytes:
                            payload_bytes = payload_bytes[:self.max_payload_bytes]
                        
                        # Try to decode as UTF-8 text
                        try:
                            payload_text = payload_bytes.decode('utf-8', errors='ignore')
                            # Keep only printable characters
                            payload_text = ''.join(c for c in payload_text if c.isprintable() or c in '\n\r\t')
                        except:
                            payload_text = None
                        
                        # Keep raw payload as base64 for binary data
                        payload_data = base64.b64encode(payload_bytes).decode('ascii')
                except Exception as e:
                    logger.debug(f"Payload decode error: {e}")
                    payload_data = None
                    payload_text = None
            
            # Build result packet
            result = {
                "timestamp": str(timestamp),
                "src": src,
                "dst": dst,
                "proto": proto,
                "src_port": src_port,
                "dst_port": dst_port,
                "length": length,
            }
            
            # Add payload data if captured
            if self.capture_payload:
                if payload_data:
                    result["payload_base64"] = payload_data  # Binary-safe base64
                if payload_text:
                    result["payload_text"] = payload_text  # Human-readable text
            
            # Add protocol-specific data
            if tcp_flags:
                result["tcp_flags"] = tcp_flags
            if tcp_seq:
                result["tcp_seq"] = tcp_seq
            if tcp_ack:
                result["tcp_ack"] = tcp_ack
            if http_data:
                result["http"] = http_data
            if dns_data:
                result["dns"] = dns_data
            if tls_data:
                result["tls"] = tls_data
            
            logger.debug(f"Parsed: {src}:{src_port} -> {dst}:{dst_port} [{proto}] {length}B" + 
                        (" (with payload)" if payload_data else ""))
            return result
            
        except Exception as e:
            logger.debug(f"Parse error: {e}")
            return None
    
    def _parse_scapy_packet(self, pkt) -> Optional[Dict]:
        """
        Parse a scapy packet into our standard format.
        
        Args:
            pkt: Scapy packet object
            
        Returns:
            Parsed packet dictionary or None
        """
        try:
            # Must have IP layer
            if not (pkt.haslayer(IP) or pkt.haslayer(IPv6)):
                return None
            
            # Extract IP info
            if pkt.haslayer(IP):
                ip = pkt[IP]
                src = ip.src
                dst = ip.dst
                proto_num = ip.proto
            else:  # IPv6
                ip = pkt[IPv6]
                src = ip.src
                dst = ip.dst
                proto_num = ip.nh
            
            # Map protocol number to name
            proto_map = {
                1: "ICMP", 6: "TCP", 17: "UDP", 41: "IPv6",
                47: "GRE", 50: "ESP", 58: "ICMPv6", 89: "OSPF"
            }
            proto = proto_map.get(proto_num, f"IP_{proto_num}")
            
            # Get packet timestamp
            timestamp = datetime.fromtimestamp(float(pkt.time)) if hasattr(pkt, 'time') else datetime.now()
            
            # Base packet info
            result = {
                "timestamp": timestamp.isoformat(),
                "src": src,
                "dst": dst,
                "proto": proto,
                "src_port": 0,
                "dst_port": 0,
                "length": len(pkt),
            }
            
            # TCP specifics
            if pkt.haslayer(TCP):
                tcp = pkt[TCP]
                result["src_port"] = tcp.sport
                result["dst_port"] = tcp.dport
                result["tcp_flags"] = {
                    "syn": bool(tcp.flags.S),
                    "ack": bool(tcp.flags.A),
                    "fin": bool(tcp.flags.F),
                    "rst": bool(tcp.flags.R),
                    "psh": bool(tcp.flags.P),
                }
                result["tcp_seq"] = tcp.seq
                result["tcp_ack"] = tcp.ack
                
                # Extract payload
                if pkt.haslayer(Raw) and self.capture_payload:
                    raw_data = bytes(pkt[Raw])
                    if len(raw_data) > self.max_payload_bytes:
                        raw_data = raw_data[:self.max_payload_bytes]
                    
                    result["payload_base64"] = base64.b64encode(raw_data).decode('ascii')
                    
                    try:
                        text = raw_data.decode('utf-8', errors='ignore')
                        text = ''.join(c for c in text if c.isprintable() or c in '\n\r\t')
                        if text:
                            result["payload_text"] = text
                    except:
                        pass
            
            # UDP specifics
            elif pkt.haslayer(UDP):
                udp = pkt[UDP]
                result["src_port"] = udp.sport
                result["dst_port"] = udp.dport
                
                # DNS parsing
                if pkt.haslayer(DNS):
                    dns = pkt[DNS]
                    dns_data = {}
                    
                    if dns.qd:  # Query
                        dns_data["query_name"] = dns.qd.qname.decode('utf-8', errors='ignore').rstrip('.')
                        dns_data["query_type"] = dns.qd.qtype
                        dns_data["transaction_id"] = dns.id
                    
                    if dns.an:  # Answer
                        dns_data["response_code"] = dns.rcode
                        answers = []
                        for i in range(dns.ancount):
                            if dns.an[i].type == 1:  # A record
                                answers.append(dns.an[i].rdata)
                        if answers:
                            dns_data["answers"] = str(answers[0]) if len(answers) == 1 else str(answers)
                    
                    if dns_data:
                        result["dns"] = dns_data
                
                # Extract UDP payload
                if pkt.haslayer(Raw) and self.capture_payload and not pkt.haslayer(DNS):
                    raw_data = bytes(pkt[Raw])
                    if len(raw_data) > self.max_payload_bytes:
                        raw_data = raw_data[:self.max_payload_bytes]
                    
                    result["payload_base64"] = base64.b64encode(raw_data).decode('ascii')
                    
                    try:
                        text = raw_data.decode('utf-8', errors='ignore')
                        text = ''.join(c for c in text if c.isprintable() or c in '\n\r\t')
                        if text:
                            result["payload_text"] = text
                    except:
                        pass
            
            return result
            
        except Exception as e:
            logger.debug(f"Error parsing scapy packet: {e}")
            return None
            
    async def _mock_capture(self, queue: asyncio.Queue):
        """Generate simulated packet data for testing with realistic payloads and diverse IPs."""
        import random
        
        # Diverse internal hosts across multiple subnets
        internal_hosts = [
            # Workstations
            "192.168.1.10", "192.168.1.15", "192.168.1.22", "192.168.1.35", "192.168.1.47",
            # Servers
            "192.168.2.10", "192.168.2.15", "192.168.2.20", "192.168.2.25",
            # DMZ
            "10.0.0.50", "10.0.0.51", "10.0.0.52",
            # Admin/Management
            "172.16.5.100", "172.16.5.101",
            # IoT/Other
            "192.168.3.10", "192.168.3.20",
        ]
        
        # Diverse external hosts
        external_hosts = [
            # DNS Servers
            "8.8.8.8", "8.8.4.4", "1.1.1.1", "1.0.0.1",
            # Popular Services
            "93.184.216.34",  # Example.com
            "151.101.1.140",  # Reddit
            "142.250.72.46",  # Google
            "142.250.72.78",  # Google 2
            "104.244.42.65",  # Twitter
            "104.244.42.129", # Twitter CDN
            "13.107.42.14",   # Microsoft
            "52.84.23.112",   # AWS CloudFront
            "23.211.61.64",   # Akamai CDN
            "185.199.108.153", # GitHub
            # Suspicious/Unusual
            "45.76.139.42",   # Unknown
            "198.51.100.23",  # Test network
        ]
        
        # Simulated network scenarios with payloads
        normal_hosts = [
            (random.choice(internal_hosts), random.choice(external_hosts))
            for _ in range(10)
        ]
        
        # Anomaly hosts for suspicious activity
        anomaly_hosts = [
            ("192.168.1.15", "45.76.139.42"),  # C2 beacon
            ("192.168.1.22", "45.76.139.42"),  # Another C2 beacon
            ("192.168.1.10", "192.168.2.20"),  # Lateral movement
            ("10.0.0.50", "192.168.2.20"),     # DMZ to internal
            ("192.168.3.10", "8.8.8.8"),       # IoT DNS tunneling
            ("172.16.5.100", "52.84.23.112"),  # Data exfiltration
        ]
        
        # Sample payloads for different protocols
        http_requests = [
            "GET /index.html HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Mozilla/5.0\r\n\r\n",
            "POST /api/data HTTP/1.1\r\nHost: api.example.com\r\nContent-Type: application/json\r\n\r\n{\"key\":\"value\"}",
            "GET /images/logo.png HTTP/1.1\r\nHost: cdn.example.com\r\n\r\n",
        ]
        
        dns_queries = [
            "google.com",
            "facebook.com",
            "github.com",
            "stackoverflow.com",
        ]
        
        tls_servers = [
            "mail.google.com",
            "api.github.com",
            "secure.example.com",
        ]
        
        iteration = 0
        
        while True:
            try:
                # Normal HTTP traffic
                for _ in range(random.randint(2, 5)):
                    src, dst = random.choice(normal_hosts)
                    http_payload = random.choice(http_requests)
                    
                    packet = {
                        "timestamp": datetime.now().isoformat(),
                        "src": src,
                        "dst": dst,
                        "proto": "TCP",
                        "src_port": random.randint(49152, 65535),
                        "dst_port": 80,
                        "length": len(http_payload) + 60,
                        "tcp_flags": {"syn": False, "ack": True, "psh": True, "fin": False, "rst": False},
                        "payload_text": http_payload,
                        "payload_base64": base64.b64encode(http_payload.encode()).decode('ascii'),
                        "http": {
                            "method": "GET" if "GET" in http_payload else "POST",
                            "uri": "/index.html" if "index" in http_payload else "/api/data",
                            "host": "example.com",
                            "user_agent": "Mozilla/5.0",
                        }
                    }
                    
                    await queue.put(packet)
                    self.packet_count += 1
                    await asyncio.sleep(0.1)
                
                # Normal DNS traffic
                for _ in range(random.randint(3, 8)):
                    src, dst = normal_hosts[0], ("8.8.8.8", "8.8.8.8")
                    query = random.choice(dns_queries)
                    
                    packet = {
                        "timestamp": datetime.now().isoformat(),
                        "src": src[0],
                        "dst": dst[0],
                        "proto": "UDP",
                        "src_port": random.randint(49152, 65535),
                        "dst_port": 53,
                        "length": random.randint(64, 128),
                        "dns": {
                            "query_name": query,
                            "query_type": "A",
                            "transaction_id": f"0x{random.randint(0, 65535):04x}",
                        }
                    }
                    
                    await queue.put(packet)
                    self.packet_count += 1
                    await asyncio.sleep(0.05)
                
                # HTTPS/TLS traffic
                for _ in range(random.randint(2, 4)):
                    src, dst = random.choice(normal_hosts)
                    server_name = random.choice(tls_servers)
                    
                    packet = {
                        "timestamp": datetime.now().isoformat(),
                        "src": src,
                        "dst": dst,
                        "proto": "TCP",
                        "src_port": random.randint(49152, 65535),
                        "dst_port": 443,
                        "length": random.randint(200, 1500),
                        "tcp_flags": {"syn": False, "ack": True, "psh": True, "fin": False, "rst": False},
                        "tls": {
                            "version": "TLS 1.3",
                            "handshake_type": "Client Hello" if random.random() > 0.5 else "Server Hello",
                            "server_name": server_name,
                        }
                    }
                    
                    await queue.put(packet)
                    self.packet_count += 1
                    await asyncio.sleep(0.1)
                
                # Every 30 iterations, create various anomaly scenarios
                if iteration % 30 == 0 and iteration > 0:
                    logger.info("Generating anomaly spike with suspicious payloads...")
                    
                    # Scenario 1: DNS amplification/tunneling
                    anomaly_src, anomaly_dst = anomaly_hosts[4]  # IoT device
                    for _ in range(50):
                        suspicious_query = f"subdomain{random.randint(1, 1000)}.malicious-domain.com"
                        packet = {
                            "timestamp": datetime.now().isoformat(),
                            "src": anomaly_src,
                            "dst": anomaly_dst,
                            "proto": "UDP",
                            "src_port": random.randint(49152, 65535),
                            "dst_port": 53,
                            "length": random.randint(64, 128),
                            "dns": {
                                "query_name": suspicious_query,
                                "query_type": "ANY",
                                "transaction_id": f"0x{random.randint(0, 65535):04x}",
                            }
                        }
                        await queue.put(packet)
                        self.packet_count += 1
                        await asyncio.sleep(0.01)
                    
                    # Scenario 2: C2 beaconing from multiple hosts
                    for anomaly_src, anomaly_dst in anomaly_hosts[:2]:  # Two C2 connections
                        for _ in range(10):
                            packet = {
                                "timestamp": datetime.now().isoformat(),
                                "src": anomaly_src,
                                "dst": anomaly_dst,
                                "proto": "TCP",
                                "src_port": random.randint(49152, 65535),
                                "dst_port": 443,
                                "length": random.randint(200, 400),
                                "tcp_flags": {"syn": False, "ack": True, "psh": True, "fin": False, "rst": False},
                                "tls": {
                                    "version": "TLS 1.2",
                                    "server_name": "suspicious-c2-domain.com",
                                }
                            }
                            await queue.put(packet)
                            self.packet_count += 1
                            await asyncio.sleep(0.05)
                    
                    # Scenario 3: Lateral movement
                    anomaly_src, anomaly_dst = anomaly_hosts[2]  # Workstation to server
                    for _ in range(30):
                        packet = {
                            "timestamp": datetime.now().isoformat(),
                            "src": anomaly_src,
                            "dst": anomaly_dst,
                            "proto": "TCP",
                            "src_port": random.randint(49152, 65535),
                            "dst_port": random.choice([445, 3389, 22]),  # SMB, RDP, SSH
                            "length": random.randint(100, 300),
                            "tcp_flags": {"syn": True, "ack": False, "psh": False, "fin": False, "rst": False},
                        }
                        await queue.put(packet)
                        self.packet_count += 1
                        await asyncio.sleep(0.02)
                
                iteration += 1
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Mock capture error: {e}")
                await asyncio.sleep(1)
    
    async def stop(self):
        """Stop the packet capture process."""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            logger.info(f"Capture stopped. Total packets: {self.packet_count}")


async def download_sample_pcap(url: str, dest_path: str):
    """
    Download a sample PCAP file.
    
    Args:
        url: URL to download from
        dest_path: Destination file path
    """
    logger.info(f"Downloading sample PCAP from: {url}")
    
    try:
        urllib.request.urlretrieve(url, dest_path)
        logger.info(f" Downloaded to: {dest_path}")
        return True
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return False
