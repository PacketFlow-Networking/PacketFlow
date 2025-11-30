import { useStore } from '../../context/store';
import { Info } from 'lucide-react';

const SensitivityPanel = () => {
  const { sensitivity, thresholds } = useStore(state => state.alertConfig);
  const setSensitivity = useStore(state => state.setSensitivity);

  const getSensitivityLabel = (value: number) => {
    if (value <= 20) return 'Very Low';
    if (value <= 40) return 'Low';
    if (value <= 60) return 'Medium';
    if (value <= 80) return 'High';
    return 'Very High';
  };

  const getSensitivityColor = (value: number) => {
    if (value <= 20) return 'text-green-400';
    if (value <= 40) return 'text-blue-400';
    if (value <= 60) return 'text-yellow-400';
    if (value <= 80) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-300">
          <p className="font-medium text-blue-400 mb-1">Global Alert Sensitivity</p>
          <p>
            This controls how aggressively the system flags anomalies. Higher sensitivity means more alerts
            but fewer missed threats. Lower sensitivity reduces noise but may miss subtle anomalies.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-200">
            Detection Sensitivity
          </label>
          <span className={`text-lg font-semibold ${getSensitivityColor(sensitivity)}`}>
            {getSensitivityLabel(sensitivity)}
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(e) => setSensitivity(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        <div className="text-sm text-gray-400">
          Current value: <span className="text-white font-mono">{sensitivity}</span>
        </div>
      </div>

      {/* Impact Preview */}
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-200 mb-4">Impact on Detection</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Anomaly Score Threshold</div>
            <div className="text-lg font-semibold text-white">
              {thresholds.anomaly_score.toFixed(2)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Events above this score trigger alerts
            </div>
          </div>

          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Expected Alert Volume</div>
            <div className="text-lg font-semibold text-white">
              {sensitivity <= 20 && 'Very Low'}
              {sensitivity > 20 && sensitivity <= 40 && 'Low'}
              {sensitivity > 40 && sensitivity <= 60 && 'Moderate'}
              {sensitivity > 60 && sensitivity <= 80 && 'High'}
              {sensitivity > 80 && 'Very High'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Estimated alerts per hour
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="border-t border-gray-700 pt-6">
        <h3 className="text-sm font-medium text-gray-200 mb-3">Recommendations</h3>
        <div className="space-y-2 text-sm text-gray-400">
          {sensitivity <= 30 && (
            <div className="flex items-start gap-2">
              <span className="text-yellow-400"></span>
              <span>Low sensitivity may miss subtle attacks. Recommended for stable, well-understood networks.</span>
            </div>
          )}
          {sensitivity > 30 && sensitivity <= 70 && (
            <div className="flex items-start gap-2">
              <span className="text-green-400"></span>
              <span>Balanced sensitivity provides good coverage with manageable alert volume.</span>
            </div>
          )}
          {sensitivity > 70 && (
            <div className="flex items-start gap-2">
              <span className="text-orange-400"></span>
              <span>High sensitivity generates many alerts. Best for high-security environments with SOC teams.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SensitivityPanel;
