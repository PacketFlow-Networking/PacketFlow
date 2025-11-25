"""
main.py - Enhanced PacketFlow Backend Entry Point
Features: metrics, security, task restart, monitoring, resilience
"""

import asyncio
import logging
import sys
from pathlib import Path

import uvicorn

from core.capture import PacketCapture
from core.condense import FlowCondenser
from core.ai import AIAgent
from api.websocket_server import WebSocketServer
from config import config, validate_config
from infrastructure.tasks import run_with_restart, task_monitor
from observability import packets_captured, packets_dropped, active_flows, warmup_complete
from persistence import Database, initialize_database, get_db


# Configure logging
log_level = getattr(logging, config.server.log_level.upper())
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(config.server.log_file) if config.server.log_file else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)


class PacketFlowBackend:
    """Enhanced main backend orchestrator with monitoring and resilience."""
    
    def __init__(self):
        """Initialize backend with configuration from config module."""
        
        # Initialize queues
        self.packet_queue = asyncio.Queue(maxsize=1000)
        self.event_queue = asyncio.Queue(maxsize=100)
        self.output_queue = asyncio.Queue(maxsize=100)
        
        # Database will be initialized in start()
        self.database = None
        
        # Initialize components
        self.capture = PacketCapture(
            interface=config.capture.interface,
            mock_mode=config.capture.mock_mode,
            pcap_file=config.capture.pcap_file,
            pcap_loop=config.capture.pcap_loop,
            pcap_speed=config.capture.pcap_speed,
            capture_filter=config.capture.filter
        )
        
        self.condenser = FlowCondenser(
            window_size=config.condenser.window_size,
            anomaly_threshold=config.condenser.anomaly_threshold,
            min_flows_for_alert=config.condenser.min_flows_for_alert
        )
        
        # Initialize AI agent with enhanced features
        self.ai_agent = AIAgent(
            mode=config.ai.mode,
            # Local settings
            ollama_url=config.ai.ollama_url,
            local_model=config.ai.local_model,
            # Remote settings
            remote_url=config.ai.remote_url,
            remote_model=config.ai.remote_model,
            remote_websearch=config.ai.remote_websearch,
            remote_client_rag=config.ai.remote_client_rag,
            # Common settings
            timeout=config.ai.timeout,
            max_tokens=config.ai.max_tokens,
            system_prompt=config.ai.system_prompt
        )
        
        self.websocket_server = WebSocketServer()
        
        # Link components to server for stats and monitoring
        self.websocket_server.capture = self.capture
        self.websocket_server.condenser = self.condenser
        self.websocket_server.ai_agent = self.ai_agent
        self.websocket_server.packet_queue = self.packet_queue
        self.websocket_server.event_queue = self.event_queue
        self.websocket_server.output_queue = self.output_queue
        
    async def update_metrics(self):
        """Periodically update Prometheus metrics from components."""
        logger.info("Starting metrics updater...")
        
        while True:
            try:
                await asyncio.sleep(5)
                
                # Update packet capture metrics
                if self.capture:
                    packets_captured.labels(
                        interface=config.capture.interface
                    ).inc(self.capture.packet_count)
                    
                    if self.capture.packets_dropped > 0:
                        packets_dropped.labels(
                            interface=config.capture.interface
                        ).inc(self.capture.packets_dropped)
                        self.capture.packets_dropped = 0
                
                # Update condenser metrics
                if self.condenser:
                    active_flows.set(len(self.condenser.flows))
                    warmup_complete.set(1 if self.condenser.is_warmed_up else 0)
                
            except Exception as e:
                logger.error(f"Error updating metrics: {e}")
    
    async def start(self):
        """Start all backend components with resilience and monitoring."""
        logger.info("=" * 80)
        logger.info(" Starting PacketFlow Backend (Enhanced)")
        logger.info("=" * 80)
        
        # Print configuration
        logger.info(f" Capture Interface: {config.capture.interface}")
        logger.info(f" Mock Mode: {config.capture.mock_mode}")
        logger.info(f" AI Mode: {config.ai.mode.upper()}")
        logger.info(f" AI Model: {config.ai.current_model}")
        logger.info(f" AI URL: {config.ai.current_url}")
        logger.info(f"  Server: http://{config.server.host}:{config.server.port}")
        logger.info(f" Metrics: http://{config.server.host}:{config.server.port}/metrics")
        logger.info(f" Database: {config.database}")
        logger.info("=" * 80)
        
        # Initialize database
        self.database = await initialize_database(
            db_path=config.database.path,
            enabled=config.database.enabled,
            retention_days=config.database.retention_days,
            batch_size=config.database.batch_size
        )
        
        # Link database to WebSocket server for API access
        self.websocket_server.database = self.database
        
        # Initialize AI agent
        await self.ai_agent.initialize()
        
        # Create background tasks with auto-restart
        tasks = []
        
        # Capture task
        task = asyncio.create_task(
            run_with_restart(
                self.capture.start_capture,
                "packet_capture",
                3,  # max_retries
                self.packet_queue
            ),
            name="packet_capture"
        )
        tasks.append(task)
        task_monitor.register("packet_capture", task)
        
        # Condenser task
        task = asyncio.create_task(
            run_with_restart(
                self.condenser.process_packets,
                "flow_condenser",
                3,  # max_retries
                self.packet_queue,
                self.event_queue
            ),
            name="flow_condenser"
        )
        tasks.append(task)
        task_monitor.register("flow_condenser", task)
        
        # AI agent task
        task = asyncio.create_task(
            run_with_restart(
                self.ai_agent.process_events,
                "ai_agent",
                3,  # max_retries
                self.event_queue,
                self.output_queue
            ),
            name="ai_agent"
        )
        tasks.append(task)
        task_monitor.register("ai_agent", task)
        
        # WebSocket streaming task
        task = asyncio.create_task(
            run_with_restart(
                self.websocket_server.stream_events,
                "websocket_server",
                3,  # max_retries
                self.output_queue
            ),
            name="websocket_server"
        )
        tasks.append(task)
        task_monitor.register("websocket_server", task)
        
        # Queue monitor task
        task = asyncio.create_task(
            self.websocket_server.start_queue_monitor(),
            name="queue_monitor"
        )
        tasks.append(task)
        task_monitor.register("queue_monitor", task)
        
        # Metrics updater task
        task = asyncio.create_task(
            self.update_metrics(),
            name="metrics_updater"
        )
        tasks.append(task)
        task_monitor.register("metrics_updater", task)
        
        # Database cleanup task
        if config.database.enabled:
            task = asyncio.create_task(
                self.database.start_cleanup_task(
                    interval_hours=config.database.cleanup_interval_hours
                ),
                name="db_cleanup"
            )
            tasks.append(task)
            task_monitor.register("db_cleanup", task)
        
        # Task health monitor
        task = asyncio.create_task(
            task_monitor.monitor(check_interval=30),
            name="task_monitor"
        )
        tasks.append(task)
        
        logger.info(" All components started successfully")
        logger.info("=" * 80)
        
        # Run FastAPI server
        config_uvicorn = uvicorn.Config(
            self.websocket_server.get_app(),
            host=config.server.host,
            port=config.server.port,
            log_level=config.server.log_level.lower(),
            access_log=config.server.debug
        )
        server = uvicorn.Server(config_uvicorn)
        
        # Run server and tasks concurrently
        try:
            await server.serve()
        except KeyboardInterrupt:
            logger.info("\n Shutdown signal received...")
        finally:
            # Cleanup
            logger.info(" Cleaning up resources...")
            for task in tasks:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
            
            await self.capture.stop()
            await self.ai_agent.close()
            
            if self.database:
                await self.database.close()
            
            logger.info(" Backend stopped gracefully")


async def main():
    """Main entry point."""
    # Validate configuration
    if not validate_config():
        logger.error(" Configuration validation failed. Please fix errors in .env file.")
        sys.exit(1)
    
    # Create and start backend
    backend = PacketFlowBackend()
    await backend.start()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("\n Shutdown complete")
    except Exception as e:
        logger.error(f" Fatal error: {e}", exc_info=True)
        sys.exit(1)
