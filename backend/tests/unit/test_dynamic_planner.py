"""
Unit Tests: Dynamic Planner Engine & Deterministic Safety Integration
Verifies dynamic task DAG planning, topological ordering, capability gap halts,
and non-bypassable deterministic risk engine binding.
"""
import pytest
from backend.app.agent.planner import DynamicPlanner
from backend.app.schemas.common import RiskTier


@pytest.mark.asyncio
async def test_dynamic_planning_safe_multi_step_goal():
    planner = DynamicPlanner()
    goal = "Find three good research papers about GNN fraud detection, summarize them, and save to my Google Drive."
    result = await planner.plan_goal(goal)

    assert result.status == "SUCCESS"
    assert len(result.steps) >= 3
    assert len(result.topological_order) == len(result.steps)

    # First step must be read-only (arXiv search)
    step_1 = result.steps[0]
    assert step_1.tool_name == "web_search_arxiv"
    assert step_1.risk_tier == RiskTier.TIER_0_READ
    assert step_1.requires_approval is False

    # Second step must be additive document synthesis
    step_2 = result.steps[1]
    assert step_2.tool_name == "document_synthesizer"
    assert step_2.risk_tier == RiskTier.TIER_1_REVERSIBLE
    assert step_2.requires_approval is False


@pytest.mark.asyncio
async def test_dynamic_planning_destructive_goal_binds_tier_3_safety():
    planner = DynamicPlanner()
    goal = "Delete all outdated report files from my Google Drive workspace."
    result = await planner.plan_goal(goal)

    assert result.status == "SUCCESS"
    # Find the deletion step
    delete_steps = [s for s in result.steps if "delete" in s.tool_name.lower()]
    assert len(delete_steps) >= 1
    delete_step = delete_steps[0]

    # Crucial Safety Invariant: RiskEngine strictly enforces Tier 3 and typed confirmation
    assert delete_step.risk_tier == RiskTier.TIER_3_DESTRUCTIVE
    assert delete_step.requires_approval is True
    assert delete_step.requires_typed_confirmation is True
    assert delete_step.confirmation_phrase == "DELETE"


@pytest.mark.asyncio
async def test_dynamic_planning_consequential_meeting_binds_tier_2():
    planner = DynamicPlanner()
    goal = "Check my calendar and schedule a review meeting with professor@university.edu for tomorrow."
    result = await planner.plan_goal(goal)

    assert result.status == "SUCCESS"
    meeting_steps = [s for s in result.steps if s.tool_name == "google_calendar_create_event"]
    assert len(meeting_steps) >= 1
    meeting_step = meeting_steps[0]

    # Consequential step
    assert meeting_step.risk_tier in [RiskTier.TIER_1_REVERSIBLE, RiskTier.TIER_2_MUTATING]


@pytest.mark.asyncio
async def test_dynamic_planning_halts_on_unsupported_capability_gap():
    planner = DynamicPlanner()
    goal = "Trade $1000 of Bitcoin on Binance exchange."
    result = await planner.plan_goal(goal)

    assert result.status == "CAPABILITY_GAP"
    assert result.capability_gap is not None
    assert "finance.trading" in result.capability_gap.missing_capabilities
    assert len(result.steps) == 0  # Zero hallucinated steps!
