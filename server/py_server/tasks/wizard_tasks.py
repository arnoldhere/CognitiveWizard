"""
tasks/wizard_tasks.py
=======================
Celery background tasks for the multi-agent course generation pipeline.

Architecture:
    Celery task (sync) → asyncio.run(...)
    ├── await graph.aget_state()   — check for resumable checkpoint
    └── await graph.ainvoke()      — run the LangGraph agent pipeline
        ├── async nodes          — use await httpx.AsyncClient
        └── async checkpointer   — MySQLSaver with aget_tuple/aput/aput_writes

Error handling strategy:
- AllProvidersFailedError → recoverable, retry with backoff (max 3 retries)
- Other exceptions       → non-recoverable, mark as failed with user-friendly message
- Final retry failure    → send clear user message, stop retrying
"""

import asyncio
import httpx
import logging
from agents.graphs.course_generation_graph import get_compiled_course_graph
from agents.states.course_agent_state import CourseAgentState
from config.settings import settings
from providers.llm.provider_errors import AllProvidersFailedError
from core.celery_app import celery_app
from core.db import get_db_connection
from core.mysql_checkpointer import MySQLSaver

logger = logging.getLogger(__name__)
js_server_url = settings.JS_SERVER_URL

# ── User-Friendly Error Messages

_ERROR_MESSAGES = {
    "AllProvidersFailedError": (
        "Our AI servers are temporarily busy. "
        "Your course generation will be retried automatically."
    ),
    "ConnectionError": (
        "A network issue interrupted generation. " "It will resume shortly."
    ),
    "TimeoutError": (
        "The generation took longer than expected. " "It will resume automatically."
    ),
    "httpx.ConnectError": (
        "A network issue interrupted generation. " "It will resume shortly."
    ),
}

_DEFAULT_ERROR_MESSAGE = (
    "Something unexpected happened during course generation. "
    "Our system will try again automatically."
)


def _get_user_message(exc: Exception) -> str:
    """Map a technical exception to a user-friendly message."""
    exc_name = type(exc).__name__
    return _ERROR_MESSAGES.get(exc_name, _DEFAULT_ERROR_MESSAGE)


# ── Webhook Helpers
async def _send_complete_webhook(
    content_id: int,
    job_id: str,
    data: dict = None,
    error: str = None,
    status: str = None,
    user_message: str = None,
    retry_info: dict = None,
):
    """
    Notify the JS server that a generation job has finished (success or failure).

    Args:
        content_id: WizardContent.id
        job_id: LangGraph thread_id / generation job identifier
        data: Final course package on success
        error: Technical error string for logging/debugging
        status: Override status ('degraded', 'failed', etc.)
        user_message: Human-readable message for frontend display
        retry_info: Dict with retry_count and max_retries for context
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"content_id": content_id, "job_id": job_id}
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
    except Exception as e:
        logger.error(f"Failed to send complete webhook: {e}")


# ── Async Graph Execution
async def _run_agentic_workflow_async(initial_state: CourseAgentState, job_id: str):
    """
    Execute the LangGraph course generation pipeline asynchronously.

    Uses the async LangGraph API (aget_state / ainvoke) so that async nodes
    and the async checkpointer work natively without blocking.
    """
    conn = get_db_connection()
    try:
        checkpointer = MySQLSaver(conn)
        graph = get_compiled_course_graph(checkpointer=checkpointer)

        config = {
            "configurable": {
                "thread_id": job_id,
            }
        }

        # Check for an existing checkpoint (resume scenario)
        state = await graph.aget_state(config)
        if state and state.next:
            logger.info(
                f"Resuming interrupted course generation: {job_id} "
                f"(Next: {state.next})"
            )
            return await graph.ainvoke(None, config)

        # Fresh start
        return await graph.ainvoke(initial_state, config)
    finally:
        conn.close()


# ── Celery Tasks


async def _execute_workflow_and_notify(
    task_instance,
    content_id: int,
    job_id: str,
    initial_state: CourseAgentState,
    retry_info: dict,
):
    """
    Execute the LangGraph course generation workflow and send appropriate completion/error
    webhooks within a single shared event loop.
    """
    current_retry = retry_info["retry_count"]
    max_retries = retry_info["max_retries"]

    try:
        final_state = await _run_agentic_workflow_async(initial_state, job_id)
        course_draft = final_state.get("course_draft", {}) if final_state else {}

        # If pipeline ended in error or empty draft
        if (
            not final_state
            or final_state.get("pipeline_status") == "error"
            or not course_draft
            or course_draft.get("error")
            or not course_draft.get("phases")
        ):
            err_msg = (
                (final_state and final_state.get("error"))
                or (course_draft and course_draft.get("error"))
                or "Course generation failed to produce valid course content."
            )
            logger.error(f"[Celery|{job_id}] Pipeline completed with error state: {err_msg}")
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

    except AllProvidersFailedError as e:
        user_msg = _get_user_message(e)

        if current_retry < max_retries:
            logger.warning(
                f"All LLM providers failed for {job_id} "
                f"(retry {current_retry + 1}/{max_retries}): {e}"
            )
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(e),
                status="degraded",
                user_message=user_msg,
                retry_info=retry_info,
            )
            raise task_instance.retry(exc=e, countdown=60 * (current_retry + 1))
        else:
            logger.error(
                f"All LLM providers failed for {job_id} — "
                f"max retries ({max_retries}) exhausted: {e}"
            )
            final_msg = (
                "Course generation could not be completed after multiple attempts. "
                "Please try again later or contact support if the issue persists."
            )
            await _send_complete_webhook(
                content_id,
                job_id,
                error=str(e),
                status="failed",
                user_message=final_msg,
                retry_info=retry_info,
            )
            raise

    except Exception as e:
        # Check for celery SoftTimeLimitExceeded
        exc_type_name = type(e).__name__
        if exc_type_name == "SoftTimeLimitExceeded":
            logger.error(f"Task soft time limit exceeded for job {job_id}")
            timeout_msg = "Course generation took longer than expected and timed out. You can retry the generation."
            await _send_complete_webhook(
                content_id,
                job_id,
                error="Task soft time limit exceeded",
                status="failed",
                user_message=timeout_msg,
                retry_info=retry_info,
            )
            raise

        user_msg = _get_user_message(e)
        logger.exception(f"Unexpected error in agentic workflow for {job_id}: {e}")
        await _send_complete_webhook(
            content_id,
            job_id,
            error=str(e),
            status="failed",
            user_message=user_msg,
            retry_info=retry_info,
        )
        raise


@celery_app.task(bind=True, max_retries=3, acks_late=True)
def run_agentic_workflow_task(
    self,
    content_id: int,
    job_id: str,
    topic: str,
    content_type: str,
    details: str,
    skill_level: str,
    goal: str,
    learning_style: str,
    user_role: str,
):
    """
    Celery background task that orchestrates the LangGraph pipeline.

    Runs the async graph inside a single ``asyncio.run()`` invocation so that async
    nodes, MySQLSaver checkpointer, and webhooks share one clean event loop.
    Reclaims memory via garbage collection upon completion.
    """
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

    retry_info = {
        "retry_count": current_retry,
        "max_retries": max_retries,
    }

    try:
        return asyncio.run(
            _execute_workflow_and_notify(
                task_instance=self,
                content_id=content_id,
                job_id=job_id,
                initial_state=initial_state,
                retry_info=retry_info,
            )
        )
    finally:
        import gc
        gc.collect()


@celery_app.task(bind=True)
def resume_job_task(self, job_id: str):
    """
    Called when the system requests to retry a failed/interrupted job.
    Fetches the original payload from JS server and re-dispatches the workflow.
    """
    import requests

    try:
        response = requests.get(
            f"{js_server_url}/internal/wizard-webhook/job/{job_id}",
            timeout=10,
        )
        response.raise_for_status()
        job = response.json()

        input_payload = job.get("input_payload") or {}
        run_agentic_workflow_task.delay(
            content_id=job["wizard_content_id"],
            job_id=job_id,
            topic=input_payload.get("topic", ""),
            content_type=input_payload.get("content_type", ""),
            details=input_payload.get("details", ""),
            skill_level=input_payload.get("skill_level", ""),
            goal=input_payload.get("goal", ""),
            learning_style=input_payload.get("learning_style", ""),
            user_role=input_payload.get("user_role", ""),
        )
        logger.info(f"Resume job task dispatched for {job_id}")
    except requests.exceptions.ConnectionError:
        logger.error(
            f"Cannot reach JS server to fetch job payload for {job_id}. "
            "Is the JS gateway running?"
        )
    except Exception as e:
        logger.error(f"Failed to fetch job payload for resume: {e}")
