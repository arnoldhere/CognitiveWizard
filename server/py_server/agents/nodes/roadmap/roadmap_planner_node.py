"""
agents/nodes/roadmap/roadmap_planner_node.py
============================================
Roadmap Planner Node — Stage 1 of the Roadmap Generation pipeline.

Generates the structural curriculum plan:
- Chronological learning phases
- Clear prerequisites and tangible learning outcomes
- Module breakdown with topics, difficulty, and estimated durations
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from providers.llm.provider_errors import AllProvidersFailedError
from agents.states.roadmap_agent_state import RoadmapAgentState
from schemas.roadmap_schema import RoadmapPlanSchema
from utils.builders.roadmap_prompt import build_roadmap_planner_prompt
from utils.json_extractor import extract_json, extract_model_response
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def roadmap_planner_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Generate the structural roadmap plan.
    """
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    norm = state.get("normalized_input", {})
    topic = norm.get("topic") or state.get("topic") or "General Roadmap"

    logger.info("[RoadmapPlanner|%s] Designing curriculum for topic='%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="roadmap_planner",
        status="planning",
    )

    prompt_text = build_roadmap_planner_prompt(
        topic=topic,
        details=norm.get("details") or state.get("details", ""),
        skill_level=norm.get("skill_level") or state.get("skill_level", "beginner"),
        goal=norm.get("goal") or state.get("goal", ""),
        learning_style=norm.get("learning_style") or state.get("learning_style", "mixed"),
        user_role=norm.get("user_role") or state.get("user_role", "user"),
    )

    system_msg = (
        "You are an expert AI curriculum and roadmap architect. "
        "Generate ONLY a valid JSON roadmap blueprint containing learning phases, modules, and topics. "
        "Adhere strictly to the JSON schema provided. Output no markdown, no conversational prose."
    )

    try:
        llm = await get_llm_for_course_task(TaskType.ROADMAP_PLANNER)
    except AllProvidersFailedError as exc:
        logger.error("[RoadmapPlanner|%s] All LLM providers failed: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Roadmap planner: all providers failed — {exc}"],
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
            logger.error("[RoadmapPlanner|%s] Failed to extract JSON from response", job_id)
            return {
                "warnings": state.get("warnings", []) + ["Roadmap planner: failed to extract valid JSON"],
                "pipeline_status": "error",
                "error": "Failed to parse roadmap plan JSON from model response",
            }

        raw_plan = json.loads(json_str)

        # Normalize if model returned a list of phases directly
        if isinstance(raw_plan, list):
            raw_plan = {
                "title": f"{topic} Roadmap",
                "description": f"Curriculum and learning path for {topic}",
                "prerequisites": [],
                "outcomes": [],
                "learning_phases": [p.get("phase", f"Phase {i+1}") for i, p in enumerate(raw_plan) if isinstance(p, dict)],
                "phasewise_modules": raw_plan,
            }

        # Validate with RoadmapPlanSchema
        validated = RoadmapPlanSchema.model_validate(raw_plan)

        return {
            "roadmap_plan": validated.model_dump(),
            "pipeline_status": "researching",
        }

    except Exception as exc:
        logger.exception("[RoadmapPlanner|%s] Error during roadmap planning: %s", job_id, exc)
        return {
            "warnings": state.get("warnings", []) + [f"Roadmap planner error: {exc}"],
            "pipeline_status": "error",
            "error": str(exc),
        }
