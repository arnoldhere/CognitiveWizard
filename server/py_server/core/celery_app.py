import os
from celery import Celery
from dotenv import load_dotenv
from config.settings import settings

load_dotenv()

redis_url = settings.REDIS_URL
if redis_url.startswith("rediss://") and "ssl_cert_reqs" not in redis_url:
    separator = "&" if "?" in redis_url else "?"
    redis_url += f"{separator}ssl_cert_reqs=CERT_NONE"

celery_app = Celery(
    "cognitive_wizard",
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
