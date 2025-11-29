import { useState } from 'react';
import { 
  Brain, 
  ChevronDown, 
  ChevronRight, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  BarChart3
} from 'lucide-react';
import type { AIExplanation, NetworkEvent } from '../../types';

interface AIExplanationPanelProps {
  event: NetworkEvent;
  explanation?: AIExplanation;
  onClose?: () => void;
}

const AIExplanationPanel = ({ event, explanation, onClose }: AIExplanationPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    reasoning: true,
    factors: false,
    alternatives: false,
    confidence: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Generate mock explanation if not provided (for demo purposes)
  const mockExplanation: AIExplanation = explanation || {
    event_id: event.id,
    reasoning_chain: [
      {
        step: 1,
        description: 'Detected elevated packet flow rate',
        evidence: [`Current: ${event.flows} packets`, `Baseline: ~${event.baseline_rate || 100} packets`],
        confidence: 0.95,
        metric: 'flow_rate',
        value: event.flows
      },
      {
        step: 2,
        description: 'Applied Z-Score anomaly detection',
        evidence: [`Z-Score: ${event.z_score?.toFixed(2) || '3.2'}`, 'Threshold: 2.5'],
        confidence: 0.88,
        metric: 'z_score',
        value: event.z_score || 3.2
      },
      {
        step: 3,
        description: 'Correlated with historical attack patterns',
        evidence: ['Similar events: 3 in last 10 min', `Source ${event.src} has prior anomalies`],
        confidence: 0.72,
        metric: 'pattern_match'
      }
    ],
    decision_factors: [
      { factor: 'Flow Rate Spike', weight: 0.4, value: 0.92, impact: 'negative' },
      { factor: 'Statistical Deviation', weight: 0.3, value: 0.88, impact: 'negative' },
      { factor: 'Historical Context', weight: 0.2, value: 0.75, impact: 'negative' },
      { factor: 'Source Reputation', weight: 0.1, value: 0.5, impact: 'neutral' }
    ],
    alternative_hypotheses: [
      {
        hypothesis: 'Legitimate traffic spike',
        probability: 0.15,
        why_rejected: 'No scheduled backups or known maintenance window'
      },
      {
        hypothesis: 'Network scanning activity',
        probability: 0.08,
        why_rejected: 'Traffic pattern inconsistent with port scanning'
      }
    ],
    confidence_breakdown: {
      data_quality: 0.92,
      pattern_match: 0.78,
      historical_context: 0.85,
      overall: 0.85
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-ok';
    if (confidence >= 0.5) return 'text-warn';
    return 'text-critical';
  };

  const getImpactIcon = (impact: 'positive' | 'negative' | 'neutral') => {
    switch (impact) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-ok" />;
      case 'negative':
        return <XCircle className="w-4 h-4 text-critical" />;
      case 'neutral':
        return <Info className="w-4 h-4 text-text-dim" />;
    }
  };

  return (
    <div className="bg-panel rounded-lg border border-border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-info" />
          <h3 className="text-lg font-semibold text-text">AI Reasoning Explanation</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text transition-colors"
          >
                      </button>
        )}
      </div>

      {/* Overall Confidence */}
      <div className="bg-base rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text">Overall Confidence</span>
          <span className={`text-lg font-bold ${getConfidenceColor(mockExplanation.confidence_breakdown.overall)}`}>
            {(mockExplanation.confidence_breakdown.overall * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-critical via-warn to-ok transition-all"
            style={{ width: `${mockExplanation.confidence_breakdown.overall * 100}%` }}
          />
        </div>
      </div>

      {/* Reasoning Chain */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('reasoning')}
          className="w-full flex items-center justify-between p-3 bg-panel-hover hover:bg-panel transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-info" />
            <span className="font-medium text-text">Step-by-Step Reasoning</span>
          </div>
          {expandedSections.reasoning ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expandedSections.reasoning && (
          <div className="p-4 space-y-3">
            {mockExplanation.reasoning_chain.map((step, index) => (
              <div key={step.step} className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center text-info font-semibold text-sm">
                    {step.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-text">{step.description}</p>
                    <span className={`text-xs ${getConfidenceColor(step.confidence)}`}>
                      {(step.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <ul className="text-xs text-text-dim space-y-1">
                    {step.evidence.map((ev, i) => (
                      <li key={i} className="flex items-start gap-1">
                        <span className="text-info"></span>
                        <span>{ev}</span>
                      </li>
                    ))}
                  </ul>
                  {index < mockExplanation.reasoning_chain.length - 1 && (
                    <div className="ml-4 mt-2 border-l-2 border-info/30 h-4" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Factors */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('factors')}
          className="w-full flex items-center justify-between p-3 bg-panel-hover hover:bg-panel transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-info" />
            <span className="font-medium text-text">Decision Factors</span>
          </div>
          {expandedSections.factors ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expandedSections.factors && (
          <div className="p-4 space-y-3">
            {mockExplanation.decision_factors.map((factor) => (
              <div key={factor.factor}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getImpactIcon(factor.impact)}
                    <span className="text-sm text-text">{factor.factor}</span>
                  </div>
                  <span className="text-xs text-text-dim">
                    Weight: {(factor.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-base rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        factor.impact === 'negative' ? 'bg-critical' :
                        factor.impact === 'positive' ? 'bg-ok' : 'bg-text-dim'
                      }`}
                      style={{ width: `${factor.value * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-text">
                    {(factor.value * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alternative Hypotheses */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('alternatives')}
          className="w-full flex items-center justify-between p-3 bg-panel-hover hover:bg-panel transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-warn" />
            <span className="font-medium text-text">Alternative Explanations</span>
          </div>
          {expandedSections.alternatives ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expandedSections.alternatives && (
          <div className="p-4 space-y-3">
            {mockExplanation.alternative_hypotheses.map((alt, index) => (
              <div key={index} className="bg-base rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text">{alt.hypothesis}</span>
                  <span className="text-xs text-text-dim">
                    {(alt.probability * 100).toFixed(0)}% likely
                  </span>
                </div>
                <p className="text-xs text-text-dim">
                  <span className="font-medium">Rejected: </span>
                  {alt.why_rejected}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confidence Breakdown */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('confidence')}
          className="w-full flex items-center justify-between p-3 bg-panel-hover hover:bg-panel transition-colors"
        >
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-info" />
            <span className="font-medium text-text">Confidence Breakdown</span>
          </div>
          {expandedSections.confidence ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {expandedSections.confidence && (
          <div className="p-4 space-y-3">
            {Object.entries(mockExplanation.confidence_breakdown).map(([key, value]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className={`text-sm font-medium ${getConfidenceColor(value)}`}>
                    {(value * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-base rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      value >= 0.8 ? 'bg-ok' : value >= 0.5 ? 'bg-warn' : 'bg-critical'
                    }`}
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Educational Note */}
      <div className="bg-info/10 border border-info/30 rounded-lg p-3">
        <p className="text-xs text-text-dim">
          <span className="font-medium text-info"> How to interpret: </span>
          This explanation shows the AI's reasoning process. Higher confidence scores mean the AI is more certain about its classification. The decision factors show which metrics contributed most to the anomaly detection.
        </p>
      </div>
    </div>
  );
};

export default AIExplanationPanel;
