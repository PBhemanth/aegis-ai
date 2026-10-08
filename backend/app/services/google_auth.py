"""
Real Google OAuth 2.0 Service
Handles Google authorization URLs, token exchange, encrypted refresh token persistence,
and credential restoration.
"""
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from backend.app.core.config import settings
from backend.app.core.security import security_service
from backend.app.models.user import User, UserCredentials


GOOGLE_OAUTH_SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/calendar.events",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]


class GoogleAuthService:
    TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
    AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
    USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo"

    @classmethod
    def get_authorization_url(cls, state: str) -> str:
        """
        Constructs the Google OAuth 2.0 authorization URL with offline access and least-privilege scopes.
        """
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID or "mock_client_id_for_dev",
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": " ".join(GOOGLE_OAUTH_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        query_string = "&".join(f"{k}={httpx.URL('', params={k: v}).query.decode()}" for k, v in params.items())
        return f"{cls.AUTH_ENDPOINT}?{query_string}"

    @classmethod
    async def exchange_code(cls, code: str) -> Dict[str, Any]:
        """
        Exchanges authorization code for access and refresh tokens.
        """
        payload = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(cls.TOKEN_ENDPOINT, data=payload)
            if response.status_code != 200:
                raise ValueError(f"Failed to exchange OAuth code: {response.text}")
            return response.json()

    @classmethod
    async def fetch_user_profile(cls, access_token: str) -> Dict[str, Any]:
        """Fetches basic user profile from Google userinfo endpoint."""
        headers = {"Authorization": f"Bearer {access_token}"}
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(cls.USERINFO_ENDPOINT, headers=headers)
            if response.status_code == 200:
                return response.json()
            return {}

    @classmethod
    async def store_user_tokens(
        cls,
        user_id: str,
        email: str,
        display_name: Optional[str],
        avatar_url: Optional[str],
        token_data: Dict[str, Any],
        db: AsyncSession
    ) -> User:
        """
        Saves user and securely stores AES-128 encrypted refresh token in SQLite.
        """
        # 1. Upsert User
        user_query = await db.execute(select(User).where(User.id == user_id))
        user = user_query.scalar_one_or_none()
        if not user:
            user = User(
                id=user_id,
                email=email,
                display_name=display_name,
                avatar_url=avatar_url
            )
            db.add(user)
            await db.flush()

        # 2. Encrypt refresh token
        refresh_token = token_data.get("refresh_token")
        encrypted_rt = security_service.encrypt_data(refresh_token) if refresh_token else ""

        expires_in = token_data.get("expires_in", 3600)
        token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        # 3. Upsert Credentials
        cred_query = await db.execute(select(UserCredentials).where(UserCredentials.user_id == user_id))
        credentials = cred_query.scalar_one_or_none()
        if not credentials:
            credentials = UserCredentials(
                user_id=user_id,
                encrypted_refresh_token=encrypted_rt,
                access_token=token_data.get("access_token"),
                token_expiry=token_expiry
            )
            db.add(credentials)
        else:
            if encrypted_rt:
                credentials.encrypted_refresh_token = encrypted_rt
            credentials.access_token = token_data.get("access_token")
            credentials.token_expiry = token_expiry

        await db.commit()
        return user

    @classmethod
    async def get_credentials(
        cls,
        user_id: str,
        db: AsyncSession
    ) -> Optional[Credentials]:
        """
        Retrieves, decrypts, and instantiates valid Google OAuth Credentials.
        Refreshes access token if expired.
        """
        cred_query = await db.execute(select(UserCredentials).where(UserCredentials.user_id == user_id))
        db_creds = cred_query.scalar_one_or_none()
        if not db_creds or not db_creds.encrypted_refresh_token:
            return None

        # Decrypt refresh token
        try:
            refresh_token = security_service.decrypt_data(db_creds.encrypted_refresh_token)
        except Exception:
            return None

        creds = Credentials(
            token=db_creds.access_token,
            refresh_token=refresh_token,
            token_uri=cls.TOKEN_ENDPOINT,
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=GOOGLE_OAUTH_SCOPES
        )

        # Refresh if needed
        if creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                db_creds.access_token = creds.token
                if creds.expiry:
                    db_creds.token_expiry = creds.expiry
                await db.commit()
            except Exception:
                pass

        return creds


google_auth_service = GoogleAuthService()
