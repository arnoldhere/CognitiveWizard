import os
import ssl
import certifi
from celery import Celery
from dotenv import load_dotenv
from config.settings import settings

load_dotenv()

redis_url = settings.REDIS_URL

celery_app = Celery(
    "cognitive_wizard",
    broker=redis_url,
    backend=redis_url,
    include=["tasks.wizard_tasks"],
)

# Define SSL settings using certifi's bundle
ssl_config = {
    "ssl_cert_reqs": ssl.CERT_REQUIRED,
    "ssl_ca_certs": certifi.where(),
}

# Apply SSL settings if using secure Redis (rediss://)
is_ssl = redis_url.startswith("rediss://")

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Pass SSL config to both broker and result backend if connecting via SSL
    broker_use_ssl=ssl_config if is_ssl else None,
    redis_backend_use_ssl=ssl_config if is_ssl else None,
)
