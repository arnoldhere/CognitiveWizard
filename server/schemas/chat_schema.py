from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = None
    initial_prompt: Optional[str] = None


class ChatSessionResponse(BaseModel):
    session_id: str
    title: str
    active: bool
    message_count: int
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    last_message_at: Optional[datetime] = None


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSessionResponse] = Field(default_factory=list)


class ChatSessionHistoryItem(BaseModel):
    role: str
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None


class ChatSessionHistoryResponse(BaseModel):
    session_id: str
    title: str
    messages: List[ChatSessionHistoryItem] = Field(default_factory=list)


class ChatSessionDeleteResponse(BaseModel):
    session_id: str
    deleted: bool
    active: bool
    message: str
