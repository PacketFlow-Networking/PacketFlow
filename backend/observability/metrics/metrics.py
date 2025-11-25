"""
metrics.py - Prometheus metrics for AINetUI
Provides comprehensive observability for all system components.
"""

from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Packet Capture Metrics
packets_captured = Counter(
    'ainetui_packets_total', 
    'Total packets captured',
    ['interface']
)

packets_dropped = Counter(
    'ainetui_packets_dropped_total', 
    'Packets dropped by TShark',
    ['interface']
)

# Flow Condensation Metrics
events_condensed = Counter(
    'ainetui_events_total', 
    'Total condensed events emitted'
)

anomalies_detected = Counter(
    'ainetui_anomalies_total', 
    'Anomalies detected by severity',
    ['severity']
)

active_flows = Gauge(
    'ainetui_active_flows', 
    'Current number of active flows'
)

baseline_entries = Gauge(
    'ainetui_baseline_entries',
    'Number of flow baselines tracked'
)

# AI Agent Metrics
ai_requests = Counter(
    'ainetui_ai_requests_total', 
    'AI analysis requests',
    ['mode', 'status']
)

ai_latency = Histogram(
    'ainetui_ai_latency_seconds', 
    'AI response time in seconds',
    ['mode'],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

ai_cache_hits = Counter(
    'ainetui_ai_cache_hits_total',
    'AI response cache hits'
)

ai_cache_misses = Counter(
    'ainetui_ai_cache_misses_total',
    'AI response cache misses'
)

# Queue Metrics
queue_depth = Gauge(
    'ainetui_queue_depth', 
    'Current queue depth',
    ['queue']
)

queue_saturations = Counter(
    'ainetui_queue_saturations_total',
    'Queue saturation events (>90% full)',
    ['queue']
)

# WebSocket Metrics
websocket_clients = Gauge(
    'ainetui_websocket_clients', 
    'Number of connected WebSocket clients'
)

websocket_messages_sent = Counter(
    'ainetui_websocket_messages_total',
    'Total WebSocket messages sent',
    ['message_type']
)

# API Metrics
http_requests = Counter(
    'ainetui_http_requests_total',
    'HTTP requests by endpoint',
    ['endpoint', 'method', 'status']
)

http_request_duration = Histogram(
    'ainetui_http_request_duration_seconds',
    'HTTP request duration',
    ['endpoint', 'method'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
)

# System Health Metrics
system_errors = Counter(
    'ainetui_errors_total',
    'System errors by component',
    ['component', 'error_type']
)

task_restarts = Counter(
    'ainetui_task_restarts_total',
    'Background task restarts',
    ['task_name']
)

warmup_complete = Gauge(
    'ainetui_warmup_complete',
    'Whether the system has completed warmup (0=no, 1=yes)'
)


def get_metrics_text():
    """Get metrics in Prometheus text format"""
    return generate_latest()


def get_metrics_content_type():
    """Get the content type for Prometheus metrics"""
    return CONTENT_TYPE_LATEST
