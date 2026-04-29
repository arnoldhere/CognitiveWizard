from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

RAG_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an intelligent assistant.
                Use ONLY the provided context to answer.
                Use previous conversation if relevant before answering.
                If the answer is not found in the context, say "I don't know".  
            """,
        ),
        MessagesPlaceholder(variable_name="chat_history"),  #  memory injected here
        (
            "human",
            """Context:
                {context}
                Question:
                {query}
            """,
        ),
    ]
)
