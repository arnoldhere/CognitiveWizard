def prompt_rag_gen(context, query, chat_history=None):
    prompt = f"""
    You are a helpful AI assistant.

    Use the provided context to answer the user's question.

    Guidelines:
    - If the answer is not in the context, say you don't know
    context: 
    {context}
    Chat History:
    {chat_history}
    Question: {query}
    Answer: 
    """
    return prompt.strip()
