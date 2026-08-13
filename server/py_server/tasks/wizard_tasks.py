import asyncio
import httpx
from core.celery_app import celery_app
from agents.graphs.course_generation_graph import get_compiled_course_graph
from agents.states.course_agent_state import CourseAgentState

from langgraph.checkpoint.redis import AsyncRedisSaver
from config.settings import settings

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

        return await graph.ainvoke(initial_state, config)


@celery_app.task(bind=True, name="tasks.wizard_tasks.run_agentic_workflow_task")
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
    Celery task that orchestrates the durable LangGraph pipeline.
    If the graph crashes, the checkpointer (RedisSaver) will have saved the state,
    and upon restarting the task with the same `job_id`, it will resume where it left off.
    """

    # Initialize the input state
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

    try:
        final_state = asyncio.run(_run_agentic_workflow_async(initial_state, job_id))
        asyncio.run(
            _send_complete_webhook(
                content_id, job_id, data=final_state.get("course_draft", {})
            )
        )
        return {"status": "success", "content_id": content_id}
    except Exception as e:
        import traceback

        traceback.print_exc()
        asyncio.run(_send_complete_webhook(content_id, job_id, error=str(e)))
        raise e
