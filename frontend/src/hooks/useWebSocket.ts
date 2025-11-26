import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../context/store';
import { useToast } from '../context/ToastContext';
import type { NetworkEvent, AIMessage } from '../types';

// Use environment variable or fallback to localhost
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/updates';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]); // Queue for pending messages
  
  const { 
    addEvent, 
    addAIMessage, 
    setConnected,
    selectEvent,
    mockMode 
  } = useStore();
  
  const { showError, showWarning, showSuccess, showInfo } = useToast();

  const connect = useCallback(() => {
    // Always connect to backend, even in mock mode
    // Backend will handle mock data generation

    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        
        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          if (queuedMessage) {
            ws.send(JSON.stringify(queuedMessage));
            console.log('[WebSocket] Sent queued message');
          }
        }
        
        // Show success toast on connection
        if (reconnectAttemptsRef.current > 0) {
          showSuccess('Connected', 'Successfully reconnected to backend', true);
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[WebSocket] Received:', message);
          
          // Handle different message types from backend
          if (message.type === 'connected' || message.type === 'keepalive') {
            // Connection/keepalive messages
            console.log('[WebSocket]', message.message || 'Keepalive');
            return;
          }
          
          if (message.type === 'network_event' && message.data) {
            // Network event from backend
            const eventData = message.data;
            
            // Create NetworkEvent with required fields using cryptographically unique ID
            const networkEvent: NetworkEvent = {
              id: `evt-${crypto.randomUUID()}`, // Collision-resistant unique identifier
              timestamp: eventData.timestamp || new Date().toISOString(),
              src: eventData.src || 'unknown',
              dst: eventData.dst || 'unknown',
              proto: eventData.proto || eventData.protocol || 'UNKNOWN',
              flows: eventData.flows || eventData.total_packets || 0,
              avg_size: eventData.avg_packet_size || 0,
              throughput: eventData.total_bytes || 0,
              anomaly_score: eventData.anomaly_score || 0,
              summary: eventData.summary || eventData.ai_explanation || 'Network activity detected'
            };
            
            addEvent(networkEvent);
            
            // Show toast for critical anomalies and auto-select event
            if (eventData.anomaly_score >= 0.8) {
              selectEvent(networkEvent.id); // Auto-select event for easy access
              showWarning(
                'Critical Anomaly Detected',
                `${eventData.src}  ${eventData.dst}: ${eventData.summary || 'High anomaly score'}`,
                true // Play sound
              );
            }
            
            // If there's AI explanation, add it as AI message
            if (eventData.ai_explanation && eventData.ai_processed) {
              const aiMessage: AIMessage = {
                id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                content: eventData.ai_explanation,
                event_ids: [networkEvent.id],
                type: eventData.is_anomaly ? 'warning' : 'insight',
                confidence: eventData.anomaly_score > 0.8 ? 'high' : 
                           eventData.anomaly_score > 0.5 ? 'medium' : 'low'
              };
              addAIMessage(aiMessage);
            }
          }
          else if (message.type === 'ai_chat_response' && message.data) {
            // NEW: Handle unified AI chat responses with event context
            const responseData = message.data;
            
            const aiMessage: AIMessage = {
              id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: responseData.timestamp || new Date().toISOString(),
              content: responseData.response || 'No response',
              event_ids: responseData.event_ids || [],  // ← Now has linked events!
              type: responseData.error ? 'warning' : 'insight',
              confidence: responseData.confidence || 'medium'
            };
            
            addAIMessage(aiMessage);
            
            console.log(`[WebSocket] AI response linked to ${aiMessage.event_ids.length} events`);
          }
        } catch (error) {
          console.error('[WebSocket] Message parsing error:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        wsRef.current = null;
        
        // Show disconnection toast
        if (reconnectAttemptsRef.current === 0) {
          showInfo('Disconnected', 'Lost connection to backend. Attempting to reconnect...');
        }
        
        // Attempt reconnection with exponential backoff
        // Keep retrying indefinitely with 30s interval after initial max attempts
        const nextDelay = reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS 
          ? RECONNECT_DELAY 
          : 30000; // 30s retry after max attempts reached
        
        reconnectAttemptsRef.current++;
        console.log(`[WebSocket] Reconnecting in ${nextDelay}ms (attempt ${reconnectAttemptsRef.current})`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          // Reset counter when reconnecting to allow next batch of exponential backoff
          if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS - 1;
          }
          connect();
        }, nextDelay);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnected(false);
    }
  }, [addEvent, addAIMessage, setConnected, mockMode]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
  }, [setConnected]);

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      // Queue message if still connecting
      messageQueueRef.current.push(data);
      return false; // Indicate queued, not sent immediately
    } else {
      // Queue for next connection
      messageQueueRef.current.push(data);
      return false;
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    send,
    reconnect: connect
  };
};
