"""
Aegis Plan API Endpoints
Manages dynamic plan generation, capability gap checks, and plan retrieval.
"""
import json
import uuid
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.audit_ledger import audit_ledger
from backend.app.agent.capability_engine import CapabilityGapEngine
from backend.app.agent.planner import DynamicPlanner, PlannerResult, dynamic_planner
from backend.app.core.database import get_db
from backend.app.models.plan import Plan, Step
from backend.app.models.user import User
from backend.app.schemas.capability import CapabilityGapReport
from backend.app.schemas.common import Actor, EventType
from backend.app.schemas.plan import PlanCreate, PlanRead, StepRead
from backend.app.schemas.risk import BlastRadiusReport

router = APIRouter(prefix="/plan", tags=["Planning"])


class GoalAnalysisRequest(BaseModel):
    goal: str = Field(min_length=3, description="Natural language goal to analyze")


class PlanGenerationResponse(BaseModel):
    plan_id: Optional[str] = None
    status: str
    goal: str
    goal_summary: Optional[str] = None
    capability_gap: Optional[CapabilityGapReport] = None
    planner_result: PlannerResult


@router.post("/analyze-gap", response_model=CapabilityGapReport)
async def analyze_capability_gap(payload: GoalAnalysisRequest) -> CapabilityGapReport:
    """
    Evaluates whether a natural language goal can be satisfied by registered tools,
    or if it requires unsupported capabilities.
    """
    return CapabilityGapEngine.analyze_goal(payload.goal)


@router.post("/generate", response_model=PlanGenerationResponse)
async def generate_plan(
    payload: PlanCreate,
    db: AsyncSession = Depends(get_db)
) -> PlanGenerationResponse:
    """
    Synthesizes a structured, dependency-aware PlanDAG from an arbitrary user goal.
    Evaluates capability boundaries and binds deterministic risk tiers to all steps.
    Persists plan and steps into SQLite when generation succeeds.
    """
    result: PlannerResult = await dynamic_planner.plan_goal(payload.goal)

    if result.status == "CAPABILITY_GAP":
        return PlanGenerationResponse(
            plan_id=None,
            status="CAPABILITY_GAP",
            goal=payload.goal,
            goal_summary=result.goal_summary,
            capability_gap=result.capability_gap,
            planner_result=result
        )

    if result.status == "PLANNING_FAILED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error_message or "Failed to synthesize a valid plan for this goal."
        )

    # Persistence to SQLite database
    plan_id = f"plan_{uuid.uuid4().hex[:12]}"
    user_id = payload.user_id or "default_user"

    # Ensure user exists for foreign key integrity
    user_query = await db.execute(select(User).where(User.id == user_id))
    user = user_query.scalar_one_or_none()
    if not user:
        user = User(
            id=user_id,
            email=f"{user_id}@aegis.local",
            display_name="Aegis Operator"
        )
        db.add(user)
        await db.flush()

    # Create Plan record
    db_plan = Plan(
        id=plan_id,
        user_id=user_id,
        raw_goal=payload.goal,
        goal_summary=result.goal_summary or payload.goal[:100],
        status="PLANNING",
        dag_json=json.dumps(result.plan_dag.model_dump() if result.plan_dag else {}, default=str)
    )
    db.add(db_plan)

    # Create Step records
    for step_profile in result.steps:
        step_id = f"{plan_id}_{step_profile.step_id}"
        db_step = Step(
            id=step_id,
            plan_id=plan_id,
            step_order=step_profile.step_order,
            title=step_profile.title,
            tool_name=step_profile.tool_name,
            parameters_json=json.dumps(step_profile.tool_parameters, default=str),
            risk_tier=step_profile.risk_tier.value,
            blast_radius_json=json.dumps(step_profile.blast_radius.model_dump(), default=str),
            status="PROPOSED",
            approval_nonce=None,
            action_fingerprint=None
        )
        db.add(db_step)

    await db.commit()

    # Record GOAL_RECEIVED and PLAN_CREATED in audit ledger and stream over SSE
    await audit_ledger.record_event(
        plan_id=plan_id,
        event_type=EventType.GOAL_RECEIVED,
        payload={"goal": payload.goal, "user_id": user_id},
        actor=Actor.USER,
        db=db
    )
    await audit_ledger.record_event(
        plan_id=plan_id,
        event_type=EventType.PLAN_CREATED,
        payload={
            "goal_summary": result.goal_summary,
            "steps_count": len(result.steps),
            "step_tools": [s.tool_name for s in result.steps]
        },
        actor=Actor.SYSTEM,
        db=db
    )
    await db.commit()

    return PlanGenerationResponse(
        plan_id=plan_id,
        status="SUCCESS",
        goal=payload.goal,
        goal_summary=result.goal_summary,
        capability_gap=result.capability_gap,
        planner_result=result
    )


@router.get("/{plan_id}", response_model=PlanRead)
async def get_plan(plan_id: str, db: AsyncSession = Depends(get_db)) -> PlanRead:
    """
    Retrieves a plan and its ordered steps with risk profiles from the database.
    """
    query = await db.execute(
        select(Plan).options(selectinload(Plan.steps)).where(Plan.id == plan_id)
    )
    plan = query.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{plan_id}' not found."
        )

    # Steps are ordered by step_order in relationship
    steps_read = []
    for s in plan.steps:
        blast_radius = None
        if s.blast_radius_json:
            try:
                blast_radius = BlastRadiusReport(**json.loads(s.blast_radius_json))
            except Exception:
                pass

        params = {}
        if s.parameters_json:
            try:
                params = json.loads(s.parameters_json)
            except Exception:
                pass

        result_dict = None
        if s.execution_result_json:
            try:
                result_dict = json.loads(s.execution_result_json)
            except Exception:
                pass

        steps_read.append(StepRead(
            id=s.id,
            plan_id=s.plan_id,
            step_order=s.step_order,
            title=s.title,
            tool_name=s.tool_name,
            parameters=params,
            risk_tier=s.risk_tier,
            blast_radius=blast_radius,
            status=s.status,
            approval_nonce=s.approval_nonce,
            action_fingerprint=s.action_fingerprint,
            approved_at=s.approved_at,
            execution_result=result_dict,
            error_message=s.error_message,
            created_at=s.created_at
        ))

    return PlanRead(
        id=plan.id,
        user_id=plan.user_id,
        raw_goal=plan.raw_goal,
        goal_summary=plan.goal_summary,
        status=plan.status,
        steps=steps_read,
        created_at=plan.created_at,
        completed_at=plan.completed_at
    )
