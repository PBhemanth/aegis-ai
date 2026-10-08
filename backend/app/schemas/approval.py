"""
Aegis Permission and Approval Schemas
"""
from typing import Optional
from pydantic import BaseModel, Field


class ApprovalRequest(BaseModel):
    plan_id: str
    step_id: str
    approval_nonce: str
    action_fingerprint: str
    typed_confirmation: Optional[str] = Field(
        default=None,
        description="Required exact confirmation phrase for Tier 3 actions (e.g. 'DELETE')"
    )


class ApprovalResponse(BaseModel):
    approved: bool
    plan_id: str
    step_id: str
    status: str
    message: str
    timestamp: str


class RejectionRequest(BaseModel):
    plan_id: str
    step_id: str
    reason: Optional[str] = Field(default="Rejected by user", description="User explanation for rejection")
