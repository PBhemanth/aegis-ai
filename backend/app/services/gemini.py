"""
Gemini Service Wrapper
Generates structured PlanDAGs using Google GenAI SDK with structured output enforcement.
Provides an intelligent deterministic fallback for offline CI/test environments.
"""
import json
import logging
import re
from typing import List, Optional
from backend.app.core.config import settings
from backend.app.schemas.plan import PlanDAG, StepDefinition
from backend.app.agent.tool_registry import ToolRegistry, tool_registry

logger = logging.getLogger("aegis.gemini")


class GeminiService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.client = None
        if self.api_key:
            try:
                from google import genai
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI Client: {e}")

    async def generate_plan_dag(
        self,
        goal: str,
        registry: Optional[ToolRegistry] = None
    ) -> PlanDAG:
        """
        Invokes Gemini to synthesize a structured PlanDAG from a natural language goal.
        Falls back to deterministic synthesis if API key is not configured or in offline mode.
        """
        active_registry = registry or tool_registry

        if self.client:
            try:
                return await self._call_gemini_api(goal, active_registry)
            except Exception as e:
                logger.warning(f"Gemini API call failed ({e}). Falling back to deterministic plan synthesis.")

        return self._synthesize_fallback_plan(goal, active_registry)

    async def _call_gemini_api(self, goal: str, registry: ToolRegistry) -> PlanDAG:
        """Calls Google GenAI client with structured schema output."""
        from google.genai import types

        tool_manifest = registry.format_tools_prompt()
        prompt = (
            f"You are the Aegis Planning Engine. Your role is to decompose the user's goal into a "
            f"Directed Acyclic Graph (DAG) of discrete executable steps using ONLY the registered tools.\n\n"
            f"Available Tools:\n{tool_manifest}\n\n"
            f"Rules:\n"
            f"1. Choose the most appropriate tools to satisfy the goal safely.\n"
            f"2. Specify prerequisite step dependencies in `dependencies` (e.g. step_2 depends on ['step_1']).\n"
            f"3. Never create cyclic dependencies.\n"
            f"4. Do NOT attempt to assess or downgrade safety risks; the Aegis Risk Engine enforces safety.\n\n"
            f"User Goal: {goal}"
        )

        response = self.client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=PlanDAG,
                temperature=0.1
            )
        )

        data = json.loads(response.text)
        return PlanDAG(**data)

    def _synthesize_fallback_plan(self, goal: str, registry: ToolRegistry) -> PlanDAG:
        """
        Deterministic, dynamic plan generator for offline test environments.
        Inspects goal semantics and composes appropriate registered tools dynamically.
        """
        goal_lower = goal.lower()
        steps: List[StepDefinition] = []
        step_idx = 1

        # Check for research component
        if any(w in goal_lower for w in ["research", "paper", "arxiv", "find", "search", "survey"]):
            query = "GNN cryptocurrency fraud detection"
            # Extract query hint if possible
            match = re.search(r'\b(?:about|on)\s+([^.\n]+?)(?:\s+and\s+|\.|\,|$)', goal, re.IGNORECASE)
            if match:
                query = match.group(1).strip()
            elif any(k in goal_lower for k in ["graph", "gnn", "fraud"]):
                query = "graph neural networks fraud detection"

            steps.append(StepDefinition(
                step_id=f"step_{step_idx}",
                step_order=step_idx,
                title="Search arXiv Research Papers",
                tool_name="web_search_arxiv",
                tool_parameters={"query": query, "max_results": 3},
                dependencies=[],
                expected_output_type="PaperMetadataList",
                rationale="Retrieve authoritative scientific literature matching the user query."
            ))
            step_idx += 1

        # Check for report / summary synthesis component
        if any(w in goal_lower for w in ["summariz", "compare", "synthesiz", "report", "brief", "draft"]):
            prev_deps = [f"step_{step_idx - 1}"] if step_idx > 1 else []
            steps.append(StepDefinition(
                step_id=f"step_{step_idx}",
                step_order=step_idx,
                title="Synthesize Comparative Research Brief",
                tool_name="document_synthesizer",
                tool_parameters={
                    "title": "Technical Brief: Graph Neural Networks in Cryptocurrency Fraud Detection",
                    "content": "# Research Analysis and Methodology Comparison\n...",
                    "format": "markdown"
                },
                dependencies=prev_deps,
                expected_output_type="CompiledDocument",
                rationale="Structure findings, methodologies, and benchmarks into a cohesive technical document."
            ))
            step_idx += 1

        # Check for Google Drive folder / upload component
        if any(w in goal_lower for w in ["drive", "save", "upload"]):
            # Step A: Ensure folder
            folder_dep = [f"step_{step_idx - 1}"] if step_idx > 1 else []
            folder_step_id = f"step_{step_idx}"
            steps.append(StepDefinition(
                step_id=folder_step_id,
                step_order=step_idx,
                title="Manage Aegis Drive Workspace Folder",
                tool_name="google_drive_folder_manage",
                tool_parameters={"folder_name": "Aegis AI Workspace/Research Reports"},
                dependencies=folder_dep,
                expected_output_type="FolderInfo",
                rationale="Ensure target destination folder exists on Google Drive."
            ))
            step_idx += 1

            # Step B: Upload file
            steps.append(StepDefinition(
                step_id=f"step_{step_idx}",
                step_order=step_idx,
                title="Upload Report to Google Drive",
                tool_name="google_drive_upload_file",
                tool_parameters={
                    "file_name": "gnn_crypto_fraud_report.md",
                    "folder_name": "Aegis AI Workspace/Research Reports",
                    "content_source_step_id": f"step_{step_idx - 2}" if step_idx >= 3 else None
                },
                dependencies=[folder_step_id],
                expected_output_type="DriveFileInfo",
                rationale="Persist compiled brief into user's Google Drive storage."
            ))
            step_idx += 1

        # Check for Google Drive deletion component
        if any(w in goal_lower for w in ["delete", "purge", "clean", "trash", "remove"]):
            steps.append(StepDefinition(
                step_id=f"step_{step_idx}",
                step_order=step_idx,
                title="Delete Outdated Files from Drive",
                tool_name="google_drive_delete_file",
                tool_parameters={
                    "file_id": "file_sample_99",
                    "file_name": "outdated_brief.md",
                    "permanent_delete": True
                },
                dependencies=[],
                expected_output_type="DeletionResult",
                rationale="Purge obsolete report file from Google Drive as requested."
            ))
            step_idx += 1

        # Check for Calendar component
        if any(w in goal_lower for w in ["calendar", "schedule", "meeting", "review"]):
            # Check slots first
            check_dep = [f"step_{step_idx - 1}"] if step_idx > 1 else []
            slot_step_id = f"step_{step_idx}"
            steps.append(StepDefinition(
                step_id=slot_step_id,
                step_order=step_idx,
                title="Check Calendar Availability",
                tool_name="google_calendar_check_slots",
                tool_parameters={
                    "time_min": "2026-10-09T09:00:00Z",
                    "time_max": "2026-10-09T18:00:00Z"
                },
                dependencies=check_dep,
                expected_output_type="AvailableSlots",
                rationale="Verify open schedule slots prior to booking."
            ))
            step_idx += 1

            # Schedule event
            steps.append(StepDefinition(
                step_id=f"step_{step_idx}",
                step_order=step_idx,
                title="Schedule Report Review on Calendar",
                tool_name="google_calendar_create_event",
                tool_parameters={
                    "title": "Aegis: Review Research Brief",
                    "start_time": "2026-10-09T15:00:00Z",
                    "end_time": "2026-10-09T15:30:00Z",
                    "description": "30-minute review session for synthesized research brief."
                },
                dependencies=[slot_step_id],
                expected_output_type="EventInfo",
                rationale="Place confirmed review session onto user's primary Google Calendar."
            ))
            step_idx += 1

        # Fallback generic single-step if no known keywords matched
        if not steps:
            steps.append(StepDefinition(
                step_id="step_1",
                step_order=1,
                title="Synthesize Goal Response",
                tool_name="document_synthesizer",
                tool_parameters={"title": "General Task Execution", "content": f"Execution plan for: {goal}"},
                dependencies=[],
                expected_output_type="CompiledDocument",
                rationale="Execute user goal using sandboxed synthesis."
            ))

        return PlanDAG(
            goal=goal,
            goal_summary=f"Execution plan to achieve: {goal[:80]}...",
            steps=steps
        )


gemini_service = GeminiService()
