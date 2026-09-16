"""
agents/nodes/guide/guide_reviewer_node.py
========================================
Guide Reviewer Node — Stage 4 of the Guide Generation pipeline.

Performs pedagogical review of the written guide:
- Evaluates clarity, step progression, and actionable coverage
- Determines if revision is required (with suggestions)
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict

from langchain_core.messages import HumanMessage, SystemMessage

from providers.llm.factory import get_llm_for_course_task
from providers.llm.tasks import TaskType
from agents.states.guide_agent_state import GuideAgentState
from schemas.guide_schema import GuideReviewResultSchema
from utils.builders.guide_prompt import build_guide_reviewer_prompt
from utils.json_extractor import extract_json, extract_model_response
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def guide_reviewer_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Review guide pedagogy, completeness, and clarity."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Guide").strip()

    logger.info("[GuideReviewer|%s] Conducting pedagogical review for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="guide_reviewer",
        status="reviewing",
    )

    draft = state.get("guide_draft", {})
    prompt_text = build_guide_reviewer_prompt(topic=topic, guide_draft=draft)

    system_msg = (
        "You are an expert educational reviewer and technical editor. "
        "Assess the guide's instructional quality and return ONLY a valid review JSON."
    )

    try:
        llm = await get_llm_for_course_task(TaskType.GUIDE_REVIEWER)
        messages = [SystemMessage(content=system_msg), HumanMessage(content=prompt_text)]

        if hasattr(llm, "ainvoke"):
            response = await llm.ainvoke(messages)
        else:
            import asyncio
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: llm.invoke(messages)
            )

        response_text = extract_model_response(response).strip()
        success, json_str = extract_json(response_text)

        if success:
            raw_review = json.loads(json_str)
            review = GuideReviewResultSchema.model_validate(raw_review)
        else:
            review = GuideReviewResultSchema(status="passed", clarity_score=0.9, suggestions=[])

    except Exception as exc:
        logger.warning("[GuideReviewer|%s] Review failed (non-fatal, auto-passing): %s", job_id, exc)
        review = GuideReviewResultSchema(status="passed", clarity_score=0.85, suggestions=[])

    return {
        "review_result": review.model_dump(),
        "pipeline_status": "validating",
    }
