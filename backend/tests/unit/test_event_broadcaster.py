"""
Unit Tests: Real-Time SSE Event Broadcaster
Tests event publishing, subscription, event ordering, plan filtering, and history replay.
"""
import asyncio
import json
import pytest
from datetime import datetime, timezone
from backend.app.schemas.audit import AgentEvent
from backend.app.services.event_broadcaster import EventBroadcaster


@pytest.mark.asyncio
async def test_sse_event_publication_and_subscription():
    broadcaster = EventBroadcaster(history_limit=50, keepalive_seconds=5.0)

    received_chunks = []

    async def client_listener():
        async for chunk in broadcaster.subscribe(replay_history=False):
            received_chunks.append(chunk)
            if len(received_chunks) >= 2:
                break

    task = asyncio.create_task(client_listener())
    await asyncio.sleep(0.05)  # Allow subscription to register

    # Publish events
    evt1 = AgentEvent(
        id="evt_101",
        timestamp=datetime.now(timezone.utc),
        event_type="GOAL_RECEIVED",
        message="Goal received",
        data={"goal": "Build model"}
    )
    evt2 = AgentEvent(
        id="evt_102",
        timestamp=datetime.now(timezone.utc),
        event_type="PLAN_CREATED",
        message="Plan created",
        data={"steps": 3}
    )

    await broadcaster.publish(evt1)
    await broadcaster.publish(evt2)

    await asyncio.wait_for(task, timeout=2.0)

    assert len(received_chunks) == 2
    assert "event: GOAL_RECEIVED" in received_chunks[0]
    assert "id: evt_101" in received_chunks[0]
    assert "Build model" in received_chunks[0]
    assert "event: PLAN_CREATED" in received_chunks[1]
    assert "id: evt_102" in received_chunks[1]


@pytest.mark.asyncio
async def test_sse_event_ordering():
    broadcaster = EventBroadcaster(history_limit=50)

    events_to_send = [
        AgentEvent(id=f"evt_{i}", timestamp=datetime.now(timezone.utc), event_type=t, data={"index": i})
        for i, t in enumerate(["GOAL_RECEIVED", "PLAN_CREATED", "EXECUTING", "VERIFYING", "VERIFIED"])
    ]

    received_types = []

    async def client_listener():
        async for chunk in broadcaster.subscribe(replay_history=False):
            for line in chunk.splitlines():
                if line.startswith("event: "):
                    received_types.append(line.replace("event: ", "").strip())
            if len(received_types) == len(events_to_send):
                break

    task = asyncio.create_task(client_listener())
    await asyncio.sleep(0.05)

    for ev in events_to_send:
        broadcaster.broadcast(ev)

    await asyncio.wait_for(task, timeout=2.0)

    assert received_types == ["GOAL_RECEIVED", "PLAN_CREATED", "EXECUTING", "VERIFYING", "VERIFIED"]


@pytest.mark.asyncio
async def test_sse_plan_filtering():
    broadcaster = EventBroadcaster(history_limit=50)

    received_for_plan_a = []

    async def client_listener_plan_a():
        async for chunk in broadcaster.subscribe(plan_id="plan_AAA", replay_history=False):
            received_for_plan_a.append(chunk)
            if len(received_for_plan_a) >= 1:
                break

    task = asyncio.create_task(client_listener_plan_a())
    await asyncio.sleep(0.05)

    # Event for plan BBB (should NOT be received by subscriber)
    broadcaster.broadcast(
        AgentEvent(id="evt_bbb", timestamp=datetime.now(timezone.utc), event_type="EXECUTING", plan_id="plan_BBB")
    )
    # Event for plan AAA (SHOULD be received)
    broadcaster.broadcast(
        AgentEvent(id="evt_aaa", timestamp=datetime.now(timezone.utc), event_type="EXECUTING", plan_id="plan_AAA")
    )

    await asyncio.wait_for(task, timeout=2.0)

    assert len(received_for_plan_a) == 1
    assert "id: evt_aaa" in received_for_plan_a[0]
    assert "plan_AAA" in received_for_plan_a[0]


@pytest.mark.asyncio
async def test_sse_history_replay():
    broadcaster = EventBroadcaster(history_limit=50)

    # Publish events BEFORE subscriber connects
    broadcaster.broadcast(
        AgentEvent(id="hist_1", timestamp=datetime.now(timezone.utc), event_type="GOAL_RECEIVED", plan_id="plan_hist")
    )
    broadcaster.broadcast(
        AgentEvent(id="hist_2", timestamp=datetime.now(timezone.utc), event_type="PLAN_CREATED", plan_id="plan_hist")
    )

    received = []

    async def client_replay():
        async for chunk in broadcaster.subscribe(plan_id="plan_hist", replay_history=True):
            received.append(chunk)
            if len(received) >= 2:
                break

    await asyncio.wait_for(client_replay(), timeout=2.0)

    assert len(received) == 2
    assert "id: hist_1" in received[0]
    assert "id: hist_2" in received[1]
