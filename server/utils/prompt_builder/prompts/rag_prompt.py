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
                Use previous conversation if relevant.
                If the answer is not found, say "I don't know".
            """,
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)
