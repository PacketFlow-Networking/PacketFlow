# 🎯 Threat Indicators Quick Reference

## DNS Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| `DNS_LONG_QUERIES` | Average domain length > 40 chars | HIGH | Check for DNS tunneling/exfiltration |
| `DNS_HIGH_ENTROPY` | Domain entropy > 3.5 | HIGH | Possible DGA (Domain Generation Algorithm) |
| `DNS_SUSPICIOUS_TLD` | Known malicious TLDs (.tk, .ml, etc.) | MEDIUM | Review destination domains |

**Example:**
```
🟠 ANOMALY [HIGH]: Protocol anomaly: DNS_LONG_QUERIES, DNS_HIGH_ENTROPY
192.168.1.50 → 8.8.8.8 (DNS)
```

**What to do:**
1. Check the full DNS query names in event details
2. Look for unusually long or random-looking domains
3. Verify if the source host should be making DNS queries
4. Consider blocking the source if confirmed malicious

---

## HTTP Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| `HTTP_SUSPICIOUS_METHOD` | TRACE, CONNECT, DEBUG methods | HIGH | Potential web server probing |
| `HTTP_MULTIPLE_UA` | > 10 different user agents | MEDIUM | Possible bot or scraper |

**Example:**
```
🟠 ANOMALY [HIGH]: Protocol anomaly: HTTP_SUSPICIOUS_METHOD
192.168.1.100 → 10.0.0.50 (HTTP)
```

**What to do:**
1. Check which HTTP method was used (TRACE is dangerous)
2. Verify if the source IP should be accessing the web server
3. Review web server logs for other suspicious activity
4. Consider blocking or rate-limiting the source

---

## TLS Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| `TLS_OLD_VERSION` | TLS 1.0, 1.1, SSL 3.0, SSL 2.0 | MEDIUM | Potential downgrade attack or legacy client |

**Example:**
```
🟡 ANOMALY [MEDIUM]: Protocol anomaly: TLS_OLD_VERSION
192.168.1.75 → 93.184.216.34 (HTTPS)
```

**What to do:**
1. Identify the source application/device
2. Check if it's a legitimate legacy system
3. Plan upgrade or enforce minimum TLS 1.2
4. Monitor for actual downgrade attacks

---

## Port Scan Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| `PORT_SCAN_XX_PORTS` | XX unique ports in 5 minutes | HIGH | Active reconnaissance |

**Example:**
```
🟠 ANOMALY [HIGH]: Port scan: 35 ports in 300s
192.168.1.10 → multiple (TCP)
Threats: PORT_SCAN_35_PORTS
```

**What to do:**
1. Check if source IP is internal or external
2. Review which ports were targeted
3. Determine if it's a security scanner or attacker
4. Block source if unauthorized scanning
5. Alert security team immediately

---

## Payload Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| `SQL_INJECTION` | SQL keywords in payload | CRITICAL | Immediate investigation |
| `XSS_ATTEMPT` | JavaScript patterns in payload | HIGH | Web application attack |
| `COMMAND_INJECTION` | Shell command patterns | CRITICAL | System compromise attempt |
| `DIRECTORY_TRAVERSAL` | Path traversal patterns (../) | HIGH | File system access attempt |
| `HIGH_ENTROPY_DATA` | Base64 data with entropy > 0.9 | MEDIUM | Possible data exfiltration |

**Example:**
```
🔴 ANOMALY [CRITICAL]: Payload threats: SQL_INJECTION
192.168.1.100 → 10.0.0.50 (HTTP)
Threats: SQL_INJECTION
```

**What to do:**
1. **IMMEDIATE:** Check if attack was successful
2. Review application logs for errors/breaches
3. Identify vulnerable endpoint
4. Block source IP immediately
5. Patch vulnerable application
6. Alert security team
7. Check for data exfiltration

---

## Behavioral Threats

| Indicator | Description | Severity | Action |
|-----------|-------------|----------|--------|
| High Z-score | Statistical anomaly | Variable | Review traffic pattern |
| Low entropy | Uniform packet sizes | MEDIUM | Possible tunneling |
| Regular timing | Predictable intervals | MEDIUM | Automated/scripted activity |

**Example:**
```
🟡 ANOMALY [MEDIUM]: Behavioral anomaly detected
192.168.1.50 → 8.8.8.8 (UDP)
Methods: Behavioral, Z-Score
```

**What to do:**
1. Check behavioral_metrics in event details
2. Look for packet_size_entropy < 0.5 (tunneling)
3. Look for timing_entropy < 0.3 (beaconing)
4. Correlate with other anomalies from same source

---

## Threat Severity Levels

### 🔴 CRITICAL (Score ≥ 0.9)
- SQL Injection detected
- Command Injection detected
- Multiple high-severity indicators

**Action:** Immediate response required
1. Block source IP
2. Alert security team
3. Investigate impact
4. Preserve evidence

### 🟠 HIGH (Score ≥ 0.7)
- Port scanning
- DNS tunneling
- XSS attempts
- Directory traversal

**Action:** Rapid response needed
1. Investigate within 1 hour
2. Consider blocking source
3. Review related events
4. Document findings

### 🟡 MEDIUM (Score ≥ 0.5)
- Suspicious TLDs
- Old TLS versions
- Behavioral anomalies
- Multiple user agents

**Action:** Review within 4 hours
1. Investigate context
2. Determine legitimacy
3. Monitor for escalation
4. Document if malicious

### 🟢 LOW (Score ≥ 0.3)
- Minor statistical anomalies
- Single unusual packets
- Edge case detections

**Action:** Review during normal workflow
1. Log for reference
2. Look for patterns
3. Adjust thresholds if needed

---

## Common Threat Combinations

### Pattern 1: DNS Tunneling + Data Exfiltration
```
DNS_LONG_QUERIES + DNS_HIGH_ENTROPY + HIGH_ENTROPY_DATA
```
**Likely:** Data exfiltration via DNS  
**Action:** Block DNS to external servers, investigate source

### Pattern 2: Port Scan + Exploitation Attempt
```
PORT_SCAN_XX_PORTS → SQL_INJECTION or COMMAND_INJECTION
```
**Likely:** Active attack after reconnaissance  
**Action:** Block immediately, check for breach

### Pattern 3: Multiple Protocol Anomalies
```
HTTP_SUSPICIOUS_METHOD + TLS_OLD_VERSION + Behavioral
```
**Likely:** Sophisticated attack or misconfigured client  
**Action:** Deep investigation needed

### Pattern 4: Beaconing Pattern
```
Low timing_entropy + Regular packet sizes + Same destination
```
**Likely:** C2 beacon (Command & Control)  
**Action:** Isolate host, check for malware

---

## Investigation Workflow

### Step 1: Triage (< 5 minutes)
1. Check severity level
2. Review threat indicators
3. Identify source and destination
4. Determine if attack succeeded

### Step 2: Containment (< 15 minutes for CRITICAL)
1. Block source IP if malicious
2. Isolate affected systems
3. Preserve evidence (logs, PCAPs)
4. Alert security team

### Step 3: Investigation (< 1 hour for HIGH+)
1. Review full event details
2. Check protocol_stats and behavioral_metrics
3. Correlate with other events (check ai_correlated_events)
4. Examine payload samples
5. Query SIEM for related activity

### Step 4: Response
1. Patch vulnerable systems
2. Update firewall rules
3. Document incident
4. Update detection rules if needed

### Step 5: Monitoring
1. Watch for repeat attempts
2. Monitor from same source network
3. Check for lateral movement
4. Review detection effectiveness

---

## API Queries for Threat Hunting

### Get All Critical Threats
```bash
curl http://localhost:8000/events?min_severity=critical&limit=100
```

### Search for Specific Threat
```bash
# SQL Injection
curl "http://localhost:8000/search?threat=SQL_INJECTION"

# Port Scans
curl "http://localhost:8000/search?threat=PORT_SCAN"

# DNS Tunneling
curl "http://localhost:8000/search?threat=DNS_LONG_QUERIES"
```

### Get Detection Metrics
```bash
curl http://localhost:8000/status | jq '.detection_metrics'
```

### Get Events by Protocol
```bash
curl "http://localhost:8000/search?protocol=DNS&anomalies_only=true"
```

---

## False Positive Handling

### Common False Positives

**DNS_LONG_QUERIES:**
- Legitimate CDN domains can be long
- **Fix:** Whitelist known CDN patterns

**HTTP_MULTIPLE_UA:**
- Legitimate proxies may show multiple UAs
- **Fix:** Whitelist proxy IPs

**PORT_SCAN_XX_PORTS:**
- Security scanners (Nessus, Nmap)
- **Fix:** Whitelist scanner IPs, schedule scans

**TLS_OLD_VERSION:**
- Legacy devices (printers, cameras)
- **Fix:** Document exceptions, plan upgrades

### Adjusting Sensitivity

Too many false positives? Lower sensitivity:
```python
# In main.py
FlowCondenser(
    sensitivity="low",        # vs "medium" or "high"
    anomaly_threshold=3.5     # Higher = less sensitive
)
```

Too many missed threats? Increase sensitivity:
```python
FlowCondenser(
    sensitivity="high",
    anomaly_threshold=2.0
)
```

---

## Threat Intelligence Integration (Future)

Currently NOT implemented, but you could add:

1. **IP Reputation Checks**
   - Query AbuseIPDB, VirusTotal
   - Add `IP_REPUTATION_BAD` indicator

2. **Domain Blacklists**
   - Check against OpenPhish, URLhaus
   - Add `DOMAIN_BLACKLISTED` indicator

3. **CVE Signature Matching**
   - Match payloads to known exploits
   - Add `CVE_XXXX_XXXX` indicator

4. **Custom YARA Rules**
   - Scan payloads with YARA
   - Add `YARA_RULE_NAME` indicator

---

## Quick Reference Card

Print this for your SOC:

```
╔══════════════════════════════════════════════════════════════╗
║              THREAT INDICATOR QUICK REFERENCE                ║
╠══════════════════════════════════════════════════════════════╣
║ 🔴 CRITICAL: Block immediately, investigate urgently         ║
║    - SQL_INJECTION, COMMAND_INJECTION                        ║
║                                                              ║
║ 🟠 HIGH: Investigate within 1 hour, consider blocking        ║
║    - PORT_SCAN_XX_PORTS, DNS_LONG_QUERIES, XSS_ATTEMPT      ║
║                                                              ║
║ 🟡 MEDIUM: Review within 4 hours, monitor                    ║
║    - DNS_SUSPICIOUS_TLD, TLS_OLD_VERSION, HTTP_MULTIPLE_UA  ║
║                                                              ║
║ 🟢 LOW: Review during normal workflow                        ║
║    - Statistical anomalies, behavioral patterns             ║
╠══════════════════════════════════════════════════════════════╣
║ INCIDENT RESPONSE:                                           ║
║ 1. Triage (5 min)      2. Contain (15 min for CRITICAL)     ║
║ 3. Investigate (1 hr)  4. Respond  5. Monitor                ║
╚══════════════════════════════════════════════════════════════╝
```

---

**Last Updated:** 2025-10-16  
**Version:** Enhanced Detection System v1.0  
**Documentation:** See ENHANCEMENTS.md for full details
