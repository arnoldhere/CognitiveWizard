from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any
from services.wizard_service import generate_wizard_content

router = APIRouter(prefix="/wizard", tags=["wizard"])


class WizardRawRequest(BaseModel):
    topic: str
    content_type: str
    details: Optional[str] = None


class WizardRawResponse(BaseModel):
    content: Dict[str, Any]


@router.post("/generate-raw", response_model=WizardRawResponse)
async def generate_raw_content(request: WizardRawRequest):
    # Step 1: Generate via LLM (No DB operations)
    success, data = generate_wizard_content(
        topic=request.topic, content_type=request.content_type, details=request.details
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate structured wizard content",
        )

    return {"content": data}
