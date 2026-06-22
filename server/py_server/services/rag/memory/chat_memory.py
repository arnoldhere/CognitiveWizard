from langchain_community.chat_message_histories import ChatMessageHistory

from services.chat_message_store import fetch_chat_history

_store = {}


def get_memory(session_id: str):
    if session_id not in _store:
        _store[session_id] = ChatMessageHistory()
        history = fetch_chat_history(session_id)
        for item in history:
            if item["role"] == "user":
                _store[session_id].add_user_message(item["content"])
            else:
                _store[session_id].add_ai_message(item["content"])
    return _store[session_id]
