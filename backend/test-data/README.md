# Test Data - PCAP Files

This directory contains network capture files (PCAP/PCAPNG) for testing the backend's packet capture and processing capabilities.

## Files

### `dns-remoteshell.pcap`
**Type:** PCAP (Wireshark capture format)  
**Scenario:** DNS Tunneling Attack Detection  
**Purpose:** Test DNS anomaly detection, protocol-specific analysis, and threat indicator identification

**Use Case:**
```bash
# Edit backend/.env
MOCK_MODE=false
PCAP_FILE=test-data/dns-remoteshell.pcap
PCAP_LOOP=true
PCAP_SPEED=1.0

# Run backend
python main.py
```

**Expected Output:**
- HIGH/CRITICAL severity events
- DNS_TUNNELING threat indicator detected
- High domain entropy alerts
- Suspicious DNS query patterns

---

### `ultimate.pcapng`
**Type:** PCAPNG (Wireshark capture format)  
**Size:** ~15 MB  
**Purpose:** Comprehensive network traffic for full system testing

**Use Case:**
```bash
# Edit backend/.env
MOCK_MODE=false
PCAP_FILE=test-data/ultimate.pcapng
PCAP_LOOP=true
PCAP_SPEED=2.0  # Speed up playback

# Run backend
python main.py
```

---

## Usage

### Replay with Backend

1. **Stop any running backend instance**

2. **Configure `.env` in backend root:**
```env
MOCK_MODE=false
PCAP_FILE=test-data/dns-remoteshell.pcap
PCAP_LOOP=true
PCAP_SPEED=1.0
```

3. **Start backend:**
```bash
cd backend
python main.py
```

4. **Frontend will display real network events** from the recorded capture

---

### Analyze with Command Line

```bash
# List packets in PCAP
tcpdump -r test-data/dns-remoteshell.pcap -n | head -20

# Count packets by protocol
tcpdump -r test-data/dns-remoteshell.pcap -n | awk '{print $NF}' | sort | uniq -c

# Export specific protocol
tcpdump -r test-data/dns-remoteshell.pcap -w filtered.pcap 'tcp port 443'

# View DNS queries
tcpdump -r test-data/dns-remoteshell.pcap -n 'udp port 53'
```

---

## Adding New Test Data

To add more PCAP files for testing:

1. **Record network traffic:**
```bash
# Live capture (requires admin/sudo)
sudo tshark -w test-data/my-capture.pcap

# Or use tcpdump
sudo tcpdump -i en0 -w test-data/my-capture.pcap
```

2. **Or download public datasets:**
```bash
# Use the download utility
python utils/download_pcaps.py
```

3. **Add file to this directory**

4. **Update this README with description**

---

## Test Scenarios

### Scenario 1: DNS Tunneling Detection
**File:** `dns-remoteshell.pcap`  
**Tests:** DNS anomaly detection, protocol analysis, threat indicators  
**Expected Alerts:** HIGH/CRITICAL severity, DNS_TUNNELING indicator

### Scenario 2: General Network Traffic
**File:** `ultimate.pcapng`  
**Tests:** Flow aggregation, multi-protocol handling, statistical analysis  
**Expected:** Mixed severity alerts based on traffic patterns

---

## Tips

- **Speed up playback** - Increase `PCAP_SPEED` to skip through long captures
- **Loop files** - Set `PCAP_LOOP=true` to replay multiple times for stress testing
- **Multiple backends** - Run different PCAP files in separate backend instances
- **Analyze results** - Use `/api/events` endpoint to query detected events
- **Export data** - Use database exports for post-analysis

---

## See Also

- Backend configuration: `backend/.env`
- Capture module: `backend/core/capture/capture.py`
- Utilities: `backend/utils/diagnose_pcap.py`
- Testing: `backend/tests/`
