"""
Integration Tests: Audit Ledger and Real-Time SSE API
Tests audit retrieval endpoints, cryptographic integrity verification endpoints,
tamper detection, and real execution events appearing in audit log and broadcaster.
"""
import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.audit_ledger import audit_ledger
from backend.app.models.plan import Plan, Step
from backend.app.models.user import User
from backend.app.schemas.common import Actor, EventType, StepStatus
from backend.app.services.event_broadcaster import event_broadcaster


@pytest.mark.asyncio
async def test_audit_endpoint_retrieval(client: AsyncClient, db_session: AsyncSession):
    user = User(id="u_audit_api_1", email="api1@aegis.local", display_name="API User 1")
    db_session.add(user)
    plan = Plan(id="plan_api_audit_1", user_id="u_audit_api_1", raw_goal="Test Goal", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Record 3 events
    await audit_ledger.record_event(plan_id="plan_api_audit_1", event_type=EventType.GOAL_RECEIVED, payload={"goal": "Goal 1"}, db=db_session)
    await audit_ledger.record_event(plan_id="plan_api_audit_1", event_type=EventType.PLAN_CREATED, payload={"steps": 2}, db=db_session)
    await audit_ledger.record_event(plan_id="plan_api_audit_1", event_type=EventType.COMPLETED, payload={"status": "DONE"}, db=db_session)
    await db_session.commit()

    response = await client.get("/api/audit/plan/plan_api_audit_1")
    assert response.status_code == 200
    events = response.json()
    assert len(events) == 3
    assert events[0]["event_type"] == "GOAL_RECEIVED"
    assert events[1]["event_type"] == "PLAN_CREATED"
    assert events[2]["event_type"] == "COMPLETED"
    # Cryptographic fields present
    assert events[0]["prev_proof_hash"] is None
    assert events[1]["prev_proof_hash"] == events[0]["proof_hash"]
    assert events[2]["prev_proof_hash"] == events[1]["proof_hash"]


@pytest.mark.asyncio
async def test_audit_integrity_endpoint_valid_chain(client: AsyncClient, db_session: AsyncSession):
    user = User(id="u_audit_api_2", email="api2@aegis.local", display_name="API User 2")
    db_session.add(user)
    plan = Plan(id="plan_api_valid", user_id="u_audit_api_2", raw_goal="Valid", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    await audit_ledger.record_event(plan_id="plan_api_valid", event_type=EventType.GOAL_RECEIVED, payload={"v": 1}, db=db_session)
    await audit_ledger.record_event(plan_id="plan_api_valid", event_type=EventType.PLAN_CREATED, payload={"v": 2}, db=db_session)
    await db_session.commit()

    response = await client.get("/api/audit/verify/plan_api_valid")
    assert response.status_code == 200
    res = response.json()
    assert res["is_valid"] is True
    assert res["total_events"] == 2
    assert res["broken_event_id"] is None
    assert "verified successfully" in res["details"].lower()


@pytest.mark.asyncio
async def test_audit_integrity_endpoint_detects_tampering(client: AsyncClient, db_session: AsyncSession):
    user = User(id="u_audit_api_3", email="api3@aegis.local", display_name="API User 3")
    db_session.add(user)
    plan = Plan(id="plan_api_tamper", user_id="u_audit_api_3", raw_goal="Tamper", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    await audit_ledger.record_event(plan_id="plan_api_tamper", event_type=EventType.GOAL_RECEIVED, payload={"secret": "abc"}, db=db_session)
    e2 = await audit_ledger.record_event(plan_id="plan_api_tamper", event_type=EventType.EXECUTING, payload={"task": "download"}, db=db_session)
    await db_session.commit()

    # Tamper with row e2 directly in database
    e2.payload_json = json.dumps({"task": "ATTACK_PAYLOAD"})
    await db_session.commit()

    response = await client.get("/api/audit/verify/plan_api_tamper")
    assert response.status_code == 200
    res = response.json()
    assert res["is_valid"] is False
    assert res["broken_event_id"] == e2.id
    assert "cryptographic hash mismatch" in res["details"].lower()


@pytest.mark.asyncio
async def test_audit_list_all_events_endpoint(client: AsyncClient, db_session: AsyncSession):
    response = await client.get("/api/audit/events?limit=10")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_execution_events_appear_in_stream_and_ledger(client: AsyncClient, db_session: AsyncSession):
    user = User(id="u_audit_exec", email="exec@aegis.local", display_name="Exec User")
    db_session.add(user)
    plan = Plan(id="plan_stream_test", user_id="u_audit_exec", raw_goal="Stream Test", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)

    step = Step(
        id="step_stream_01",
        plan_id="plan_stream_test",
        step_order=1,
        title="Synthesize Stream Report",
        tool_name="document_synthesizer",
        parameters_json=json.dumps({"title": "Stream Brief", "content": "# Overview\\nStreamed."}),
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step)
    await db_session.commit()

    # Execute step via API
    resp = await client.post("/api/execute/step/step_stream_01?user_id=u_audit_exec")
    assert resp.status_code == 200

    # 1. Verify events appear in Audit Ledger
    audit_resp = await client.get("/api/audit/plan/plan_stream_test")
    assert audit_resp.status_code == 200
    ledger_events = audit_resp.json()
    event_types = [e["event_type"] for e in ledger_events]

    assert "EXECUTING" in event_types
    assert "VERIFYING" in event_types
    assert "VERIFIED" in event_types

    # 2. Verify hash chain is intact for execution events
    verify_resp = await client.get("/api/audit/verify/plan_stream_test")
    assert verify_resp.status_code == 200
    assert verify_resp.json()["is_valid"] is True

    # 3. Verify events appeared in the broadcaster ring-buffer
    recent = event_broadcaster.get_history(plan_id="plan_stream_test")
    broadcast_types = [e.event_type for e in recent]
    assert "EXECUTING" in broadcast_types
    assert "VERIFYING" in broadcast_types
    assert "VERIFIED" in broadcast_types
