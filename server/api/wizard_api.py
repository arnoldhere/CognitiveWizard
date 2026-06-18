from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from config.db import get_db
from models.user import User
from models.wizard import WizardContent
from schemas.wizard import WizardGenerateRequest, WizardContentResponse
from services.wizard_service import generate_wizard_content
from api.auth_api import get_current_active_user

router = APIRouter(prefix="/wizard", tags=["wizard"])


@router.post("/generate", response_model=WizardContentResponse)
async def generate_content(
    request: WizardGenerateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    # Step 1: Generate via LLM
    success, data = generate_wizard_content(
        topic=request.topic, content_type=request.content_type, details=request.details
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate structured wizard content",
        )

    # Step 2: Save to DB
    wizard_content = WizardContent(
        user_id=current_user.id,
        topic=request.topic,
        content_type=request.content_type,
        status="generated",
        content=data,
    )
    db.add(wizard_content)
    db.commit()
    db.refresh(wizard_content)

    return wizard_content


@router.get("/history", response_model=List[WizardContentResponse])
def get_wizard_history(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    records = (
        db.query(WizardContent)
        .filter(WizardContent.user_id == current_user.id)
        .order_by(WizardContent.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return records


@router.get("/{content_id}", response_model=WizardContentResponse)
def get_wizard_content(
    content_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    content = (
        db.query(WizardContent)
        .filter(
            WizardContent.id == content_id, WizardContent.user_id == current_user.id
        )
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.delete("/{content_id}")
def delete_wizard_content(
    content_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    content = (
        db.query(WizardContent)
        .filter(
            WizardContent.id == content_id, WizardContent.user_id == current_user.id
        )
        .first()
    )
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    db.delete(content)
    db.commit()
    return {"detail": "Content deleted successfully"}
