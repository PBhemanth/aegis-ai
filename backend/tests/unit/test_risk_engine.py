"""
Unit Tests: Deterministic Risk Engine & Blast Radius Rubric
Tests objective risk classification across diverse tool calls without LLM dependency.
"""
from backend.app.agent.risk_engine import RiskEngine
from backend.app.schemas.common import RiskTier


def test_read_only_tools_classify_as_tier_0():
    # arXiv search
    eval_arxiv = RiskEngine.evaluate_risk(
        tool_name="web_search_arxiv",
        parameters={"query": "GNN cryptocurrency fraud detection", "max_results": 3}
    )
    assert eval_arxiv.risk_tier == RiskTier.TIER_0_READ
    assert eval_arxiv.requires_approval is False
    assert eval_arxiv.requires_typed_confirmation is False

    # Calendar free/busy check
    eval_cal = RiskEngine.evaluate_risk(
        tool_name="google_calendar_check_slots",
        parameters={"time_min": "2026-10-09T09:00:00Z", "time_max": "2026-10-09T17:00:00Z"}
    )
    assert eval_cal.risk_tier == RiskTier.TIER_0_READ
    assert eval_cal.requires_approval is False


def test_additive_sandboxed_operations_classify_as_tier_1():
    # Document compilation in sandbox
    eval_doc = RiskEngine.evaluate_risk(
        tool_name="document_synthesizer",
        parameters={"title": "Crypto Fraud Brief", "content": "# Overview..."}
    )
    assert eval_doc.risk_tier == RiskTier.TIER_1_REVERSIBLE
    assert eval_doc.requires_approval is False

    # Upload to dedicated Aegis workspace folder
    eval_upload = RiskEngine.evaluate_risk(
        tool_name="google_drive_upload_file",
        parameters={
            "file_name": "crypto_fraud_brief.pdf",
            "folder_name": "Aegis AI Workspace/Research",
            "path": "Aegis AI Workspace/Research/crypto_fraud_brief.pdf"
        }
    )
    assert eval_upload.risk_tier == RiskTier.TIER_1_REVERSIBLE
    assert eval_upload.requires_approval is False


def test_consequential_external_operations_classify_as_tier_2():
    # Calendar meeting inviting external attendees
    eval_meeting = RiskEngine.evaluate_risk(
        tool_name="google_calendar_create_event",
        parameters={
            "title": "Crypto Fraud Report Review",
            "start_time": "2026-10-09T14:00:00Z",
            "end_time": "2026-10-09T14:30:00Z",
            "attendees": ["advisor@university.edu", "peer@lab.org"]
        }
    )
    assert eval_meeting.risk_tier == RiskTier.TIER_2_MUTATING
    assert eval_meeting.requires_approval is True
    assert eval_meeting.requires_typed_confirmation is False


def test_destructive_operations_classify_as_tier_3_with_typed_phrase():
    # Deleting files from Google Drive
    eval_delete = RiskEngine.evaluate_risk(
        tool_name="google_drive_delete_file",
        parameters={
            "file_id": "file_987",
            "file_name": "old_crypto_report.pdf",
            "file_size_bytes": 1048576,
            "permanent_delete": True
        }
    )
    assert eval_delete.risk_tier == RiskTier.TIER_3_DESTRUCTIVE
    assert eval_delete.requires_approval is True
    assert eval_delete.requires_typed_confirmation is True
    assert eval_delete.confirmation_phrase == "DELETE"
    assert eval_delete.blast_radius.reversibility_score == 10


def test_bulk_deletion_blast_radius_calculation():
    files = [
        {"id": "f1", "name": "report_v1.pdf", "size_bytes": 1000000},
        {"id": "f2", "name": "report_v2.pdf", "size_bytes": 2000000},
        {"id": "f3", "name": "archive.zip", "size_bytes": 5000000},
    ]
    blast = RiskEngine.compute_blast_radius(
        tool_name="google_drive_purge",
        parameters={"files": files, "action": "purge"}
    )
    assert blast.item_count == 3
    assert blast.total_size_bytes == 8000000
    assert blast.reversibility_score == 10
    # Blast radius score = (3 * 1.0) + (sensitivity * 1.5) + (10 * 1.2) >= 15
    assert blast.blast_radius_score >= 15.0
