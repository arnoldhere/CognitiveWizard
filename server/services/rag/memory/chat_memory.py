from langchain_classic.memory import ConversationBufferMemory


def get_memory():
    """
    Stores chat history(short term context)
    WHY:
    - Enables conversational continuity
    """
    return ConversationBufferMemory(memory_key="chat_history", return_messages=True)
