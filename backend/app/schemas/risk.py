"""
Aegis Risk Engine Schemas
Defines Blast Radius calculations and deterministic Risk Evaluation data models.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import RiskTier


class AffectedEntity(BaseModel):
    id: Optional[str] = None
    name: str
    entity_type: str = Field(default="file", description="'file', 'event', 'folder', 'permission', etc.")
    size_bytes: Optional[int] = None
    path_or_uri: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class BlastRadiusReport(BaseModel):
    item_count: int = Field(default=0, ge=0)
    total_size_bytes: int = Field(default=0, ge=0)
    affected_entities: List[AffectedEntity] = Field(default_factory=list)
    reversibility_score: int = Field(default=1, ge=1, le=10, description="1 (soft-trash) to 10 (permanent delete)")
    sensitivity_score: int = Field(default=1, ge=1, le=5, description="1 (isolated sandbox) to 5 (root / external)")
    blast_radius_score: float = Field(default=0.0, ge=0.0)
    summary: str


class RiskEvaluation(BaseModel):
    tool_name: str
    parameters: Dict[str, Any]
    risk_tier: RiskTier
    blast_radius: BlastRadiusReport
    score: float = Field(default=0.0)
    requires_approval: bool = False
    requires_typed_confirmation: bool = False
    confirmation_phrase: Optional[str] = None
    justification: str
