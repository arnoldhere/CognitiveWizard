"""
LangGraph node for reference retrieval.

This node should stay thin:
- validate input
- call service
- adjust learning style
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


# async def adjust_roadmap_style_node(state: AgentState) -> dict:
#     """Adjusts the roadmap style based on learning_style and fetched references."""
#     topic = state.get("topic", "")
#     learning_style = state.get("learning_style", "theoretical")
#     base_roadmap = state.get("base_roadmap", {})
#     references = state.get("reference_result", {}).get("resources", [])

#     if not base_roadmap:
#         return {"adjusted_roadmap": {}}

#     # Setup the instruction based on learning_style
#     style_instruction = ""
#     if learning_style and (
#         "visual" in learning_style.lower() or "project" in learning_style.lower()
#     ):
#         style_instruction = (
#             "You are a roadmap style adapter. The user wants a 'visual & project based' learning style.\n"
#             "1. Modify the provided roadmap JSON to include a capstone project at the end (with a description).\n"
#             "2. Ensure you suggest placeholders for images (e.g. {image_search_query: '...'}).\n"
#             "3. Embed relevant resources from the provided references.\n"
#         )
#     elif learning_style and (
#         "interactive" in learning_style.lower() or "coding" in learning_style.lower()
#     ):
#         style_instruction = (
#             "You are a roadmap style adapter. The user wants an 'interactive & coding' learning style.\n"
#             "1. Modify the provided roadmap JSON to include interactive coding problems to solve.\n"
#             "2. Provide links to LeetCode or HackerRank problems that are relevant to each module.\n"
#             "3. Embed relevant resources from the provided references.\n"
#         )
#     else:  # theoretical & reading or default
#         style_instruction = (
#             "You are a roadmap style adapter. The user wants a 'theoretical & reading' learning style.\n"
#             "1. Modify the provided roadmap JSON to emphasize reading and theory.\n"
#             "2. Provide links to globally accepted or famous articles, blogs, or research papers.\n"
#             "3. Use the provided references extensively.\n"
#         )

#     prompt = f"""
#     Topic: {topic}
#     Base Roadmap: {json.dumps(base_roadmap)}
#     References: {json.dumps(references)}

#     Please output ONLY a valid JSON dictionary representing the updated roadmap.
#     """

#     llm = get_llm_for_task(TaskType.WIZARD)
#     messages = [
#         SystemMessage(content=style_instruction),
#         HumanMessage(content=prompt),
#     ]

#     try:
#         if hasattr(llm, "invoke"):
#             response = llm.invoke(messages)
#         else:
#             response = llm.generate([messages])

#         response_text = extract_model_response(response).strip()
#         success, json_str = extract_json(response_text)

#         if success:
#             data = json.loads(json_str)
#             return {"adjusted_roadmap": data}
#         else:
#             logger.error("Failed to extract JSON from adjusted roadmap")
#             return {
#                 "adjusted_roadmap": base_roadmap,
#                 "warnings": state.get("warnings", [])
#                 + ["Style adjustment JSON parsing failed."],
#             }
#     except Exception as e:
#         logger.error(f"Style adjustment failed: {str(e)}", exc_info=True)
#         return {
#             "adjusted_roadmap": base_roadmap,
#             "warnings": state.get("warnings", []) + [f"Style adjustment error: {e}"],
#         }
