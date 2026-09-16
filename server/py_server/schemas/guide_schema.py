"""
schemas/guide_schema.py
======================
Pydantic v2 schemas for the Agentic Guide Generation pipeline.
Enforces 100% backward compatibility with the existing Guide frontend viewer
and database persistence layer.
"""

from __future__ import annotations
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class GuideTopicSchema(BaseModel):
    name: str = Field(..., min_length=2, description="Topic or step name")
    details: str = Field(..., min_length=10, description="Step-by-step instructions, concept explanation, or code snippet")
    tips: List[str] = Field(default_factory=list, description="Best practice tips and performance recommendations")
    common_mistakes: List[str] = Field(default_factory=list, description="Common pitfalls and how to prevent or resolve them")


class GuideModuleSchema(BaseModel):
    title: str = Field(..., min_length=3, description="Section or module title")
    description: str = Field(default="", description="High-level description of what this module accomplishes")
    estimated_time: str = Field(default="30 minutes", description="Estimated reading or practice time")
    topics: List[GuideTopicSchema] = Field(default_factory=list, min_length=1)


class GuidePlanSchema(BaseModel):
    """Output of Guide Planner Node (curriculum structure, tools, and reading time)."""
    title: str = Field(..., min_length=3)
    description: str = Field(..., min_length=10)
    target_audience: str = Field(default="General Learners")
    summary: Optional[str] = Field(default="")
    tools_required: List[str] = Field(default_factory=list)
    reading_time_minutes: int = Field(default=20, ge=1)
    modules: List[GuideModuleSchema] = Field(default_factory=list)


class GuideReviewResultSchema(BaseModel):
    """Output of Educational Reviewer Node."""
    status: str = Field(default="passed", description="passed or needs_revision")
    clarity_score: float = Field(default=0.9, ge=0.0, le=1.0)
    suggestions: List[str] = Field(default_factory=list)
    reviewed_modules_count: int = Field(default=0)


class GuideSchema(BaseModel):
    """
    Final assembled Guide package.
    Matches the schema expected by the React Guide viewer and database tables.
    """
    content_type: str = Field(default="guide")
    title: str = Field(..., min_length=3)
    description: str = Field(default="")
    target_audience: str = Field(default="General Learners")
    summary: str = Field(default="")
    guide_style: Optional[str] = Field(default="Step-by-step tutorial")
    reading_time_minutes: int = Field(default=20, ge=1)
    tools_required: List[str] = Field(default_factory=list)
    modules: List[GuideModuleSchema] = Field(default_factory=list)
    body_markdown: Optional[str] = Field(default=None)
    references: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    warnings: List[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def normalize_guide_data(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data

        # Normalize reading time
        if "reading_time_minutes" not in data or not data["reading_time_minutes"]:
            # Approximate: ~5 mins per module
            mod_count = len(data.get("modules") or [])
            data["reading_time_minutes"] = max(mod_count * 5, 15)

        return data
