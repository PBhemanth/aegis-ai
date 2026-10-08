"""
SQLAlchemy Models: AuditEvent
Tamper-evident append-only ledger entries linked by SHA-256 hash chains.
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    plan_id = Column(String, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    step_id = Column(String, ForeignKey("steps.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    severity = Column(String, default="INFO", nullable=False)
    actor = Column(String, default="SYSTEM", nullable=False)
    payload_json = Column(Text, default="{}", nullable=False)
    prev_proof_hash = Column(String, nullable=True)
    proof_hash = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)

    plan = relationship("Plan", back_populates="audit_events")


Index("idx_audit_plan_timestamp", AuditEvent.plan_id, AuditEvent.timestamp)
