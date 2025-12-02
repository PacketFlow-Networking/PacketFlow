# Two-Tier AI Analysis Architecture - Visual Reference

## Chat Window vs Modal: What Users See

### Chat Window (AIExplanationPanel) - BRIEF DISPLAY
```

  AI Analysis                                               

                                                              
   CRITICAL: DNS tunneling detected from 192.168.1.50    
                                                              
                     
   CVSS:  7.5/10      Risk:  82/100                      
                          
   High Severity      High Impact                        
                     
                                                              
   QUICK ACTIONS:                                           
       Isolate source IP              [CRITICAL - < 15 min] 
      Review DNS queries              [HIGH - 1 hour]      
                                                              
   Details        [View Full Analysis] [Close]             
                                                              

```

### Modal Window (AIDetailsModal) - COMPREHENSIVE DISPLAY
```

  CRITICAL: DNS tunneling detected from 192.168.1.50    [CRITICAL] [X] 
    Oct 21, 2025 15:30:45                                                  

                                                                            
  EXECUTIVE SUMMARY                                                      
   
 Multi-stage DNS attack detected with C2 characteristics. Attack includes  
 anomalous DNS queries with 95% entropy indicating data exfiltration...   
                                                                            
  RISK ASSESSMENT                                                         
   
                                   
  CVSS: 7.5/10       Risk: 82/100                                     
  High Severity      High Impact                                      
                                   
                                                                            
  FORENSIC ANALYSIS                                                      
   
  What Happened                                                           
   192.168.1.50 sent 150 DNS queries to 8.8.8.8 within 5 seconds, each   
   with 200+ character domain names (avg 95% entropy)...                  
                                                                            
  Why Suspicious                                                          
   DNS queries are 3.2x larger than baseline. High entropy indicates      
   encoded data. Pattern matches known C2 DNS tunneling...                
                                                                            
  Detection Method                                                        
   Z-Score anomaly detection (6.8 deviation) + Protocol-specific payload 
   analysis (entropy threshold exceeded)...                               
                                                                            
  THREAT INDICATORS                                                      
   
  DNS_TUNNELING (92% confidence)                                         
  Long DNS queries indicate data exfiltration or C2 communication       
  Evidence: 150 queries, avg domain length 206 chars                    
   CWE-327 (Broken Crypto) CWE-521 (Weak Encryption)                 
   A02:2021 (Cryptographic Failures)                                  
   T1071.004 (DNS over TCP)                                           
                                                                         
  C2_COMMUNICATION (87% confidence)                                      
  Regular beaconing pattern detected with 45-second intervals           
  Evidence: 6 query bursts at predictable intervals                     
   CWE-269 (Improper Access Control) CWE-330 (Insufficient Entropy)  
   A04:2021 (Insecure Design)                                         
   T1071 (Application Layer Protocol) T1008 (Fallback Channels)       
                                                                            
  MITRE ATT&CK FRAMEWORK                                                 
   
 [Initial Access] [Execution] [Command & Control] [Exfiltration] [Impact] 
                                                                            
 Attack Pattern: Initial reconnaissance  Command & Control Channel       
 Suspect this is Stage 2 of multi-stage attack after initial access...   
                                                                            
  INCIDENT RESPONSE - RECOMMENDATIONS                                    
   
    Block source IP 192.168.1.50              [CRITICAL - immediate] 
     Details: Add firewall rule to drop traffic from source             
     Systems: firewall-01, firewall-02                                 
     Impact: PCI-DSS, SOC 2, HIPAA (if user data involved)             
                                                                        
   Isolate workstation from network          [CRITICAL - < 15 min] 
     Details: Move workstation to isolated VLAN for forensics         
     Systems: Switch-1-Port-24, Firewall rules                         
     Impact: PCI-DSS, HIPAA, GDPR                                      
                                                                        
   Analyze DNS query payload                  [HIGH - 1 hour]      
     Details: Extract and decode DNS payload for data types sent       
     Systems: dns-logs-archive, packet-capture-01                     
     Impact: SOC 2 (evidence collection)                              
                                                                            
  COMPLIANCE IMPLICATIONS                                                
   
 [PCI-DSS] [HIPAA] [GDPR] [SOC 2] [ISO 27001] [NIST CSF]                
                                                                            
  TECHNICAL FORENSIC DETAILS                                             
   
 Source IP:     192.168.1.50      Anomaly Score:    0.95                
 Dest IP:       8.8.8.8            Z-Score:         6.8                  
 Port:          53 (UDP)           Entropy:         7.2/8.0              
 Protocol:      DNS                Packet Size:     206 bytes (avg)      
 Flows:         150                Baseline:        12 queries/5min      
 Duration:      5 seconds          Detection:       Z-Score + Protocol   
                                                                            
  AFFECTED ASSETS                                                        
          
  IP              Type          Criticality   Department            
          
  192.168.1.50    Workstation   HIGH          Finance               
  8.8.8.8         External DNS  EXTERNAL      ISP                   
          
                                                                            
  SOC ANALYST SUPPORT                                                    
   
  INVESTIGATION CHECKLIST                                               
    Check for similar DNS patterns in past 24 hours                     
    Review process execution logs on 192.168.1.50                       
    Extract and analyze DNS payloads for data type signatures           
    Check for lateral movement to other systems                         
    Review previous DNS queries from this source (baseline comparison) 
    Correlate with endpoint security alerts                            
                                                                            
   POTENTIAL FALSE POSITIVE CAUSES                                       
    Legitimate DNS over HTTPS (DoH) client                              
    Corporate security scanning tool (e.g., Qualys, Tenable)            
    Authorized penetration testing / red team activity                  
    Experimental network monitoring tool                                
                                                                            
  CONFIDENCE METRICS                                                     
   
 Overall Confidence: 92%                                                 
                                                    
                                                                            
                                   [Close Analysis]                        

```

## What Data Flows to Each Tier

### Backend Response Structure
```python
{
    # ALWAYS PRESENT - Chat Window Shows These
    "text": "DNS tunneling detected from 192.168.1.50",  # 50-80 chars
    "ai_explanation": "Multiple high-entropy DNS queries indicate potential...",
    "threat_level": "critical",
    "cvss_score": 7.5,
    "risk_score": 82,
    "quick_recommendations": [
        {
            "action": "Isolate source IP",
            "priority": "critical",
            "timeframe": "immediate"
        },
        {
            "action": "Review DNS queries",
            "priority": "high",
            "timeframe": "1_hour"
        }
    ],
    
    # ONLY IN MODAL - Detailed Structured Analysis
    "structured_analysis": {
        "brief_summary": "DNS tunneling detected",
        "summary": "Multi-stage DNS attack with C2 characteristics...",
        "what_happened": "192.168.1.50 sent 150 DNS queries...",
        "why_suspicious": "DNS queries 3.2x larger than baseline...",
        "detection_method": "Z-Score anomaly detection (6.8 deviation)...",
        "threat_indicators": [
            {
                "type": "DNS_TUNNELING",
                "explanation": "Long DNS queries indicate data exfiltration...",
                "evidence": "150 queries, avg domain length 206 chars",
                "confidence": 0.92,
                "cwe_ids": ["327", "521"],
                "owasp_references": ["A02:2021"],
                "mitre_techniques": ["T1071.004"]
            },
            {
                "type": "C2_COMMUNICATION",
                # ... more threat indicators
            }
        ],
        "mitre_attack_stages": ["Initial Access", "Command & Control", "Exfiltration"],
        "attack_context": "Initial reconnaissance  Command & Control Channel...",
        "recommendations": [
            {
                "action": "Block source IP 192.168.1.50",
                "priority": "critical",
                "timeframe": "immediate",
                "details": "Add firewall rule to drop traffic from source",
                "affected_systems": ["firewall-01", "firewall-02"],
                "compliance_impact": ["PCI-DSS", "SOC 2", "HIPAA"]
            },
            # ... more recommendations with timeframes
        ],
        "affected_assets": [
            {
                "ip": "192.168.1.50",
                "type": "workstation",
                "criticality": "high",
                "department": "Finance"
            }
        ],
        "compliance_implications": ["PCI-DSS", "HIPAA", "GDPR", "SOC 2"],
        "technical_details": {
            "source_ip": "192.168.1.50",
            "dest_ip": "8.8.8.8",
            "anomaly_score": 0.95,
            "z_score": 6.8,
            "entropy": 7.2
        },
        "forensic_chain": {
            "timestamp": "2025-10-21T15:30:45.123Z",
            "source": "network_capture",
            "action": "anomaly_detected",
            "result": "escalated_to_ai_analysis"
        },
        "investigation_checklist": [
            "Check for similar DNS patterns in past 24 hours",
            "Review process execution logs on 192.168.1.50",
            # ... 5 more checklist items
        ],
        "false_positive_indicators": [
            "Legitimate DNS over HTTPS (DoH) client",
            "Corporate security scanning tool",
            "Authorized penetration testing / red team activity"
        ],
        "confidence": 0.92
    }
}
```

## User Journey

### Scenario: DNS Tunneling Detected

#### Step 1: Event Triggered
```
Network Anomaly Detected

Event Added to Chat Window (via WebSocket)
```

#### Step 2: Chat Window Displays Brief
```
 User sees in chat window:
   - Brief 1-liner: "DNS tunneling detected from 192.168.1.50"
   - Threat badge: CRITICAL (red)
   - Metrics: CVSS 7.5/10, Risk 82/100
   - Quick actions: 2 recommendations with timeframes
   - Link: "View Full Analysis"
   
  User can immediately assess: Is this critical? (YES)
    User can quickly see actions to take: (Block IP, Review queries)
    User can quickly decide: Do I need more details?
```

#### Step 3: User Clicks "View Full Analysis"
```
 Modal opens showing comprehensive analysis:
   - What happened (technical description)
   - Why suspicious (anomaly explanation)
   - Detection method (how we caught it)
   - Threat indicators (CWE-327, A02:2021, T1071.004)
   - MITRE ATT&CK stages (command and control pattern)
   - Full recommendations with affected systems & compliance impact
   - Investigation checklist (5-7 steps for analyst)
   - False positive indicators (to reduce analyst fatigue)
   - Affected assets with department & criticality
   - Forensic chain of custody
   
  User now has everything needed to:
    - Understand the full attack pattern
    - Know which systems are affected
    - See compliance implications
    - Have a structured investigation plan
    - Understand potential false positive causes
```

## Key Design Decisions

### Why Two Tiers?

1. **Chat Window = Action-Oriented**
   - User has 5-10 seconds per event
   - Need to know: Is it critical? What do I do?
   - Too much detail = ignored/missed in real-time

2. **Modal = Investigation-Complete**
   - User has time to investigate deeply
   - Need to know: Everything about this attack
   - Full compliance/forensic documentation
   - Can reference for incident reports

### Why Structured_Analysis?

- **Type Safety**: TypeScript knows all available fields
- **Backward Compatibility**: Legacy code still works with `text`, `ai_explanation`
- **Scalability**: New fields added without breaking UI
- **Validation**: Backend Instructor validates all fields before sending

### Why These Industries Standards?

- **CVSS v4.0**: Universal severity quantification (every security team uses it)
- **MITRE ATT&CK**: Attack pattern classification (SIEM/SOC standard)
- **CWE/OWASP**: Threat taxonomy (development team reference)
- **Compliance Frameworks**: Regulatory alignment (audit requirement)
- **Forensic Chain**: Legal admissibility (incident investigation)

## Real-World Usage Example

### Analyst Experience

```
15:30:45 - Alert pops up in chat
           " CRITICAL: DNS tunneling from 192.168.1.50"
           
            Quick look: "Hmm, 7.5 CVSS, 82 risk... likely real"
           
            Immediate action: "Block that IP now"
           
           Clicks: "View Full Analysis"
           
15:30:52 - Modal opens with full details
           
            Reads: "Multi-stage attack with C2 characteristics"
           
            Checks: Investigation checklist
               Check for similar patterns (doing now...)
               Review process logs
               Extract DNS payload
               Check lateral movement
           
            Sees: Affected asset is "Finance Dept - HIGH criticality"
           
            Sees: "Compliance Impact: PCI-DSS, HIPAA"
           
            Notes: "False positive indicator: Could be authorized pen test"
                    (Checks with pen test team - NOT authorized)
                    (Confirms this is real attack)
           
            Creates incident:
              Title: "DNS C2 Tunnel - Finance Workstation"
              CVSS: 7.5
              Assets: 192.168.1.50
              Timeline: [Investigation checklist steps]
              Compliance: PCI-DSS, HIPAA
```

---

**Remember**: Brief chat  Fast decisions, Full modal  Informed investigation
