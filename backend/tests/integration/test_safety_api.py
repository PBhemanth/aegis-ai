"""
Integration Tests: Safety, Risk Evaluation & Approval APIs
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_endpoint(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert "Aegis" in data["app_name"]


@pytest.mark.asyncio
async def test_evaluate_risk_api_read_only(client: AsyncClient):
    payload = {
        "tool_name": "web_search_arxiv",
        "parameters": {"query": "Graph Neural Networks fraud detection"}
    }
    response = await client.post("/api/safety/evaluate-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_tier"] == "TIER_0_READ"
    assert data["requires_approval"] is False


@pytest.mark.asyncio
async def test_evaluate_risk_api_destructive(client: AsyncClient):
    payload = {
        "tool_name": "google_drive_delete_file",
        "parameters": {"file_id": "file_123", "permanent": True}
    }
    response = await client.post("/api/safety/evaluate-risk", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_tier"] == "TIER_3_DESTRUCTIVE"
    assert data["requires_approval"] is True
    assert data["requires_typed_confirmation"] is True
    assert data["confirmation_phrase"] == "DELETE"


@pytest.mark.asyncio
async def test_blast_radius_api(client: AsyncClient):
    payload = {
        "tool_name": "google_drive_purge",
        "parameters": {
            "files": [
                {"id": "f1", "name": "doc1.pdf", "size_bytes": 1000},
                {"id": "f2", "name": "doc2.pdf", "size_bytes": 2000}
            ],
            "action": "delete"
        }
    }
    response = await client.post("/api/safety/blast-radius", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["item_count"] == 2
    assert data["total_size_bytes"] == 3000
    assert data["reversibility_score"] == 10


@pytest.mark.asyncio
async def test_approvals_challenge_and_submit_api(client: AsyncClient):
    # 1. Request challenge
    challenge_payload = {
        "plan_id": "plan_999",
        "step_id": "step_888",
        "tool_name": "google_calendar_create_event",
        "parameters": {"attendees": ["test@example.com"]}
    }
    challenge_res = await client.post("/api/approvals/challenge", json=challenge_payload)
    assert challenge_res.status_code == 200
    challenge_data = challenge_res.json()
    nonce = challenge_data["approval_nonce"]
    fingerprint = challenge_data["action_fingerprint"]

    # 2. Submit approval with nonce and fingerprint
    submit_payload = {
        "plan_id": "plan_999",
        "step_id": "step_888",
        "approval_nonce": nonce,
        "action_fingerprint": fingerprint
    }
    submit_res = await client.post("/api/approvals/submit", json=submit_payload)
    assert submit_res.status_code == 200
    submit_data = submit_res.json()
    assert submit_data["approved"] is True
    assert submit_data["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_approvals_reject_api(client: AsyncClient):
    reject_payload = {
        "plan_id": "plan_999",
        "step_id": "step_888",
        "reason": "Security policy restriction"
    }
    reject_res = await client.post("/api/approvals/reject", json=reject_payload)
    assert reject_res.status_code == 200
    reject_data = reject_res.json()
    assert reject_data["approved"] is False
    assert reject_data["status"] == "REJECTED"
