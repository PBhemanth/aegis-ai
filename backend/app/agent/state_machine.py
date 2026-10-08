"""
Aegis Deterministic State Machine Engine
Enforces unidirectional, verified state transitions for Plans and Steps.
Prevents unverified, skipping, or backwards state transitions.
"""
from typing import Dict, Set
from backend.app.schemas.common import PlanStatus, StepStatus


class StateMachineError(Exception):
    """Raised when an illegal state transition is attempted."""
    def __init__(self, current_state: str, target_state: str, entity_type: str = "Step"):
        self.current_state = current_state
        self.target_state = target_state
        self.entity_type = entity_type
        super().__init__(
            f"Invalid {entity_type} state transition: cannot transition from '{current_state}' to '{target_state}'."
        )


class StateMachine:
    # Explicit legal transition graphs
    LEGAL_STEP_TRANSITIONS: Dict[StepStatus, Set[StepStatus]] = {
        StepStatus.PENDING: {StepStatus.PROPOSED, StepStatus.FAILED},
        StepStatus.PROPOSED: {StepStatus.AWAITING_APPROVAL, StepStatus.EXECUTING, StepStatus.FAILED, StepStatus.REJECTED},
        StepStatus.AWAITING_APPROVAL: {StepStatus.APPROVED, StepStatus.REJECTED, StepStatus.FAILED},
        StepStatus.APPROVED: {StepStatus.EXECUTING, StepStatus.FAILED},
        StepStatus.EXECUTING: {StepStatus.VERIFYING, StepStatus.FAILED, StepStatus.RECOVERING},
        # Verification MUST occur before VERIFIED is reached
        StepStatus.VERIFYING: {StepStatus.VERIFIED, StepStatus.FAILED, StepStatus.RECOVERING},
        StepStatus.RECOVERING: {StepStatus.EXECUTING, StepStatus.VERIFYING, StepStatus.FAILED, StepStatus.REJECTED},
        StepStatus.VERIFIED: set(),  # Terminal success state for a step
        StepStatus.FAILED: set(),    # Terminal failure state
        StepStatus.REJECTED: set(),  # Terminal rejected state
    }

    LEGAL_PLAN_TRANSITIONS: Dict[PlanStatus, Set[PlanStatus]] = {
        PlanStatus.PLANNING: {PlanStatus.RUNNING, PlanStatus.FAILED, PlanStatus.HALTED},
        PlanStatus.RUNNING: {PlanStatus.COMPLETED, PlanStatus.FAILED, PlanStatus.HALTED},
        PlanStatus.COMPLETED: set(), # Terminal
        PlanStatus.FAILED: set(),    # Terminal
        PlanStatus.HALTED: {PlanStatus.RUNNING, PlanStatus.FAILED}, # Can be resumed if unblocked
    }

    @classmethod
    def can_transition_step(cls, current: StepStatus, target: StepStatus) -> bool:
        """Returns True if transition is legally valid according to execution rules."""
        if current == target:
            return True
        return target in cls.LEGAL_STEP_TRANSITIONS.get(current, set())

    @classmethod
    def validate_step_transition(cls, current: StepStatus, target: StepStatus) -> None:
        """Raises StateMachineError if step transition is invalid."""
        if not cls.can_transition_step(current, target):
            raise StateMachineError(current_state=current.value, target_state=target.value, entity_type="Step")

    @classmethod
    def can_transition_plan(cls, current: PlanStatus, target: PlanStatus) -> bool:
        """Returns True if plan transition is legally valid."""
        if current == target:
            return True
        return target in cls.LEGAL_PLAN_TRANSITIONS.get(current, set())

    @classmethod
    def validate_plan_transition(cls, current: PlanStatus, target: PlanStatus) -> None:
        """Raises StateMachineError if plan transition is invalid."""
        if not cls.can_transition_plan(current, target):
            raise StateMachineError(current_state=current.value, target_state=target.value, entity_type="Plan")
