/**
 * Graph Configuration
 * 
 * Memory-efficient configuration for the network activity timeline graph.
 * All timing values are in milliseconds unless otherwise specified.
 */

export const GRAPH_CONFIG = {
  /**
   * Maximum number of data points to keep in memory and display.
   * Each point represents one time bucket.
   * 
   * Examples:
   * - 60 points  10s buckets = 10 minutes of history
   * - 120 points  5s buckets = 10 minutes of history
   * - 180 points  10s buckets = 30 minutes of history
   * 
   * Memory impact: ~100 bytes per point = ~6KB for 60 points
   */
  MAX_POINTS: 60,

  /**
   * Time bucket size in milliseconds.
   * Events within the same bucket are aggregated together.
   * 
   * Smaller buckets = more detail but more memory usage
   * Larger buckets = less detail but more memory efficient
   * 
   * Recommended: 5000-15000 (5-15 seconds)
   */
  BUCKET_SIZE_MS: 10000,

  /**
   * How long to retain data in memory (milliseconds).
   * Data older than this is automatically purged.
   * 
   * Should be >= MAX_POINTS  BUCKET_SIZE_MS
   * 
   * Examples:
   * - 600000 = 10 minutes
   * - 1800000 = 30 minutes
   * - 3600000 = 1 hour
   */
  RETENTION_MS: 600000,

  /**
   * Maximum number of anomaly markers to display on the graph.
   * More markers = more visual clutter
   */
  MAX_ANOMALY_MARKERS: 15,

  /**
   * Minimum anomaly score (0-1) to display as a marker
   */
  ANOMALY_THRESHOLD: 0.5,

  /**
   * Anomaly score threshold for "critical" severity
   */
  CRITICAL_THRESHOLD: 0.8,
} as const;

/**
 * Calculate memory footprint
 */
export const estimateMemoryUsage = () => {
  const bytesPerPoint = 100; // Approximate
  const bytesPerMarker = 80; // Approximate
  
  const dataPoints = GRAPH_CONFIG.MAX_POINTS * bytesPerPoint;
  const markers = GRAPH_CONFIG.MAX_ANOMALY_MARKERS * bytesPerMarker;
  
  const totalBytes = dataPoints + markers;
  const totalKB = (totalBytes / 1024).toFixed(2);
  
  return {
    dataPointsKB: (dataPoints / 1024).toFixed(2),
    markersKB: (markers / 1024).toFixed(2),
    totalKB,
    totalMB: (totalBytes / 1024 / 1024).toFixed(3)
  };
};

/**
 * Validate configuration
 */
export const validateConfig = () => {
  const minRetention = GRAPH_CONFIG.MAX_POINTS * GRAPH_CONFIG.BUCKET_SIZE_MS;
  
  if (GRAPH_CONFIG.RETENTION_MS < minRetention) {
    console.warn(
      `[GraphConfig] RETENTION_MS (${GRAPH_CONFIG.RETENTION_MS}ms) is less than ` +
      `MAX_POINTS  BUCKET_SIZE_MS (${minRetention}ms). ` +
      `This may cause data loss.`
    );
  }
  
  if (GRAPH_CONFIG.MAX_POINTS > 200) {
    console.warn(
      `[GraphConfig] MAX_POINTS (${GRAPH_CONFIG.MAX_POINTS}) is very high. ` +
      `This may impact performance on slower devices.`
    );
  }
  
  if (GRAPH_CONFIG.BUCKET_SIZE_MS < 1000) {
    console.warn(
      `[GraphConfig] BUCKET_SIZE_MS (${GRAPH_CONFIG.BUCKET_SIZE_MS}ms) is very small. ` +
      `This may create excessive data points.`
    );
  }
};

// Run validation on import (development only)
if (import.meta.env.DEV) {
  validateConfig();
  const memory = estimateMemoryUsage();
  console.log('[GraphConfig] Estimated memory usage:', memory);
}
