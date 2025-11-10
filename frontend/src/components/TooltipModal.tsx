import { useState } from 'react';
import { X, Info } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import type { NetworkEvent } from '../types';

dayjs.extend(relativeTime);

interface TooltipModalProps {
  event: NetworkEvent | null;
  onClose: () => void;
  aiSummary?: string;
}

const TooltipModal = ({ event, onClose, aiSummary }: TooltipModalProps) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!event) return null;

  const getSeverityColor = (score: number) => {
    if (score >= 0.8) return 'critical';
    if (score >= 0.5) return 'warn';
    return 'info';
  };

  const severityColor = getSeverityColor(event.anomaly_score);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="panel max-w-2xl w-full mx-4 p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Info className={`w-5 h-5 text-${severityColor}`} />
            <div>
              <h3 className="text-lg font-semibold text-text">Event Details</h3>
              <p className="text-sm text-text-dim">
                {dayjs(event.timestamp).fromNow()}  {dayjs(event.timestamp).format('HH:mm:ss')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-panel-hover rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-text-dim" />
          </button>
        </div>

        {/* Summary */}
        <div className="mb-4 p-4 bg-base rounded-lg border border-border">
          <p className="text-text leading-relaxed">{event.summary}</p>
        </div>

        {/* AI Summary if available */}
        {aiSummary && (
          <div className="mb-4 p-4 bg-info/10 rounded-lg border border-info/30">
            <div className="flex items-start gap-2 mb-2">
              <span className="badge badge-info">AI Insight</span>
            </div>
            <p className="text-text text-sm leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-base rounded border border-border">
            <p className="text-xs text-text-dim mb-1">Source  Destination</p>
            <p className="text-sm font-mono text-text break-all">
              {event.src}  {event.dst}
            </p>
          </div>
          <div className="p-3 bg-base rounded border border-border">
            <p className="text-xs text-text-dim mb-1">Protocol</p>
            <p className="text-sm font-semibold text-text">{event.proto}</p>
          </div>
          <div className="p-3 bg-base rounded border border-border">
            <p className="text-xs text-text-dim mb-1">Flow Count</p>
            <p className="text-sm font-semibold text-text">{event.flows}</p>
          </div>
          <div className="p-3 bg-base rounded border border-border">
            <p className="text-xs text-text-dim mb-1">Anomaly Score</p>
            <p className={`text-sm font-bold text-${severityColor}`}>
              {(event.anomaly_score * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Optional detailed metrics */}
        {(event.avg_size || event.throughput) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {event.avg_size && (
              <div className="p-3 bg-base rounded border border-border">
                <p className="text-xs text-text-dim mb-1">Avg Packet Size</p>
                <p className="text-sm text-text">{event.avg_size.toFixed(0)} bytes</p>
              </div>
            )}
            {event.throughput && (
              <div className="p-3 bg-base rounded border border-border">
                <p className="text-xs text-text-dim mb-1">Throughput</p>
                <p className="text-sm text-text">{(event.throughput / 1024).toFixed(2)} KB/s</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="btn-secondary text-sm"
          >
            {showDetails ? 'Hide' : 'View'} Evidence
          </button>
          <span className="text-xs text-text-dim">Event ID: {event.id}</span>
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="mt-4 p-4 bg-base rounded-lg border border-border">
            <p className="text-xs text-text-dim mb-2">Raw Event Data</p>
            <pre className="text-xs font-mono text-text overflow-x-auto scrollbar">
              {JSON.stringify(event, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TooltipModal;
