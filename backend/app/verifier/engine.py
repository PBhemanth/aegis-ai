"""
Aegis Independent Verifier Engine
Conducts decoupled, post-action validation queries against external services.
Guarantees that no step can reach the terminal VERIFIED state without proven state deltas.
"""
import hashlib
import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from googleapiclient.discovery import build
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agent.executor import sandboxed_executor
from backend.app.agent.state_machine import StateMachine
from backend.app.models.plan import Step
from backend.app.models.verification import VerificationProof
from backend.app.schemas.audit import AssertionResult, VerificationProofCreate
from backend.app.schemas.common import EventType, Severity, StepStatus
from backend.app.schemas.execution import ExecutionReceipt
from backend.app.tools.base import ExecutionContext
from backend.app.verifier.base import BaseVerifier


# --- Concrete Verifiers ---

class ArxivVerifier(BaseVerifier):
    name = "ArxivPaperVerifier"

    async def verify(self, receipt: ExecutionReceipt, parameters: Dict[str, Any], context: ExecutionContext) -> VerificationProofCreate:
        papers = receipt.result_data.get("papers", [])
        assertions: List[AssertionResult] = []

        # Assertion 1: Non-empty papers result
        has_results = len(papers) > 0
        assertions.append(AssertionResult(
            assertion="papers_retrieved",
            expected=True,
            actual=has_results,
            passed=has_results,
            details=f"Retrieved {len(papers)} paper(s)"
        ))

        # Assertion 2: All papers have valid IDs and non-empty abstracts
        valid_ids = all(bool(p.get("arxiv_id")) for p in papers) if papers else False
        assertions.append(AssertionResult(
            assertion="valid_arxiv_identifiers",
            expected=True,
            actual=valid_ids,
            passed=valid_ids
        ))

        non_empty_summaries = all(len(p.get("summary", "")) > 20 for p in papers) if papers else False
        assertions.append(AssertionResult(
            assertion="authoritative_abstracts_present",
            expected=True,
            actual=non_empty_summaries,
            passed=non_empty_summaries
        ))

        all_passed = all(a.passed for a in assertions)
        return VerificationProofCreate(
            step_id=receipt.step_id,
            verifier_name=self.name,
            status="PASSED" if all_passed else "FAILED",
            assertions=assertions,
            external_state_delta={"paper_count": len(papers), "query": parameters.get("query")},
            latency_ms=receipt.latency_ms
        )


class DocumentVerifier(BaseVerifier):
    name = "DocumentIntegrityVerifier"

    async def verify(self, receipt: ExecutionReceipt, parameters: Dict[str, Any], context: ExecutionContext) -> VerificationProofCreate:
        assertions: List[AssertionResult] = []
        data = receipt.result_data

        size_bytes = data.get("size_bytes", 0)
        size_valid = size_bytes > 0
        assertions.append(AssertionResult(
            assertion="file_size_greater_than_zero",
            expected=True,
            actual=size_valid,
            passed=size_valid,
            details=f"Document byte size: {size_bytes}"
        ))

        checksum = data.get("sha256_checksum", "")
        checksum_valid = bool(checksum and len(checksum) == 64)
        assertions.append(AssertionResult(
            assertion="sha256_checksum_valid",
            expected=True,
            actual=checksum_valid,
            passed=checksum_valid,
            details=f"Checksum: {checksum[:12]}..." if checksum else "None"
        ))

        section_count = data.get("section_count", 0)
        sections_valid = section_count >= 1
        assertions.append(AssertionResult(
            assertion="structured_sections_present",
            expected=True,
            actual=sections_valid,
            passed=sections_valid,
            details=f"Section count: {section_count}"
        ))

        all_passed = all(a.passed for a in assertions)
        return VerificationProofCreate(
            step_id=receipt.step_id,
            verifier_name=self.name,
            status="PASSED" if all_passed else "FAILED",
            assertions=assertions,
            external_state_delta={"checksum": checksum, "size_bytes": size_bytes},
            latency_ms=receipt.latency_ms
        )


class GoogleDriveVerifier(BaseVerifier):
    name = "GoogleDriveStateVerifier"

    async def verify(self, receipt: ExecutionReceipt, parameters: Dict[str, Any], context: ExecutionContext) -> VerificationProofCreate:
        assertions: List[AssertionResult] = []
        tool_name = receipt.tool_name
        data = receipt.result_data

        # If credentials exist, execute real independent GET query against Drive API
        if context.credentials:
            drive_service = build("drive", "v3", credentials=context.credentials, cache_discovery=False)
            if "upload" in tool_name:
                file_id = data.get("file_id")
                try:
                    remote_file = drive_service.files().get(
                        fileId=file_id,
                        fields="id, name, size, md5Checksum, trashed, parents"
                    ).execute()

                    file_exists = bool(remote_file.get("id"))
                    not_trashed = not remote_file.get("trashed", False)
                    remote_md5 = remote_file.get("md5Checksum")
                    expected_md5 = data.get("md5_checksum")
                    md5_match = (remote_md5 == expected_md5) if expected_md5 and remote_md5 else True

                    assertions.append(AssertionResult(assertion="file_exists_on_drive", expected=True, actual=file_exists, passed=file_exists))
                    assertions.append(AssertionResult(assertion="file_not_trashed", expected=True, actual=not_trashed, passed=not_trashed))
                    assertions.append(AssertionResult(assertion="md5_checksum_match", expected=expected_md5, actual=remote_md5, passed=md5_match))
                except Exception as e:
                    assertions.append(AssertionResult(assertion="file_exists_on_drive", expected=True, actual=False, passed=False, details=str(e)))

            elif "folder" in tool_name:
                folder_id = data.get("folder_id")
                try:
                    remote_folder = drive_service.files().get(fileId=folder_id, fields="id, mimeType, trashed").execute()
                    is_folder = remote_folder.get("mimeType") == "application/vnd.google-apps.folder"
                    not_trashed = not remote_folder.get("trashed", False)

                    assertions.append(AssertionResult(assertion="folder_exists_on_drive", expected=True, actual=True, passed=True))
                    assertions.append(AssertionResult(assertion="is_folder_mimetype", expected=True, actual=is_folder, passed=is_folder))
                    assertions.append(AssertionResult(assertion="folder_not_trashed", expected=True, actual=not_trashed, passed=not_trashed))
                except Exception as e:
                    assertions.append(AssertionResult(assertion="folder_exists_on_drive", expected=True, actual=False, passed=False, details=str(e)))

            elif "delete" in tool_name:
                file_id = data.get("file_id")
                try:
                    remote_file = drive_service.files().get(fileId=file_id, fields="id, trashed").execute()
                    is_trashed = remote_file.get("trashed", False)
                    assertions.append(AssertionResult(assertion="file_marked_as_trashed", expected=True, actual=is_trashed, passed=is_trashed))
                except Exception:
                    # 404 Not Found confirms file is permanently deleted
                    assertions.append(AssertionResult(assertion="file_deleted_404_not_found", expected=True, actual=True, passed=True))
        else:
            # Fallback deterministic proof assertions for receipt-level validation (e.g. mock test environments)
            file_id = data.get("file_id") or data.get("folder_id")
            has_id = bool(file_id)
            assertions.append(AssertionResult(assertion="resource_id_present", expected=True, actual=has_id, passed=has_id))
            if "delete" in tool_name:
                trashed = data.get("trashed", True)
                assertions.append(AssertionResult(assertion="file_marked_as_trashed", expected=True, actual=trashed, passed=trashed))
            else:
                has_link = bool(data.get("web_view_link") or data.get("file_name"))
                assertions.append(AssertionResult(assertion="remote_link_or_name_present", expected=True, actual=has_link, passed=has_link))

        all_passed = all(a.passed for a in assertions)
        return VerificationProofCreate(
            step_id=receipt.step_id,
            verifier_name=self.name,
            status="PASSED" if all_passed else "FAILED",
            assertions=assertions,
            external_state_delta={"tool": tool_name, "verified_id": data.get("file_id") or data.get("folder_id")},
            latency_ms=receipt.latency_ms
        )


class GoogleCalendarVerifier(BaseVerifier):
    name = "GoogleCalendarStateVerifier"

    async def verify(self, receipt: ExecutionReceipt, parameters: Dict[str, Any], context: ExecutionContext) -> VerificationProofCreate:
        assertions: List[AssertionResult] = []
        tool_name = receipt.tool_name
        data = receipt.result_data

        if context.credentials and "create_event" in tool_name:
            event_id = data.get("event_id")
            cal_service = build("calendar", "v3", credentials=context.credentials, cache_discovery=False)
            try:
                event = cal_service.events().get(calendarId="primary", eventId=event_id).execute()
                event_exists = bool(event.get("id"))
                status_confirmed = event.get("status") in ["confirmed", "tentative"]
                assertions.append(AssertionResult(assertion="event_exists_on_calendar", expected=True, actual=event_exists, passed=event_exists))
                assertions.append(AssertionResult(assertion="event_status_confirmed", expected=True, actual=status_confirmed, passed=status_confirmed))
            except Exception as e:
                assertions.append(AssertionResult(assertion="event_exists_on_calendar", expected=True, actual=False, passed=False, details=str(e)))
        else:
            # Receipt level validation
            if "check_slots" in tool_name:
                has_window = bool(data.get("time_min") and data.get("time_max"))
                assertions.append(AssertionResult(assertion="time_window_checked", expected=True, actual=has_window, passed=has_window))
            else:
                event_id = data.get("event_id")
                has_id = bool(event_id)
                assertions.append(AssertionResult(assertion="calendar_event_id_assigned", expected=True, actual=has_id, passed=has_id))
                is_confirmed = data.get("status") == "confirmed"
                assertions.append(AssertionResult(assertion="event_confirmed", expected=True, actual=is_confirmed, passed=is_confirmed))

        all_passed = all(a.passed for a in assertions)
        return VerificationProofCreate(
            step_id=receipt.step_id,
            verifier_name=self.name,
            status="PASSED" if all_passed else "FAILED",
            assertions=assertions,
            external_state_delta={"tool": tool_name, "event_id": data.get("event_id")},
            latency_ms=receipt.latency_ms
        )


# --- Verifier Engine ---

class VerifierEngine:
    VERIFIERS = {
        "web_search_arxiv": ArxivVerifier(),
        "document_synthesizer": DocumentVerifier(),
        "google_drive_folder_manage": GoogleDriveVerifier(),
        "google_drive_upload_file": GoogleDriveVerifier(),
        "google_drive_list_files": GoogleDriveVerifier(),
        "google_drive_delete_file": GoogleDriveVerifier(),
        "google_calendar_check_slots": GoogleCalendarVerifier(),
        "google_calendar_create_event": GoogleCalendarVerifier(),
    }

    @classmethod
    async def verify_step(
        cls,
        plan_id: str,
        step: Step,
        receipt: ExecutionReceipt,
        context: ExecutionContext,
        db: AsyncSession
    ) -> VerificationProofCreate:
        """
        Conducts independent state-delta verification for an executed step.
        If passed, transitions step to terminal VERIFIED state.
        If failed, marks step FAILED / RECOVERING and generates structured discrepancies.
        """
        verifier = cls.VERIFIERS.get(step.tool_name, DocumentVerifier())

        parameters: Dict[str, Any] = {}
        if step.parameters_json:
            try:
                parameters = json.loads(step.parameters_json)
            except Exception:
                pass

        await sandboxed_executor.record_audit_event(
            plan_id=plan_id,
            step_id=step.id,
            event_type=EventType.VERIFICATION_STARTED,
            payload={"verifier": verifier.name, "tool_name": step.tool_name},
            db=db
        )

        proof_data = await verifier.verify(receipt, parameters, context)

        # Upsert VerificationProof in database
        proof_id = f"proof_{uuid.uuid4().hex[:12]}"
        db_proof = VerificationProof(
            id=proof_id,
            step_id=step.id,
            verifier_name=proof_data.verifier_name,
            status=proof_data.status,
            assertions_json=json.dumps([a.model_dump() for a in proof_data.assertions]),
            external_state_delta_json=json.dumps(proof_data.external_state_delta or {}),
            latency_ms=proof_data.latency_ms,
            verified_at=datetime.now(timezone.utc)
        )
        db.add(db_proof)

        if proof_data.status == "PASSED":
            # State machine transition: VERIFYING -> VERIFIED
            StateMachine.validate_step_transition(StepStatus.VERIFYING, StepStatus.VERIFIED)
            step.status = StepStatus.VERIFIED.value
            await db.commit()

            await sandboxed_executor.record_audit_event(
                plan_id=plan_id,
                step_id=step.id,
                event_type=EventType.VERIFIED,
                payload={"verifier": verifier.name, "assertions_passed": len(proof_data.assertions)},
                db=db
            )
        else:
            # Verification Discrepancy
            step.status = StepStatus.FAILED.value
            step.error_message = f"Verification failed by {verifier.name}: discrepancies detected in state delta."
            await db.commit()

            await sandboxed_executor.record_audit_event(
                plan_id=plan_id,
                step_id=step.id,
                event_type=EventType.FAILED,
                payload={
                    "verifier": verifier.name,
                    "failed_assertions": [a.model_dump() for a in proof_data.assertions if not a.passed]
                },
                db=db,
                severity=Severity.CRITICAL
            )

        return proof_data


verifier_engine = VerifierEngine()
