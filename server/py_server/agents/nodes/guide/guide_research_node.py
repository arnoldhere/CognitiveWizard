"""
agents/nodes/guide/guide_research_node.py
=========================================
Guide Research Node — Stage 2 of the Guide Generation pipeline.

Gathers official technical documentation, API guides, and tutorials
relevant to the guide's modules.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.guide_agent_state import GuideAgentState
from services.generation.research_service import reference_research_service
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def guide_research_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Research authoritative documentation and technical tutorials."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Guide").strip()
    skill_level = state.get("skill_level", "beginner")

    logger.info("[GuideResearch|%s] Finding technical references for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="guide_research",
        status="researching",
    )

    plan = state.get("guide_plan", {})
    key_modules = [m.get("title", "") for m in plan.get("modules", []) if isinstance(m, dict)]

    try:
        research_result = await reference_research_service.research_for_guide(
            topic=topic,
            key_modules=key_modules,
            skill_level=skill_level,
        )

        references = research_result.get("references", {})
        res_warnings = research_result.get("warnings", [])

        warnings = list(state.get("warnings", []))
        if res_warnings:
            warnings.extend([f"Guide research warning: {w}" for w in res_warnings])

        return {
            "references": references,
            "warnings": warnings,
            "pipeline_status": "writing",
        }

    except Exception as exc:
        logger.warning("[GuideResearch|%s] Guide research error: %s", job_id, exc)
        return {
            "references": {},
            "warnings": list(state.get("warnings", [])) + [f"Guide research failed (non-fatal): {exc}"],
            "pipeline_status": "writing",
        }
