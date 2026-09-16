"""
agents/nodes/guide/guide_validator_node.py
=========================================
Guide Validator Node — Stage 5 of the Guide Generation pipeline.

Validates the guide against GuideSchema, ensuring strict schema conformance,
proper module and topic structure, and non-empty content fields.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.guide_agent_state import GuideAgentState
from schemas.guide_schema import GuideSchema
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def guide_validator_node(state: GuideAgentState) -> Dict[str, Any]:
    """LangGraph Node: Validate and normalize guide structure."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "Guide").strip()

    logger.info("[GuideValidator|%s] Validating guide for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="guide",
        stage="guide_validator",
        status="validating",
    )

    draft = state.get("guide_draft", {}) or {}
    warnings = list(state.get("warnings", []))

    try:
        validated = GuideSchema.model_validate(draft)
        return {
            "guide_draft": validated.model_dump(),
            "warnings": warnings,
            "pipeline_status": "quality_gate",
        }
    except Exception as exc:
        logger.warning("[GuideValidator|%s] Validation warning: %s — auto-repairing", job_id, exc)
        warnings.append(f"Guide validation auto-repair: {exc}")

        # Basic fallback repairs
        if not draft.get("title"):
            draft["title"] = f"{topic}: Complete Guide"
        if not draft.get("description"):
            draft["description"] = f"Comprehensive step-by-step practical guide on {topic}"
        if not draft.get("modules"):
            draft["modules"] = [
                {
                    "title": "Module 1: Getting Started",
                    "description": f"Introduction and environment setup for {topic}",
                    "estimated_time": "15 minutes",
                    "topics": [
                        {
                            "name": f"Overview of {topic}",
                            "details": f"Fundamental overview, installation, and initial configuration of {topic}.",
                            "tips": ["Verify system requirements before installing."],
                            "common_mistakes": ["Skipping prerequisite environment setup."],
                        }
                    ],
                }
            ]

        try:
            validated = GuideSchema.model_validate(draft)
            return {
                "guide_draft": validated.model_dump(),
                "warnings": warnings,
                "pipeline_status": "quality_gate",
            }
        except Exception as final_exc:
            logger.error("[GuideValidator|%s] Fatal guide schema error: %s", job_id, final_exc)
            return {
                "guide_draft": draft,
                "warnings": warnings + [f"Fatal validation error: {final_exc}"],
                "pipeline_status": "error",
                "error": str(final_exc),
            }
