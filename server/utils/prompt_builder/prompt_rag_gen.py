def prompt_rag_gen(context, query, chat_history=None):
    prompt = f"""
    You are a helpful AI assistant.

    Use the provided context to answer the user's question.

    Guidelines:
    - Answer naturally and conversationally
    - Do NOT mention document numbers
    - Do NOT say "according to document 1/document 2"
    - Do NOT reference retrieval chunks
    - If the answer is not in the context, say you don't know
    context: 
    {context}
    Chat History:
    {chat_history}
    Question: {query}
    Answer: 
    """
    return prompt.strip()
