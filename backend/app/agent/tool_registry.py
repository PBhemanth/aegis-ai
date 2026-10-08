"""
Aegis Typed Tool Registry
Manages registered tools, typed schemas, and capability reflection for the Dynamic Planner.
Synchronized with concrete BaseTool implementations.
"""
from typing import Dict, List, Optional, Set
from backend.app.schemas.common import RiskTier
from backend.app.schemas.tool import ToolMetadata


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, ToolMetadata] = {}
        self._register_default_tools()

    def register(self, tool: ToolMetadata) -> None:
        """Registers a tool metadata manifest into the runtime."""
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
            lines.append(f"  Parameters Schema: {tool.parameters_schema}")
            lines.append("")
        return "\n".join(lines)

    def _register_default_tools(self) -> None:
        """Registers all default concrete tools into the registry."""
        from backend.app.tools import ALL_TOOLS
        for tool in ALL_TOOLS:
            self.register(tool.to_metadata())


tool_registry = ToolRegistry()
