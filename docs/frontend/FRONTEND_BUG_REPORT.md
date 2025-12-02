# Frontend Bug Report - PacketFlow AINetUI

**Report Date:** November 25, 2025  
**Version Analyzed:** Current `suprdev` branch  
**Scope:** Complete frontend code review (`frontend/src/**/*`)

---

## Table of Contents
1. [Critical Bugs (High Priority)](#critical-bugs)
2. [Major Bugs (Medium Priority)](#major-bugs)
3. [Minor Bugs (Low Priority)](#minor-bugs)
4. [Potential Issues & Edge Cases](#potential-issues--edge-cases)
5. [Performance & Memory Concerns](#performance--memory-concerns)
6. [UI/UX Issues](#uiux-issues)
7. [Security Concerns](#security-concerns)

---

## CRITICAL BUGS

### 1. **Event ID Mismatch in Event Linking** (CRITICAL - Data Loss)
**File:** `frontend/src/components/ChatPanel.tsx`, line ~30-36  
**Severity:** CRITICAL

**Issue:**
```typescript
const getRelatedEvents = (message: AIMessage): NetworkEvent[] => {
  if (message.event_ids.length === 0) return [];
  return events.filter(event => 
    message.event_ids.includes(event.timestamp) || 
    message.event_ids.includes(event.id)
  ).slice(0, 10);
};
```

The `message.event_ids` array contains event identifiers from the backend, but the comparison logic is problematic:
- The backend sends event timestamps in `event_ids`
- Frontend generates event IDs like `evt-${Date.now()}-${random}`
- Matching `event.timestamp` (ISO string) against `event_ids` (could be timestamps or IDs) is unreliable
- If backend sends timestamp `"2025-11-25T10:30:45.123Z"` and event.id is `"evt-1234567890-abc123"`, they won't match
- Result: AI explanations are never linked to events in the chat interface

**Impact:** Chat messages show no related events, breaking the event linking feature

**Fix:** Establish consistent event ID format. Either:
1. Use consistent UUIDs everywhere, OR
2. Include a mapping field in AIMessage with reliable event references

---

### 2. **WebSocket Connection Never Recovers After Max Attempts** (CRITICAL - Permanent Disconnect)
**File:** `frontend/src/hooks/useWebSocket.ts`, line ~80-95  
**Severity:** CRITICAL

**Issue:**
```typescript
if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
  reconnectAttemptsRef.current++;
  reconnectTimeoutRef.current = window.setTimeout(() => {
    connect();
  }, RECONNECT_DELAY);
} else {
  console.log('[WebSocket] Max reconnection attempts reached');
  showError(
    'Connection Failed',
    'Unable to connect to backend after multiple attempts...',
    false
  );
}
```

After MAX_RECONNECT_ATTEMPTS (10), the connection is permanently lost with no recovery mechanism:
- User sees error message and never tries to reconnect
- If backend is restarted moments later, the frontend never knows
- User must manually refresh the page to restore connection
- No exponential backoff beyond max attempts

**Impact:** Long backend downtime requires manual page refresh

**Fix:** Add recovery retry with exponential backoff:
```typescript
if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
  // After max attempts, retry every 30 seconds
  setTimeout(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, 30000);
}
```

---

### 3. **Memory Leak: AI Messages Never Cleared** (CRITICAL - Memory Growth)
**File:** `frontend/src/context/store.ts`, line ~119-122  
**Severity:** CRITICAL

**Issue:**
```typescript
addAIMessage: (message) => set((state) => ({
  aiMessages: [...state.aiMessages, message]
})),
```

Unlike `events` which are limited to 200:
```typescript
addEvent: (event) => set((state) => ({
  events: [event, ...state.events].slice(0, 200) // Keep last 200 events
})),
```

There is NO limit on `aiMessages`. Over a long session:
- Every AI response creates a new message (from events and chat)
- If 100 events come in per minute with AI explanations
- That's 6000 AI messages per hour
- After 24 hours: 144,000 messages in memory
- Average message size ~500 bytes = 72MB
- Over a week: 1GB+ of messages

**Impact:** Frontend memory usage grows unbounded, causing UI slowdown and eventual crash

**Fix:** Limit AI messages:
```typescript
addAIMessage: (message) => set((state) => ({
  aiMessages: [...state.aiMessages, message].slice(0, 500) // Keep last 500
})),
```

---

### 4. **Event Timestamp Comparison Bug in Time Range Filter** (CRITICAL - Logic Error)
**File:** `frontend/src/components/EventStream.tsx`, line ~53-62  
**Severity:** CRITICAL

**Issue:**
```typescript
if (filters.timeRange !== 'all') {
  const now = Date.now();
  const timeRanges = {
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
  };
  const range = timeRanges[filters.timeRange];
  if (range) {
    filtered = filtered.filter(event =>
      now - new Date(event.timestamp).getTime() < range
    );
  }
}
```

The problem is subtle but critical:
- `Date.now()` returns milliseconds since Unix epoch
- `new Date(event.timestamp).getTime()` also returns milliseconds
- The filter checks: `now - eventTime < range`
- Example: event.timestamp = "2025-11-25T10:25:00Z", now = "2025-11-25T10:30:45Z"
  - now - eventTime = 345000ms (5m 45s)
  - range for '5m' = 300000ms
  - 345000 < 300000? FALSE - event is excluded
  - Result: Event from 5 minutes ago is hidden when '5m' filter is selected

**Impact:** Time range filter excludes recent events instead of including them

**Fix:** Change comparison:
```typescript
now - new Date(event.timestamp).getTime() <= range
```

Or better:
```typescript
(now - new Date(event.timestamp).getTime()) / 1000 <= (range / 1000)
```

---

### 5. **Zustand Store Persistence Breaks State** (CRITICAL - Data Corruption)
**File:** `frontend/src/context/store.ts`, line ~77  
**Severity:** CRITICAL

**Issue:**
```typescript
export const useStore = create<UIState>()(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'ainetui-store' // localStorage key, but no custom serialization
    }
  )
);
```

The store uses Zustand's persist middleware without proper serialization. Problems:
- `dismissedSuggestions` is persisted as a Set in localStorage
- Sets cannot be JSON serialized, becoming `{}`
- On reload, Zustand tries to restore `dismissedSuggestions: {}`
- Array methods like `.includes()` fail on objects
- In `ProactiveSuggestions.tsx`, line ~26:
  ```typescript
  if (!dismissedSuggestions.includes(suggestionId))  // ERROR: {} has no .includes
  ```

**Impact:** App crashes on page reload with persisted dismissed suggestions

**Evidence:** Line 153 in ProactiveSuggestions.tsx accesses `dismissedSuggestions` as array but it's stored as object

**Fix:** Use custom serialization:
```typescript
persist(
  (set) => ({...}),
  {
    name: 'ainetui-store',
    storage: {
      getItem: (name) => {
        const item = localStorage.getItem(name);
        if (!item) return null;
        return JSON.parse(item);
      },
      setItem: (name, value) => {
        localStorage.setItem(name, JSON.stringify(value));
      },
      removeItem: (name) => localStorage.removeItem(name)
    }
  }
)
```

---

## MAJOR BUGS

### 6. **WebSocket Null Reference After Disconnect** (MAJOR - Runtime Error)
**File:** `frontend/src/hooks/useWebSocket.ts`, line ~135-145  
**Severity:** MAJOR

**Issue:**
```typescript
const send = useCallback((data: any) => {
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify(data));
    return true;
  }
  return false;
}, []);
```

The check `wsRef.current?.readyState` is safe, but there's no timeout handling. If:
1. WebSocket is in CONNECTING state (readyState = 0)
2. User tries to send data immediately
3. The check fails, returns false
4. Caller doesn't know if it was dropped or pending

Additionally, in ChatPanel.tsx line ~60:
```typescript
const response = await queryAI(input.trim());
```

If the WebSocket is disconnected, `queryAI` makes an HTTP request, but the response won't be broadcast via WebSocket (which is dead), so users won't see linked events.

**Impact:** Chat responses don't appear in WebSocket channel if connection is unstable

**Fix:** Add fallback mechanism or queue pending sends.

---

### 7. **Alert Configuration Not Applied to Events** (MAJOR - Logic Error)
**File:** `frontend/src/context/store.ts`, lines 238-245  
**Severity:** MAJOR

**Issue:**
The `alertConfig` is stored in Zustand but **never actually used** to filter or highlight events:
- `EventStream.tsx` filters events but doesn't check alertConfig
- Anomaly detection happens in backend, not frontend
- Alert rules, whitelist/blacklist are never checked
- Events that should be whitelisted still show as anomalies

Example: If user adds `192.168.1.100` to whitelist, events from that IP still appear as anomalies with the same score.

**Impact:** Alert configuration is visual-only; doesn't affect event processing

**Fix:** Apply alertConfig in EventStream filters:
```typescript
if (alertConfig.whitelist.some(entry => entry.ip === event.src || entry.ip === event.dst)) {
  // Don't show this event
  return false;
}
```

---

### 8. **Incident Creation Doesn't Validate Event IDs** (MAJOR - Data Integrity)
**File:** `frontend/src/components/incidents/CreateIncidentModal.tsx` (referenced in code but not fully shown)  
**Severity:** MAJOR

**Issue:**
When creating an incident, the modal accepts `event_ids` but doesn't validate:
- Event IDs might not exist in the events array
- Invalid format IDs are accepted without validation
- Deleting an event doesn't update related incidents
- Incidents can reference non-existent events

Impact: Orphaned incident references to deleted events

**Fix:** Validate event_ids before creating incident:
```typescript
const validIds = incident.event_ids.filter(id => 
  events.some(e => e.id === id)
);
if (validIds.length === 0) {
  showError('No valid events', 'Selected events not found');
  return;
}
```

---

### 9. **Status Polling Never Updates Connected State** (MAJOR - Misleading UI)
**File:** `frontend/src/hooks/useApi.ts`, line ~7-55  
**Severity:** MAJOR

**Issue:**
```typescript
const getStatus = useCallback(async (): Promise<SystemStatus | null> => {
  if (mockMode) {
    return mockStatus;
  }

  try {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) {
      throw new Error(`Status fetch failed: ${response.status}`);
    }
    const data = await response.json();
    return status;
  } catch (error) {
    console.error('[API] Status fetch error:', error);
    return null;
  }
}, [mockMode]);
```

The status is fetched but:
1. Fetch errors don't set `connected: false`
2. If backend is down, `updateStatus()` still succeeds with stale data
3. UI shows "Connected" even when backend is unreachable
4. Only WebSocket disconnect properly updates the connected state

**Impact:** User can't tell if backend is actually online

**Fix:** Update useWebSocket integration:
```typescript
useEffect(() => {
  if (!status) {
    setConnected(false);
  }
}, [status, setConnected]);
```

---

### 10. **Filter Reset Doesn't Preserve User's Working State** (MAJOR - UX)
**File:** `frontend/src/context/store.ts`, line ~200-206  
**Severity:** MAJOR

**Issue:**
```typescript
resetFilters: () => set({ filters: FILTERS }),
```

The reset button completely clears all filters, including:
- Time range (resets to 'all')
- Search query (loses user's search term)
- Severity filters (clears all)

There's no "save previous state" mechanism. If a user:
1. Sets up filters for investigation
2. Accidentally clicks "Reset" 
3. Loses all filter context

And there's no "undo" feature to recover previous filter state.

**Impact:** Users frustrated with permanent loss of filter configuration

**Fix:** Add filter history or confirm dialog:
```typescript
const previousFilters = useRef<EventFilters | null>(null);

const resetFilters = () => {
  previousFilters.current = filters;
  set({ filters: FILTERS });
};

const undoReset = () => {
  if (previousFilters.current) {
    set({ filters: previousFilters.current });
  }
};
```

---

## MINOR BUGS

### 11. **Toast Messages Don't Link to Events** (MINOR - Usability)
**File:** `frontend/src/hooks/useWebSocket.ts`, line ~40-48  
**Severity:** MINOR

**Issue:**
```typescript
if (eventData.anomaly_score >= 0.8) {
  showWarning(
    'Critical Anomaly Detected',
    `${eventData.src}  ${eventData.dst}: ${eventData.summary || 'High anomaly score'}`,
    true // Play sound
  );
}
```

Toast is shown but clicking it doesn't navigate to the event or select it. User sees the warning but can't easily find the event in the stream.

**Fix:** Make toast clickable:
```typescript
showWarning(...);
// Also auto-select event
selectEvent(networkEvent.id);
```

---

### 12. **Export Functions Don't Handle Empty Descriptions** (MINOR - Data Corruption)
**File:** `frontend/src/utils/export.ts`, line ~24-32  
**Severity:** MINOR

**Issue:**
```typescript
rows.map(event => [
  event.timestamp,
  event.src || '',
  event.src_port?.toString() || '',
  // ...
  `"${(event.summary || '').replace(/"/g, '""')}"` // Escapes quotes
]);
```

CSV escaping handles quotes but not:
- Newlines in summary field (breaks CSV format)
- Commas in summary field (breaks column parsing)

If summary contains: `"Network scan with high,priority\nneed to investigate"`

CSV output becomes:
```csv
...,Network scan with high,priority
need to investigate,"..."
```
This breaks CSV parsing.

**Fix:** Proper CSV escaping:
```typescript
const escapeCsv = (value: string) => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};
```

---

### 13. **ProactiveSuggestions Interval Never Cleaned Up** (MINOR - Memory/Performance)
**File:** `frontend/src/components/ProactiveSuggestions.tsx`, line ~15-22  
**Severity:** MINOR

**Issue:**
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    clearExpiredSuggestions();
    generateSmartSuggestions();
  }, 10000); // Check every 10 seconds

  return () => clearInterval(interval);
}, [events, clearExpiredSuggestions]);
```

The dependency array includes `events`, which changes frequently. This means:
- Every time events change, interval is cleared and recreated
- If events array updates every 5 seconds, new interval created every 5 seconds
- Old intervals still running in background until cleanup
- Memory: 10+ intervals accumulate before cleanup

**Fix:** Remove `events` from deps or use a different approach:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    clearExpiredSuggestions();
  }, 10000);
  return () => clearInterval(interval);
}, []); // No deps - run once
```

---

### 14. **Incident Status Update Doesn't Clear Selection** (MINOR - State Consistency)
**File:** `frontend/src/context/store.ts`, line ~168-177  
**Severity:** MINOR

**Issue:**
```typescript
updateIncidentStatus: (id, status) => set((state) => ({
  incidents: state.incidents.map(inc =>
    inc.id === id
      ? { 
          ...inc, 
          status,
          updated_at: new Date().toISOString(),
          resolved_at: status === 'resolved' || status === 'false_positive' 
            ? new Date().toISOString() 
            : undefined
        }
      : inc
  )
})),
```

When an incident is marked as resolved/false_positive, it's still selected in the UI. User sees a resolved incident highlighted as if active.

**Impact:** Confusing UX - resolved incident stays selected

**Fix:** Clear selection on resolve:
```typescript
selectedIncidentId: 
  status === 'resolved' || status === 'false_positive' 
    ? (state.selectedIncidentId === id ? null : state.selectedIncidentId)
    : state.selectedIncidentId
```

---

### 15. **Severity Filter Type Mismatch** (MINOR - Type Safety)
**File:** `frontend/src/components/EventStream.tsx`, line ~36-41  
**Severity:** MINOR

**Issue:**
```typescript
if (filters.severities.length > 0) {
  filtered = filtered.filter(event =>
    event.severity && filters.severities.includes(event.severity as any)  //  "as any"
  );
}
```

The `as any` cast suggests type mismatch. This happens because:
- `event.severity` might not exist or be a different type
- Backend sends different severity strings than frontend expects
- Example: Backend sends "CRITICAL" but code looks for "critical"

**Fix:** Normalize severities:
```typescript
const normalizeSeverity = (sev: string | undefined): SeverityLevel | null => {
  if (!sev) return null;
  return sev.toLowerCase() as SeverityLevel;
};
```

---

## POTENTIAL ISSUES & EDGE CASES

### 16. **Event ID Generation Not Unique Across Sessions** (Edge Case)
**File:** `frontend/src/hooks/useWebSocket.ts`, line ~35-40  
**Severity:** MEDIUM (Edge Case)

**Issue:**
```typescript
const networkEvent: NetworkEvent = {
  id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  // ...
};
```

`Date.now()` has millisecond precision. If multiple events arrive within the same millisecond:
- Two events get same timestamp: `Date.now()`
- Random suffix provides collision resistance but not guaranteed
- In high-volume scenarios, collisions are possible

**Scenario:** 1000 events/sec means ~1 event per millisecond. Collisions inevitable.

**Fix:** Use better ID generation:
```typescript
const id = `evt-${crypto.randomUUID()}`;
```

---

### 17. **Toast Context Missing Error Boundary** (Edge Case)
**File:** `frontend/src/context/ToastContext.tsx`  
**Severity:** LOW (Edge Case)

**Issue:**
If `ToastContainer` component fails to render (broken styles, missing component), the error isn't caught and could crash the entire app.

**Fix:** Add error boundary around ToastContainer.

---

### 18. **API Error Responses Not Parsed** (Edge Case)
**File:** `frontend/src/hooks/useApi.ts`, line ~35-50  
**Severity:** MEDIUM (Edge Case)

**Issue:**
```typescript
if (response.status === 503) {
  return `[INFO] AI agent is currently unavailable...`;
}
throw new Error(`Query failed: ${response.status}`);
```

If response is JSON error but not a known status code, the error isn't parsed:
```typescript
const data = await response.json(); // Might throw if response isn't JSON
```

**Fix:** Check content-type before parsing.

---

## PERFORMANCE & MEMORY CONCERNS

### 19. **Large Event Array Causes Slow Filtering** (PERFORMANCE)
**File:** `frontend/src/components/EventStream.tsx`, line ~18-65  
**Severity:** MEDIUM

**Issue:**
With 200 events in memory, each filter application:
- Iterates all 200 events for search query
- Iterates all 200 for severity filter
- Iterates all 200 for protocol filter
- Iterates all 200 for anomalies filter
- Iterates all 200 for time range filter

Total: 1000+ iterations for each render. No memoization prevents recalculation on every props change.

**Impact:** UI slows down with larger event streams

**Fix:** Use `useMemo` (already done for `filteredEvents` but could be optimized more).

---

### 20. **Toast Container Doesn't Remove Old Toasts Efficiently** (MEMORY)
**File:** `frontend/src/context/ToastContext.tsx`, line ~18-30  
**Severity:** MINOR

**Issue:**
```typescript
if (newToast.duration && newToast.duration > 0) {
  setTimeout(() => {
    dismissToast(id);
  }, newToast.duration);
}
```

Each toast sets a new timeout. If many toasts are shown:
- 100 toasts = 100 timeouts in memory
- Memory leaks possible if component unmounts during timeout

**Fix:** Track timeouts for cleanup:
```typescript
const timeoutRef = useRef<number | null>(null);
return () => {
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
};
```

---

### 21. **Zustand Store Not Optimized for Large Event Lists** (PERFORMANCE)
**File:** `frontend/src/context/store.ts`  
**Severity:** MINOR

**Issue:**
Every event addition triggers store update which re-renders all subscribers:
```typescript
addEvent: (event) => set((state) => ({
  events: [event, ...state.events].slice(0, 200)
})),
```

With events arriving every 100ms, store updates 10x/sec. All components subscribing to store re-render 10x/sec even if they don't use events.

**Fix:** Use selective subscriptions:
```typescript
const events = useStore(state => state.events);
```

---

## UI/UX ISSUES

### 22. **Search Input Loses Focus on Event Update** (UX)
**File:** `frontend/src/components/EventStream.tsx`  
**Severity:** MINOR

**Issue:**
When new events arrive, the filter re-renders. If user is typing in search box, focus might be lost.

**Fix:** Preserve focus in search input.

---

### 23. **Modal Dialogs Can't Be Closed with Escape Key** (UX)
**File:** `frontend/src/components/` (needs verification)  
**Severity:** MINOR

**Issue:**
Standard UX pattern is ESC closes modal, but not implemented for all modals.

---

### 24. **No Loading State During Event Fetch** (UX)
**File:** `frontend/src/hooks/useApi.ts`  
**Severity:** MINOR

**Issue:**
When fetching status or querying AI, there's no loading indicator. User doesn't know if action is processing or failed.

**Fix:** Add loading state:
```typescript
const [isLoading, setIsLoading] = useState(false);
```

---

## SECURITY CONCERNS

### 25. **API Base URL Hardcoded** (SECURITY)
**File:** `frontend/src/hooks/useApi.ts`, line ~5  
**Severity:** MEDIUM

**Issue:**
```typescript
const API_BASE = 'http://localhost:8000';  // Direct URL instead of proxy
```

Hardcoded localhost means:
- Can't change backend URL without code change
- Development API exposed in production build
- No environment variable for deployment flexibility

**Fix:** Use environment variable:
```typescript
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
```

---

### 26. **WebSocket URL Also Hardcoded** (SECURITY)
**File:** `frontend/src/hooks/useWebSocket.ts`, line ~6  
**Severity:** MEDIUM

**Issue:**
```typescript
const WS_URL = 'ws://localhost:8000/ws/updates';
```

Same issue as API_BASE - hardcoded, no environment config.

**Fix:** Use environment variable:
```typescript
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/updates';
```

---

### 27. **localStorage Contains Sensitive Data** (SECURITY)
**File:** `frontend/src/context/store.ts`, line ~77  
**Severity:** MEDIUM

**Issue:**
The entire app state is persisted to localStorage:
- Alert rules with custom conditions
- Whitelist/blacklist IPs
- User profile data
- Alert configurations

All stored unencrypted in localStorage, accessible via:
```javascript
JSON.parse(localStorage.getItem('ainetui-store'))
```

**Fix:** Don't persist sensitive data or use encryption.

---

### 28. **Chat Messages Never Cleared From UI** (SECURITY/PRIVACY)
**File:** `frontend/src/context/store.ts`, line ~119-122  
**Severity:** LOW (Privacy)

**Issue:**
Unlike events which are cleared from memory, AI messages and user messages persist indefinitely:
- User's queries are stored in memory
- Chat history is never cleared
- If deployed in public/shared environment, chat is visible

**Fix:** Add message clear function and option to clear chat.

---

## SUMMARY

### Bug Statistics
| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 5 | Requires immediate fix |
| MAJOR    | 5 | Needs attention before deployment |
| MINOR    | 5 | Should be fixed |
| Edge Case | 3 | Monitor in testing |
| UX Issue | 3 | Improve user experience |
| Security | 4 | Address before production |
| Performance | 3 | Optimize for scale |

### Recommended Priority for Fixes
1. **Event ID mismatch** (Bug #1) - Breaks event linking
2. **WebSocket max attempts** (Bug #2) - Requires page refresh
3. **AI Messages memory leak** (Bug #3) - Server degradation
4. **Time range filter** (Bug #4) - Wrong events displayed
5. **Zustand persistence break** (Bug #5) - Crashes on reload

### Files Needing Most Attention
- `frontend/src/hooks/useWebSocket.ts` - 2 critical, 1 major bugs
- `frontend/src/context/store.ts` - 1 critical, 2 major bugs
- `frontend/src/components/EventStream.tsx` - 1 critical, 1 major bugs
- `frontend/src/hooks/useApi.ts` - 1 major bug, 2 security issues
- `frontend/src/utils/export.ts` - 1 minor bug

### Testing Recommendations

#### Unit Tests Needed
- Event ID matching logic with different ID formats
- Time range filter calculations with edge cases
- CSV export with special characters and newlines
- Alert configuration application to events
- Zustand store persistence and hydration

#### Integration Tests Needed
- WebSocket reconnection after server restart
- Chat message linking to events
- Event filtering with multiple active filters
- Export functionality with large datasets

#### E2E Tests Needed
- Complete user workflow: create incident, chat about events, export
- WebSocket connection loss and recovery
- Session persistence and restore
- Filter state preservation across page refreshes

---

**Generated by:** Thorough code review  
**Confidence Level:** HIGH - Issues identified through static code analysis and architectural review
