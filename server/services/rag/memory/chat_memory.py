from langchain_community.chat_message_histories import ChatMessageHistory

_store = {}


def get_memory(session_id: str):
    if session_id not in _store:
        _store[session_id] = ChatMessageHistory()
    return _store[session_id]
