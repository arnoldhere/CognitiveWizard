"""
agents/nodes/research_agent_node.py
=====================================
Research Agent Node — Stage 2 of the course generation pipeline.

Responsibilities:
 - Extract all lesson titles from the course blueprint
 - For each lesson: call ReferenceRetriever to fetch curated evidence
 - Batch lessons (5 per batch) and process batches concurrently to balance
   speed vs API rate limits
 - Aggregate evidence keyed by lesson title for the Lesson Generator to consume

Design decisions:
 - Uses the EXISTING reference_retriever singleton — respects provider abstraction
   (Tavily now, swappable later via BaseSearchProvider)
 - Per-lesson max_results capped at 4 to keep latency reasonable
 - Failures are soft: a lesson with no evidence still gets generated (with fewer refs)
 - Notifies JS server with status: 'generating_evidence'
"""

from __future__ import annotations
import asyncio
import logging
from typing import Dict, Any, List

import httpx

from agents.services.refr_retr_agent import reference_retriever
from agents.states.course_agent_state import CourseAgentState
from schemas.agentic.reference_agent import ReferenceQueryInput
from config.settings import settings

logger = logging.getLogger(__name__)

# How many lessons to research in parallel per batch
_BATCH_SIZE = 5


async def _send_status_webhook(content_id: int | None, status: str, label: str) -> None:
    """Fire-and-forget status update to JS server."""
    if not content_id:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.JS_SERVER_URL}/internal/wizard-webhook/status",
                json={"content_id": content_id, "status": status, "label": label},
            )
    except Exception as exc:
        logger.warning("Status webhook failed (non-critical): %s", exc)


def _extract_lesson_titles(blueprint: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Walk the blueprint tree and collect all lesson titles + their parent context.
    Returns list of dicts: {"topic": full_search_topic, "lesson_title": title}
    """
    lessons = []
    course_title = blueprint.get("title", "")

    for phase in blueprint.get("phases", []):
        phase_title = phase.get("title", "")
        for module in phase.get("modules", []):
            module_title = module.get("title", "")
            for lesson in module.get("lessons", []):
                lesson_title = lesson.get("title", "")
                # Build a compound search topic for better reference relevance
                compound_topic = f"{course_title} — {module_title} — {lesson_title}"
                lessons.append({
                    "lesson_title": lesson_title,
                    "search_topic": compound_topic,
                    "learning_objectives": lesson.get("learning_objectives", []),
                })

    return lessons


async def _fetch_lesson_evidence(
    lesson_info: Dict[str, str],
    skill_level: str,
    goal: str,
) -> tuple[str, List[Dict[str, Any]]]:
    """
    Fetch references for a single lesson.
    Returns (lesson_title, list_of_resource_dicts).
    Soft-fails: returns empty list on error.
    """
    lesson_title = lesson_info["lesson_title"]
    try:
        query_input = ReferenceQueryInput(
            topic=lesson_info["search_topic"],
            skill_level=skill_level or "beginner",
            goal=goal or "",
            learning_style="mixed",
            max_results_per_category=4,  # Per-lesson cap to control Tavily usage
        )
        result = await reference_retriever.fetch_references(query_input)
        resources = [r.model_dump() for r in result.resources]
        logger.info(
            "[Research] Lesson '%s': fetched %d resources",
            lesson_title, len(resources)
        )
        return lesson_title, resources

    except Exception as exc:
        logger.warning(
            "[Research] Failed to fetch evidence for lesson '%s': %s",
            lesson_title, exc
        )
        return lesson_title, []  # Soft fail — lesson still gets generated


async def research_agent_node(state: CourseAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Gather evidence for all lessons in the blueprint.

    Processes lessons in batches of _BATCH_SIZE to avoid overwhelming
    the search provider while still being significantly faster than sequential.

    Returns:
      - lesson_evidence: dict mapping lesson_title → [resource_dict, ...]
      - pipeline_status: 'generating_evidence'
      - warnings: any non-fatal search failures
    """
    content_id = state.get("content_id")
    blueprint = state.get("course_blueprint", {})

    if not blueprint:
        logger.warning("[Research] No blueprint in state — skipping evidence gathering")
        return {
            "lesson_evidence": {},
            "pipeline_status": "generating_evidence",
            "warnings": state.get("warnings", []) + ["Research node: no blueprint found."],
        }

    all_lessons = _extract_lesson_titles(blueprint)
    total = len(all_lessons)
    logger.info("[Research] Gathering evidence for %d lessons (batch_size=%d)", total, _BATCH_SIZE)

    await _send_status_webhook(
        content_id,
        status="generating_evidence",
        label=f"🔍 Researching sources for {total} lessons..."
    )

    skill_level = state.get("skill_level", "beginner")
    goal = state.get("goal", "")
    evidence_map: Dict[str, List[Dict[str, Any]]] = {}
    warnings: List[str] = list(state.get("warnings", []))

    # Process in batches to balance speed vs rate limiting
    for batch_start in range(0, total, _BATCH_SIZE):
        batch = all_lessons[batch_start: batch_start + _BATCH_SIZE]

        tasks = [
            _fetch_lesson_evidence(lesson_info, skill_level, goal)
            for lesson_info in batch
        ]

        results = await asyncio.gather(*tasks, return_exceptions=False)

        for lesson_title, resources in results:
            evidence_map[lesson_title] = resources

        logger.info(
            "[Research] Batch %d/%d complete",
            min(batch_start + _BATCH_SIZE, total), total
        )

    logger.info(
        "[Research] Evidence gathering complete. %d lessons with resources.",
        sum(1 for v in evidence_map.values() if v)
    )

    return {
        "lesson_evidence": evidence_map,
        "pipeline_status": "generating_evidence",
        "warnings": warnings,
    }
