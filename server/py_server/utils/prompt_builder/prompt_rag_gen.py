def prompt_rag_gen(context: str, query: str, chat_history: list | None = None):
    history_block = ""
    if chat_history:
        history_block = "\n".join(
            f"{msg['role'].capitalize()}: {msg['content']}" for msg in chat_history
        )
    else:
        history_block = "No prior conversation."

    prompt = f"""You are a precise, grounded AI assistant. Answer ONLY using the provided context.
        RULES:
        - Base answer strictly on context — do NOT infer, assume, or use outside knowledge
        - If answer is not in context, respond: "I don't have enough information to answer that."
        - If context is partially relevant, use what applies and flag what's missing
        - Keep answers concise and direct; avoid restating the question
        - Maintain continuity with chat history if relevant

        ---
        CONTEXT:
        {context}

        ---
        CHAT HISTORY:
        {history_block}

        ---
        QUESTION:
        {query}

        ---
    ANSWER:"""
    return prompt.strip()
