"""
Google OAuth 2.0 API Endpoints
Handles login initialization, redirect callbacks, authentication status, and session termination.
"""
import secrets
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.database import get_db
from backend.app.models.user import User, UserCredentials
from backend.app.services.google_auth import GoogleAuthService, google_auth_service, GOOGLE_OAUTH_SCOPES

router = APIRouter(prefix="/auth/google", tags=["Authentication"])


class LoginInitResponse(BaseModel):
    authorization_url: str
    state: str


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user_id: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    granted_scopes: List[str] = []


class AuthCallbackResponse(BaseModel):
    status: str
    user_id: str
    email: str
    display_name: Optional[str] = None
    granted_scopes: List[str]


@router.get("/login", response_model=LoginInitResponse)
async def initiate_google_login():
    """
    Initiates Google OAuth 2.0 flow by generating a signed authorization URL.
    """
    state_nonce = secrets.token_urlsafe(16)
    auth_url = google_auth_service.get_authorization_url(state=state_nonce)
    return LoginInitResponse(authorization_url=auth_url, state=state_nonce)


@router.get("/callback", response_model=AuthCallbackResponse)
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db)
):
    """
    Handles Google OAuth redirect, exchanges code for access & refresh tokens,
    encrypts credentials at rest, and stores the user profile.
    """
    try:
        token_data = await google_auth_service.exchange_code(code)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth token exchange failed: {str(e)}"
        )

    # Fetch user details
    access_token = token_data.get("access_token", "")
    profile = await google_auth_service.fetch_user_profile(access_token)
    user_id = profile.get("id") or f"user_{secrets.token_hex(6)}"
    email = profile.get("email") or f"{user_id}@gmail.com"
    display_name = profile.get("name") or "Google User"
    avatar_url = profile.get("picture")

    # Store encrypted credentials
    user = await google_auth_service.store_user_tokens(
        user_id=user_id,
        email=email,
        display_name=display_name,
        avatar_url=avatar_url,
        token_data=token_data,
        db=db
    )

    return AuthCallbackResponse(
        status="authenticated",
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        granted_scopes=GOOGLE_OAUTH_SCOPES
    )


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(
    user_id: str = Query(default="default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Checks if a given user has valid active Google credentials stored.
    """
    creds = await google_auth_service.get_credentials(user_id=user_id, db=db)
    if not creds:
        return AuthStatusResponse(
            authenticated=False,
            user_id=user_id,
            granted_scopes=[]
        )

    # Query user profile
    user_query = await db.execute(select(User).where(User.id == user_id))
    user = user_query.scalar_one_or_none()

    return AuthStatusResponse(
        authenticated=True,
        user_id=user_id,
        email=user.email if user else None,
        display_name=user.display_name if user else None,
        granted_scopes=GOOGLE_OAUTH_SCOPES
    )


@router.post("/logout")
async def logout(
    user_id: str = Query(default="default_user"),
    db: AsyncSession = Depends(get_db)
):
    """
    Revokes local session and deletes encrypted credentials for the user.
    """
    await db.execute(delete(UserCredentials).where(UserCredentials.user_id == user_id))
    await db.commit()
    return {"status": "logged_out", "user_id": user_id}
