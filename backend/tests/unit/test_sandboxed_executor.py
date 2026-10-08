"""
Unit Tests: Sandboxed Executor
Tests execution enforcement, permission/risk gating, parameter tampering prevention,
secret scrubbing, and state machine transitions.
"""
import json
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.executor import SandboxedExecutor
from backend.app.agent.permission_gate import permission_gate
from backend.app.models.plan import Plan, Step
from backend.app.schemas.common import StepStatus
from backend.app.tools.base import ExecutionContext, ToolExecutionError


@pytest.mark.asyncio
async def test_sandboxed_executor_successful_safe_step(db_session: AsyncSession):
    plan = Plan(id="p1", user_id="u1", raw_goal="Research", goal_summary="Research", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id="p1_s1",
        plan_id="p1",
        step_order=1,
        title="Synthesize Document",
        tool_name="document_synthesizer",
        parameters_json=json.dumps({"title": "Test Brief", "content": "Sample content"}),
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step)
    await db_session.commit()

    context = ExecutionContext()
    receipt = await SandboxedExecutor.execute_step(
        plan_id="p1",
        step=step,
        context=context,
        db=db_session
    )

    assert receipt.status == "EXECUTED"
    assert receipt.tool_name == "document_synthesizer"
    assert receipt.latency_ms >= 0
    # Crucial Invariant: Executor transitions step to VERIFYING (NOT terminal VERIFIED!)
    assert step.status == StepStatus.VERIFYING.value
    assert step.execution_result_json is not None


@pytest.mark.asyncio
async def test_sandboxed_executor_blocks_unapproved_destructive_step(db_session: AsyncSession):
    plan = Plan(id="p2", user_id="u1", raw_goal="Delete file", goal_summary="Delete", status="RUNNING")
    db_session.add(plan)
    step = Step(
        id="p2_s1",
        plan_id="p2",
        step_order=1,
        title="Delete Outdated File",
        tool_name="google_drive_delete_file",
        parameters_json=json.dumps({"file_id": "target_file_99", "permanent_delete": True}),
        risk_tier="TIER_3_DESTRUCTIVE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step)
    await db_session.commit()

    context = ExecutionContext()

    # Attempt execution without approval challenge
    with pytest.raises(ToolExecutionError) as exc:
        await SandboxedExecutor.execute_step(
            plan_id="p2",
            step=step,
            context=context,
            db=db_session
        )
    assert "requires human approval" in str(exc.value)
    # Step transitioned to AWAITING_APPROVAL with nonce issued
    assert step.status == StepStatus.AWAITING_APPROVAL.value
    assert step.approval_nonce is not None


@pytest.mark.asyncio
async def test_sandboxed_executor_rejects_parameter_tampering(db_session: AsyncSession):
    plan = Plan(id="p3", user_id="u1", raw_goal="Delete file", goal_summary="Delete", status="RUNNING")
    db_session.add(plan)

    initial_params = {"file_id": "file_alpha", "permanent_delete": True}
    step = Step(
        id="p3_s1",
        plan_id="p3",
        step_order=1,
        title="Delete File Alpha",
        tool_name="google_drive_delete_file",
        parameters_json=json.dumps(initial_params),
        risk_tier="TIER_3_DESTRUCTIVE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step)
    await db_session.commit()

    # Prepare approval challenge
    nonce, fp, _ = permission_gate.prepare_permission_gate(
        plan_id="p3",
        step_id="p3_s1",
        tool_name="google_drive_delete_file",
        parameters=initial_params
    )

    # Attacker alters the file_id after approval challenge is issued!
    tampered_params = {"file_id": "file_beta_ATTACK", "permanent_delete": True}
    step.parameters_json = json.dumps(tampered_params)
    await db_session.commit()

    context = ExecutionContext()
    with pytest.raises(ToolExecutionError) as exc:
        await SandboxedExecutor.execute_step(
            plan_id="p3",
            step=step,
            context=context,
            db=db_session,
            approval_nonce=nonce,
            action_fingerprint=fp,
            typed_confirmation="DELETE"
        )
    assert "Permission validation failed" in str(exc.value)


def test_sandboxed_executor_scrubs_secrets():
    sensitive_data = {
        "status": "success",
        "access_token": "ya29.sensitive_secret_token",
        "refresh_token": "1//04_refresh_token",
        "nested": {
            "api_key": "AIzaSySecret",
            "safe_field": "valid_output_value"
        }
    }
    scrubbed = SandboxedExecutor.scrub_secrets(sensitive_data)
    assert scrubbed["access_token"] == "[REDACTED]"
    assert scrubbed["refresh_token"] == "[REDACTED]"
    assert scrubbed["nested"]["api_key"] == "[REDACTED]"
    assert scrubbed["nested"]["safe_field"] == "valid_output_value"
