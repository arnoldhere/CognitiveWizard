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
        if user.daily_chat_limit and user.daily_chat_limit > 0:
            return user.daily_chat_limit
        return self.max_messages_per_day

    def _ensure_tracking_window(self, db: Session, user: User) -> User:
        now = datetime.now()
        # Determine if we need to (re)initialize the tracking counters
        should_initialize = user.chat_limit is None or user.chat_limit_reset_at is None
        should_reset = (
            user.chat_limit_reset_at is not None and now >= user.chat_limit_reset_at
        )

        # Load the persisted user record from DB (if not already an ORM instance)
        db_user = db.query(User).filter(User.id == user.id).first()
        if db_user is None:
            # No user found in DB – nothing to update, return the original object
            return user

        # Update counters on the persisted user
        if should_initialize or should_reset:
            db_user.chat_limit = 0
            db_user.chat_limit_reset_at = now + timedelta(days=1)
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        return db_user

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
        max_messages = self._effective_limit(user)

        return {
            "can_send": can_send,
            "messages_used": used,
            "messages_remaining": remaining,
            "max_per_day": max_messages,
            "reset_time": (
                user.chat_limit_reset_at.isoformat()
                if user.chat_limit_reset_at
                else None
            ),
            "limit_reached": not can_send,
            "subscribed": bool(user.subscribed),
            "subscription_plan": user.subscription_plan,
            "subscription_name": (
                user.subscription_plan.capitalize()
                if user.subscription_plan
                else "Free"
            ),
            "subscription_daily_limit": user.daily_chat_limit or max_messages,
        }


chat_limit_service = ChatLimitService(max_messages_per_day=5)
