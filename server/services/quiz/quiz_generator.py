import json
import logging
import re
from typing import List, Dict, Tuple

from config.settings import settings
from langchain_core.messages import HumanMessage, SystemMessage
from providers.llm_provider import Provider
from utils.prompt_builder.quiz_prompt import build_quiz_prompt
from . import quiz_validator

logger = logging.getLogger(__name__)


def _extract_json(text: str) -> Tuple[bool, str]:
    """
    Extract JSON from potentially malformed LLM response.

    Args:
        text: Raw text response from LLM

    Returns:
        tuple: (success, json_string)
    """
    text = text.strip()
    logger.debug(f"Extracting JSON from text of length {len(text)}")

    # Try direct parsing first
    try:
        json.loads(text)
        logger.debug("Text is valid JSON")
        return True, text
    except json.JSONDecodeError:
        pass

    # Remove common markdown code blocks
    text_cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text_cleaned = re.sub(r"\n?```\s*$", "", text_cleaned)
    text_cleaned = text_cleaned.strip()

    # Try parsing cleaned text
    try:
        json.loads(text_cleaned)
        logger.debug("Text is valid JSON after removing markdown")
        return True, text_cleaned
    except json.JSONDecodeError:
        pass

    # Try to extract JSON array [...] - prioritize this as we expect arrays
    json_match = re.search(r"\[[\s\S]*\]", text_cleaned)
    if json_match:
        json_str = json_match.group(0)
        try:
            json.loads(json_str)
            logger.debug("Extracted valid JSON array from text")
            return True, json_str
        except json.JSONDecodeError as e:
            logger.debug(f"Array extraction failed: {e}")

    # Try to find JSON object {...}
    json_match = re.search(r"\{[\s\S]*\}", text_cleaned)
    if json_match:
        json_str = json_match.group(0)
        try:
            json.loads(json_str)
            logger.debug("Extracted valid JSON object from text")
            return True, json_str
        except json.JSONDecodeError as e:
            logger.debug(f"Object extraction failed: {e}")

    logger.warning("Could not extract valid JSON from response")
    return False, ""


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
        success, json_str = _extract_json(response_text)
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

        if QUIZ_MODEL_MODE != "api":
            raise ValueError(
                f"Unsupported quiz model mode: {QUIZ_MODEL_MODE}. Only 'api' is supported."
            )

        chat_client = Provider(
            provider="huggingface",
            model_name=settings.QUIZ_GENERATOR_MODEL,
            temperature=1.0,
            max_new_tokens=2048,
        ).get_llm()

        conversation = [
            SystemMessage(
                content=(
                    "You are an AI quiz generator. Generate ONLY valid JSON. "
                    "Do not include explanations, comments, or extra text. "
                    "Follow the exact format strictly."
                )
            ),
            HumanMessage(content=prompt),
        ]

        response = chat_client.generate([conversation])

        if not response or not getattr(response, "generations", None):
            raise ValueError("Empty response from HuggingFace LangChain client")

        response_text = response.generations[0][0].text
        logger.debug(f"Received response of length {len(response_text)}")
        # print(f"Raw response: {response_text}...")  # Print first 500 chars

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
