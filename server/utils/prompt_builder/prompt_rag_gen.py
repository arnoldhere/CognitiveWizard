def prompt_rag_gen(context, query):
    prompt = f"""
    You are a super intelligent assistant.
    Use the context below to answer the question.
    context: 
    {context}
    Question: {query}
    Answer: 
    """
    return prompt.strip()
