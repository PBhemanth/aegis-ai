"""
Aegis Core Configuration
"""
import os
import secrets
from typing import List
from cryptography.fernet import Fernet
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def _get_default_cors_origins() -> List[str]:
    origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url and render_url not in origins:
        origins.append(render_url)
    return origins


def _get_default_google_redirect_uri() -> str:
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url:
        return f"{render_url.rstrip('/')}/api/auth/google/callback"
    return "http://localhost:8000/api/auth/google/callback"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Aegis Autonomous Agent Runtime"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = Field(default=False)

    # Database
    DATABASE_URL: str = Field(default="sqlite+aiosqlite:///./aegis.db")

    # Security & Encryption
    # Defaults to an ephemeral key for dev/tests if not set in environment
    AEGIS_ENCRYPTION_KEY: str = Field(default_factory=lambda: Fernet.generate_key().decode())
    HMAC_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_hex(32))
    APPROVAL_TTL_SECONDS: int = Field(default=600)  # 10 minutes

    # CORS
    CORS_ORIGINS: List[str] = Field(default_factory=_get_default_cors_origins)

    # Google Integrations (placeholders for env configuration)
    GOOGLE_CLIENT_ID: str = Field(default="")
    GOOGLE_CLIENT_SECRET: str = Field(default="")
    GOOGLE_REDIRECT_URI: str = Field(default_factory=_get_default_google_redirect_uri)
    GEMINI_API_KEY: str = Field(default="")


settings = Settings()
