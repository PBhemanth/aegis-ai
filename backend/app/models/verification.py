"""
SQLAlchemy Models: VerificationProof
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class VerificationProof(Base):
    __tablename__ = "verification_proofs"

    id = Column(String, primary_key=True, index=True)
    step_id = Column(String, ForeignKey("steps.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    verifier_name = Column(String, nullable=False)
    status = Column(String, nullable=False)  # PASSED or FAILED
    assertions_json = Column(Text, default="[]", nullable=False)
    external_state_delta_json = Column(Text, nullable=True)
    latency_ms = Column(Integer, nullable=False)
    verified_at = Column(DateTime, default=utc_now, nullable=False)

    step = relationship("Step", back_populates="verification_proof")
