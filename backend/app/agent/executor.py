"""
Aegis Sandboxed Executor
Unified executor enforcing strict parameter validation, permission gates, state machine
transitions, secret scrubbing, and execution receipt generation.
"""
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.permission_gate import permission_gate
from backend.app.agent.risk_engine import RiskEngine
from backend.app.agent.state_machine import StateMachine
from backend.app.core.security import security_service
from backend.app.models.audit import AuditEvent
from backend.app.models.plan import Step
from backend.app.schemas.approval import ApprovalRequest
from backend.app.schemas.common import EventType, RiskTier, Severity, StepStatus
from backend.app.schemas.execution import ExecutionReceipt
from backend.app.tools import ALL_TOOLS, ExecutionContext, ToolExecutionError

TOOL_MAP = {t.name: t for t in ALL_TOOLS}


class SandboxedExecutor:
    @staticmethod
    def scrub_secrets(data: Any) -> Any:
        """Recursively scrubs access tokens, refresh tokens, and credentials from receipts and logs."""
        if isinstance(data, dict):
            scrubbed = {}
            for k, v in data.items():
                k_lower = str(k).lower()
                if any(sec in k_lower for sec in ["token", "secret", "password", "key", "authorization"]):
                    scrubbed[k] = "[REDACTED]"
                else:
                    scrubbed[k] = SandboxedExecutor.scrub_secrets(v)
            return scrubbed
        elif isinstance(data, list):
            return [SandboxedExecutor.scrub_secrets(i) for i in data]
        return data

    @classmethod
    async def record_audit_event(
        cls,
        plan_id: str,
        step_id: Optional[str],
        event_type: EventType,
        payload: Dict[str, Any],
        db: AsyncSession,
        severity: Severity = Severity.INFO
    ) -> AuditEvent:
        """Commits a tamper-evident audit event with SHA-256 hash chaining."""
        # Find previous event proof_hash for plan
        last_event_query = await db.execute(
            select(AuditEvent)
            .where(AuditEvent.plan_id == plan_id)
            .order_by(AuditEvent.timestamp.desc())
            .limit(1)
        )
        last_event = last_event_query.scalar_one_or_none()
        prev_hash = last_event.proof_hash if last_event else None

        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        scrubbed_payload = cls.scrub_secrets(payload)

        proof_hash = security_service.compute_audit_hash(
            prev_hash=prev_hash,
            event_id=event_id,
            timestamp=now.isoformat(),
            event_type=event_type.value,
            payload=scrubbed_payload
        )

        audit_entry = AuditEvent(
            id=event_id,
            plan_id=plan_id,
            step_id=step_id,
            event_type=event_type.value,
            severity=severity.value,
            actor="SYSTEM",
            payload_json=json.dumps(scrubbed_payload, default=str),
            prev_proof_hash=prev_hash,
            proof_hash=proof_hash,
            timestamp=now
        )
        db.add(audit_entry)
        await db.flush()
        return audit_entry

    @classmethod
    async def execute_step(
        cls,
        plan_id: str,
        step: Step,
        context: ExecutionContext,
        db: AsyncSession,
        approval_nonce: Optional[str] = None,
        action_fingerprint: Optional[str] = None,
        typed_confirmation: Optional[str] = None
    ) -> ExecutionReceipt:
        """
        Executes a plan step safely:
        1. Validates StateMachine transition
        2. Enforces RiskEngine and PermissionGate
        3. Invokes tool with sandboxing
        4. Transitions step to VERIFYING (Never directly to VERIFIED)
        5. Emits hash-chained audit events
        """
        # 1. State Machine check
        current_status = StepStatus(step.status)
        StateMachine.validate_step_transition(current_status, StepStatus.EXECUTING)

        # 2. Extract and validate parameters
        parameters: Dict[str, Any] = {}
        if step.parameters_json:
            try:
                parameters = json.loads(step.parameters_json)
            except Exception:
                pass

        expected_fingerprint = security_service.compute_action_fingerprint(
            step_id=step.id,
            tool_name=step.tool_name,
            parameters=parameters
        )

        # 3. Deterministic Risk & Permission Gate
        risk_eval = RiskEngine.evaluate_risk(step.tool_name, parameters)
        approval_granted = False

        if risk_eval.requires_approval:
            # Case A: Already approved in database
            if step.status == StepStatus.APPROVED.value:
                if step.action_fingerprint and step.action_fingerprint != expected_fingerprint:
                    raise ToolExecutionError(
                        "Action fingerprint mismatch: parameters modified after approval.",
                        tool_name=step.tool_name
                    )
                approval_granted = True
            # Case B: Approval credentials provided in execution request
            elif approval_nonce and action_fingerprint:
                app_req = ApprovalRequest(
                    plan_id=plan_id,
                    step_id=step.id,
                    approval_nonce=approval_nonce,
                    action_fingerprint=action_fingerprint,
                    typed_confirmation=typed_confirmation
                )
                valid, msg = permission_gate.validate_approval(
                    request=app_req,
                    stored_nonce=approval_nonce,
                    expected_fingerprint=expected_fingerprint,
                    risk_evaluation=risk_eval
                )
                if not valid:
                    raise ToolExecutionError(f"Permission validation failed: {msg}", tool_name=step.tool_name)
                approval_granted = True
                step.approved_at = datetime.now(timezone.utc)
                step.approval_nonce = approval_nonce
                step.action_fingerprint = expected_fingerprint
            else:
                # Transition to AWAITING_APPROVAL and halt execution
                StateMachine.validate_step_transition(current_status, StepStatus.AWAITING_APPROVAL)
                nonce, fp, expires_at = permission_gate.prepare_permission_gate(
                    plan_id=plan_id,
                    step_id=step.id,
                    tool_name=step.tool_name,
                    parameters=parameters
                )
                step.status = StepStatus.AWAITING_APPROVAL.value
                step.approval_nonce = nonce
                step.action_fingerprint = fp
                await db.commit()

                await cls.record_audit_event(
                    plan_id=plan_id,
                    step_id=step.id,
                    event_type=EventType.APPROVAL_REQUESTED,
                    payload={"tool_name": step.tool_name, "risk_tier": risk_eval.risk_tier.value, "expires_at": expires_at},
                    db=db,
                    severity=Severity.WARNING
                )
                raise ToolExecutionError(
                    f"Step '{step.title}' requires human approval before execution.",
                    tool_name=step.tool_name,
                    details={"approval_nonce": nonce, "action_fingerprint": fp, "risk_tier": risk_eval.risk_tier.value}
                )

        # 4. Resolve Tool
        tool = TOOL_MAP.get(step.tool_name)
        if not tool:
            raise ToolExecutionError(f"Tool '{step.tool_name}' is not registered.", tool_name=step.tool_name)

        # 5. Transition to EXECUTING
        step.status = StepStatus.EXECUTING.value
        await db.commit()

        await cls.record_audit_event(
            plan_id=plan_id,
            step_id=step.id,
            event_type=EventType.TOOL_EXECUTION_STARTED,
            payload={"tool_name": step.tool_name, "parameters": parameters},
            db=db
        )

        start_time = datetime.now(timezone.utc)
        context.approval_granted = approval_granted

        # 6. Execute Tool
        try:
            parsed_params = tool.input_schema(**parameters)
            result = await tool.execute(parsed_params, context)
            completed_time = datetime.now(timezone.utc)
            latency_ms = int((completed_time - start_time).total_seconds() * 1000)

            result_dict = cls.scrub_secrets(result.model_dump())

            # Transition step to VERIFYING (NOT terminal VERIFIED!)
            StateMachine.validate_step_transition(StepStatus.EXECUTING, StepStatus.VERIFYING)
            step.status = StepStatus.VERIFYING.value
            step.execution_result_json = json.dumps(result_dict, default=str)
            step.error_message = None
            await db.commit()

            receipt = ExecutionReceipt(
                step_id=step.id,
                plan_id=plan_id,
                tool_name=step.tool_name,
                status="EXECUTED",
                started_at=start_time,
                completed_at=completed_time,
                latency_ms=latency_ms,
                result_data=result_dict,
                error_message=None,
                action_fingerprint=expected_fingerprint
            )

            await cls.record_audit_event(
                plan_id=plan_id,
                step_id=step.id,
                event_type=EventType.TOOL_EXECUTION_COMPLETED,
                payload={"tool_name": step.tool_name, "status": "EXECUTED", "latency_ms": latency_ms},
                db=db
            )

            return receipt

        except Exception as e:
            completed_time = datetime.now(timezone.utc)
            latency_ms = int((completed_time - start_time).total_seconds() * 1000)
            error_msg = str(e)

            step.status = StepStatus.FAILED.value
            step.error_message = error_msg
            await db.commit()

            await cls.record_audit_event(
                plan_id=plan_id,
                step_id=step.id,
                event_type=EventType.TOOL_EXECUTION_COMPLETED,
                payload={"tool_name": step.tool_name, "status": "EXECUTION_FAILED", "error": error_msg},
                db=db,
                severity=Severity.CRITICAL
            )

            raise ToolExecutionError(error_msg, tool_name=step.tool_name)


sandboxed_executor = SandboxedExecutor()
