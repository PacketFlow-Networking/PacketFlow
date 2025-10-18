"""
websocket_server.py - Enhanced FastAPI WebSocket and REST API server
Features: real-time streaming, security, monitoring, rate limiting, health checks
"""

import asyncio
import logging
from typing import Dict, Set, Optional
from datetime import datetime
import os
import time

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Security, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field, validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Import metrics
from metrics import (
    websocket_clients, websocket_messages_sent, http_requests,
    http_request_duration, queue_depth, get_metrics_text, get_metrics_content_type
)

logger = logging.getLogger(__name__)


# Pydantic Models for Request Validation
class QueryEventRequest(BaseModel):
    """Request model for querying AI about an event"""
    event: dict = Field(..., description="Event data to query about")
    question: Optional[str] = Field(None, description="Specific question about the event")
    
    @validator('event')
    def validate_event(cls, v):
        required = ['src', 'dst', 'proto']
        if not all(k in v for k in required):
            raise ValueError(f"Event must contain: {required}")
        return v


# API Key Security
API_KEY = os.getenv("API_KEY", "change-me-in-production")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """Verify API key for protected endpoints"""
    if not api_key:
        raise HTTPException(status_code=403, detail="API key required")
    if api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key


class WebSocketServer:
    """Enhanced FastAPI server with security, monitoring, and resilience."""
    
    def __init__(self):
        """Initialize FastAPI application."""
        self.app = FastAPI(
            title="AINetUI Backend",
            description="AI-Augmented Network Analysis Interface",
            version="1.0.0"
        )
        
        # Rate limiter
        self.limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
        self.app.state.limiter = self.limiter
        self.app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
        
        # CORS - Configure for production
        cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000')
        origins_list = [origin.strip() for origin in cors_origins.split(',')]
        
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=origins_list,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Connected WebSocket clients
        self.active_connections: Set[WebSocket] = set()
        
        # System statistics
        self.stats = {
            "start_time": datetime.now().isoformat(),
            "total_events": 0,
            "total_anomalies": 0,
            "packet_rate": 0,
            "connected_clients": 0
        }
        
        # References to other components (set by main.py)
        self.capture = None
        self.condenser = None
        self.ai_agent = None
        self.packet_queue = None
        self.event_queue = None
        self.output_queue = None
        
        # Setup routes
        self._setup_routes()
    
    def _setup_routes(self):
        """Setup FastAPI routes with security and monitoring."""
        
        # Middleware for request timing
        @self.app.middleware("http")
        async def add_process_time_header(request: Request, call_next):
            start_time = time.time()
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Record metrics
            http_request_duration.labels(
                endpoint=request.url.path,
                method=request.method
            ).observe(process_time)
            
            http_requests.labels(
                endpoint=request.url.path,
                method=request.method,
                status=response.status_code
            ).inc()
            
            response.headers["X-Process-Time"] = str(process_time)
            return response
        
        @self.app.get("/")
        async def root():
            """Public root endpoint."""
            return {
                "service": "AINetUI Backend",
                "status": "running",
                "version": "1.0.0",
                "timestamp": datetime.now().isoformat(),
                "documentation": "/docs"
            }
        
        @self.app.get("/status")
        async def get_status():
            """Get system status and statistics."""
            # Update stats from components
            if self.capture:
                self.stats["total_packets"] = self.capture.packet_count
                self.stats["packets_dropped"] = self.capture.packets_dropped
            
            if self.condenser:
                condenser_stats = self.condenser.get_stats()
                self.stats["total_events"] = condenser_stats["condensed_events"]
                self.stats["total_anomalies"] = condenser_stats["anomalies_detected"]
                self.stats["active_flows"] = condenser_stats["active_flows"]
                self.stats["warmup_complete"] = condenser_stats["warmup_complete"]
            
            if self.ai_agent:
                ai_stats = self.ai_agent.get_stats()
                self.stats["ai_queries"] = ai_stats["queries_processed"]
                self.stats["ai_errors"] = ai_stats["errors"]
                self.stats["ai_model"] = ai_stats["model"]
                self.stats["ai_mode"] = ai_stats["mode"]
                self.stats["ai_incidents"] = ai_stats.get("incidents_detected", 0)
            
            # Queue depths
            if self.packet_queue:
                self.stats["packet_queue_depth"] = self.packet_queue.qsize()
            if self.event_queue:
                self.stats["event_queue_depth"] = self.event_queue.qsize()
            if self.output_queue:
                self.stats["output_queue_depth"] = self.output_queue.qsize()
            
            self.stats["connected_clients"] = len(self.active_connections)
            self.stats["timestamp"] = datetime.now().isoformat()
            
            # Calculate uptime
            start_time = datetime.fromisoformat(self.stats["start_time"])
            uptime = (datetime.now() - start_time).total_seconds()
            self.stats["uptime_seconds"] = int(uptime)
            
            return JSONResponse(content=self.stats)
        
        @self.app.get("/health/live")
        async def liveness():
            """Kubernetes liveness probe - is process alive?"""
            return {"status": "ok", "timestamp": datetime.now().isoformat()}
        
        @self.app.get("/health/ready")
        async def readiness():
            """Kubernetes readiness probe - is system ready for traffic?"""
            checks = {}
            
            # Check if capture is running
            if self.capture:
                checks["capture"] = "ok" if self.capture.packet_count > 0 else "starting"
            
            # Check queue health
            if self.packet_queue:
                packet_qsize = self.packet_queue.qsize()
                checks["packet_queue"] = "ok" if packet_qsize < 900 else "saturated"
            
            # Check AI availability
            if self.ai_agent:
                checks["ai"] = "ok"
            
            # Overall status
            is_ready = all(v == "ok" for v in checks.values())
            
            return {
                "status": "ready" if is_ready else "not_ready",
                "checks": checks,
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/health/startup")
        async def startup():
            """Kubernetes startup probe - has initialization completed?"""
            if hasattr(self, 'condenser') and self.condenser and self.condenser.is_warmed_up:
                return {
                    "status": "started",
                    "warmup_complete": True,
                    "timestamp": datetime.now().isoformat()
                }
            return {
                "status": "starting",
                "warmup_complete": False,
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/metrics")
        async def metrics():
            """Prometheus metrics endpoint (public for scraping)."""
            # Update gauges before scraping
            websocket_clients.set(len(self.active_connections))
            
            if self.packet_queue:
                queue_depth.labels(queue='packet').set(self.packet_queue.qsize())
            if self.event_queue:
                queue_depth.labels(queue='event').set(self.event_queue.qsize())
            if self.output_queue:
                queue_depth.labels(queue='output').set(self.output_queue.qsize())
            
            return Response(content=get_metrics_text(), media_type=get_metrics_content_type())
        
        @self.app.get("/test-event")
        async def test_event():
            """Send a test event to all connected WebSocket clients."""
            test_event_data = {
                "timestamp": datetime.now().isoformat(),
                "src": "192.168.1.100",
                "dst": "8.8.8.8",
                "proto": "UDP",
                "flows": 50,
                "total_packets": 50,
                "total_bytes": 5000,
                "avg_packet_size": 100,
                "is_anomaly": True,
                "anomaly_score": 0.85,
                "severity": "high",
                "summary": "TEST EVENT: High DNS traffic detected",
                "ai_explanation": "This is a test event to verify the WebSocket connection is working correctly.",
                "ai_processed": True
            }
            
            await self.broadcast_event(test_event_data)
            
            return {
                "status": "sent",
                "clients": len(self.active_connections),
                "message": "Test event broadcast to all connected clients"
            }
        
        @self.app.post("/query-event")
        @self.limiter.limit("10/minute")
        async def query_event(request: Request, query_req: QueryEventRequest):
            """
            Ask AI about a specific event (rate limited).
            
            Rate limit: 10 requests per minute per IP
            """
            try:
                if not self.ai_agent:
                    raise HTTPException(status_code=503, detail="AI agent not available")
                
                # Query AI
                response = await self.ai_agent.query_event(query_req.event, query_req.question)
                
                return {
                    "answer": response,
                    "event_id": query_req.event.get("timestamp"),
                    "ai_mode": self.ai_agent.mode,
                    "timestamp": datetime.now().isoformat()
                }
                
            except HTTPException:
                raise
            except Exception as e:
                logger.error(f"Query event error: {e}")
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.websocket("/ws/updates")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for streaming updates."""
            await self.connect(websocket)
            try:
                # Keep connection alive
                while True:
                    try:
                        data = await asyncio.wait_for(
                            websocket.receive_text(),
                            timeout=30.0
                        )
                        
                        # Handle client messages
                        if data == "ping":
                            await websocket.send_text("pong")
                            
                    except asyncio.TimeoutError:
                        # Send keepalive
                        await websocket.send_json({
                            "type": "keepalive",
                            "timestamp": datetime.now().isoformat()
                        })
                        websocket_messages_sent.labels(message_type='keepalive').inc()
                        
            except WebSocketDisconnect:
                self.disconnect(websocket)
                logger.info(f"Client disconnected. Active connections: {len(self.active_connections)}")
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                self.disconnect(websocket)
    
    async def connect(self, websocket: WebSocket):
        """Accept new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        websocket_clients.set(len(self.active_connections))
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")
        
        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to AINetUI Backend",
            "timestamp": datetime.now().isoformat()
        })
        websocket_messages_sent.labels(message_type='connected').inc()
    
    def disconnect(self, websocket: WebSocket):
        """Remove disconnected WebSocket."""
        self.active_connections.discard(websocket)
        websocket_clients.set(len(self.active_connections))
    
    async def broadcast_event(self, event: Dict):
        """Broadcast event to all connected WebSocket clients."""
        if not self.active_connections:
            return
        
        # Prepare message
        message = {
            "type": "network_event",
            "data": event,
            "timestamp": datetime.now().isoformat()
        }
        
        # Send to all clients
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
                websocket_messages_sent.labels(message_type='network_event').inc()
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)
        
        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)
    
    async def stream_events(self, output_queue: asyncio.Queue):
        """Stream events from output queue to WebSocket clients."""
        logger.info("WebSocket event streaming started...")
        
        while True:
            try:
                # Get event from queue
                event = await output_queue.get()
                
                # Broadcast to all connected clients
                await self.broadcast_event(event)
                
            except Exception as e:
                logger.error(f"Error streaming event: {e}")
                await asyncio.sleep(0.1)
    
    async def start_queue_monitor(self):
        """Monitor queue depths and log warnings."""
        logger.info("Starting queue depth monitor...")
        while True:
            try:
                await asyncio.sleep(5)
                
                if self.packet_queue:
                    packet_depth = self.packet_queue.qsize()
                    if packet_depth > 800:  # 80% capacity
                        logger.warning(f"Packet queue near capacity: {packet_depth}/1000")
                
                if self.event_queue:
                    event_depth = self.event_queue.qsize()
                    if event_depth > 80:  # 80% capacity
                        logger.warning(f"Event queue saturated: {event_depth}/100")
                
                if self.output_queue:
                    output_depth = self.output_queue.qsize()
                    if output_depth > 80:
                        logger.warning(f"Output queue saturated: {output_depth}/100")
                
            except Exception as e:
                logger.error(f"Error in queue monitor: {e}")
    
    def get_app(self) -> FastAPI:
        """Get FastAPI application instance."""
        return self.app
