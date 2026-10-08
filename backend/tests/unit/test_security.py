"""
Unit Tests: Security Primitives
Tests symmetric encryption, HMAC approval nonces, and tamper-evident hash chaining.
"""
import time
from backend.app.core.security import SecurityService


def test_fernet_encryption_and_decryption():
    sec = SecurityService()
    secret_text = "refresh_token_xyz_oauth_google_12345"
    encrypted = sec.encrypt_data(secret_text)
    assert encrypted != secret_text
    decrypted = sec.decrypt_data(encrypted)
    assert decrypted == secret_text


def test_canonical_json_determinism():
    data1 = {"b": 2, "a": 1, "nested": {"z": 10, "y": 20}}
    data2 = {"nested": {"y": 20, "z": 10}, "a": 1, "b": 2}
    # Deterministic formatting must yield identical strings
    assert SecurityService.canonical_json(data1) == SecurityService.canonical_json(data2)


def test_action_fingerprint_tampering_detection():
    sec = SecurityService()
    params1 = {"file_id": "file_123", "permanent": True}
    params2 = {"file_id": "file_123", "permanent": False}

    fp1 = sec.compute_action_fingerprint("step_1", "google_drive_delete_file", params1)
    fp2 = sec.compute_action_fingerprint("step_1", "google_drive_delete_file", params2)

    assert fp1 != fp2
    # Same parameters yield identical fingerprint
    assert fp1 == sec.compute_action_fingerprint("step_1", "google_drive_delete_file", params1)


def test_approval_nonce_issuance_and_validation():
    sec = SecurityService()
    plan_id = "plan_alpha"
    step_id = "step_beta"
    fingerprint = "0123456789abcdef"

    nonce, expires_at = sec.generate_approval_nonce(plan_id, step_id, fingerprint, ttl_seconds=60)
    assert expires_at > int(time.time())

    # Valid check
    assert sec.verify_approval_nonce(nonce, plan_id, step_id, fingerprint) is True

    # Tampered plan_id check
    assert sec.verify_approval_nonce(nonce, "plan_tampered", step_id, fingerprint) is False

    # Tampered fingerprint check
    assert sec.verify_approval_nonce(nonce, plan_id, step_id, "tampered_fingerprint") is False


def test_approval_nonce_expiration():
    sec = SecurityService()
    plan_id = "plan_alpha"
    step_id = "step_beta"
    fingerprint = "0123456789abcdef"

    # Expired nonce (TTL = -10 seconds)
    nonce, expires_at = sec.generate_approval_nonce(plan_id, step_id, fingerprint, ttl_seconds=-10)
    assert sec.verify_approval_nonce(nonce, plan_id, step_id, fingerprint) is False


def test_audit_hash_chain_integrity_and_tampering():
    class DummyEvent:
        def __init__(self, id, event_type, timestamp, payload, prev_hash=None):
            self.id = id
            self.event_type = event_type
            self.timestamp = timestamp
            self.payload = payload
            self.prev_proof_hash = prev_hash
            self.proof_hash = SecurityService.compute_audit_hash(
                prev_hash=prev_hash,
                event_id=id,
                timestamp=str(timestamp),
                event_type=event_type,
                payload=payload
            )

    e1 = DummyEvent("e1", "PLAN_SYNTHESIZED", "2026-10-08T12:00:00Z", {"plan": "dag_1"}, None)
    e2 = DummyEvent("e2", "RISK_EVALUATED", "2026-10-08T12:00:01Z", {"tier": "TIER_0"}, e1.proof_hash)
    e3 = DummyEvent("e3", "PLAN_COMPLETED", "2026-10-08T12:00:02Z", {"status": "SUCCESS"}, e2.proof_hash)

    chain = [e1, e2, e3]
    # Chain is valid
    assert SecurityService.verify_audit_chain(chain) is True

    # Tamper with e2 payload
    e2.payload = {"tier": "TAMPERED_TIER"}
    assert SecurityService.verify_audit_chain(chain) is False
