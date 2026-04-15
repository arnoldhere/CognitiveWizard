from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_
from models.grade import Grade
from models.user import User

PASS_THRESHOLD = 60.0


def _normalize_answer(answer: str, options: list[str]) -> str:
    answer_value = str(answer).strip()
    for option in options:
        normalized_option = str(option).strip()
        if normalized_option.lower() == answer_value.lower():
            return normalized_option
    return answer_value


def create_quiz_session(
    db: Session,
    current_user: User,
    topic: str,
    difficulty: str,
    generated_questions: list[dict],
) -> Grade:
    question_set = []
    answer_key = []

    for index, question in enumerate(generated_questions, start=1):
        options = [str(option).strip() for option in question["options"]]
        answer = _normalize_answer(question["answer"], options)

        question_set.append(
            {
                "question_id": index,
                "question": str(question["question"]).strip(),
                "options": options,
            }
        )
        answer_key.append({"question_id": index, "answer": answer})

    grade = Grade(
        user_id=current_user.id,
        quiz_topic=topic.strip(),
        difficulty=difficulty.strip(),
        total_questions=len(question_set),
        result="pending",
        pass_threshold=PASS_THRESHOLD,
        question_set=question_set,
        answer_key=answer_key,
    )

    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def get_quiz_session(db: Session, quiz_id: int, user_id: int) -> Grade | None:
    return (
        db.query(Grade)
        .filter(Grade.id == quiz_id, Grade.user_id == user_id)
        .first()
    )


def list_completed_results(db: Session, user_id: int) -> list[Grade]:
    return (
        db.query(Grade)
        .filter(
            Grade.user_id == user_id,
            Grade.result.in_(["pass", "fail"]),
        )
        .order_by(Grade.submitted_at.desc(), Grade.created_at.desc())
        .all()
    )


def get_paginated_results(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 10,
    sort_by: str = "submitted_at",
    sort_order: str = "desc",
    status_filter: str = None,
    topic_search: str = None,
) -> tuple[list[Grade], int]:
    """Get paginated, filtered, and sorted quiz results."""
    query = db.query(Grade).filter(
        Grade.user_id == user_id,
        Grade.result.in_(["pass", "fail"]),
    )

    # Apply status filter
    if status_filter and status_filter in ["pass", "fail"]:
        query = query.filter(Grade.result == status_filter)

    # Apply topic search
    if topic_search:
        query = query.filter(
            Grade.quiz_topic.ilike(f"%{topic_search}%")
        )

    # Get total before pagination
    total = query.count()

    # Apply sorting
    sort_column = getattr(Grade, sort_by, Grade.submitted_at)
    if sort_order == "asc":
        query = query.order_by(asc(sort_column))
    else:
        query = query.order_by(desc(sort_column))

    # Apply pagination
    results = query.offset(skip).limit(limit).all()

    return results, total


def evaluate_quiz_session(
    db: Session, grade: Grade, submitted_answers: list[dict]
) -> Grade:
    answer_lookup = {
        item["question_id"]: str(item["answer"]).strip() for item in grade.answer_key or []
    }
    question_lookup = {
        item["question_id"]: item for item in grade.question_set or []
    }
    submitted_lookup = {}

    for answer in submitted_answers:
        submitted_lookup[answer["question_id"]] = str(answer["selected_option"]).strip()

    correct_answers = 0
    feedback_items = []

    for question_id in sorted(question_lookup):
        question = question_lookup[question_id]
        selected_option = submitted_lookup.get(question_id)
        correct_answer = answer_lookup.get(question_id, "")
        is_correct = selected_option == correct_answer

        if is_correct:
            correct_answers += 1

        if not selected_option:
            feedback_text = "No answer selected. Review this concept and try again."
        elif is_correct:
            feedback_text = "Correct answer. You handled this question well."
        else:
            feedback_text = (
                f"Incorrect answer. Review why '{correct_answer}' is the better choice."
            )

        feedback_items.append(
            {
                "question_id": question_id,
                "question": question["question"],
                "selected_option": selected_option,
                "correct_answer": correct_answer,
                "is_correct": is_correct,
                "feedback": feedback_text,
            }
        )

    score_percentage = round((correct_answers / grade.total_questions) * 100, 2)
    result = "pass" if score_percentage >= grade.pass_threshold else "fail"

    grade.correct_answers = correct_answers
    grade.score_percentage = score_percentage
    grade.result = result
    grade.user_answers = [
        {
            "question_id": question_id,
            "selected_option": submitted_lookup.get(question_id),
        }
        for question_id in sorted(question_lookup)
    ]
    grade.feedback = feedback_items
    grade.submitted_at = datetime.now(timezone.utc)

    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def build_quiz_summary(grade: Grade) -> str:
    if grade.result == "pass":
        return (
            f"You passed this {grade.quiz_topic} quiz with {grade.correct_answers} out of "
            f"{grade.total_questions} correct."
        )

    return (
        f"You did not pass this {grade.quiz_topic} quiz yet. "
        f"You got {grade.correct_answers} out of {grade.total_questions} correct."
    )
