"""
Aegis Deterministic Risk Engine
Computes objective risk tiers, quantitative blast radius, and permission requirements.
Completely independent of LLM reasoning — code-enforced safety policies.
"""
import re
from typing import Any, Dict, List, Optional
from backend.app.schemas.common import RiskTier
from backend.app.schemas.risk import AffectedEntity, BlastRadiusReport, RiskEvaluation


class RiskEngine:
    # Explicit destructive patterns
    DESTRUCTIVE_VERBS = {"delete", "purge", "trash", "erase", "remove", "drop", "destroy", "wipe", "empty_trash"}
    DESTRUCTIVE_TOOLS = {
        "google_drive_delete_file",
        "google_drive_purge",
        "filesystem_delete_file",
        "google_calendar_delete_event",
    }
    
    # Read-only tools
    READ_ONLY_TOOLS = {
        "web_search_arxiv",
        "google_calendar_check_slots",
        "google_drive_list_files",
        "google_drive_get_file_metadata",
    }

    # Additive sandboxed tools
    SANDBOX_WRITE_TOOLS = {
        "document_synthesizer",
        "google_drive_folder_manage",
        "google_drive_upload_file",
    }

    @classmethod
    def compute_blast_radius(
        cls,
        tool_name: str,
        parameters: Dict[str, Any]
    ) -> BlastRadiusReport:
        """
        Calculates quantitative blast radius from tool parameters:
        Formula: Score = (items * 1.0) + (sensitivity * 1.5) + (reversibility * 1.2)
        """
        tool_lower = tool_name.lower()
        items: List[AffectedEntity] = []
        total_size_bytes = 0
        reversibility = 1  # 1 (easily reversible) to 10 (completely irreversible)
        sensitivity = 1    # 1 (isolated sandbox) to 5 (root / external public)

        # 1. Target files extraction
        file_ids = parameters.get("file_ids") or ([] if not parameters.get("file_id") else [parameters.get("file_id")])
        files_info = parameters.get("files") or []
        
        if files_info and isinstance(files_info, list):
            for f in files_info:
                if isinstance(f, dict):
                    size = f.get("size_bytes", 0)
                    total_size_bytes += size
                    items.append(AffectedEntity(
                        id=f.get("id"),
                        name=f.get("name", "Unknown File"),
                        entity_type="file",
                        size_bytes=size,
                        path_or_uri=f.get("path")
                    ))
        elif file_ids:
            for fid in file_ids:
                items.append(AffectedEntity(
                    id=str(fid),
                    name=parameters.get("file_name", f"file_{fid}"),
                    entity_type="file",
                    size_bytes=parameters.get("file_size_bytes", 0)
                ))
                total_size_bytes += parameters.get("file_size_bytes", 0)

        # 2. Target attendees / calendar events extraction
        attendees = parameters.get("attendees") or []
        event_id = parameters.get("event_id")
        if event_id:
            items.append(AffectedEntity(
                id=str(event_id),
                name=parameters.get("title", f"event_{event_id}"),
                entity_type="event"
            ))
        if attendees and isinstance(attendees, list):
            for att in attendees:
                items.append(AffectedEntity(
                    name=str(att),
                    entity_type="external_attendee"
                ))

        item_count = len(items)

        # Check if pure read-only
        is_read_only = (
            tool_name in cls.READ_ONLY_TOOLS
            or any(verb in tool_lower for verb in {"search", "check", "list", "read", "get"})
        ) and not any(verb in tool_lower for verb in cls.DESTRUCTIVE_VERBS)

        if is_read_only:
            return BlastRadiusReport(
                item_count=0,
                total_size_bytes=0,
                affected_entities=[],
                reversibility_score=1,
                sensitivity_score=1,
                blast_radius_score=0.0,
                summary=f"Read-only query on {tool_name}. Ephemeral side-effect free computation."
            )

        # 3. Determine Reversibility
        if any(verb in tool_lower for verb in cls.DESTRUCTIVE_VERBS) or parameters.get("permanent_delete") is True:
            reversibility = 10  # Irreversible deletion
        elif parameters.get("move_to_trash") is True or "trash" in tool_lower:
            reversibility = 3   # Soft-trash
        elif attendees and len(attendees) > 0:
            reversibility = 5   # Dispatches real invites to external parties
        elif any(verb in tool_lower for verb in {"upload", "create", "synthesize", "manage"}):
            reversibility = 1   # Additive / create
        else:
            reversibility = 2

        # 4. Determine Target Sensitivity
        path = str(parameters.get("path", "")).lower()
        folder_name = str(parameters.get("folder_name", "")).lower()
        if "root" in path or parameters.get("target_is_root") is True or path == "/":
            sensitivity = 5
        elif "aegis" in path or "aegis" in folder_name or "sandbox" in path:
            sensitivity = 1     # Sandboxed workspace
        elif attendees:
            sensitivity = 3     # External communications
        else:
            sensitivity = 2

        # 5. Compute Quantitative Score
        blast_score = (item_count * 1.0) + (sensitivity * 1.5) + (reversibility * 1.2)

        summary = (
            f"Impacts {item_count} item(s) (approx {total_size_bytes} bytes). "
            f"Sensitivity: {sensitivity}/5, Reversibility: {reversibility}/10, Blast Score: {blast_score:.1f}"
        )

        return BlastRadiusReport(
            item_count=item_count,
            total_size_bytes=total_size_bytes,
            affected_entities=items,
            reversibility_score=reversibility,
            sensitivity_score=sensitivity,
            blast_radius_score=round(blast_score, 2),
            summary=summary
        )

    @classmethod
    def evaluate_risk(
        cls,
        tool_name: str,
        parameters: Dict[str, Any]
    ) -> RiskEvaluation:
        """
        Determines the RiskTier and Permission Gate requirements for a tool call.
        Strictly deterministic. Never delegates risk tier decision to an LLM.
        """
        tool_lower = tool_name.lower()
        blast_radius = cls.compute_blast_radius(tool_name, parameters)

        # 1. Explicit Read-Only Check (Tier 0)
        is_read_only = (
            tool_name in cls.READ_ONLY_TOOLS
            or any(verb in tool_lower for verb in {"search", "check", "list", "read", "get"})
        ) and not any(verb in tool_lower for verb in cls.DESTRUCTIVE_VERBS)

        if is_read_only:
            return RiskEvaluation(
                tool_name=tool_name,
                parameters=parameters,
                risk_tier=RiskTier.TIER_0_READ,
                blast_radius=blast_radius,
                score=0.0,
                requires_approval=False,
                requires_typed_confirmation=False,
                confirmation_phrase=None,
                justification=f"Read-only or ephemeral computation on {tool_name}. Auto-approved."
            )

        # 2. Explicit Destructive Conditions (Tier 3)
        is_explicitly_destructive = (
            tool_name in cls.DESTRUCTIVE_TOOLS
            or any(verb in tool_lower for verb in cls.DESTRUCTIVE_VERBS)
            or parameters.get("action") in cls.DESTRUCTIVE_VERBS
            or parameters.get("delete") is True
            or parameters.get("permanent") is True
        )

        has_external_attendees = bool(parameters.get("attendees"))

        if is_explicitly_destructive or (blast_radius.blast_radius_score >= 18.0 and not has_external_attendees):
            return RiskEvaluation(
                tool_name=tool_name,
                parameters=parameters,
                risk_tier=RiskTier.TIER_3_DESTRUCTIVE,
                blast_radius=blast_radius,
                score=blast_radius.blast_radius_score,
                requires_approval=True,
                requires_typed_confirmation=True,
                confirmation_phrase="DELETE" if is_explicitly_destructive else "CONFIRM",
                justification=(
                    f"Destructive or critical-impact action detected on {tool_name}. "
                    f"Action permanently modifies or deletes user data. Explicit typed human confirmation required."
                )
            )

        # 3. Mutating External / Consequential Conditions (Tier 2)
        is_external_share = parameters.get("is_public") is True or "share" in tool_lower

        if (
            8.0 <= blast_radius.blast_radius_score < 18.0
            or has_external_attendees
            or is_external_share
            or "modify_permissions" in tool_lower
        ):
            return RiskEvaluation(
                tool_name=tool_name,
                parameters=parameters,
                risk_tier=RiskTier.TIER_2_MUTATING,
                blast_radius=blast_radius,
                score=blast_radius.blast_radius_score,
                requires_approval=True,
                requires_typed_confirmation=False,
                confirmation_phrase=None,
                justification=(
                    f"Consequential action modifying external state or dispatching communications via {tool_name}. "
                    f"Human approval required before execution."
                )
            )

        # 4. Additive / Sandboxed Operations (Tier 1)
        return RiskEvaluation(
            tool_name=tool_name,
            parameters=parameters,
            risk_tier=RiskTier.TIER_1_REVERSIBLE,
            blast_radius=blast_radius,
            score=blast_radius.blast_radius_score,
            requires_approval=False,
            requires_typed_confirmation=False,
            confirmation_phrase=None,
            justification=(
                f"Additive or sandboxed operation on {tool_name}. "
                f"Safe for autonomous execution with audit logging."
            )
        )

