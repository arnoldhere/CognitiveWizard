import asyncio
import httpx
import traceback
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


async def _send_complete_webhook(
    content_id: int,
    job_id: str,
    data: dict = None,
    error: str = None,
    status: str = None,
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"content_id": content_id, "job_id": job_id}
            if error:
                payload["error"] = error
            if data is not None:
                payload["data"] = data
            if status is not None:
                payload["status"] = status

            await client.post(
                f"{js_server_url}/internal/wizard-webhook/complete", json=payload
            )
    except Exception as e:
        logger.error(f"Failed to send complete webhook: {e}")


async def _run_agentic_workflow_async(initial_state: CourseAgentState, job_id: str):
    conn = get_db_connection()
    try:
        checkpointer = MySQLSaver(conn)
        graph = get_compiled_course_graph(checkpointer=checkpointer)

        config = {
            "configurable": {
                "thread_id": job_id,
            }
        }

        state = await graph.aget_state(config)
        if state.next:
            logger.info(
                f"Resuming interrupted course generation: {job_id} (Next: {state.next})"
            )
            return await graph.ainvoke(None, config)

        return await graph.ainvoke(initial_state, config)
    finally:
        conn.close()


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
    state_cache: dict = None,
):
    """
    Celery background task that orchestrates the LangGraph pipeline.
    """
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
        retry_count=self.request.retries,
        warnings=[],
        course_draft={},
        pipeline_status="generating",
    )

    if state_cache:
        initial_state["course_blueprint"] = state_cache.get("course_blueprint", {})
        initial_state["generated_lessons"] = state_cache.get("generated_lessons", [])
        initial_state["pipeline_status"] = "resuming"

    try:
        # Run the async graph execution synchronously within Celery worker
        final_state = asyncio.run(_run_agentic_workflow_async(initial_state, job_id))

        asyncio.run(
            _send_complete_webhook(
                content_id, job_id, data=final_state.get("course_draft", {})
            )
        )
        return {"status": "success", "content_id": content_id}

    except AllProvidersFailedError as e:
        logger.warning(f"All LLM providers failed for {job_id}: {e}")
        # Send degraded status but still raise to retry
        asyncio.run(
            _send_complete_webhook(content_id, job_id, error=str(e), status="degraded")
        )
        raise self.retry(exc=e, countdown=60)  # Wait 60s before retry

    except Exception as e:
        logger.exception(f"Unexpected error in agentic workflow for {job_id}")
        asyncio.run(_send_complete_webhook(content_id, job_id, error=str(e)))
        raise e


@celery_app.task(bind=True)
def resume_job_task(self, job_id: str):
    """
    Called when a user requests to retry a failed job.
    Fetches the payload from JS server and restarts the workflow.
    """
    import requests

    try:
        response = requests.get(
            f"{js_server_url}/internal/wizard-webhook/job/{job_id}", timeout=10
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
    except Exception as e:
        logger.error(f"Failed to fetch job payload for resume: {e}")
