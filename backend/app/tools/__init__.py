from backend.app.tools.base import BaseTool, ExecutionContext, ToolExecutionError, AuthenticationRequiredError
from backend.app.tools.arxiv_research import ArxivResearchTool, arxiv_tool
from backend.app.tools.document_synthesizer import DocumentSynthesizerTool, document_synthesizer_tool
from backend.app.tools.google_drive import (
    GoogleDriveFolderTool, drive_folder_tool,
    GoogleDriveUploadTool, drive_upload_tool,
    GoogleDriveListTool, drive_list_tool,
    GoogleDriveDeleteTool, drive_delete_tool,
)
from backend.app.tools.google_calendar import (
    GoogleCalendarCheckSlotsTool, calendar_check_slots_tool,
    GoogleCalendarCreateEventTool, calendar_create_event_tool,
)

ALL_TOOLS = [
    arxiv_tool,
    document_synthesizer_tool,
    drive_folder_tool,
    drive_upload_tool,
    drive_list_tool,
    drive_delete_tool,
    calendar_check_slots_tool,
    calendar_create_event_tool,
]

__all__ = [
    "BaseTool",
    "ExecutionContext",
    "ToolExecutionError",
    "AuthenticationRequiredError",
    "ArxivResearchTool",
    "arxiv_tool",
    "DocumentSynthesizerTool",
    "document_synthesizer_tool",
    "GoogleDriveFolderTool",
    "drive_folder_tool",
    "GoogleDriveUploadTool",
    "drive_upload_tool",
    "GoogleDriveListTool",
    "drive_list_tool",
    "GoogleDriveDeleteTool",
    "drive_delete_tool",
    "GoogleCalendarCheckSlotsTool",
    "calendar_check_slots_tool",
    "GoogleCalendarCreateEventTool",
    "calendar_create_event_tool",
    "ALL_TOOLS",
]
