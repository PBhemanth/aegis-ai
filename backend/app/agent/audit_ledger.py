"""
Aegis Cryptographic Tamper-Evident Audit Ledger
Append-only, SHA-256 hash-chained immutable audit ledger tracking all plan,
step, execution, verification, and recovery actions.
Guarantees secret scrubbing, verifiable hash chain integrity, and real-time SSE broadcasting.
"""
import json
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import SecurityService, security_service
from backend.app.models.audit import AuditEvent
from backend.app.schemas.audit import AgentEvent, AuditEventRead, AuditVerificationResult
from backend.app.schemas.common import Actor, EventType, Severity
from backend.app.services.event_broadcaster import event_broadcaster

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "access_token",
    "refresh_token",
    "client_secret",
    "client_id",
    "password",
    "secret",
    "authorization",
    "api_key",
    "cookie",
    "token",
    "private_key",
    "id_token"
}


class AuditLedger:
    @classmethod
    def scrub_secrets(cls, data: Any) -> Any:
        """
        Recursively redacts authentication tokens, OAuth secrets, private keys,
        and sensitive headers from any payload structure prior to storage and broadcasting.
        """
        if isinstance(data, dict):
            scrubbed = {}
            for k, v in data.items():
                if any(sensitive in k.lower() for sensitive in SENSITIVE_KEYS):
                    scrubbed[k] = "[REDACTED]"
                else:
                    scrubbed[k] = cls.scrub_secrets(v)
            return scrubbed
        elif isinstance(data, list):
            return [cls.scrub_secrets(item) for item in data]
        elif isinstance(data, str):
            if data.startswith("ya29.") or data.startswith("1//0"):
                return "[REDACTED]"
            if "bearer " in data.lower():
                return re.sub(r"(bearer\s+)[a-zA-Z0-9_\-\.]+", r"\1[REDACTED]", data, flags=re.IGNORECASE)
            return data
        return data

    @classmethod
    async def record_event(
        cls,
        plan_id: str,
        event_type: Any,
        payload: Dict[str, Any],
        step_id: Optional[str] = None,
        actor: Any = Actor.SYSTEM,
        severity: Any = Severity.INFO,
        db: Optional[AsyncSession] = None,
        message: Optional[str] = None,
        broadcast: bool = True
    ) -> AuditEvent:
        """
        Appends an immutable, SHA-256 hash-chained event block to the ledger.
        Scrubs all sensitive material, validates cryptographic linkage,
        and broadcasts the event in real-time to active SSE observers.
        """
        event_type_str = event_type.value if hasattr(event_type, "value") else str(event_type)
        actor_str = actor.value if hasattr(actor, "value") else str(actor)
        severity_str = severity.value if hasattr(severity, "value") else str(severity)

        scrubbed_payload = cls.scrub_secrets(payload)
        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        async def _execute_record(session: AsyncSession) -> AuditEvent:
            # Query last event in hash chain for this plan
            last_event_query = await session.execute(
                select(AuditEvent)
                .where(AuditEvent.plan_id == plan_id)
                .order_by(AuditEvent.timestamp.desc(), AuditEvent.id.desc())
                .limit(1)
            )
            last_event = last_event_query.scalar_one_or_none()
            prev_hash = last_event.proof_hash if last_event else None

            # Compute SHA-256 block hash over previous hash + canonical block
            proof_hash = security_service.compute_audit_hash(
                prev_hash=prev_hash,
                event_id=event_id,
                timestamp=now,
                event_type=event_type_str,
                payload=scrubbed_payload
            )

            audit_entry = AuditEvent(
                id=event_id,
                plan_id=plan_id,
                step_id=step_id,
                event_type=event_type_str,
                severity=severity_str,
                actor=actor_str,
                payload_json=json.dumps(scrubbed_payload, default=str),
                prev_proof_hash=prev_hash,
                proof_hash=proof_hash,
                timestamp=now
            )
            session.add(audit_entry)
            await session.flush()
            return audit_entry

        if db is not None:
            entry = await _execute_record(db)
        else:
            async with AsyncSessionLocal() as session:
                entry = await _execute_record(session)
                await session.commit()

        # Real-time event broadcasting to SSE listeners
        if broadcast:
            event_msg = message or f"[{event_type_str}] {scrubbed_payload.get('status') or scrubbed_payload.get('tool_name') or ''}".strip()
            agent_evt = AgentEvent(
                id=entry.id,
                timestamp=entry.timestamp,
                event_type=event_type_str,
                plan_id=plan_id,
                step_id=step_id,
                actor=actor_str,
                severity=severity_str,
                message=event_msg,
                data=scrubbed_payload,
                proof_hash=entry.proof_hash,
                prev_proof_hash=entry.prev_proof_hash
            )
            event_broadcaster.broadcast(agent_evt)

        return entry

    @classmethod
    async def verify_plan_chain(cls, plan_id: str, db: AsyncSession) -> AuditVerificationResult:
        """
        Cryptographically verifies the complete sequential hash chain for a specific plan.
        Detects tampering with payloads, event ordering, timestamps, or hash linkages.
        """
        events_query = await db.execute(
            select(AuditEvent)
            .where(AuditEvent.plan_id == plan_id)
            .order_by(AuditEvent.timestamp.asc(), AuditEvent.id.asc())
        )
        events = events_query.scalars().all()

        now = datetime.now(timezone.utc)
        if not events:
            return AuditVerificationResult(
                plan_id=plan_id,
                is_valid=True,
                total_events=0,
                broken_event_id=None,
                details=f"No audit events found for plan '{plan_id}'. Chain is vacuously valid.",
                verified_at=now
            )

        is_valid, broken_id, details = SecurityService.verify_audit_chain_detailed(list(events))

        return AuditVerificationResult(
            plan_id=plan_id,
            is_valid=is_valid,
            total_events=len(events),
            broken_event_id=broken_id,
            details=details or "",
            verified_at=now
        )

    @classmethod
    async def get_plan_events(
        cls,
        plan_id: str,
        db: AsyncSession,
        limit: int = 200,
        offset: int = 0
    ) -> List[AuditEventRead]:
        """
        Retrieves ordered audit events for a plan, formatted with scrubbed payloads.
        """
        events_query = await db.execute(
            select(AuditEvent)
            .where(AuditEvent.plan_id == plan_id)
            .order_by(AuditEvent.timestamp.asc(), AuditEvent.id.asc())
            .offset(offset)
            .limit(limit)
        )
        events = events_query.scalars().all()

        result = []
        for ev in events:
            try:
                payload_dict = json.loads(ev.payload_json) if ev.payload_json else {}
            except Exception:
                payload_dict = {"raw": ev.payload_json}

            result.append(
                AuditEventRead(
                    id=ev.id,
                    plan_id=ev.plan_id,
                    step_id=ev.step_id,
                    event_type=ev.event_type,
                    severity=ev.severity,
                    actor=ev.actor,
                    payload=cls.scrub_secrets(payload_dict),
                    prev_proof_hash=ev.prev_proof_hash,
                    proof_hash=ev.proof_hash,
                    timestamp=ev.timestamp
                )
            )
        return result

    @classmethod
    async def get_all_events(
        cls,
        db: AsyncSession,
        plan_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[AuditEventRead]:
        """Retrieves paginated audit events across all plans or filtered by plan_id."""
        query = select(AuditEvent).order_by(AuditEvent.timestamp.desc(), AuditEvent.id.desc())
        if plan_id:
            query = query.where(AuditEvent.plan_id == plan_id)
        query = query.offset(offset).limit(limit)

        events_query = await db.execute(query)
        events = events_query.scalars().all()

        result = []
        for ev in events:
            try:
                payload_dict = json.loads(ev.payload_json) if ev.payload_json else {}
            except Exception:
                payload_dict = {"raw": ev.payload_json}

            result.append(
                AuditEventRead(
                    id=ev.id,
                    plan_id=ev.plan_id,
                    step_id=ev.step_id,
                    event_type=ev.event_type,
                    severity=ev.severity,
                    actor=ev.actor,
                    payload=cls.scrub_secrets(payload_dict),
                    prev_proof_hash=ev.prev_proof_hash,
                    proof_hash=ev.proof_hash,
                    timestamp=ev.timestamp
                )
            )
        return result


# Global singleton instance
audit_ledger = AuditLedger()
