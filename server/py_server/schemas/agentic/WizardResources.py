from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field



class WizardResourceBase(BaseModel):
    content_id: int
    title: str = Field(..., max_length=500)
    url: str
    description: Optional[str] = None

    source: Optional[str] = Field(None, max_length=255)
    provider: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    content_type: Optional[str] = Field(None, max_length=100)
    domain: Optional[str] = Field(None, max_length=255)

    thumbnail: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = Field(None, max_length=10)

    relevance_score: Optional[float] = 0.0
    authority_score: Optional[float] = 0.0

    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class WizardResourceUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    url: Optional[str] = None
    description: Optional[str] = None

    source: Optional[str] = Field(None, max_length=255)
    provider: Optional[str] = Field(None, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    content_type: Optional[str] = Field(None, max_length=100)
    domain: Optional[str] = Field(None, max_length=255)

    thumbnail: Optional[str] = None
    published_at: Optional[datetime] = None
    language: Optional[str] = Field(None, max_length=10)

    relevance_score: Optional[float] = None
    authority_score: Optional[float] = None

    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class WizardResourceCreate(WizardResourceBase):
    pass


class WizardResourceResponse(WizardResourceBase):
    pass
