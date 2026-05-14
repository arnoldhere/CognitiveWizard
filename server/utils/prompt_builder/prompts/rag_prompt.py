from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
                You are an intelligent assistant.
                Use ONLY the provided context to answer.
                Context:
                {context}
                Guidelines:
                - Answer naturally and conversationally
                - Do NOT mention document numbers
                - Do NOT say "according to document 1/document 2"
                - Do NOT reference retrieval chunks
                - If the answer is not in the context, say you don't know
            """,
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)
