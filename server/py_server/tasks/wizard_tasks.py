import asyncio
import httpx
from agents.graphs.course_generation_graph import get_compiled_course_graph
from agents.states.course_agent_state import CourseAgentState
from langgraph.checkpoint.redis import AsyncRedisSaver
from config.settings import settings
from core.celery_app import celery_app

redis_url = settings.REDIS_URL
js_server_url = settings.JS_SERVER_URL


async def _send_complete_webhook(
    content_id: int, job_id: str, data: dict = None, error: str = None
):
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"content_id": content_id, "job_id": job_id}
            if error:
                payload["error"] = error
            else:
                payload["data"] = data
            await client.post(
                f"{js_server_url}/internal/wizard-webhook/complete", json=payload
            )
    except Exception as e:
        print(f"Failed to send complete webhook: {e}")


async def _run_agentic_workflow_async(
    initial_state: CourseAgentState,
    job_id: str,
):
    async with AsyncRedisSaver.from_conn_string(redis_url) as checkpointer:
        graph = get_compiled_course_graph(checkpointer=checkpointer)

        config = {
            "configurable": {
                "thread_id": job_id,
            }
        }

        # If the graph was already started (and crashed), aget_state will show it.
        # ainvoke with the exact thread_id will resume it from the checkpoint natively.
        state = await graph.aget_state(config)
        if state.next:
            print(
                f"Resuming interrupted course generation: {job_id} (Next: {state.next})"
            )
            return await graph.ainvoke(None, config)

        return await graph.ainvoke(initial_state, config)


@celery_app.task(bind=True, name="wizard.generate_course")
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
    Celery task that orchestrates the durable LangGraph pipeline.
    If the worker crashes, acks_late=True ensures it is picked up again.
    The checkpointer (AsyncRedisSaver) will have saved the state,
    and upon restarting the task with the same `job_id`, it will resume where it left off.
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
        retry_count=0,
        warnings=[],
        course_draft={},
        pipeline_status="generating",
    )

    if state_cache:
        initial_state["course_blueprint"] = state_cache.get("course_blueprint", {})
        initial_state["generated_lessons"] = state_cache.get("generated_lessons", [])
        initial_state["pipeline_status"] = "resuming"

    async def _runner():
        try:
            final_state = await _run_agentic_workflow_async(initial_state, job_id)
            await _send_complete_webhook(
                content_id, job_id, data=final_state.get("course_draft", {})
            )
            return {"status": "success", "content_id": content_id}
        except Exception as e:
            import traceback

            traceback.print_exc()
            await _send_complete_webhook(content_id, job_id, error=str(e))
            raise e

    # Run the async graph synchronously since celery workers run synchronous by default
    return asyncio.run(_runner())

async def resume_incomplete_workflows():
    import logging
    logger = logging.getLogger(__name__)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{js_server_url}/internal/wizard-webhook/incomplete")
            response.raise_for_status()
            jobs = response.json()

            if jobs:
                logger.info(f"Found {len(jobs)} incomplete course generation jobs. Resuming...")
                for job in jobs:
                    logger.info(f"Resuming generation for course: '{job.get('topic')}' (Job ID: {job.get('job_id')})")
                    run_agentic_workflow_task.delay(
                        content_id=job["content_id"],
                        job_id=job["job_id"],
                        topic=job["topic"],
                        content_type=job["content_type"],
                        details=job.get("details", ""),
                        skill_level=job["skill_level"],
                        goal=job["goal"],
                        learning_style=job["learning_style"],
                        user_role=job["user_role"],
                        state_cache=job.get("state_cache"),
                    )
            else:
                logger.info("No incomplete course generations found.")
    except Exception as e:
        logger.error(f"Failed to check for incomplete workflows: {e}")
