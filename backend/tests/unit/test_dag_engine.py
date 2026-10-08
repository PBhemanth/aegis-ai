"""
Unit Tests: Dynamic DAG Engine
Tests cycle detection, topological sorting, parallel execution tiers, and validation assertions.
"""
import pytest
from backend.app.agent.dag_engine import DAGEngine, DAGValidationError, DAGCycleError
from backend.app.schemas.plan import PlanDAG, StepDefinition


def test_linear_dag_topological_sort():
    s1 = StepDefinition(step_id="step_1", step_order=1, title="A", tool_name="tool_a", dependencies=[])
    s2 = StepDefinition(step_id="step_2", step_order=2, title="B", tool_name="tool_b", dependencies=["step_1"])
    s3 = StepDefinition(step_id="step_3", step_order=3, title="C", tool_name="tool_c", dependencies=["step_2"])

    dag = PlanDAG(goal="Linear task", goal_summary="Linear summary", steps=[s3, s1, s2]) # Purposely out of order
    order = DAGEngine.validate_and_sort(dag)
    assert order == ["step_1", "step_2", "step_3"]

    reordered = DAGEngine.reorder_plan_steps(dag)
    assert [s.step_id for s in reordered.steps] == ["step_1", "step_2", "step_3"]
    assert [s.step_order for s in reordered.steps] == [1, 2, 3]


def test_branching_and_joining_dag():
    # step_1 -> step_2
    # step_1 -> step_3
    # [step_2, step_3] -> step_4
    s1 = StepDefinition(step_id="step_1", step_order=1, title="Start", tool_name="tool_a", dependencies=[])
    s2 = StepDefinition(step_id="step_2", step_order=2, title="Branch 1", tool_name="tool_b", dependencies=["step_1"])
    s3 = StepDefinition(step_id="step_3", step_order=3, title="Branch 2", tool_name="tool_c", dependencies=["step_1"])
    s4 = StepDefinition(step_id="step_4", step_order=4, title="Join", tool_name="tool_d", dependencies=["step_2", "step_3"])

    dag = PlanDAG(goal="Diamond graph", goal_summary="Diamond summary", steps=[s4, s3, s2, s1])
    order = DAGEngine.validate_and_sort(dag)

    # step_1 must be before step_2 and step_3; step_2 and step_3 must be before step_4
    assert order[0] == "step_1"
    assert set(order[1:3]) == {"step_2", "step_3"}
    assert order[3] == "step_4"

    # Execution levels
    levels = DAGEngine.compute_execution_levels(dag)
    assert levels[0] == ["step_1"]
    assert set(levels[1]) == {"step_2", "step_3"}
    assert levels[2] == ["step_4"]


def test_dag_cycle_detection_raises_error():
    # Circular dependency: step_1 -> step_2 -> step_3 -> step_1
    s1 = StepDefinition(step_id="step_1", step_order=1, title="A", tool_name="tool_a", dependencies=["step_3"])
    s2 = StepDefinition(step_id="step_2", step_order=2, title="B", tool_name="tool_b", dependencies=["step_1"])
    s3 = StepDefinition(step_id="step_3", step_order=3, title="C", tool_name="tool_c", dependencies=["step_2"])

    dag = PlanDAG(goal="Cyclic task", goal_summary="Cyclic summary", steps=[s1, s2, s3])
    with pytest.raises(DAGCycleError):
        DAGEngine.validate_and_sort(dag)


def test_dag_self_dependency_raises_error():
    s1 = StepDefinition(step_id="step_1", step_order=1, title="Self-loop", tool_name="tool_a", dependencies=["step_1"])
    dag = PlanDAG(goal="Self-dependent task", goal_summary="Summary", steps=[s1])
    with pytest.raises(DAGCycleError):
        DAGEngine.validate_and_sort(dag)


def test_dag_missing_dependency_raises_error():
    s1 = StepDefinition(step_id="step_1", step_order=1, title="Valid", tool_name="tool_a", dependencies=["ghost_step"])
    dag = PlanDAG(goal="Missing dep", goal_summary="Summary", steps=[s1])
    with pytest.raises(DAGValidationError) as exc:
        DAGEngine.validate_and_sort(dag)
    assert "ghost_step" in str(exc.value)


def test_dag_duplicate_step_id_raises_error():
    s1 = StepDefinition(step_id="step_1", step_order=1, title="First", tool_name="tool_a", dependencies=[])
    s2 = StepDefinition(step_id="step_1", step_order=2, title="Duplicate", tool_name="tool_b", dependencies=[])
    dag = PlanDAG(goal="Duplicate IDs", goal_summary="Summary", steps=[s1, s2])
    with pytest.raises(DAGValidationError) as exc:
        DAGEngine.validate_and_sort(dag)
    assert "Duplicate step ID" in str(exc.value)
