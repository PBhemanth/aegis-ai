"""
Aegis Execution Schemas
Defines execution receipts, telemetry, and execution requests.
"""
from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class ExecutionReceipt(BaseModel):
    step_id: str
    plan_id: str
    tool_name: str
    status: str = Field(description="'EXECUTED' or 'EXECUTION_FAILED'")
    started_at: datetime
    completed_at: datetime
    latency_ms: int = Field(ge=0)
    result_data: Dict[str, Any] = Field(default_factory=dict, description="Sanitized tool execution output")
    error_message: Optional[str] = None
    action_fingerprint: str = Field(description="SHA-256 fingerprint of approved parameters")


class StepExecutionRequest(BaseModel):
    approval_nonce: Optional[str] = None
    action_fingerprint: Optional[str] = None
    typed_confirmation: Optional[str] = None
