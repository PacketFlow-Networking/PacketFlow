import { useState, useRef, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown, Bot, User, HelpCircle } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useStore, getAllMessages } from '../context/store';
import { useApi } from '../hooks/useApi';
import type { AIMessage, UserMessage } from '../types';

dayjs.extend(relativeTime);

const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    addUserMessage, 
    addAIMessage, 
    feedback, 
    setFeedback,
    focusedMessageId,
    events
  } = useStore();
  
  const { queryAI } = useApi();
  const messages = useStore(getAllMessages);

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
      const response = await queryAI(input.trim());
      
      if (response) {
        const aiMessage: AIMessage = {
          id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
          content: response,
          event_ids: [],
          type: response.includes('[MOCK]') ? 'response' : 'insight',
          confidence: 'medium'
        };
        
        addAIMessage(aiMessage);
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

          <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>

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
            {isSubmitting ? <span></span> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
