"""
Integration Tests: Plan API Endpoints
Tests goal capability analysis, plan generation, and database persistence.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_plan_api_analyze_gap_endpoint(client: AsyncClient):
    payload = {"goal": "Send a summary of my document to my team via Telegram"}
    response = await client.post("/api/plan/analyze-gap", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["has_gap"] is True
    assert "messaging.chat" in data["missing_capabilities"]
    assert data["can_partially_execute"] is True


@pytest.mark.asyncio
async def test_plan_api_generate_and_retrieve_endpoint(client: AsyncClient):
    payload = {
        "goal": "Find 3 papers on cryptocurrency fraud on arXiv, write a technical summary, and save it to Google Drive.",
        "user_id": "test_operator"
    }
    # 1. Generate plan
    gen_response = await client.post("/api/plan/generate", json=payload)
    assert gen_response.status_code == 200
    gen_data = gen_response.json()
    assert gen_data["status"] == "SUCCESS"
    assert gen_data["plan_id"] is not None

    plan_id = gen_data["plan_id"]
    planner_result = gen_data["planner_result"]
    assert len(planner_result["steps"]) >= 3

    # 2. Retrieve plan from DB
    get_response = await client.get(f"/api/plan/{plan_id}")
    assert get_response.status_code == 200
    plan_read = get_response.json()
    assert plan_read["id"] == plan_id
    assert plan_read["user_id"] == "test_operator"
    assert len(plan_read["steps"]) >= 3
    assert plan_read["status"] == "PLANNING"


@pytest.mark.asyncio
async def test_plan_api_capability_gap_response(client: AsyncClient):
    payload = {
        "goal": "Buy $500 of Solana on Coinbase right now.",
        "user_id": "crypto_user"
    }
    gen_response = await client.post("/api/plan/generate", json=payload)
    assert gen_response.status_code == 200
    gen_data = gen_response.json()
    assert gen_data["status"] == "CAPABILITY_GAP"
    assert gen_data["plan_id"] is None
    assert gen_data["capability_gap"]["has_gap"] is True
    assert "finance.trading" in gen_data["capability_gap"]["missing_capabilities"]
