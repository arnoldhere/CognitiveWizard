import json
import logging
import re
from typing import Any, Dict, Tuple
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.prompt_builder.wizard_prompt import build_wizard_prompt

logger = logging.getLogger(__name__)

def _extract_json(text: str) -> Tuple[bool, str]:
    text = text.strip()
    try:
        json.loads(text)
        return True, text
    except json.JSONDecodeError:
        pass

    text_cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text_cleaned = re.sub(r"\n?```\s*$", "", text_cleaned)
    text_cleaned = text_cleaned.strip()

    try:
        json.loads(text_cleaned)
        return True, text_cleaned
    except json.JSONDecodeError:
        pass

    json_match = re.search(r"\{[\s\S]*\}", text_cleaned)
    if json_match:
        json_str = json_match.group(0)
        try:
            json.loads(json_str)
            return True, json_str
        except json.JSONDecodeError:
            pass

    return False, ""


def _extract_model_response(response: Any) -> str:
    if response is None:
        return ""
    if hasattr(response, "content"):
        return str(response.content)
    if hasattr(response, "choices"):
        try:
            choice = response.choices[0]
            if hasattr(choice, "message") and choice.message:
                return str(choice.message["content"]).strip()
        except Exception:
            pass
    return str(response)

def generate_wizard_content(topic: str, content_type: str, details: str = None) -> Tuple[bool, Dict]:
    try:
        logger.info(f"Generating wizard content: topic={topic}, type={content_type}")
        prompt_text = build_wizard_prompt(topic, content_type, details)

        llm = get_llm_for_task(TaskType.WIZARD)

        messages = [
            SystemMessage(
                content="You are an expert AI educational planner. Generate ONLY valid JSON without explanation."
            ),
            HumanMessage(content=prompt_text),
        ]

        if hasattr(llm, "invoke"):
            response = llm.invoke(messages)
        else:
            response = llm.generate([messages])

        response_text = _extract_model_response(response).strip()
        
        success, json_str = _extract_json(response_text)
        if not success:
            logger.error("Failed to extract JSON from wizard response")
            return False, {}

        data = json.loads(json_str)
        return True, data

    except Exception as e:
        logger.error(f"Wizard generation failed: {str(e)}", exc_info=True)
        return False, {}
