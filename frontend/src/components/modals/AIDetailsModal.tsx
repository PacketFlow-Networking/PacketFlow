import { X, Bot, Calendar, Network, AlertTriangle, Activity, TrendingUp, Hash, Target, Shield } from 'lucide-react';
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
  const getSeverityColor = (score: number) => {
    if (score >= 0.9) return 'text-error border-error/30 bg-error/10';
    if (score >= 0.7) return 'text-warning border-warning/30 bg-warning/10';
    if (score >= 0.5) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
    return 'text-ok border-ok/30 bg-ok/10';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatRate = (rate: number, unit: string) => {
    return `${rate.toLocaleString()} ${unit}`;
  };
  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-base border border-info/30 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-info/30 bg-panel">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text">AI Analysis Details</h2>
              <p className="text-sm text-muted flex items-center gap-2 mt-1">
                <Calendar className="w-3 h-3" />
                {dayjs(message.timestamp).format('MMM D, YYYY HH:mm:ss')}
                {message.confidence && (
                  <>
                    <span className="text-muted"></span>
                    <span className={`badge ${
                      message.confidence === 'high' ? 'badge-ok' :
                      message.confidence === 'medium' ? 'badge-info' : 'badge-warn'
                    }`}>
                      {message.confidence} confidence
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-base transition-colors group"
            title="Close"
          >
            <X className="w-5 h-5 text-muted group-hover:text-text" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar p-6 space-y-6">
          {/* Message Type & Confidence */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-info" />
              <span className="text-sm text-muted">Type:</span>
              <span className={`badge ${
                message.type === 'warning' ? 'badge-warn' :
                message.type === 'insight' ? 'badge-info' : 'badge-ok'
              }`}>
                {message.type}
              </span>
            </div>
            {message.confidence && (
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-info" />
                <span className="text-sm text-muted">Confidence:</span>
                <span className={`badge ${
                  message.confidence === 'high' ? 'badge-ok' :
                  message.confidence === 'medium' ? 'badge-info' : 'badge-warn'
                }`}>
                  {message.confidence}
                </span>
              </div>
            )}
          </div>

          {/* Structured Explainability Fields */}
          {message.full_summary || message.what_happened || message.why_suspicious ? (
            <section className="space-y-4">
              {/* Full Summary */}
              {message.full_summary && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-info" />
                    <h3 className="font-semibold text-text">Summary</h3>
                  </div>
                  <div className="bg-panel border border-info/30 rounded-lg p-4">
                    <p className="text-text text-sm leading-relaxed">{message.full_summary}</p>
                  </div>
                </div>
              )}

              {/* Threat Level */}
              {message.threat_level && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-info" />
                  <span className="text-sm text-muted">Threat Level:</span>
                  <span className={`badge ${
                    message.threat_level === 'critical' ? 'badge-error' :
                    message.threat_level === 'high' ? 'badge-warn' :
                    message.threat_level === 'medium' ? 'badge-info' : 'badge-ok'
                  }`}>
                    {message.threat_level}
                  </span>
                </div>
              )}

              {/* What Happened */}
              {message.what_happened && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> What Happened</h4>
                  <div className="bg-panel border border-border rounded-lg p-3">
                    <p className="text-text text-sm">{message.what_happened}</p>
                  </div>
                </div>
              )}

              {/* Why Suspicious */}
              {message.why_suspicious && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Why Suspicious</h4>
                  <div className="bg-panel border border-warning/30 rounded-lg p-3">
                    <p className="text-text text-sm">{message.why_suspicious}</p>
                  </div>
                </div>
              )}

              {/* Detection Method */}
              {message.detection_method && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Detection Method</h4>
                  <div className="bg-panel border border-border rounded-lg p-3">
                    <p className="text-text text-sm">{message.detection_method}</p>
                  </div>
                </div>
              )}

              {/* Attack Context */}
              {message.attack_context && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Attack Context</h4>
                  <div className="bg-panel border border-error/30 rounded-lg p-3">
                    <p className="text-text text-sm">{message.attack_context}</p>
                  </div>
                </div>
              )}

              {/* Threat Indicators */}
              {message.threat_indicators && message.threat_indicators.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Threat Indicators</h4>
                  <div className="space-y-2">
                    {message.threat_indicators.map((indicator, idx) => (
                      <div key={idx} className="bg-panel border border-error/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="badge badge-error">{indicator.type}</span>
                          <span className="text-xs font-mono text-muted">
                            {(indicator.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <p className="text-sm text-text mb-1">{indicator.explanation}</p>
                        <p className="text-xs text-muted">Evidence: {indicator.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {message.recommendations && message.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Recommendations</h4>
                  <div className="space-y-2">
                    {message.recommendations.map((rec, idx) => (
                      <div key={idx} className="bg-panel border border-ok/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-text text-sm">{rec.action}</span>
                          <span className={`badge ${
                            rec.priority === 'critical' ? 'badge-error' :
                            rec.priority === 'high' ? 'badge-warn' :
                            rec.priority === 'medium' ? 'badge-info' : 'badge-ok'
                          }`}>
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-sm text-muted">{rec.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {message.technical_details && Object.keys(message.technical_details).length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text mb-2"> Technical Details</h4>
                  <div className="bg-panel border border-border rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(message.technical_details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted">{key}:</span>
                          <span className="text-text font-mono">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>
          ) : (
            /* Fallback to original content display */
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">AI Analysis</h3>
              </div>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </section>
          )}

          {/* Related Events with Full Details */}
          {relatedEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">Related Events ({relatedEvents.length})</h3>
              </div>
              <div className="space-y-4">
                {relatedEvents.map((event, idx) => (
                  <div
                    key={`${event.timestamp}-${idx}`}
                    className="bg-panel border border-panel-hover rounded-lg p-4 hover:border-info/30 transition-colors"
                  >
                    {/* Event Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getSeverityColor(event.anomaly_score || 0)}`}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-text">
                              {dayjs(event.timestamp).format('HH:mm:ss')}
                            </span>
                            <span className="badge badge-info text-xs">
                              {event.proto}
                            </span>
                          </div>
                          <p className="text-xs text-muted">
                            {dayjs(event.timestamp).fromNow()}
                          </p>
                        </div>
                      </div>
                      {event.anomaly_score && event.anomaly_score > 0.3 && (
                        <div className="text-right">
                          <p className="text-xs text-muted mb-1">Anomaly Score</p>
                          <p className={`text-sm font-bold font-mono ${
                            event.anomaly_score >= 0.9 ? 'text-error' :
                            event.anomaly_score >= 0.7 ? 'text-warning' : 'text-yellow-500'
                          }`}>
                            {event.anomaly_score.toFixed(2)}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Summary */}
                    <div className="bg-base/50 p-3 rounded border border-border mb-3">
                      <p className="text-sm text-text leading-relaxed">
                        {event.summary || 'No summary available'}
                      </p>
                    </div>

                    {/* Connection Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-base/30 p-3 rounded">
                        <p className="text-xs text-muted mb-1">Source</p>
                        <p className="text-sm text-text font-mono font-semibold break-all">{event.src}</p>
                        {event.src_port && (
                          <p className="text-xs text-muted mt-1">Port: {event.src_port}</p>
                        )}
                      </div>
                      <div className="bg-base/30 p-3 rounded">
                        <p className="text-xs text-muted mb-1">Destination</p>
                        <p className="text-sm text-text font-mono font-semibold break-all">{event.dst}</p>
                        {event.dst_port && (
                          <p className="text-xs text-muted mt-1">Port: {event.dst_port}</p>
                        )}
                      </div>
                    </div>

                    {/* Metrics Grid */}
                    {(event.flows || event.throughput || event.packet_rate || event.byte_rate) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {event.flows && (
                          <div className="bg-base/30 p-2 rounded text-center">
                            <Hash className="w-3 h-3 text-info mx-auto mb-1" />
                            <p className="text-xs text-muted">Flows</p>
                            <p className="text-sm font-semibold text-text">{event.flows.toLocaleString()}</p>
                          </div>
                        )}
                        {event.throughput && (
                          <div className="bg-base/30 p-2 rounded text-center">
                            <Activity className="w-3 h-3 text-info mx-auto mb-1" />
                            <p className="text-xs text-muted">Throughput</p>
                            <p className="text-sm font-semibold text-text">{formatBytes(event.throughput)}</p>
                          </div>
                        )}
                        {event.packet_rate && (
                          <div className="bg-base/30 p-2 rounded text-center">
                            <TrendingUp className="w-3 h-3 text-info mx-auto mb-1" />
                            <p className="text-xs text-muted">Packets/s</p>
                            <p className="text-sm font-semibold text-text">{formatRate(event.packet_rate, 'p/s')}</p>
                          </div>
                        )}
                        {event.byte_rate && (
                          <div className="bg-base/30 p-2 rounded text-center">
                            <Target className="w-3 h-3 text-info mx-auto mb-1" />
                            <p className="text-xs text-muted">Byte Rate</p>
                            <p className="text-sm font-semibold text-text">{formatBytes(event.byte_rate)}/s</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Detection Methods */}
                    {event.detection_methods && event.detection_methods.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs text-muted mb-2 flex items-center gap-1">
                          <Shield className="w-3 h-3" />
                          Detection Methods
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {event.detection_methods.map((method) => (
                            <span
                              key={method}
                              className="text-xs px-2 py-1 bg-accent/10 text-accent rounded border border-accent/30"
                            >
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Metrics */}
                    {(event.z_score || event.iqr_multiplier || event.baseline_rate || event.current_rate) && (
                      <div className="grid grid-cols-2 gap-2">
                        {event.z_score && (
                          <div className="bg-base/30 p-2 rounded">
                            <p className="text-xs text-muted">Z-Score</p>
                            <p className="text-sm font-mono text-text">{event.z_score.toFixed(2)}</p>
                          </div>
                        )}
                        {event.iqr_multiplier && (
                          <div className="bg-base/30 p-2 rounded">
                            <p className="text-xs text-muted">IQR Multiplier</p>
                            <p className="text-sm font-mono text-text">{event.iqr_multiplier.toFixed(2)}</p>
                          </div>
                        )}
                        {event.baseline_rate && (
                          <div className="bg-base/30 p-2 rounded">
                            <p className="text-xs text-muted">Baseline Rate</p>
                            <p className="text-sm font-mono text-text">{event.baseline_rate.toFixed(2)}</p>
                          </div>
                        )}
                        {event.current_rate && (
                          <div className="bg-base/30 p-2 rounded">
                            <p className="text-xs text-muted">Current Rate</p>
                            <p className="text-sm font-mono text-text">{event.current_rate.toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Event References */}
          {message.event_ids.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">Referenced Event IDs</h3>
              </div>
              <div className="bg-panel border border-info/30 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {message.event_ids.map((eventId) => (
                    <span
                      key={eventId}
                      className="text-xs px-3 py-1.5 bg-base border border-info/30 rounded font-mono text-info"
                    >
                      {eventId}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-info/30 bg-panel flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-info text-base rounded-lg hover:bg-info-bright transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
