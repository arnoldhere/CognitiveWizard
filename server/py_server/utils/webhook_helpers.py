import httpx
import logging
from config.settings import settings

logger = logging.getLogger(__name__)
js_server_url = settings.JS_SERVER_URL

async def _send_checkpoint_webhook(job_id: str, stage: str, node: str, status: str) -> None:
    """
    Persist a stage checkpoint to MySQL via JS server webhook.
    """
    if not job_id:
        return
        
    try:
        payload = {
            "job_id": job_id,
            "stage": stage,
            "node": node,
            "status": status
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{js_server_url}/internal/wizard-webhook/checkpoint",
                json=payload,
            )
    except Exception as exc:
        logger.warning(f"Checkpoint webhook failed for {job_id} / {stage}: {exc}")
