import { useState } from 'react';
import { 
  Brain, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle,
  Shield,
  Zap,
  AlertTriangle
} from 'lucide-react';
import type { AIMessage, NetworkEvent } from '../../types';
import { ConfidenceDisplay } from '../explanations/ConfidenceDisplay';

interface AIExplanationPanelProps {
  aiMessage?: AIMessage;
  event?: NetworkEvent;
  onOpenModal?: () => void;
}

const AIExplanationPanel = ({ aiMessage, event, onOpenModal }: AIExplanationPanelProps) => {
  const [expanded, setExpanded] = useState(false);

  if (!aiMessage) return null;

  // Use text or ai_explanation for brief chat display
  const briefText = aiMessage.text || aiMessage.ai_explanation || aiMessage.brief_summary || 'Analysis pending...';
  
  // Quick recommendations from chat tier
  const quickRecs = aiMessage.quick_recommendations || [];

  const getThreatColor = (level?: string) => {
    if (!level) return 'text-text';
    switch (level) {
      case 'critical':
        return 'text-critical';
      case 'high':
        return 'text-warn';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-ok';
      default:
        return 'text-info';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-3 h-3 text-critical" />;
      case 'high':
        return <AlertCircle className="w-3 h-3 text-warn" />;
      case 'medium':
        return <Zap className="w-3 h-3 text-yellow-500" />;
      default:
        return <Shield className="w-3 h-3 text-ok" />;
    }
  };

  const formatTimeframe = (tf?: string) => {
    if (!tf) return 'ASAP';
    const map: Record<string, string> = {
      immediate: '< 15 min',
      '1_hour': '1 hour',
      '4_hours': '4 hours',
      '24_hours': '24 hours',
      asap: 'ASAP'
    };
    return map[tf] || tf;
  };

  return (
    <div className="bg-panel rounded-lg border border-border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-info" />
          <h3 className="text-sm font-semibold text-text">AI Analysis</h3>
        </div>
        {aiMessage.threat_level && (
          <span className={`text-xs px-2 py-1 rounded border ${getThreatColor(aiMessage.threat_level)}/30 bg-${getThreatColor(aiMessage.threat_level)}/10 ${getThreatColor(aiMessage.threat_level)}`}>
            {aiMessage.threat_level.toUpperCase()}
          </span>
        )}
      </div>

      {/* Brief Summary for Chat Window */}
      <div className="text-sm text-text leading-relaxed">
        {briefText}
      </div>

      {/* IUI Feature: Explanation Confidence Display */}
      {(aiMessage.structured_analysis?.explanation_confidence || aiMessage.structured_analysis?.confidence) && (
        <div className="border-t border-border pt-3 mt-3">
          <ConfidenceDisplay 
            confidence={aiMessage.structured_analysis.explanation_confidence}
          />
        </div>
      )}

      {/* Threat Metrics */}
      {(aiMessage.cvss_score !== undefined || aiMessage.risk_score !== undefined) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {aiMessage.cvss_score !== undefined && (
            <div className="bg-base rounded p-2 border border-border">
              <div className="text-muted mb-1">CVSS v4.0</div>
              <div className={`font-bold ${getThreatColor(aiMessage.threat_level)}`}>
                {aiMessage.cvss_score.toFixed(1)} / 10
              </div>
            </div>
          )}
          {aiMessage.risk_score !== undefined && (
            <div className="bg-base rounded p-2 border border-border">
              <div className="text-muted mb-1">Risk Score</div>
              <div className={`font-bold ${getThreatColor(aiMessage.threat_level)}`}>
                {aiMessage.risk_score.toFixed(0)} / 100
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Recommendations */}
      {quickRecs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text">Quick Actions</div>
          {quickRecs.map((rec, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-base rounded p-2 border border-border/50">
              <div className="mt-0.5">{getPriorityIcon(rec.priority)}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text truncate">{rec.action}</div>
                <div className="text-xs text-muted mt-0.5">
                  {formatTimeframe(rec.timeframe)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full Analysis Button */}
      {aiMessage.structured_analysis && (
        <button
          onClick={onOpenModal}
          className="w-full mt-2 py-2 px-3 text-xs font-medium rounded-lg bg-info/10 text-info hover:bg-info/20 border border-info/30 transition-colors"
        >
          View Full Analysis 
        </button>
      )}

      {/* Collapsible Details Preview */}
      {aiMessage.ai_explanation && (
        <div className="border-t border-border pt-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs text-muted hover:text-text transition-colors"
          >
            <span className="font-medium">Details</span>
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          
          {expanded && (
            <div className="mt-2 p-2 bg-base rounded border border-border/50 text-xs text-text space-y-2">
              {aiMessage.what_happened && (
                <div>
                  <div className="text-muted font-medium mb-1">What Happened</div>
                  <p>{aiMessage.what_happened}</p>
                </div>
              )}
              {aiMessage.why_suspicious && (
                <div>
                  <div className="text-muted font-medium mb-1">Why Suspicious</div>
                  <p>{aiMessage.why_suspicious}</p>
                </div>
              )}
              {aiMessage.detection_method && (
                <div>
                  <div className="text-muted font-medium mb-1">Detection Method</div>
                  <p>{aiMessage.detection_method}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIExplanationPanel;