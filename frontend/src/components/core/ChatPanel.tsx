import { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown, Bot, User, HelpCircle } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStore, getAllMessages } from '../../context/store';
import { useApi } from '../../hooks/useApi';
import ExpandableText from '../shared/ExpandableText';
import AIDetailsModal from '../modals/AIDetailsModal';
import type { AIMessage, UserMessage, NetworkEvent } from '../../types';

dayjs.extend(relativeTime);

const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AIMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    addUserMessage, 
    addAIMessage, 
    feedback, 
    setFeedback,
    focusedMessageId,
    selectedEventId,
    events
  } = useStore();
  
  const { queryAI, analyzeEvent } = useApi();
  const messages = useStore(getAllMessages);
  
  // Get selected event if any
  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  // Get related events for a message
  // Match events by their IDs stored in message.event_ids
  const getRelatedEvents = (message: AIMessage): NetworkEvent[] => {
    if (message.event_ids.length === 0) return [];
    return events.filter(event => 
      message.event_ids.includes(event.id)
    ).slice(0, 10); // Limit to 10 most recent
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (focusedMessageId) {
      const element = document.getElementById(`message-${focusedMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-info');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-info');
        }, 2000);
      }
    }
  }, [focusedMessageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage: UserMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      content: input.trim(),
      type: 'user'
    };

    addUserMessage(userMessage);
    
    // Build query with event context if available
    let query = input.trim();
    if (selectedEvent) {
      query = `[About this event - From: ${selectedEvent.src}, To: ${selectedEvent.dst}, Protocol: ${selectedEvent.proto}, Score: ${(selectedEvent.anomaly_score * 100).toFixed(0)}%] ${input.trim()}`;
    }
    
    setInput('');
    setIsSubmitting(true);

    try {
      // Query AI via REST endpoint
      // The backend will:
      // 1. Process query through AI agent with event context
      // 2. Broadcast response via WebSocket (handled by useWebSocket)
      // 3. Also return to us here
      const response = await queryAI(query);
      
      // Note: The WebSocket will receive the full structured response
      // with linked event_ids automatically. This fallback is only
      // for HTTP-only clients or when WebSocket is disconnected.
      if (response && !response.startsWith('[MOCK]') && !response.startsWith('[INFO]')) {
        // Response received via HTTP but not yet via WebSocket
        // This is rare but can happen during network issues
        console.log('[Chat] HTTP response received, WebSocket should also deliver it');
      }
    } catch (error) {
      console.error('Query error:', error);
    } finally {
      setIsSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleFeedback = (messageId: string, rating: 'up' | 'down') => {
    const currentRating = feedback[messageId];
    setFeedback(messageId, currentRating === rating ? null : rating);
  };

  const handleAnalyzeSelectedEvent = async () => {
    if (!selectedEvent || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const analysis = await analyzeEvent(selectedEvent);
      
      if (analysis) {
        // Create structured AI message with explainability
        const aiMessage: AIMessage = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          content: analysis.summary || 'Analysis completed',
          event_ids: [selectedEvent.id],
          type: 'response',
          brief_summary: analysis.brief_summary,
          structured_analysis: {
            brief_summary: analysis.brief_summary,
            summary: analysis.summary,
            what_happened: analysis.what_happened,
            why_suspicious: analysis.why_suspicious,
            detection_method: analysis.detection_method,
            attack_context: analysis.attack_context,
            threat_indicators: analysis.threat_indicators,
            recommendations: analysis.recommendations,
            technical_details: analysis.technical_details,
            threat_level: analysis.threat_level,
            cvss_score: analysis.cvss_score,
            risk_score: analysis.risk_score,
            mitre_attack_stages: analysis.mitre_attack_stages,
            affected_assets: analysis.affected_assets,
            compliance_implications: analysis.compliance_implications,
            forensic_chain: analysis.forensic_chain,
            investigation_checklist: analysis.investigation_checklist,
            false_positive_indicators: analysis.false_positive_indicators
          },
          confidence: analysis.confidence > 0.8 ? 'high' :
                     analysis.confidence > 0.5 ? 'medium' : 'low'
        };
        
        addAIMessage(aiMessage);
        
        // Auto-open the details modal
        setSelectedMessage(aiMessage);
      }
    } catch (error) {
      console.error('[Chat] Analyze event error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMessage = (message: AIMessage | UserMessage) => {
    const isUser = message.type === 'user';
    const isAI = !isUser;
    const aiMessage = isAI ? (message as AIMessage) : null;

    return (
      <div
        key={message.id}
        id={`message-${message.id}`}
        className={`flex gap-3 p-4 rounded-lg transition-all ${
          isUser ? 'bg-panel' : 'bg-panel-hover'
        }`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-info/20' : 'bg-ok/20'
        }`}>
          {isUser ? <User className="w-5 h-5 text-info" /> : <Bot className="w-5 h-5 text-ok" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-text">
              {isUser ? 'You' : 'AI Assistant'}
            </span>
            <span className="text-xs text-text-dim">
              {dayjs(message.timestamp).format('HH:mm:ss')}
            </span>
            {aiMessage?.confidence && (
              <span className={`badge ${
                aiMessage.confidence === 'high' ? 'badge-ok' :
                aiMessage.confidence === 'medium' ? 'badge-info' : 'badge-warn'
              }`}>
                {aiMessage.confidence}
              </span>
            )}
          </div>

          {/* Display brief_summary if available, otherwise fallback to content */}
          {aiMessage?.brief_summary ? (
            <div 
              className="text-text text-sm leading-relaxed cursor-pointer hover:text-info transition-colors"
              onClick={() => setSelectedMessage(aiMessage)}
            >
              {aiMessage.brief_summary}
              <span className="text-xs text-info ml-2"> View details</span>
            </div>
          ) : (
            <ExpandableText 
              text={message.content}
              maxLength={200}
              className="text-text text-sm leading-relaxed"
              onShowMore={aiMessage ? () => setSelectedMessage(aiMessage) : undefined}
            />
          )}

          {aiMessage && (
            <div className="mt-3 flex items-center gap-3">
              {aiMessage.event_ids.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <HelpCircle className="w-4 h-4 text-text-dim" />
                  <span className="text-xs text-text-dim">References:</span>
                  {aiMessage.event_ids.slice(0, 3).map(eventId => (
                    <button
                      key={eventId}
                      className="text-xs px-2 py-1 bg-base rounded hover:bg-panel-hover transition-colors text-info border border-info/30"
                    >
                      {eventId.slice(-8)}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => handleFeedback(message.id, 'up')}
                  className={`p-1 rounded transition-colors ${
                    feedback[message.id] === 'up' ? 'bg-ok/20 text-ok' : 'text-text-dim hover:text-ok'
                  }`}
                  title="Helpful"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleFeedback(message.id, 'down')}
                  className={`p-1 rounded transition-colors ${
                    feedback[message.id] === 'down' ? 'bg-critical/20 text-critical' : 'text-text-dim hover:text-critical'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-ok" />
              <h2 className="text-lg font-semibold text-text">AI Assistant</h2>
            </div>
            <p className="text-sm text-text-dim mt-1">
              Ask questions about network activity and anomalies
            </p>
          </div>
          
          {/* Analyze Selected Event Button */}
          {selectedEvent && (
            <button
              onClick={handleAnalyzeSelectedEvent}
              disabled={isSubmitting}
              className="px-3 py-2 bg-accent hover:bg-accent-hover text-text-dark rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Analyze selected event with AI"
            >
              <Bot className="w-4 h-4" />
              Analyze Event
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-text-dim mb-4" />
            <p className="text-text mb-2">Welcome to PacketFlow</p>
            <p className="text-sm text-text-dim max-w-md">
              I'm your AI assistant for network analysis. Ask me about traffic patterns, 
              anomalies, or specific events.
            </p>
          </div>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="p-4 border-t border-border">
        {selectedEvent && (
          <div className="mb-3 p-2 bg-info/10 rounded border border-info/30 text-xs">
            <p className="text-info font-semibold mb-1">📌 Event Context Active</p>
            <p className="text-text-dim">
              {selectedEvent.src} → {selectedEvent.dst} ({selectedEvent.proto})
              {selectedEvent.anomaly_score > 0 && ` • Score: ${(selectedEvent.anomaly_score * 100).toFixed(0)}%`}
            </p>
            <p className="text-text-dim text-xs mt-1">Your questions will reference this event.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedEvent ? "Ask about this event..." : "Ask about network activity..."}
            className="input flex-1"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="btn-primary px-4"
          >
            {isSubmitting ? <span></span> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>

      {/* AI Details Modal */}
      {selectedMessage && (
        <AIDetailsModal
          message={selectedMessage}
          relatedEvents={getRelatedEvents(selectedMessage)}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
};

export default ChatPanel;
