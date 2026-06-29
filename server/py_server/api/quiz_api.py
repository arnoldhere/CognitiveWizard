from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from services.quiz.quiz_generator import generate_quiz

router = APIRouter(prefix="/quiz", tags=["Quiz"])

class QuizRawRequest(BaseModel):
    topic: str
    difficulty: str
    num_questions: int = 5
    mode: Optional[str] = "langchain"

class QuizRawResponse(BaseModel):
    data: List[Dict[str, Any]]

@router.post("/generate-raw", response_model=QuizRawResponse)
def generate_raw_quiz(req: QuizRawRequest):
    success, quiz_data = generate_quiz(
        req.topic, req.difficulty, req.num_questions, QUIZ_MODEL_MODE=req.mode
    )

    if not success or not quiz_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quiz. Please try again.",
        )

    return {"data": quiz_data}
