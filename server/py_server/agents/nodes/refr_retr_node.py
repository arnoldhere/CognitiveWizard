"""
LangGraph node for reference retrieval.

This node should stay thin:
- validate input
- call service
- return structured update only
"""

from __future__ import annotations
import logging
from schemas.agentic.reference_agent import ReferenceQueryInput, ReferenceSearchResult
from agents.services.refr_retr_agent import reference_retriever, ReferenceRetriever
from config.exceptions.agentic import SearchReferenceNodeError
from agents.states.refr_retr_state import AgentState

logger = logging.getLogger(__name__)


async def reference_node(state: AgentState, *, service: ReferenceRetriever) -> dict:
    """
    LangGraph node: fetch resources for content enhancement.

    Returns only the field updates, not the full state.
    """

    try:
        payload = ReferenceQueryInput(
            topic=state["topic"],
            skill_level=state.get("skill_level"),
            goal=state.get("goal"),
            learning_style=state.get("learning_style"),
            modules=state.get("modules", []),
        )

        res: ReferenceSearchResult = await service.fetch_references(payload)
        if res:
            return {
                "message": "References fetched successfully",
                "reference_result": res.model_dump(),
            }
        else:
            logger.exception(f"Error in search node")
            raise SearchReferenceNodeError(
                "Failed to fetch the search results via node"
            )
    except Exception as exc:
        logger.exception("Reference node failed for topic=%s", state.get("topic"))
        return {
            "reference_result": {
                "topic": state.get("topic", ""),
                "learning_style": state.get("learning_style"),
                "resources": [],
                "warnings": [f"Reference node error: {exc}"],
            }
        }
