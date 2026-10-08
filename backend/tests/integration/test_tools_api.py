"""
Integration Tests: Tools API
Tests tool discovery manifests and safe sandboxed execution via API.
"""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_tools_api_manifest_list(client: AsyncClient):
    response = await client.get("/api/tools")
    assert response.status_code == 200
    tools = response.json()
    assert len(tools) >= 6

    tool_names = [t["name"] for t in tools]
    assert "web_search_arxiv" in tool_names
    assert "document_synthesizer" in tool_names
    assert "google_drive_upload_file" in tool_names
    assert "google_drive_delete_file" in tool_names
    assert "google_calendar_create_event" in tool_names

    for t in tools:
        assert "name" in t
        assert "description" in t
        assert "base_risk_tier" in t
        assert "parameters_schema" in t


@pytest.mark.asyncio
async def test_tools_api_execute_arxiv_research(client: AsyncClient):
    payload = {
        "tool_name": "web_search_arxiv",
        "parameters": {"query": "GNN cryptocurrency fraud detection", "max_results": 2}
    }
    response = await client.post("/api/tools/execute", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert data["tool_name"] == "web_search_arxiv"
    assert data["result"]["total_found"] >= 1
    assert len(data["result"]["papers"]) >= 1


@pytest.mark.asyncio
async def test_tools_api_execute_document_synthesizer(client: AsyncClient):
    payload = {
        "tool_name": "document_synthesizer",
        "parameters": {
            "title": "Crypto Security Overview",
            "content": "Analysis of decentralized smart contracts.",
            "format": "markdown"
        }
    }
    response = await client.post("/api/tools/execute", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "SUCCESS"
    assert "sha256_checksum" in data["result"]
    assert data["result"]["section_count"] >= 1


@pytest.mark.asyncio
async def test_tools_api_execute_destructive_blocked_without_approval(client: AsyncClient):
    # Attempting to delete a file directly without approval nonce
    payload = {
        "tool_name": "google_drive_delete_file",
        "parameters": {"file_id": "file_test_delete", "permanent_delete": True}
    }
    response = await client.post("/api/tools/execute", json=payload)
    # Must be blocked by permission gate with 403 Forbidden
    assert response.status_code == 403
    assert "requires verified approval challenge" in response.json()["detail"]
