from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from config.db import get_db
from schemas.quiz_schema import (
    QuizRequest,
    QuizGenerateResponse,
    QuizSubmissionRequest,
    QuizSubmissionResult,
    QuizHistoryResponse,
)
from services.quiz.quiz_generator import generate_quiz
from services.quiz.grade_service import (
    create_quiz_session,
    get_quiz_session,
    evaluate_quiz_session,
    build_quiz_summary,
    get_paginated_results,
)
from api.auth_api import require_role

router = APIRouter(prefix="/quiz", tags=["Quiz"])


# =========================
# Generate Quiz
# =========================
@router.post("/generate", response_model=QuizGenerateResponse)
def create_quiz(
    req: QuizRequest,
    current_user=Depends(require_role(["user", "admin"])),
    db: Session = Depends(get_db),
):
    success, quiz_data = generate_quiz(
        req.topic, req.difficulty, req.num_questions, QUIZ_MODEL_MODE=req.mode
    )

    if not success or not quiz_data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate quiz. Please try again.",
        )

    quiz_session = create_quiz_session(
        db=db,
        current_user=current_user,
        topic=req.topic,
        difficulty=req.difficulty,
        generated_questions=quiz_data,
    )

    return {
        "status": "success",
        "data": {
            "quiz_id": quiz_session.id,
            "topic": quiz_session.quiz_topic,
            "difficulty": quiz_session.difficulty,
            "total_questions": quiz_session.total_questions,
            "questions": quiz_session.question_set,
        },
    }


# =========================
#  Submit Quiz
# =========================
@router.post("/submit", response_model=QuizSubmissionResult)
def submit_quiz(
    payload: QuizSubmissionRequest,
    current_user=Depends(require_role(["user", "admin"])),
    db: Session = Depends(get_db),
):
    quiz_session = get_quiz_session(db, payload.quiz_id, current_user.id)

    if not quiz_session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz session not found",
        )

    if quiz_session.result != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This quiz has already been submitted",
        )

    # Ensure all questions answered
    if len({a.question_id for a in payload.answers}) != quiz_session.total_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please answer every question before submitting",
        )

    evaluated_quiz = evaluate_quiz_session(
        db,
        quiz_session,
        [
            {
                "question_id": a.question_id,
                "selected_option": a.selected_option,
            }
            for a in payload.answers
        ],
    )

    return {
        "quiz_id": evaluated_quiz.id,
        "topic": evaluated_quiz.quiz_topic,
        "difficulty": evaluated_quiz.difficulty,
        "total_questions": evaluated_quiz.total_questions,
        "correct_answers": evaluated_quiz.correct_answers,
        "score_percentage": evaluated_quiz.score_percentage,
        "result": evaluated_quiz.result,
        "summary": build_quiz_summary(evaluated_quiz),
        "feedback": evaluated_quiz.feedback or [],
        "submitted_at": evaluated_quiz.submitted_at,
    }


# =========================
#  Quiz Results (Pagination + Filtering)
# =========================
@router.get("/results", response_model=QuizHistoryResponse)
def get_results(
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    sort_by: str = Query(
        default="submitted_at",
        pattern="^(submitted_at|score_percentage|result)$",
        description="Field to sort by",
    ),
    sort_order: str = Query(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort order",
    ),
    status_filter: str | None = Query(
        default=None,
        pattern="^(pass|fail)$",
        description="Filter by result status",
    ),
    topic_search: str | None = Query(
        default=None,
        description="Search quizzes by topic",
    ),
    current_user=Depends(require_role(["user", "admin"])),
    db: Session = Depends(get_db),
):
    results, total = get_paginated_results(
        db,
        current_user.id,
        skip=skip,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order,
        status_filter=status_filter,
        topic_search=topic_search,
    )

    history_items = [
        {
            "id": r.id,
            "quiz_topic": r.quiz_topic,
            "difficulty": r.difficulty,
            "result": r.result,
            "score_percentage": r.score_percentage,
            "submitted_at": r.submitted_at,
            "total_questions": r.total_questions,
            "correct_answers": r.correct_answers,
        }
        for r in results
    ]

    return {
        "data": history_items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 0,
    }
