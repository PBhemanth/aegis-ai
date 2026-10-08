"""
Unit Tests: Document Synthesizer Tool
Tests document compilation, citation tables, section counting, and SHA-256 checksums.
"""
import hashlib
import pytest
from backend.app.tools.base import ExecutionContext
from backend.app.tools.document_synthesizer import DocumentSynthesizerTool, SynthesizerInput


@pytest.mark.asyncio
async def test_document_synthesizer_generates_markdown_with_citations():
    tool = DocumentSynthesizerTool()
    params = SynthesizerInput(
        title="GNN Crypto Fraud Analysis Brief",
        content="This technical report summarizes topological graph methods used for blockchain forensic analysis.",
        citations=[
            {
                "arxiv_id": "2305.18290",
                "title": "GNN in Crypto Forensics",
                "authors": ["L. Zhang", "M. Weber"],
                "published": "2023-05-29"
            }
        ]
    )
    context = ExecutionContext()

    result = await tool.execute(params, context)

    assert result.file_name == "gnn_crypto_fraud_analysis_brief.md"
    assert result.format == "markdown"
    assert result.size_bytes > 100
    assert result.section_count >= 2
    assert "Executive Summary" in result.content
    assert "Peer-Reviewed Citations" in result.content
    assert "2305.18290" in result.content

    # Verify SHA-256 integrity
    computed_hash = hashlib.sha256(result.content.encode("utf-8")).hexdigest()
    assert result.sha256_checksum == computed_hash
