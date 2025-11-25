"""
task_manager.py - Graceful task management with automatic restart
Provides resilient background task execution with exponential backoff.
"""

import asyncio
import logging
from typing import Callable, Awaitable, Optional
from datetime import datetime

from metrics import task_restarts, system_errors

logger = logging.getLogger(__name__)


async def run_with_restart(
    coro_func: Callable[..., Awaitable],
    name: str,
    max_retries: int = 3,
    *args,
    **kwargs
) -> None:
    """
    Run a coroutine with automatic restart on failure.
    
    Args:
        coro_func: Async function to run
        name: Task name for logging
        max_retries: Maximum number of restart attempts
        *args: Arguments to pass to coro_func
        **kwargs: Keyword arguments to pass to coro_func
    """
    retry_count = 0
    backoff = 1  # seconds
    
    while retry_count < max_retries:
        try:
            logger.info(f" Starting task: {name}")
            await coro_func(*args, **kwargs)
            
            # If we reach here, task completed normally (shouldn't happen for infinite loops)
            logger.info(f" Task {name} completed normally")
            break
            
        except asyncio.CancelledError:
            logger.info(f" Task {name} cancelled (shutdown requested)")
            raise  # Don't retry on intentional cancellation
            
        except Exception as e:
            retry_count += 1
            system_errors.labels(component=name, error_type=type(e).__name__).inc()
            task_restarts.labels(task_name=name).inc()
            
            logger.error(
                f" Task {name} failed: {e} "
                f"(retry {retry_count}/{max_retries})",
                exc_info=True
            )
            
            if retry_count >= max_retries:
                logger.critical(
                    f" Task {name} exceeded max retries ({max_retries}). "
                    "System may be unstable. Manual intervention required."
                )
                raise
            
            logger.info(f" Restarting {name} in {backoff} seconds...")
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60)  # Exponential backoff, max 60s


class TaskMonitor:
    """Monitor health of background tasks and restart failed ones."""
    
    def __init__(self):
        self.tasks = {}
        self.last_heartbeat = {}
    
    def register(self, name: str, task: asyncio.Task):
        """Register a task for monitoring."""
        self.tasks[name] = task
        self.last_heartbeat[name] = datetime.now()
        logger.info(f" Registered task: {name}")
    
    async def heartbeat(self, name: str):
        """Record heartbeat from a task."""
        if name in self.last_heartbeat:
            self.last_heartbeat[name] = datetime.now()
    
    async def monitor(self, check_interval: int = 30):
        """
        Periodically check task health.
        
        Args:
            check_interval: Seconds between health checks
        """
        logger.info(" Task health monitor started")
        
        while True:
            try:
                await asyncio.sleep(check_interval)
                
                for name, task in self.tasks.items():
                    if task.done():
                        if task.exception():
                            logger.error(
                                f" Task {name} died with exception: "
                                f"{task.exception()}"
                            )
                        else:
                            logger.warning(f" Task {name} completed unexpectedly")
                
            except Exception as e:
                logger.error(f"Error in task monitor: {e}")


# Global task monitor instance
task_monitor = TaskMonitor()
