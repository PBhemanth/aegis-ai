"""
Real Academic Research Tool (arXiv Public API)
Fetches real scientific papers, abstracts, authors, and citation links.
"""
import re
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional
import httpx
from pydantic import BaseModel, Field
from backend.app.schemas.common import RiskTier
from backend.app.tools.base import BaseTool, ExecutionContext, ToolExecutionError


class ArxivSearchInput(BaseModel):
    query: str = Field(min_length=2, description="Search terms or keywords, e.g. 'GNN cryptocurrency fraud detection'")
    max_results: int = Field(default=3, ge=1, le=10, description="Number of papers to retrieve")


class PaperMetadata(BaseModel):
    arxiv_id: str
    title: str
    authors: List[str]
    published: str
    summary: str
    pdf_url: str
    primary_category: str


class ArxivSearchResult(BaseModel):
    query: str
    total_found: int
    papers: List[PaperMetadata]


class ArxivResearchTool(BaseTool):
    name = "web_search_arxiv"
    description = "Searches the official arXiv scientific literature database for peer-reviewed papers by query."
    category = "research"
    base_risk_tier = RiskTier.TIER_0_READ
    required_scopes = ["network.read"]
    requires_approval = False
    input_schema = ArxivSearchInput
    output_schema = ArxivSearchResult
    verification_contract = {
        "verifier": "ArxivPaperVerifier",
        "assertions": [
            "valid_arxiv_id_format",
            "non_empty_abstract",
            "authors_present",
            "pdf_link_valid"
        ]
    }

    ARXIV_API_URL = "https://export.arxiv.org/api/query"

    async def execute(self, params: ArxivSearchInput, context: ExecutionContext) -> ArxivSearchResult:
        """
        Executes query against the public arXiv REST API and parses Atom XML feed.
        """
        clean_query = re.sub(r"[^\w\s\-]", " ", params.query).strip()
        formatted_query = "+".join(clean_query.split())

        query_params = {
            "search_query": f"all:{formatted_query}",
            "start": 0,
            "max_results": params.max_results,
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
                response = await client.get(self.ARXIV_API_URL, params=query_params)
                if response.status_code != 200:
                    raise ToolExecutionError(
                        f"arXiv public API returned HTTP status {response.status_code} for query '{params.query}'.",
                        tool_name=self.name
                    )
                xml_text = response.text
        except httpx.RequestError as e:
            raise ToolExecutionError(
                f"arXiv public API is unreachable or request timed out ({str(e)}). No fabricated papers returned.",
                tool_name=self.name
            )

        try:
            return self._parse_arxiv_feed(xml_text, params.query)
        except Exception as e:
            raise ToolExecutionError(
                f"Failed to parse arXiv Atom XML response feed ({str(e)}).",
                tool_name=self.name
            )

    def _parse_arxiv_feed(self, xml_text: str, query: str) -> ArxivSearchResult:
        """Parses Atom XML returned by arXiv."""
        root = ET.fromstring(xml_text)
        ns = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

        papers: List[PaperMetadata] = []
        entries = root.findall("atom:entry", ns)

        for entry in entries:
            id_elem = entry.find("atom:id", ns)
            title_elem = entry.find("atom:title", ns)
            summary_elem = entry.find("atom:summary", ns)
            published_elem = entry.find("atom:published", ns)

            raw_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""
            arxiv_id = raw_id.split("/abs/")[-1] if "/abs/" in raw_id else raw_id

            title = " ".join(title_elem.text.split()) if title_elem is not None and title_elem.text else "Untitled"
            summary = " ".join(summary_elem.text.split()) if summary_elem is not None and summary_elem.text else ""
            published = published_elem.text.strip() if published_elem is not None and published_elem.text else ""

            # Extract authors
            authors = []
            for author_elem in entry.findall("atom:author", ns):
                name_elem = author_elem.find("atom:name", ns)
                if name_elem is not None and name_elem.text:
                    authors.append(name_elem.text.strip())

            # Extract PDF url
            pdf_url = ""
            for link in entry.findall("atom:link", ns):
                if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                    pdf_url = link.attrib.get("href", "")
                    break
            if not pdf_url and arxiv_id:
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

            cat_elem = entry.find("arxiv:primary_category", ns)
            category = cat_elem.attrib.get("term", "cs.AI") if cat_elem is not None else "cs.AI"

            papers.append(PaperMetadata(
                arxiv_id=arxiv_id,
                title=title,
                authors=authors or ["Unknown"],
                published=published,
                summary=summary,
                pdf_url=pdf_url,
                primary_category=category
            ))

        return ArxivSearchResult(
            query=query,
            total_found=len(papers),
            papers=papers
        )


arxiv_tool = ArxivResearchTool()
