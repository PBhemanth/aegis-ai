"""
SQLAlchemy Models: Plan & Step
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    raw_goal = Column(Text, nullable=False)
    goal_summary = Column(Text, nullable=False)
    status = Column(String, default="PLANNING", nullable=False)
    dag_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="plans")
    steps = relationship("Step", back_populates="plan", cascade="all, delete-orphan", order_by="Step.step_order")
    audit_events = relationship("AuditEvent", back_populates="plan", cascade="all, delete-orphan")


class Step(Base):
    __tablename__ = "steps"

    id = Column(String, primary_key=True, index=True)
    plan_id = Column(String, ForeignKey("plans.id", ondelete="CASCADE"), nullable=False, index=True)
    step_order = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    tool_name = Column(String, nullable=False)
    parameters_json = Column(Text, default="{}", nullable=False)
    risk_tier = Column(String, default="TIER_0_READ", nullable=False)
    blast_radius_json = Column(Text, nullable=True)
    status = Column(String, default="PENDING", nullable=False)
    approval_nonce = Column(String, nullable=True)
    action_fingerprint = Column(String, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    execution_result_json = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    plan = relationship("Plan", back_populates="steps")
    verification_proof = relationship("VerificationProof", back_populates="step", uselist=False, cascade="all, delete-orphan")
