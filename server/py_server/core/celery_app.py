import os
from celery import Celery

# Redis is running on localhost:6379 in this environment.
redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "wizard_tasks",
    broker=redis_url,
    backend=redis_url,
    include=["tasks.wizard_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
)
