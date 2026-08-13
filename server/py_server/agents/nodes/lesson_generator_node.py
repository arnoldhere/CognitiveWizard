"""
agents/nodes/lesson_generator_node.py
=======================================
Lesson Generator Node — Stage 3 of the course generation pipeline.

Responsibilities:
 - For each lesson blueprint: generate full deep lesson content
   (explanation, examples, analogies, code, common mistakes, practice, summary)
 - Inject curated evidence/resources from Research Agent into each lesson
 - Process in concurrent batches of 3 to manage LLM rate limits
 - Validate each lesson against CourseLessonSchema

Design:
 - Takes lesson blueprint + evidence package → generates CourseLessonSchema
 - Uses structured Pydantic validation post-generation (not blind json.loads)
 - Soft-fails per lesson: a single lesson failure does NOT abort the whole course
 - Status: 'generating_lessons'
"""

from __future__ import annotations
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional

import httpx
from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from agents.states.course_agent_state import CourseAgentState
from schemas.course_generation import CourseLessonSchema, EvidenceItemSchema
from utils.builders.wizard_prompt import build_lesson_content_prompt
from utils.json_extractor import extract_json, extract_model_response
from config.settings import settings

logger = logging.getLogger(__name__)

# Max concurrent lesson generation tasks (balance speed vs rate limits)
_LESSON_BATCH_SIZE = 3


async def _send_status_webhook(content_id: int | None, status: str, label: str) -> None:
    """Fire-and-forget status update."""
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


async def _generate_single_lesson(
    lesson_blueprint: Dict[str, Any],
    module_context: Dict[str, str],
    evidence: List[Dict[str, Any]],
    learner_profile: Dict[str, str],
    reviewer_suggestions: Optional[List[str]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Generate full content for a single lesson.

    Args:
        lesson_blueprint: Lesson title + objectives from architect
        module_context: Parent module title, description, difficulty
        evidence: Resources from Research Agent for this lesson
        learner_profile: skill_level, goal, learning_style
        reviewer_suggestions: If retrying after reviewer rejection, improvement notes

    Returns:
        Validated CourseLessonSchema dict, or None if generation fails
    """
    lesson_title = lesson_blueprint.get("title", "Untitled Lesson")

    prompt_text = build_lesson_content_prompt(
        lesson_title=lesson_title,
        learning_objectives=lesson_blueprint.get("learning_objectives", []),
        module_title=module_context.get("module_title", ""),
        module_description=module_context.get("module_description", ""),
        difficulty=module_context.get("difficulty", "beginner"),
        skill_level=learner_profile.get("skill_level", "beginner"),
        goal=learner_profile.get("goal", ""),
        learning_style=learner_profile.get("learning_style", ""),
        evidence=evidence,
        reviewer_suggestions=reviewer_suggestions,
    )

    system_msg = (
        "You are an expert educational content writer. "
        "Generate a deeply detailed lesson with explanations, real-world examples, "
        "analogies, code snippets, common mistakes, and practical exercises. "
        "Output ONLY valid JSON matching the exact schema. No markdown, no extra text."
    )

    llm = get_llm_for_task(TaskType.WIZARD)
    messages = [SystemMessage(content=system_msg), HumanMessage(content=prompt_text)]

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
            logger.error("[LessonGen] Failed JSON extraction for lesson='%s'", lesson_title)
            return None

        raw_data = json.loads(json_str)

        # Inject research evidence as resources (not from LLM — more reliable)
        if evidence:
            raw_data["resources"] = [
                EvidenceItemSchema(**r).model_dump()
                for r in evidence[:5]  # top 5 by relevance
                if r.get("url")
            ]

        # Validate against Pydantic schema
        try:
            lesson = CourseLessonSchema(**raw_data)
            lesson_dict = lesson.model_dump()
            logger.info("[LessonGen] ✓ Lesson generated + validated: '%s'", lesson_title)
            return lesson_dict
        except Exception as validation_err:
            logger.warning(
                "[LessonGen] Pydantic validation failed for '%s': %s — using raw",
                lesson_title, validation_err
            )
            # Use raw but mark as unvalidated so reviewer can catch issues
            raw_data["_validation_failed"] = True
            return raw_data

    except Exception as exc:
        logger.exception("[LessonGen] Error generating lesson '%s': %s", lesson_title, exc)
        return None


def _collect_all_lessons(blueprint: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Flatten blueprint into a list of lesson tasks with full context.
    Each item carries: lesson_blueprint, module_context, phase info, indices.
    """
    all_lessons = []
    for phase_idx, phase in enumerate(blueprint.get("phases", [])):
        for mod_idx, module in enumerate(phase.get("modules", [])):
            module_context = {
                "module_title": module.get("title", ""),
                "module_description": module.get("description", ""),
                "difficulty": module.get("difficulty", "beginner"),
                "phase_title": phase.get("title", ""),
                "phase_idx": phase_idx,
                "mod_idx": mod_idx,
            }
            for lesson_idx, lesson_bp in enumerate(module.get("lessons", [])):
                all_lessons.append({
                    "blueprint": lesson_bp,
                    "module_context": module_context,
                    "lesson_idx": lesson_idx,
                    "path": (phase_idx, mod_idx, lesson_idx),
                })
    return all_lessons


async def lesson_generator_node(state: CourseAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Generate full content for every lesson.

    Processes lessons in concurrent batches of _LESSON_BATCH_SIZE.
    Each lesson is independently generated and validated.
    Failures are soft — bad lessons produce a None entry (reviewer handles).

    Returns:
      - generated_lessons: flat list of generated lesson dicts
      - pipeline_status: 'generating_lessons'
      - warnings: any per-lesson failures
    """
    content_id = state.get("content_id")
    blueprint = state.get("course_blueprint", {})
    lesson_evidence = state.get("lesson_evidence", {})
    reviewer_results = state.get("reviewer_results", {})  # populated on retry
    retry_count = state.get("retry_count", 0)

    if not blueprint:
        logger.error("[LessonGen] No blueprint — cannot generate lessons")
        return {
            "generated_lessons": [],
            "pipeline_status": "error",
            "warnings": state.get("warnings", []) + ["Lesson generator: no blueprint."],
        }

    all_lesson_tasks = _collect_all_lessons(blueprint)
    total = len(all_lesson_tasks)
    logger.info(
        "[LessonGen] Generating %d lessons (batch=%d, retry=%d)",
        total, _LESSON_BATCH_SIZE, retry_count
    )

    await _send_status_webhook(
        content_id,
        status="generating_lessons",
        label=f"✍️ Writing content for {total} lessons..."
    )

    learner_profile = {
        "skill_level": state.get("skill_level", "beginner"),
        "goal": state.get("goal", ""),
        "learning_style": state.get("learning_style", ""),
    }

    # If this is a retry, preserve lessons that already passed reviewer
    existing_lessons: List[Optional[Dict]] = state.get("generated_lessons") or [None] * total
    generated_lessons: List[Optional[Dict]] = list(existing_lessons)

    # Determine which lessons need (re)generation
    tasks_to_run = []
    for i, task in enumerate(all_lesson_tasks):
        lesson_title = task["blueprint"].get("title", "")
        review = (reviewer_results or {}).get(lesson_title, {})
        already_passed = review.get("passed", False)

        # Skip lessons that already passed the reviewer on a previous attempt
        if retry_count > 0 and already_passed:
            continue

        tasks_to_run.append((i, task, review.get("suggestions", [])))

    warnings = list(state.get("warnings", []))

    # Process in batches
    for batch_start in range(0, len(tasks_to_run), _LESSON_BATCH_SIZE):
        batch = tasks_to_run[batch_start: batch_start + _LESSON_BATCH_SIZE]

        coroutines = [
            _generate_single_lesson(
                lesson_blueprint=task["blueprint"],
                module_context=task["module_context"],
                evidence=lesson_evidence.get(task["blueprint"].get("title", ""), []),
                learner_profile=learner_profile,
                reviewer_suggestions=suggestions if retry_count > 0 else None,
            )
            for _, task, suggestions in batch
        ]

        results = await asyncio.gather(*coroutines, return_exceptions=False)

        for (list_idx, task, _), result in zip(batch, results):
            lesson_title = task["blueprint"].get("title", "?")
            if result is None:
                warnings.append(f"Lesson generation failed: '{lesson_title}'")
                # Keep a minimal placeholder so course structure isn't broken
                generated_lessons[list_idx] = {
                    "title": lesson_title,
                    "overview": "Content could not be generated for this lesson.",
                    "sections": [],
                    "exercises": [],
                    "resources": [],
                    "_generation_failed": True,
                }
            else:
                generated_lessons[list_idx] = result

        batch_num = batch_start // _LESSON_BATCH_SIZE + 1
        total_batches = (len(tasks_to_run) + _LESSON_BATCH_SIZE - 1) // _LESSON_BATCH_SIZE
        await _send_status_webhook(
            content_id,
            status="generating_lessons",
            label=f"✍️ Writing lessons... ({batch_num}/{total_batches} batches done)"
        )

    logger.info(
        "[LessonGen] Done. %d/%d lessons generated successfully.",
        sum(1 for l in generated_lessons if l and not l.get("_generation_failed")),
        total
    )

    return {
        "generated_lessons": generated_lessons,
        "pipeline_status": "generating_lessons",
        "warnings": warnings,
    }
