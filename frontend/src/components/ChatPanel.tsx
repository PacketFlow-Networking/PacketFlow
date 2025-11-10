import { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown, Bot, User, HelpCircle, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStore, getAllMessages } from '../context/store';
import { useApi } from '../hooks/useApi';
import ExpandableText from './ExpandableText';
import AIDetailsModal from './AIDetailsModal';
import ProactiveSuggestions from './ProactiveSuggestions'; // H4-01: Move suggestions inside ChatPanel
import type { AIMessage, UserMessage, NetworkEvent } from '../types';

dayjs.extend(relativeTime);

const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<AIMessage | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    addUserMessage, 
    feedback, 
    setFeedback,
    focusedMessageId,
    events
  } = useStore();
  
  const { queryAI } = useApi();
  const messages = useStore(getAllMessages);

  // H9-02: Diagnostic function to test Ollama connection
  const testOllamaConnection = async () => {
    setIsDiagnosing(true);
    setDiagnosticResult(null);
    
    try {
      // Test if Ollama is reachable
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        const data = await response.json();
        const modelCount = data.models?.length || 0;
        setDiagnosticResult(`✓ Ollama is running! Found ${modelCount} model(s). Try your query again.`);
      } else {
        setDiagnosticResult(`✗ Ollama responded with status ${response.status}. Try restarting Ollama.`);
      }
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        setDiagnosticResult(`✗ Connection timed out. Ollama may be frozen. Try:\n1. Stop Ollama (Ctrl+C in terminal)\n2. Run: ollama serve\n3. Wait 5 seconds and test again`);
      } else {
        setDiagnosticResult(`✗ Cannot connect to Ollama at localhost:11434.\n\nNext steps:\n1. Open a terminal\n2. Run: ollama serve\n3. Wait for "Ollama is running" message\n4. Click "Test Connection" again`);
      }
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Get related events for a message
  // The backend now sends event timestamps in event_ids, so we match by timestamp first
  const getRelatedEvents = (message: AIMessage): NetworkEvent[] => {
    if (message.event_ids.length === 0) return [];
    return events.filter(event => 
      message.event_ids.includes(event.timestamp) || 
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
    setInput('');
    setIsSubmitting(true);

    try {
      // Query AI via REST endpoint
      // The backend will:
      // 1. Process query through AI agent with event context
      // 2. Broadcast response via WebSocket (handled by useWebSocket)
      // 3. Also return to us here
      const response = await queryAI(input.trim());
      
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

  const renderMessage = (message: AIMessage | UserMessage) => {
    const isUser = message.type === 'user';
    const isAI = !isUser;
    const aiMessage = isAI ? (message as AIMessage) : null;
    
    // H9-02: Detect Ollama error messages
    const isOllamaError = aiMessage && (
      message.content.includes('[ERROR_OLLAMA_CONNECTION]') ||
      message.content.includes('[ERROR_OLLAMA_TIMEOUT]')
    );
    const errorType = message.content.includes('[ERROR_OLLAMA_CONNECTION]') ? 'connection' : 
                      message.content.includes('[ERROR_OLLAMA_TIMEOUT]') ? 'timeout' : null;

    return (
      <div
        key={message.id}
        id={`message-${message.id}`}
        className={`flex gap-3 p-4 rounded-lg transition-all ${
          isUser ? 'bg-panel' : isOllamaError ? 'bg-critical/10 border border-critical/30' : 'bg-panel-hover'
        }`}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-info/20' : isOllamaError ? 'bg-critical/20' : 'bg-ok/20'
        }`}>
          {isUser ? <User className="w-5 h-5 text-info" /> : 
           isOllamaError ? <AlertTriangle className="w-5 h-5 text-critical" /> :
           <Bot className="w-5 h-5 text-ok" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-text">
              {isUser ? 'You' : isOllamaError ? 'AI Assistant (Error)' : 'AI Assistant'}
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

          <ExpandableText 
            text={message.content.replace(/\[ERROR_OLLAMA_CONNECTION\]|ERROR_OLLAMA_TIMEOUT\]/g, '')}
            maxLength={200}
            className="text-text text-sm leading-relaxed whitespace-pre-wrap"
            onShowMore={aiMessage && !isOllamaError ? () => setSelectedMessage(aiMessage) : undefined}
          />

          {/* H9-02: Diagnostic button for Ollama errors */}
          {isOllamaError && (
            <div className="mt-3 p-3 bg-base rounded border border-border">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text mb-1">
                    {errorType === 'connection' ? 'Connection Issue' : 'Timeout Issue'}
                  </p>
                  <p className="text-xs text-text-dim">
                    {errorType === 'connection' 
                      ? 'Cannot reach Ollama. It may not be running.'
                      : 'Ollama is not responding. It may be frozen or overloaded.'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={testOllamaConnection}
                disabled={isDiagnosing}
                className="btn-secondary w-full text-sm py-2 flex items-center justify-center gap-2"
              >
                {isDiagnosing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Test Ollama Connection
                  </>
                )}
              </button>
              
              {/* Show diagnostic result */}
              {diagnosticResult && (
                <div className={`mt-2 p-2 rounded text-xs ${
                  diagnosticResult.startsWith('✓') 
                    ? 'bg-ok/20 text-ok border border-ok/30' 
                    : 'bg-critical/20 text-critical border border-critical/30'
                }`}>
                  <div className="flex items-start gap-2">
                    {diagnosticResult.startsWith('✓') ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="whitespace-pre-wrap">{diagnosticResult}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {aiMessage && !isOllamaError && (
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
      {/* H4-01: Proactive Suggestions - Sticky at top with divider */}
      <div className="sticky top-0 z-10 bg-base border-b border-border">
        <div className="p-3">
          <ProactiveSuggestions />
        </div>
      </div>
      
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-ok" />
          <h2 className="text-lg font-semibold text-text">AI Assistant</h2>
        </div>
        <p className="text-sm text-text-dim mt-1">
          Ask questions about network activity and anomalies
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-16 h-16 text-text-dim mb-4" />
            <p className="text-text mb-2">Welcome to AINetUI</p>
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
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about network activity..."
            className="input flex-1"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="btn-primary px-4"
          >
            {isSubmitting ? <span>⏳</span> : <Send className="w-5 h-5" />}
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
