import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../context/store';
import { useToast } from '../context/ToastContext';
import type { NetworkEvent, AIMessage } from '../types';

const WS_URL = 'ws://localhost:8000/ws/updates';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  
  const { 
    addEvent, 
    addAIMessage, 
    setConnected,
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
            
            // Create NetworkEvent with required fields
            const networkEvent: NetworkEvent = {
              id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            
            // Show toast for critical anomalies
            if (eventData.anomaly_score >= 0.8) {
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
        
        // Attempt reconnection
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          console.log(`[WebSocket] Reconnecting in ${RECONNECT_DELAY}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, RECONNECT_DELAY);
        } else {
          console.log('[WebSocket] Max reconnection attempts reached');
          showError(
            'Connection Failed',
            'Unable to connect to backend after multiple attempts. Please check if the server is running.',
            false
          );
        }
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
    }
    return false;
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
