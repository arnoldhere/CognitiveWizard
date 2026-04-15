from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class QuizRequest(BaseModel):
    topic: str
    difficulty: str
    num_questions: int = 5
    mode: str = "api"


class QuizQuestion(BaseModel):
    question_id: int
    question: str
    options: list[str]


class QuizGenerateData(BaseModel):
    quiz_id: int
    topic: str
    difficulty: str
    total_questions: int
    questions: list[QuizQuestion]


class QuizGenerateResponse(BaseModel):
    status: str
    data: QuizGenerateData


class QuizAnswerSubmission(BaseModel):
    question_id: int
    selected_option: str


class QuizSubmissionRequest(BaseModel):
    quiz_id: int
    answers: list[QuizAnswerSubmission]


class QuizQuestionFeedback(BaseModel):
    question_id: int
    question: str
    selected_option: Optional[str] = None
    correct_answer: str
    is_correct: bool
    feedback: str


class QuizSubmissionResult(BaseModel):
    quiz_id: int
    topic: str
    difficulty: str
    total_questions: int
    correct_answers: int
    score_percentage: float
    result: str
    summary: str
    feedback: list[QuizQuestionFeedback]
    submitted_at: datetime


class QuizHistoryItem(BaseModel):
    id: int
    quiz_topic: str
    difficulty: Optional[str] = None
    result: str
    score_percentage: Optional[float] = None
    submitted_at: Optional[datetime] = None
    total_questions: Optional[int] = None
    correct_answers: Optional[int] = None


class QuizHistoryResponse(BaseModel):
    data: list[QuizHistoryItem]
    total: int
    skip: int
    limit: int
    pages: int
