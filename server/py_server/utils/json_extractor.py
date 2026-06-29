import json
import logging
import re
from typing import Any, Tuple

logger = logging.getLogger(__name__)

def extract_json(text: str) -> Tuple[bool, str]:
    """
    Extract JSON from potentially malformed LLM response.
    
    Args:
        text: Raw text response from LLM
        
    Returns:
        tuple: (success, json_string)
    """
    if not isinstance(text, str):
        return False, ""
        
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

    # Use depth-tracking scanner to correctly find the balanced closing delimiter.
    # rfind is unreliable for large nested JSON because prose appended AFTER the
    # JSON (or ] / } chars inside string values) breaks the naive slice.
    for opener, closer in (('[', ']'), ('{', '}')):
        start_idx = text_cleaned.find(opener)
        if start_idx == -1:
            continue
        depth = 0
        in_string = False
        escape = False
        end_idx = -1
        for i, ch in enumerate(text_cleaned[start_idx:], start=start_idx):
            if escape:
                escape = False
                continue
            if ch == '\\' and in_string:
                escape = True
                continue
            if ch == '"':
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    end_idx = i
                    break
        if end_idx != -1:
            json_str = text_cleaned[start_idx:end_idx + 1]
            try:
                json.loads(json_str)
                label = 'array' if opener == '[' else 'object'
                logger.debug(f"Extracted valid JSON {label} via depth scanner")
                return True, json_str
            except json.JSONDecodeError as e:
                logger.debug(f"Depth-scan extraction failed for '{opener}': {e}")

    logger.warning("Could not extract valid JSON from response")
    return False, ""

def extract_model_response(response: Any) -> str:
    if response is None:
        return ""
    if hasattr(response, "content"):
        return str(response.content)
    if hasattr(response, "choices"):
        try:
            choice = response.choices[0]
            if hasattr(choice, "message") and choice.message:
                return str(choice.message["content"]).strip()
            if isinstance(choice, dict) and choice.get("message"):
                return str(choice["message"]["content"]).strip()
        except Exception:
            pass
    if hasattr(response, "generations"):
        generations = getattr(response, "generations")
        if generations and generations[0] and hasattr(generations[0][0], "text"):
            return str(generations[0][0].text)
    if isinstance(response, list) and response:
        first = response[0]
        if hasattr(first, "content"):
            return str(first.content)
        if isinstance(first, dict) and first.get("message"):
            return str(first["message"]["content"]).strip()
        if isinstance(first, dict) and first.get("generated_text"):
            return str(first["generated_text"]).strip()
        return str(first)
    return str(response)
