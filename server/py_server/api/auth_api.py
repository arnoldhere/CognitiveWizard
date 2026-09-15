"""
api/auth_api.py
================
Endpoints for user profile and AI data lifecycle operations.
"""

import logging
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status
from services.rag.v1_rag_service import langchain_rag_service
from services.chat_message_store import _messages_collection
from config.chroma_index import chroma_service
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.delete("/profile/data-raw/{user_id}")
def delete_user_ai_data(user_id: str) -> Dict[str, Any]:
    """
    Purge all AI data for the deleting user across all sources:
    - ChromaDB vector store collections and on-disk user vector directories
    - In-memory RAG retrievers, chains, and document chunk caches
    - Uploaded files in media/rag_uploads/{user_id}
    - User metadata JSON in vectorDB/rag_user_data/{user_id}.json
    - MongoDB chat messages for this user
    """
    logger.info("[AUTH API] Request to purge AI/vector/chat data for user_id=%s", user_id)
    try:
        # 1. Purge RAG vector store, upload files, in-memory caches, and metadata
        rag_cleanup = langchain_rag_service.delete_user_knowledge_base(user_id)

        # 2. Purge auxiliary collections in ChromaVectorService if present
        chroma_fallback_deleted = False
        try:
            col_name = f"{settings.RAG_CHROMA_COLLECTION_PREFIX}_{user_id}"
            chroma_service._client.delete_collection(col_name)
            chroma_fallback_deleted = True
        except Exception:
            pass

        # 3. Purge MongoDB chat history for the user
        user_ids = [str(user_id)]
        try:
            user_ids.append(int(user_id))
        except (ValueError, TypeError):
            pass

        mongo_result = _messages_collection().delete_many({"user_id": {"$in": user_ids}})
        deleted_chat_count = getattr(mongo_result, "deleted_count", 0)

        logger.info(
            "[AUTH API] User %s data purge completed. Deleted %d chat messages.",
            user_id,
            deleted_chat_count,
        )

        return {
            "status": "success",
            "message": f"Successfully deleted all AI data, vector embeddings, uploaded files, and {deleted_chat_count} chat messages for user {user_id}.",
            "details": {
                "rag": rag_cleanup,
                "chroma_fallback_deleted": chroma_fallback_deleted,
                "deleted_chat_messages": deleted_chat_count,
            },
        }
    except Exception as exc:
        logger.exception("Failed to purge AI data for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to purge AI data for user {user_id}: {str(exc)}",
        )
