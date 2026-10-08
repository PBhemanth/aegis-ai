"""
Aegis Dynamic Planner Engine
Coordinates Capability Gap Analysis, Gemini Structured Planning, Topological DAG Sorting,
and mandatory Deterministic Risk Classification for every step.
"""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from backend.app.schemas.common import RiskTier
from backend.app.schemas.risk import BlastRadiusReport, RiskEvaluation
from backend.app.schemas.capability import CapabilityGapReport
from backend.app.schemas.plan import PlanDAG, StepDefinition
from backend.app.agent.capability_engine import CapabilityGapEngine
from backend.app.agent.dag_engine import DAGEngine, DAGValidationError, DAGCycleError
from backend.app.agent.risk_engine import RiskEngine
from backend.app.agent.tool_registry import ToolRegistry, tool_registry
from backend.app.services.gemini import GeminiService, gemini_service


class StepRiskProfile(BaseModel):
    step_id: str
    step_order: int
    title: str
    tool_name: str
    tool_parameters: Dict[str, Any]
    dependencies: List[str]
    expected_output_type: Optional[str]
    rationale: Optional[str]
    # Bound deterministic safety evaluations
    risk_tier: RiskTier
    blast_radius: BlastRadiusReport
    requires_approval: bool
    requires_typed_confirmation: bool
    confirmation_phrase: Optional[str]
    risk_justification: str


class PlannerResult(BaseModel):
    status: str = Field(description="'SUCCESS', 'CAPABILITY_GAP', or 'PLANNING_FAILED'")
    goal: str
    goal_summary: Optional[str] = None
    plan_dag: Optional[PlanDAG] = None
    topological_order: List[str] = Field(default_factory=list)
    execution_levels: List[List[str]] = Field(default_factory=list)
    steps: List[StepRiskProfile] = Field(default_factory=list)
    capability_gap: Optional[CapabilityGapReport] = None
    error_message: Optional[str] = None


class DynamicPlanner:
    def __init__(
        self,
        gemini: Optional[GeminiService] = None,
        registry: Optional[ToolRegistry] = None
    ):
        self.gemini = gemini or gemini_service
        self.registry = registry or tool_registry

    async def plan_goal(self, goal: str) -> PlannerResult:
        """
        Executes the full planning lifecycle:
        1. Capability Gap Assessment
        2. Gemini Structured DAG Generation
        3. Topological Validation and Cycle Detection
        4. Independent Deterministic Risk Engine Evaluation on each Step
        """
        # Step 1: Analyze capability boundaries
        gap_report = CapabilityGapEngine.analyze_goal(goal, self.registry)
        if gap_report.has_gap and not gap_report.can_partially_execute:
            return PlannerResult(
                status="CAPABILITY_GAP",
                goal=goal,
                goal_summary=f"Halted: Goal requires unsupported capabilities ({', '.join(gap_report.missing_capabilities)}).",
                capability_gap=gap_report,
                error_message=gap_report.explanation
            )

        # Step 2: Generate Plan DAG via Gemini
        try:
            raw_dag = await self.gemini.generate_plan_dag(goal, self.registry)
        except Exception as e:
            return PlannerResult(
                status="PLANNING_FAILED",
                goal=goal,
                error_message=f"Planning generation failed: {str(e)}"
            )

        # Step 3: Validate DAG and sort topologically
        try:
            topological_order = DAGEngine.validate_and_sort(raw_dag)
            execution_levels = DAGEngine.compute_execution_levels(raw_dag)
            ordered_dag = DAGEngine.reorder_plan_steps(raw_dag)
        except (DAGValidationError, DAGCycleError) as e:
            return PlannerResult(
                status="PLANNING_FAILED",
                goal=goal,
                error_message=f"DAG validation error: {str(e)}"
            )

        # Step 4: Deterministic Safety Bridge
        # Pass each step through RiskEngine.evaluate_risk()
        # Bypasses LLM opinions to guarantee code-enforced safety policies.
        steps_with_risk: List[StepRiskProfile] = []
        for step in ordered_dag.steps:
            risk_eval: RiskEvaluation = RiskEngine.evaluate_risk(
                tool_name=step.tool_name,
                parameters=step.tool_parameters
            )
            steps_with_risk.append(StepRiskProfile(
                step_id=step.step_id,
                step_order=step.step_order,
                title=step.title,
                tool_name=step.tool_name,
                tool_parameters=step.tool_parameters,
                dependencies=step.dependencies,
                expected_output_type=step.expected_output_type,
                rationale=step.rationale,
                risk_tier=risk_eval.risk_tier,
                blast_radius=risk_eval.blast_radius,
                requires_approval=risk_eval.requires_approval,
                requires_typed_confirmation=risk_eval.requires_typed_confirmation,
                confirmation_phrase=risk_eval.confirmation_phrase,
                risk_justification=risk_eval.justification
            ))

        return PlannerResult(
            status="SUCCESS",
            goal=goal,
            goal_summary=ordered_dag.goal_summary,
            plan_dag=ordered_dag,
            topological_order=topological_order,
            execution_levels=execution_levels,
            steps=steps_with_risk,
            capability_gap=gap_report if gap_report.has_gap else None
        )


dynamic_planner = DynamicPlanner()
