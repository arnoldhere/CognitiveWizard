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

    # 1. Try direct parsing first
    try:
        json.loads(text)
        logger.debug("Text is valid JSON directly")
        return True, text
    except json.JSONDecodeError:
        pass

    # 2. Check for fenced markdown code block anywhere in text
    fenced_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if fenced_match:
        fenced_content = fenced_match.group(1).strip()
        try:
            json.loads(fenced_content)
            logger.debug("Extracted valid JSON directly from markdown code block")
            return True, fenced_content
        except json.JSONDecodeError:
            pass

    # 3. Strip outer markdown fences if present
    text_cleaned = re.sub(r"^```(?:json)?\s*\n?", "", text)
    text_cleaned = re.sub(r"\n?```\s*$", "", text_cleaned)
    text_cleaned = text_cleaned.strip()

    try:
        json.loads(text_cleaned)
        logger.debug("Text is valid JSON after removing markdown fences")
        return True, text_cleaned
    except json.JSONDecodeError:
        pass

    # 4. Outermost delimiter precedence depth scanner.
    # Outermost delimiter MUST take strict precedence:
    # If candidate starts with '{', its root is an object.
    # We NEVER fall back to '[' if '{' fails to balance, because that would slice
    # out an arbitrary inner array (e.g. course_outcomes or modules) instead of the root!
    search_candidates = []
    if fenced_match:
        search_candidates.append(fenced_match.group(1).strip())
    search_candidates.append(text_cleaned)

    for candidate in search_candidates:
        idx_brace = candidate.find('{')
        idx_bracket = candidate.find('[')

        delimiter_pairs = []
        if idx_brace != -1 and idx_bracket != -1:
            if idx_brace < idx_bracket:
                delimiter_pairs = [('{', '}')]
            else:
                delimiter_pairs = [('[', ']')]
        elif idx_brace != -1:
            delimiter_pairs = [('{', '}')]
        elif idx_bracket != -1:
            delimiter_pairs = [('[', ']')]

        for opener, closer in delimiter_pairs:
            start_idx = candidate.find(opener)
            if start_idx == -1:
                continue
            depth = 0
            in_string = False
            escape = False
            end_idx = -1
            for i, ch in enumerate(candidate[start_idx:], start=start_idx):
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
                json_str = candidate[start_idx:end_idx + 1]
                try:
                    json.loads(json_str)
                    label = 'array' if opener == '[' else 'object'
                    logger.debug(f"Extracted valid JSON {label} via depth scanner")
                    return True, json_str
                except json.JSONDecodeError as e:
                    logger.debug(f"Depth-scan extraction failed for '{opener}': {e}")

    # 5. Truncated JSON repair fallback:
    # If the response ended abruptly before the outermost delimiter closed,
    # attempt heuristic repair by closing open quotes and matching brackets.
    # Only attempted for substantial outputs (>= 100 chars) where real LLM truncation occurs.
    for candidate in search_candidates:
        if len(candidate) >= 100:
            repaired_ok, repaired_str = repair_truncated_json(candidate)
            if repaired_ok:
                logger.info("Successfully repaired truncated JSON payload")
                return True, repaired_str

    logger.warning("Could not extract valid JSON from response")
    return False, ""

def repair_truncated_json(text: str) -> Tuple[bool, str]:
    """
    Attempt to repair a truncated JSON string (e.g. when LLM token limit cut off the tail).
    Ensures root type matches the first opening delimiter and gracefully closes open quotes and brackets.
    """
    if not isinstance(text, str):
        return False, ""
    text = text.strip()
    if len(text) < 100:
        return False, ""
    idx_brace = text.find('{')
    idx_bracket = text.find('[')
    if idx_brace == -1 and idx_bracket == -1:
        return False, ""

    if idx_brace != -1 and (idx_bracket == -1 or idx_brace < idx_bracket):
        start_idx = idx_brace
        expected_type = dict
    else:
        start_idx = idx_bracket
        expected_type = list

    candidate = text[start_idx:]

    # Search backwards from end of string to find the closest valid repair cut point
    for trim_len in range(len(candidate), max(1, len(candidate) - 4000), -1):
        sub = candidate[:trim_len].rstrip()
        if sub.endswith(','):
            sub = sub[:-1].rstrip()
        elif sub.endswith(':'):
            continue

        sub_stack = []
        sub_in_str = False
        sub_esc = False
        valid = True
        for c in sub:
            if sub_esc:
                sub_esc = False
                continue
            if c == '\\' and sub_in_str:
                sub_esc = True
                continue
            if c == '"':
                sub_in_str = not sub_in_str
                continue
            if sub_in_str:
                continue
            if c == '{':
                sub_stack.append('}')
            elif c == '[':
                sub_stack.append(']')
            elif c in ('}', ']'):
                if sub_stack and sub_stack[-1] == c:
                    sub_stack.pop()
                else:
                    valid = False
                    break

        if not valid or not sub_stack:
            continue

        attempt = sub
        if sub_in_str:
            attempt += '"'
        attempt += ''.join(reversed(sub_stack))

        try:
            parsed = json.loads(attempt)
            if isinstance(parsed, expected_type):
                return True, json.dumps(parsed)
        except Exception:
            continue

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
