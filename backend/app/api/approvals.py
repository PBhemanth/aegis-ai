"""
Aegis Approvals & Permission Gate API Endpoints
"""
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.permission_gate import permission_gate
from backend.app.agent.risk_engine import RiskEngine
from backend.app.core.database import get_db
from backend.app.models.plan import Plan, Step
from backend.app.schemas.approval import ApprovalRequest, ApprovalResponse, RejectionRequest
from backend.app.schemas.audit import AgentEvent
from backend.app.schemas.common import Actor, EventType, PlanStatus, Severity, StepStatus
from backend.app.services.event_broadcaster import event_broadcaster

router = APIRouter(prefix="/approvals", tags=["Approvals"])


class ChallengeRequest(BaseModel):
    plan_id: str
    step_id: str
    tool_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    ttl_seconds: Optional[int] = None


class ChallengeResponse(BaseModel):
    plan_id: str
    step_id: str
    tool_name: str
    approval_nonce: str
    action_fingerprint: str
    expires_at: int
    risk_evaluation: Any


@router.post("/challenge", response_model=ChallengeResponse)
async def create_approval_challenge(payload: ChallengeRequest):
    """
    Issues a cryptographic approval challenge (HMAC nonce and action fingerprint)
    for a high-risk step requiring human approval.
    """
    risk_eval = RiskEngine.evaluate_risk(
        tool_name=payload.tool_name,
        parameters=payload.parameters
    )

    nonce, fingerprint, expires_at = permission_gate.prepare_permission_gate(
        plan_id=payload.plan_id,
        step_id=payload.step_id,
        tool_name=payload.tool_name,
        parameters=payload.parameters,
        ttl_seconds=payload.ttl_seconds
    )

    return ChallengeResponse(
        plan_id=payload.plan_id,
        step_id=payload.step_id,
        tool_name=payload.tool_name,
        approval_nonce=nonce,
        action_fingerprint=fingerprint,
        expires_at=expires_at,
        risk_evaluation=risk_eval
    )


@router.post("/submit", response_model=ApprovalResponse)
async def submit_approval(
    payload: ApprovalRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submits user approval with cryptographic nonce and optional typed confirmation.
    """
    is_valid, msg = permission_gate.validate_approval(
        request=payload,
        stored_nonce=payload.approval_nonce,
        expected_fingerprint=payload.action_fingerprint,
        risk_evaluation=None
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg
        )

    # Persist approved state in database
    step_query = await db.execute(select(Step).where(Step.id == payload.step_id))
    step = step_query.scalar_one_or_none()
    if step:
        step.status = StepStatus.APPROVED.value
        step.approved_at = datetime.now(timezone.utc)
        step.approval_nonce = payload.approval_nonce
        step.action_fingerprint = payload.action_fingerprint
        await db.commit()

    event_broadcaster.broadcast(
        AgentEvent(
            id=f"evt_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(timezone.utc),
            event_type=EventType.APPROVED.value,
            plan_id=payload.plan_id,
            step_id=payload.step_id,
            actor=Actor.USER.value,
            message="Action approval verified successfully.",
            data={"action_fingerprint": payload.action_fingerprint}
        )
    )

    return ApprovalResponse(
        approved=True,
        plan_id=payload.plan_id,
        step_id=payload.step_id,
        status="APPROVED",
        message="Action approval verified successfully.",
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@router.post("/reject", response_model=ApprovalResponse)
async def reject_approval(
    payload: RejectionRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Rejects an action, halting execution or prompting re-planning.
    """
    # Persist rejection to database and halt plan
    step_query = await db.execute(select(Step).where(Step.id == payload.step_id))
    step = step_query.scalar_one_or_none()
    if step:
        step.status = StepStatus.REJECTED.value
        step.error_message = f"Action rejected by user: {payload.reason}"

    plan_query = await db.execute(select(Plan).where(Plan.id == payload.plan_id))
    plan = plan_query.scalar_one_or_none()
    if plan and plan.status != PlanStatus.FAILED.value:
        plan.status = PlanStatus.HALTED.value

    await db.commit()

    event_broadcaster.broadcast(
        AgentEvent(
            id=f"evt_{uuid.uuid4().hex[:12]}",
            timestamp=datetime.now(timezone.utc),
            event_type=EventType.REJECTED.value,
            plan_id=payload.plan_id,
            step_id=payload.step_id,
            actor=Actor.USER.value,
            severity=Severity.WARNING.value,
            message=f"Action rejected by user: {payload.reason}",
            data={"reason": payload.reason}
        )
    )

    return ApprovalResponse(
        approved=False,
        plan_id=payload.plan_id,
        step_id=payload.step_id,
        status="REJECTED",
        message=f"Action rejected by user: {payload.reason}",
        timestamp=datetime.now(timezone.utc).isoformat()
    )
