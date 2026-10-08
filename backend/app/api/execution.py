"""
Aegis Execution API Endpoints
Endpoints for running individual steps, executing plans, and inspecting verification proofs.
"""
import json
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.executor import sandboxed_executor
from backend.app.agent.orchestrator import AgentOrchestrator, PlanExecutionSummary, agent_orchestrator
from backend.app.core.database import get_db
from backend.app.models.plan import Plan, Step
from backend.app.models.verification import VerificationProof
from backend.app.schemas.audit import AssertionResult, VerificationProofRead
from backend.app.schemas.execution import ExecutionReceipt, StepExecutionRequest
from backend.app.services.google_auth import google_auth_service
from backend.app.tools.base import ExecutionContext
from backend.app.verifier.engine import verifier_engine

router = APIRouter(prefix="/execute", tags=["Execution"])


class StepExecuteResponse(BaseModel):
    step_id: str
    plan_id: str
    tool_name: str
    status: str
    receipt: ExecutionReceipt
    proof: Any


@router.post("/step/{step_id}", response_model=StepExecuteResponse)
async def execute_and_verify_step(
    step_id: str,
    payload: Optional[StepExecutionRequest] = None,
    user_id: str = Query(default="default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a single plan step and immediately runs independent state-delta verification.
    """
    query = await db.execute(select(Step).where(Step.id == step_id))
    step = query.scalar_one_or_none()
    if not step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step '{step_id}' does not exist."
        )

    creds = await google_auth_service.get_credentials(user_id=user_id, db=db)
    context = ExecutionContext(user_id=user_id, credentials=creds)

    req = payload or StepExecutionRequest()

    try:
        receipt = await sandboxed_executor.execute_step(
            plan_id=step.plan_id,
            step=step,
            context=context,
            db=db,
            approval_nonce=req.approval_nonce,
            action_fingerprint=req.action_fingerprint,
            typed_confirmation=req.typed_confirmation
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    proof = await verifier_engine.verify_step(
        plan_id=step.plan_id,
        step=step,
        receipt=receipt,
        context=context,
        db=db
    )

    return StepExecuteResponse(
        step_id=step.id,
        plan_id=step.plan_id,
        tool_name=step.tool_name,
        status=step.status,
        receipt=receipt,
        proof=proof.model_dump()
    )


@router.post("/plan/{plan_id}", response_model=PlanExecutionSummary)
async def execute_plan(
    plan_id: str,
    payload: Optional[StepExecutionRequest] = None,
    user_id: str = Query(default="default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Runs the agent execution loop across an entire Plan DAG.
    Safely halts at permission gates when high-risk actions require user approval.
    """
    req = payload or StepExecutionRequest()
    try:
        summary = await agent_orchestrator.run_plan(
            plan_id=plan_id,
            user_id=user_id,
            db=db,
            approval_nonce=req.approval_nonce,
            action_fingerprint=req.action_fingerprint,
            typed_confirmation=req.typed_confirmation
        )
        return summary
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/proof/{step_id}", response_model=VerificationProofRead)
async def get_verification_proof(
    step_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves the independent VerificationProof and assertions recorded for a step.
    """
    query = await db.execute(select(VerificationProof).where(VerificationProof.step_id == step_id))
    proof = query.scalar_one_or_none()
    if not proof:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Verification proof for step '{step_id}' not found."
        )

    assertions = []
    if proof.assertions_json:
        try:
            assertions = [AssertionResult(**a) for a in json.loads(proof.assertions_json)]
        except Exception:
            pass

    state_delta = None
    if proof.external_state_delta_json:
        try:
            state_delta = json.loads(proof.external_state_delta_json)
        except Exception:
            pass

    return VerificationProofRead(
        id=proof.id,
        step_id=proof.step_id,
        verifier_name=proof.verifier_name,
        status=proof.status,
        assertions=assertions,
        external_state_delta=state_delta,
        latency_ms=proof.latency_ms,
        verified_at=proof.verified_at
    )
