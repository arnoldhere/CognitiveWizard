"""
RAG Query Log Model - Stores query logs for evaluation and monitoring.
Tracks query execution details including latency, contexts, and results.
"""

from sqlalchemy import Column, DateTime, Integer, String, Text, Float, JSON
from sqlalchemy.sql import func
from config.base import Base


class RAGQueryLog(Base):
    """
    Stores RAG query execution logs for evaluation and performance monitoring.

    Fields:
    - user_id: The user who made the query
    - session_id: Chat session identifier
    - question: The original user query
    - answer: Generated response
    - contexts: Retrieved context chunks (JSON array)
    - context_count: Number of contexts retrieved
    - latency_retrieval_ms: Time taken for context retrieval
    - latency_generation_ms: Time taken for answer generation
    - latency_total_ms: Total query execution time
    - sources: Document sources used (JSON)
    - metadata: Additional evaluation metadata
    - created_at: Timestamp of query execution
    """

    __tablename__ = "rag_query_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    session_id = Column(String(255), nullable=True, index=True)

    # Query and response
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    # Retrieved contexts
    contexts = Column(JSON, nullable=True)  # List of context chunks
    context_count = Column(Integer, default=0)

    # Latency measurements (in milliseconds)
    latency_retrieval_ms = Column(Float, nullable=True)
    latency_generation_ms = Column(Float, nullable=True)
    latency_total_ms = Column(Float, nullable=True)

    # Source information
    sources = Column(JSON, nullable=True)

    # Evaluation metrics cache
    metrics = Column(JSON, nullable=True)

    # Additional metadata
    log_metadata = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
