import json
import asyncio
import logging
from typing import Any, Dict, Tuple, Optional
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.builders.wizard_prompt import build_wizard_prompt
from utils.json_extractor import extract_json, extract_model_response

logger = logging.getLogger(__name__)


async def generate_wizard_content(
    topic: str,
    content_type: str,
    details: Optional[str] = None,
    skill_level: Optional[str] = None,
    goal: Optional[str] = None,
    learning_style: Optional[str] = None,
    user_role: Optional[str] = "user",
) -> Tuple[bool, Dict]:
    """
    Generate structured educational content via LLM.

    Designed as an async function so it can be awaited concurrently alongside
    agent workflows (e.g. reference retriever) without blocking the event loop.

    Args:
        topic:          Subject matter to generate content for.
        content_type:   One of roadmap / course / syllabus / guide / schedule.
        details:        Optional extra instructions from the user.
        skill_level:    beginner / intermediate / advanced.
        goal:           User's learning goal.
        learning_style: visual / theoretical / interactive.
        user_role:      user / tutor / admin.

    Returns:
        (success: bool, data: dict) — data is empty dict on failure.
    """
    try:
        logger.info(
            "Generating wizard content: topic=%s type=%s skill_level=%s role=%s",
            topic, content_type, skill_level, user_role,
        )

        # Build the LLM prompt with all available context
        prompt_text = build_wizard_prompt(
            topic=topic,
            content_type=content_type,
            details=details,
            skill_level=skill_level,
            goal=goal,
            learning_style=learning_style,
            user_role=user_role,
        )

        llm = get_llm_for_task(TaskType.WIZARD)

        messages = [
            SystemMessage(
                content=(
                    "You are an expert AI educational planner. "
                    "Generate ONLY valid JSON without explanation. "
                    "Generate only study related plans."
                )
            ),
            HumanMessage(content=prompt_text),
        ]

        # LangChain's synchronous `invoke` blocks the thread; run it in the
        # default executor so the async event loop stays responsive.
        loop = asyncio.get_event_loop()
        if hasattr(llm, "ainvoke"):
            # Prefer native async invoke when the provider supports it
            response = await llm.ainvoke(messages)
        else:
            response = await loop.run_in_executor(None, lambda: llm.invoke(messages))

        logger.info("Wizard LLM response received for topic=%s", topic)
        response_text = extract_model_response(response).strip()

        success, json_str = extract_json(response_text)
        if not success:
            logger.error("Failed to extract JSON from wizard response for topic=%s", topic)
            return False, {}

        data = json.loads(json_str)
        return True, data

    except Exception as e:
        logger.error("Wizard generation failed for topic=%s: %s", topic, str(e), exc_info=True)
        return False, {}
