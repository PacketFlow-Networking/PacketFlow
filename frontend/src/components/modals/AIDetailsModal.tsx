import { X, Bot, Calendar, Network, AlertTriangle, Activity, TrendingUp, Hash, Target, Shield, Zap, CheckCircle, AlertCircle, BookOpen, Code2, Lock } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { AIMessage, NetworkEvent } from '../../types';

dayjs.extend(relativeTime);

interface AIDetailsModalProps {
  message: AIMessage;
  relatedEvents?: NetworkEvent[];
  onClose: () => void;
}

export default function AIDetailsModal({ message, relatedEvents = [], onClose }: AIDetailsModalProps) {
  const getThreatColor = (level?: string) => {
    if (!level) return 'border-info/30 bg-info/10 text-info';
    switch (level) {
      case 'critical':
        return 'border-critical/30 bg-critical/10 text-critical';
      case 'high':
        return 'border-warn/30 bg-warn/10 text-warn';
      case 'medium':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600';
      case 'low':
        return 'border-ok/30 bg-ok/10 text-ok';
      default:
        return 'border-info/30 bg-info/10 text-info';
    }
  };

  const getCVSSColor = (score?: number) => {
    if (!score) return 'border-info/30 bg-info/10 text-info';
    if (score >= 9.0) return 'border-critical/30 bg-critical/10 text-critical';
    if (score >= 7.0) return 'border-warn/30 bg-warn/10 text-warn';
    if (score >= 4.0) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-600';
    return 'border-ok/30 bg-ok/10 text-ok';
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
  const analysis = message.structured_analysis;

  if (!analysis) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-base border border-info/30 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-info/30 bg-panel sticky top-0">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-text">{analysis.brief_summary}</h2>
              <p className="text-sm text-muted flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3" />
                {dayjs(message.timestamp).format('MMM D, YYYY HH:mm:ss')}
              </p>
            </div>
            {analysis.threat_level && (
              <div className={`px-3 py-1 rounded-lg border font-semibold text-sm ${getThreatColor(analysis.threat_level)}`}>
                {analysis.threat_level.toUpperCase()}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-base transition-colors group"
          >
            <X className="w-5 h-5 text-muted group-hover:text-text" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar p-6 space-y-6">
          {/* EXECUTIVE SUMMARY */}
          {analysis.summary && (
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-info" />
                Executive Summary
              </h3>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <p className="text-text leading-relaxed">{analysis.summary}</p>
              </div>
            </section>
          )}

          {/* RISK QUANTIFICATION: CVSS & Risk Score */}
          {(analysis.cvss_score !== undefined || analysis.risk_score !== undefined) && (
            <section className="space-y-3">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Zap className="w-5 h-5 text-info" />
                Risk Assessment
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {analysis.cvss_score !== undefined && (
                  <div className={`border rounded-lg p-4 ${getCVSSColor(analysis.cvss_score)}`}>
                    <div className="text-sm font-medium opacity-75 mb-2">CVSS v4.0 Score</div>
                    <div className="text-3xl font-bold">{analysis.cvss_score.toFixed(1)}</div>
                    <div className="text-xs opacity-75 mt-1">/ 10.0</div>
                  </div>
                )}
                {analysis.risk_score !== undefined && (
                  <div className={`border rounded-lg p-4 ${getCVSSColor(analysis.cvss_score)}`}>
                    <div className="text-sm font-medium opacity-75 mb-2">Business Risk Score</div>
                    <div className="text-3xl font-bold">{analysis.risk_score.toFixed(0)}</div>
                    <div className="text-xs opacity-75 mt-1">/ 100</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* FORENSIC ANALYSIS: What Happened & Why Suspicious */}
          <section className="space-y-3 border-t border-border pt-4">
            <h3 className="text-lg font-bold text-text flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-info" />
              Forensic Analysis
            </h3>
            <div className="grid gap-4">
              {analysis.what_happened && (
                <div className="bg-panel border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text mb-2">What Happened</h4>
                  <p className="text-sm text-muted leading-relaxed">{analysis.what_happened}</p>
                </div>
              )}
              {analysis.why_suspicious && (
                <div className="bg-panel border border-warn/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text mb-2">Why Suspicious</h4>
                  <p className="text-sm text-muted leading-relaxed">{analysis.why_suspicious}</p>
                </div>
              )}
              {analysis.detection_method && (
                <div className="bg-panel border border-accent/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text mb-2">Detection Method</h4>
                  <p className="text-sm text-muted leading-relaxed">{analysis.detection_method}</p>
                </div>
              )}
            </div>
          </section>

          {/* THREAT INDICATORS: CWE, OWASP, MITRE Classification */}
          {analysis.threat_indicators && analysis.threat_indicators.length > 0 && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-info" />
                Threat Indicators
              </h3>
              <div className="space-y-3">
                {analysis.threat_indicators.map((indicator, idx) => (
                  <div key={idx} className="bg-panel border border-critical/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded bg-critical/20 text-critical text-xs font-semibold">
                          {indicator.type.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-muted font-mono">
                          {(indicator.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-text">{indicator.explanation}</p>
                    <p className="text-xs text-muted">Evidence: {indicator.evidence}</p>
                    {(indicator.cwe_ids?.length || indicator.owasp_references?.length || indicator.mitre_techniques?.length) && (
                      <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-border/50">
                        {indicator.cwe_ids?.map(cwe => (
                          <span key={cwe} className="text-xs px-2 py-1 rounded bg-accent/10 text-accent border border-accent/30">
                            CWE-{cwe}
                          </span>
                        ))}
                        {indicator.owasp_references?.map(owasp => (
                          <span key={owasp} className="text-xs px-2 py-1 rounded bg-warn/10 text-warn border border-warn/30">
                            {owasp}
                          </span>
                        ))}
                        {indicator.mitre_techniques?.map(tech => (
                          <span key={tech} className="text-xs px-2 py-1 rounded bg-info/10 text-info border border-info/30 font-mono">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MITRE ATT&CK FRAMEWORK */}
          {analysis.mitre_attack_stages && analysis.mitre_attack_stages.length > 0 && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Target className="w-5 h-5 text-info" />
                MITRE ATT&CK Framework
              </h3>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {analysis.mitre_attack_stages.map(stage => (
                    <span key={stage} className="px-3 py-1.5 bg-info/20 text-info rounded-lg border border-info/50 text-sm font-medium">
                      {stage}
                    </span>
                  ))}
                </div>
              </div>
              {analysis.attack_context && (
                <div className="bg-panel border border-border rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-text mb-2">Attack Context</h4>
                  <p className="text-sm text-muted leading-relaxed">{analysis.attack_context}</p>
                </div>
              )}
            </section>
          )}

          {/* INCIDENT RESPONSE: Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-info" />
                Incident Response - Recommendations
              </h3>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-panel border border-ok/30 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-text">{rec.action}</div>
                        <div className="text-xs text-muted mt-1">
                          Timeframe: {formatTimeframe(rec.timeframe)}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded font-semibold text-xs ${
                        rec.priority === 'critical' ? 'bg-critical/20 text-critical' :
                        rec.priority === 'high' ? 'bg-warn/20 text-warn' :
                        rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-600' : 'bg-ok/20 text-ok'
                      }`}>
                        {rec.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-muted leading-relaxed">{rec.details}</p>
                    {(rec.affected_systems?.length || rec.compliance_impact?.length) && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        {rec.affected_systems && rec.affected_systems.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted mb-1">Affected Systems</div>
                            <div className="flex flex-wrap gap-1">
                              {rec.affected_systems.map(sys => (
                                <span key={sys} className="text-xs px-2 py-0.5 rounded bg-base border border-border text-muted font-mono">
                                  {sys}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {rec.compliance_impact && rec.compliance_impact.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted mb-1">Compliance Impact</div>
                            <div className="flex flex-wrap gap-1">
                              {rec.compliance_impact.map(comp => (
                                <span key={comp} className="text-xs px-2 py-0.5 rounded bg-info/10 text-info border border-info/30">
                                  {comp}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* COMPLIANCE IMPLICATIONS */}
          {analysis.compliance_implications && analysis.compliance_implications.length > 0 && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Lock className="w-5 h-5 text-info" />
                Compliance Implications
              </h3>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {analysis.compliance_implications.map(comp => (
                    <span key={comp} className="px-3 py-1.5 bg-info/20 text-info rounded-lg border border-info/50 text-sm font-medium">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* TECHNICAL DETAILS & FORENSIC EVIDENCE */}
          {(analysis.technical_details || analysis.affected_assets) && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <Code2 className="w-5 h-5 text-info" />
                Technical Forensic Details
              </h3>
              {analysis.technical_details && Object.keys(analysis.technical_details).length > 0 && (
                <div className="bg-panel border border-border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(analysis.technical_details).map(([key, value]) => (
                      <div key={key}>
                        <div className="text-muted font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-text font-mono mt-1">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analysis.affected_assets && analysis.affected_assets.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-muted">Affected Assets</div>
                  {analysis.affected_assets.map((asset, idx) => (
                    <div key={idx} className="bg-base rounded border border-border p-3 text-sm">
                      {asset.ip && <div><span className="text-muted">IP:</span> <span className="text-text font-mono">{asset.ip}</span></div>}
                      {asset.type && <div><span className="text-muted">Type:</span> <span className="text-text">{asset.type}</span></div>}
                      {asset.criticality && <div><span className="text-muted">Criticality:</span> <span className="text-text font-semibold">{asset.criticality}</span></div>}
                      {asset.department && <div><span className="text-muted">Department:</span> <span className="text-text">{asset.department}</span></div>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* SOC ANALYST SUPPORT: Investigation Checklist & False Positives */}
          {(analysis.investigation_checklist?.length || analysis.false_positive_indicators?.length) && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-info" />
                SOC Analyst Support
              </h3>
              {analysis.investigation_checklist && analysis.investigation_checklist.length > 0 && (
                <div className="bg-panel border border-border rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-text mb-2">Investigation Checklist</div>
                  {analysis.investigation_checklist.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-ok flex-shrink-0 mt-0.5" />
                      <span className="text-muted">{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {analysis.false_positive_indicators && analysis.false_positive_indicators.length > 0 && (
                <div className="bg-panel border border-warn/30 rounded-lg p-4 space-y-2">
                  <div className="text-sm font-semibold text-text mb-2">Potential False Positive Causes</div>
                  {analysis.false_positive_indicators.map((indicator, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                      <span className="text-muted">{indicator}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* CONFIDENCE & UNCERTAINTY */}
          {analysis.confidence !== undefined && (
            <section className="space-y-3 border-t border-border pt-4">
              <h3 className="text-lg font-bold text-text flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-info" />
                Confidence Metrics
              </h3>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted">Overall Confidence</span>
                  <span className="text-lg font-bold text-info">{(analysis.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-base rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-critical via-warn to-ok"
                    style={{ width: `${analysis.confidence * 100}%` }}
                  />
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-info/30 bg-panel flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-info text-base rounded-lg hover:bg-accent transition-colors font-medium text-sm"
          >
            Close Analysis
          </button>
        </div>
      </div>
    </div>
  );
}
