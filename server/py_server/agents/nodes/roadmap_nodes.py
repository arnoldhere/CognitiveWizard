import logging
import json
from typing import Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.json_extractor import extract_json, extract_model_response
from services.wizard_service import generate_wizard_content
from agents.states.roadmap_state import RoadmapState
from schemas.agentic.reference_agent import ReferenceQueryInput, ReferenceSearchResult
from agents.services.refr_retr_agent import ReferenceRetriever

logger = logging.getLogger(__name__)

async def generate_base_roadmap_node(state: RoadmapState) -> dict:
    """Generates the initial baseline roadmap using the wizard_service logic."""
    topic = state.get("topic", "")
    content_type = state.get("content_type", "Roadmap")
    details = state.get("details", "")
    
    success, data = generate_wizard_content(topic=topic, content_type=content_type, details=details)
    if success:
        return {"base_roadmap": data}
    else:
        warnings = state.get("warnings", [])
        warnings.append("Failed to generate base roadmap.")
        return {"warnings": warnings}


async def fetch_references_node(state: RoadmapState, *, service: ReferenceRetriever) -> dict:
    """Fetches resources using the ReferenceRetriever service."""
    try:
        base_roadmap = state.get("base_roadmap", {})
        # Extract modules from base_roadmap to improve search
        modules = []
        if isinstance(base_roadmap, dict) and "modules" in base_roadmap:
            modules = [m.get("title", "") for m in base_roadmap.get("modules", [])]
            
        payload = ReferenceQueryInput(
            topic=state.get("topic", ""),
            skill_level=state.get("skill_level"),
            goal=state.get("goal"),
            learning_style=state.get("learning_style"),
            modules=modules,
        )

        res: ReferenceSearchResult = await service.fetch_references(payload)
        if res:
            return {"reference_result": res.model_dump()}
        else:
            return {"warnings": state.get("warnings", []) + ["No references fetched."]}
    except Exception as exc:
        logger.exception("Reference node failed for topic=%s", state.get("topic"))
        return {"warnings": state.get("warnings", []) + [f"Reference node error: {exc}"]}


async def adjust_roadmap_style_node(state: RoadmapState) -> dict:
    """Adjusts the roadmap style based on learning_style and fetched references."""
    topic = state.get("topic", "")
    learning_style = state.get("learning_style", "theoretical")
    base_roadmap = state.get("base_roadmap", {})
    references = state.get("reference_result", {}).get("resources", [])
    
    if not base_roadmap:
        return {"adjusted_roadmap": {}}

    # Setup the instruction based on learning_style
    style_instruction = ""
    if learning_style and ("visual" in learning_style.lower() or "project" in learning_style.lower()):
        style_instruction = (
            "You are a roadmap style adapter. The user wants a 'visual & project based' learning style.\n"
            "1. Modify the provided roadmap JSON to include a capstone project at the end (with a description).\n"
            "2. Ensure you suggest placeholders for images (e.g. {image_search_query: '...'}).\n"
            "3. Embed relevant resources from the provided references.\n"
        )
    elif learning_style and ("interactive" in learning_style.lower() or "coding" in learning_style.lower()):
        style_instruction = (
            "You are a roadmap style adapter. The user wants an 'interactive & coding' learning style.\n"
            "1. Modify the provided roadmap JSON to include interactive coding problems to solve.\n"
            "2. Provide links to LeetCode or HackerRank problems that are relevant to each module.\n"
            "3. Embed relevant resources from the provided references.\n"
        )
    else: # theoretical & reading or default
        style_instruction = (
            "You are a roadmap style adapter. The user wants a 'theoretical & reading' learning style.\n"
            "1. Modify the provided roadmap JSON to emphasize reading and theory.\n"
            "2. Provide links to globally accepted or famous articles, blogs, or research papers.\n"
            "3. Use the provided references extensively.\n"
        )
        
    prompt = f"""
    Topic: {topic}
    Base Roadmap: {json.dumps(base_roadmap)}
    References: {json.dumps(references)}
    
    Please output ONLY a valid JSON dictionary representing the updated roadmap.
    """

    llm = get_llm_for_task(TaskType.WIZARD)
    messages = [
        SystemMessage(content=style_instruction),
        HumanMessage(content=prompt),
    ]

    try:
        if hasattr(llm, "invoke"):
            response = llm.invoke(messages)
        else:
            response = llm.generate([messages])

        response_text = extract_model_response(response).strip()
        success, json_str = extract_json(response_text)
        
        if success:
            data = json.loads(json_str)
            return {"adjusted_roadmap": data}
        else:
            logger.error("Failed to extract JSON from adjusted roadmap")
            return {"adjusted_roadmap": base_roadmap, "warnings": state.get("warnings", []) + ["Style adjustment JSON parsing failed."]}
    except Exception as e:
        logger.error(f"Style adjustment failed: {str(e)}", exc_info=True)
        return {"adjusted_roadmap": base_roadmap, "warnings": state.get("warnings", []) + [f"Style adjustment error: {e}"]}
