import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../context/store';
import { useToast } from '../context/ToastContext';
import type { NetworkEvent, AIMessage } from '../types';
import { evaluateRules, getActionsFromRules } from '../utils/ruleEvaluator';

// Use environment variable or fallback to localhost
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/updates';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;

export const useWebSocket = () => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const messageQueueRef = useRef<any[]>([]); // Queue for pending messages
  const hasConnectedOnceRef = useRef(false); // Track if we've connected before
  
  const { 
    addEvent, 
    addAIMessage, 
    setConnected,
    selectEvent,
    alertConfig
  } = useStore();
  
  const { showError, showWarning, showSuccess, showInfo } = useToast();

  const connect = useCallback(() => {
    // Connect to backend WebSocket for real-time updates
    // Backend captures from PCAP file or live network

    try {
      const ws = new WebSocket(WS_URL);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        const wasReconnect = hasConnectedOnceRef.current;
        hasConnectedOnceRef.current = true;
        reconnectAttemptsRef.current = 0;
        
        // Flush queued messages
        while (messageQueueRef.current.length > 0) {
          const queuedMessage = messageQueueRef.current.shift();
          if (queuedMessage) {
            ws.send(JSON.stringify(queuedMessage));
            console.log('[WebSocket] Sent queued message');
          }
        }
        
        // Show success toast on reconnection
        if (wasReconnect) {
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
            
            // Evaluate alert rules
            const matchedRules = evaluateRules(alertConfig.rules, networkEvent);
            const actions = getActionsFromRules(matchedRules);
            
            // Handle notify action from rules
            if (matchedRules.length > 0 && actions.includes('notify') && alertConfig.notifications.toast) {
              const highestRule = matchedRules.reduce((highest, rule) => {
                const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
                return severityOrder[rule.severity] > severityOrder[highest.severity] ? rule : highest;
              }, matchedRules[0]);
              
              const shouldPlaySound = actions.includes('sound') && alertConfig.notifications.sound;
              
              if (highestRule.severity === 'critical') {
                showWarning(
                  `Rule Triggered: ${highestRule.name}`,
                  `${networkEvent.src} → ${networkEvent.dst}: ${highestRule.description || networkEvent.summary}`,
                  shouldPlaySound
                );
              } else {
                showInfo(
                  `Alert: ${highestRule.name}`,
                  `${networkEvent.src} → ${networkEvent.dst}`,
                  shouldPlaySound
                );
              }
              
              selectEvent(networkEvent.id);
            }
            // Fallback to default anomaly detection
            else if (eventData.anomaly_score >= 0.8) {
              selectEvent(networkEvent.id); // Auto-select event for easy access
              showWarning(
                'Critical Anomaly Detected',
                `${eventData.src} → ${eventData.dst}: ${eventData.summary || 'High anomaly score'}`,
                true // Play sound
              );
            }
            
            // If there's AI explanation, add it as AI message
            if (eventData.ai_explanation && eventData.ai_processed) {
              // Check if we have structured analysis from Instructor
              const hasStructuredData = eventData.ai_analysis && typeof eventData.ai_analysis === 'object';
              
              const aiMessage: AIMessage = {
                id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                content: eventData.ai_explanation,
                event_ids: [networkEvent.id],
                type: eventData.is_anomaly ? 'warning' : 'insight',
                confidence: eventData.anomaly_score > 0.8 ? 'high' : 
                           eventData.anomaly_score > 0.5 ? 'medium' : 'low',
                brief_summary: eventData.summary,
                // Add structured analysis if available from Instructor
                ...(hasStructuredData && {
                  structured_analysis: eventData.ai_analysis
                })
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
              event_ids: responseData.event_ids || [],  //  Now has linked events!
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
        
        // Show disconnection toast only on first disconnect
        if (reconnectAttemptsRef.current === 0) {
          showInfo('Disconnected', 'Connection lost. Click the reconnect button to retry.');
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setConnected(false);
    }
  }, [addEvent, addAIMessage, setConnected]);

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

  const manualReconnect = useCallback(() => {
    // Clear any pending reconnect timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Reset reconnect attempts for manual reconnection
    reconnectAttemptsRef.current = 0;
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Attempt new connection
    connect();
  }, [connect]);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    send,
    reconnect: manualReconnect
  };
};
