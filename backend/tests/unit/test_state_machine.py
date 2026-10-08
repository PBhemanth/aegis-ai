"""
Unit Tests: Deterministic State Machine Engine
Verifies valid progression and strictly blocks invalid, skipping, or bypassing transitions.
"""
import pytest
from backend.app.agent.state_machine import StateMachine, StateMachineError
from backend.app.schemas.common import PlanStatus, StepStatus


def test_valid_step_lifecycle_progression():
    # Standard safe autonomous execution progression
    StateMachine.validate_step_transition(StepStatus.PENDING, StepStatus.PROPOSED)
    StateMachine.validate_step_transition(StepStatus.PROPOSED, StepStatus.EXECUTING)
    StateMachine.validate_step_transition(StepStatus.EXECUTING, StepStatus.VERIFYING)
    StateMachine.validate_step_transition(StepStatus.VERIFYING, StepStatus.VERIFIED)


def test_valid_approval_gated_step_progression():
    # High-risk execution path requiring human signoff
    StateMachine.validate_step_transition(StepStatus.PENDING, StepStatus.PROPOSED)
    StateMachine.validate_step_transition(StepStatus.PROPOSED, StepStatus.AWAITING_APPROVAL)
    StateMachine.validate_step_transition(StepStatus.AWAITING_APPROVAL, StepStatus.APPROVED)
    StateMachine.validate_step_transition(StepStatus.APPROVED, StepStatus.EXECUTING)
    StateMachine.validate_step_transition(StepStatus.EXECUTING, StepStatus.VERIFYING)
    StateMachine.validate_step_transition(StepStatus.VERIFYING, StepStatus.VERIFIED)


def test_valid_rejection_step_progression():
    # User rejects proposed high-risk action
    StateMachine.validate_step_transition(StepStatus.AWAITING_APPROVAL, StepStatus.REJECTED)


def test_valid_recovery_loop_step_progression():
    # Verification failure leading to bounded recovery retry
    StateMachine.validate_step_transition(StepStatus.VERIFYING, StepStatus.RECOVERING)
    StateMachine.validate_step_transition(StepStatus.RECOVERING, StepStatus.EXECUTING)
    StateMachine.validate_step_transition(StepStatus.EXECUTING, StepStatus.VERIFYING)
    StateMachine.validate_step_transition(StepStatus.VERIFYING, StepStatus.VERIFIED)


def test_illegal_step_transitions_raise_error():
    # 1. Attempting to claim VERIFIED without EXECUTING or VERIFYING
    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.PENDING, StepStatus.VERIFIED)

    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.PROPOSED, StepStatus.VERIFIED)

    # 2. Attempting to bypass permission gate while AWAITING_APPROVAL
    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.AWAITING_APPROVAL, StepStatus.EXECUTING)

    # 3. Attempting to mark VERIFIED directly from EXECUTING without VERIFYING
    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.EXECUTING, StepStatus.VERIFIED)

    # 4. Attempting backwards transition from terminal states
    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.VERIFIED, StepStatus.PENDING)

    with pytest.raises(StateMachineError):
        StateMachine.validate_step_transition(StepStatus.FAILED, StepStatus.EXECUTING)


def test_plan_lifecycle_transitions():
    # Valid plan lifecycle
    StateMachine.validate_plan_transition(PlanStatus.PLANNING, PlanStatus.RUNNING)
    StateMachine.validate_plan_transition(PlanStatus.RUNNING, PlanStatus.COMPLETED)

    # Halt and resume
    StateMachine.validate_plan_transition(PlanStatus.RUNNING, PlanStatus.HALTED)
    StateMachine.validate_plan_transition(PlanStatus.HALTED, PlanStatus.RUNNING)

    # Illegal plan transition
    with pytest.raises(StateMachineError):
        StateMachine.validate_plan_transition(PlanStatus.COMPLETED, PlanStatus.PLANNING)
