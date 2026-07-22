"""
Pydantic schemas for reference agent input/output.

These schemas keep the graph state and API payloads explicit,
validated, and easy to evolve later.
"""

from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field, HttpUrl


class ReferenceQueryInput(BaseModel):
    """Input payload for reference search requests."""

    topic: str = Field(..., min_length=2, description="Main roadmap topic")
    skill_level: Optional[str] = Field(
        default=None, description="Beginner/intermediate/advanced"
    )
    goal: Optional[str] = Field(default=None, description="Learning goal or outcome")
    learning_style: Optional[Literal["visual", "theoretical", "interactive"]] = Field(
        default=None,
        description="Preferred learning style",
    )
    modules: list[str] = Field(
        default_factory=list, description="Roadmap module titles"
    )
    max_results_per_category: int = Field(default=3, ge=1, le=10)


class ResourceItem(BaseModel):
    """Single curated learning resource."""

    title: str = Field(..., description="Resource title")
    url: HttpUrl = Field(..., description="Canonical resource URL")
    description: Optional[str] = Field(
        default=None, description="Short summary/snippet"
    )
    source: str = Field(..., description="Provider or platform name")
    category: str = Field(
        ..., description="official_docs/article/youtube/practice/etc."
    )
    content_type: str = Field(..., description="docs/video/article/course/practice")
    relevance_score: float = Field(default=0.0, ge=0.0, le=1.0)
    module: Optional[str] = Field(default=None, description="Related roadmap module")


class ReferenceSearchResult(BaseModel):
    """Normalized output from the agent."""

    topic: str
    learning_style: Optional[str] = None
    resources: list[ResourceItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
