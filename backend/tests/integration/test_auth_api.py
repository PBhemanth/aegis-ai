"""
Integration Tests: Google OAuth 2.0 API Endpoints
Tests login initialization, status checks, and logout session handling.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_api_login_endpoint(client: AsyncClient):
    response = await client.get("/api/auth/google/login")
    assert response.status_code == 200
    data = response.json()
    assert "authorization_url" in data
    assert "state" in data
    assert "accounts.google.com" in data["authorization_url"]
    assert "drive.file" in data["authorization_url"]
    assert "calendar.events" in data["authorization_url"]


@pytest.mark.asyncio
async def test_auth_api_status_unauthenticated(client: AsyncClient):
    response = await client.get("/api/auth/google/status?user_id=new_user_123")
    assert response.status_code == 200
    data = response.json()
    assert data["authenticated"] is False
    assert data["user_id"] == "new_user_123"
    assert data["granted_scopes"] == []


@pytest.mark.asyncio
async def test_auth_api_logout_endpoint(client: AsyncClient):
    response = await client.post("/api/auth/google/logout?user_id=user_to_logout")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "logged_out"
    assert data["user_id"] == "user_to_logout"
