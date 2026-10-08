"""
Aegis Verifier Base Contract
Defines independent state-delta verification assertions and verifier protocols.
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from backend.app.schemas.audit import AssertionResult, VerificationProofCreate
from backend.app.schemas.execution import ExecutionReceipt
from backend.app.tools.base import ExecutionContext


class BaseVerifier(ABC):
    name: str

    @abstractmethod
    async def verify(
        self,
        receipt: ExecutionReceipt,
        parameters: Dict[str, Any],
        context: ExecutionContext
    ) -> VerificationProofCreate:
        """
        Executes independent queries against external services or local runtime
        to verify that the side-effect actually occurred as claimed.
        """
        pass
