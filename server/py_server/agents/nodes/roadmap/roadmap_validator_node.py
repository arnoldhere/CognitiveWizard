"""
agents/nodes/roadmap/roadmap_validator_node.py
==============================================
Roadmap Validator Node — Stage 4 of the Roadmap Generation pipeline.

Validates the assembled roadmap against RoadmapSchema, ensuring complete
structural integrity, required fields, and correct typing.
"""

from __future__ import annotations
import logging
from typing import Any, Dict

from agents.states.roadmap_agent_state import RoadmapAgentState
from schemas.roadmap_schema import RoadmapSchema
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def roadmap_validator_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """
    LangGraph Node: Validate and normalize the assembled roadmap draft.
    """
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = state.get("topic") or "Roadmap"

    logger.info("[RoadmapValidator|%s] Validating roadmap for '%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="roadmap_validator",
        status="validating",
    )

    draft = state.get("roadmap_draft", {}) or {}
    warnings = list(state.get("warnings", []))

    try:
        # Enforce RoadmapSchema validation
        validated = RoadmapSchema.model_validate(draft)
        validated_dict = validated.model_dump()

        return {
            "roadmap_draft": validated_dict,
            "warnings": warnings,
            "pipeline_status": "quality_gate",
        }

    except Exception as exc:
        logger.warning("[RoadmapValidator|%s] Validation warning: %s — attempting auto-repair", job_id, exc)
        warnings.append(f"Roadmap validation auto-repair: {exc}")

        # Basic fallback repairs
        if not draft.get("title"):
            draft["title"] = f"{topic} Roadmap"
        if not draft.get("learning_phases"):
            draft["learning_phases"] = ["Phase 1: Foundations", "Phase 2: Core Concepts", "Phase 3: Advanced Topics"]
        if not draft.get("phasewise_modules"):
            draft["phasewise_modules"] = [
                {
                    "phase": "Phase 1: Foundations",
                    "modules": [
                        {
                            "title": f"Introduction to {topic}",
                            "description": f"Fundamental overview of {topic}",
                            "estimated_time": "1 week",
                            "difficulty": "beginner",
                            "topics": [{"name": f"{topic} Basics", "details": "Foundational concepts", "importance": "Core"}],
                        }
                    ],
                }
            ]

        try:
            validated = RoadmapSchema.model_validate(draft)
            validated_dict = validated.model_dump()
            return {
                "roadmap_draft": validated_dict,
                "warnings": warnings,
                "pipeline_status": "quality_gate",
            }
        except Exception as final_exc:
            logger.error("[RoadmapValidator|%s] Fatal schema failure: %s", job_id, final_exc)
            return {
                "roadmap_draft": draft,
                "warnings": warnings + [f"Fatal validation error: {final_exc}"],
                "pipeline_status": "error",
                "error": str(final_exc),
            }
