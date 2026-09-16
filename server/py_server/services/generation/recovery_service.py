"""
services/generation/recovery_service.py
=======================================
Startup Recovery & Orphaned Generation Reconnection Service.

Scans for incomplete or interrupted jobs across Course, Roadmap, and Guide
when py_server boots up or when worker processes restart. Re-queues recoverable
jobs into the Celery priority queue for automatic resumption from checkpoints.
"""

from __future__ import annotations
import json
import logging
from typing import Any, Dict, List
import pymysql.cursors

from core.db import get_db_connection

logger = logging.getLogger(__name__)


class GenerationRecoveryService:
    """Detects orphaned generation jobs and safely re-enqueues them."""

    def __init__(self, max_retries: int = 3, stale_minutes: int = 10):
        self.max_retries = max_retries
        self.stale_minutes = stale_minutes

    def scan_and_recover_incomplete_jobs(self) -> Dict[str, Any]:
        """
        Scan `wizard_generation_jobs` for jobs stuck in 'queued', 'running', or 'resuming'
        states with no recent heartbeat/update.
        """
        logger.info("[RecoveryService] Scanning for interrupted/orphaned generation jobs...")
        conn = get_db_connection()
        recovered: List[str] = []
        abandoned: List[str] = []

        try:
            with conn.cursor(pymysql.cursors.DictCursor) as cursor:
                # Query jobs that have been stuck for longer than stale_minutes
                query = """
                    SELECT id, wizard_content_id, thread_id, content_type, status, retry_count, input_payload, updated_at
                    FROM wizard_generation_jobs
                    WHERE status IN ('queued', 'running', 'resuming')
                      AND updated_at < NOW() - INTERVAL %s MINUTE
                    ORDER BY updated_at ASC
                    LIMIT 20
                """
                cursor.execute(query, (self.stale_minutes,))
                stale_jobs = cursor.fetchall()

                logger.info("[RecoveryService] Found %d stale job(s)", len(stale_jobs))

                for job in stale_jobs:
                    thread_id = job.get("thread_id")
                    retry_count = job.get("retry_count") or 0
                    content_type = job.get("content_type") or "course"

                    if retry_count < self.max_retries:
                        logger.info(
                            "[RecoveryService] Re-enqueueing recoverable job %s (type=%s, attempt %d/%d)",
                            thread_id,
                            content_type,
                            retry_count + 1,
                            self.max_retries,
                        )
                        # Mark status as resuming
                        cursor.execute(
                            """
                            UPDATE wizard_generation_jobs
                            SET status = 'resuming', retry_count = retry_count + 1, updated_at = NOW()
                            WHERE id = %s
                            """,
                            (job["id"],),
                        )
                        conn.commit()

                        # Dispatch Celery retry task
                        from tasks.wizard_tasks import retry_job_task
                        retry_job_task.delay(job_id=thread_id)
                        recovered.append(thread_id)
                    else:
                        logger.warning(
                            "[RecoveryService] Marking unrecoverable job %s as failed (max retries exhausted)",
                            thread_id,
                        )
                        cursor.execute(
                            """
                            UPDATE wizard_generation_jobs
                            SET status = 'failed',
                                user_message = 'Generation timed out and reached maximum recovery attempts.',
                                updated_at = NOW()
                            WHERE id = %s
                            """,
                            (job["id"],),
                        )
                        conn.commit()
                        abandoned.append(thread_id)

            return {
                "recovered_count": len(recovered),
                "recovered_jobs": recovered,
                "abandoned_count": len(abandoned),
                "abandoned_jobs": abandoned,
            }

        except Exception as exc:
            logger.error("[RecoveryService] Error during recovery scan: %s", exc)
            return {
                "recovered_count": 0,
                "recovered_jobs": [],
                "abandoned_count": 0,
                "abandoned_jobs": [],
                "error": str(exc),
            }
        finally:
            conn.close()


generation_recovery_service = GenerationRecoveryService()
