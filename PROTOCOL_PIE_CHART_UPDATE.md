# Protocol Pie Chart Enhancement - Complete

## What Was Changed

### 1. Frontend: StatsDashboard.tsx
**Location**: `frontend/src/components/StatsDashboard.tsx`

#### New Features Added:
- **Two separate pie charts** instead of one:
  1. **Transport Layer Protocols** (left) - Shows TCP, UDP, ICMP distribution
  2. **Application Layer Protocols** (right) - Shows DNS, HTTP, HTTPS, IMAP, SMTP, etc.

#### New Function: `identifyApplicationProtocol`
Maps port numbers to their application protocols:
- DNS (port 53)
- HTTP (port 80)
- HTTPS (port 443)
- IMAP (port 143)
- IMAPS (port 993)
- SMTP (port 25, 587)
- POP3 (port 110)
- SSH (port 22)
- FTP (port 21)
- MySQL (port 3306)
- PostgreSQL (port 5432)
- MongoDB (port 27017)
- RDP (port 3389)
- And 20+ more protocols!

#### Visual Changes:
- Changed middle row from 2-column to **3-column layout**
- Added descriptive subtitles under each pie chart
- Only shows protocol labels for protocols with >5% share (to avoid clutter)
- Limited to **top 10 application protocols** for clarity
- Added **4 additional colors** to the color palette (now 10 colors total)

### 2. Backend: capture.py
**Location**: `backend/capture.py`

#### Bug Fix:
- **Increased buffer size** from 10MB to 50MB for TShark subprocess
- Fixes the "Separator is not found, and chunk exceed the limit" error
- Applies to both PCAP replay and live capture modes

## How It Works

1. **Port Detection**: The system reads `src_port` and `dst_port` from each packet
2. **Protocol Mapping**: Uses the lower port number (typically the service port) to identify the application protocol
3. **Dynamic Display**: Shows whatever protocols are actually present in your traffic
4. **Smart Labeling**: Only labels slices with >5% to keep the chart readable

## Testing

### To Test the New Feature:
1. Restart the backend: `python main.py`
2. Open the frontend in your browser
3. Navigate to the **Statistics** tab
4. You should see:
   - **Left pie chart**: Transport protocols (TCP, UDP, etc.)
   - **Middle pie chart**: Application protocols (DNS, HTTP, HTTPS, etc.)
   - **Right chart**: Anomaly rate over time

### Expected Behavior:
- If your PCAP has DNS traffic (port 53), you'll see "DNS" in the application pie chart
- If your PCAP has HTTP traffic (port 80), you'll see "HTTP"
- If your PCAP has HTTPS traffic (port 443), you'll see "HTTPS"
- And so on for all the supported protocols

## Files Modified

1. ✅ `frontend/src/components/StatsDashboard.tsx` - Added application protocol detection and second pie chart
2. ✅ `backend/capture.py` - Fixed buffer size issue

## Next Steps

If you want to add more protocols, simply edit the `portMap` object in `StatsDashboard.tsx`:

```typescript
const portMap: Record<number, string> = {
  // Add your custom ports here
  8888: 'CustomApp',
  9999: 'MyService',
  // ... etc
};
```

## Troubleshooting

### If you still see the buffer error:
- The buffer has been increased to 50MB, which should handle most PCAP files
- If the error persists, you can increase it further by editing line 111 and 205 in `capture.py`

### If the application protocols don't appear:
- Check that your PCAP file has port information
- Verify that `src_port` and `dst_port` are being captured
- Check the browser console for any errors

---

**Status**: ✅ Complete and ready to test!
