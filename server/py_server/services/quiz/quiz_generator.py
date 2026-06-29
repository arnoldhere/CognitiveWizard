import json
import logging
import re
from typing import Any, List, Dict, Tuple
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.prompt_builder.quiz_prompt import build_quiz_prompt
from . import quiz_validator

logger = logging.getLogger(__name__)


from utils.json_extractor import extract_json, extract_model_response


def _parse_response(response_text: str) -> Tuple[bool, List[Dict]]:
    """
    Parse and validate quiz response from LLM.

    Args:
        response_text: Raw response from LLM

    Returns:
        tuple: (success, parsed_data or [])
    """
    try:
        logger.debug(f"Raw response (first 300 chars): {response_text[:300]}")
        success, json_str = extract_json(response_text)
        if not success:
            logger.error("Failed to extract JSON from response")
            logger.debug(f"Full response was: {response_text}")
            return False, []

        logger.debug(f"Parsing JSON string of length {len(json_str)}")
        data = json.loads(json_str)

        # Ensure it's a list
        if not isinstance(data, list):
            if isinstance(data, dict) and "quizzes" in data:
                logger.debug("Found 'quizzes' key in dict, extracting")
                data = data["quizzes"]
            elif isinstance(data, dict) and "quiz" in data:
                logger.debug("Found 'quiz' key in dict, extracting")
                data = data["quiz"]
            else:
                logger.warning(f"Expected list, got {type(data)}")
                return False, []

        logger.debug(f"Successfully parsed {len(data)} items from JSON")
        return True, data

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
        logger.debug(
            f"Failed to parse JSON. Response (first 500 chars): {response_text[:500]}"
        )
        return False, []
    except Exception as e:
        logger.error(f"Error parsing response: {str(e)}")
        return False, []





def generate_quiz(
    topic: str, difficulty: str, num_questions: int, QUIZ_MODEL_MODE: str = "api"
) -> Tuple[bool, List[Dict]]:
    """
    Generate a quiz for the given topic and difficulty.

    Args:
        topic: Quiz topic
        difficulty: Quiz difficulty level
        num_questions: Number of questions to generate

    Returns:
        tuple: (success, quiz_data or [])
    """
    try:
        logger.info(
            f"Generating quiz: topic={topic}, difficulty={difficulty}, num_questions={num_questions}"
        )

        # Build the prompt
        prompt = build_quiz_prompt(topic, difficulty, num_questions)
        logger.debug(f"Prompt built, length: {len(prompt)}")

        logger.debug("Sending request to model...")

        # Use factory pattern for task-specific text-generation configuration
        llm = get_llm_for_task(TaskType.QUIZ, provider="huggingface")

        prompt_text = (
            "You are an AI quiz generator. Generate ONLY valid JSON. "
            "Do not include explanations, comments, or extra text. "
            "Follow the exact format strictly.\n\n"
            f"{prompt}"
        )

        # Use chat-style invocation for quiz generation to ensure compatibility
        messages = [
            SystemMessage(
                content=(
                    "You are an advanced quiz generation assistant. "
                    "Generate ONLY valid JSON without explanation."
                )
            ),
            HumanMessage(content=prompt_text),
        ]

        if hasattr(llm, "invoke"):
            response = llm.invoke(messages)
        elif hasattr(llm, "generate"):
            response = llm.generate([messages])
        else:
            raise AttributeError("LLM client does not support chat-style invocation")

        if not response:
            raise ValueError("Empty response from the model")

        response_text = extract_model_response(response).strip()
        logger.debug(f"Received response of length {len(response_text)}")

        # Parse and validate
        success, parsed_data = _parse_response(response_text)
        if not success:
            logger.error("Failed to parse response")
            return False, []

        # Validate quiz data
        is_valid, validated_data = quiz_validator.validate(parsed_data, auto_fix=True)
        if not is_valid or not validated_data:
            logger.error("Quiz validation failed or no valid questions")
            return False, []

        logger.info(f"Quiz generation successful..")
        return True, validated_data

    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}", exc_info=True)
        return False, []
