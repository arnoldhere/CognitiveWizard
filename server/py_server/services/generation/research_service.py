"""
services/generation/research_service.py
=======================================
Generalised Reference & Research Service.

Implements three differentiated research policies over shared search infrastructure:
- Roadmap Policy: Breadth-first reference curation + visual asset discovery.
- Guide Policy: Practical documentation, tool references, and tutorial retrieval.
- Course Policy: Per-lesson granular evidence packages with batch concurrency control.
"""

from __future__ import annotations
import asyncio
import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional

from agents.services.refr_retr_agent import reference_retriever
from schemas.agentic.reference_agent import ReferenceQueryInput, ResourceItem

logger = logging.getLogger(__name__)


class ReferenceResearchService:
    """Multi-policy reference and citation retriever for AI Wizard generation."""

    def __init__(self, retriever=None):
        self.retriever = retriever or reference_retriever

    def _group_by_category(self, resources: List[ResourceItem]) -> Dict[str, List[Dict[str, Any]]]:
        """Group a list of ResourceItems into categories (youtube, official_docs, article, course, research_paper)."""
        grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for r in resources:
            cat = r.category or "other"
            grouped[cat].append({
                "title": r.title,
                "url": str(r.url),
                "description": r.description,
                "source": r.source,
                "relevance_score": r.relevance_score,
            })
        return dict(grouped)

    # ── Roadmap Policy ────────────────────────────────────────────────────────
    async def research_for_roadmap(
        self,
        topic: str,
        skill_level: str = "beginner",
        goal: str = "",
        learning_style: str = "mixed",
    ) -> Dict[str, Any]:
        """
        Broad curriculum research: retrieves high-level references across categories,
        curating books/courses, official documentation, articles, and video overviews.
        """
        logger.info("[ResearchService|Roadmap] Gathering references for topic='%s'", topic)
        try:
            query_input = ReferenceQueryInput(
                topic=topic,
                skill_level=skill_level or "beginner",
                goal=goal or "",
                learning_style=learning_style or "mixed",
                max_results_per_category=4,
            )
            search_result = await self.retriever.fetch_references(query_input)
            grouped = self._group_by_category(search_result.resources)
            images = []
            if "visual" in (learning_style or "").lower():
                # Extract image URLs if visual learning was specified
                images = [str(r.url) for r in search_result.resources if "youtube" in (r.category or "")]

            return {
                "references": grouped,
                "images": images,
                "warnings": search_result.warnings,
                "raw_count": len(search_result.resources),
            }
        except Exception as exc:
            logger.warning("[ResearchService|Roadmap] Failed to fetch roadmap references: %s", exc)
            return {"references": {}, "images": [], "warnings": [str(exc)], "raw_count": 0}

    # ── Guide Policy ──────────────────────────────────────────────────────────
    async def research_for_guide(
        self,
        topic: str,
        key_modules: Optional[List[str]] = None,
        skill_level: str = "beginner",
    ) -> Dict[str, Any]:
        """
        Depth-oriented research for practical step-by-step guides:
        focuses on official documentation, API references, and technical guides.
        """
        logger.info("[ResearchService|Guide] Gathering technical docs for topic='%s'", topic)
        try:
            query_input = ReferenceQueryInput(
                topic=f"{topic} documentation practical tutorial",
                skill_level=skill_level or "beginner",
                goal="Practical step-by-step application",
                learning_style="interactive",
                max_results_per_category=3,
            )
            search_result = await self.retriever.fetch_references(query_input)
            grouped = self._group_by_category(search_result.resources)

            return {
                "references": grouped,
                "warnings": search_result.warnings,
                "raw_count": len(search_result.resources),
            }
        except Exception as exc:
            logger.warning("[ResearchService|Guide] Failed to fetch guide references: %s", exc)
            return {"references": {}, "warnings": [str(exc)], "raw_count": 0}

    # ── Course / Lesson Policy ────────────────────────────────────────────────
    async def research_for_course_lessons(
        self,
        lessons: List[Dict[str, Any]],
        skill_level: str = "beginner",
        goal: str = "",
        job_id: str = "unknown",
        batch_size: int = 10,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Per-lesson evidence gathering: batches lesson titles and queries references
        with concurrency control to balance speed vs rate limits.
        """
        evidence_map: Dict[str, List[Dict[str, Any]]] = {}

        async def _fetch_single(lesson_info: Dict[str, Any]):
            title = lesson_info.get("lesson_title") or lesson_info.get("title", "")
            search_topic = lesson_info.get("search_topic") or title
            try:
                q_input = ReferenceQueryInput(
                    topic=search_topic,
                    skill_level=skill_level or "beginner",
                    goal=goal or "",
                    learning_style="mixed",
                    max_results_per_category=4,
                )
                res = await self.retriever.fetch_references(q_input)
                return title, [r.model_dump() for r in res.resources]
            except Exception as exc:
                logger.warning("[ResearchService|Course] Failed evidence for '%s': %s", title, exc)
                return title, []

        for start_idx in range(0, len(lessons), batch_size):
            batch = lessons[start_idx : start_idx + batch_size]
            tasks = [_fetch_single(item) for item in batch]
            results = await asyncio.gather(*tasks, return_exceptions=False)
            for title, resources in results:
                evidence_map[title] = resources

        return evidence_map


# Global singleton instance
reference_research_service = ReferenceResearchService()
