from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON
from config.base import Base


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    active = Column(Boolean, nullable=False, default=True)
    message_count = Column(Integer, nullable=False, default=0)
    chat_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_message_at = Column(DateTime(timezone=True), nullable=True)
