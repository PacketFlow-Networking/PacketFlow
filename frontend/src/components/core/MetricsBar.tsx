import { Activity, Wifi, WifiOff, AlertTriangle, Bell, User, RefreshCw, Settings } from 'lucide-react';
import { useStore } from '../../context/store';
import { Logo, ComplexityModeIndicator } from '../shared';

interface MetricsBarProps {
  onShowHelp?: () => void;
  onOpenUserProfile?: () => void;
  onReconnect?: () => void;
  onOpenAlertConfig?: () => void;
}

const MetricsBar = ({ onShowHelp, onOpenUserProfile, onReconnect, onOpenAlertConfig }: MetricsBarProps) => {
  const { status, connected, userProfile } = useStore();

  const getStatusColor = (value: number, thresholds: { warn: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-critical';
    if (value >= thresholds.warn) return 'text-warn';
    return 'text-ok';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="panel px-6 py-3 flex items-center justify-between border-b border-border">
      {/* Left: Title and Connection Status */}
      <div className="flex items-center gap-4">
        <Logo variant="long" size="md" theme="dark" />
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Wifi className="w-4 h-4 text-ok" />
              <span className="text-sm text-ok">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-critical" />
              <span className="text-sm text-critical">Disconnected</span>
              {onReconnect && (
                <button
                  onClick={onReconnect}
                  className="ml-2 px-3 py-1 bg-info hover:bg-info/80 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                  title="Reconnect to backend"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reconnect
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Center: Metrics */}
      {status ? (
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-info" />
            <div className="text-sm">
              <span className="text-text-dim">Packets/sec: </span>
              <span className={`font-semibold ${getStatusColor(status.packets_per_sec || 0, { warn: 800, critical: 1200 })}`}>
                {(status.packets_per_sec || 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-sm">
            <span className="text-text-dim">Active Flows: </span>
            <span className={`font-semibold ${getStatusColor(status.active_flows || 0, { warn: 50, critical: 80 })}`}>
              {status.active_flows || 0}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warn" />
            <div className="text-sm">
              <span className="text-text-dim">Anomalies/min: </span>
              <span className={`font-semibold ${getStatusColor(status.anomalies_per_min || 0, { warn: 2, critical: 5 })}`}>
                {(status.anomalies_per_min || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-sm text-text-dim">
          Waiting for data...
        </div>
      )}

      {/* Right: Uptime and Settings */}
      <div className="flex items-center gap-4">
        {status && status.uptime_seconds !== undefined && (
          <div className="text-sm text-text-dim">
            Uptime: <span className="text-text">{formatUptime(status.uptime_seconds)}</span>
          </div>
        )}
        
        <button
          onClick={onShowHelp}
          className="p-2 rounded hover:bg-panel-hover transition-colors"
          aria-label="Keyboard shortcuts"
          title="Keyboard shortcuts (?)"
        >
          <kbd className="px-1.5 py-0.5 bg-panel border border-border rounded text-text text-xs font-mono">?</kbd>
        </button>
        
        <button
          onClick={onOpenAlertConfig}
          className="p-2 rounded hover:bg-panel-hover transition-colors"
          aria-label="Alert configuration"
          title="Alert configuration (Ctrl+,)"
        >
          <Settings className="w-4 h-4 text-text-dim hover:text-text" />
        </button>
        
        <div className="w-px h-6 bg-border" />
        
        <button
          onClick={onOpenUserProfile}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-panel-hover transition-colors group"
          aria-label="User profile"
          title="User profile (Ctrl+P)"
        >
          <div className="p-1.5 rounded-full bg-info/10 border border-info/30 group-hover:bg-info/20 transition-colors">
            <User className="w-4 h-4 text-info" />
          </div>
          <div className="text-left">
            <div className="text-xs font-medium text-text">Profile</div>
            <div className="text-[10px] text-text-dim capitalize">{userProfile.expertise_level}</div>
          </div>
        </button>
        
        {/* UI Complexity Mode Indicator - Below user button */}
        <ComplexityModeIndicator compact />
      </div>
    </div>
  );
};

export default MetricsBar;
