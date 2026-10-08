"""
Unit Tests: Google Drive v3 Tooling
Tests authentication enforcement, folder creation, file uploads, listing,
and approval-gated deletion safeguards.
"""
from unittest.mock import MagicMock, patch
import pytest
from backend.app.tools.base import AuthenticationRequiredError, ExecutionContext, ToolExecutionError
from backend.app.tools.google_drive import (
    GoogleDriveFolderTool, DriveFolderInput,
    GoogleDriveUploadTool, DriveUploadInput,
    GoogleDriveListTool, DriveListInput,
    GoogleDriveDeleteTool, DriveDeleteInput,
)


@pytest.mark.asyncio
async def test_drive_tools_require_authentication():
    context_unauth = ExecutionContext(credentials=None)

    # 1. Folder tool requires auth
    with pytest.raises(AuthenticationRequiredError):
        await GoogleDriveFolderTool().execute(DriveFolderInput(folder_name="Test"), context_unauth)

    # 2. Upload tool requires auth
    with pytest.raises(AuthenticationRequiredError):
        await GoogleDriveUploadTool().execute(DriveUploadInput(file_name="test.txt", content="hi"), context_unauth)

    # 3. List tool requires auth
    with pytest.raises(AuthenticationRequiredError):
        await GoogleDriveListTool().execute(DriveListInput(), context_unauth)


@pytest.mark.asyncio
async def test_drive_folder_manage_with_mock_service():
    mock_service = MagicMock()
    # Simulate folder does not exist -> create
    mock_service.files().list().execute.return_value = {"files": []}
    mock_service.files().create().execute.return_value = {
        "id": "folder_123",
        "name": "Aegis AI Workspace",
        "webViewLink": "https://drive.google.com/folders/folder_123"
    }

    context = ExecutionContext(credentials=MagicMock())
    with patch("backend.app.tools.google_drive.build", return_value=mock_service):
        tool = GoogleDriveFolderTool()
        result = await tool.execute(DriveFolderInput(folder_name="Aegis AI Workspace"), context)

        assert result.folder_id == "folder_123"
        assert result.folder_name == "Aegis AI Workspace"
        assert result.is_new is True


@pytest.mark.asyncio
async def test_drive_upload_file_with_mock_service():
    mock_service = MagicMock()
    mock_service.files().create().execute.return_value = {
        "id": "file_456",
        "name": "report.md",
        "size": 1500,
        "md5Checksum": "abc123def456",
        "webViewLink": "https://drive.google.com/file/file_456"
    }

    context = ExecutionContext(credentials=MagicMock())
    with patch("backend.app.tools.google_drive.build", return_value=mock_service):
        tool = GoogleDriveUploadTool()
        result = await tool.execute(
            DriveUploadInput(file_name="report.md", content="# Research Brief", folder_id="folder_123"),
            context
        )

        assert result.file_id == "file_456"
        assert result.file_name == "report.md"
        assert result.md5_checksum == "abc123def456"


@pytest.mark.asyncio
async def test_drive_delete_tool_blocks_without_approval():
    # If approval_granted is False, deletion MUST be blocked
    context_no_approval = ExecutionContext(credentials=MagicMock(), approval_granted=False)
    tool = GoogleDriveDeleteTool()

    with pytest.raises(ToolExecutionError) as exc:
        await tool.execute(DriveDeleteInput(file_id="target_file_id"), context_no_approval)
    assert "requires verified human approval" in str(exc.value)


@pytest.mark.asyncio
async def test_drive_delete_tool_succeeds_with_approval():
    mock_service = MagicMock()
    mock_service.files().update().execute.return_value = {"id": "target_file_id", "trashed": True}

    context_approved = ExecutionContext(credentials=MagicMock(), approval_granted=True)
    with patch("backend.app.tools.google_drive.build", return_value=mock_service):
        tool = GoogleDriveDeleteTool()
        result = await tool.execute(DriveDeleteInput(file_id="target_file_id", permanent_delete=False), context_approved)

        assert result.file_id == "target_file_id"
        assert result.status == "MOVED_TO_TRASH"
        assert result.trashed is True
