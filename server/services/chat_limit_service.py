"""Service to track and enforce daily chat message limits."""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Tuple

from config.settings import settings


class ChatLimitService:
    """Tracks daily chat message limits per user."""

    def __init__(self, max_messages_per_day: int = 5):
        self.max_messages_per_day = max_messages_per_day
        self.storage_path = settings.CHAT_LIMIT_STORAGE_PATH
        self._user_limits: Dict[str, dict] = self._load_state()

    def _load_state(self) -> Dict[str, dict]:
        if not os.path.exists(self.storage_path):
            return {}

        try:
            with open(self.storage_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            return {}

        state = {}
        for user_id, tracking in payload.items():
            last_reset = tracking.get("last_reset")
            try:
                parsed_reset = datetime.fromisoformat(last_reset)
            except (TypeError, ValueError):
                parsed_reset = datetime.now()

            state[user_id] = {
                "count": int(tracking.get("count", 0)),
                "last_reset": parsed_reset,
            }
        return state

    def _persist_state(self) -> None:
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        payload = {
            user_id: {
                "count": tracking["count"],
                "last_reset": tracking["last_reset"].isoformat(),
            }
            for user_id, tracking in self._user_limits.items()
        }
        with open(self.storage_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)

    def _get_or_init_user_tracking(self, user_id: str) -> dict:
        if user_id not in self._user_limits:
            self._user_limits[user_id] = {
                "count": 0,
                "last_reset": datetime.now(),
            }
            self._persist_state()
        return self._user_limits[user_id]

    def _should_reset_daily_limit(self, tracking: dict) -> bool:
        last_reset = tracking["last_reset"]
        return (datetime.now() - last_reset) >= timedelta(days=1)

    def reset_if_needed(self, user_id: str) -> None:
        tracking = self._get_or_init_user_tracking(user_id)
        if self._should_reset_daily_limit(tracking):
            tracking["count"] = 0
            tracking["last_reset"] = datetime.now()
            self._persist_state()

    def check_limit(self, user_id: str) -> Tuple[bool, int, int]:
        self.reset_if_needed(user_id)
        tracking = self._get_or_init_user_tracking(user_id)

        messages_used = tracking["count"]
        messages_remaining = max(0, self.max_messages_per_day - messages_used)
        can_send = messages_used < self.max_messages_per_day

        return can_send, messages_used, messages_remaining

    def increment_message_count(self, user_id: str) -> None:
        self.reset_if_needed(user_id)
        tracking = self._get_or_init_user_tracking(user_id)
        tracking["count"] += 1
        self._persist_state()

    def get_user_status(self, user_id: str) -> dict:
        self.reset_if_needed(user_id)
        tracking = self._get_or_init_user_tracking(user_id)

        can_send, used, remaining = self.check_limit(user_id)
        last_reset = tracking["last_reset"]
        reset_time = last_reset + timedelta(days=1)

        return {
            "can_send": can_send,
            "messages_used": used,
            "messages_remaining": remaining,
            "max_per_day": self.max_messages_per_day,
            "last_reset": last_reset.isoformat(),
            "reset_time": reset_time.isoformat(),
            "limit_reached": not can_send,
        }


chat_limit_service = ChatLimitService(max_messages_per_day=5)
