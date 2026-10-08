"""
Aegis Real-Time SSE Event Broadcaster
High-performance in-memory async event broker broadcasting live agent lifecycle
events (GOAL_RECEIVED, PLAN_CREATED, RISK_EVALUATED, EXECUTING, VERIFYING, etc.)
to frontend observers over Server-Sent Events (SSE).
"""
import asyncio
import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import AsyncGenerator, Deque, Dict, List, Optional, Set
from backend.app.schemas.audit import AgentEvent

logger = logging.getLogger(__name__)


class EventBroadcaster:
    def __init__(self, history_limit: int = 300, keepalive_seconds: float = 15.0):
        self._global_subscribers: Set[asyncio.Queue] = set()
        self._plan_subscribers: Dict[str, Set[asyncio.Queue]] = {}
        self._history: Deque[AgentEvent] = deque(maxlen=history_limit)
        self._keepalive_seconds = keepalive_seconds
        self._lock = asyncio.Lock()

    def get_history(self, plan_id: Optional[str] = None, limit: int = 100) -> List[AgentEvent]:
        """Retrieves recent in-memory event history, optionally filtered by plan_id."""
        events = list(self._history)
        if plan_id:
            events = [e for e in events if e.plan_id == plan_id]
        return events[-limit:]

    def broadcast(self, event: AgentEvent) -> None:
        """
        Synchronously and instantaneously distributes an event to all subscriber queues
        and stores it in the recent event ring-buffer.
        """
        self._history.append(event)

        # Broadcast to global subscribers
        dead_global = set()
        for q in self._global_subscribers:
            try:
                q.put_nowait(event)
            except asyncio.QueueFull:
                logger.warning("Subscriber queue full; dropping event for slow client")
            except Exception:
                dead_global.add(q)
        self._global_subscribers.difference_update(dead_global)

        # Broadcast to plan-specific subscribers
        if event.plan_id and event.plan_id in self._plan_subscribers:
            dead_plan = set()
            for q in self._plan_subscribers[event.plan_id]:
                try:
                    q.put_nowait(event)
                except asyncio.QueueFull:
                    logger.warning(f"Plan subscriber queue full for plan {event.plan_id}")
                except Exception:
                    dead_plan.add(q)
            self._plan_subscribers[event.plan_id].difference_update(dead_plan)

    async def publish(self, event: AgentEvent) -> None:
        """Asynchronous convenience wrapper for broadcast."""
        self.broadcast(event)

    def _format_sse(self, event: AgentEvent) -> str:
        """Formats an AgentEvent into the SSE protocol standard chunk."""
        payload = event.model_dump(mode="json")
        data_str = json.dumps(payload, default=str)
        return f"id: {event.id}\nevent: {event.event_type}\ndata: {data_str}\n\n"

    async def subscribe(
        self,
        plan_id: Optional[str] = None,
        replay_history: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Subscribes a client to the event stream, yielding SSE formatted strings.
        Includes optional historical event replay and heartbeat keepalives.
        """
        queue: asyncio.Queue[AgentEvent] = asyncio.Queue(maxsize=150)

        # 1. Register queue
        if plan_id:
            if plan_id not in self._plan_subscribers:
                self._plan_subscribers[plan_id] = set()
            self._plan_subscribers[plan_id].add(queue)
        else:
            self._global_subscribers.add(queue)

        try:
            # 2. Replay historical events if requested
            if replay_history:
                recent_events = self.get_history(plan_id=plan_id)
                for past_event in recent_events:
                    yield self._format_sse(past_event)

            # 3. Stream real-time events with keepalives
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=self._keepalive_seconds)
                    yield self._format_sse(event)
                except asyncio.TimeoutError:
                    # Send SSE comment to keep connection alive
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            # 4. Clean up subscriber queue
            if plan_id and plan_id in self._plan_subscribers:
                self._plan_subscribers[plan_id].discard(queue)
                if not self._plan_subscribers[plan_id]:
                    del self._plan_subscribers[plan_id]
            else:
                self._global_subscribers.discard(queue)


# Global singleton instance
event_broadcaster = EventBroadcaster()
