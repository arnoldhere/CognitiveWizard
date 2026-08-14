"""
agents/nodes/learning_architect_node.py
========================================
Learning Architect Node — Stage 1 of the course generation pipeline.

Responsibilities:
 - Generate a STRUCTURAL course blueprint ONLY (no lesson prose)
 - Output: phases, modules, lesson titles + objectives + estimated times
 - Uses Pydantic structured output for reliable JSON extraction
 - Notifies JS server with granular status: 'generating_blueprint'

Design decisions:
 - Blueprint-first: cheap and fast structural pass before expensive content generation
 - Feedback-aware: if `state.feedback` is set, modifies the existing blueprint
 - Validates output against CourseBlueprintSchema — falls back to raw JSON on parse error
"""

from __future__ import annotations
import logging
import json
from typing import Dict, Any

import httpx
from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from providers.llm.provider_errors import AllProvidersFailedError
from agents.states.course_agent_state import CourseAgentState
from schemas.course_generation import CourseBlueprintSchema
from utils.builders.wizard_prompt import build_learning_architect_prompt
from utils.json_extractor import extract_json, extract_model_response
from config.settings import settings

logger = logging.getLogger(__name__)


async def _send_status_webhook(content_id: int | None, job_id: str | None, status: str, label: str, state_cache: dict = None) -> None:
    """Fire-and-forget status webhook to JS server for real-time UX updates."""
    if not content_id:
        return
    try:
        payload = {"content_id": content_id, "status": status, "label": label}
        if job_id:
            payload["job_id"] = job_id
        if state_cache:
            payload["state_cache"] = state_cache

        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                f"{settings.JS_SERVER_URL}/internal/wizard-webhook/status",
                json=payload,
            )
    except Exception as exc:
        logger.warning("Status webhook failed (non-critical): %s", exc)


async def learning_architect_node(state: CourseAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Generate the course structure blueprint.

    Returns only the fields it updates (LangGraph merges them into state):
      - course_blueprint: CourseBlueprintSchema dict
      - pipeline_status: 'generating_blueprint'
      - warnings: any non-fatal issues
    """
    content_id = state.get("content_id")
    job_id = state.get("job_id", "unknown")
    logger.info("[Architect|%s] Building blueprint for topic=%s", job_id, state.get("topic"))

    if state.get("pipeline_status") == "resuming" and state.get("course_blueprint"):
        logger.info("[Architect|%s] Found existing blueprint during resume. Skipping generation.", job_id)
        # Just notify the webhook so UI knows we are running
        await _send_status_webhook(
            content_id,
            job_id,
            status="generating_blueprint",
            label="🏗️ Resuming course generation...",
        )
        return {
            "pipeline_status": "generating_evidence",
        }

    await _send_status_webhook(
        content_id,
        job_id,
        status="generating_blueprint",
        label="🏗️ Designing your course structure...",
    )

    feedback = state.get("feedback")
    existing_blueprint = state.get("course_blueprint")

    # Build prompt — feedback-aware for regeneration flows
    prompt_text = build_learning_architect_prompt(
        topic=state["topic"],
        content_type=state["content_type"],
        details=state.get("details", ""),
        skill_level=state.get("skill_level", ""),
        goal=state.get("goal", ""),
        learning_style=state.get("learning_style", ""),
        user_role=state.get("user_role", "user"),
        feedback=feedback,
        existing_blueprint=existing_blueprint,
    )

    system_msg = (
        "You are an expert curriculum architect. "
        "Generate ONLY a valid JSON course blueprint — structure and objectives only. "
        "Do NOT write lesson content or explanations. "
        "Adhere strictly to the JSON schema provided. Output no markdown, no prose."
    )

    llm = None
    try:
        llm = await get_llm_for_course_task(TaskType.COURSE_ARCHITECT)
    except AllProvidersFailedError as exc:
        logger.error("[Architect|%s] All LLM providers failed: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Architect: all providers failed — {exc}"],
            "pipeline_status": "error",
            "course_blueprint": {},
        }

    messages = [SystemMessage(content=system_msg), HumanMessage(content=prompt_text)]

    try:
        # Prefer native async invoke
        if hasattr(llm, "ainvoke"):
            response = await llm.ainvoke(messages)
        else:
            import asyncio

            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: llm.invoke(messages)
            )

        response_text = extract_model_response(response).strip()
        success, json_str = extract_json(response_text)

        if not success:
            logger.error("[Architect|%s] Failed to extract JSON from LLM response", job_id)
            return {
                "warnings": state.get("warnings", [])
                + ["Architect node: failed to extract blueprint JSON."],
                "pipeline_status": "error",
            }

        raw_data = json.loads(json_str)

        # Validate against Pydantic schema — catch malformed output early
        try:
            blueprint = CourseBlueprintSchema(**raw_data)
            validated_data = blueprint.model_dump()
            logger.info(
                "[Architect|%s] Blueprint validated: %d phases, topic=%s",
                job_id,
                len(blueprint.phases),
                state["topic"],
            )
        except Exception as validation_err:
            logger.warning(
                "[Architect|%s] Blueprint validation failed (using raw): %s",
                job_id,
                validation_err,
            )
            # Use raw data but warn — downstream nodes are more resilient
            validated_data = raw_data

        # Cache state into MySQL for crash resilience
        state_cache = {
            "course_blueprint": validated_data,
            "generated_lessons": []
        }
        await _send_status_webhook(content_id, job_id, "blueprint_ready", "✅ Blueprint ready", state_cache)

        return {
            "course_blueprint": validated_data,
            "pipeline_status": "generating_evidence",
        }

    except Exception as exc:
        logger.exception("[Architect|%s] Unexpected error during LLM invocation: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Architect node error: {exc}"],
            "pipeline_status": "error",
            "course_blueprint": {},
        }

