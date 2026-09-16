"""
agents/nodes/guide/guide_quality_gate_node.py
=============================================
Guide Quality Gate Node — Final stage of the Guide Generation pipeline.

Performs final readiness checks, persists stage checkpoint, and marks
the guide generation as completed.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.guide_agent_state import GuideAgentState
from services.generation.event_publisher import event_publisher
from services.generation.checkpoint_manager import checkpoint_manager

logger = logging.getLogger(__name__)


async def guide_quality_gate_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Final quality gate for guide generation."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Guide").strip()
    draft = state.get("guide_draft", {}) or {}
    warnings = list(state.get("warnings", []))

    logger.info("[GuideQualityGate|%s] Finalizing guide for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="quality_gate",
        status="completed",
    )

    modules = draft.get("modules", [])
    if not modules:
        logger.warning("[GuideQualityGate|%s] Zero modules in guide draft", job_id)
        warnings.append("Quality Gate warning: Guide contains 0 modules.")

    # Mark stage checkpoint in DB
    await checkpoint_manager.persist_stage_checkpoint(
        job_id=job_id,
        stage="quality_gate",
        node="guide_quality_gate",
        status="completed",
    )

    return {
        "guide_draft": draft,
        "pipeline_status": "completed",
        "warnings": warnings,
    }
