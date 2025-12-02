import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import type { ExplanationConfidence } from '../../types';

interface ConfidenceDisplayProps {
  confidence?: ExplanationConfidence;
  className?: string;
}

/**
 * Displays AI explanation confidence with:
 * - Confidence badge (HIGH/MEDIUM/LOW)
 * - Detection methods grid (✓/✗ for each method)
 * - Threat distribution bar chart
 */
export function ConfidenceDisplay({ confidence, className = '' }: ConfidenceDisplayProps) {
  if (!confidence) return null;

  const confidenceLevel = useMemo(() => {
    if (confidence.confidence >= 0.9) return { level: 'HIGH', color: 'text-success', bg: 'bg-success/10', icon: '🟢' };
    if (confidence.confidence >= 0.7) return { level: 'MEDIUM', color: 'text-warn', bg: 'bg-warn/10', icon: '🟡' };
    return { level: 'LOW', color: 'text-critical', bg: 'bg-critical/10', icon: '🔴' };
  }, [confidence.confidence]);

  const triggeredCount = useMemo(() => {
    return confidence.detection_methods.filter(m => m.triggered).length;
  }, [confidence.detection_methods]);

  // Sort threat distribution by probability (descending)
  const sortedThreats = useMemo(() => {
    return [...confidence.threat_distribution].sort((a, b) => b.probability - a.probability);
  }, [confidence.threat_distribution]);

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Confidence Badge */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${confidenceLevel.bg} border-current`}>
        <span className="text-lg">{confidenceLevel.icon}</span>
        <div className={`${confidenceLevel.color} font-semibold`}>
          {confidenceLevel.level} CONFIDENCE
        </div>
        <div className={`text-sm ${confidenceLevel.color} ml-auto`}>
          {(confidence.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Detection Methods Grid */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wide">
          Detection Methods ({triggeredCount}/{confidence.detection_methods.length})
        </div>
        <div className="grid grid-cols-2 gap-2">
          {confidence.detection_methods.map((method) => (
            <div
              key={method.name}
              className={`p-2 rounded border text-xs font-mono ${
                method.triggered
                  ? 'bg-success/5 border-success/30 text-success'
                  : 'bg-border/20 border-border/50 text-text-dim'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                {method.triggered ? (
                  <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <XCircle className="w-3 h-3 flex-shrink-0" />
                )}
                <span className="truncate">{method.name}</span>
              </div>
              <div className="text-[10px] opacity-75">
                {(method.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threat Distribution Chart */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-text-dim uppercase tracking-wide">
          Threat Distribution
        </div>
        <div className="space-y-2">
          {sortedThreats.map((threat) => (
            <div key={threat.threat_type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text font-medium truncate">
                  {threat.threat_type
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                </span>
                <span className="text-text-dim font-mono">
                  {formatPercentage(threat.probability)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-info to-warn rounded-full transition-all"
                  style={{ width: `${threat.probability * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Note */}
      {confidence.confidence < 0.7 && (
        <div className="flex items-start gap-2 p-2 rounded bg-warn/10 border border-warn/30">
          <AlertCircle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
          <div className="text-xs text-warn">
            <strong>Low confidence:</strong> Recommendation needs investigation
          </div>
        </div>
      )}
    </div>
  );
}
