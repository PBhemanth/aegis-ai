"""
SQLAlchemy Models: User & Credentials
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    credentials = relationship("UserCredentials", back_populates="user", uselist=False, cascade="all, delete-orphan")
    plans = relationship("Plan", back_populates="user", cascade="all, delete-orphan")


class UserCredentials(Base):
    __tablename__ = "user_credentials"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    encrypted_refresh_token = Column(Text, nullable=False)
    access_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="credentials")
