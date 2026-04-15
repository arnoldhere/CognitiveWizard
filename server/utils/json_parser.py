import json
import re
import logging

logger = logging.getLogger(__name__)


def extract_json(res: str, max_retries: int = 3):
    """
    Advanced JSON extraction with multiple fallback strategies.
    Handles various LLM response formats dynamically.

    Args:
        res: Raw response from LLM
        max_retries: Number of extraction strategies to try

    Returns:
        dict: Extracted JSON data or error dict
    """

    if not res or not isinstance(res, str):
        logger.error(f"Invalid response type: {type(res)}")
        return {"error": "Response is not a valid string"}

    res = res.strip()
    logger.debug(f"Raw response length: {len(res)} characters")

    # Strategy 1: Direct JSON parsing (already cleaned markdown)
    strategy_1_result = _strategy_direct_extraction(res)
    if strategy_1_result and "error" not in strategy_1_result:
        logger.info("✓ Strategy 1 succeeded: Direct extraction")
        return strategy_1_result
    logger.debug("✗ Strategy 1 failed: Direct extraction")

    # Strategy 2: Remove markdown code blocks and retry
    strategy_2_result = _strategy_remove_markdown(res)
    if strategy_2_result and "error" not in strategy_2_result:
        logger.info("✓ Strategy 2 succeeded: Markdown removal")
        return strategy_2_result
    logger.debug("✗ Strategy 2 failed: Markdown removal")

    # Strategy 3: Extract between first [ and last ] with aggressive cleanup
    strategy_3_result = _strategy_bracket_extraction(res)
    if strategy_3_result and "error" not in strategy_3_result:
        logger.info("✓ Strategy 3 succeeded: Bracket extraction")
        return strategy_3_result
    logger.debug("✗ Strategy 3 failed: Bracket extraction")

    # Strategy 4: Try to find valid JSON patterns with regex
    strategy_4_result = _strategy_regex_extraction(res)
    if strategy_4_result and "error" not in strategy_4_result:
        logger.info("✓ Strategy 4 succeeded: Regex extraction")
        return strategy_4_result
    logger.debug("✗ Strategy 4 failed: Regex extraction")

    # Strategy 5: Fix common JSON formatting issues
    strategy_5_result = _strategy_fix_json_format(res)
    if strategy_5_result and "error" not in strategy_5_result:
        logger.info("✓ Strategy 5 succeeded: JSON format fixing")
        return strategy_5_result
    logger.debug("✗ Strategy 5 failed: JSON format fixing")

    # All strategies failed
    logger.error(f"All extraction strategies failed. Response: {res[:500]}")
    return {"error": "Could not parse JSON from response", "raw": res[:1000]}


def _strategy_direct_extraction(res: str):
    """Try direct JSON parsing without changes."""
    try:
        return json.loads(res)
    except json.JSONDecodeError:
        return None


def _strategy_remove_markdown(res: str):
    """Remove markdown code blocks and retry."""
    try:
        # Remove markdown code blocks
        cleaned = re.sub(r"```(?:json)?\n?", "", res)
        cleaned = re.sub(r"\n```", "", cleaned)
        cleaned = cleaned.strip()
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None


def _strategy_bracket_extraction(res: str):
    """Extract content between first [ and last ]."""
    try:
        # Find first [ and last ]
        start = res.find("[")
        end = res.rfind("]")

        if start == -1 or end == -1 or start >= end:
            return None

        json_str = res[start : end + 1]

        # Remove common problematic patterns
        json_str = re.sub(r",\s*]", "]", json_str)  # Remove trailing commas in arrays
        json_str = re.sub(r",\s*}", "}", json_str)  # Remove trailing commas in objects
        json_str = re.sub(r"[\x00-\x1f]", "", json_str)  # Remove control characters

        return json.loads(json_str)
    except json.JSONDecodeError:
        return None


def _strategy_regex_extraction(res: str):
    """Use regex to find and extract JSON patterns."""
    try:
        # Try to find JSON array pattern
        array_pattern = r"\[[\s\S]*?\](?=\s*(?:,|$))"
        matches = re.findall(array_pattern, res)

        if matches:
            for match in matches:
                try:
                    # Clean trailing commas before parsing
                    cleaned_match = re.sub(r",\s*]", "]", match)
                    cleaned_match = re.sub(r",\s*}", "}", cleaned_match)
                    result = json.loads(cleaned_match)
                    if isinstance(result, list) and len(result) > 0:
                        return result
                except json.JSONDecodeError:
                    continue

        return None
    except Exception as e:
        logger.debug(f"Regex extraction error: {str(e)}")
        return None


def _strategy_fix_json_format(res: str):
    """Try to fix common JSON formatting issues."""
    try:
        # Remove text before first [
        start = res.find("[")
        if start == -1:
            return None

        # Get substring from first [
        res = res[start:]

        # Remove text after last ]
        end = res.rfind("]")
        if end == -1:
            return None

        res = res[: end + 1]

        # Fix common issues
        # Remove newlines that might break strings
        res = re.sub(r'"\s*\n\s*"', '" "', res)

        # Fix escaped quotes
        res = res.replace('\\"', '"')
        res = res.replace('\\\\"', '\\"')

        # Remove duplicate slashes
        res = re.sub(r"\\+", "\\", res)

        # Remove trailing commas
        res = re.sub(r",(\s*[}\]])", r"\1", res)

        # Ensure proper spacing
        res = re.sub(r":\s*", ": ", res)

        return json.loads(res)
    except json.JSONDecodeError as e:
        logger.debug(f"JSON format fixing error: {str(e)}")
        return None
