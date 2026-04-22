from pydantic import BaseModel
from typing import List, Optional


class RAGIngestRequest(BaseModel):
    documents: List[str]
    metadata: Optional[dict] = None
    user_id: Optional[str] = None


class RAGQueryRequest(BaseModel):
    query: str
    use_rag: Optional[bool] = True
    user_id: Optional[str] = None


class RAGResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = None
