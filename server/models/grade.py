from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from db import Base


class Grade(Base):
    __tablename__ = "grades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    quiz_topic = Column(String(255), nullable=False, index=True)
    difficulty = Column(String(50), nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct_answers = Column(Integer, nullable=True)
    score_percentage = Column(Float, nullable=True)
    result = Column(String(20), nullable=False, default="pending", index=True)
    pass_threshold = Column(Float, nullable=False, default=60.0)
    question_set = Column(JSON, nullable=False)
    answer_key = Column(JSON, nullable=False)
    user_answers = Column(JSON, nullable=True)
    feedback = Column(JSON, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
