import { X, Clock, Activity, AlertTriangle, Network, TrendingUp, Hash, Target, Shield, Zap, CheckCircle, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NetworkEvent, AIMessage } from '../../types';
import { useToast } from '../../context/ToastContext';
import { useStore } from '../../context/store';
import AIExplanationPanel from '../panels/AIExplanationPanel';
import ExpandableText from '../shared/ExpandableText';
import FeedbackPanel from '../panels/FeedbackPanel';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAdaptiveDisplay, useAdaptiveLabels, useDetailViewTracking } from '../../hooks/useAdaptiveUI';

dayjs.extend(relativeTime);

interface EventDetailsModalProps {
  event: NetworkEvent | null;
  isOpen: boolean;
  onClose: () => void;
  relatedEvents?: NetworkEvent[];
}

export const EventDetailsModal = ({ event, isOpen, onClose, relatedEvents = [] }: EventDetailsModalProps) => {
  const { showSuccess, showError } = useToast();
  const { aiMessages } = useStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis'>('overview');
  
  // Adaptive UI
  const adaptiveDisplay = useAdaptiveDisplay();
  const adaptiveLabels = useAdaptiveLabels();
  useDetailViewTracking(isOpen);
  
  // Find AI analysis for this event
  const aiAnalysis = aiMessages.find(msg => 
    msg.event_ids?.includes(event?.id || '') && msg.structured_analysis
  ) as AIMessage | undefined;
  
  // Handle escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  
  if (!isOpen || !event) return null;

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'text-critical border-critical/30 bg-critical/10';
    if (score >= 0.5) return 'text-warn border-warn/30 bg-warn/10';
    if (score >= 0.3) return 'text-yellow-500 border-yellow-500/30 bg-yellow-500/10';
    return 'text-ok border-ok/30 bg-ok/10';
  };

  const getThreatLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      critical: 'text-critical bg-critical/10 border-critical/30',
      high: 'text-warn bg-warn/10 border-warn/30',
      medium: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30',
      low: 'text-ok bg-ok/10 border-ok/30',
      info: 'text-info bg-info/10 border-info/30'
    };
    return colors[level] || colors.info;
  };

  const getCVSSColor = (score: number) => {
    if (score >= 9.0) return 'text-critical bg-critical/10';
    if (score >= 7.0) return 'text-warn bg-warn/10';
    if (score >= 4.0) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-ok bg-ok/10';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatRate = (rate: number, unit: string) => {
    return `${rate.toLocaleString()} ${unit}`;
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal */}
      <div 
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel shadow-2xl flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getSeverityColor(event.anomaly_score)}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text">Event Details</h2>
                <p className="text-sm text-text-dim">
                  {dayjs(event.timestamp).fromNow()}
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 rounded-lg hover:bg-panel-hover transition-colors"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar p-6 space-y-6">
            {/* Summary */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">Summary</h3>
              </div>
              <div className="bg-panel-hover p-4 rounded-lg border border-border">
                <ExpandableText 
                  text={event.summary} 
                  maxLength={200}
                  className="text-text-dim"
                />
              </div>
            </section>

            {/* Connection Details */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Network className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">Connection</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Source</p>
                  <p className="text-text font-mono font-semibold">{event.src}</p>
                  {event.src_port && (
                    <p className="text-xs text-text-dim mt-1">Port: {event.src_port}</p>
                  )}
                </div>
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Destination</p>
                  <p className="text-text font-mono font-semibold">{event.dst}</p>
                  {event.dst_port && (
                    <p className="text-xs text-text-dim mt-1">Port: {event.dst_port}</p>
                  )}
                </div>
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Protocol</p>
                  <span className="badge badge-info text-sm">{event.proto}</span>
                </div>
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Timestamp</p>
                  <p className="text-text text-sm">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            </section>

            {/* Anomaly Analysis */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">
                  {adaptiveDisplay.showSimplifiedView ? 'Threat Assessment' : 'Anomaly Analysis'}
                </h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-text-dim">{adaptiveLabels.anomalyScore}</p>
                    <span className={`badge ${getSeverityColor(event.anomaly_score)}`}>
                      {(event.anomaly_score * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-panel-hover rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        event.anomaly_score >= 0.8
                          ? 'bg-critical'
                          : event.anomaly_score >= 0.5
                          ? 'bg-warn'
                          : 'bg-ok'
                      }`}
                      style={{ width: `${event.anomaly_score * 100}%` }}
                    />
                  </div>
                  {adaptiveDisplay.showTooltips && (
                    <p className="text-xs text-text-dim mt-2">
                      {event.anomaly_score >= 0.8 
                        ? 'High risk - immediate attention needed' 
                        : event.anomaly_score >= 0.5 
                        ? 'Medium risk - should be investigated'
                        : 'Low risk - monitor activity'}
                    </p>
                  )}
                </div>

                {adaptiveDisplay.showZScores && event.z_score !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Z-Score</p>
                    <p className="text-2xl font-bold text-text">{event.z_score.toFixed(2)}</p>
                    <p className="text-xs text-text-dim mt-1">
                      {event.z_score > 3 ? 'Very unusual' : event.z_score > 2 ? 'Unusual' : 'Normal'}
                    </p>
                  </div>
                )}

                {adaptiveDisplay.showStatisticalData && event.iqr_multiplier !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">IQR Multiplier</p>
                    <p className="text-2xl font-bold text-text">{event.iqr_multiplier.toFixed(2)}</p>
                    <p className="text-xs text-text-dim mt-1">
                      {event.iqr_multiplier > 3 ? 'Outlier' : 'Within range'}
                    </p>
                  </div>
                )}
              </div>

              {/* Detection Methods */}
              {adaptiveDisplay.showDetectionMethods && event.detection_methods && event.detection_methods.length > 0 && (
                <div className="mt-4 panel p-4">
                  <p className="text-xs text-text-dim mb-2">
                    {adaptiveDisplay.showSimplifiedView ? 'How This Was Detected' : adaptiveLabels.detectionMethods}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.detection_methods.map((method, idx) => (
                      <span 
                        key={idx} 
                        className="badge badge-info text-xs"
                        title={adaptiveDisplay.showTooltips ? `Detection method: ${method}` : undefined}
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Behavioral Metrics */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-info" />
                <h3 className="font-semibold text-text">Behavioral Metrics</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="panel p-4">
                  <p className="text-xs text-text-dim mb-1">Total Flows</p>
                  <p className="text-2xl font-bold text-text">{event.flows.toLocaleString()}</p>
                </div>

                {event.packet_rate !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Packet Rate</p>
                    <p className="text-xl font-bold text-text">
                      {formatRate(event.packet_rate, 'pps')}
                    </p>
                  </div>
                )}

                {event.byte_rate !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Byte Rate</p>
                    <p className="text-xl font-bold text-text">
                      {formatBytes(event.byte_rate)}/s
                    </p>
                  </div>
                )}

                {event.avg_size !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Avg Packet Size</p>
                    <p className="text-xl font-bold text-text">{formatBytes(event.avg_size)}</p>
                  </div>
                )}

                {event.throughput !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Total Throughput</p>
                    <p className="text-xl font-bold text-text">{formatBytes(event.throughput)}</p>
                  </div>
                )}

                {event.unique_ports !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Unique Ports</p>
                    <p className="text-2xl font-bold text-text">{event.unique_ports}</p>
                  </div>
                )}

                {event.connection_attempts !== undefined && (
                  <div className="panel p-4">
                    <p className="text-xs text-text-dim mb-1">Connection Attempts</p>
                    <p className="text-2xl font-bold text-text">{event.connection_attempts}</p>
                  </div>
                )}
              </div>

              {/* Baseline Comparison */}
              {event.baseline_rate !== undefined && event.current_rate !== undefined && (
                <div className="mt-4 panel p-4">
                  <p className="text-xs text-text-dim mb-3">Rate Comparison</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-text-dim mb-1">Baseline Rate</p>
                      <p className="text-lg font-semibold text-text">
                        {event.baseline_rate.toLocaleString()} pps
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-dim mb-1">Current Rate</p>
                      <p className="text-lg font-semibold text-warn">
                        {event.current_rate.toLocaleString()} pps
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-text-dim mb-1">Deviation</p>
                    <p className="text-lg font-bold text-critical">
                      {((event.current_rate / event.baseline_rate) * 100 - 100).toFixed(1)}% above baseline
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* AI Explanation - IUI Enhancement */}
            {event.anomaly_score > 0.5 && (
              <section>
                <AIExplanationPanel event={event} />
              </section>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-info" />
                  <h3 className="font-semibold text-text">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, idx) => (
                    <span key={idx} className="badge badge-ok text-xs">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Related Events */}
            {relatedEvents.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-info" />
                  <h3 className="font-semibold text-text">Related Events</h3>
                  <span className="badge badge-info text-xs">{relatedEvents.length}</span>
                </div>
                <div className="space-y-2">
                  {relatedEvents.slice(0, 5).map((relEvent) => (
                    <div
                      key={relEvent.id}
                      className="panel p-3 hover:bg-panel-hover transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text font-medium truncate">
                            {relEvent.src}  {relEvent.dst}
                          </p>
                          <p className="text-xs text-text-dim mt-1">{relEvent.summary}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className={`badge text-xs ${getSeverityColor(relEvent.anomaly_score)}`}>
                            {(relEvent.anomaly_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-text-dim mt-2">
                        {dayjs(relEvent.timestamp).fromNow()}
                      </p>
                    </div>
                  ))}
                  {relatedEvents.length > 5 && (
                    <p className="text-xs text-text-dim text-center py-2">
                      +{relatedEvents.length - 5} more related events
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* User Feedback - IUI Feature */}
            {event.anomaly_score > 0.3 && (
              <section>
                <FeedbackPanel event={event} />
              </section>
            )}

            {/* Event ID */}
            <section>
              <div className="panel p-3 bg-panel-hover">
                <p className="text-xs text-text-dim mb-1">Event ID</p>
                <p className="text-xs font-mono text-text break-all">{event.id}</p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Close
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(JSON.stringify(event, null, 2));
                  showSuccess('Copied!', 'Event data copied to clipboard');
                } catch (error) {
                  showError('Failed to copy', 'Could not copy to clipboard');
                }
              }}
              className="btn btn-primary"
            >
              Copy JSON
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
