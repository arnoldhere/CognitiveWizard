"""
tasks/wizard_tasks.py
=====================
Celery background tasks for the multi-agent AI Wizard generation platform.

Supports asynchronous generation with isolated task queues for:
- Course: `wizard_course` queue (Architect → Research → Lesson Generator → Reviewer → Quality Gate)
- Roadmap: `wizard_roadmap` queue (Normalizer → Planner → Research → Composer → Validator → Quality Gate)
- Guide: `wizard_guide` queue (Planner → Research → Writer → Reviewer → Validator → Quality Gate)
- Retries: `wizard_retry` queue
- Startup Recovery: `wizard_recovery` queue

Architecture:
    Celery task (sync) → asyncio.run(...)
    ├── await graph.aget_state()   — check for resumable checkpoint in MySQLSaver
    └── await graph.ainvoke()      — execute the LangGraph agent pipeline
"""

import asyncio
import gc
import httpx
import logging
from typing import Any, Dict, Optional

from agents.graphs.course_generation_graph import get_compiled_course_graph
from agents.graphs.roadmap_generation_graph import get_compiled_roadmap_graph
from agents.graphs.guide_generation_graph import get_compiled_guide_graph
from agents.states.course_agent_state import CourseAgentState
from agents.states.roadmap_agent_state import RoadmapAgentState
from agents.states.guide_agent_state import GuideAgentState
from config.settings import settings
from providers.llm.provider_errors import AllProvidersFailedError
from core.celery_app import celery_app
from core.db import get_db_connection
from core.mysql_checkpointer import MySQLSaver
from services.generation.event_publisher import event_publisher

logger = logging.getLogger(__name__)
js_server_url = settings.JS_SERVER_URL

_ERROR_MESSAGES = {
    "AllProvidersFailedError": (
        "Our AI servers are temporarily busy. "
        "Your generation will be retried automatically."
    ),
    "ConnectionError": (
        "A network issue interrupted generation. It will resume shortly."
    ),
    "TimeoutError": (
        "The generation took longer than expected. It will resume automatically."
    ),
    "httpx.ConnectError": (
        "A network issue interrupted generation. It will resume shortly."
    ),
}

_DEFAULT_ERROR_MESSAGE = (
    "Something unexpected happened during generation. "
    "Our system will try again automatically."
)


def _get_user_message(exc: Exception, content_type: str = "content") -> str:
    """Map a technical exception to an encouraging, user-friendly message."""
    exc_name = type(exc).__name__
    return _ERROR_MESSAGES.get(exc_name, _DEFAULT_ERROR_MESSAGE)


# ── Webhook Dispatcher ────────────────────────────────────────────────────────
async def _send_complete_webhook(
    content_id: int,
    job_id: str,
    data: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    status: Optional[str] = None,
    user_message: Optional[str] = None,
    retry_info: Optional[Dict[str, Any]] = None,
):
    """Notify the JS server that a generation job has completed or encountered an error."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload: Dict[str, Any] = {"content_id": content_id, "job_id": job_id}
            if error:
                payload["error"] = error
            if data is not None:
                payload["data"] = data
            if status is not None:
                payload["status"] = status
            if user_message:
                payload["user_message"] = user_message
            if retry_info:
                payload["retry_info"] = retry_info

            await client.post(
                f"{js_server_url}/internal/wizard-webhook/complete",
                json=payload,
            )
    except Exception as exc:
        logger.error("[Celery|Webhook] Failed to send complete webhook for %s: %s", job_id, exc)


# ═════════════════════════════════════════════════════════════════════════════
# 1. COURSE GENERATION PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

async def _run_course_workflow_async(initial_state: CourseAgentState, job_id: str):
    conn = get_db_connection()
    try:
        checkpointer = MySQLSaver(conn)
        graph = get_compiled_course_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": job_id}}

        state = await graph.aget_state(config)
        if state and state.next:
            logger.info("[Celery|Course|%s] Resuming interrupted course (Next: %s)", job_id, state.next)
            return await graph.ainvoke(None, config)

        return await graph.ainvoke(initial_state, config)
    finally:
        conn.close()


async def _execute_course_workflow_and_notify(
    task_instance,
    content_id: int,
    job_id: str,
    initial_state: CourseAgentState,
    retry_info: dict,
):
    current_retry = retry_info["retry_count"]
    max_retries = retry_info["max_retries"]

    try:
        final_state = await _run_course_workflow_async(initial_state, job_id)
        course_draft = final_state.get("course_draft", {}) if final_state else {}

        if (
            not final_state
            or final_state.get("pipeline_status") == "error"
            or not course_draft
            or course_draft.get("error")
            or not course_draft.get("chapters")
        ):
            err_msg = (
                (final_state and final_state.get("error"))
                or (course_draft and course_draft.get("error"))
                or "Course generation failed to produce valid course content."
            )
            logger.error("[Celery|Course|%s] Pipeline failed: %s", job_id, err_msg)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=err_msg,
                status="failed",
                user_message=_DEFAULT_ERROR_MESSAGE,
                retry_info=retry_info,
            )
            return {"status": "failed", "content_id": content_id, "error": err_msg}

        await _send_complete_webhook(
            content_id,
            job_id,
            data=course_draft,
        )
        return {"status": "success", "content_id": content_id}

    except AllProvidersFailedError as exc:
        user_msg = _get_user_message(exc, "course")
        if current_retry < max_retries:
            logger.warning("[Celery|Course|%s] All providers failed (retry %d/%d): %s", job_id, current_retry + 1, max_retries, exc)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="degraded",
                user_message=user_msg,
                retry_info=retry_info,
            )
            raise task_instance.retry(exc=exc, countdown=60 * (current_retry + 1))
        else:
            logger.error("[Celery|Course|%s] Max retries exhausted: %s", job_id, exc)
            final_msg = "Course generation could not be completed after multiple attempts. Please try again later."
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="failed",
                user_message=final_msg,
                retry_info=retry_info,
            )
            raise

    except Exception as exc:
        if type(exc).__name__ == "SoftTimeLimitExceeded":
            logger.error("[Celery|Course|%s] Soft time limit exceeded", job_id)
            await _send_complete_webhook(
                content_id,
                job_id,
                error="Task soft time limit exceeded",
                status="failed",
                user_message="Course generation timed out. You can retry the generation.",
                retry_info=retry_info,
            )
            raise

        user_msg = _get_user_message(exc, "course")
        logger.exception("[Celery|Course|%s] Unexpected error: %s", job_id, exc)
        await _send_complete_webhook(
            content_id,
            job_id,
            error=str(exc),
            status="failed",
            user_message=user_msg,
            retry_info=retry_info,
        )
        raise


@celery_app.task(bind=True, name="tasks.wizard_tasks.generate_course_task", max_retries=3, acks_late=True)
def generate_course_task(
    self,
    content_id: int,
    job_id: str,
    topic: str,
    content_type: str = "Course/Syllabus",
    details: str = "",
    skill_level: str = "beginner",
    goal: str = "",
    learning_style: str = "mixed",
    user_role: str = "user",
):
    """Celery background task that orchestrates Course generation on the `wizard_course` queue."""
    current_retry = self.request.retries
    max_retries = self.max_retries

    initial_state = CourseAgentState(
        topic=topic,
        content_id=content_id,
        content_type=content_type,
        skill_level=skill_level,
        goal=goal,
        learning_style=learning_style,
        details=details,
        user_role=user_role,
        job_id=job_id,
        retry_count=current_retry,
        warnings=[],
        course_draft={},
        pipeline_status="generating",
    )

    retry_info = {"retry_count": current_retry, "max_retries": max_retries}

    try:
        return asyncio.run(
            _execute_course_workflow_and_notify(
                task_instance=self,
                content_id=content_id,
                job_id=job_id,
                initial_state=initial_state,
                retry_info=retry_info,
            )
        )
    finally:
        gc.collect()


# Backward compatibility alias for existing code referencing run_agentic_workflow_task
run_agentic_workflow_task = generate_course_task


# ═════════════════════════════════════════════════════════════════════════════
# 2. ROADMAP GENERATION PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

async def _run_roadmap_workflow_async(initial_state: RoadmapAgentState, job_id: str):
    conn = get_db_connection()
    try:
        checkpointer = MySQLSaver(conn)
        graph = get_compiled_roadmap_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": job_id}}

        state = await graph.aget_state(config)
        if state and state.next:
            logger.info("[Celery|Roadmap|%s] Resuming interrupted roadmap (Next: %s)", job_id, state.next)
            return await graph.ainvoke(None, config)

        return await graph.ainvoke(initial_state, config)
    finally:
        conn.close()


async def _execute_roadmap_workflow_and_notify(
    task_instance,
    content_id: int,
    job_id: str,
    initial_state: RoadmapAgentState,
    retry_info: dict,
):
    current_retry = retry_info["retry_count"]
    max_retries = retry_info["max_retries"]

    try:
        final_state = await _run_roadmap_workflow_async(initial_state, job_id)
        roadmap_draft = final_state.get("roadmap_draft", {}) if final_state else {}

        if (
            not final_state
            or final_state.get("pipeline_status") == "error"
            or not roadmap_draft
            or not roadmap_draft.get("title")
        ):
            err_msg = (
                (final_state and final_state.get("error"))
                or "Roadmap generation failed to produce valid curriculum content."
            )
            logger.error("[Celery|Roadmap|%s] Pipeline failed: %s", job_id, err_msg)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=err_msg,
                status="failed",
                user_message=_DEFAULT_ERROR_MESSAGE,
                retry_info=retry_info,
            )
            return {"status": "failed", "content_id": content_id, "error": err_msg}

        await _send_complete_webhook(
            content_id,
            job_id,
            data=roadmap_draft,
        )
        return {"status": "success", "content_id": content_id}

    except AllProvidersFailedError as exc:
        user_msg = _get_user_message(exc, "roadmap")
        if current_retry < max_retries:
            logger.warning("[Celery|Roadmap|%s] All providers failed (retry %d/%d): %s", job_id, current_retry + 1, max_retries, exc)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="degraded",
                user_message=user_msg,
                retry_info=retry_info,
            )
            raise task_instance.retry(exc=exc, countdown=60 * (current_retry + 1))
        else:
            logger.error("[Celery|Roadmap|%s] Max retries exhausted: %s", job_id, exc)
            final_msg = "Roadmap generation could not be completed after multiple attempts. Please try again later."
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="failed",
                user_message=final_msg,
                retry_info=retry_info,
            )
            raise

    except Exception as exc:
        user_msg = _get_user_message(exc, "roadmap")
        logger.exception("[Celery|Roadmap|%s] Unexpected error: %s", job_id, exc)
        await _send_complete_webhook(
            content_id,
            job_id,
            error=str(exc),
            status="failed",
            user_message=user_msg,
            retry_info=retry_info,
        )
        raise


@celery_app.task(bind=True, name="tasks.wizard_tasks.generate_roadmap_task", max_retries=3, acks_late=True)
def generate_roadmap_task(
    self,
    content_id: int,
    job_id: str,
    topic: str,
    content_type: str = "Roadmap",
    details: str = "",
    skill_level: str = "beginner",
    goal: str = "",
    learning_style: str = "mixed",
    user_role: str = "user",
):
    """Celery background task that orchestrates Roadmap generation on the `wizard_roadmap` queue."""
    current_retry = self.request.retries
    max_retries = self.max_retries

    initial_state = RoadmapAgentState(
        topic=topic,
        content_id=content_id,
        content_type=content_type,
        skill_level=skill_level,
        goal=goal,
        learning_style=learning_style,
        details=details,
        user_role=user_role,
        job_id=job_id,
        retry_count=current_retry,
        warnings=[],
        roadmap_draft={},
        pipeline_status="queued",
    )

    retry_info = {"retry_count": current_retry, "max_retries": max_retries}

    try:
        return asyncio.run(
            _execute_roadmap_workflow_and_notify(
                task_instance=self,
                content_id=content_id,
                job_id=job_id,
                initial_state=initial_state,
                retry_info=retry_info,
            )
        )
    finally:
        gc.collect()


# ═════════════════════════════════════════════════════════════════════════════
# 3. GUIDE GENERATION PIPELINE
# ═════════════════════════════════════════════════════════════════════════════

async def _run_guide_workflow_async(initial_state: GuideAgentState, job_id: str):
    conn = get_db_connection()
    try:
        checkpointer = MySQLSaver(conn)
        graph = get_compiled_guide_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": job_id}}

        state = await graph.aget_state(config)
        if state and state.next:
            logger.info("[Celery|Guide|%s] Resuming interrupted guide (Next: %s)", job_id, state.next)
            return await graph.ainvoke(None, config)

        return await graph.ainvoke(initial_state, config)
    finally:
        conn.close()


async def _execute_guide_workflow_and_notify(
    task_instance,
    content_id: int,
    job_id: str,
    initial_state: GuideAgentState,
    retry_info: dict,
):
    current_retry = retry_info["retry_count"]
    max_retries = retry_info["max_retries"]

    try:
        final_state = await _run_guide_workflow_async(initial_state, job_id)
        guide_draft = final_state.get("guide_draft", {}) if final_state else {}

        if (
            not final_state
            or final_state.get("pipeline_status") == "error"
            or not guide_draft
            or not guide_draft.get("title")
        ):
            err_msg = (
                (final_state and final_state.get("error"))
                or "Guide generation failed to produce valid tutorial content."
            )
            logger.error("[Celery|Guide|%s] Pipeline failed: %s", job_id, err_msg)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=err_msg,
                status="failed",
                user_message=_DEFAULT_ERROR_MESSAGE,
                retry_info=retry_info,
            )
            return {"status": "failed", "content_id": content_id, "error": err_msg}

        await _send_complete_webhook(
            content_id,
            job_id,
            data=guide_draft,
        )
        return {"status": "success", "content_id": content_id}

    except AllProvidersFailedError as exc:
        user_msg = _get_user_message(exc, "guide")
        if current_retry < max_retries:
            logger.warning("[Celery|Guide|%s] All providers failed (retry %d/%d): %s", job_id, current_retry + 1, max_retries, exc)
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="degraded",
                user_message=user_msg,
                retry_info=retry_info,
            )
            raise task_instance.retry(exc=exc, countdown=60 * (current_retry + 1))
        else:
            logger.error("[Celery|Guide|%s] Max retries exhausted: %s", job_id, exc)
            final_msg = "Guide generation could not be completed after multiple attempts. Please try again later."
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(exc),
                status="failed",
                user_message=final_msg,
                retry_info=retry_info,
            )
            raise

    except Exception as exc:
        user_msg = _get_user_message(exc, "guide")
        logger.exception("[Celery|Guide|%s] Unexpected error: %s", job_id, exc)
        await _send_complete_webhook(
            content_id,
            job_id,
            error=str(exc),
            status="failed",
            user_message=user_msg,
            retry_info=retry_info,
        )
        raise


@celery_app.task(bind=True, name="tasks.wizard_tasks.generate_guide_task", max_retries=3, acks_late=True)
def generate_guide_task(
    self,
    content_id: int,
    job_id: str,
    topic: str,
    content_type: str = "Guide",
    details: str = "",
    skill_level: str = "beginner",
    goal: str = "",
    learning_style: str = "mixed",
    user_role: str = "user",
):
    """Celery background task that orchestrates Guide generation on the `wizard_guide` queue."""
    current_retry = self.request.retries
    max_retries = self.max_retries

    initial_state = GuideAgentState(
        topic=topic,
        content_id=content_id,
        content_type=content_type,
        skill_level=skill_level,
        details=details,
        target_audience="General Learners",
        guide_style="Step-by-step tutorial",
        job_id=job_id,
        retry_count=current_retry,
        warnings=[],
        guide_draft={},
        pipeline_status="queued",
    )

    retry_info = {"retry_count": current_retry, "max_retries": max_retries}

    try:
        return asyncio.run(
            _execute_guide_workflow_and_notify(
                task_instance=self,
                content_id=content_id,
                job_id=job_id,
                initial_state=initial_state,
                retry_info=retry_info,
            )
        )
    finally:
        gc.collect()


# ═════════════════════════════════════════════════════════════════════════════
# 4. RETRY & RECOVERY TASKS
# ═════════════════════════════════════════════════════════════════════════════

@celery_app.task(bind=True, name="tasks.wizard_tasks.retry_job_task")
def retry_job_task(self, job_id: str):
    """
    Retries an interrupted or failed generation job.
    Fetches job metadata from the JS server and re-dispatches to the appropriate content queue.
    """
    import requests

    try:
        response = requests.get(
            f"{js_server_url}/internal/wizard-webhook/job/{job_id}",
            timeout=10,
        )
        response.raise_for_status()
        job = response.json()

        content_id = job.get("wizard_content_id")
        input_payload = job.get("input_payload") or {}
        raw_type = (job.get("content_type") or input_payload.get("content_type") or "course").lower().strip()

        logger.info("[Celery|Retry|%s] Re-dispatching job (type=%s)", job_id, raw_type)

        kwargs = dict(
            content_id=content_id,
            job_id=job_id,
            topic=input_payload.get("topic", ""),
            content_type=input_payload.get("content_type", raw_type),
            details=input_payload.get("details", ""),
            skill_level=input_payload.get("skill_level", "beginner"),
            goal=input_payload.get("goal", ""),
            learning_style=input_payload.get("learning_style", "mixed"),
            user_role=input_payload.get("user_role", "user"),
        )

        if "roadmap" in raw_type:
            generate_roadmap_task.delay(**kwargs)
        elif "guide" in raw_type:
            generate_guide_task.delay(**kwargs)
        else:
            generate_course_task.delay(**kwargs)

        return {"status": "requeued", "job_id": job_id, "content_type": raw_type}

    except Exception as exc:
        logger.error("[Celery|Retry|%s] Failed to retry job: %s", job_id, exc)
        return {"status": "error", "job_id": job_id, "error": str(exc)}


resume_job_task = retry_job_task


@celery_app.task(bind=True, name="tasks.wizard_tasks.recover_jobs_task")
def recover_jobs_task(self):
    """Scans for orphaned, incomplete jobs and requeues them if recoverable."""
    from services.generation.recovery_service import generation_recovery_service
    return generation_recovery_service.scan_and_recover_incomplete_jobs()
