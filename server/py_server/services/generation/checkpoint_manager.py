"""
services/generation/checkpoint_manager.py
=========================================
Central Checkpoint and State Manager for Resumable Agentic Pipelines.

Responsibilities:
- Generates stable, versioned checkpoint_thread_ids.
- Bridges LangGraph async state persistence with MySQLSaver.
- Guarantees idempotency on worker restarts using (job_id, stage, attempt).
- Syncs stage checkpoints to the Express gateway via webhooks.
"""

from __future__ import annotations
import httpx
import logging
import time
from typing import Any, Dict, Optional, Tuple

from core.db import get_db_connection
from core.mysql_checkpointer import MySQLSaver
from config.settings import settings

logger = logging.getLogger(__name__)

GENERATION_VERSION = 1
GRAPH_VERSION = "1.0"


class CheckpointManager:
    """Manages LangGraph checkpoints, resumption tokens, and stage idempotency."""

    def __init__(self, js_server_url: Optional[str] = None):
        self.js_server_url = js_server_url or settings.JS_SERVER_URL
        self._completed_stages: set[str] = set()

    @staticmethod
    def build_thread_id(content_id: int, content_type: str = "gen", timestamp: Optional[int] = None) -> str:
        """Construct a stable, deterministic checkpoint thread identifier."""
        ts = timestamp or int(time.time())
        clean_type = content_type.lower().replace("/", "_").replace(" ", "_")
        return f"job_{content_id}_{clean_type}_{ts}"

    @staticmethod
    def get_saver() -> Tuple[MySQLSaver, Any]:
        """
        Creates a MySQLSaver checkpointer instance.
        Returns: (checkpointer, db_connection) - caller must close connection when done.
        """
        conn = get_db_connection()
        return MySQLSaver(conn), conn

    @staticmethod
    def build_config(thread_id: str) -> Dict[str, Any]:
        """Builds the LangGraph runtime config with thread_id."""
        return {
            "configurable": {
                "thread_id": thread_id,
            }
        }

    async def check_resumable_state(self, graph: Any, thread_id: str) -> Optional[Any]:
        """
        Inspect MySQLSaver for an existing checkpoint.
        If a checkpoint with pending next steps exists, returns the state tuple.
        """
        config = self.build_config(thread_id)
        try:
            state = await graph.aget_state(config)
            if state and state.next:
                logger.info(
                    "[CheckpointManager] Found resumable state for %s. Next nodes: %s",
                    thread_id,
                    state.next,
                )
                return state
        except Exception as exc:
            logger.warning("[CheckpointManager] Failed to inspect state for %s: %s", thread_id, exc)
        return None

    def is_stage_idempotent(self, job_id: str, stage: str, attempt: int) -> bool:
        """
        Check if a given (job_id, stage, attempt) has already executed successfully.
        Prevents duplicate database persistence if a worker process crashes or re-queues.
        """
        key = f"{job_id}:{stage}:{attempt}"
        if key in self._completed_stages:
            return True
        return False

    def mark_stage_completed(self, job_id: str, stage: str, attempt: int):
        """Mark a given stage attempt as successfully completed."""
        key = f"{job_id}:{stage}:{attempt}"
        self._completed_stages.add(key)

    async def persist_stage_checkpoint(
        self, job_id: str, stage: str, node: str, status: str = "completed"
    ) -> None:
        """Notify the JS server to persist a stage checkpoint in wizard_generation_jobs."""
        if not job_id:
            return

        payload = {
            "job_id": job_id,
            "stage": stage,
            "node": node,
            "status": status,
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    f"{self.js_server_url}/internal/wizard-webhook/checkpoint",
                    json=payload,
                )
        except Exception as exc:
            logger.warning(
                "[CheckpointManager] Checkpoint webhook failed for %s/%s: %s",
                job_id,
                stage,
                exc,
            )


# Global singleton instance
checkpoint_manager = CheckpointManager()
