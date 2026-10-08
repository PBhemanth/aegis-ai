"""
Aegis Audit and Verification Schemas
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import Actor, EventType, Severity


class AssertionResult(BaseModel):
    assertion: str
    expected: Any
    actual: Any
    passed: bool
    details: Optional[str] = None


class VerificationProofCreate(BaseModel):
    step_id: str
    verifier_name: str
    status: str = Field(description="'PASSED' or 'FAILED'")
    assertions: List[AssertionResult]
    external_state_delta: Optional[Dict[str, Any]] = None
    latency_ms: int = Field(ge=0)


class VerificationProofRead(BaseModel):
    id: str
    step_id: str
    verifier_name: str
    status: str
    assertions: List[AssertionResult]
    external_state_delta: Optional[Dict[str, Any]] = None
    latency_ms: int
    verified_at: datetime


class AuditEventCreate(BaseModel):
    plan_id: str
    step_id: Optional[str] = None
    event_type: str
    severity: Severity = Severity.INFO
    actor: Actor = Actor.SYSTEM
    payload: Dict[str, Any] = Field(default_factory=dict)


class AuditEventRead(BaseModel):
    id: str
    plan_id: str
    step_id: Optional[str] = None
    event_type: str
    severity: str
    actor: str
    payload: Dict[str, Any]
    prev_proof_hash: Optional[str] = None
    proof_hash: str
    timestamp: datetime


class AuditVerificationResult(BaseModel):
    plan_id: str
    is_valid: bool
    total_events: int
    broken_event_id: Optional[str] = None
    details: str
    verified_at: datetime


class AgentEvent(BaseModel):
    id: str
    timestamp: datetime
    event_type: str
    plan_id: Optional[str] = None
    step_id: Optional[str] = None
    actor: str = "SYSTEM"
    severity: str = "INFO"
    message: Optional[str] = None
    data: Dict[str, Any] = Field(default_factory=dict)
    proof_hash: Optional[str] = None
    prev_proof_hash: Optional[str] = None

