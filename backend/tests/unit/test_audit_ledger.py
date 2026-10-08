"""
Unit Tests: Cryptographic Tamper-Evident Audit Ledger
Tests append-only hash chaining, deterministic hash calculation, chain verification,
tamper detection, and secret scrubbing.
"""
import json
import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.audit_ledger import AuditLedger, audit_ledger
from backend.app.core.security import SecurityService
from backend.app.models.audit import AuditEvent
from backend.app.models.plan import Plan
from backend.app.models.user import User
from backend.app.schemas.common import Actor, EventType, Severity


@pytest.mark.asyncio
async def test_hash_chain_creation_and_deterministic_calculation(db_session: AsyncSession):
    # Setup test plan
    user = User(id="u_audit_1", email="audit1@aegis.local", display_name="Auditor")
    db_session.add(user)
    plan = Plan(id="p_audit_chain", user_id="u_audit_1", raw_goal="Goal", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Event 1: Genesis event for this plan
    e1 = await audit_ledger.record_event(
        plan_id="p_audit_chain",
        event_type=EventType.GOAL_RECEIVED,
        payload={"goal": "Analyze Ethereum arbitrage"},
        actor=Actor.USER,
        db=db_session
    )
    assert e1.prev_proof_hash is None
    assert len(e1.proof_hash) == 64  # SHA-256 hex digest length

    # Event 2: Second chained event
    e2 = await audit_ledger.record_event(
        plan_id="p_audit_chain",
        event_type=EventType.PLAN_CREATED,
        payload={"steps_count": 2},
        actor=Actor.SYSTEM,
        db=db_session
    )
    assert e2.prev_proof_hash == e1.proof_hash
    assert len(e2.proof_hash) == 64
    assert e2.proof_hash != e1.proof_hash

    # Event 3: Third chained event
    e3 = await audit_ledger.record_event(
        plan_id="p_audit_chain",
        event_type=EventType.EXECUTING,
        payload={"tool_name": "arxiv_search", "parameters": {"query": "arbitrage"}},
        actor=Actor.SYSTEM,
        db=db_session
    )
    assert e3.prev_proof_hash == e2.proof_hash

    # Determinism check: recalculating hash manually matches stored hash
    recalc_hash = SecurityService.compute_audit_hash(
        prev_hash=e2.proof_hash,
        event_id=e3.id,
        timestamp=e3.timestamp,
        event_type=e3.event_type,
        payload=json.loads(e3.payload_json)
    )
    assert recalc_hash == e3.proof_hash


@pytest.mark.asyncio
async def test_audit_chain_successful_verification(db_session: AsyncSession):
    user = User(id="u_audit_2", email="audit2@aegis.local", display_name="Auditor 2")
    db_session.add(user)
    plan = Plan(id="p_verify_valid", user_id="u_audit_2", raw_goal="Goal", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Record 4 legitimate chained events
    for evt_type in [EventType.GOAL_RECEIVED, EventType.PLAN_CREATED, EventType.EXECUTING, EventType.COMPLETED]:
        await audit_ledger.record_event(
            plan_id="p_verify_valid",
            event_type=evt_type,
            payload={"status": "progressing", "type": evt_type.value},
            db=db_session
        )
    await db_session.commit()

    # Verify complete chain integrity
    result = await audit_ledger.verify_plan_chain(plan_id="p_verify_valid", db=db_session)
    assert result.is_valid is True
    assert result.total_events == 4
    assert result.broken_event_id is None
    assert "verified successfully" in result.details.lower()


@pytest.mark.asyncio
async def test_tampered_payload_detection(db_session: AsyncSession):
    user = User(id="u_audit_3", email="audit3@aegis.local", display_name="Auditor 3")
    db_session.add(user)
    plan = Plan(id="p_tamper_payload", user_id="u_audit_3", raw_goal="Goal", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Record 3 events
    await audit_ledger.record_event(plan_id="p_tamper_payload", event_type=EventType.GOAL_RECEIVED, payload={"goal": "Legitimate goal"}, db=db_session)
    e2 = await audit_ledger.record_event(plan_id="p_tamper_payload", event_type=EventType.RISK_EVALUATED, payload={"risk_tier": "TIER_1"}, db=db_session)
    await audit_ledger.record_event(plan_id="p_tamper_payload", event_type=EventType.COMPLETED, payload={"status": "OK"}, db=db_session)
    await db_session.commit()

    # Malicious actor tampers with payload of e2 directly in the database
    e2.payload_json = json.dumps({"risk_tier": "TIER_0_TAMPERED"})
    await db_session.commit()

    # Integrity verification must catch the discrepancy
    result = await audit_ledger.verify_plan_chain(plan_id="p_tamper_payload", db=db_session)
    assert result.is_valid is False
    assert result.broken_event_id == e2.id
    assert "cryptographic hash mismatch" in result.details.lower()


@pytest.mark.asyncio
async def test_tampered_linkage_detection(db_session: AsyncSession):
    user = User(id="u_audit_4", email="audit4@aegis.local", display_name="Auditor 4")
    db_session.add(user)
    plan = Plan(id="p_tamper_link", user_id="u_audit_4", raw_goal="Goal", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Record 2 events
    await audit_ledger.record_event(plan_id="p_tamper_link", event_type=EventType.GOAL_RECEIVED, payload={"goal": "A"}, db=db_session)
    e2 = await audit_ledger.record_event(plan_id="p_tamper_link", event_type=EventType.COMPLETED, payload={"status": "B"}, db=db_session)
    await db_session.commit()

    # Malicious actor alters prev_proof_hash linkage
    e2.prev_proof_hash = "deadbeef" * 8
    await db_session.commit()

    result = await audit_ledger.verify_plan_chain(plan_id="p_tamper_link", db=db_session)
    assert result.is_valid is False
    assert result.broken_event_id == e2.id
    assert "linkage break" in result.details.lower()


@pytest.mark.asyncio
async def test_deleted_event_chain_break(db_session: AsyncSession):
    user = User(id="u_audit_5", email="audit5@aegis.local", display_name="Auditor 5")
    db_session.add(user)
    plan = Plan(id="p_delete_event", user_id="u_audit_5", raw_goal="Goal", goal_summary="Sum", status="RUNNING")
    db_session.add(plan)
    await db_session.commit()

    # Record 3 events
    await audit_ledger.record_event(plan_id="p_delete_event", event_type=EventType.GOAL_RECEIVED, payload={"k": 1}, db=db_session)
    e2 = await audit_ledger.record_event(plan_id="p_delete_event", event_type=EventType.EXECUTING, payload={"k": 2}, db=db_session)
    await audit_ledger.record_event(plan_id="p_delete_event", event_type=EventType.COMPLETED, payload={"k": 3}, db=db_session)
    await db_session.commit()

    # Malicious actor deletes intermediate event e2
    await db_session.delete(e2)
    await db_session.commit()

    result = await audit_ledger.verify_plan_chain(plan_id="p_delete_event", db=db_session)
    assert result.is_valid is False
    assert "linkage break" in result.details.lower()


def test_secret_scrubbing_in_audit_ledger():
    payload = {
        "access_token": "ya29.secret_access_oauth",
        "nested": {
            "refresh_token": "1//04_secret_refresh",
            "api_key": "AIzaSySecretApiKey",
            "client_secret": "GOCSPX-SecretSecret",
            "authorization": "Bearer ya29.auth_token_here",
            "safe_metadata": "this_should_be_kept"
        },
        "items": [
            {"password": "plain_text_password", "id": 101}
        ]
    }
    scrubbed = AuditLedger.scrub_secrets(payload)

    assert scrubbed["access_token"] == "[REDACTED]"
    assert scrubbed["nested"]["refresh_token"] == "[REDACTED]"
    assert scrubbed["nested"]["api_key"] == "[REDACTED]"
    assert scrubbed["nested"]["client_secret"] == "[REDACTED]"
    assert scrubbed["nested"]["authorization"] == "[REDACTED]"
    assert scrubbed["nested"]["safe_metadata"] == "this_should_be_kept"
    assert scrubbed["items"][0]["password"] == "[REDACTED]"
    assert scrubbed["items"][0]["id"] == 101
