from langchain_core.prompts import PromptTemplate

RAG_PROMPT = PromptTemplate(
    input_variables=["context", "query"],
    template="""
        You are an intelligent assistant.
        Use ONLY the provided context to answer.
        Context:
        {context}
        Question:
        {question}
        If answer not found, say "I don't know".
    """,
)
