"""
services/generation/event_publisher.py
======================================
Real-time Progress Event Publisher and User Message Registries.

Maintains content-specific message registries for Roadmap, Guide, and Course,
translating technical pipeline events into encouraging, human-friendly status updates.
"""

from __future__ import annotations
import httpx
import logging
from typing import Any, Dict, Optional
from config.settings import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Content-Specific User Message Registries
# ─────────────────────────────────────────────────────────────────────────────

ROADMAP_MESSAGES: Dict[str, tuple[str, int]] = {
    # stage: (user_friendly_message, progress_percent)
    "queued": ("Waiting in queue for an AI worker...", 5),
    "input_normalizer": ("Normalizing your goals and learning preferences...", 15),
    "roadmap_planner": ("Mapping out milestones and learning phases...", 35),
    "roadmap_research": ("Finding high-quality documentation, articles, and references...", 60),
    "roadmap_composer": ("Assembling phases, modules, and curated resources...", 80),
    "roadmap_validator": ("Verifying progression from beginner to mastery...", 90),
    "quality_gate": ("Finalizing your personalized learning roadmap...", 95),
    "completed": ("Your learning roadmap is ready!", 100),
    "retrying": ("Refreshing roadmap generation with adjusted parameters...", 40),
    "failed": ("Unable to complete roadmap generation. You can retry anytime.", 0),
}

GUIDE_MESSAGES: Dict[str, tuple[str, int]] = {
    "queued": ("Waiting in queue for an AI worker...", 5),
    "guide_planner": ("Structuring your practical, step-by-step guide...", 20),
    "guide_research": ("Gathering official technical documentation and tutorials...", 45),
    "guide_writer": ("Writing detailed step-by-step modules and worked examples...", 70),
    "guide_reviewer": ("Reviewing pedagogical clarity and practical tips...", 85),
    "guide_validator": ("Validating references and common pitfall notes...", 92),
    "quality_gate": ("Finalizing your comprehensive guide...", 96),
    "completed": ("Your step-by-step guide is ready!", 100),
    "retrying": ("Refining guide content with enhanced reviewer feedback...", 50),
    "failed": ("Guide generation could not be completed. Please try again.", 0),
}

COURSE_MESSAGES: Dict[str, tuple[str, int]] = {
    "queued": ("Waiting for a course generation worker...", 5),
    "architect": ("Designing comprehensive course structure and curriculum...", 15),
    "research": ("Researching authoritative references and evidence for lessons...", 35),
    "lesson_generator": ("Writing full lesson explanations, code, and exercises...", 65),
    "reviewer": ("Pedagogical QA review: validating accuracy and Bloom's depth...", 85),
    "quality_gate": ("Running final quality checks and assembling course package...", 95),
    "completed": ("Your course is generated and ready for study!", 100),
    "retrying": ("Re-generating imperfect lessons based on reviewer feedback...", 50),
    "failed": ("Course generation encountered an issue. You can retry anytime.", 0),
}


class EventPublisher:
    """Dispatches user-friendly progress events and stage attempt diagnostics."""

    def __init__(self, js_server_url: Optional[str] = None):
        self.js_server_url = js_server_url or settings.JS_SERVER_URL

    def get_message_and_progress(
        self, content_type: str, stage: str, custom_message: Optional[str] = None
    ) -> tuple[str, int]:
        """Look up standard user message and progress percent for the given content type."""
        c_type = (content_type or "course").lower().strip()
        if "roadmap" in c_type:
            registry = ROADMAP_MESSAGES
        elif "guide" in c_type:
            registry = GUIDE_MESSAGES
        else:
            registry = COURSE_MESSAGES

        default_msg, default_pct = registry.get(stage, (f"Working on {stage}...", 50))
        return (custom_message or default_msg), default_pct

    async def publish_event(
        self,
        job_id: str,
        content_id: Optional[int],
        content_type: str,
        stage: str,
        status: str = "running",
        progress: Optional[int] = None,
        user_message: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Publish a granular progress event to the JS gateway."""
        if not job_id:
            return

        msg, pct = self.get_message_and_progress(content_type, stage, user_message)
        effective_progress = progress if progress is not None else pct

        event_body = {
            "job_id": job_id,
            "content_id": content_id,
            "content_type": content_type,
            "status": status,
            "stage": stage,
            "progress": effective_progress,
            "user_message": msg,
            "payload": payload or {},
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                await client.post(
                    f"{self.js_server_url}/internal/wizard-webhook/event",
                    json=event_body,
                )
        except Exception as exc:
            logger.warning("[EventPublisher] Failed to post event for %s/%s: %s", job_id, stage, exc)

    async def publish_attempt(
        self,
        job_id: str,
        stage: str,
        attempt_number: int,
        status: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        error_type: Optional[str] = None,
        error_message: Optional[str] = None,
        duration_ms: Optional[int] = None,
    ) -> None:
        """Publish an execution attempt record for granular diagnostics."""
        if not job_id:
            return

        attempt_body = {
            "job_id": job_id,
            "stage": stage,
            "attempt_number": attempt_number,
            "status": status,
            "provider": provider,
            "model": model,
            "error_type": error_type,
            "error_message": error_message,
            "duration_ms": duration_ms,
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                await client.post(
                    f"{self.js_server_url}/internal/wizard-webhook/attempt",
                    json=attempt_body,
                )
        except Exception as exc:
            logger.warning("[EventPublisher] Failed to post attempt for %s/%s: %s", job_id, stage, exc)


# Global singleton instance
event_publisher = EventPublisher()
