import { useState } from 'react';
import { useStore } from '../../context/store';
import { Info, RotateCcw } from 'lucide-react';
import { DEFAULT_ALERT_CONFIG } from '../../types';

const ThresholdsPanel = () => {
  const { thresholds } = useStore(state => state.alertConfig);
  const updateThresholds = useStore(state => state.updateThresholds);
  
  const [localThresholds, setLocalThresholds] = useState(thresholds);

  const handleChange = (field: keyof typeof thresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const updated = { ...localThresholds, [field]: numValue };
      setLocalThresholds(updated);
      updateThresholds({ [field]: numValue });
    }
  };

  const resetToDefaults = () => {
    setLocalThresholds(DEFAULT_ALERT_CONFIG.thresholds);
    updateThresholds(DEFAULT_ALERT_CONFIG.thresholds);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400 mb-1">Custom Alert Thresholds</p>
          <p>
            Set specific thresholds for different metrics. Events exceeding these values will trigger alerts
            regardless of the global sensitivity setting.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium text-gray-200">Detection Thresholds</h3>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>
      </div>

      <div className="space-y-6">
        {/* Anomaly Score */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-sm font-medium text-white">Anomaly Score Threshold</label>
              <p className="text-xs text-gray-400 mt-1">
                Events with anomaly scores above this value trigger alerts
              </p>
            </div>
            <span className="text-lg font-mono text-blue-400">
              {localThresholds.anomaly_score.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={localThresholds.anomaly_score}
            onChange={(e) => handleChange('anomaly_score', e.target.value)}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.0 (Low)</span>
            <span>0.5</span>
            <span>1.0 (High)</span>
          </div>
        </div>

        {/* Flow Rate */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="mb-3">
            <label className="text-sm font-medium text-white">Flow Rate Threshold</label>
            <p className="text-xs text-gray-400 mt-1">
              Alert when flow count exceeds this value (flows per time window)
            </p>
          </div>
          <input
            type="number"
            min="100"
            max="100000"
            step="100"
            value={localThresholds.flow_rate}
            onChange={(e) => handleChange('flow_rate', e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-gray-400 mt-2">
            Current: <span className="text-white font-mono">{localThresholds.flow_rate.toLocaleString()}</span> flows
          </div>
        </div>

        {/* Packet Rate */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="mb-3">
            <label className="text-sm font-medium text-white">Packet Rate Threshold</label>
            <p className="text-xs text-gray-400 mt-1">
              Alert when packet rate exceeds this value (packets per second)
            </p>
          </div>
          <input
            type="number"
            min="1000"
            max="1000000"
            step="1000"
            value={localThresholds.packet_rate}
            onChange={(e) => handleChange('packet_rate', e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-gray-400 mt-2">
            Current: <span className="text-white font-mono">{localThresholds.packet_rate.toLocaleString()}</span> pps
          </div>
        </div>

        {/* Byte Rate */}
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="mb-3">
            <label className="text-sm font-medium text-white">Byte Rate Threshold</label>
            <p className="text-xs text-gray-400 mt-1">
              Alert when byte rate exceeds this value (bytes per second)
            </p>
          </div>
          <input
            type="number"
            min="10000"
            max="10000000"
            step="10000"
            value={localThresholds.byte_rate}
            onChange={(e) => handleChange('byte_rate', e.target.value)}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          />
          <div className="text-xs text-gray-400 mt-2">
            Current: <span className="text-white font-mono">{formatBytes(localThresholds.byte_rate)}/s</span>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Current Configuration</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
            <div className="text-gray-400">Anomaly Score</div>
            <div className="text-white font-mono text-lg">{localThresholds.anomaly_score.toFixed(2)}</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
            <div className="text-gray-400">Flow Rate</div>
            <div className="text-white font-mono text-lg">{localThresholds.flow_rate.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
            <div className="text-gray-400">Packet Rate</div>
            <div className="text-white font-mono text-lg">{localThresholds.packet_rate.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-gray-800/50 rounded border border-gray-700">
            <div className="text-gray-400">Byte Rate</div>
            <div className="text-white font-mono text-lg">{formatBytes(localThresholds.byte_rate)}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThresholdsPanel;
