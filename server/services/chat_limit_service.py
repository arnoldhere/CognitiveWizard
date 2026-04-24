"""Service to track and enforce daily chat message limits from the user table."""

from datetime import datetime, timedelta
from typing import Tuple

from sqlalchemy.orm import Session

from models.user import User


class ChatLimitService:
    """Tracks daily chat message limits per user using database fields."""

    def __init__(self, max_messages_per_day: int = 5):
        self.max_messages_per_day = max_messages_per_day

    def _effective_limit(self, user: User) -> int:
        if user.subscribed:
            return 10**9
        return self.max_messages_per_day

    def _ensure_tracking_window(self, db: Session, user: User) -> User:
        now = datetime.now()
        should_initialize = user.chat_limit is None or user.chat_limit_reset_at is None
        should_reset = (
            user.chat_limit_reset_at is not None and now >= user.chat_limit_reset_at
        )

        if should_initialize or should_reset:
            user.chat_limit = 0
            user.chat_limit_reset_at = now + timedelta(days=1)
            db.add(user)
            db.commit()
            db.refresh(user)

        return user

    def check_limit(self, db: Session, user: User) -> Tuple[bool, int, int]:
        user = self._ensure_tracking_window(db, user)
        messages_used = int(user.chat_limit or 0)
        max_messages = self._effective_limit(user)
        messages_remaining = max(0, max_messages - messages_used)
        can_send = messages_used < max_messages
        return can_send, messages_used, messages_remaining

    def increment_message_count(self, db: Session, user: User) -> User:
        user = self._ensure_tracking_window(db, user)
        user.chat_limit = int(user.chat_limit or 0) + 1
        db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def get_user_status(self, db: Session, user: User) -> dict:
        user = self._ensure_tracking_window(db, user)
        can_send, used, remaining = self.check_limit(db, user)
        max_messages = None if user.subscribed else self.max_messages_per_day

        return {
            "can_send": can_send,
            "messages_used": used,
            "messages_remaining": None if user.subscribed else remaining,
            "max_per_day": max_messages,
            "reset_time": user.chat_limit_reset_at.isoformat()
            if user.chat_limit_reset_at
            else None,
            "limit_reached": not can_send,
            "subscribed": user.subscribed,
        }


chat_limit_service = ChatLimitService(max_messages_per_day=5)
