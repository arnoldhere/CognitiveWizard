"""
agents/nodes/guide/guide_planner_node.py
========================================
Guide Planner Node — Stage 1 of the Guide Generation pipeline.

Generates the structured blueprint for the practical guide:
- Module breakdown
- Tools required
- Reading/practice time estimation
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
from schemas.guide_schema import GuidePlanSchema
from utils.builders.guide_prompt import build_guide_planner_prompt
from utils.json_extractor import extract_json, extract_model_response
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def guide_planner_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Design the guide curriculum structure."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Practical Guide").strip()

    logger.info("[GuidePlanner|%s] Generating blueprint for topic='%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="guide_planner",
        status="planning",
    )

    prompt_text = build_guide_planner_prompt(
        topic=topic,
        details=state.get("details", ""),
        skill_level=state.get("skill_level", "beginner"),
        target_audience=state.get("target_audience", "General Learners"),
        guide_style=state.get("guide_style", "Step-by-step tutorial"),
    )

    system_msg = (
        "You are an expert technical author and curriculum designer. "
        "Generate ONLY a valid JSON guide outline adhering to the schema. "
        "Output no markdown fences and no conversational prose."
    )

    try:
        llm = await get_llm_for_course_task(TaskType.GUIDE_PLANNER)
    except AllProvidersFailedError as exc:
        logger.error("[GuidePlanner|%s] All LLM providers failed: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Guide planner: all providers failed — {exc}"],
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
            logger.error("[GuidePlanner|%s] Failed to extract JSON from model output", job_id)
            return {
                "warnings": state.get("warnings", []) + ["Guide planner: JSON extraction failed"],
                "pipeline_status": "error",
                "error": "Failed to parse guide plan JSON from model response",
            }

        raw_plan = json.loads(json_str)
        validated = GuidePlanSchema.model_validate(raw_plan)

        return {
            "guide_plan": validated.model_dump(),
            "pipeline_status": "researching",
        }

    except Exception as exc:
        logger.exception("[GuidePlanner|%s] Error during guide planning: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Guide planner error: {exc}"],
            "pipeline_status": "error",
            "error": str(exc),
        }
