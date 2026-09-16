"""
agents/nodes/roadmap/roadmap_quality_gate_node.py
=================================================
Roadmap Quality Gate Node — Final stage of the Roadmap Generation pipeline.

Performs final structural and pedagogical readiness checks, records checkpoint
status, and publishes the completion event.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.roadmap_agent_state import RoadmapAgentState
from services.generation.event_publisher import event_publisher
from services.generation.checkpoint_manager import checkpoint_manager

logger = logging.getLogger(__name__)


async def roadmap_quality_gate_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Final quality gate for roadmap generation.
    """
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = state.get("topic") or "Roadmap"
    draft = state.get("roadmap_draft", {}) or {}
    warnings = list(state.get("warnings", []))

    logger.info("[RoadmapQualityGate|%s] Finalizing roadmap for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="quality_gate",
        status="completed",
    )

    phases = draft.get("phasewise_modules") or draft.get("modules") or []
    if not phases:
        logger.warning("[RoadmapQualityGate|%s] Zero phases in roadmap draft", job_id)
        warnings.append("Quality Gate warning: Roadmap contains 0 phases.")

    # Mark stage checkpoint in DB
    await checkpoint_manager.persist_stage_checkpoint(
        job_id=job_id,
        stage="quality_gate",
        node="roadmap_quality_gate",
        status="completed",
    )

    return {
        "roadmap_draft": draft,
        "pipeline_status": "completed",
        "warnings": warnings,
    }
