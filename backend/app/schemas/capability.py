"""
Aegis Capability Gap Schemas
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class CapabilityGapReport(BaseModel):
    has_gap: bool = Field(description="True if requested goal requires unavailable tools or scopes")
    missing_capabilities: List[str] = Field(default_factory=list, description="Names of missing capabilities")
    unsupported_features: List[str] = Field(default_factory=list, description="Explicit user features requested but unsupported")
    explanation: str = Field(description="Honest explanation of runtime limitations")
    proposed_alternative: Optional[str] = Field(default=None, description="Suggested alternative path using available tools")
    can_partially_execute: bool = Field(default=False, description="True if some sub-goals can be satisfied safely")
