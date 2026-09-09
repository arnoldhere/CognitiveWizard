"""

Pedagogical Reviewer Node
Responsibilities:
    - Review each generated lesson against a pedagogical checklist
    - Validate lesson structure before LLM review
    - Use provider-agnostic LLM routing
    - Issue PASS / FAIL verdict with specific suggestions
    - Retry failed lessons through the LangGraph retry loop
    - Never treat provider/infrastructure failures as PASS
    - Never allow malformed reviewer output to silently pass
    - Remain non-blocking at node level: reviewer failures become explicit
    review failures/warnings instead of crashing the graph

Bloom's taxonomy levels checked:
    Remember → Understand → Apply → Analyze

After max retries:
    Reviewer does NOT force PASS.
    It sends the current results to Quality Gate, where only
    structurally valid lessons should be assembled.
Status:
    'reviewing_content'
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional
import httpx
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import ValidationError
from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from providers.llm.provider_errors import AllProvidersFailedError
from agents.states.course_agent_state import CourseAgentState
from schemas.course_generation import (
    CourseLessonSchema,
    LessonReviewSchema,
)
from utils.json_extractor import extract_json, extract_model_response
from config.settings import settings

logger = logging.getLogger(__name__)


# ====================
# Configuration
# ====================

# Number of lessons reviewed concurrently.
# Keep conservative because each lesson invokes an external LLM.
_REVIEW_BATCH_SIZE = 2
# Maximum number of regeneration cycles.
# retry_count=0 -> initial generation
# retry_count=1 -> first regeneration
# retry_count=2 -> second regeneration
# then -> quality gate
_MAX_RETRY_COUNT = 2
# Reviewer-level retries for transient LLM failures.
# This is separate from lesson regeneration retries.
_REVIEW_LLM_RETRIES = 2
# Exponential backoff:
# retry 1 -> 0.75s
# retry 2 -> 1.5s
_REVIEW_RETRY_BASE_DELAY = 0.75

# ====================
# Reviewer checklist
# ====================

_REVIEW_CHECKLIST = """
Evaluate this lesson against the following criteria:

1. Factual accuracy & Core Concept:
   - Does the lesson explain the core concept correctly without major scientific, technical, or logical hallucinations?
2. Coverage of Stated Learning Objectives:
   - Are the core learning objectives addressed in the explanation, examples, or overview?
3. Practical Quality & Exercises:
   - Are the exercises coherent and aligned with the lesson topic?
   - NOTE ON CODE VS THEORY: Theoretical, historical, or conceptual lessons (e.g. "History of Machine Learning", "Ethics in AI", conceptual overviews) are NOT required to contain code sections or coding exercises. Conceptual Q&A, scenario analysis, or reflection exercises are appropriate and expected. Do NOT reject or penalize a theoretical lesson for omitting code.

PASS vs FAIL DECISION RUBRIC:
- Set "review_status": "passed" if the core subject matter is accurately explained and the primary objectives are addressed. Any minor improvements, suggestions for more examples, or stylistic polish MUST be placed in the "suggestions" array without failing the lesson. (Remember that human instructors review the course before publication).
- ONLY set "review_status": "failed" if there are critical blocking defects: severe factual hallucinations, total absence of core topic coverage, unparseable/empty text, or completely broken exercises.
"""


_REVIEW_OUTPUT_SCHEMA = """
{
    "lesson_title": "<string>",
    "review_status": "<passed|failed>",
    "issues": [
    "<specific issue>"
    ],
    "suggestions": [
    "<specific actionable improvement>"
    ],
    "bloom_levels_covered": [
    "remember",
    "understand",
    "apply",
    "analyze"
    ]
}
"""


# ==============================
# Common result helpers
# ==============================


def _review_result(
    lesson_title: str,
    *,
    review_status: str,
    issues: Optional[List[str]] = None,
    suggestions: Optional[List[str]] = None,
    bloom_levels_covered: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Build a consistent LessonReviewSchema-compatible result.

    Important:
    - Every failure is represented as review_status="failed".
    - No infrastructure/model failure is silently converted to passed.
    """
    return {
        "lesson_title": lesson_title,
        "review_status": review_status,
        "issues": issues or [],
        "suggestions": suggestions or [],
        "bloom_levels_covered": bloom_levels_covered or [],
    }


def _format_validation_errors(exc: ValidationError) -> List[str]:
    """Convert Pydantic validation errors into compact reviewer issues."""
    issues: List[str] = []

    for error in exc.errors():
        location = ".".join(str(item) for item in error.get("loc", []))
        message = error.get("msg", "Validation error")

        if location:
            issues.append(f"{location}: {message}")
        else:
            issues.append(message)

    return issues


# ====================
# Webhook
# ====================


async def _send_status_webhook(
    content_id: int | None,
    status: str,
    label: str,
) -> None:
    """
    Send non-critical status update to JS server.

    Webhook failures must never affect course generation.
    """
    if not content_id:
        return

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.JS_SERVER_URL}/internal/wizard-webhook/status",
                json={
                    "content_id": content_id,
                    "status": status,
                    "label": label,
                },
            )

            response.raise_for_status()

    except Exception as exc:
        logger.warning(
            "[Reviewer] Status webhook failed (non-critical): %s",
            exc,
        )


# ====================
# Local lesson validation
# ====================


def _validate_lesson_before_review(
    lesson: Dict[str, Any],
) -> tuple[bool, List[str]]:
    """
    Validate lesson using the canonical CourseLessonSchema.
    This intentionally happens BEFORE the expensive reviewer LLM call.
    This prevents malformed lessons from consuming LLM tokens and makes
    CourseLessonSchema the single source of truth for structural validity.
    """
    if not lesson:
        return False, ["Lesson object is empty"]

    try:
        CourseLessonSchema(**lesson)
        return True, []

    except ValidationError as exc:
        return False, _format_validation_errors(exc)

    except Exception as exc:
        return False, [f"Unexpected lesson validation error: {exc}"]


# ====================
# Reviewer prompt
# ====================
def _build_review_prompt(
    lesson: Dict[str, Any],
    blueprint_lesson: Dict[str, Any],
) -> str:
    """Build compact reviewer prompt."""

    lesson_title = lesson.get("title", "Untitled")
    objectives = blueprint_lesson.get("learning_objectives", [])

    section_summaries: List[str] = []

    # Review enough content for meaningful QA without sending entire lesson.
    for section in lesson.get("sections", [])[:8]:
        section_type = section.get("section_type", "unknown")
        section_title = section.get("title", "") or ""
        body = (section.get("body") or "").strip()

        # Keep prompt bounded.
        body_preview = body[:500]

        section_summaries.append(f"[{section_type}] {section_title}:\n{body_preview}")

    exercise_titles = [
        exercise.get("title", "")
        for exercise in lesson.get("exercises", [])
        if isinstance(exercise, dict)
    ]

    resources = [
        {
            "title": resource.get("title", ""),
            "type": resource.get("resource_type", ""),
            "source": resource.get("source", ""),
        }
        for resource in lesson.get("resources", [])[:5]
        if isinstance(resource, dict)
    ]

    return f"""
Lesson Title:
{lesson_title}

Learning Objectives:
{json.dumps(objectives, ensure_ascii=False)}

Difficulty:
{lesson.get("difficulty", "unknown")}

Estimated Time:
{lesson.get("estimated_time", "unknown")}

Lesson Overview:
{(lesson.get("overview") or "")[:800]}

Content Preview:
{chr(10).join(section_summaries)}

Exercises:
{json.dumps(exercise_titles, ensure_ascii=False)}

Resources:
{json.dumps(resources, ensure_ascii=False)}

{_REVIEW_CHECKLIST}

IMPORTANT:
- Judge the actual lesson content objectively.
- Default to "review_status": "passed" if the technical explanation is sound and addresses the topic.
- Place recommendations, extra examples, or stylistic feedback in "suggestions".
- ONLY return "failed" if the lesson is fundamentally broken, severely hallucinated, or empty.
- Suggestions must be actionable for the lesson generator.

Output ONLY valid JSON.
Do not use markdown fences.
Do not add commentary.

Expected format:
{_REVIEW_OUTPUT_SCHEMA}
""".strip()


# =========================
# LLM reviewer invocation
# =========================
async def _invoke_reviewer_llm(
    llm: Any,
    messages: List[Any],
    lesson_title: str,
    job_id: str,
) -> Any:
    """
    Invoke reviewer LLM with bounded transient retry.

    This retry handles temporary provider/network failures.
    It does NOT represent lesson regeneration.
    """

    last_exception: Optional[Exception] = None

    for attempt in range(_REVIEW_LLM_RETRIES + 1):
        try:
            if hasattr(llm, "ainvoke"):
                return await llm.ainvoke(messages)

            loop = asyncio.get_running_loop()

            return await loop.run_in_executor(
                None,
                lambda: llm.invoke(messages),
            )

        except Exception as exc:
            last_exception = exc

            if attempt >= _REVIEW_LLM_RETRIES:
                break

            delay = _REVIEW_RETRY_BASE_DELAY * (2**attempt)

            logger.warning(
                "[Reviewer|%s] LLM invocation failed for '%s' "
                "(attempt %d/%d): %s. Retrying in %.2fs",
                job_id,
                lesson_title,
                attempt + 1,
                _REVIEW_LLM_RETRIES + 1,
                exc,
                delay,
            )

            await asyncio.sleep(delay)

    assert last_exception is not None
    raise last_exception


# =========================
# Single lesson review
# =========================
async def _review_single_lesson(
    lesson: Dict[str, Any],
    blueprint_lesson: Dict[str, Any],
    job_id: str,
) -> Dict[str, Any]:
    """
    Review a single lesson.

    Failure policy:

    - Invalid lesson structure:
        FAIL → regenerate

    - Provider unavailable:
        FAIL → retry regeneration/review path
        Never PASS

    - LLM invocation failure:
        FAIL
        Never PASS

    - JSON extraction failure:
        FAIL
        Never PASS

    - Reviewer schema failure:
        FAIL
        Never PASS

    - Valid reviewer response:
        Respect reviewer PASS/FAIL.
    """

    lesson_title = lesson.get("title", "Untitled")

    # ------------------------------------------------------------------------
    # 1. Local structural validation
    # ------------------------------------------------------------------------

    is_valid, validation_issues = _validate_lesson_before_review(lesson)

    if not is_valid:
        logger.warning(
            "[Reviewer|%s] Structural validation failed for '%s': %s",
            job_id,
            lesson_title,
            validation_issues,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[
                "Lesson failed structural validation.",
                *validation_issues,
            ],
            suggestions=[
                "Regenerate the lesson with valid overview, sections, "
                "section bodies, and required fields."
            ],
        )

    # ------------------------------------------------------------------------
    # 2. Build reviewer prompt
    # ------------------------------------------------------------------------

    review_prompt = _build_review_prompt(
        lesson=lesson,
        blueprint_lesson=blueprint_lesson,
    )

    system_msg = (
        "You are a rigorous pedagogical quality reviewer for an AI learning "
        "platform. Evaluate lessons objectively and conservatively. "
        "Return ONLY valid JSON matching the requested schema. "
        "Never invent missing lesson content. "
        "If evidence is insufficient to confirm quality, identify the "
        "specific uncertainty rather than assuming the lesson passed."
    )

    messages = [
        SystemMessage(content=system_msg),
        HumanMessage(content=review_prompt),
    ]

    # ------------------------------------------------------------------------
    # 3. Acquire reviewer LLM
    # ------------------------------------------------------------------------

    try:
        llm = await get_llm_for_course_task(TaskType.COURSE_REVIEWER)

    except AllProvidersFailedError as exc:
        logger.error(
            "[Reviewer|%s] All LLM providers failed for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        # IMPORTANT:
        # Provider failure is NOT a PASS.
        #
        # We return FAIL so the graph does not falsely claim that this
        # lesson has been pedagogically reviewed.
        return _review_result(
            lesson_title,
            review_status="unavailable",
            issues=[
                "Pedagogical reviewer unavailable: all configured "
                "LLM providers failed."
            ],
            suggestions=["Retry the reviewer using an available LLM provider."],
        )

    except Exception as exc:
        logger.exception(
            "[Reviewer|%s] Failed to initialize reviewer LLM " "for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Pedagogical reviewer initialization failed: {exc}"],
            suggestions=["Retry reviewer with a healthy LLM provider."],
        )

    # ------------------------------------------------------------------------
    # 4. Invoke reviewer LLM
    # ------------------------------------------------------------------------

    try:
        response = await _invoke_reviewer_llm(
            llm=llm,
            messages=messages,
            lesson_title=lesson_title,
            job_id=job_id,
        )

    except Exception as exc:
        logger.error(
            "[Reviewer|%s] Review invocation failed for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Pedagogical review invocation failed: {exc}"],
            suggestions=["Retry review using a healthy LLM provider."],
        )

    # ------------------------------------------------------------------------
    # 5. Extract model response
    # ------------------------------------------------------------------------

    try:
        response_text = extract_model_response(response).strip()

    except Exception as exc:
        logger.error(
            "[Reviewer|%s] Failed to extract model response " "for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Unable to extract reviewer response: {exc}"],
            suggestions=["Retry lesson review."],
        )

    if not response_text:
        logger.warning(
            "[Reviewer|%s] Empty reviewer response for '%s'",
            job_id,
            lesson_title,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=["Reviewer returned an empty response."],
            suggestions=["Retry lesson review."],
        )

    # ------------------------------------------------------------------------
    # 6. Extract JSON
    # ------------------------------------------------------------------------

    try:
        success, json_str = extract_json(response_text)

    except Exception as exc:
        logger.error(
            "[Reviewer|%s] JSON extraction crashed for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Reviewer JSON extraction failed: {exc}"],
            suggestions=["Retry lesson review with strict JSON output."],
        )

    if not success:
        logger.warning(
            "[Reviewer|%s] Invalid JSON response for '%s': %s",
            job_id,
            lesson_title,
            response_text[:500],
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=["Reviewer returned invalid JSON."],
            suggestions=["Retry reviewer with strict JSON-only output."],
        )

    # ------------------------------------------------------------------------
    # 7. Parse JSON
    # ------------------------------------------------------------------------

    try:
        raw = json.loads(json_str)

    except json.JSONDecodeError as exc:
        logger.warning(
            "[Reviewer|%s] JSON parsing failed for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Reviewer JSON parsing failed: {exc}"],
            suggestions=["Retry lesson review."],
        )

    if not isinstance(raw, dict):
        logger.warning(
            "[Reviewer|%s] Reviewer returned non-object JSON " "for '%s': %s",
            job_id,
            lesson_title,
            type(raw).__name__,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=["Reviewer response must be a JSON object."],
            suggestions=["Retry reviewer with the required JSON schema."],
        )

    # ------------------------------------------------------------------------
    # 8. Validate reviewer response
    # ------------------------------------------------------------------------

    try:
        review = LessonReviewSchema(**raw)

    except ValidationError as exc:
        validation_issues = _format_validation_errors(exc)

        logger.warning(
            "[Reviewer|%s] Reviewer schema validation failed " "for '%s': %s",
            job_id,
            lesson_title,
            validation_issues,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[
                "Reviewer output failed schema validation.",
                *validation_issues,
            ],
            suggestions=["Retry reviewer and return the exact required JSON schema."],
        )

    except Exception as exc:
        logger.exception(
            "[Reviewer|%s] Unexpected reviewer schema error " "for '%s': %s",
            job_id,
            lesson_title,
            exc,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=[f"Unexpected reviewer validation error: {exc}"],
            suggestions=["Retry lesson review."],
        )

    # ------------------------------------------------------------------------
    # 9. Normalize title
    # ------------------------------------------------------------------------

    # Do not allow the LLM to accidentally associate a review with another
    # lesson title.
    if review.lesson_title.strip() != lesson_title.strip():
        logger.warning(
            "[Reviewer|%s] Reviewer title mismatch: expected='%s', got='%s'",
            job_id,
            lesson_title,
            review.lesson_title,
        )

        return _review_result(
            lesson_title,
            review_status="failed",
            issues=["Reviewer returned a mismatched lesson title."],
            suggestions=["Retry reviewer and preserve the exact lesson title."],
        )

    # ------------------------------------------------------------------------
    # 10. Return validated reviewer result
    # ------------------------------------------------------------------------

    result = review.model_dump()

    if review.review_status == "passed":
        logger.info(
            "[Reviewer|%s] ✓ PASSED lesson='%s' issues=%d",
            job_id,
            lesson_title,
            len(review.issues),
        )
    else:
        logger.info(
            "[Reviewer|%s] ✗ REJECTED lesson='%s' issues=%d",
            job_id,
            lesson_title,
            len(review.issues),
        )

    return result


# =========================
# Blueprint index
# =========================
def _build_lesson_blueprint_index(
    blueprint: Any,
) -> Dict[str, Dict[str, Any]]:
    """
    Index lesson blueprints by title for O(1) lookup.
    """
    if not isinstance(blueprint, dict):
        if isinstance(blueprint, list) and len(blueprint) > 0 and isinstance(blueprint[0], dict):
            blueprint = blueprint[0] if "chapters" in blueprint[0] else {"chapters": blueprint}
        else:
            return {}

    index: Dict[str, Dict[str, Any]] = {}
    chapters = blueprint.get("chapters") or []

    for chapter in chapters:
        for module in chapter.get("modules", []):
            for lesson in module.get("lessons", []):
                title = lesson.get("title", "")

                if title:
                    index[title] = lesson

    return index


# =========================
# Main LangGraph node
# =========================
async def pedagogical_reviewer_node(
    state: CourseAgentState,
) -> Dict[str, Any]:
    """
    LangGraph Node: Review generated lessons.

    Behavior:

    retry_count < MAX:
        Any failed review → increment retry_count and route back
        to lesson_generator.

    retry_count >= MAX:
        Do NOT force failed/unreviewed lessons to PASS.
        Proceed to quality_gate with explicit reviewer results.

    This prevents:
        provider outage → PASS
        malformed response → PASS
        invalid lesson → PASS

    Returns:
        reviewer_results
        retry_count when retrying
        pipeline_status
        warnings
    """

    content_id = state.get("content_id")
    generated_lessons = state.get("generated_lessons", []) or []
    blueprint = state.get("course_blueprint", {}) or {}
    retry_count = state.get("retry_count", 0)
    job_id = state.get("job_id", "unknown")

    existing_warnings = list(state.get("warnings", []) or [])

    # ------------------------------------------------------------------------
    # Filter only genuinely reviewable lessons.
    #
    # Failed-generation placeholders are not sent to the LLM.
    # ------------------------------------------------------------------------

    reviewable_lessons: List[Dict[str, Any]] = []

    for result in generated_lessons:
        if not result or result.get("generation_status") != "generated":
            continue
        
        lesson = result.get("lesson")
        if not lesson:
            continue

        reviewable_lessons.append(lesson)

    total_generated = len(generated_lessons)
    total_reviewable = len(reviewable_lessons)

    if not reviewable_lessons:
        logger.error(
            "[Reviewer|%s] No reviewable lessons found " "(generated=%d)",
            job_id,
            total_generated,
        )

        return {
            "reviewer_results": {},
            "pipeline_status": "error",
            "warnings": existing_warnings
            + ["Reviewer: No valid lessons available for pedagogical review."],
        }

    logger.info(
        "[Reviewer|%s] Reviewing %d/%d lessons (retry=%d/%d)",
        job_id,
        total_reviewable,
        total_generated,
        retry_count,
        _MAX_RETRY_COUNT,
    )

    await _send_status_webhook(
        content_id=content_id,
        status="reviewing_content",
        label=(f"🧐 Reviewing {total_reviewable} lessons for quality..."),
    )

    blueprint_index = _build_lesson_blueprint_index(blueprint)

    current_results: Dict[str, Dict[str, Any]] = {}
    warnings = existing_warnings.copy()

    # ------------------------------------------------------------------------
    # Review in bounded parallel batches.
    # ------------------------------------------------------------------------

    for batch_start in range(
        0,
        len(reviewable_lessons),
        _REVIEW_BATCH_SIZE,
    ):
        batch = reviewable_lessons[batch_start : batch_start + _REVIEW_BATCH_SIZE]

        coroutines = []

        for lesson in batch:
            lesson_title = lesson.get("title", "")

            blueprint_lesson = blueprint_index.get(
                lesson_title,
                {},
            )

            coroutines.append(
                _review_single_lesson(
                    lesson=lesson,
                    blueprint_lesson=blueprint_lesson,
                    job_id=job_id,
                )
            )

        # return_exceptions=True prevents one unexpected coroutine failure
        # from destroying all results in the batch.
        results = await asyncio.gather(
            *coroutines,
            return_exceptions=True,
        )

        for lesson, result in zip(batch, results):
            lesson_title = lesson.get("title", "unknown")

            if isinstance(result, Exception):
                logger.exception(
                    "[Reviewer|%s] Unexpected reviewer task failure " "for '%s': %s",
                    job_id,
                    lesson_title,
                    result,
                )

                result_dict = _review_result(
                    lesson_title,
                    review_status="failed",
                    issues=[f"Unexpected reviewer task failure: {result}"],
                    suggestions=["Retry lesson review."],
                )

            else:
                result_dict = result

            current_results[lesson_title] = result_dict

        batch_number = (batch_start // _REVIEW_BATCH_SIZE) + 1

        total_batches = (
            len(reviewable_lessons) + _REVIEW_BATCH_SIZE - 1
        ) // _REVIEW_BATCH_SIZE

        await _send_status_webhook(
            content_id=content_id,
            status="reviewing_content",
            label=(
                f"🧐 Reviewing lessons... "
                f"({batch_number}/{total_batches} batches done)"
            ),
        )

    # ------------------------------------------------------------------------
    # Determine failures.
    # ------------------------------------------------------------------------

    failed_titles = [
        title
        for title, result in current_results.items()
        if result.get("review_status") != "passed"
    ]

    passed_count = len(current_results) - len(failed_titles)
    failed_count = len(failed_titles)

    # ------------------------------------------------------------------------
    # Case 1: failures exist AND retry budget remains.
    # ------------------------------------------------------------------------

    if failed_titles and retry_count < _MAX_RETRY_COUNT:
        next_retry = retry_count + 1

        logger.warning(
            "[Reviewer|%s] ✗ %d/%d lessons failed review. "
            "Routing failed lessons back to generator "
            "(retry %d/%d). Failed: %s",
            job_id,
            failed_count,
            len(current_results),
            next_retry,
            _MAX_RETRY_COUNT,
            failed_titles,
        )

        warnings.append(
            f"Reviewer: {failed_count} lesson(s) require regeneration "
            f"(retry {next_retry}/{_MAX_RETRY_COUNT})."
        )
        
        from utils.webhook_helpers import _send_checkpoint_webhook
        await _send_checkpoint_webhook(job_id, stage=f"reviewer_retry_{retry_count}", node="pedagogical_reviewer", status="failed")

        return {
            "reviewer_results": current_results,
            "retry_count": next_retry,
            "pipeline_status": "reviewing_content",
            "warnings": warnings,
        }

    # ------------------------------------------------------------------------
    # Case 2: failures exist but retry budget exhausted.
    #
    # IMPORTANT:
    # We do NOT convert them into PASS.
    #
    # Graph will proceed to quality_gate because retry_count has reached
    # the configured limit.
    # ------------------------------------------------------------------------

    if failed_titles:
        logger.error(
            "[Reviewer|%s] Retry budget exhausted. "
            "Passing current review results to quality gate WITHOUT "
            "forcing failed lessons to PASS. Failed=%s",
            job_id,
            failed_titles,
        )

        warnings.append(
            f"Reviewer: retry limit reached. "
            f"{failed_count} lesson(s) remain unreviewed/rejected."
        )

        from utils.webhook_helpers import _send_checkpoint_webhook
        await _send_checkpoint_webhook(job_id, stage=f"reviewer_retry_{retry_count}", node="pedagogical_reviewer", status="completed")

        return {
            "reviewer_results": current_results,
            "retry_count": retry_count,
            "pipeline_status": "quality_gate",
            "warnings": warnings,
        }

    # ------------------------------------------------------------------------
    # Case 3: all lessons passed.
    # ------------------------------------------------------------------------

    logger.info(
        "[Reviewer|%s] ✓ All %d reviewable lessons passed. "
        "Proceeding to quality gate.",
        job_id,
        passed_count,
    )

    from utils.webhook_helpers import _send_checkpoint_webhook
    await _send_checkpoint_webhook(job_id, stage=f"reviewer_retry_{retry_count}", node="pedagogical_reviewer", status="completed")

    return {
        "reviewer_results": current_results,
        "retry_count": retry_count,
        "pipeline_status": "quality_gate",
        "warnings": warnings,
    }
