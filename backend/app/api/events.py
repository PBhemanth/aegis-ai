"""
Aegis Real-Time Server-Sent Events (SSE) API Endpoints
Streams real agent lifecycle and execution state updates to connected clients.
"""
from typing import Optional
from fastapi import APIRouter, Query
from starlette.responses import StreamingResponse
from backend.app.services.event_broadcaster import event_broadcaster

router = APIRouter(prefix="/events", tags=["Events & Streaming"])


@router.get("/stream")
async def stream_all_events(
    plan_id: Optional[str] = Query(default=None, description="Optional plan ID filter"),
    replay: bool = Query(default=True, description="Replay recent buffered events upon connection")
):
    """
    Real-time Server-Sent Events (SSE) stream for agent execution and safety events.
    Supports optional plan-specific filtering and historical event replay.
    """
    return StreamingResponse(
        event_broadcaster.subscribe(plan_id=plan_id, replay_history=replay),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream"
        }
    )


@router.get("/stream/{plan_id}")
async def stream_plan_events(
    plan_id: str,
    replay: bool = Query(default=True, description="Replay recent buffered events upon connection")
):
    """
    Real-time Server-Sent Events (SSE) stream dedicated to a specific plan ID.
    """
    return StreamingResponse(
        event_broadcaster.subscribe(plan_id=plan_id, replay_history=replay),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Content-Type": "text/event-stream"
        }
    )
