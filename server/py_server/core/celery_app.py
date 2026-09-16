import os
from celery import Celery
from config.settings import settings

redis_url = settings.REDIS_URL or os.environ.get(
    "REDIS_URL", "redis://localhost:6379/0"
)

celery_app = Celery(
    "wizard_tasks", broker=redis_url, backend=redis_url, include=["tasks.wizard_tasks"]
)

from kombu import Queue

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Worker Lifecycle & Memory Management
    worker_max_tasks_per_child=10,  # Recycle child worker process after 10 tasks to prevent memory leaks
    worker_max_memory_per_child=500000,  # Recycle child worker process if memory exceeds 500 MB
    task_time_limit=1800,  # 30-minute hard ceiling (aborts hung LLM calls)
    task_soft_time_limit=1500,  # 25-minute soft ceiling (allows graceful state cleanup)
    worker_prefetch_multiplier=1,  # Prevents worker from hoarding multiple heavy jobs
    result_expires=3600,  # Auto-expire completed task results in Redis after 1 hour
    task_acks_late=True,  # Ensure task is only acknowledged after full completion
    task_reject_on_worker_lost=True,  # Re-queue task if worker crashes unexpectedly
    broker_connection_retry_on_startup=True,
    # Isolated Task Queues & Priority Routing
    task_default_queue="wizard_course",
    task_queues=(
        Queue("wizard_course", routing_key="wizard.course"),
        Queue("wizard_guide", routing_key="wizard.guide"),
        Queue("wizard_roadmap", routing_key="wizard.roadmap"),
        Queue("wizard_retry", routing_key="wizard.retry"),
        Queue("wizard_recovery", routing_key="wizard.recovery"),
    ),
    task_routes={
        "tasks.wizard_tasks.generate_course_task": {
            "queue": "wizard_course",
            "routing_key": "wizard.course",
        },
        "tasks.wizard_tasks.run_agentic_workflow_task": {
            "queue": "wizard_course",
            "routing_key": "wizard.course",
        },
        "tasks.wizard_tasks.generate_roadmap_task": {
            "queue": "wizard_roadmap",
            "routing_key": "wizard.roadmap",
        },
        "tasks.wizard_tasks.generate_guide_task": {
            "queue": "wizard_guide",
            "routing_key": "wizard.guide",
        },
        "tasks.wizard_tasks.retry_job_task": {
            "queue": "wizard_retry",
            "routing_key": "wizard.retry",
        },
        "tasks.wizard_tasks.recover_jobs_task": {
            "queue": "wizard_recovery",
            "routing_key": "wizard.recovery",
        },
    },
)
