from celery import Celery

# ==========
# init the celery app
# ==========
celery_app = Celery(
    "cognitive_wizard",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/1",
)

celery_app.conf.update(task_track_started=True)  # manage tasks states
