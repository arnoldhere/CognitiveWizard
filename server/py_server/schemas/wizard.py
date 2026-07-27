from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime


class WizardGenerateRequest(BaseModel):
    topic: str = Field(..., description="The main topic or subject")
    content_type: str = Field(
        ...,
        description="The type of content to generate (e.g., plan, roadmap, schedule, course, curriculum, syllabus)",
    )
    details: Optional[str] = Field(
        None,
        description="Any additional instructions, context, or requirements from the user",
    )
    user_role: Optional[str] = Field("user", description="The role of the requesting user (user/tutor/admin)")


class WizardContentResponse(BaseModel):
    id: int
    user_id: int
    topic: str
    content_type: str
    status: str
    content: Dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WizardRawRequest(BaseModel):
    topic: str
    content_type: str
    details: Optional[str] = None
    skill_level: Optional[str] = None
    goal: Optional[str] = None
    learning_style: Optional[str] = None
    user_role: Optional[str] = "user"


class WizardRawResponse(BaseModel):
    content: Dict[str, Any]
    warnings: Optional[list[str]] = None


class WizardPdfExportRequest(BaseModel):
    topic: str
    content_type: str = "roadmap"
    details: Optional[str] = None
    content: Dict[str, Any]
    skill_level: Optional[str] = None
    goal: Optional[str] = None
    learning_style: Optional[str] = None
    user_role: Optional[str] = "user"
