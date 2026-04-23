from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class RAGIngestRequest(BaseModel):
    documents: List[str]
    metadata: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None


class RAGQueryRequest(BaseModel):
    query: str
    use_rag: Optional[bool] = True
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class RAGSource(BaseModel):
    id: int
    title: str
    snippet: str
    score: float


class RAGResponse(BaseModel):
    answer: str
    mode_used: str = Field(description="rag or llm")
    sources: List[RAGSource] = Field(default_factory=list)
    warning: Optional[str] = None
    token_usage: Optional[Dict[str, int]] = Field(
        default=None, description="Token usage statistics"
    )
    chat_limit_info: Optional[Dict[str, Any]] = Field(
        default=None, description="Chat message limit information"
    )


class RAGUploadResponse(BaseModel):
    status: str
    filename: str
    chunks: int
    ready_for_rag: bool
    uploaded_documents: List[str] = Field(default_factory=list)


class RAGStatusResponse(BaseModel):
    ready_for_rag: bool
    documents_ingested: int
    chunks_ingested: int
    recent_chunks: List[str] = Field(default_factory=list)
    uploaded_documents: List[str] = Field(
        default_factory=list, description="List of uploaded document titles"
    )
    chat_limit_info: Optional[Dict[str, Any]] = Field(
        default=None, description="Current per-user chat limit status"
    )
