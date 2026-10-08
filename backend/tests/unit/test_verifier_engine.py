"""
Unit Tests: Independent Verifier Engine
Tests decoupled state verification, failure discrepancies, and terminal status invariants.
"""
from datetime import datetime, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.plan import Plan, Step
from backend.app.schemas.common import StepStatus
from backend.app.schemas.execution import ExecutionReceipt
from backend.app.tools.base import ExecutionContext
from backend.app.verifier.engine import VerifierEngine


@pytest.mark.asyncio
async def test_verifier_passes_and_marks_step_verified(db_session: AsyncSession):
    plan = Plan(id="p_v1", user_id="u1", raw_goal="Test", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id="p_v1_s1",
        plan_id="p_v1",
        step_order=1,
        title="Synthesize Doc",
        tool_name="document_synthesizer",
        parameters_json='{"title": "Doc", "content": "# Header\\nContent"}',
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.VERIFYING.value
    )
    db_session.add(step)
    await db_session.commit()

    receipt = ExecutionReceipt(
        step_id="p_v1_s1",
        plan_id="p_v1",
        tool_name="document_synthesizer",
        status="EXECUTED",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        latency_ms=45,
        result_data={
            "file_name": "doc.md",
            "size_bytes": 1200,
            "sha256_checksum": "a" * 64,
            "section_count": 2
        },
        action_fingerprint="fp123"
    )

    context = ExecutionContext()
    proof = await VerifierEngine.verify_step(
        plan_id="p_v1",
        step=step,
        receipt=receipt,
        context=context,
        db=db_session
    )

    assert proof.status == "PASSED"
    assert all(a.passed for a in proof.assertions)
    # Terminal invariant: step status MUST now be VERIFIED
    assert step.status == StepStatus.VERIFIED.value


@pytest.mark.asyncio
async def test_verifier_fails_on_discrepancy_and_does_not_mark_verified(db_session: AsyncSession):
    plan = Plan(id="p_v2", user_id="u1", raw_goal="Test Discrepancy", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id="p_v2_s1",
        plan_id="p_v2",
        step_order=1,
        title="Synthesize Doc Corrupt",
        tool_name="document_synthesizer",
        parameters_json='{"title": "Doc", "content": "empty"}',
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.VERIFYING.value
    )
    db_session.add(step)
    await db_session.commit()

    # Executor returned invalid / empty output
    corrupt_receipt = ExecutionReceipt(
        step_id="p_v2_s1",
        plan_id="p_v2",
        tool_name="document_synthesizer",
        status="EXECUTED",
        started_at=datetime.now(timezone.utc),
        completed_at=datetime.now(timezone.utc),
        latency_ms=10,
        result_data={
            "file_name": "doc.md",
            "size_bytes": 0,  # Fails assertion!
            "sha256_checksum": "",  # Fails assertion!
            "section_count": 0  # Fails assertion!
        },
        action_fingerprint="fp999"
    )

    context = ExecutionContext()
    proof = await VerifierEngine.verify_step(
        plan_id="p_v2",
        step=step,
        receipt=corrupt_receipt,
        context=context,
        db=db_session
    )

    assert proof.status == "FAILED"
    failed_assertions = [a.assertion for a in proof.assertions if not a.passed]
    assert "file_size_greater_than_zero" in failed_assertions
    assert "sha256_checksum_valid" in failed_assertions

    # Crucial Invariant: step MUST NOT be marked VERIFIED!
    assert step.status != StepStatus.VERIFIED.value
    assert step.status == StepStatus.FAILED.value
