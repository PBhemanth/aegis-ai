"""
Aegis Typed Tool Registry
Manages registered tools, typed schemas, and capability reflection for the Dynamic Planner.
"""
from typing import Dict, List, Optional, Set
from backend.app.schemas.common import RiskTier
from backend.app.schemas.tool import ToolMetadata


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolMetadata] = {}
        self._register_default_tools()

    def register(self, tool: ToolMetadata) -> None:
        """Registers a tool into the runtime."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[ToolMetadata]:
        """Retrieves tool metadata by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[ToolMetadata]:
        """Returns all registered tool manifests."""
        return list(self._tools.values())

    def get_tool_names(self) -> Set[str]:
        """Returns a set of all registered tool names."""
        return set(self._tools.keys())

    def format_tools_prompt(self) -> str:
        """
        Formats registered tools into a structured description for Gemini prompting.
        """
        lines = []
        for tool in self._tools.values():
            lines.append(f"- Tool: `{tool.name}` ({tool.category})")
            lines.append(f"  Description: {tool.description}")
            lines.append(f"  Base Risk: {tool.base_risk_tier.value}")
            lines.append(f"  Required Scopes: {', '.join(tool.required_scopes) if tool.required_scopes else 'None'}")
            lines.append(f"  Parameters: {tool.parameters_schema}")
            lines.append("")
        return "\n".join(lines)

    def _register_default_tools(self) -> None:
        """Registers default tools available in the Aegis runtime."""
        self.register(ToolMetadata(
            name="web_search_arxiv",
            description="Searches the arXiv scientific repository for papers by topic or keywords.",
            category="research",
            base_risk_tier=RiskTier.TIER_0_READ,
            required_scopes=["network.read"],
            requires_approval=False,
            parameters_schema={
                "query": "string (search terms, e.g. 'GNN crypto fraud detection')",
                "max_results": "integer (number of papers to retrieve, default 3)"
            }
        ))

        self.register(ToolMetadata(
            name="document_synthesizer",
            description="Compiles, structures, and formats research briefs, analysis, or reports in the local sandbox.",
            category="content",
            base_risk_tier=RiskTier.TIER_1_REVERSIBLE,
            required_scopes=["sandbox.write"],
            requires_approval=False,
            parameters_schema={
                "title": "string (document title)",
                "content": "string (formatted markdown body)",
                "format": "string ('markdown' or 'pdf', default 'markdown')"
            }
        ))

        self.register(ToolMetadata(
            name="google_drive_folder_manage",
            description="Locates, verifies, or creates dedicated directory folders in Google Drive.",
            category="storage",
            base_risk_tier=RiskTier.TIER_1_REVERSIBLE,
            required_scopes=["https://www.googleapis.com/auth/drive.file"],
            requires_approval=False,
            parameters_schema={
                "folder_name": "string (folder path/name to locate or create)",
                "parent_folder_id": "optional string (parent folder id)"
            }
        ))

        self.register(ToolMetadata(
            name="google_drive_upload_file",
            description="Uploads a local sandboxed file or generated brief into Google Drive.",
            category="storage",
            base_risk_tier=RiskTier.TIER_1_REVERSIBLE,
            required_scopes=["https://www.googleapis.com/auth/drive.file"],
            requires_approval=False,
            parameters_schema={
                "file_name": "string (name of file in Drive)",
                "folder_name": "string (target folder name)",
                "content_source_step_id": "optional string (step id that generated the file)"
            }
        ))

        self.register(ToolMetadata(
            name="google_drive_delete_file",
            description="Deletes or purges files from Google Drive. Irreversible destructive action.",
            category="storage",
            base_risk_tier=RiskTier.TIER_3_DESTRUCTIVE,
            required_scopes=["https://www.googleapis.com/auth/drive.file"],
            requires_approval=True,
            parameters_schema={
                "file_id": "string (id of file to delete)",
                "file_name": "string (name of file)",
                "permanent_delete": "boolean (true for permanent, false for trash)"
            }
        ))

        self.register(ToolMetadata(
            name="google_calendar_check_slots",
            description="Queries Google Calendar for user availability and free/busy time slots.",
            category="calendar",
            base_risk_tier=RiskTier.TIER_0_READ,
            required_scopes=["https://www.googleapis.com/auth/calendar.events"],
            requires_approval=False,
            parameters_schema={
                "time_min": "string (ISO 8601 start time)",
                "time_max": "string (ISO 8601 end time)"
            }
        ))

        self.register(ToolMetadata(
            name="google_calendar_create_event",
            description="Schedules a meeting or calendar event on the user's Google Calendar.",
            category="calendar",
            base_risk_tier=RiskTier.TIER_2_MUTATING,
            required_scopes=["https://www.googleapis.com/auth/calendar.events"],
            requires_approval=False,  # Evaluated dynamically by risk engine based on attendees
            parameters_schema={
                "title": "string (event title)",
                "start_time": "string (ISO 8601 start time)",
                "end_time": "string (ISO 8601 end time)",
                "description": "optional string",
                "attendees": "optional list of email strings"
            }
        ))


tool_registry = ToolRegistry()
