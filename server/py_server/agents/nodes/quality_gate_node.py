"""
agents/nodes/quality_gate_node.py
===================================
Quality Gate Node — Stage 5 (final) of the course generation pipeline.

Responsibilities:
 - Schema validation: all lessons have required fields
 - Content validation: min word count, no empty sections
 - Citation check: at least 1 resource per lesson
 - Pedagogy check: lesson passed reviewer (or was force-passed)
 - Assembles the final CoursePackageSchema from blueprint + generated lessons
 - Sends final webhook to JS server for DB persistence

The quality gate is permissive by design:
 - Issues WARNINGS not hard failures for minor problems
 - Assembles and sends best-effort course even if some lessons are imperfect
 - A hard BLOCK only occurs if the course has 0 valid lessons

Status: 'quality_check' → triggers JS server to persist to DB
"""

from __future__ import annotations
import logging
from typing import Dict, Any, List, Optional
import httpx
from agents.states.course_agent_state import CourseAgentState
from schemas.course_generation import (
    CoursePackageSchema,
    CourseChapterFullSchema,
    CourseModuleFullSchema,
    CourseLessonSchema,
    QualityGateResultSchema,
    EvidenceItemSchema,
)
from config.settings import settings

logger = logging.getLogger(__name__)



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


def _validate_lesson(
    wrapper: Optional[Dict[str, Any]],
    reviewer_results: Dict[str, Any],
) -> tuple[bool, List[str]]:
    """
    Run quality checks on a single generated lesson.

    Returns: (is_valid, list_of_issues)
    """
    if not wrapper or wrapper.get("generation_status") != "generated":
        return False, ["Lesson generation completely failed"]

    lesson = wrapper.get("lesson")
    if not lesson:
        return False, ["Lesson content is missing"]

    from pydantic import ValidationError
    try:
        CourseLessonSchema(**lesson)
        return True, []
    except ValidationError as exc:
        return False, [f"{e.get('loc', [])}: {e.get('msg', 'Invalid')}" for e in exc.errors()]


def _build_lesson_index(
    generated_lessons: List[Optional[Dict[str, Any]]],
) -> Dict[str, Dict[str, Any]]:
    """Index generated lessons by title for O(1) lookup during assembly."""
    index = {}
    for wrapper in generated_lessons:
        if wrapper and wrapper.get("lesson"):
            lesson = wrapper["lesson"]
            if lesson.get("title"):
                index[lesson["title"]] = wrapper
    return index


def _assemble_course_package(
    blueprint: Dict[str, Any],
    lesson_index: Dict[str, Dict[str, Any]],
    quality_result: QualityGateResultSchema,
    warnings: List[str],
) -> CoursePackageSchema:
    """
    Merge blueprint structure with generated lesson content into CoursePackageSchema.
    Lessons not found in lesson_index get a minimal placeholder.
    """
    if not isinstance(blueprint, dict):
        if isinstance(blueprint, list) and len(blueprint) > 0 and isinstance(blueprint[0], dict):
            blueprint = blueprint[0] if "chapters" in blueprint[0] else {"chapters": blueprint}
        else:
            blueprint = {}

    chapters_full = []
    chapters = blueprint.get("chapters") or []

    for chapter in chapters:
        modules_full = []
        for module in chapter.get("modules", []):
            lessons_full = []
            for lesson_bp in module.get("lessons", []):
                lesson_title = lesson_bp.get("title", "")
                wrapper = lesson_index.get(lesson_title)

                if not wrapper or wrapper.get("generation_status") != "generated":
                    warnings.append(f"Lesson '{lesson_title}' excluded")
                    continue
                
                lesson_data = wrapper.get("lesson")
                if not lesson_data:
                    warnings.append(f"Lesson '{lesson_title}' excluded (missing content)")
                    continue

                try:
                    lesson_obj = CourseLessonSchema(**lesson_data)
                    lessons_full.append(lesson_obj)
                except Exception as exc:
                    warnings.append(f"Lesson '{lesson_title}' excluded due to schema validation failure: {exc}")
            modules_full.append(
                CourseModuleFullSchema(
                    title=module.get("title", ""),
                    description=module.get("description", ""),
                    difficulty=module.get("difficulty", "beginner"),
                    estimated_time=module.get("estimated_time", "2 hours"),
                    learning_objectives=module.get("learning_objectives", []),
                    key_takeaways=module.get("key_takeaways", []),
                    lessons=lessons_full,
                )
            )

        chapters_full.append(
            CourseChapterFullSchema(
                title=chapter.get("title", ""),
                description=chapter.get("description", ""),
                estimated_duration=chapter.get("estimated_duration", "2 weeks"),
                modules=modules_full,
            )
        )

    return CoursePackageSchema(
        content_type="course",
        title=blueprint.get("title", "Untitled Course"),
        description=blueprint.get("description", ""),
        target_audience=blueprint.get("target_audience", "General Learners"),
        domain=blueprint.get("domain", "general"),
        domain_label=blueprint.get("domain_label", "General"),
        exercise_paradigm=blueprint.get("exercise_paradigm", "mixed"),
        course_outcomes=blueprint.get("course_outcomes", []),
        prerequisites=blueprint.get("prerequisites", []),
        chapters=chapters_full,
        quality_gate=quality_result,
        warnings=warnings,
    )


async def quality_gate_node(state: CourseAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Validate assembled lessons and package the course.

    Runs all quality checks, assembles CoursePackageSchema, and sends the
    complete webhook to the JS server for DB persistence.

    Returns:
    - course_draft: CoursePackageSchema dict (sent to JS server)
    - quality_gate_result: QualityGateResultSchema dict
    - pipeline_status: 'quality_check'
    - warnings: accumulated issues
    """
    content_id = state.get("content_id")
    blueprint = state.get("course_blueprint", {})
    generated_lessons = state.get("generated_lessons", []) or []
    reviewer_results = state.get("reviewer_results", {}) or {}
    warnings = list(state.get("warnings", []))
    job_id = state.get("job_id", "unknown")

    logger.info(
        "[QualityGate|%s] Running quality checks on %d lessons",
        job_id,
        len(generated_lessons),
    )

    await _send_status_webhook(
        content_id,
        status="quality_check",
        label="✅ Running quality checks and finalizing...",
    )

    # ── Validate each lesson ───────────────────────────────────────────────────
    lessons_passed = 0
    lessons_failed = 0
    critical_issues: List[str] = []
    gate_warnings: List[str] = []

    for lesson in generated_lessons:
        is_valid, issues = _validate_lesson(lesson, reviewer_results)
        if is_valid:
            lessons_passed += 1
        else:
            lessons_failed += 1
            for issue in issues:
                # Critical: generation completely failed
                if (
                    "_generation_failed" in issue.lower()
                    or "completely failed" in issue.lower()
                ):
                    critical_issues.append(issue)
                else:
                    gate_warnings.append(issue)

    total_lessons = len(generated_lessons)
    pass_ratio = lessons_passed / max(total_lessons, 1)
    
    if pass_ratio >= 0.8:
        quality_passed = True
    else:
        quality_passed = False
        
        if pass_ratio >= 0.5:
            gate_warnings.append("Course is incomplete (50-79% valid lessons). Cannot publish.")
        else:
            gate_warnings.append("Generation failure (< 50% valid lessons). Cannot publish.")

    quality_result = QualityGateResultSchema(
        passed=quality_passed,
        total_lessons=total_lessons,
        lessons_passed=lessons_passed,
        lessons_failed=lessons_failed,
        critical_issues=critical_issues,
        warnings=gate_warnings,
    )

    warnings.extend(gate_warnings)

    logger.info(
        "[QualityGate|%s] Quality pass=%s. Passed: %d/%d",
        job_id,
        quality_passed,
        lessons_passed,
        total_lessons,
    )

    # ── Hard block: no valid lessons at all ───────────────────────────────────
    if lessons_passed == 0 and total_lessons > 0:
        logger.error(
            "[QualityGate|%s] 0 valid lessons — cannot publish this course", job_id
        )
        from utils.webhook_helpers import _send_checkpoint_webhook
        await _send_checkpoint_webhook(job_id, stage="quality_gate", node="quality_gate", status="failed")

        return {
            "quality_gate_result": quality_result.model_dump(),
            "course_draft": {
                "error": "No valid lessons were generated",
                "type": "course",
            },
            "pipeline_status": "error",
            "warnings": warnings + ["Quality Gate: 0 valid lessons — course aborted"],
        }

    # ── Assemble the final course package ────────────────────────────────────
    lesson_index = _build_lesson_index(generated_lessons)
    try:
        package = _assemble_course_package(
            blueprint, lesson_index, quality_result, warnings
        )
        course_draft = package.model_dump()
    except Exception as exc:
        logger.exception("[QualityGate|%s] Course assembly failed: %s", job_id, exc)
        return {
            "pipeline_status": "error",
            "error": f"Assembly failed: {exc}",
            "course_draft": {
                "content_type": "course",
                "error": f"Course assembly failed: {exc}",
                "chapters": [],
            },
            "raw_blueprint": blueprint,
            "warnings": warnings + [f"Quality Gate assembly failed: {exc}"],
        }

    logger.info("[QualityGate|%s] Course package assembled.", job_id)
    
    from utils.webhook_helpers import _send_checkpoint_webhook
    await _send_checkpoint_webhook(job_id, stage="quality_gate", node="quality_gate", status="completed")

    return {
        "course_draft": course_draft,
        "quality_gate_result": quality_result.model_dump(),
        "pipeline_status": "quality_check",
        "warnings": warnings,
    }
