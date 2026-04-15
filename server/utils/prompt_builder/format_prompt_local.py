def format_prompt_for_local(messages):
    """
    Convert chat messages → plain prompt for local models
    """

    prompt = ""

    for msg in messages:
        if msg["role"] == "system":
            prompt += f"[SYSTEM]\n{msg['content']}\n\n"
        elif msg["role"] == "user":
            prompt += f"[USER]\n{msg['content']}\n\n"

    prompt += "[ASSISTANT]\n"

    return prompt
