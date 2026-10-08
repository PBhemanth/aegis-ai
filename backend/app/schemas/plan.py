"""
Aegis Plan and Step Schemas
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import PlanStatus, RiskTier, StepStatus
from backend.app.schemas.risk import BlastRadiusReport


class StepDefinition(BaseModel):
    step_id: str = Field(description="Unique step identifier in DAG, e.g. 'step_1'")
    step_order: int = Field(ge=1)
    title: str
    tool_name: str
    tool_parameters: Dict[str, Any] = Field(default_factory=dict)
    dependencies: List[str] = Field(default_factory=list, description="IDs of prerequisite steps")
    expected_output_type: Optional[str] = None
    rationale: Optional[str] = None


class PlanDAG(BaseModel):
    goal: str
    goal_summary: str
    steps: List[StepDefinition]


class StepRead(BaseModel):
    id: str
    plan_id: str
    step_order: int
    title: str
    tool_name: str
    parameters: Dict[str, Any]
    risk_tier: RiskTier
    blast_radius: Optional[BlastRadiusReport] = None
    status: StepStatus
    approval_nonce: Optional[str] = None
    action_fingerprint: Optional[str] = None
    approved_at: Optional[datetime] = None
    execution_result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime


class PlanCreate(BaseModel):
    goal: str = Field(min_length=3, description="Natural language goal provided by the user")
    user_id: Optional[str] = Field(default="default_user")


class PlanRead(BaseModel):
    id: str
    user_id: str
    raw_goal: str
    goal_summary: str
    status: PlanStatus
    steps: List[StepRead] = Field(default_factory=list)
    created_at: datetime
    completed_at: Optional[datetime] = None
