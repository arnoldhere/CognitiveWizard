"""
Instrumented RAG Chain - Wraps existing RAG chains to capture metrics and log queries.

This module provides a wrapper that:
1. Measures retrieval and generation latency
2. Captures contexts and answer for evaluation
3. Persists query logs to database for later batch evaluation
4. Maintains API compatibility with existing RAG service
"""

import logging
import time
from typing import Optional, Dict, List, Any
from datetime import datetime
from sqlalchemy.orm import Session
import json

logger = logging.getLogger(__name__)


class InstrumentedRAGChain:
    """
    Wrapper around RAG chains that instruments query execution.

    Captures:
    - Query execution latency (retrieval + generation)
    - Retrieved contexts
    - Generated answer
    - Source documents

    Persists logs to database for batch evaluation.
    """

    def __init__(self, rag_service, db_session: Optional[Session] = None):
        """
        Initialize instrumented chain.

        Args:
            rag_service: The underlying RAG service to wrap
            db_session: Optional database session for logging
        """
        self.rag_service = rag_service
        self.db_session = db_session

    def query(
        self,
        query: str,
        use_rag: bool = True,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        db: Optional[Session] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Execute RAG query with instrumentation.

        Args:
            query: The user's query
            use_rag: Whether to use RAG or fallback to LLM
            user_id: The user ID
            session_id: Chat session ID
            db: Database session for logging
            **kwargs: Additional arguments for the RAG service

        Returns:
            Query result with instrumentation metadata
        """

        start_time = time.time()
        retrieval_start = start_time

        try:
            # Call the underlying RAG service
            result = self.rag_service.query(
                query=query,
                use_rag=use_rag,
                user_id=user_id,
                session_id=session_id,
                db=db,
                **kwargs,
            )

            # Calculate latencies
            total_time = time.time() - start_time
            retrieval_time = (
                result.get("_retrieval_ms", 0) or 100
            )  # Estimate if not provided
            generation_time = total_time * 1000 - retrieval_time

            # Add instrumentation metadata to result
            result["_latency"] = {
                "retrieval_ms": retrieval_time,
                "generation_ms": max(generation_time, 0),
                "total_ms": total_time * 1000,
            }

            # Log query to database
            if user_id and db:
                self._log_query_to_db(
                    db=db,
                    user_id=int(user_id),
                    session_id=session_id,
                    query=query,
                    answer=result.get("answer", ""),
                    contexts=result.get("sources", []),
                    latency_retrieval_ms=retrieval_time,
                    latency_generation_ms=max(generation_time, 0),
                )

            return result

        except Exception as e:
            logger.error(f"Instrumented query failed: {e}")
            raise

    def _log_query_to_db(
        self,
        db: Session,
        user_id: int,
        session_id: Optional[str],
        query: str,
        answer: str,
        contexts: List[Dict[str, Any]],
        latency_retrieval_ms: float,
        latency_generation_ms: float,
    ) -> None:
        """
        Log query execution to database.

        Args:
            db: Database session
            user_id: User ID
            session_id: Chat session ID
            query: The query text
            answer: The generated answer
            contexts: Retrieved contexts (list of source dicts)
            latency_retrieval_ms: Retrieval latency in ms
            latency_generation_ms: Generation latency in ms
        """
        try:
            from models.rag_log import RAGQueryLog

            # Format contexts for storage
            context_texts = []
            source_titles = []

            if contexts:
                for ctx in contexts:
                    if isinstance(ctx, dict):
                        if "snippet" in ctx:
                            context_texts.append(ctx["snippet"])
                        if "title" in ctx:
                            source_titles.append(ctx["title"])
                    elif isinstance(ctx, str):
                        context_texts.append(ctx)

            # Create log entry
            log_entry = RAGQueryLog(
                user_id=user_id,
                session_id=session_id,
                question=query,
                answer=answer,
                contexts=context_texts,
                context_count=len(context_texts),
                latency_retrieval_ms=latency_retrieval_ms,
                latency_generation_ms=latency_generation_ms,
                latency_total_ms=latency_retrieval_ms + latency_generation_ms,
                sources={"titles": source_titles},
                log_metadata={"created_by": "instrumented_chain"},
            )

            db.add(log_entry)
            db.commit()
            logger.debug(f"Logged query for user {user_id}")

        except Exception as e:
            logger.warning(f"Failed to log query to database: {e}")
            try:
                db.rollback()
            except Exception:
                pass
