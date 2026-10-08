"""
Aegis Safety & Risk Evaluation API Endpoints
"""
from typing import Any, Dict
from fastapi import APIRouter
from pydantic import BaseModel, Field
from backend.app.agent.risk_engine import RiskEngine
from backend.app.schemas.risk import BlastRadiusReport, RiskEvaluation

router = APIRouter(prefix="/safety", tags=["Safety"])


class RiskEvaluationRequest(BaseModel):
    tool_name: str = Field(description="Name of the tool to be executed")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Resolved execution arguments")


@router.post("/evaluate-risk", response_model=RiskEvaluation)
async def evaluate_risk(payload: RiskEvaluationRequest) -> RiskEvaluation:
    """
    Evaluates the deterministic risk tier, blast radius, and approval requirement
    for an arbitrary proposed tool call.
    """
    return RiskEngine.evaluate_risk(
        tool_name=payload.tool_name,
        parameters=payload.parameters
    )


@router.post("/blast-radius", response_model=BlastRadiusReport)
async def compute_blast_radius(payload: RiskEvaluationRequest) -> BlastRadiusReport:
    """
    Calculates the quantitative blast radius and impacted entities for a tool call.
    """
    return RiskEngine.compute_blast_radius(
        tool_name=payload.tool_name,
        parameters=payload.parameters
    )
