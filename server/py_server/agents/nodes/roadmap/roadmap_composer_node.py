"""
agents/nodes/roadmap/roadmap_composer_node.py
=============================================
Roadmap Composer Node — Stage 3 of the Roadmap Generation pipeline.

Deterministically merges the structured curriculum blueprint with curated
research references and visual assets. Zero extra LLM tokens required.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.roadmap_agent_state import RoadmapAgentState
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def roadmap_composer_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Assemble roadmap blueprint and research assets into a unified draft.
    """
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    norm = state.get("normalized_input", {})
    topic = norm.get("topic") or state.get("topic") or "Roadmap"

    logger.info("[RoadmapComposer|%s] Assembling roadmap for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="roadmap_composer",
        status="composing",
    )

    plan = state.get("roadmap_plan", {}) or {}
    references = state.get("references", {}) or {}
    images = state.get("images", []) or []
    warnings = list(state.get("warnings", []))

    # Assemble comprehensive roadmap dictionary
    phasewise_modules = plan.get("phasewise_modules", [])
    learning_phases = plan.get("learning_phases", [])
    if not learning_phases and phasewise_modules:
        learning_phases = [
            p.get("phase", f"Phase {i+1}") for i, p in enumerate(phasewise_modules)
        ]

    roadmap_draft = {
        "content_type": "roadmap",
        "title": plan.get("title") or f"{topic} Roadmap",
        "description": plan.get("description") or f"Comprehensive learning roadmap for {topic}",
        "prerequisites": plan.get("prerequisites", []),
        "outcomes": plan.get("outcomes", []),
        "learning_phases": learning_phases,
        "phasewise_modules": phasewise_modules,
        "modules": phasewise_modules,  # Backward compatibility alias
        "references": references,
        "images": images,
        "warnings": warnings,
    }

    return {
        "roadmap_draft": roadmap_draft,
        "pipeline_status": "validating",
    }
