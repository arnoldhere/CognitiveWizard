import operator
import logging
from typing import Annotated, TypedDict, Dict, Any, List, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from agents.services.refr_retr_agent import reference_retriever
from schemas.agentic.reference_agent import ReferenceQueryInput
from utils.json_extractor import extract_json, extract_model_response
from utils.builders.wizard_prompt import build_wizard_prompt
import json
import httpx
from config.settings import settings
from langgraph.checkpoint.memory import MemorySaver
from agents.states.course_agent_state import CourseAgentState

logger = logging.getLogger(__name__)


async def course_architect_node(state: CourseAgentState) -> Dict:
    """Generates the initial course structure or modifies it based on feedback."""
    logger.info(f"Course Architect Node processing topic={state.get('topic')}")

    # Update granular status via webhook
    content_id = state.get("content_id")
    if content_id:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.JS_SERVER_URL}/internal/wizard-webhook/status",
                    json={"content_id": content_id, "status": "generating_planning"},
                )
        except Exception as e:
            logger.error(f"Webhook error: {e}")

    feedback = state.get("feedback")
    existing_draft = state.get("course_draft")

    prompt_text = build_wizard_prompt(
        topic=state["topic"],
        content_type=state["content_type"],
        details=state["details"],
        skill_level=state["skill_level"],
        goal=state["goal"],
        learning_style=state["learning_style"],
        user_role=state["user_role"],
    )

    system_msg = (
        "You are an expert AI educational planner. "
        "Generate ONLY valid JSON without explanation. "
        "Adhere STRICTLY to the user inputs provided. Do not invent details contrary to the user's constraints."
    )

    messages = [SystemMessage(content=system_msg)]

    if feedback and existing_draft:
        messages.append(
            HumanMessage(
                content=f"Original Course Draft:\n{json.dumps(existing_draft, indent=2)}\n\nUser Feedback for Modification:\n{feedback}\n\nPlease regenerate the entire course JSON incorporating this feedback."
            )
        )
    else:
        messages.append(HumanMessage(content=prompt_text))

    llm = get_llm_for_task(TaskType.WIZARD)

    if hasattr(llm, "ainvoke"):
        response = await llm.ainvoke(messages)
    else:
        # Fallback for sync llms if needed
        import asyncio

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, lambda: llm.invoke(messages))

    response_text = extract_model_response(response).strip()
    success, json_str = extract_json(response_text)

    if not success:
        logger.error("Course Architect failed to output JSON.")
        return {"warnings": ["Failed to extract JSON from LLM response."]}

    data = json.loads(json_str)
    return {"course_draft": data}


async def resource_integrator_node(state: CourseAgentState) -> Dict:
    """Iterates through generated modules and fetches references using the ReferenceRetriever."""
    content_id = state.get("content_id")
    if content_id:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(
                    f"{settings.JS_SERVER_URL}/internal/wizard-webhook/status",
                    json={"content_id": content_id, "status": "generating_resources"},
                )
        except Exception as e:
            logger.error(f"Webhook error: {e}")

    draft = state.get("course_draft", {})
    if not draft or "modules" not in draft:
        return {}

    logger.info("Resource Integrator Node fetching references for modules...")
    warnings = []

    for module in draft["modules"]:
        topic = module.get("title", state["topic"])
        desc = module.get("description", "")

        # We query specifically for this module
        # Limit results so it doesn't overwhelm the response
        query_input = ReferenceQueryInput(
            topic=f"{state['topic']} - {topic}",
            skill_level=state.get("skill_level", ""),
            goal=state.get("goal", ""),
            learning_style="visual",  # prioritize videos/youtube
            max_results_per_category=2,
        )

        try:
            search_result = await reference_retriever.fetch_references(query_input)
            refs = []
            for r in search_result.resources:
                # Prioritize youtube as requested: "on each module find the relevant youtube reference video"
                if r.category == "youtube" or "youtube" in str(r.url).lower():
                    refs.insert(0, r.model_dump())
                else:
                    refs.append(r.model_dump())

            # Take top 3
            module["references"] = refs[:3]

            if search_result.warnings:
                warnings.extend(search_result.warnings)

        except Exception as e:
            logger.exception(f"Failed to fetch references for module {topic}")
            warnings.append(f"Failed to fetch references for {topic}: {str(e)}")

    return {"course_draft": draft, "warnings": warnings}


# Define Graph
builder = StateGraph(CourseAgentState)

builder.add_node("architect", course_architect_node)
builder.add_node("integrator", resource_integrator_node)

builder.set_entry_point("architect")
builder.add_edge("architect", "integrator")
builder.add_edge("integrator", END)

memory = MemorySaver()
compiled_course_graph = builder.compile(checkpointer=memory)
