import { useEffect, useCallback } from 'react';
import { useStore } from '../context/store';
import type { SystemStatus } from '../types';

const API_BASE = 'http://localhost:8000';  // Direct URL instead of proxy
const STATUS_POLL_INTERVAL = 3000; // 3 seconds

export const useApi = () => {
  const { updateStatus, setConnected, mockMode } = useStore();

  const getStatus = useCallback(async (): Promise<SystemStatus | null> => {
    if (mockMode) {
      // Return mock status and mark as connected
      setConnected(true);
      const mockStatus: SystemStatus = {
        packets_per_sec: Math.floor(Math.random() * 1000) + 500,
        active_flows: Math.floor(Math.random() * 50) + 20,
        anomalies_per_min: Math.random() * 3,
        uptime_seconds: Math.floor(Date.now() / 1000)
      };
      return mockStatus;
    }

    try {
      const response = await fetch(`${API_BASE}/status`);
      if (!response.ok) {
        throw new Error(`Status fetch failed: ${response.status}`);
      }
      const data = await response.json();
      
      // Successfully connected to backend
      setConnected(true);
      
      // Transform backend response to match frontend types
      const status: SystemStatus = {
        packets_per_sec: data.total_packets || data.packets_per_sec || 0,
        active_flows: data.active_flows || 0,
        anomalies_per_min: data.total_anomalies || data.anomalies_per_min || 0,
        uptime_seconds: data.uptime_seconds || 0
      };
      
      return status;
    } catch (error) {
      console.error('[API] Status fetch error:', error);
      // Failed to reach backend
      setConnected(false);
      return null;
    }
  }, [mockMode, setConnected]);

  const queryAI = useCallback(async (question: string): Promise<string | null> => {
    if (mockMode) {
      // Return mock AI response
      await new Promise(resolve => setTimeout(resolve, 1000));
      return `[MOCK] This is a simulated AI response to: "${question}". The backend is not connected. Enable the backend to get real AI insights.`;
    }

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: question })  // Changed 'question' to 'query'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // Query endpoint not implemented
          return `[INFO] Query endpoint not available yet. Backend is running in monitoring mode.`;
        }
        if (response.status === 503) {
          // AI agent not available
          return `[INFO] AI agent is currently unavailable. Please make sure Ollama is running or remote AI is configured.`;
        }
        throw new Error(`Query failed: ${response.status}`);
      }
      
      const data = await response.json();
      // The new unified response includes 'response' field
      return data.response || data.answer || null;
    } catch (error) {
      console.error('[API] Query error:', error);
      return `[INFO] Could not reach backend. Make sure backend is running on ${API_BASE}`;
    }
  }, [mockMode]);

  // Poll status periodically
  useEffect(() => {
    const pollStatus = async () => {
      const status = await getStatus();
      if (status) {
        updateStatus(status);
      }
    };

    // Initial fetch
    pollStatus();

    // Set up interval
    const intervalId = setInterval(pollStatus, STATUS_POLL_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [getStatus, updateStatus]);

  return {
    getStatus,
    queryAI
  };
};
