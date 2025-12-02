import { useState } from 'react';
import { Send, X, Loader } from 'lucide-react';
import type { NetworkEvent } from '../../types';

interface QueryEventModalProps {
  event: NetworkEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onQuery: (query: string, eventId?: string) => Promise<void>;
  isLoading?: boolean;
}

export const QueryEventModal = ({ event, isOpen, onClose, onQuery, isLoading = false }: QueryEventModalProps) => {
  const [query, setQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    try {
      await onQuery(query, event?.id);
      setQuery('');
      // Don't close automatically - let user see the response
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-panel rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text">
            {event ? 'Ask About This Event' : 'Ask About Network Traffic'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-dim hover:text-text transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {event ? (
            <div className="mb-4 p-3 bg-base rounded border border-border">
              <p className="text-sm text-text-dim mb-2">About this event:</p>
              <div className="space-y-1 text-sm">
                <p className="text-text">
                  <span className="text-text-dim">From:</span> {event.src}
                </p>
                <p className="text-text">
                  <span className="text-text-dim">To:</span> {event.dst}
                </p>
                <p className="text-text">
                  <span className="text-text-dim">Protocol:</span> {event.proto}
                </p>
                {event.anomaly_score > 0 && (
                  <p className="text-text">
                    <span className="text-text-dim">Anomaly Score:</span> {(event.anomaly_score * 100).toFixed(0)}%
                  </p>
                )}
                <p className="text-text truncate">
                  <span className="text-text-dim">Time:</span> {new Date(event.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-base rounded border border-border">
              <p className="text-sm text-text">
                Ask any question about current network traffic, anomalies, or detection patterns.
              </p>
            </div>
          )}

          {/* Example Queries */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-text-dim uppercase mb-2">Example questions:</p>
            <div className="space-y-2 text-xs">
              {event ? (
                <>
                  <p className="text-text-dim">
                    • Why is this event flagged as anomalous?
                  </p>
                  <p className="text-text-dim">
                    • What could this traffic pattern indicate?
                  </p>
                  <p className="text-text-dim">
                    • Is this a known attack signature?
                  </p>
                </>
              ) : (
                <>
                  <p className="text-text-dim">
                    • What are the most critical anomalies right now?
                  </p>
                  <p className="text-text-dim">
                    • Summarize recent network activity
                  </p>
                  <p className="text-text-dim">
                    • Are there any port scan attempts detected?
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input Form */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={event ? 'Ask about this event...' : 'Ask about network traffic...'}
              className="flex-1 px-3 py-2 bg-base border border-border rounded text-text placeholder-text-dim focus:outline-none focus:border-info text-sm"
              disabled={isSubmitting || isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!query.trim() || isSubmitting || isLoading}
              className="px-3 py-2 bg-info text-white rounded hover:bg-info/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
              aria-label="Send query"
            >
              {isSubmitting || isLoading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QueryEventModal;
