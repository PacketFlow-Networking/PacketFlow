# Alert Configuration System

Complete alert configuration and customization system for PacketFlow.

## Overview

The Alert Configuration system provides comprehensive control over detection sensitivity, thresholds, IP filtering, custom rules, and notification preferences. All settings persist across sessions using localStorage.

## Features

### 1. Global Sensitivity Control
- **Slider**: 0-100 scale controlling detection sensitivity
- **Dynamic Threshold**: Automatically adjusts anomaly score threshold
- **Visual Feedback**: Color-coded sensitivity levels (Very Low  Very High)
- **Impact Preview**: Shows current threshold and expected alert volume
- **Recommendations**: Context-aware suggestions based on sensitivity level

### 2. Custom Thresholds
- **Anomaly Score**: Adjustable threshold (0.0 - 1.0)
- **Flow Rate**: Flows per time window threshold
- **Packet Rate**: Packets per second threshold
- **Byte Rate**: Bytes per second threshold
- **Real-time Updates**: Changes apply immediately
- **Reset Option**: Restore defaults with one click

### 3. IP List Management
- **Whitelist**: Trusted IPs that never trigger alerts
- **Blacklist**: Known threats that always trigger alerts
- **IP Validation**: Supports IPv4, IPv6, and CIDR notation
- **Comments**: Add context to each IP entry
- **Easy Management**: Add/remove IPs with simple UI
- **Timestamps**: Track when IPs were added

### 4. Custom Alert Rules
- **Flexible Conditions**: Create rules based on 7 different fields
  - Anomaly Score
  - Flow Count
  - Protocol
  - Source IP
  - Destination IP
  - Source Port
  - Destination Port
- **4 Condition Types**:
  - Greater Than (>)
  - Less Than (<)
  - Equals (=)
  - Contains (for strings)
- **4 Action Types**:
  - Notify (toast notification)
  - Create Incident (automatic incident)
  - Log (system log)
  - Sound (audio alert)
- **Rule Management**:
  - Enable/disable toggles
  - Edit existing rules
  - Delete rules
  - Visual status indicators
- **Severity Levels**: Low, Medium, High, Critical

### 5. Notification Settings
- **Master Switch**: Enable/disable all notifications
- **Individual Controls**:
  - Toast Notifications (popup alerts)
  - Sound Alerts (audio for critical events)
  - Auto-create Incidents (automatic incident creation)
- **Visual Status**: Clear indication of active settings
- **Tips & Guidance**: Helpful information for each setting

## Usage

### Opening Configuration
- **Keyboard**: Press `Ctrl+,` (or `Cmd+,` on Mac)
- **UI**: Click the settings icon in MetricsBar (if implemented)

### Navigation
The configuration modal has 5 tabs:
1. **Sensitivity** - Global detection sensitivity
2. **Thresholds** - Custom metric thresholds
3. **IP Lists** - Whitelist/blacklist management
4. **Rules** - Custom alert rules
5. **Notifications** - Notification preferences

### Creating a Custom Rule

1. Go to the **Rules** tab
2. Click **New Rule**
3. Fill in:
   - Rule Name (e.g., "High Traffic Alert")
   - Field (e.g., "flows")
   - Condition (e.g., "greater_than")
   - Value (e.g., "1000")
   - Actions (select one or more)
   - Severity level
   - Optional description
4. Click **Create Rule**

### Adding to Whitelist

1. Go to **IP Lists** tab
2. Select **Whitelist**
3. Enter IP address (e.g., `192.168.1.100` or `10.0.0.0/24`)
4. Add optional comment (e.g., "Office network")
5. Click **Add IP**

## Data Persistence

All configuration is automatically saved to browser localStorage:
- Settings persist across page refreshes
- Settings persist across browser sessions
- Storage key: `packetflow-alert-config`

## Configuration Structure

```typescript
interface AlertConfiguration {
  sensitivity: number;  // 0-100
  
  thresholds: {
    anomaly_score: number;
    flow_rate: number;
    packet_rate: number;
    byte_rate: number;
  };
  
  whitelist: IPListEntry[];
  blacklist: IPListEntry[];
  
  rules: AlertRule[];
  
  notifications: {
    enabled: boolean;
    sound: boolean;
    toast: boolean;
    autoIncident: boolean;
  };
}
```

## State Management

Configuration is managed through Zustand store with persistence middleware:

```typescript
// Update sensitivity
setSensitivity(75);

// Update thresholds
updateThresholds({ anomaly_score: 0.9 });

// Add to whitelist
addWhitelistIP({ 
  ip: '192.168.1.1', 
  comment: 'Gateway',
  added_at: new Date().toISOString()
});

// Add alert rule
addAlertRule({
  id: crypto.randomUUID(),
  name: 'Critical Anomaly',
  enabled: true,
  field: 'anomaly_score',
  condition: 'greater_than',
  value: 0.95,
  actions: ['notify', 'create_incident', 'sound'],
  severity: 'critical',
  created_at: new Date().toISOString()
});

// Reset to defaults
resetAlertConfig();
```

## Components

- **AlertConfigModal** - Main modal container with tabs
- **SensitivityPanel** - Global sensitivity slider
- **ThresholdsPanel** - Custom threshold configuration
- **IPListPanel** - Whitelist/blacklist management
- **RulesPanel** - Alert rules builder
- **NotificationsPanel** - Notification settings

## Future Enhancements

- [ ] Export/import configuration
- [ ] Rule templates
- [ ] Schedule-based rules (e.g., different thresholds during business hours)
- [ ] GeoIP-based filtering
- [ ] Machine learning threshold recommendations
- [ ] Rule testing/simulation
- [ ] Alert history and analytics

## Tips

- Start with **medium sensitivity** (50) and adjust based on alert volume
- Use **whitelist** for known internal infrastructure
- Use **blacklist** for IPs from threat intelligence feeds
- Create **custom rules** for specific use cases (e.g., VPN monitoring)
- Enable **auto-incident** creation for critical alerts requiring investigation
- Test rules in mock mode before deploying to production

## Troubleshooting

**Configuration not persisting:**
- Check browser localStorage is enabled
- Check for storage quota limits
- Try clearing browser cache and reconfiguring

**Too many alerts:**
- Decrease sensitivity
- Add trusted IPs to whitelist
- Increase thresholds
- Review and disable overly broad rules

**Missing critical alerts:**
- Increase sensitivity
- Lower thresholds
- Review blacklist for false positives
- Check rule conditions are correct

---

**Last Updated**: October 15, 2025
