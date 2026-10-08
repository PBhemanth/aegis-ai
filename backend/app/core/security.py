"""
Aegis Security Primitives
Provides symmetric encryption, HMAC action nonces, and tamper-evident audit hash-chaining.
"""
import hmac
import hashlib
import json
import time
from typing import Any, Dict, Optional, Tuple
from cryptography.fernet import Fernet
from backend.app.core.config import settings


class SecurityService:
    def __init__(self, encryption_key: Optional[str] = None, hmac_key: Optional[str] = None):
        key = encryption_key or settings.AEGIS_ENCRYPTION_KEY
        # Ensure Fernet key is valid bytes
        if isinstance(key, str):
            key = key.encode()
        self.fernet = Fernet(key)
        self.hmac_secret = (hmac_key or settings.HMAC_SECRET_KEY).encode()

    @staticmethod
    def canonical_json(data: Any) -> str:
        """
        Produces deterministic, whitespace-normalized, sorted JSON representation.
        Guarantees identical cryptographic hashes across runs.
        """
        return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=True, default=str)

    def encrypt_data(self, plaintext: str) -> str:
        """Encrypts sensitive tokens/payloads with AES-128 via Fernet."""
        return self.fernet.encrypt(plaintext.encode()).decode()

    def decrypt_data(self, ciphertext: str) -> str:
        """Decrypts AES-128 ciphertext."""
        return self.fernet.decrypt(ciphertext.encode()).decode()

    def compute_action_fingerprint(self, step_id: str, tool_name: str, parameters: Dict[str, Any]) -> str:
        """
        Computes SHA-256 fingerprint of the exact tool invocation and resolved parameters.
        Prevents parameter tampering between risk approval and execution.
        """
        canonical_params = self.canonical_json(parameters)
        payload = f"{step_id}:{tool_name}:{canonical_params}".encode()
        return hashlib.sha256(payload).hexdigest()

    def generate_approval_nonce(
        self,
        plan_id: str,
        step_id: str,
        action_fingerprint: str,
        ttl_seconds: Optional[int] = None
    ) -> Tuple[str, int]:
        """
        Generates a time-limited HMAC-SHA256 approval nonce tied to plan, step, and action fingerprint.
        Returns: (nonce_hex, expires_at_timestamp)
        """
        ttl = ttl_seconds if ttl_seconds is not None else settings.APPROVAL_TTL_SECONDS
        expires_at = int(time.time()) + ttl
        message = f"{plan_id}:{step_id}:{action_fingerprint}:{expires_at}".encode()
        signature = hmac.new(self.hmac_secret, message, hashlib.sha256).hexdigest()
        # Nonce embeds signature and expiry for self-contained verification
        nonce = f"{signature}.{expires_at}"
        return nonce, expires_at

    def verify_approval_nonce(
        self,
        nonce: str,
        plan_id: str,
        step_id: str,
        action_fingerprint: str
    ) -> bool:
        """
        Validates HMAC signature and checks TTL expiry.
        Returns True if valid and not expired, False otherwise.
        """
        try:
            parts = nonce.split(".")
            if len(parts) != 2:
                return False
            signature, expires_at_str = parts
            expires_at = int(expires_at_str)
            now = int(time.time())

            if now > expires_at:
                return False  # Expired

            expected_message = f"{plan_id}:{step_id}:{action_fingerprint}:{expires_at}".encode()
            expected_sig = hmac.new(self.hmac_secret, expected_message, hashlib.sha256).hexdigest()

            return hmac.compare_digest(signature, expected_sig)
        except Exception:
            return False

    @classmethod
    def compute_audit_hash(
        cls,
        prev_hash: Optional[str],
        event_id: str,
        timestamp: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> str:
        """
        Calculates SHA-256 hash for an audit ledger event block:
        H_n = SHA256((prev_hash or 'GENESIS') + event_id + timestamp + event_type + canonical_payload)
        """
        prev = prev_hash or "GENESIS_AEGIS_BLOCK"
        canonical_p = cls.canonical_json(payload)
        material = f"{prev}:{event_id}:{timestamp}:{event_type}:{canonical_p}".encode()
        return hashlib.sha256(material).hexdigest()

    @classmethod
    def verify_audit_chain(cls, events: list) -> bool:
        """
        Verifies continuous cryptographic integrity of an audit ledger event sequence.
        Returns False if any payload or link has been tampered with.
        """
        if not events:
            return True

        current_prev: Optional[str] = None
        for event in events:
            # Check prev_hash link
            if event.prev_proof_hash != current_prev:
                return False

            payload = event.payload if isinstance(event.payload, dict) else json.loads(event.payload)
            expected_hash = cls.compute_audit_hash(
                prev_hash=event.prev_proof_hash,
                event_id=event.id,
                timestamp=event.timestamp.isoformat() if hasattr(event.timestamp, "isoformat") else str(event.timestamp),
                event_type=event.event_type,
                payload=payload
            )
            if expected_hash != event.proof_hash:
                return False

            current_prev = event.proof_hash

        return True


# Global default instance
security_service = SecurityService()
