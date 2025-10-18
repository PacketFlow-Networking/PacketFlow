# NEW Architecture: Mock Data from Backend

## What Changed

All mock data generation has been moved from the frontend to the backend. This creates a cleaner separation of concerns.

## How It Works Now

###  Mock Mode OFF (Real Network Capture)

```
Your Network Traffic
    
Backend: TShark captures REAL packets
    
Backend: condense.py processes packets
    
Backend: Extracts REAL source/destination IPs
    
WebSocket: Sends events to frontend
    
Frontend: Displays in topology with actual IPs
```

###  Mock Mode ON (Simulated Data from Backend)

```
Backend: _mock_capture() generates simulated packets
    
    Uses diverse IP pools:
    - 17 internal IPs (192.168.x.x, 10.0.0.x, 172.16.x.x)
    - 16 external IPs (8.8.8.8, CDNs, cloud services, suspicious IPs)
    
Backend: condense.py processes mock packets
    
Backend: Creates realistic attack scenarios:
    - C2 beaconing from multiple hosts
    - DNS tunneling from IoT devices
    - Lateral movement patterns
    - Data exfiltration attempts
    
WebSocket: Sends events to frontend
    
Frontend: Displays in topology with diverse IPs
```

## Backend Configuration

### Enable Mock Mode

Edit `backend/.env`:

```bash
# Capture settings
CAPTURE_INTERFACE=eth0
CAPTURE_MOCK_MODE=true       # Set to true for mock data
```

Or use command line:

```bash
cd backend
CAPTURE_MOCK_MODE=true python main.py
```

### Mock Data Features

The backend now generates:

#### Internal Hosts (17 IPs)
- **Workstations**: 192.168.1.10, .15, .22, .35, .47
- **Servers**: 192.168.2.10, .15, .20, .25
- **DMZ**: 10.0.0.50, .51, .52
- **Admin**: 172.16.5.100, .101
- **IoT**: 192.168.3.10, .20

#### External Hosts (16 IPs)
- **DNS**: 8.8.8.8, 8.8.4.4, 1.1.1.1, 1.0.0.1
- **Services**: GitHub (185.199.108.153), Reddit (151.101.1.140), Google (142.250.72.46/78)
- **CDN**: AWS CloudFront (52.84.23.112), Akamai (23.211.61.64)
- **Suspicious**: 45.76.139.42, 198.51.100.23

#### Attack Scenarios (Every 30 seconds)
1. **DNS Tunneling**: IoT device  DNS with 50 suspicious queries
2. **C2 Beaconing**: 2 workstations  Same C2 server (45.76.139.42)
3. **Lateral Movement**: Workstation  Internal server on SMB/RDP/SSH ports

## Frontend Changes

### Removed
-  `utils/mockData.ts` - No longer generates data
-  Mock data generator in `App.tsx`
-  Frontend-side IP generation

### Modified
-  `useWebSocket.ts` - Always connects to backend (no mock mode bypass)
-  `App.tsx` - Removed frontend mock generator
-  `TopologyView.tsx` - Already displays individual IPs (no changes needed)

### Mock Mode Toggle
The "Mock Mode" button in the UI is now just a visual indicator. To actually toggle mock mode, you must:

1. **Stop the backend** (Ctrl+C)
2. **Edit `.env`** or set environment variable
3. **Restart the backend**

Alternatively, you can remove the mock mode button from the UI entirely since it's now a backend configuration.

## How to Use

### Production (Real Network Monitoring)

```bash
# Terminal 1: Start backend with real capture
cd backend
python main.py

# Terminal 2: Start frontend
cd frontend
npm run dev

# Open browser: http://localhost:5173
# Backend will capture real packets from your network
```

### Testing (Mock Data from Backend)

```bash
# Terminal 1: Start backend in mock mode
cd backend
CAPTURE_MOCK_MODE=true python main.py
# Or edit .env: CAPTURE_MOCK_MODE=true

# Terminal 2: Start frontend
cd frontend
npm run dev

# Open browser: http://localhost:5173
# Backend will generate diverse mock data with 33 unique IPs
```

## Benefits

###  Cleaner Architecture
- Frontend focuses on display
- Backend handles all data generation
- Clear separation of concerns

###  Consistent Data Format
- Mock data uses same structure as real data
- Goes through same processing pipeline
- More realistic testing

###  Better Mock Data
- 33 diverse IPs (vs 12 in old frontend mock)
- Realistic attack scenarios
- Proper packet structure with payloads

###  Easier Development
- No need to keep frontend/backend mock data in sync
- Single source of truth for data structure
- Backend can be developed independently

## File Changes Summary

### Backend
- `capture.py`: Enhanced `_mock_capture()` with 33 diverse IPs and attack scenarios

### Frontend
- `App.tsx`: Removed mock data generator
- `useWebSocket.ts`: Removed mock mode bypass, always connects
- `TopologyView.tsx`: No changes (already displays IPs correctly)

### Deprecated
- `frontend/src/utils/mockData.ts`: No longer used (can be deleted)
- `frontend/src/components/topology/TopologyDemo.tsx`: No longer needed (can be deleted)

## Migration Guide

If you have existing code using frontend mock mode:

1. **Remove mock mode toggle** from UI (optional)
2. **Configure backend** mock mode via `.env`
3. **Delete unused files**:
   ```bash
   cd frontend/src
   rm utils/mockData.ts
   rm components/topology/TopologyDemo.tsx
   ```

## Testing

### Test Real Capture
```bash
cd backend
python main.py
# Generate some network traffic (browse web, ping, etc.)
# Watch frontend topology fill with your actual IPs
```

### Test Mock Data
```bash
cd backend
CAPTURE_MOCK_MODE=true python main.py
# Watch frontend topology fill with diverse mock IPs
# Every 30 seconds, see attack scenarios appear
```

## Troubleshooting

### "No events appearing"
- Check backend is running: `http://localhost:8000/status`
- Check WebSocket connection in browser console
- Verify `.env` settings

### "Only seeing a few IPs"
- If in mock mode, backend should generate 33 unique IPs
- Check backend logs for "Generating anomaly spike"
- Wait 30 seconds for full range of IPs to appear

### "Frontend shows 'Disconnected'"
- Backend may not be running
- Check WebSocket URL: `ws://localhost:8000/ws/updates`
- Check firewall/network settings

## Summary

**Before**: Frontend generated mock data with 12 hardcoded IPs  
**After**: Backend generates mock data with 33 diverse IPs and attack scenarios

**Result**: Cleaner architecture, better mock data, more realistic testing!
