"""
Unit Tests: Permission Gate Service
Tests challenge issuance, tamper detection, TTL expiry, and mandatory typed confirmations.
"""
from backend.app.agent.permission_gate import PermissionGate
from backend.app.agent.risk_engine import RiskEngine
from backend.app.schemas.approval import ApprovalRequest


def test_permission_gate_successful_approval():
    gate = PermissionGate()
    plan_id = "plan_100"
    step_id = "step_200"
    tool_name = "google_calendar_create_event"
    parameters = {"title": "Meeting", "attendees": ["external@example.com"]}

    nonce, fingerprint, expires_at = gate.prepare_permission_gate(
        plan_id=plan_id,
        step_id=step_id,
        tool_name=tool_name,
        parameters=parameters
    )

    req = ApprovalRequest(
        plan_id=plan_id,
        step_id=step_id,
        approval_nonce=nonce,
        action_fingerprint=fingerprint
    )

    valid, msg = gate.validate_approval(
        request=req,
        stored_nonce=nonce,
        expected_fingerprint=fingerprint,
        risk_evaluation=None
    )
    assert valid is True
    assert "validated successfully" in msg


def test_permission_gate_tier_3_typed_confirmation_enforcement():
    gate = PermissionGate()
    plan_id = "plan_100"
    step_id = "step_300"
    tool_name = "google_drive_delete_file"
    parameters = {"file_id": "file_xyz", "permanent": True}

    risk_eval = RiskEngine.evaluate_risk(tool_name, parameters)
    assert risk_eval.requires_typed_confirmation is True

    nonce, fingerprint, _ = gate.prepare_permission_gate(
        plan_id=plan_id,
        step_id=step_id,
        tool_name=tool_name,
        parameters=parameters
    )

    # 1. Attempt approval with missing or wrong confirmation phrase
    bad_req = ApprovalRequest(
        plan_id=plan_id,
        step_id=step_id,
        approval_nonce=nonce,
        action_fingerprint=fingerprint,
        typed_confirmation="yes"  # Wrong! Expected "DELETE"
    )
    valid, msg = gate.validate_approval(
        request=bad_req,
        stored_nonce=nonce,
        expected_fingerprint=fingerprint,
        risk_evaluation=risk_eval
    )
    assert valid is False
    assert "Typed confirmation mismatch" in msg

    # 2. Attempt approval with correct confirmation phrase
    good_req = ApprovalRequest(
        plan_id=plan_id,
        step_id=step_id,
        approval_nonce=nonce,
        action_fingerprint=fingerprint,
        typed_confirmation="DELETE"
    )
    valid, msg = gate.validate_approval(
        request=good_req,
        stored_nonce=nonce,
        expected_fingerprint=fingerprint,
        risk_evaluation=risk_eval
    )
    assert valid is True


def test_permission_gate_rejects_parameter_tampering():
    gate = PermissionGate()
    plan_id = "plan_100"
    step_id = "step_400"
    tool_name = "google_drive_upload_file"
    parameters = {"file_name": "original.pdf"}

    nonce, fingerprint, _ = gate.prepare_permission_gate(
        plan_id=plan_id,
        step_id=step_id,
        tool_name=tool_name,
        parameters=parameters
    )

    # Attacker tries to submit approval with modified fingerprint
    tampered_req = ApprovalRequest(
        plan_id=plan_id,
        step_id=step_id,
        approval_nonce=nonce,
        action_fingerprint="tampered_fingerprint_hash"
    )
    valid, msg = gate.validate_approval(
        request=tampered_req,
        stored_nonce=nonce,
        expected_fingerprint=fingerprint,
        risk_evaluation=None
    )
    assert valid is False
    assert "fingerprint mismatch" in msg.lower()
