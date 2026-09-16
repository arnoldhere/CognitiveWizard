"""
agents/nodes/guide/guide_writer_node.py
======================================
Guide Writer Node — Stage 3 of the Guide Generation pipeline.

Generates complete, in-depth guide content including step-by-step instructions,
practical practitioner tips, and common pitfalls for every module.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from providers.llm.provider_errors import AllProvidersFailedError
from agents.states.guide_agent_state import GuideAgentState
from schemas.guide_schema import GuideSchema
from utils.builders.guide_prompt import build_guide_writer_prompt
from utils.json_extractor import extract_json, extract_model_response
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def guide_writer_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Write the exhaustive step-by-step tutorial content."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Guide").strip()

    logger.info("[GuideWriter|%s] Drafting guide content for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="guide_writer",
        status="writing",
    )

    plan = state.get("guide_plan", {})
    references = state.get("references", {})
    review_result = state.get("review_result", {})
    review_feedback = review_result.get("suggestions") if isinstance(review_result, dict) else None

    prompt_text = build_guide_writer_prompt(
        topic=topic,
        guide_plan=plan,
        references=references,
        review_feedback=review_feedback,
    )

    system_msg = (
        "You are a principal technical author. "
        "Expand each module with rich, actionable step-by-step instructions, code, tips, and common mistakes. "
        "Return ONLY valid JSON matching the guide schema. No markdown fences, no explanatory prose."
    )

    try:
        llm = await get_llm_for_course_task(TaskType.GUIDE_WRITER)
    except AllProvidersFailedError as exc:
        logger.error("[GuideWriter|%s] All LLM providers failed: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Guide writer: all providers failed — {exc}"],
            "pipeline_status": "error",
            "error": str(exc),
        }

    messages = [SystemMessage(content=system_msg), HumanMessage(content=prompt_text)]

    try:
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
            logger.warning("[GuideWriter|%s] Failed to extract JSON from writer output; falling back to plan blueprint", job_id)
            # Fall back to using plan with minimal boilerplate
            raw_guide = dict(plan)
        else:
            raw_guide = json.loads(json_str)

        # Attach references to guide
        raw_guide["references"] = references
        raw_guide["content_type"] = "guide"
        raw_guide["target_audience"] = state.get("target_audience", "General Learners")
        raw_guide["guide_style"] = state.get("guide_style", "Step-by-step tutorial")

        # Increment retry count if we were in a retry
        current_retries = state.get("retry_count", 0)
        new_retries = current_retries + 1 if review_feedback else current_retries

        return {
            "guide_draft": raw_guide,
            "retry_count": new_retries,
            "pipeline_status": "reviewing",
        }

    except Exception as exc:
        logger.exception("[GuideWriter|%s] Error during guide writing: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Guide writer error: {exc}"],
            "pipeline_status": "error",
            "error": str(exc),
        }
