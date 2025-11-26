"""Observability layer - metrics, logging, and health checks."""

# Import everything from metrics subpackage
from .metrics import (  # noqa: F401
    packets_captured, packets_dropped, active_flows, baseline_entries,
    anomalies_detected, events_condensed, ai_requests, ai_latency, ai_cache_hits,
    websocket_clients, websocket_messages_sent, http_requests, http_request_duration,
    queue_depth, task_restarts, system_errors, warmup_complete,
    get_metrics_text, get_metrics_content_type
)

__all__ = [
    "packets_captured", "packets_dropped", "active_flows", "baseline_entries",
    "anomalies_detected", "events_condensed", "ai_requests", "ai_latency", "ai_cache_hits",
    "websocket_clients", "websocket_messages_sent", "http_requests", "http_request_duration",
    "queue_depth", "task_restarts", "system_errors", "warmup_complete",
    "get_metrics_text", "get_metrics_content_type"
]
