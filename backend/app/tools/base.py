"""
Aegis Tool Base Architecture
Defines the abstract BaseTool contract, ExecutionContext, and exception types.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel, ConfigDict, Field
from backend.app.schemas.common import RiskTier
from backend.app.schemas.tool import ToolMetadata


class ToolExecutionError(Exception):
    """Raised when tool execution fails."""
    def __init__(self, message: str, tool_name: str, details: Optional[Dict[str, Any]] = None):
        self.tool_name = tool_name
        self.details = details or {}
        super().__init__(f"Tool execution failed for '{tool_name}': {message}")


class AuthenticationRequiredError(ToolExecutionError):
    """Raised when an action requires unauthenticated OAuth credentials."""
    def __init__(self, tool_name: str, required_scopes: List[str]):
        super().__init__(
            message=f"Missing Google OAuth authorization for scopes: {', '.join(required_scopes)}",
            tool_name=tool_name,
            details={"required_scopes": required_scopes}
        )


class ExecutionContext(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    user_id: str = Field(default="default_user")
    credentials: Optional[Any] = None  # Google OAuth Credentials object
    sandbox_dir: Optional[str] = None
    approval_granted: bool = False
    approval_nonce: Optional[str] = None


class BaseTool(ABC):
    name: str
    description: str
    category: str
    base_risk_tier: RiskTier
    required_scopes: List[str] = []
    requires_approval: bool = False
    input_schema: Type[BaseModel]
    output_schema: Type[BaseModel]
    verification_contract: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, params: BaseModel, context: ExecutionContext) -> BaseModel:
        """Executes the tool with typed parameters and context."""
        pass

    def to_metadata(self) -> ToolMetadata:
        """Generates tool reflection metadata for the ToolRegistry."""
        return ToolMetadata(
            name=self.name,
            description=self.description,
            category=self.category,
            base_risk_tier=self.base_risk_tier,
            required_scopes=self.required_scopes,
            requires_approval=self.requires_approval,
            parameters_schema=self.input_schema.model_json_schema()
        )
