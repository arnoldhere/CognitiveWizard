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
                If the answer is not in the context, say you don't know
            """,
        ),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "{input}"),
    ]
)
