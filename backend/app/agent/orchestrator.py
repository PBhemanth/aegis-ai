"""
Aegis Agent Orchestrator
Coordinates end-to-end plan execution across SandboxedExecutor, VerifierEngine,
and RecoveryEngine while enforcing strict state machine and audit contracts.
"""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.executor import sandboxed_executor
from backend.app.agent.recovery import recovery_engine
from backend.app.agent.state_machine import StateMachine
from backend.app.models.plan import Plan, Step
from backend.app.schemas.common import EventType, PlanStatus, StepStatus
from backend.app.schemas.execution import ExecutionReceipt
from backend.app.services.google_auth import google_auth_service
from backend.app.tools.base import ExecutionContext
from backend.app.verifier.engine import verifier_engine


class PlanExecutionSummary(BaseModel):
    plan_id: str
    status: str
    steps_total: int
    steps_verified: int
    current_step_id: Optional[str] = None
    halt_reason: Optional[str] = None
    receipts: List[ExecutionReceipt] = []


class AgentOrchestrator:
    @classmethod
    async def run_plan(
        cls,
        plan_id: str,
        user_id: str,
        db: AsyncSession,
        approval_nonce: Optional[str] = None,
        action_fingerprint: Optional[str] = None,
        typed_confirmation: Optional[str] = None
    ) -> PlanExecutionSummary:
        """
        Executes an entire Plan DAG through the Plan -> Act -> Verify pipeline.
        Halts safely at permission gates when high-risk steps require approval.
        """
        query = await db.execute(
            select(Plan).options(selectinload(Plan.steps)).where(Plan.id == plan_id)
        )
        plan = query.scalar_one_or_none()
        if not plan:
            raise ValueError(f"Plan '{plan_id}' does not exist.")

        # Update Plan status to RUNNING
        if plan.status in [PlanStatus.PLANNING.value, PlanStatus.HALTED.value]:
            StateMachine.validate_plan_transition(PlanStatus(plan.status), PlanStatus.RUNNING)
            plan.status = PlanStatus.RUNNING.value
            await db.commit()

        # Load Google OAuth Credentials if available
        creds = await google_auth_service.get_credentials(user_id=user_id, db=db)
        context = ExecutionContext(user_id=user_id, credentials=creds)

        receipts: List[ExecutionReceipt] = []
        steps_verified = 0

        for step in plan.steps:
            if step.status == StepStatus.VERIFIED.value:
                steps_verified += 1
                continue

            # Check if step is awaiting approval or requires approval
            if step.status == StepStatus.AWAITING_APPROVAL.value and not (approval_nonce and action_fingerprint):
                plan.status = PlanStatus.HALTED.value
                await db.commit()
                return PlanExecutionSummary(
                    plan_id=plan.id,
                    status=PlanStatus.HALTED.value,
                    steps_total=len(plan.steps),
                    steps_verified=steps_verified,
                    current_step_id=step.id,
                    halt_reason=f"Step '{step.title}' requires human approval before continuing.",
                    receipts=receipts
                )

            # Step 1: Execute Step safely
            try:
                receipt = await sandboxed_executor.execute_step(
                    plan_id=plan.id,
                    step=step,
                    context=context,
                    db=db,
                    approval_nonce=approval_nonce,
                    action_fingerprint=action_fingerprint,
                    typed_confirmation=typed_confirmation
                )
                receipts.append(receipt)
            except Exception as e:
                # If execution halted for approval
                if step.status == StepStatus.AWAITING_APPROVAL.value:
                    plan.status = PlanStatus.HALTED.value
                    await db.commit()
                    return PlanExecutionSummary(
                        plan_id=plan.id,
                        status=PlanStatus.HALTED.value,
                        steps_total=len(plan.steps),
                        steps_verified=steps_verified,
                        current_step_id=step.id,
                        halt_reason=f"Step '{step.title}' requires human approval.",
                        receipts=receipts
                    )
                # Hard failure
                plan.status = PlanStatus.FAILED.value
                await db.commit()
                return PlanExecutionSummary(
                    plan_id=plan.id,
                    status=PlanStatus.FAILED.value,
                    steps_total=len(plan.steps),
                    steps_verified=steps_verified,
                    current_step_id=step.id,
                    halt_reason=f"Step '{step.title}' failed execution: {str(e)}",
                    receipts=receipts
                )

            # Step 2: Independent Verification
            proof = await verifier_engine.verify_step(
                plan_id=plan.id,
                step=step,
                receipt=receipt,
                context=context,
                db=db
            )

            # Step 3: Self-Healing Recovery if Verification Failed
            if proof.status != "PASSED":
                recovered_receipt = await recovery_engine.attempt_step_recovery(
                    plan_id=plan.id,
                    step=step,
                    failed_proof=proof,
                    context=context,
                    db=db
                )

                if recovered_receipt:
                    receipts.append(recovered_receipt)
                    # Re-verify recovered output
                    re_proof = await verifier_engine.verify_step(
                        plan_id=plan.id,
                        step=step,
                        receipt=recovered_receipt,
                        context=context,
                        db=db
                    )
                    if re_proof.status == "PASSED":
                        steps_verified += 1
                    else:
                        plan.status = PlanStatus.FAILED.value
                        await db.commit()
                        return PlanExecutionSummary(
                            plan_id=plan.id,
                            status=PlanStatus.FAILED.value,
                            steps_total=len(plan.steps),
                            steps_verified=steps_verified,
                            current_step_id=step.id,
                            halt_reason="Self-healing recovery failed verification.",
                            receipts=receipts
                        )
                else:
                    plan.status = PlanStatus.FAILED.value
                    await db.commit()
                    return PlanExecutionSummary(
                        plan_id=plan.id,
                        status=PlanStatus.FAILED.value,
                        steps_total=len(plan.steps),
                        steps_verified=steps_verified,
                        current_step_id=step.id,
                        halt_reason="Step failed verification and recovery could not proceed.",
                        receipts=receipts
                    )
            else:
                steps_verified += 1

        # All steps successfully completed and independently verified!
        StateMachine.validate_plan_transition(PlanStatus.RUNNING, PlanStatus.COMPLETED)
        plan.status = PlanStatus.COMPLETED.value
        plan.completed_at = datetime.now(timezone.utc)
        await db.commit()

        await sandboxed_executor.record_audit_event(
            plan_id=plan.id,
            step_id=None,
            event_type=EventType.PLAN_COMPLETED,
            payload={"status": "COMPLETED", "verified_steps": steps_verified},
            db=db
        )

        return PlanExecutionSummary(
            plan_id=plan.id,
            status=PlanStatus.COMPLETED.value,
            steps_total=len(plan.steps),
            steps_verified=steps_verified,
            receipts=receipts
        )


agent_orchestrator = AgentOrchestrator()
