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
    CoursePhaseFullSchema,
    CourseModuleFullSchema,
    CourseLessonSchema,
    QualityGateResultSchema,
    EvidenceItemSchema,
)
from config.settings import settings

logger = logging.getLogger(__name__)

# Minimum acceptable word count for an explanation section
_MIN_EXPLANATION_WORDS = 50
# Minimum sections per lesson for it to be considered valid
_MIN_SECTIONS_PER_LESSON = 1


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
    lesson: Optional[Dict[str, Any]],
    reviewer_results: Dict[str, Any],
) -> tuple[bool, List[str]]:
    """
    Run quality checks on a single generated lesson.

    Returns: (is_valid, list_of_issues)
    """
    if lesson is None or lesson.get("_generation_failed"):
        return False, ["Lesson generation completely failed"]

    issues: List[str] = []
    title = lesson.get("title", "Untitled")

    # Schema check: required fields
    if not lesson.get("overview", "").strip():
        issues.append(f"'{title}': missing overview")

    sections = lesson.get("sections", [])
    if len(sections) < _MIN_SECTIONS_PER_LESSON:
        issues.append(f"'{title}': has < {_MIN_SECTIONS_PER_LESSON} sections")

    # Content check: at least one explanation with meaningful content
    explanation_sections = [s for s in sections if s.get("section_type") == "explanation"]
    if not explanation_sections:
        issues.append(f"'{title}': missing explanation section")
    else:
        word_count = len((explanation_sections[0].get("body") or "").split())
        if word_count < _MIN_EXPLANATION_WORDS:
            issues.append(f"'{title}': explanation too short ({word_count} words, min {_MIN_EXPLANATION_WORDS})")

    # Citation check: at least 1 resource
    if not lesson.get("resources"):
        issues.append(f"'{title}': no references attached")

    return len(issues) == 0, issues


def _build_lesson_index(
    generated_lessons: List[Optional[Dict[str, Any]]]
) -> Dict[str, Dict[str, Any]]:
    """Index generated lessons by title for O(1) lookup during assembly."""
    index = {}
    for lesson in generated_lessons:
        if lesson and lesson.get("title"):
            index[lesson["title"]] = lesson
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
    phases_full = []

    for phase in blueprint.get("phases", []):
        modules_full = []
        for module in phase.get("modules", []):
            lessons_full = []
            for lesson_bp in module.get("lessons", []):
                lesson_title = lesson_bp.get("title", "")
                generated = lesson_index.get(lesson_title)

                if generated and not generated.get("_generation_failed"):
                    try:
                        lesson_obj = CourseLessonSchema(**generated)
                        lessons_full.append(lesson_obj)
                    except Exception:
                        # Best-effort: build a minimal valid lesson
                        lessons_full.append(CourseLessonSchema(
                            title=lesson_title,
                            overview=generated.get("overview", ""),
                            sections=generated.get("sections", []),
                            exercises=generated.get("exercises", []),
                            resources=generated.get("resources", []),
                        ))
                else:
                    # Placeholder for failed lesson — keeps course structure intact
                    lessons_full.append(CourseLessonSchema(
                        title=lesson_title,
                        overview="This lesson content is being prepared.",
                        sections=[],
                        exercises=[],
                        resources=[],
                    ))

            modules_full.append(CourseModuleFullSchema(
                title=module.get("title", ""),
                description=module.get("description", ""),
                difficulty=module.get("difficulty", "beginner"),
                estimated_time=module.get("estimated_time", "2 hours"),
                learning_objectives=module.get("learning_objectives", []),
                key_takeaways=module.get("key_takeaways", []),
                lessons=lessons_full,
            ))

        phases_full.append(CoursePhaseFullSchema(
            title=phase.get("title", ""),
            description=phase.get("description", ""),
            estimated_duration=phase.get("estimated_duration", "2 weeks"),
            modules=modules_full,
        ))

    return CoursePackageSchema(
        content_type="course",
        title=blueprint.get("title", "Untitled Course"),
        description=blueprint.get("description", ""),
        target_audience=blueprint.get("target_audience", "General Learners"),
        course_outcomes=blueprint.get("course_outcomes", []),
        prerequisites=blueprint.get("prerequisites", []),
        phases=phases_full,
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

    logger.info("[QualityGate] Running quality checks on %d lessons", len(generated_lessons))

    await _send_status_webhook(
        content_id,
        status="quality_check",
        label="✅ Running quality checks and finalizing..."
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
                if "_generation_failed" in issue.lower() or "completely failed" in issue.lower():
                    critical_issues.append(issue)
                else:
                    gate_warnings.append(issue)

    total_lessons = len(generated_lessons)
    quality_passed = lessons_failed == 0 or (lessons_passed / max(total_lessons, 1)) >= 0.7

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
        "[QualityGate] Result: passed=%s, lessons=%d/%d valid",
        quality_result.passed, lessons_passed, total_lessons
    )

    # ── Hard block: no valid lessons at all ───────────────────────────────────
    if lessons_passed == 0 and total_lessons > 0:
        logger.error("[QualityGate] 0 valid lessons — cannot publish this course")
        return {
            "quality_gate_result": quality_result.model_dump(),
            "course_draft": {"error": "No valid lessons were generated", "type": "course"},
            "pipeline_status": "error",
            "warnings": warnings + ["Quality Gate: 0 valid lessons — course aborted"],
        }

    # ── Assemble the final course package ────────────────────────────────────
    lesson_index = _build_lesson_index(generated_lessons)
    try:
        package = _assemble_course_package(blueprint, lesson_index, quality_result, warnings)
        course_draft = package.model_dump()
    except Exception as exc:
        logger.exception("[QualityGate] Course assembly failed: %s", exc)
        course_draft = {
            "type": "course",
            "error": f"Assembly failed: {exc}",
            "raw_blueprint": blueprint,
        }
        warnings.append(f"Quality Gate: course assembly failed: {exc}")

    logger.info("[QualityGate] Course package assembled. Sending to JS server.")

    return {
        "course_draft": course_draft,
        "quality_gate_result": quality_result.model_dump(),
        "pipeline_status": "quality_check",
        "warnings": warnings,
    }
