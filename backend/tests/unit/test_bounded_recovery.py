"""
Unit Tests: Bounded Self-Healing Recovery Engine
Tests transient error backoff, parameter repair, strict limit of 2 attempts,
and halt upon budget exhaustion.
"""
import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.recovery import RecoveryEngine
from backend.app.models.plan import Plan, Step
from backend.app.schemas.audit import AssertionResult, VerificationProofCreate
from backend.app.schemas.common import StepStatus
from backend.app.tools.base import ExecutionContext


@pytest.mark.asyncio
async def test_transient_retry_with_exponential_backoff():
    engine = RecoveryEngine()
    attempts = 0

    async def transient_operation():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise ConnectionError("Transient network glitch (HTTP 429)")
        return "SUCCESS_DATA"

    result = await engine.execute_with_transient_backoff(
        transient_operation,
        max_retries=2,
        initial_delay_seconds=0.01
    )
    assert result == "SUCCESS_DATA"
    assert attempts == 2


@pytest.mark.asyncio
async def test_bounded_recovery_heals_discrepancy(db_session: AsyncSession):
    engine = RecoveryEngine()
    plan = Plan(id="p_rec1", user_id="u1", raw_goal="Test Recovery", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id="p_rec1_s1",
        plan_id="p_rec1",
        step_order=1,
        title="Synthesize Doc",
        tool_name="document_synthesizer",
        parameters_json=json.dumps({"title": "Test Brief", "content": "short"}),
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.FAILED.value
    )
    db_session.add(step)
    await db_session.commit()

    failed_proof = VerificationProofCreate(
        step_id="p_rec1_s1",
        verifier_name="DocumentIntegrityVerifier",
        status="FAILED",
        assertions=[
            AssertionResult(assertion="structured_sections_present", expected=True, actual=False, passed=False)
        ],
        latency_ms=10
    )

    context = ExecutionContext()
    # Attempt 1: Should succeed and return repaired execution receipt
    receipt = await engine.attempt_step_recovery(
        plan_id="p_rec1",
        step=step,
        failed_proof=failed_proof,
        context=context,
        db=db_session
    )

    assert receipt is not None
    assert receipt.status == "EXECUTED"
    assert engine.get_attempt_count("p_rec1_s1") == 1


@pytest.mark.asyncio
async def test_recovery_halts_when_limit_exceeded(db_session: AsyncSession):
    engine = RecoveryEngine()
    step_id = "p_rec2_s1"
    # Pre-set attempt count to 2 (maximum allowed budget)
    engine._step_attempts[step_id] = 2

    plan = Plan(id="p_rec2", user_id="u1", raw_goal="Test Exhaustion", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id=step_id,
        plan_id="p_rec2",
        step_order=1,
        title="Failing Step",
        tool_name="document_synthesizer",
        parameters_json="{}",
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.FAILED.value
    )
    db_session.add(step)
    await db_session.commit()

    failed_proof = VerificationProofCreate(
        step_id=step_id,
        verifier_name="DocumentIntegrityVerifier",
        status="FAILED",
        assertions=[AssertionResult(assertion="always_fails", expected=True, actual=False, passed=False)],
        latency_ms=10
    )

    context = ExecutionContext()
    # 3rd attempt: MUST BE BLOCKED BY RECOVERY BUDGET
    receipt = await engine.attempt_step_recovery(
        plan_id="p_rec2",
        step=step,
        failed_proof=failed_proof,
        context=context,
        db=db_session
    )

    # Must return None and remain FAILED (no infinite loop)
    assert receipt is None
    assert step.status == StepStatus.FAILED.value
    assert "exceeded" in step.error_message
