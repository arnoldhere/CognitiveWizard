from datetime import datetime
from typing import Any, Dict, List

from config.settings import settings
from config.mongo import get_mongo_collection

# MongoDB collection name used for storing chat messages
COLLECTION_NAME = "chat_messages"


def _messages_collection():
    """
    Get the MongoDB collection instance for chat messages.
    Returns:
        Collection: MongoDB collection object.
    """
    collection = get_mongo_collection(COLLECTION_NAME)

    # Index for quick session-based retrieval
    collection.create_index("session_id")

    # Compound index for ordered chat history retrieval
    collection.create_index([("session_id", 1), ("created_at", 1)])

    return collection


def store_chat_message(
    session_id: str,
    user_id: int,
    role: str,
    content: str,
    metadata: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Store a single chat message in MongoDB.
    Args:
        session_id (str):
            Unique identifier for the chat session.
        user_id (int):
            ID of the user sending the message.
        role (str):
            Role of the message sender.
            Example: "user", "assistant", "system"
        content (str):
            Actual text content of the message.
        metadata (Dict[str, Any] | None):
            Optional additional information related to the message.
            Example:
                {
                    "model": "gpt-4",
                    "tokens": 120
                }
    Returns:
        Dict[str, Any]:
            Stored message document including generated MongoDB ID.
    """

    # Create message document
    message = {
        "session_id": session_id,
        "user_id": user_id,
        "role": role,
        "content": content,
        "metadata": metadata or {},
        "created_at": datetime.utcnow(),
    }

    # Insert document into MongoDB
    result = _messages_collection().insert_one(message)

    # Convert ObjectId to string for API-friendly response
    message["id"] = str(result.inserted_id)

    return message


def fetch_chat_history(session_id: str, limit: int = 500) -> List[Dict[str, Any]]:
    """
    Fetch chat history for a specific session.
    Messages are returned in chronological order

    Args:
        session_id (str):
            Unique identifier for the chat session.
        limit (int):
            Maximum number of messages to retrieve.
            Default is 500.
    Returns:
        List[Dict[str, Any]]:
            List of formatted chat messages.
            Example:
                [
                    {
                        "role": "user",
                        "content": "Hello",
                        "created_at": datetime(...),
                        "metadata": {}
                    }
                ]
    """

    # Query messages by session_id and sort oldest -> newest
    cursor = (
        _messages_collection()
        .find({"session_id": session_id})
        .sort("created_at", 1)
        .limit(limit)
    )

    # Format MongoDB documents into API-friendly response
    return [
        {
            "role": item.get("role", "user"),
            "content": item.get("content", ""),
            "created_at": item.get("created_at"),
            "metadata": item.get("metadata", {}),
        }
        for item in cursor
    ]


def delete_chat_history(session_id: str) -> int:
    """
    Delete all chat messages associated with a session.
    Args:
        session_id (str):
            Unique identifier for the chat session.
    Returns:
        int:
            Number of deleted messages.
    """

    # Remove all documents matching the session_id
    result = _messages_collection().delete_many({"session_id": session_id})

    return result.deleted_count
