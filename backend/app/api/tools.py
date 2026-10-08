"""
Aegis Tools API Endpoints
Provides tool discovery manifests and safe sandboxed tool execution.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.permission_gate import permission_gate
from backend.app.agent.risk_engine import RiskEngine
from backend.app.agent.tool_registry import tool_registry
from backend.app.core.database import get_db
from backend.app.schemas.approval import ApprovalRequest
from backend.app.schemas.tool import ToolMetadata
from backend.app.services.google_auth import google_auth_service
from backend.app.tools import ALL_TOOLS, ExecutionContext, ToolExecutionError, AuthenticationRequiredError

router = APIRouter(prefix="/tools", tags=["Tools"])

# Map of tool_name -> tool instance
TOOL_INSTANCE_MAP = {t.name: t for t in ALL_TOOLS}


class ToolExecuteRequest(BaseModel):
    tool_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    user_id: Optional[str] = Field(default="default_user")
    approval_nonce: Optional[str] = Field(default=None)
    action_fingerprint: Optional[str] = Field(default=None)
    plan_id: Optional[str] = Field(default="direct_execution")
    step_id: Optional[str] = Field(default="step_direct")
    typed_confirmation: Optional[str] = Field(default=None)


class ToolExecuteResponse(BaseModel):
    tool_name: str
    status: str
    result: Dict[str, Any]


@router.get("", response_model=List[ToolMetadata])
async def list_available_tools():
    """
    Returns the complete live manifest of registered tools with their schemas,
    required scopes, risk tiers, and verification contracts.
    """
    return tool_registry.list_tools()


@router.post("/execute", response_model=ToolExecuteResponse)
async def execute_tool(
    payload: ToolExecuteRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a registered tool within the safe runtime sandbox.
    Enforces deterministic risk evaluation and permission gates prior to execution.
    """
    tool = TOOL_INSTANCE_MAP.get(payload.tool_name)
    if not tool:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tool '{payload.tool_name}' is not registered."
        )

    # 1. Deterministic Risk Evaluation
    risk_eval = RiskEngine.evaluate_risk(payload.tool_name, payload.parameters)

    # 2. Permission Gate Check
    approval_granted = False
    if risk_eval.requires_approval:
        if not payload.approval_nonce or not payload.action_fingerprint:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Tool '{payload.tool_name}' is {risk_eval.risk_tier.value} and requires verified approval challenge."
            )

        app_req = ApprovalRequest(
            plan_id=payload.plan_id or "direct_execution",
            step_id=payload.step_id or "step_direct",
            approval_nonce=payload.approval_nonce,
            action_fingerprint=payload.action_fingerprint,
            typed_confirmation=payload.typed_confirmation
        )

        valid, msg = permission_gate.validate_approval(
            request=app_req,
            stored_nonce=payload.approval_nonce,
            expected_fingerprint=payload.action_fingerprint,
            risk_evaluation=risk_eval
        )
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Approval validation failed: {msg}"
            )
        approval_granted = True

    # 3. Load OAuth Credentials if needed
    creds = None
    if tool.required_scopes:
        creds = await google_auth_service.get_credentials(user_id=payload.user_id or "default_user", db=db)

    # 4. Parse typed parameters
    try:
        parsed_params = tool.input_schema(**payload.parameters)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Parameter schema validation error: {str(e)}"
        )

    # 5. Build Execution Context
    context = ExecutionContext(
        user_id=payload.user_id or "default_user",
        credentials=creds,
        approval_granted=approval_granted,
        approval_nonce=payload.approval_nonce
    )

    # 6. Execute tool
    try:
        result = await tool.execute(parsed_params, context)
        return ToolExecuteResponse(
            tool_name=tool.name,
            status="SUCCESS",
            result=result.model_dump()
        )
    except AuthenticationRequiredError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except ToolExecutionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected tool execution error: {str(e)}"
        )
