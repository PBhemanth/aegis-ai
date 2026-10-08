"""
Aegis Tool Metadata Schemas
"""
from typing import Any, Dict, List
from pydantic import BaseModel, Field
from backend.app.schemas.common import RiskTier


class ToolMetadata(BaseModel):
    name: str
    description: str
    category: str
    base_risk_tier: RiskTier
    required_scopes: List[str] = Field(default_factory=list)
    requires_approval: bool = False
    parameters_schema: Dict[str, Any] = Field(default_factory=dict)
