"""
agents/nodes/roadmap/input_normalizer_node.py
============================================
Validates and normalizes user input parameters for Roadmap generation.
"""

import logging
from typing import Any, Dict
from agents.states.roadmap_agent_state import RoadmapAgentState
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)


async def input_normalizer_node(state: RoadmapAgentState) -> Dict[str, Any]:
    """Validate and normalize user input parameters."""
    job_id = state.get("job_id", "unknown")
    content_id = state.get("content_id")
    topic = (state.get("topic") or "").strip()

    logger.info("[Roadmap|%s] Normalizing inputs for topic='%s'", job_id, topic)

    await event_publisher.publish_event(
        job_id=job_id,
        content_id=content_id,
        content_type="roadmap",
        stage="input_normalizer",
        status="planning",
    )

    if not topic:
        return {
            "error": "Topic cannot be empty for roadmap generation.",
            "pipeline_status": "error",
            "warnings": ["Input normalizer: topic was empty"],
        }

    skill_level = (state.get("skill_level") or "beginner").lower().strip()
    if skill_level not in ("beginner", "intermediate", "advanced"):
        skill_level = "beginner"

    learning_style = (state.get("learning_style") or "mixed").lower().strip()
    goal = (state.get("goal") or "").strip()
    user_role = (state.get("user_role") or "user").lower().strip()

    normalized = {
        "topic": topic,
        "skill_level": skill_level,
        "learning_style": learning_style,
        "goal": goal,
        "user_role": user_role,
        "details": state.get("details", "").strip(),
    }

    return {
        "normalized_input": normalized,
        "pipeline_status": "planning",
    }
