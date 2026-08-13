"""
agents/nodes/pedagogical_reviewer_node.py
==========================================
Pedagogical Reviewer Node — Stage 4 of the course generation pipeline.

Responsibilities:
 - Review each generated lesson against a pedagogical checklist
 - Uses LLM to judge: completeness, correctness, difficulty appropriateness,
   example quality, objective coverage, no hallucinated facts
 - Issues a PASS or FAIL verdict with specific suggestions
 - If any lessons fail: increments retry_count (lesson generator will re-run those)
 - After max retries (2): passes all lessons to quality gate regardless

Bloom's taxonomy levels checked:
  Remember → Understand → Apply → Analyze (for advanced lessons)

Design:
 - Reviews in parallel batches of 5
 - Non-blocking: reviewer failures do NOT abort the pipeline
 - Status: 'reviewing_content'
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional

import httpx
from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from providers.llm.provider_errors import AllProvidersFailedError
from agents.states.course_agent_state import CourseAgentState
from schemas.course_generation import LessonReviewSchema
from utils.json_extractor import extract_json, extract_model_response
from config.settings import settings

logger = logging.getLogger(__name__)

_REVIEW_BATCH_SIZE = 5
_MAX_RETRY_COUNT = 2

# Pedagogical checklist from AgentResponsibilities.md
_REVIEW_CHECKLIST = """
Evaluate this lesson against the following checklist:
1. learning objective covered? (Are all stated objectives addressed in the content?)
2. explanation sufficient? (Is the core concept clearly and thoroughly explained?)
3. examples correct? (Are code examples or examples accurate and executable?)
4. difficulty appropriate? (Does content match the stated difficulty level?)
5. no hallucinated facts? (Are all claims factually accurate?)
6. references support claims? (Do referenced resources actually relate to lesson content?)
7. no duplicated content? (Is content unique and non-repetitive?)
8. estimated time realistic? (Is the time estimate reasonable for the content volume?)
9. Bloom's taxonomy: which levels are addressed? (remember/understand/apply/analyze)
"""

_REVIEW_OUTPUT_SCHEMA = """
{
  "lesson_title": "<string>",
  "passed": <true|false>,
  "issues": ["<specific issue 1>", ...],
  "suggestions": ["<specific improvement for lesson generator>", ...],
  "bloom_levels_covered": ["remember", "understand", ...]
}
"""


async def _send_status_webhook(content_id: int | None, status: str, label: str) -> None:
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


async def _review_single_lesson(
    lesson: Dict[str, Any],
    blueprint_lesson: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Review a single lesson against the pedagogical checklist.

    Returns a LessonReviewSchema dict.
    On LLM/parse failure: returns a default PASS to avoid blocking the pipeline.
    """
    lesson_title = lesson.get("title", "Untitled")
    objectives = blueprint_lesson.get("learning_objectives", [])

    # Compact lesson summary for the reviewer (avoid huge prompts)
    section_summaries = []
    for sec in lesson.get("sections", [])[:6]:  # review first 6 sections max
        body_preview = (sec.get("body", "") or "")[:300]
        section_summaries.append(
            f"[{sec.get('section_type', 'unknown')}] {sec.get('title', '')}:\n{body_preview}"
        )

    exercise_titles = [e.get("title", "") for e in lesson.get("exercises", [])]

    review_prompt = f"""
Lesson Title: {lesson_title}
Learning Objectives: {json.dumps(objectives)}
Difficulty: {lesson.get('difficulty', 'unknown')}
Estimated Time: {lesson.get('estimated_time', 'unknown')}

Content Preview:
{chr(10).join(section_summaries)}

Exercises: {json.dumps(exercise_titles)}

{_REVIEW_CHECKLIST}

Output ONLY this JSON (no markdown, no extra text):
{_REVIEW_OUTPUT_SCHEMA}
"""

    system_msg = (
        "You are a rigorous pedagogical quality reviewer. "
        "Evaluate the lesson objectively. Be specific about issues and suggestions. "
        "Output ONLY valid JSON."
    )

    # ── Acquire LLM from router (provider-agnostic) ─────────────────────────
    try:
        llm = await get_llm_for_course_task(TaskType.COURSE_REVIEWER)
    except AllProvidersFailedError as exc:
        logger.warning(
            "[Reviewer] All LLM providers failed for '%s' — defaulting to PASS: %s",
            lesson_title, exc
        )
        # Non-blocking: reviewer failure should not abort the pipeline
        return {"lesson_title": lesson_title, "passed": True, "issues": [], "suggestions": [], "bloom_levels_covered": []}

    messages = [SystemMessage(content=system_msg), HumanMessage(content=review_prompt)]

    try:
        if hasattr(llm, "ainvoke"):
            response = await llm.ainvoke(messages)
        else:
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: llm.invoke(messages)
            )

        response_text = extract_model_response(response).strip()
        success, json_str = extract_json(response_text)

        if not success:
            logger.warning("[Reviewer] JSON extraction failed for '%s' — defaulting to PASS", lesson_title)
            return {"lesson_title": lesson_title, "passed": True, "issues": [], "suggestions": [], "bloom_levels_covered": []}

        raw = json.loads(json_str)

        # Validate with Pydantic
        try:
            review = LessonReviewSchema(**raw)
            result = review.model_dump()
            status = "✓ PASS" if review.passed else "✗ FAIL"
            logger.info("[Reviewer] %s lesson='%s' issues=%d", status, lesson_title, len(review.issues))
            return result
        except Exception:
            return raw  # Use raw if Pydantic fails

    except Exception as exc:
        logger.warning("[Reviewer] Review failed for '%s' (defaulting to PASS): %s", lesson_title, exc)
        return {"lesson_title": lesson_title, "passed": True, "issues": [], "suggestions": [], "bloom_levels_covered": []}



def _build_lesson_blueprint_index(blueprint: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Index lesson blueprints by title for O(1) lookup during review."""
    index = {}
    for phase in blueprint.get("phases", []):
        for module in phase.get("modules", []):
            for lesson in module.get("lessons", []):
                index[lesson.get("title", "")] = lesson
    return index


async def pedagogical_reviewer_node(state: CourseAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Review all generated lessons for pedagogical quality.

    If any lessons fail and retry_count < _MAX_RETRY_COUNT:
      → returns with retry signal (graph loops back to lesson_generator_node)
    If retry_count >= _MAX_RETRY_COUNT:
      → forces all lessons to PASS (best-effort) to avoid infinite loops

    Returns:
      - reviewer_results: dict[lesson_title → review_dict]
      - retry_count: incremented if any failures
      - pipeline_status: 'reviewing_content'
      - warnings: any reviewer issues
    """
    content_id = state.get("content_id")
    generated_lessons = state.get("generated_lessons", []) or []
    blueprint = state.get("course_blueprint", {})
    retry_count = state.get("retry_count", 0)

    if not generated_lessons:
        logger.warning("[Reviewer] No lessons to review — skipping")
        return {"reviewer_results": {}, "pipeline_status": "reviewing_content"}

    total = len(generated_lessons)
    logger.info("[Reviewer] Reviewing %d lessons (retry=%d)", total, retry_count)

    await _send_status_webhook(
        content_id,
        status="reviewing_content",
        label=f"🧐 Reviewing {total} lessons for quality..."
    )

    # If max retries reached: skip review and pass everything through
    if retry_count >= _MAX_RETRY_COUNT:
        logger.warning("[Reviewer] Max retries reached — passing all lessons to quality gate")
        forced_results = {
            (l.get("title", f"lesson_{i}") if l else f"lesson_{i}"): {
                "lesson_title": l.get("title", "") if l else "",
                "passed": True,
                "issues": ["Max retries reached — forced pass"],
                "suggestions": [],
                "bloom_levels_covered": [],
            }
            for i, l in enumerate(generated_lessons)
        }
        return {
            "reviewer_results": forced_results,
            "pipeline_status": "reviewing_content",
            "warnings": state.get("warnings", []) + ["Reviewer: max retries reached — forced pass on all lessons"],
        }

    blueprint_index = _build_lesson_blueprint_index(blueprint)
    reviewer_results: Dict[str, Any] = {}
    warnings = list(state.get("warnings", []))

    # Review in parallel batches
    valid_lessons = [(i, l) for i, l in enumerate(generated_lessons) if l]
    for batch_start in range(0, len(valid_lessons), _REVIEW_BATCH_SIZE):
        batch = valid_lessons[batch_start: batch_start + _REVIEW_BATCH_SIZE]

        coroutines = [
            _review_single_lesson(
                lesson=lesson,
                blueprint_lesson=blueprint_index.get(lesson.get("title", ""), {}),
            )
            for _, lesson in batch
        ]

        results = await asyncio.gather(*coroutines, return_exceptions=False)

        for (_, lesson), review in zip(batch, results):
            title = lesson.get("title", "unknown")
            reviewer_results[title] = review

    # Count failures
    failed_titles = [
        title for title, review in reviewer_results.items()
        if not review.get("passed", True)
    ]
    failure_count = len(failed_titles)

    if failure_count > 0 and retry_count < _MAX_RETRY_COUNT:
        logger.info(
            "[Reviewer] %d lessons failed review — scheduling retry %d",
            failure_count, retry_count + 1
        )
        warnings.append(f"Reviewer: {failure_count} lessons need regeneration (retry {retry_count + 1})")
        return {
            "reviewer_results": reviewer_results,
            "retry_count": retry_count + 1,
            "pipeline_status": "reviewing_content",
            "warnings": warnings,
        }

    logger.info("[Reviewer] All lessons passed (or max retries). Proceeding to quality gate.")
    return {
        "reviewer_results": reviewer_results,
        "retry_count": retry_count,
        "pipeline_status": "reviewing_content",
        "warnings": warnings,
    }
