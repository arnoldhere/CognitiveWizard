from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class WizardGenerateRequest(BaseModel):
    topic: str = Field(..., description="The main topic or subject")
    content_type: str = Field(..., description="The type of content to generate (e.g., plan, roadmap, schedule, course, curriculum, syllabus)")
    details: Optional[str] = Field(None, description="Any additional instructions, context, or requirements from the user")

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
