import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../../context/store';
import type { NetworkEvent, EventFeedback, FeedbackLabel } from '../../types';

interface FeedbackPanelProps {
  event: NetworkEvent;
  onClose?: () => void;
}

export default function FeedbackPanel({ event, onClose }: FeedbackPanelProps) {
  const { eventFeedback, addEventFeedback } = useStore();
  const existingFeedback = eventFeedback[event.id];
  
  const [label, setLabel] = useState<FeedbackLabel | null>(existingFeedback?.user_label || null);
  const [comment, setComment] = useState(existingFeedback?.user_explanation || '');
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingFeedback);

  const handleRating = (newLabel: FeedbackLabel) => {
    setLabel(newLabel);
    setShowCommentBox(true);
  };

  const handleSubmit = () => {
    if (!label) return;

    const feedback: EventFeedback = {
      event_id: event.id,
      user_label: label,
      user_explanation: comment.trim() || undefined,
      timestamp: new Date().toISOString(),
      incorporated: false
    };

    addEventFeedback(feedback);
    setSubmitted(true);

    // Auto-close after 2 seconds if callback provided
    if (onClose) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  if (submitted && !showCommentBox) {
    return (
      <div className="bg-panel border border-success/30 rounded-lg p-4 flex items-center gap-3 animate-scale-in">
        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
        <div>
          <p className="text-sm text-text font-semibold">Thank you for your feedback!</p>
          <p className="text-xs text-muted mt-1">
            Your input helps improve our detection algorithms.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-info/30 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-info" />
        <h3 className="text-sm font-semibold text-text">Help Us Improve</h3>
      </div>

      {/* Rating Buttons */}
      {!submitted && (
        <div>
          <p className="text-xs text-muted mb-3">
            Was this detection accurate?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRating('true_positive')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition-all ${
                label === 'true_positive'
                  ? 'bg-success/20 border-success text-success'
                  : 'bg-base border-border text-muted hover:border-success/50 hover:text-success'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="text-sm font-medium">Accurate</span>
            </button>
            <button
              onClick={() => handleRating('false_positive')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-lg border transition-all ${
                label === 'false_positive'
                  ? 'bg-error/20 border-error text-error'
                  : 'bg-base border-border text-muted hover:border-error/50 hover:text-error'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="text-sm font-medium">False Alarm</span>
            </button>
          </div>
          <button
            onClick={() => handleRating('missed_detection')}
            className={`w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
              label === 'missed_detection'
                ? 'bg-warning/20 border-warning text-warning'
                : 'bg-base border-border text-muted hover:border-warning/50 hover:text-warning'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Missed Other Issues</span>
          </button>
        </div>
      )}

      {/* Comment Box */}
      {showCommentBox && (
        <div className="space-y-3 animate-slide-down">
          <div>
            <label className="text-xs text-muted mb-2 block">
              {label === 'true_positive' 
                ? 'Additional context? (optional)'
                : label === 'false_positive'
                ? 'Why is this a false positive?'
                : 'What threats were missed?'}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={label === 'true_positive'
                ? 'e.g., "This matches known attack pattern XYZ"'
                : label === 'false_positive'
                ? 'e.g., "This is normal backup traffic"'
                : 'e.g., "Port scan was not detected"'
              }
              className="w-full px-3 py-2 bg-base border border-border rounded-lg text-sm text-text placeholder-muted focus:border-info focus:outline-none resize-none"
              rows={3}
              disabled={submitted}
            />
          </div>

          {!submitted && (
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommentBox(false);
                  setLabel(null);
                  setComment('');
                }}
                className="px-4 py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!label}
                className="flex items-center gap-2 px-4 py-2 bg-info text-base rounded-lg hover:bg-info-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                <span className="text-sm font-medium">Submit</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Feedback Stats (if already submitted) */}
      {submitted && existingFeedback && (
        <div className="text-xs text-muted pt-3 border-t border-border">
          <p>Feedback submitted: {new Date(existingFeedback.timestamp).toLocaleString()}</p>
          {existingFeedback.user_explanation && (
            <p className="mt-1 italic">"{existingFeedback.user_explanation}"</p>
          )}
        </div>
      )}
    </div>
  );
}
