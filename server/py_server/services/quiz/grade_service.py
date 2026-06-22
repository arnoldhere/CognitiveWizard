from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from models.grade import Grade
from models.user import User

PASS_THRESHOLD = 60.0


def get_time_limit_seconds(total_questions: int) -> int:
    """
    Calculate practical exam time limit based on question count.

    Time allocation strategy:
    - 5 questions: 8 minutes (96 seconds per question)
    - 10 questions: 15 minutes (90 seconds per question)
    - 15 questions: 20 minutes (80 seconds per question)
    - 20 questions: 30 minutes (90 seconds per question)
    - 20+ questions: scales in +8 minute blocks per 5 questions

    Args:
        total_questions: Number of questions in the quiz

    Returns:
        Time limit in seconds
    """
    if total_questions <= 5:
        return 8 * 60
    if total_questions <= 10:
        return 15 * 60
    if total_questions <= 15:
        return 20 * 60
    if total_questions <= 20:
        return 30 * 60

    # For larger sets, add 8 extra minutes for every next block of 5 questions.
    extra_blocks = (total_questions - 20 + 4) // 5
    return (30 + (extra_blocks * 8)) * 60


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
        time_limit_seconds=get_time_limit_seconds(len(question_set)),
        question_set=question_set,
        answer_key=answer_key,
        started_at=datetime.now(timezone.utc),
    )

    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def get_quiz_session(db: Session, quiz_id: int, user_id: int) -> Grade | None:
    return db.query(Grade).filter(Grade.id == quiz_id, Grade.user_id == user_id).first()


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
        query = query.filter(Grade.quiz_topic.ilike(f"%{topic_search}%"))

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
    db: Session,
    grade: Grade,
    submitted_answers: list[dict],
    is_auto_submitted: bool = False,
) -> Grade:
    """
    Evaluate a quiz session and calculate score, feedback, and results.

    Args:
        db: Database session
        grade: Grade model instance with quiz metadata
        submitted_answers: List of submitted answers with question_id and selected_option
        is_auto_submitted: Flag indicating auto-submission due to timeout

    Returns:
        Updated Grade model with evaluation results

    Raises:
        ValueError: If manual submission is incomplete (missing required answers)
    """
    # Build lookup dictionaries for efficient access
    answer_lookup = {
        item["question_id"]: str(item["answer"]).strip()
        for item in grade.answer_key or []
    }
    question_lookup = {item["question_id"]: item for item in grade.question_set or []}
    submitted_lookup = {}

    # Process submitted answers, handling None/empty values
    for answer in submitted_answers:
        question_id = answer["question_id"]
        selected = answer.get("selected_option") or ""
        submitted_lookup[question_id] = str(selected).strip()

    # Validate completeness: only enforce for manual submissions
    expected_ids = set(question_lookup.keys())
    submitted_ids = {qid for qid in submitted_lookup if submitted_lookup[qid]}

    if not is_auto_submitted and submitted_ids != expected_ids:
        raise ValueError("Incomplete or invalid quiz submission")
    # Calculate score and generate feedback
    correct_answers = 0
    feedback_items = []

    for question_id in sorted(question_lookup):
        question = question_lookup[question_id]
        selected_option = submitted_lookup.get(question_id, "").strip() or None
        correct_answer = answer_lookup.get(question_id, "")

        # Determine correctness: only correct if answer matches exactly
        is_correct = selected_option and selected_option == correct_answer

        if is_correct:
            correct_answers += 1

        # Generate contextual feedback based on answer status
        if not selected_option:
            feedback_text = "No answer selected. Review this concept and try again."
        elif is_correct:
            feedback_text = "Correct! You handled this question well."
        else:
            feedback_text = f"Incorrect. The correct answer is '{correct_answer}'. Review this concept."

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

    # Calculate score percentage and pass/fail result
    if grade.total_questions > 0:
        score_percentage = round((correct_answers / grade.total_questions) * 100, 2)
    else:
        score_percentage = 0.0

    result = "pass" if score_percentage >= grade.pass_threshold else "fail"

    # Persist evaluation results
    grade.correct_answers = correct_answers
    grade.score_percentage = score_percentage
    grade.result = result
    grade.user_answers = [
        {
            "question_id": question_id,
            "selected_option": submitted_lookup.get(question_id) or "",
        }
        for question_id in sorted(question_lookup)
    ]
    grade.feedback = feedback_items
    grade.submitted_at = datetime.now(timezone.utc)

    # Calculate time taken from started_at to submitted_at
    if grade.started_at and grade.submitted_at:
        try:
            started = _ensure_utc(grade.started_at)
            submitted = _ensure_utc(grade.submitted_at)
            elapsed_seconds = max(0, int((submitted - started).total_seconds()))
            # Cap time_taken at time_limit_seconds to handle edge cases
            grade.time_taken = min(elapsed_seconds, grade.time_limit_seconds)
        except (TypeError, ValueError) as e:
            # Fallback if datetime calculation fails
            print(f"Warning: Failed to calculate time_taken: {e}")
            grade.time_taken = None
    else:
        # If timing data is incomplete, don't set time_taken
        grade.time_taken = None

    db.add(grade)
    db.commit()
    db.refresh(grade)
    return grade


def _ensure_utc(dt: datetime) -> datetime:
    """
    Ensure a datetime object is timezone-aware and in UTC.

    Args:
        dt: Datetime object (timezone-aware or naive)

    Returns:
        Timezone-aware datetime in UTC

    Raises:
        TypeError: If dt is not a datetime object
    """
    if dt is None:
        return None
    if not isinstance(dt, datetime):
        raise TypeError(f"Expected datetime object, got {type(dt)}")
    if dt.tzinfo is None:
        # Assume naive datetimes are UTC
        return dt.replace(tzinfo=timezone.utc)
    # Convert to UTC if already timezone-aware
    return dt.astimezone(timezone.utc)


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
