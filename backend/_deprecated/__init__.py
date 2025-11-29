"""
Deprecated Files
================

This directory contains the original, non-reorganized versions of backend files.
These files are kept for reference during the migration period.

DO NOT USE - Import from the reorganized modules instead:
- config.py  from config import config
- capture.py  from core.capture import PacketCapture
- condense_enhanced.py  from core.condense import FlowCondenser
- ai_agent.py  from core.ai import AIAgent
- websocket_server.py  from api import WebSocketServer
- database.py  from persistence import Database
- task_manager.py  from infrastructure import run_with_restart, task_monitor
- metrics.py  from observability import packets_captured

These files will be removed in the next version once all references are migrated.
"""

__all__ = []
