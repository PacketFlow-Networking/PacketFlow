import { useEffect, useRef } from 'react';
import { useStore } from '../context/store';
import type { ExpertiseLevel } from '../types';

/**
 * Hook for adaptive UI complexity management
 * Automatically tracks user interactions and adjusts UI complexity
 */
export function useAdaptiveUI() {
  const {
    userProfile,
    trackClickDepth,
    trackDetailViewTime,
    trackFilterComplexity,
    trackTerminologySearch,
    trackAdvancedFeatureUse,
    evaluateAndAdaptComplexity,
    setUIComplexityMode,
    getEffectiveComplexityLevel
  } = useStore();

  // Auto-evaluate complexity every 30 interactions
  useEffect(() => {
    if (userProfile.interaction_count % 30 === 0 && userProfile.interaction_count > 0) {
      evaluateAndAdaptComplexity();
    }
  }, [userProfile.interaction_count, evaluateAndAdaptComplexity]);

  // Get effective complexity level
  const complexityLevel = getEffectiveComplexityLevel();

  return {
    // Current state
    complexityLevel,
    uiMode: userProfile.ui_complexity_mode,
    isNovice: complexityLevel === 'novice',
    isIntermediate: complexityLevel === 'intermediate',
    isExpert: complexityLevel === 'expert',
    
    // Tracking functions
    trackClickDepth,
    trackDetailViewTime,
    trackFilterComplexity,
    trackTerminologySearch,
    trackAdvancedFeatureUse,
    
    // Manual control
    setComplexityMode: setUIComplexityMode,
    evaluateComplexity: evaluateAndAdaptComplexity,
  };
}

/**
 * Hook to track time spent viewing details
 * Usage: wrap around detail view component
 */
export function useDetailViewTracking(isOpen: boolean) {
  const startTimeRef = useRef<number | null>(null);
  const { trackDetailViewTime } = useStore();

  useEffect(() => {
    if (isOpen) {
      startTimeRef.current = Date.now();
    } else if (startTimeRef.current) {
      const duration = Date.now() - startTimeRef.current;
      // Only track if viewed for more than 1 second
      if (duration > 1000) {
        trackDetailViewTime(duration);
      }
      startTimeRef.current = null;
    }

    // Cleanup on unmount
    return () => {
      if (startTimeRef.current) {
        const duration = Date.now() - startTimeRef.current;
        if (duration > 1000) {
          trackDetailViewTime(duration);
        }
      }
    };
  }, [isOpen, trackDetailViewTime]);
}

/**
 * Hook to track click depth for interactions
 * Usage: increment on each nested interaction
 */
export function useClickDepthTracker() {
  const depthRef = useRef(0);
  const { trackClickDepth } = useStore();

  const incrementDepth = () => {
    depthRef.current += 1;
  };

  const resetDepth = () => {
    if (depthRef.current > 0) {
      trackClickDepth(depthRef.current);
    }
    depthRef.current = 0;
  };

  return {
    incrementDepth,
    resetDepth,
    currentDepth: depthRef.current
  };
}

/**
 * Calculate filter complexity score (0-10)
 * Based on number and types of filters applied
 */
export function calculateFilterComplexity(filters: {
  severity?: string[];
  protocol?: string[];
  minScore?: number;
  srcIP?: string;
  dstIP?: string;
  [key: string]: any;
}): number {
  let score = 0;

  // Base filters (1 point each)
  if (filters.severity && filters.severity.length > 0) score += 1;
  if (filters.protocol && filters.protocol.length > 0) score += 1;
  
  // Advanced filters (2 points each)
  if (filters.minScore !== undefined && filters.minScore > 0) score += 2;
  if (filters.srcIP) score += 2;
  if (filters.dstIP) score += 2;

  // Multiple selections (bonus points)
  if (filters.severity && filters.severity.length > 2) score += 1;
  if (filters.protocol && filters.protocol.length > 2) score += 1;

  // Complex combinations (bonus)
  const activeFilters = Object.values(filters).filter(v => 
    v !== undefined && v !== null && v !== '' && 
    (Array.isArray(v) ? v.length > 0 : true)
  ).length;
  
  if (activeFilters >= 3) score += 2;
  if (activeFilters >= 5) score += 2;

  return Math.min(10, score);
}

/**
 * Adaptive UI display helper
 * Returns visibility flags based on complexity level
 */
export function useAdaptiveDisplay() {
  const { complexityLevel } = useAdaptiveUI();

  return {
    // Novice: Hide advanced features
    showAdvancedFilters: complexityLevel !== 'novice',
    showRawData: complexityLevel === 'expert',
    showTechnicalDetails: complexityLevel !== 'novice',
    showTooltips: complexityLevel === 'novice',
    showSimplifiedView: complexityLevel === 'novice',
    
    // Field visibility
    showZScores: complexityLevel === 'expert',
    showDetectionMethods: complexityLevel !== 'novice',
    showBehavioralMetrics: complexityLevel !== 'novice',
    showStatisticalData: complexityLevel === 'expert',
    
    // Control visibility
    showAdvancedActions: complexityLevel !== 'novice',
    showBulkOperations: complexityLevel === 'expert',
    showExportOptions: complexityLevel !== 'novice',
    
    // Layout preferences
    preferCompactView: complexityLevel === 'expert',
    preferDetailedView: complexityLevel === 'novice',
    autoExpandDetails: complexityLevel === 'novice',
  };
}

/**
 * Get UI labels based on complexity level
 */
export function useAdaptiveLabels() {
  const { complexityLevel } = useAdaptiveUI();

  if (complexityLevel === 'novice') {
    return {
      anomalyScore: 'Threat Level',
      flows: 'Connections',
      proto: 'Protocol',
      throughput: 'Data Rate',
      detectionMethods: 'How Detected',
      severity: 'Risk Level',
      src: 'Source',
      dst: 'Destination',
    };
  }

  if (complexityLevel === 'intermediate') {
    return {
      anomalyScore: 'Anomaly Score',
      flows: 'Flow Count',
      proto: 'Protocol',
      throughput: 'Throughput',
      detectionMethods: 'Detection Methods',
      severity: 'Severity',
      src: 'Source IP',
      dst: 'Destination IP',
    };
  }

  // Expert
  return {
    anomalyScore: 'Score (σ)',
    flows: 'Flows',
    proto: 'Proto',
    throughput: 'B/s',
    detectionMethods: 'Methods',
    severity: 'Sev',
    src: 'Src',
    dst: 'Dst',
  };
}

/**
 * Export all hooks and utilities
 */
export default useAdaptiveUI;
