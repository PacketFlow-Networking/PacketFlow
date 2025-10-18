# What Does the Condenser Do? 🔄

## Overview
The **Flow Condenser** is the brain of AINetUI's anomaly detection system. It sits between the packet capture and the AI agent, transforming **raw packet streams** into **meaningful security events**.

---

## 🎯 Main Purpose

### Problem It Solves:
- Your network generates **thousands of packets per second**
- Sending all packets to the AI would be **too slow and overwhelming**
- You need to identify **patterns and anomalies** in the traffic

### Solution:
The condenser **aggregates packets into flows** and **detects anomalies** using statistical methods, then sends only the **important events** to the AI for explanation.

---

## 📊 What It Does (Step by Step)

### 1. **Flow Aggregation** 
Groups individual packets into "flows" based on the **5-tuple**:
- Source IP
- Destination IP
- Protocol (TCP, UDP, etc.)
- Source Port
- Destination Port

**Example**: Instead of 1000 individual packets, you get:
```
Flow: 192.168.1.10:49152 → 8.8.8.8:53 (DNS)
  - 1000 packets
  - 50KB total
  - Over 10 seconds
```

### 2. **Statistical Baseline Learning** (Warmup Phase)
- Observes traffic for **10 time windows** (default: 20 seconds total)
- Learns what's "normal" for each flow:
  - Average packet count
  - Standard deviation
  - Inter-quartile range (IQR)
  - Typical packet sizes
  - Normal timing patterns

**Example Baseline**:
```
Flow: 192.168.1.10 → google.com (HTTPS)
  Average: 50 packets/window
  StdDev: 10 packets
  Typical Size: 500 bytes
```

### 3. **Multi-Method Anomaly Detection** 
Once warmed up, uses **8 different detection methods**:

#### **Method 1: Z-Score Detection**
- Compares current traffic to historical average
- Triggers if traffic is 3+ standard deviations from normal
- **Use case**: Detects sudden spikes

#### **Method 2: IQR (Interquartile Range)**
- Uses median and quartiles instead of mean
- More robust against outliers
- **Use case**: Detects gradual increases

#### **Method 3: EWMA (Exponentially Weighted Moving Average)**
- Gives more weight to recent history
- Adapts quickly to changing patterns
- **Use case**: Detects sustained rate increases

#### **Method 4: Rate-Based Detection**
- Monitors packets per second
- Compares to historical rate
- **Use case**: Detects DoS/DDoS attacks

#### **Method 5: Behavioral Analysis**
- Analyzes packet size patterns
- Checks inter-arrival time consistency
- Calculates entropy (randomness)
- **Use case**: Detects automated/bot traffic

#### **Method 6: Port Scan Detection** ⭐
- Tracks unique destination ports per source
- Uses a **5-minute sliding window**
- Triggers if 20+ ports contacted
- **Use case**: Detects reconnaissance/scanning

#### **Method 7: Protocol-Specific Detection** ⭐ NEW!

**DNS Anomalies**:
- Long domain names (> 40 chars) → **DNS Tunneling**
- High entropy domains → **DGA (Domain Generation Algorithm)**
- Suspicious TLDs (.tk, .xyz, .top) → **Malware C2**

**HTTP Anomalies**:
- Suspicious methods (TRACE, CONNECT) → **Web Attack**
- Multiple user agents → **Bot Activity**

**TLS Anomalies**:
- Old versions (TLS 1.0, SSL 3.0) → **Weak Encryption**

#### **Method 8: Payload Threat Detection** ⭐ NEW!

Scans packet payloads for attack patterns:
- `union select`, `drop table` → **SQL Injection**
- `<script>`, `javascript:` → **XSS Attack**
- `; cat`, `| ls` → **Command Injection**
- `../` patterns → **Directory Traversal**
- High entropy data → **Data Exfiltration**

### 4. **Severity Scoring**
Calculates an **anomaly score** (0.0 - 1.0) and assigns severity:
- **0.9+** → CRITICAL 🔴
- **0.7-0.9** → HIGH 🟠
- **0.5-0.7** → MEDIUM 🟡
- **0.3-0.5** → LOW 🟢
- **< 0.3** → NORMAL

### 5. **Event Enrichment**
Creates rich event objects with:
- Flow statistics (packets, bytes, duration)
- Detection methods triggered
- Threat indicators (SQL_INJECTION, PORT_SCAN, etc.)
- Protocol-specific metadata (HTTP headers, DNS queries, TLS info)
- Sample payloads (if enabled)
- Baseline comparison data

### 6. **Memory Management** 🧹
Runs **periodic cleanup** every 5 minutes:
- Removes old port scan data (> 5 min old)
- Limits tracked hosts to 1000
- Clears low-count connection data
- **Prevents memory leaks** during long runs

---

## 🔄 Data Flow

```
┌─────────────┐
│   Packets   │  (1000s per second)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Flow Aggregator │  Groups by 5-tuple
└──────┬──────────┘
       │
       ▼
┌──────────────────┐
│ Baseline Learner │  (Warmup: 10 windows)
└──────┬───────────┘
       │
       ▼
┌────────────────────┐
│ 8-Method Detection │  Statistical + Behavioral + Protocol + Payload
└──────┬─────────────┘
       │
       ▼
┌─────────────────┐
│ Event Enrichment│  Add metadata, samples, scores
└──────┬──────────┘
       │
       ▼
┌─────────────┐
│  AI Agent   │  Natural language explanation
└─────────────┘
```

---

## 📈 Example Detection Scenario

### Normal Traffic:
```
Flow: 192.168.1.10 → 8.8.8.8:53 (DNS)
  Packets: 50
  Baseline: 48 ± 8
  Z-Score: 0.25
  Status: NORMAL ✅
```

### Anomalous Traffic:
```
Flow: 192.168.1.10 → 8.8.8.8:53 (DNS)
  Packets: 500
  Baseline: 48 ± 8
  Z-Score: 56.5 🚨
  
  Detection Methods: [Z-Score, EWMA, Protocol]
  Threat Indicators: [DNS_LONG_QUERIES, DNS_HIGH_ENTROPY]
  Severity: CRITICAL
  Score: 0.95
  
  Summary: "🔴 ANOMALY [CRITICAL]: Spike: 10.4x EWMA (500 vs 48) | 
           192.168.1.10 → 8.8.8.8 (DNS) | 
           Threats: DNS_LONG_QUERIES, DNS_HIGH_ENTROPY"
```

---

## ⚙️ Configuration

Located in: `backend/condense_enhanced.py`

### Key Parameters:
```python
window_size = 10          # Seconds per aggregation window
anomaly_threshold = 3.0   # Z-score threshold
warmup_windows = 10       # Baseline learning period
cleanup_interval = 300    # Memory cleanup (seconds)
port_scan_window = 300    # Port scan tracking window

sensitivity = "medium"    # low/medium/high
  - low:    z=3.5, iqr=3.0, rate=8x
  - medium: z=3.0, iqr=2.5, rate=5x
  - high:   z=2.5, iqr=2.0, rate=3x
```

---

## 🎓 Why This Matters

### Without Condenser:
- ❌ AI sees **1000s of packets** → slow & confused
- ❌ No context or patterns
- ❌ Can't tell normal from abnormal
- ❌ Memory overload

### With Condenser:
- ✅ AI sees **meaningful events** with context
- ✅ Anomalies pre-detected with statistical proof
- ✅ Protocol-aware threat indicators
- ✅ Efficient memory usage
- ✅ Fast response times

---

## 🔍 What Gets Sent to the AI?

**Instead of**: 
"I captured 10,000 TCP packets on port 443"

**The AI receives**:
```json
{
  "summary": "🔴 ANOMALY [CRITICAL]: Port scan: 45 ports in 300s",
  "src": "192.168.1.15",
  "dst": "192.168.2.20",
  "anomaly_score": 0.85,
  "detection_methods": ["PortScan", "Behavioral"],
  "threat_indicators": ["PORT_SCAN_45_PORTS"],
  "baseline_avg": 12,
  "current_count": 450,
  "z_score": 43.8
}
```

The AI can now say:
> "I'm detecting a critical port scanning activity from 192.168.1.15 targeting 
> internal server 192.168.2.20. The host contacted 45 different ports in 5 minutes, 
> which is 43.8 standard deviations above normal behavior (typically 12 packets per 
> window). This appears to be reconnaissance for lateral movement."

---

## 🎯 Real-World Detection Examples

### 1. **DNS Tunneling**
```
Detection: DNS_LONG_QUERIES + DNS_HIGH_ENTROPY
Evidence: Domain "ajksdhf827haskdjfh273.malicious.com" (47 chars, entropy: 4.2)
Action: Block host 192.168.1.10 from external DNS
```

### 2. **SQL Injection Attempt**
```
Detection: SQL_INJECTION in HTTP payload
Evidence: "admin' OR '1'='1" in POST data
Action: Alert security team, block source IP
```

### 3. **Lateral Movement**
```
Detection: PORT_SCAN + Behavioral anomaly
Evidence: Workstation scanning SMB (445), RDP (3389), SSH (22)
Action: Isolate compromised workstation
```

### 4. **Data Exfiltration**
```
Detection: HIGH_ENTROPY_DATA + Rate anomaly
Evidence: 50MB encrypted stream to unknown IP (5x normal)
Action: Investigate user activity, check for malware
```

---

## 💡 Summary

**The Condenser is your network's security analyst that:**
1. ✅ Reduces 1000s of packets → meaningful flow events
2. ✅ Learns normal behavior patterns
3. ✅ Detects 8 types of anomalies
4. ✅ Identifies specific threats (SQL injection, port scans, etc.)
5. ✅ Provides context for AI explanation
6. ✅ Manages memory efficiently
7. ✅ Runs in real-time with minimal latency

**Think of it as**: A smart filter that lets only the "interesting" stuff through to the AI, 
while giving the AI all the context it needs to explain what's happening! 🎯
