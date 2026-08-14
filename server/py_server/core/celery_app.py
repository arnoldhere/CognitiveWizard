import os
from celery import Celery
from config.settings import settings

redis_url = settings.REDIS_URL

celery_app = Celery(
    "wizard_celery_app",
    broker=redis_url,
    backend=redis_url,
    include=["tasks.wizard_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,  # Important for durability: wait until task finishes to acknowledge
    task_reject_on_worker_lost=True,  # Requeue task if worker crashes
    worker_prefetch_multiplier=1,  # Fetch one task at a time for long-running workflows
)
