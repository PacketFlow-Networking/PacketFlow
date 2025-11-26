"""API layer - FastAPI application with REST endpoints and WebSocket support."""

from .websocket_server import WebSocketServer

__all__ = ["WebSocketServer"]
