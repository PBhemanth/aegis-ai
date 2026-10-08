"""
Real Google Drive v3 Tooling
Implements folder management, multipart file uploads, search/listing,
and safeguard-gated deletion using the official Google Drive API.
"""
import io
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload
from backend.app.schemas.common import RiskTier
from backend.app.tools.base import AuthenticationRequiredError, BaseTool, ExecutionContext, ToolExecutionError


DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"


# --- Schemas ---

class DriveFolderInput(BaseModel):
    folder_name: str = Field(min_length=1, description="Folder name or path to locate or create")
    parent_folder_id: Optional[str] = Field(default=None, description="Parent folder ID in Google Drive")


class DriveFolderResult(BaseModel):
    folder_id: str
    folder_name: str
    web_view_link: str
    is_new: bool


class DriveUploadInput(BaseModel):
    file_name: str = Field(min_length=1, description="Target name of the file in Google Drive")
    content: str = Field(description="Content to upload")
    folder_id: Optional[str] = Field(default=None, description="Specific destination folder ID")
    folder_name: Optional[str] = Field(default=None, description="Destination folder name (e.g. 'Aegis Workspace')")
    mime_type: str = Field(default="text/markdown", description="MIME type")


class DriveUploadResult(BaseModel):
    file_id: str
    file_name: str
    size_bytes: int
    md5_checksum: str
    folder_id: Optional[str]
    web_view_link: str


class DriveListInput(BaseModel):
    query: Optional[str] = Field(default=None, description="Drive search query, e.g. name contains 'report'")
    folder_id: Optional[str] = Field(default=None, description="Filter to specific folder ID")
    max_results: int = Field(default=20, ge=1, le=100)


class DriveFileInfo(BaseModel):
    id: str
    name: str
    size_bytes: Optional[int] = None
    mime_type: str
    trashed: bool = False
    created_time: Optional[str] = None


class DriveListResult(BaseModel):
    files: List[DriveFileInfo]
    total_found: int


class DriveDeleteInput(BaseModel):
    file_id: str = Field(min_length=1, description="ID of the file to delete or trash")
    file_name: Optional[str] = Field(default=None, description="Name of the file for blast radius verification")
    permanent_delete: bool = Field(default=False, description="True for permanent purge, False for trash")


class DriveDeleteResult(BaseModel):
    file_id: str
    file_name: Optional[str]
    status: str
    trashed: bool


# --- Tools ---

def _get_drive_service(context: ExecutionContext, tool_name: str):
    """Builds authorized Google Drive v3 resource."""
    if not context.credentials:
        raise AuthenticationRequiredError(tool_name=tool_name, required_scopes=[DRIVE_SCOPE])
    return build("drive", "v3", credentials=context.credentials, cache_discovery=False)


class GoogleDriveFolderTool(BaseTool):
    name = "google_drive_folder_manage"
    description = "Locates or creates dedicated workspace folders in Google Drive."
    category = "storage"
    base_risk_tier = RiskTier.TIER_1_REVERSIBLE
    required_scopes = [DRIVE_SCOPE]
    requires_approval = False
    input_schema = DriveFolderInput
    output_schema = DriveFolderResult
    verification_contract = {
        "verifier": "GoogleDriveFolderVerifier",
        "assertions": ["folder_exists", "is_folder_mimetype", "not_trashed"]
    }

    async def execute(self, params: DriveFolderInput, context: ExecutionContext) -> DriveFolderResult:
        service = _get_drive_service(context, self.name)

        # Check if folder exists
        escaped_name = params.folder_name.replace("'", "\\'")
        q = f"mimeType='application/vnd.google-apps.folder' and name='{escaped_name}' and trashed=false"
        if params.parent_folder_id:
            q += f" and '{params.parent_folder_id}' in parents"

        response = service.files().list(
            q=q,
            spaces="drive",
            fields="files(id, name, webViewLink)"
        ).execute()

        files = response.get("files", [])
        if files:
            existing = files[0]
            return DriveFolderResult(
                folder_id=existing["id"],
                folder_name=existing["name"],
                web_view_link=existing.get("webViewLink", ""),
                is_new=False
            )

        # Create folder
        metadata = {
            "name": params.folder_name,
            "mimeType": "application/vnd.google-apps.folder"
        }
        if params.parent_folder_id:
            metadata["parents"] = [params.parent_folder_id]

        new_folder = service.files().create(
            body=metadata,
            fields="id, name, webViewLink"
        ).execute()

        return DriveFolderResult(
            folder_id=new_folder["id"],
            folder_name=new_folder["name"],
            web_view_link=new_folder.get("webViewLink", ""),
            is_new=True
        )


class GoogleDriveUploadTool(BaseTool):
    name = "google_drive_upload_file"
    description = "Uploads files and research documents to Google Drive with bit-level checksums."
    category = "storage"
    base_risk_tier = RiskTier.TIER_1_REVERSIBLE
    required_scopes = [DRIVE_SCOPE]
    requires_approval = False
    input_schema = DriveUploadInput
    output_schema = DriveUploadResult
    verification_contract = {
        "verifier": "GoogleDriveFileVerifier",
        "assertions": ["file_exists", "size_matches", "checksum_matches", "parent_folder_matches"]
    }

    async def execute(self, params: DriveUploadInput, context: ExecutionContext) -> DriveUploadResult:
        service = _get_drive_service(context, self.name)

        # Resolve destination folder if folder_name is provided
        target_folder_id = params.folder_id
        if not target_folder_id and params.folder_name:
            folder_tool = GoogleDriveFolderTool()
            f_res = await folder_tool.execute(DriveFolderInput(folder_name=params.folder_name), context)
            target_folder_id = f_res.folder_id

        metadata: Dict[str, Any] = {"name": params.file_name}
        if target_folder_id:
            metadata["parents"] = [target_folder_id]

        media = MediaInMemoryUpload(
            params.content.encode("utf-8"),
            mimetype=params.mime_type,
            resumable=False
        )

        uploaded = service.files().create(
            body=metadata,
            media_body=media,
            fields="id, name, size, md5Checksum, parents, webViewLink"
        ).execute()

        return DriveUploadResult(
            file_id=uploaded["id"],
            file_name=uploaded["name"],
            size_bytes=int(uploaded.get("size", len(params.content.encode("utf-8")))),
            md5_checksum=uploaded.get("md5Checksum", ""),
            folder_id=target_folder_id,
            web_view_link=uploaded.get("webViewLink", "")
        )


class GoogleDriveListTool(BaseTool):
    name = "google_drive_list_files"
    description = "Lists or searches files within Google Drive."
    category = "storage"
    base_risk_tier = RiskTier.TIER_0_READ
    required_scopes = [DRIVE_SCOPE]
    requires_approval = False
    input_schema = DriveListInput
    output_schema = DriveListResult
    verification_contract = {
        "verifier": "GoogleDriveListVerifier",
        "assertions": ["query_executed_successfully"]
    }

    async def execute(self, params: DriveListInput, context: ExecutionContext) -> DriveListResult:
        service = _get_drive_service(context, self.name)

        q_parts = ["trashed=false"]
        if params.folder_id:
            q_parts.append(f"'{params.folder_id}' in parents")
        if params.query:
            q_parts.append(f"({params.query})")

        q = " and ".join(q_parts)
        response = service.files().list(
            q=q,
            pageSize=params.max_results,
            fields="files(id, name, size, mimeType, trashed, createdTime)"
        ).execute()

        files = [
            DriveFileInfo(
                id=f["id"],
                name=f["name"],
                size_bytes=int(f["size"]) if "size" in f else None,
                mime_type=f["mimeType"],
                trashed=f.get("trashed", False),
                created_time=f.get("createdTime")
            )
            for f in response.get("files", [])
        ]

        return DriveListResult(files=files, total_found=len(files))


class GoogleDriveDeleteTool(BaseTool):
    name = "google_drive_delete_file"
    description = "Permanently deletes or trashes files in Google Drive. Strictly requires human approval."
    category = "storage"
    base_risk_tier = RiskTier.TIER_3_DESTRUCTIVE
    required_scopes = [DRIVE_SCOPE]
    requires_approval = True
    input_schema = DriveDeleteInput
    output_schema = DriveDeleteResult
    verification_contract = {
        "verifier": "GoogleDriveDeletionVerifier",
        "assertions": ["file_not_found_or_trashed"]
    }

    async def execute(self, params: DriveDeleteInput, context: ExecutionContext) -> DriveDeleteResult:
        # Crucial runtime safeguard: Enforce permission gate grant
        if not context.approval_granted:
            raise ToolExecutionError(
                "Execution rejected: Tier 3 destructive file deletion requires verified human approval.",
                tool_name=self.name
            )

        service = _get_drive_service(context, self.name)

        if params.permanent_delete:
            service.files().delete(fileId=params.file_id).execute()
            status = "PERMANENTLY_DELETED"
            is_trashed = True
        else:
            service.files().update(fileId=params.file_id, body={"trashed": True}).execute()
            status = "MOVED_TO_TRASH"
            is_trashed = True

        return DriveDeleteResult(
            file_id=params.file_id,
            file_name=params.file_name,
            status=status,
            trashed=is_trashed
        )


drive_folder_tool = GoogleDriveFolderTool()
drive_upload_tool = GoogleDriveUploadTool()
drive_list_tool = GoogleDriveListTool()
drive_delete_tool = GoogleDriveDeleteTool()
