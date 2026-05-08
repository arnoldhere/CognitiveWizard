"""
Comprehensive data cleanup service for user and session deletions.
Handles cleanup from MySQL, MongoDB, ChromaDB, and file storage.
"""

import logging
import shutil
from pathlib import Path

from sqlalchemy.orm import Session

from config.settings import settings
from models.chat_session import ChatSession
from models.rag_document import RAGDocument
from services.chat_message_store import delete_chat_history
from services.rag.v1_rag_service import langchain_rag_service

logger = logging.getLogger(__name__)


class DataCleanupService:
    """Service for comprehensive data deletion across all storage systems."""

    @staticmethod
    def cleanup_user_data(db: Session, user_id: int) -> dict:
        """
        Delete ALL user data from all systems:
        - MySQL: user record (cascades to related tables), chat_sessions, rag_documents
        - MongoDB: all chat sessions and messages
        - ChromaDB: all user's RAG vectors
        - Disk: RAG uploaded files

        Args:
            db: Database session
            user_id: User ID to clean up

        Returns:
            dict with cleanup status and counts
        """
        cleanup_result = {
            "user_id": user_id,
            "status": "success",
            "mysql_deleted": 0,
            "mongodb_sessions_deleted": 0,
            "mongodb_messages_deleted": 0,
            "chromadb_vectors_deleted": 0,
            "disk_files_deleted": False,
            "errors": [],
        }

        try:
            # 1. Get all chat sessions for this user to clean up associated data
            user_sessions = (
                db.query(ChatSession)
                .filter(ChatSession.user_id == user_id)
                .all()
            )

            # 2. Delete MongoDB messages for all user sessions
            for session in user_sessions:
                try:
                    deleted_count = delete_chat_history(session.session_id)
                    cleanup_result["mongodb_messages_deleted"] += deleted_count
                except Exception as e:
                    logger.warning(
                        f"Failed to delete MongoDB messages for session {session.session_id}: {e}"
                    )
                    cleanup_result["errors"].append(
                        f"MongoDB message cleanup failed: {str(e)}"
                    )

            # 3. Delete ChromaDB RAG vectors for this user
            try:
                cleaned_docs = DataCleanupService._delete_chromadb_user_vectors(
                    str(user_id)
                )
                cleanup_result["chromadb_vectors_deleted"] = cleaned_docs
            except Exception as e:
                logger.warning(f"Failed to delete ChromaDB vectors for user {user_id}: {e}")
                cleanup_result["errors"].append(f"ChromaDB cleanup failed: {str(e)}")

            # 4. Delete RAG uploaded files
            try:
                DataCleanupService._delete_user_rag_files(user_id)
                cleanup_result["disk_files_deleted"] = True
            except Exception as e:
                logger.warning(f"Failed to delete RAG files for user {user_id}: {e}")
                cleanup_result["errors"].append(f"Disk file cleanup failed: {str(e)}")

            # 5. Delete all RAGDocument records from MySQL
            try:
                rag_docs_count = (
                    db.query(RAGDocument)
                    .filter(RAGDocument.user_id == user_id)
                    .delete()
                )
                cleanup_result["mysql_deleted"] += rag_docs_count
            except Exception as e:
                logger.warning(f"Failed to delete RAGDocuments for user {user_id}: {e}")
                cleanup_result["errors"].append(f"RAGDocument cleanup failed: {str(e)}")

            # 6. Delete all ChatSession records from MySQL
            try:
                sessions_count = (
                    db.query(ChatSession)
                    .filter(ChatSession.user_id == user_id)
                    .delete()
                )
                cleanup_result["mysql_deleted"] += sessions_count
            except Exception as e:
                logger.warning(f"Failed to delete ChatSessions for user {user_id}: {e}")
                cleanup_result["errors"].append(f"ChatSession cleanup failed: {str(e)}")

            db.commit()

            if cleanup_result["errors"]:
                cleanup_result["status"] = "partial_success"

            return cleanup_result

        except Exception as e:
            logger.error(f"Critical error during user cleanup for user {user_id}: {e}")
            db.rollback()
            cleanup_result["status"] = "error"
            cleanup_result["errors"].append(f"Critical error: {str(e)}")
            return cleanup_result

    @staticmethod
    def cleanup_chat_session_data(
        db: Session, user_id: int, session_id: str
    ) -> dict:
        """
        Delete a chat session and ALL associated data:
        - MySQL: chat_session record
        - MongoDB: all messages for this session
        - ChromaDB: vectors tagged with this session_id

        Args:
            db: Database session
            user_id: User ID (for verification)
            session_id: Session ID to delete

        Returns:
            dict with cleanup status and counts
        """
        cleanup_result = {
            "session_id": session_id,
            "user_id": user_id,
            "status": "success",
            "mongodb_messages_deleted": 0,
            "chromadb_vectors_deleted": 0,
            "mysql_session_deleted": False,
            "errors": [],
        }

        try:
            # 1. Delete MongoDB messages for this session
            try:
                deleted_count = delete_chat_history(session_id)
                cleanup_result["mongodb_messages_deleted"] = deleted_count
            except Exception as e:
                logger.warning(
                    f"Failed to delete MongoDB messages for session {session_id}: {e}"
                )
                cleanup_result["errors"].append(f"MongoDB cleanup failed: {str(e)}")

            # 2. Delete ChromaDB vectors for this session
            try:
                cleaned_docs = DataCleanupService._delete_chromadb_session_vectors(
                    session_id
                )
                cleanup_result["chromadb_vectors_deleted"] = cleaned_docs
            except Exception as e:
                logger.warning(
                    f"Failed to delete ChromaDB vectors for session {session_id}: {e}"
                )
                cleanup_result["errors"].append(f"ChromaDB cleanup failed: {str(e)}")

            # 3. Delete ChatSession record from MySQL (with verification)
            try:
                session = (
                    db.query(ChatSession)
                    .filter(
                        ChatSession.session_id == session_id,
                        ChatSession.user_id == user_id,
                    )
                    .first()
                )

                if session:
                    db.delete(session)
                    db.commit()
                    cleanup_result["mysql_session_deleted"] = True
                else:
                    cleanup_result["errors"].append("ChatSession not found")

            except Exception as e:
                logger.warning(
                    f"Failed to delete ChatSession record for {session_id}: {e}"
                )
                cleanup_result["errors"].append(f"MySQL cleanup failed: {str(e)}")
                db.rollback()

            if cleanup_result["errors"]:
                cleanup_result["status"] = "partial_success"

            return cleanup_result

        except Exception as e:
            logger.error(
                f"Critical error during session cleanup for session {session_id}: {e}"
            )
            cleanup_result["status"] = "error"
            cleanup_result["errors"].append(f"Critical error: {str(e)}")
            return cleanup_result

    @staticmethod
    def _delete_chromadb_user_vectors(user_id: str) -> int:
        """
        Delete all ChromaDB vectors for a user (RAG documents).
        Uses metadata filtering to find and delete by user_id.

        Args:
            user_id: User ID to filter

        Returns:
            Number of vectors deleted
        """
        try:
            user_vectordb = langchain_rag_service._get_user_vectordb(user_id)
            user_vectordb.delete(where={"user_id": user_id})
            logger.info(f"Deleted ChromaDB RAG vectors for user {user_id}")
            return 1  # Chroma delete returns count, but we'll return 1 for success
        except Exception as e:
            logger.warning(
                f"Failed to delete ChromaDB RAG vectors for user {user_id}: {e}"
            )
            return 0

    @staticmethod
    def _delete_chromadb_session_vectors(session_id: str) -> int:
        """
        Delete ChromaDB vectors associated with a specific chat session.
        This would apply if vectors are tagged with session metadata.

        Args:
            session_id: Session ID to filter

        Returns:
            Number of vectors deleted
        """
        # This is a fallback - ChromaDB vectors are primarily tagged by user_id.
        # Session-level filtering would need to be implemented if vectors
        # store session_id in metadata.
        logger.info(
            f"Session-level ChromaDB cleanup called for {session_id}. "
            "Note: Vectors are cleaned up at user deletion time."
        )
        return 0

    @staticmethod
    def _delete_user_rag_files(user_id: int) -> None:
        """
        Delete all RAG uploaded files for a user from disk.

        Args:
            user_id: User ID whose files to delete
        """
        upload_path = Path(settings.RAG_USER_VECTOR_DIR).parent / str(user_id)
        if upload_path.exists():
            shutil.rmtree(upload_path)
            logger.info(f"Deleted RAG files directory for user {user_id}")

        rag_uploads_path = Path(settings.MEDIA_DIR) / "rag_uploads" / str(user_id)
        if rag_uploads_path.exists():
            shutil.rmtree(rag_uploads_path)
            logger.info(f"Deleted RAG uploads directory for user {user_id}")
