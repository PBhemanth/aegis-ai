"""
Aegis Permission Gate Service
Manages cryptographic nonce issuance, validation, and human signoff enforcement.
"""
from typing import Any, Dict, Optional, Tuple
from backend.app.core.security import security_service
from backend.app.schemas.approval import ApprovalRequest
from backend.app.schemas.risk import RiskEvaluation


class PermissionGateError(Exception):
    """Raised when an approval validation fails security assertions."""
    pass


class PermissionGate:
    def __init__(self, sec_service=None):
        self.security = sec_service or security_service

    def prepare_permission_gate(
        self,
        plan_id: str,
        step_id: str,
        tool_name: str,
        parameters: Dict[str, Any],
        ttl_seconds: Optional[int] = None
    ) -> Tuple[str, str, int]:
        """
        Creates a time-limited cryptographic approval challenge.
        Returns: (approval_nonce, action_fingerprint, expires_at)
        """
        fingerprint = self.security.compute_action_fingerprint(
            step_id=step_id,
            tool_name=tool_name,
            parameters=parameters
        )
        nonce, expires_at = self.security.generate_approval_nonce(
            plan_id=plan_id,
            step_id=step_id,
            action_fingerprint=fingerprint,
            ttl_seconds=ttl_seconds
        )
        return nonce, fingerprint, expires_at

    def validate_approval(
        self,
        request: ApprovalRequest,
        stored_nonce: str,
        expected_fingerprint: str,
        risk_evaluation: Optional[RiskEvaluation] = None
    ) -> Tuple[bool, str]:
        """
        Validates that an approval submission is authentic, untampered, unexpired,
        and includes necessary typed confirmation phrases for Tier 3 actions.
        """
        # 1. Nonce match check
        if request.approval_nonce != stored_nonce:
            return False, "Approval nonce mismatch."

        # 2. Fingerprint check
        if request.action_fingerprint != expected_fingerprint:
            return False, "Action fingerprint mismatch: parameters may have been modified."

        # 3. Cryptographic signature and TTL check
        is_sig_valid = self.security.verify_approval_nonce(
            nonce=request.approval_nonce,
            plan_id=request.plan_id,
            step_id=request.step_id,
            action_fingerprint=expected_fingerprint
        )
        if not is_sig_valid:
            return False, "Approval nonce is invalid or has expired."

        # 4. Mandatory Typed Confirmation Check (for Tier 3 Destructive Actions)
        if risk_evaluation and risk_evaluation.requires_typed_confirmation:
            required_phrase = (risk_evaluation.confirmation_phrase or "CONFIRM").upper()
            provided_phrase = (request.typed_confirmation or "").strip().upper()
            if provided_phrase != required_phrase:
                return False, f"Typed confirmation mismatch: expected '{required_phrase}', received '{provided_phrase}'."

        return True, "Approval validated successfully."


permission_gate = PermissionGate()
