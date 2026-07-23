import json
import logging
import re
from typing import Any, Dict, Tuple
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.builders.wizard_prompt import build_wizard_prompt

logger = logging.getLogger(__name__)

from utils.json_extractor import extract_json, extract_model_response


def generate_wizard_content(
    topic: str, content_type: str, details: str = None
) -> Tuple[bool, Dict]:
    try:
        logger.info(f"Generating wizard content: topic={topic}, type={content_type}")
        prompt_text = build_wizard_prompt(topic, content_type, details)

        llm = get_llm_for_task(TaskType.WIZARD)

        messages = [
            SystemMessage(
                content="You are an expert AI educational planner. Generate ONLY valid JSON without explanation. generate only study related plan"
            ),
            HumanMessage(content=prompt_text),
        ]

        if hasattr(llm, "invoke"):
            response = llm.invoke(messages)
        else:
            response = llm.generate([messages])

        logger.info(f"Wizard generation response: {response}")
        response_text = extract_model_response(response).strip()

        success, json_str = extract_json(response_text)
        if not success:
            logger.error("Failed to extract JSON from wizard response")
            return False, {}

        data = json.loads(json_str)
        return True, data

    except Exception as e:
        logger.error(f"Wizard generation failed: {str(e)}", exc_info=True)
        return False, {}
