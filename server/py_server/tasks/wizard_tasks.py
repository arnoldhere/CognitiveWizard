import asyncio
import httpx
from agents.graphs.course_generation_graph import get_compiled_course_graph
from agents.states.course_agent_state import CourseAgentState
from langgraph.checkpoint.memory import MemorySaver
from config.settings import settings
import traceback

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
    checkpointer = MemorySaver()
    graph = get_compiled_course_graph(checkpointer=checkpointer)

    config = {
        "configurable": {
            "thread_id": job_id,
        }
    }

    state = await graph.aget_state(config)
    if state.next:
        print(
            f"Resuming interrupted course generation: {job_id} (Next: {state.next})"
        )
        return await graph.ainvoke(None, config)

    return await graph.ainvoke(initial_state, config)


async def run_agentic_workflow_task(
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
    Async background task that orchestrates the LangGraph pipeline natively without Celery.
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

    try:
        final_state = await _run_agentic_workflow_async(initial_state, job_id)
        await _send_complete_webhook(
            content_id, job_id, data=final_state.get("course_draft", {})
        )
        return {"status": "success", "content_id": content_id}
    except Exception as e:
        traceback.print_exc()
        await _send_complete_webhook(content_id, job_id, error=str(e))
        raise e


async def resume_incomplete_workflows():
    import logging

    logger = logging.getLogger(__name__)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{js_server_url}/internal/wizard-webhook/incomplete"
            )
            response.raise_for_status()
            jobs = response.json()

            if jobs:
                logger.info(
                    f"Found {len(jobs)} incomplete course generation jobs. Resuming..."
                )
                for job in jobs:
                    logger.info(
                        f"Resuming generation for course: '{job.get('topic')}' (Job ID: {job.get('job_id')})"
                    )
                    # Use asyncio.create_task for fire-and-forget native async execution
                    asyncio.create_task(
                        run_agentic_workflow_task(
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
                    )
            else:
                logger.info("No incomplete course generations found.")
    except Exception as e:
        logger.error(f"Failed to check for incomplete workflows: {e}")
