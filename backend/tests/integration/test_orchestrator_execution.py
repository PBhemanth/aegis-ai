"""
Integration Tests: Orchestrator Plan Execution & Verification API
Tests full multi-step plan execution, permission halts, and proof inspection.
"""
import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.plan import Plan, Step
from backend.app.models.user import User
from backend.app.schemas.common import StepStatus


@pytest.mark.asyncio
async def test_orchestrator_runs_safe_plan_to_completion(client: AsyncClient, db_session: AsyncSession):
    # 1. Create User and 2-step safe plan in DB
    user = User(id="user_orch_1", email="orch1@aegis.local", display_name="Orchestrator User")
    db_session.add(user)

    plan = Plan(
        id="plan_safe_100",
        user_id="user_orch_1",
        raw_goal="Research and synthesize GNN report",
        goal_summary="Research and synthesize GNN report",
        status="PLANNING"
    )
    db_session.add(plan)

    step_1 = Step(
        id="plan_safe_100_step_1",
        plan_id="plan_safe_100",
        step_order=1,
        title="Search arXiv Papers",
        tool_name="web_search_arxiv",
        parameters_json=json.dumps({"query": "GNN fraud detection", "max_results": 2}),
        risk_tier="TIER_0_READ",
        status=StepStatus.PROPOSED.value
    )
    step_2 = Step(
        id="plan_safe_100_step_2",
        plan_id="plan_safe_100",
        step_order=2,
        title="Synthesize Report Brief",
        tool_name="document_synthesizer",
        parameters_json=json.dumps({"title": "GNN Fraud Brief", "content": "# Overview\\nTopological detection methods."}),
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step_1)
    db_session.add(step_2)
    await db_session.commit()

    # 2. Run plan execution via API
    response = await client.post("/api/execute/plan/plan_safe_100?user_id=user_orch_1")
    assert response.status_code == 200
    summary = response.json()

    assert summary["plan_id"] == "plan_safe_100"
    assert summary["status"] == "COMPLETED"
    assert summary["steps_total"] == 2
    assert summary["steps_verified"] == 2
    assert len(summary["receipts"]) == 2

    # 3. Query independent verification proof for step 2
    proof_res = await client.get("/api/execute/proof/plan_safe_100_step_2")
    assert proof_res.status_code == 200
    proof_data = proof_res.json()
    assert proof_data["status"] == "PASSED"
    assert proof_data["verifier_name"] == "DocumentIntegrityVerifier"
    assert len(proof_data["assertions"]) >= 2


@pytest.mark.asyncio
async def test_orchestrator_halts_at_destructive_permission_gate(client: AsyncClient, db_session: AsyncSession):
    user = User(id="user_orch_2", email="orch2@aegis.local", display_name="Safety User")
    db_session.add(user)

    plan = Plan(
        id="plan_danger_200",
        user_id="user_orch_2",
        raw_goal="Clean workspace",
        goal_summary="Delete files",
        status="PLANNING"
    )
    db_session.add(plan)

    step_delete = Step(
        id="plan_danger_200_step_1",
        plan_id="plan_danger_200",
        step_order=1,
        title="Delete Outdated Files",
        tool_name="google_drive_delete_file",
        parameters_json=json.dumps({"file_id": "file_purge_001", "permanent_delete": True}),
        risk_tier="TIER_3_DESTRUCTIVE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step_delete)
    await db_session.commit()

    # Attempt running plan: MUST HALT at Tier 3 step
    response = await client.post("/api/execute/plan/plan_danger_200?user_id=user_orch_2")
    assert response.status_code == 200
    summary = response.json()

    assert summary["status"] == "HALTED"
    assert "human approval" in summary["halt_reason"].lower()
    assert summary["steps_verified"] == 0


@pytest.mark.asyncio
async def test_single_step_execute_and_verify_endpoint(client: AsyncClient, db_session: AsyncSession):
    user = User(id="user_single", email="single@aegis.local", display_name="Single Step User")
    db_session.add(user)

    plan = Plan(id="p_single", user_id="user_single", raw_goal="Goal", goal_summary="Summary", status="RUNNING")
    db_session.add(plan)

    step = Step(
        id="p_single_s1",
        plan_id="p_single",
        step_order=1,
        title="Synthesize Quick Brief",
        tool_name="document_synthesizer",
        parameters_json=json.dumps({"title": "Quick Brief", "content": "# Executive Summary\\nAll verified."}),
        risk_tier="TIER_1_REVERSIBLE",
        status=StepStatus.PROPOSED.value
    )
    db_session.add(step)
    await db_session.commit()

    response = await client.post("/api/execute/step/p_single_s1?user_id=user_single")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "VERIFIED"
    assert data["receipt"]["status"] == "EXECUTED"
    assert data["proof"]["status"] == "PASSED"


@pytest.mark.asyncio
async def test_orchestrator_executes_and_verifies_readonly_arxiv_research_plan(client: AsyncClient, db_session: AsyncSession):
    # Tests the exact production flow: planning with negative constraints, execution, and ArxivPaperVerifier
    user = User(id="user_arxiv_test", email="arxiv@aegis.local", display_name="Arxiv Test User")
    db_session.add(user)
    await db_session.commit()

    goal = "Research 3 papers on GNN fraud detection with source links. Do not use Drive or Calendar, and do not create, change, or delete files"
    gen_res = await client.post("/api/plan/generate", json={"goal": goal, "user_id": "user_arxiv_test"})
    assert gen_res.status_code == 200
    plan_id = gen_res.json()["plan_id"]

    plan_res = await client.get(f"/api/plan/{plan_id}")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert len(plan_data["steps"]) == 1
    assert plan_data["steps"][0]["tool_name"] == "web_search_arxiv"

    # Execute plan end-to-end
    exec_res = await client.post(f"/api/execute/plan/{plan_id}?user_id=user_arxiv_test")
    assert exec_res.status_code == 200
    summary = exec_res.json()
    assert summary["status"] == "COMPLETED"
    assert summary["steps_total"] == 1
    assert summary["steps_verified"] == 1

    # Verify proof was produced by ArxivPaperVerifier
    step_id = plan_data["steps"][0]["id"]
    proof_res = await client.get(f"/api/execute/proof/{step_id}")
    assert proof_res.status_code == 200
    proof = proof_res.json()
    assert proof["status"] == "PASSED"
    assert proof["verifier_name"] == "ArxivPaperVerifier"
    assert all(a["passed"] for a in proof["assertions"])
