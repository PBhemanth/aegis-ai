"""
Unit Tests: arXiv Academic Research Tool
Tests paper retrieval, XML Atom feed parsing, and citation extraction.
"""
import pytest
from backend.app.tools.arxiv_research import ArxivResearchTool, ArxivSearchInput
from backend.app.tools.base import ExecutionContext


@pytest.mark.asyncio
async def test_arxiv_tool_executes_and_returns_structured_papers():
    tool = ArxivResearchTool()
    params = ArxivSearchInput(query="GNN cryptocurrency fraud detection", max_results=2)
    context = ExecutionContext()

    result = await tool.execute(params, context)

    assert result.total_found >= 1
    assert len(result.papers) >= 1
    first_paper = result.papers[0]
    assert first_paper.arxiv_id is not None
    assert len(first_paper.title) > 5
    assert len(first_paper.summary) > 20
    assert len(first_paper.authors) >= 1
    assert "arxiv.org" in first_paper.pdf_url


def test_arxiv_feed_xml_parser():
    sample_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
      <title>arXiv Query</title>
      <entry>
        <id>http://arxiv.org/abs/2301.00001v1</id>
        <published>2023-01-01T12:00:00Z</published>
        <title> Deep Graph Models for Blockchain Security </title>
        <summary> A comprehensive study on anomaly detection in cryptocurrency. </summary>
        <author><name>Alice Johnson</name></author>
        <author><name>Bob Smith</name></author>
        <link title="pdf" href="http://arxiv.org/pdf/2301.00001v1.pdf" type="application/pdf"/>
        <arxiv:primary_category term="cs.CR"/>
      </entry>
    </feed>
    """
    tool = ArxivResearchTool()
    parsed = tool._parse_arxiv_feed(sample_xml, "test query")

    assert parsed.total_found == 1
    paper = parsed.papers[0]
    assert paper.arxiv_id == "2301.00001v1"
    assert paper.title == "Deep Graph Models for Blockchain Security"
    assert paper.authors == ["Alice Johnson", "Bob Smith"]
    assert paper.primary_category == "cs.CR"
    assert paper.pdf_url == "http://arxiv.org/pdf/2301.00001v1.pdf"


def test_arxiv_query_cleaning_strips_meta_directives():
    tool = ArxivResearchTool()
    assert tool._clean_search_query("GNN fraud detection with source links") == "GNN fraud detection"
    assert tool._clean_search_query("3 papers on GNN fraud detection with citations") == "GNN fraud detection"
    assert tool._clean_search_query("Research 3 papers on GNN fraud detection with source links") == "GNN fraud detection"


@pytest.mark.asyncio
async def test_arxiv_tool_executes_query_with_meta_instructions():
    tool = ArxivResearchTool()
    # Exact production failure query
    params = ArxivSearchInput(query="GNN fraud detection with source links", max_results=3)
    context = ExecutionContext()

    result = await tool.execute(params, context)

    assert result.total_found >= 1
    assert len(result.papers) >= 1
    first_paper = result.papers[0]
    assert first_paper.arxiv_id is not None
    assert len(first_paper.summary) > 20
