#  Troubleshooting Guide for AINetUI

## Error: "Separator is not found, and chunk exceed the limit"

### Cause
This error occurs when TShark produces very large JSON objects (typically from packets with large payloads) that exceed Python's default asyncio buffer limit (64KB).

### Solutions Applied (v2)

####  Solution 1: Increased Buffer Size
**File:** `capture.py`

The buffer limit has been increased to 10MB:
```python
process = await asyncio.create_subprocess_exec(
    *cmd,
    stdout=asyncio.subprocess.PIPE,
    stderr=asyncio.subprocess.PIPE,
    limit=10 * 1024 * 1024  # 10MB buffer
)
```

This should handle most PCAP files, including those with:
- Large HTTP responses
- Base64-encoded payloads
- Fragmented packets
- TLS handshakes with many cipher suites

####  Alternative Solutions (if issue persists)

**Option A: Simplify TShark Output**

Modify the TShark command to exclude hex dumps:
```python
# In capture.py, _pcap_replay() method:
cmd = [
    "tshark",
    "-r", self.pcap_file,
    "-T", "ek",
    # REMOVE: "-x",  # This adds hex dumps and increases size
]
```

**Option B: Add Packet Size Filter**

Skip very large packets:
```python
# Add filter to TShark command:
cmd.extend(["-Y", "frame.len < 1500"])  # Standard MTU
```

**Option C: Use JSON Instead of EK**

Change format from EK (Elasticsearch) to regular JSON:
```python
cmd = [
    "tshark",
    "-r", self.pcap_file,
    "-T", "json",  # Instead of "ek"
]
```

---

## Error: "TShark not found"

### Cause
TShark (Wireshark's command-line tool) is not installed or not in PATH.

### Solution
1. Download and install Wireshark: https://www.wireshark.org/download.html
2. During installation, ensure "TShark" is selected
3. Verify installation:
   ```cmd
   tshark --version
   ```

4. If installed but not found, add to PATH:
   ```cmd
   set PATH=%PATH%;C:\Program Files\Wireshark
   ```

---

## Error: "PCAP file not found"

### Cause
The PCAP file path in `config.yaml` is incorrect or the file doesn't exist.

### Solution
1. Check file path in `config.yaml`:
   ```yaml
   capture:
     pcap_file: "../ultimate.pcapng"  # Relative to backend/
   ```

2. Verify file exists:
   ```cmd
   dir ..\ultimate.pcapng
   ```

3. Use absolute path if needed:
   ```yaml
   capture:
     pcap_file: "C:/Users/kkras/OneDrive/Documents/AINetUI/ultimate.pcapng"
   ```

---

## Error: "ValueError: I/O operation on closed pipe"

### Cause
This is a harmless Windows-specific warning that occurs during shutdown when asyncio tries to clean up pipes.

### Solution
This can be safely ignored. It doesn't affect functionality.

To suppress (optional):
```python
# Add to main.py at the top:
import warnings
warnings.filterwarnings("ignore", category=ResourceWarning)
```

---

## Backend Starts but Falls Back to Mock Mode

### Diagnostic Steps

1. **Check TShark Installation:**
   ```cmd
   tshark --version
   ```

2. **Test PCAP File Manually:**
   ```cmd
   tshark -r ultimate.pcapng -c 10
   ```

3. **Check File Permissions:**
   - Ensure you have read access to the PCAP file
   - Try running as Administrator if needed

4. **Enable Debug Logging:**
   
   In `config.yaml`:
   ```yaml
   server:
     log_level: "DEBUG"
   ```

5. **Check Logs for Specific Errors:**
   Look for lines containing:
   - `PCAP replay error:`
   - `Parse error:`
   - `TShark:`

---

## Performance Issues

### High CPU Usage

**Cause:** Processing large PCAP files at full speed

**Solution:** Reduce playback speed in `config.yaml`:
```yaml
capture:
  pcap_speed: 0.5  # Half speed
```

### High Memory Usage

**Cause:** Queue buildup or large payloads

**Solutions:**
1. Disable payload capture:
   ```yaml
   capture:
     capture_payload: false
   ```

2. Reduce queue sizes in `main.py`:
   ```python
   packet_queue = asyncio.Queue(maxsize=100)  # Was 1000
   ```

3. Skip large packets with filter:
   ```yaml
   capture:
     filter: "frame.len < 1500"
   ```

---

## WebSocket Connection Issues

### Frontend Can't Connect to ws://localhost:8000/ws/updates

**Diagnostic:**
```cmd
curl http://localhost:8000/status
```

**Solutions:**

1. **Check if Backend is Running:**
   ```cmd
   netstat -an | findstr 8000
   ```

2. **Firewall Blocking:**
   - Add exception for Python/TShark
   - Or temporarily disable firewall for testing

3. **Port Already in Use:**
   Change port in `config.yaml`:
   ```yaml
   server:
     port: 8001
   ```

---

## AI Agent Not Responding

### Cause
Remote AI endpoint not reachable or misconfigured.

### Diagnostic
```cmd
curl -X POST https://chatucy.cs.ucy.ac.cy/api/send_message -H "Content-Type: application/json" -d "{\"message\":\"test\"}"
```

### Solutions

1. **Check Network Connection:**
   - Verify you can reach the AI endpoint
   - Check proxy settings

2. **Switch to Local Mode:**
   
   In `config.yaml`:
   ```yaml
   ai:
     mode: "local"
     url: "http://localhost:11434"
   ```

3. **Disable AI Processing (Testing):**
   
   In `main.py`, comment out AI task:
   ```python
   # await task_manager.register("ai_agent", ...)
   ```

---

## Common Configuration Mistakes

### 1. Wrong Interface Number
```yaml
# WRONG (interface doesn't exist)
capture:
  interface: "999"

# RIGHT (check with: tshark -D)
capture:
  interface: "3"
```

### 2. Incorrect File Paths (Windows)
```yaml
# WRONG (single backslash)
capture:
  pcap_file: "..\ultimate.pcapng"

# RIGHT (forward slash or double backslash)
capture:
  pcap_file: "../ultimate.pcapng"
  # OR
  pcap_file: "..\\ultimate.pcapng"
```

### 3. YAML Indentation
```yaml
# WRONG (bad indentation)
capture:
mode: pcap
  interface: 5

# RIGHT
capture:
  mode: pcap
  interface: 5
```

---

## Quick Diagnostics Checklist

Run these commands to verify your setup:

```cmd
REM 1. Check Python version (should be 3.11+)
python --version

REM 2. Check TShark installation
tshark --version

REM 3. Verify PCAP file
dir ultimate.pcapng

REM 4. Test PCAP reading
tshark -r ultimate.pcapng -c 5

REM 5. Check network interfaces
tshark -D

REM 6. Verify config file
type backend\config.yaml

REM 7. Test backend startup (should start without errors)
cd backend
python main.py
```

---

## Still Having Issues?

1. **Enable Debug Logging:**
   Set `log_level: "DEBUG"` in config.yaml

2. **Save Full Log Output:**
   ```cmd
   python main.py > debug.log 2>&1
   ```

3. **Check These Files:**
   - `backend/config.yaml` - Configuration
   - `backend/capture.py` - Packet capture logic
   - `backend/main.py` - Application startup

4. **Look for Specific Error Messages:**
   - Search for "ERROR" in logs
   - Check for Python exceptions (lines with "Traceback")
   - Look for TShark errors

---

## Getting Help

When reporting issues, include:

1. **Python Version:** `python --version`
2. **TShark Version:** `tshark --version`
3. **Operating System:** Windows version
4. **Configuration:** Contents of `config.yaml`
5. **Full Error Log:** Complete output including timestamps
6. **What you tried:** Previous troubleshooting steps

---

## Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Buffer overflow |  Already fixed (10MB buffer) |
| TShark not found | Install Wireshark with TShark |
| PCAP file not found | Check path in config.yaml |
| Pipe warnings | Safe to ignore (Windows only) |
| High CPU | Reduce pcap_speed in config |
| Can't connect | Check firewall, verify port 8000 |
| AI not responding | Check network or use local mode |

---

*Last updated: 2025-10-16*
