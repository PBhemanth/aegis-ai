"""
Aegis Dynamic DAG Engine
Validates task graphs, detects circular dependencies, and computes deterministic topological execution orders.
"""
from collections import defaultdict, deque
from typing import Dict, List, Set
from backend.app.schemas.plan import PlanDAG, StepDefinition


class DAGValidationError(Exception):
    """Raised when a task graph fails validation constraints."""
    pass


class DAGCycleError(DAGValidationError):
    """Raised when circular dependencies are detected in a task DAG."""
    def __init__(self, cycle_nodes: List[str]):
        self.cycle_nodes = cycle_nodes
        super().__init__(
            f"Circular dependency detected in plan graph among steps: {' -> '.join(cycle_nodes)}."
        )


class DAGEngine:
    @classmethod
    def validate_and_sort(cls, plan_dag: PlanDAG) -> List[str]:
        """
        Validates the DAG structure and returns the deterministic topological execution order.
        Raises DAGValidationError or DAGCycleError if graph is invalid or cyclic.
        """
        steps = plan_dag.steps
        if not steps:
            return []

        step_ids: Set[str] = set()
        in_degree: Dict[str, int] = {}
        adjacency: Dict[str, List[str]] = defaultdict(list)

        # 1. Check for duplicate step IDs
        for step in steps:
            if step.step_id in step_ids:
                raise DAGValidationError(f"Duplicate step ID '{step.step_id}' found in plan DAG.")
            step_ids.add(step.step_id)
            in_degree[step.step_id] = 0

        # 2. Build graph and validate dependency references
        for step in steps:
            for dep in step.dependencies:
                if dep == step.step_id:
                    raise DAGCycleError([step.step_id, step.step_id])
                if dep not in step_ids:
                    raise DAGValidationError(
                        f"Step '{step.step_id}' references non-existent prerequisite dependency '{dep}'."
                    )
                adjacency[dep].append(step.step_id)
                in_degree[step.step_id] += 1

        # 3. Kahn's Algorithm for Topological Sort & Cycle Detection
        queue = deque([sid for sid, deg in in_degree.items() if deg == 0])
        topological_order: List[str] = []

        while queue:
            current = queue.popleft()
            topological_order.append(current)

            for neighbor in adjacency[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        # 4. If processed count != total count, a cycle exists
        if len(topological_order) != len(step_ids):
            unresolved = [sid for sid, deg in in_degree.items() if deg > 0]
            raise DAGCycleError(unresolved)

        return topological_order

    @classmethod
    def compute_execution_levels(cls, plan_dag: PlanDAG) -> List[List[str]]:
        """
        Groups steps into discrete execution tiers / stages.
        Level 0 steps have 0 dependencies and can run first.
        Level N steps depend only on steps in levels < N.
        """
        topological_order = cls.validate_and_sort(plan_dag)
        if not topological_order:
            return []

        step_map: Dict[str, StepDefinition] = {s.step_id: s for s in plan_dag.steps}
        node_level: Dict[str, int] = {}

        for step_id in topological_order:
            step = step_map[step_id]
            if not step.dependencies:
                node_level[step_id] = 0
            else:
                max_dep_level = max(node_level[dep] for dep in step.dependencies)
                node_level[step_id] = max_dep_level + 1

        # Group by level
        max_level = max(node_level.values(), default=0)
        levels: List[List[str]] = [[] for _ in range(max_level + 1)]
        for step_id, lvl in node_level.items():
            levels[lvl].append(step_id)

        return levels

    @classmethod
    def reorder_plan_steps(cls, plan_dag: PlanDAG) -> PlanDAG:
        """
        Returns a new PlanDAG whose steps array is ordered topologically,
        with step_order updated to 1..N.
        """
        order = cls.validate_and_sort(plan_dag)
        step_map = {s.step_id: s for s in plan_dag.steps}

        reordered_steps = []
        for idx, step_id in enumerate(order, start=1):
            original = step_map[step_id]
            reordered_steps.append(StepDefinition(
                step_id=original.step_id,
                step_order=idx,
                title=original.title,
                tool_name=original.tool_name,
                tool_parameters=original.tool_parameters,
                dependencies=original.dependencies,
                expected_output_type=original.expected_output_type,
                rationale=original.rationale
            ))

        return PlanDAG(
            goal=plan_dag.goal,
            goal_summary=plan_dag.goal_summary,
            steps=reordered_steps
        )
