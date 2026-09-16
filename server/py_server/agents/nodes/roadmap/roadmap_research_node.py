"""
agents/nodes/roadmap/roadmap_research_node.py
=============================================
Roadmap Research Node — Stage 2 of the Roadmap Generation pipeline.

Gathers high-quality references (official docs, courses, articles, videos)
and visual resources tailored to the roadmap topic and learner profile.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.roadmap_agent_state import RoadmapAgentState
from services.generation.research_service import reference_research_service
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def roadmap_research_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Research authoritative references and learning materials.
    """
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    norm = state.get("normalized_input", {})
    topic = norm.get("topic") or state.get("topic") or "General Roadmap"
    skill_level = norm.get("skill_level") or state.get("skill_level", "beginner")
    goal = norm.get("goal") or state.get("goal", "")
    learning_style = norm.get("learning_style") or state.get("learning_style", "mixed")

    logger.info("[RoadmapResearch|%s] Finding references for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="roadmap_research",
        status="researching",
    )

    try:
        research_result = await reference_research_service.research_for_roadmap(
            topic=topic,
            skill_level=skill_level,
            goal=goal,
            learning_style=learning_style,
        )

        references = research_result.get("references", {})
        images = research_result.get("images", [])
        res_warnings = research_result.get("warnings", [])

        warnings = list(state.get("warnings", []))
        if res_warnings:
            warnings.extend([f"Research warning: {w}" for w in res_warnings])

        return {
            "references": references,
            "images": images,
            "warnings": warnings,
            "pipeline_status": "composing",
        }

    except Exception as exc:
        logger.warning("[RoadmapResearch|%s] Research node non-fatal error: %s", job_id, exc)
        return {
            "references": {},
            "images": [],
            "warnings": list(state.get("warnings", [])) + [f"Research failed (non-fatal): {exc}"],
            "pipeline_status": "composing",
        }
