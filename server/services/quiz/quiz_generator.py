import json
import logging
import re
from typing import List, Dict, Tuple
from config.hf_inference import HFClientManager
from config.settings import settings
from utils.prompt_builder.quiz_prompt import build_quiz_prompt
from utils.prompt_builder.format_prompt_local import format_prompt_for_local
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

    # Try to extract JSON block
    # Look for [...] patterns
    json_match = re.search(r"\[.*\]", text, re.DOTALL)
    if json_match:
        json_str = json_match.group(0)
        try:
            json.loads(json_str)
            logger.debug("Extracted valid JSON from text")
            return True, json_str
        except json.JSONDecodeError:
            pass

    # Try to find JSON object {...}
    json_match = re.search(r"\{.*\}", text, re.DOTALL)
    if json_match:
        json_str = json_match.group(0)
        try:
            json.loads(json_str)
            logger.debug("Extracted valid JSON object from text")
            return True, json_str
        except json.JSONDecodeError:
            pass

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
        success, json_str = _extract_json(response_text)
        if not success:
            logger.error("Failed to extract JSON from response")
            return False, []

        logger.debug(f"Parsing JSON string of length {len(json_str)}")
        data = json.loads(json_str)

        # Ensure it's a list
        if not isinstance(data, list):
            if isinstance(data, dict) and "quizzes" in data:
                data = data["quizzes"]
            elif isinstance(data, dict) and "quiz" in data:
                data = data["quiz"]
            else:
                logger.warning(f"Expected list, got {type(data)}")
                return False, []

        logger.debug(f"Successfully parsed {len(data)} items from JSON")
        return True, data

    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}")
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

        # Initialize the inference client
        client = HFClientManager.get_client(mode=QUIZ_MODEL_MODE)
        # logger.debug(f"Using model: {settings.QUIZ_GENERATOR_MODEL}")

        # Build the prompt
        prompt = build_quiz_prompt(topic, difficulty, num_questions)
        logger.debug(f"Prompt built, length: {len(prompt)}")

        # Prepare messages
        messages = [
            {
                "role": "system",
                "content": (
                    "You are an AI quiz generator.\n"
                    "Generate ONLY valid JSON.\n"
                    "Do not include explanations, comments, or extra text.\n"
                    "Follow the exact format strictly."
                ),
            },
            {"role": "user", "content": prompt},
        ]

        logger.debug("Sending request to model...")

        if QUIZ_MODEL_MODE == "api":
            res = client.chat_completion(
                messages=messages,
                max_tokens=2048,
                temperature=1,
            )
            response_text = res.choices[0].message["content"]

        else:
            # formatted_prompt = format_prompt_for_local(messages)
            # LOCAL PIPELINE MODE
            res = client(
                messages,
                return_full_text=False,
            )

            response_text = res[0]["generated_text"]  #  correct
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

        logger.info(
            f"Quiz generation successful: {len(validated_data)} valid questions"
        )
        return True, validated_data

    except Exception as e:
        logger.error(f"Quiz generation failed: {str(e)}", exc_info=True)
        return False, []
