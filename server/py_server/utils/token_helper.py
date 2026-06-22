from typing import Any, Dict, Optional

def extract_token_usage(
    response: Any,
    prompt: Optional[str] = None,
    response_text: Optional[str] = None
) -> Dict[str, int]:
    """
    Extract token usage from LLM response or fall back to character-based heuristic.
    """
    # 1. If response is a dict and already has token_usage
    if isinstance(response, dict):
        if "token_usage" in response and response["token_usage"]:
            return response["token_usage"]
        if "usage" in response and response["usage"]:
            u = response["usage"]
            return {
                "input_tokens": u.get("prompt_tokens") or u.get("input_tokens") or u.get("input") or 0,
                "output_tokens": u.get("completion_tokens") or u.get("output_tokens") or u.get("output") or 0,
                "total_tokens": u.get("total_tokens") or 0
            }
        # Check nested dicts
        for field in ["llm_output", "raw_output", "choices"]:
            if field in response:
                nested = response[field]
                if isinstance(nested, dict):
                    res = extract_token_usage(nested)
                    if res.get("input_tokens") or res.get("output_tokens"):
                        return res
                elif isinstance(nested, list) and nested:
                    res = extract_token_usage(nested[0])
                    if res.get("input_tokens") or res.get("output_tokens"):
                        return res

    # 2. Check response_metadata of AIMessage
    if hasattr(response, "response_metadata") and response.response_metadata:
        meta = response.response_metadata
        if "token_usage" in meta and meta["token_usage"]:
            tu = meta["token_usage"]
            if isinstance(tu, dict):
                return {
                    "input_tokens": tu.get("prompt_tokens") or tu.get("input_tokens") or tu.get("input") or 0,
                    "output_tokens": tu.get("completion_tokens") or tu.get("output_tokens") or tu.get("output") or 0,
                    "total_tokens": tu.get("total_tokens") or 0
                }
        elif "usage" in meta and meta["usage"]:
            u = meta["usage"]
            if isinstance(u, dict):
                return {
                    "input_tokens": u.get("prompt_tokens") or u.get("input_tokens") or u.get("input") or 0,
                    "output_tokens": u.get("completion_tokens") or u.get("output_tokens") or u.get("output") or 0,
                    "total_tokens": u.get("total_tokens") or 0
                }

    # 3. Check direct attributes (e.g. usage)
    if hasattr(response, "usage") and response.usage:
        usage = response.usage
        return {
            "input_tokens": getattr(usage, "prompt_tokens", None)
            or getattr(usage, "input_tokens", None)
            or getattr(usage, "input", 0),
            "output_tokens": getattr(usage, "completion_tokens", None)
            or getattr(usage, "output_tokens", None)
            or getattr(usage, "completion", 0),
            "total_tokens": getattr(usage, "total_tokens", 0)
            or (getattr(usage, "prompt_tokens", 0) or 0)
            + (getattr(usage, "completion_tokens", 0) or 0),
        }

    # 4. Fallback: Estimate token usage based on character length
    # A standard robust heuristic: 1 token ≈ 4 characters
    p_text = prompt or ""
    r_text = response_text or ""
    if not r_text and response:
        if hasattr(response, "content"):
            r_text = str(response.content)
        elif hasattr(response, "generations") and response.generations:
            r_text = str(response.generations[0][0].text)
        elif isinstance(response, str):
            r_text = response

    input_tokens = max(1, round(len(p_text) / 4)) if p_text else 0
    output_tokens = max(1, round(len(r_text) / 4)) if r_text else 0
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens
    }
