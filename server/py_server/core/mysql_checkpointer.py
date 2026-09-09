"""
core/mysql_checkpointer.py
============================
Custom LangGraph CheckpointSaver backed by MySQL (PyMySQL).

Provides both synchronous and asynchronous checkpoint operations.
Async methods use ``asyncio.to_thread`` to offload blocking PyMySQL calls
so the checkpointer works seamlessly with LangGraph's async execution
(``graph.ainvoke``, ``graph.aget_state``) inside Celery workers.

Table schema is managed by Sequelize models on the JS server side
(``LanggraphCheckpoint.js``, ``LanggraphWrite.js``).
This module does NOT create or alter tables — it only reads/writes data.
"""

import asyncio
import base64
import json
import logging
import threading
from typing import Any, AsyncIterator, Dict, Iterator, Optional, Sequence, Tuple
import pymysql
import pymysql.cursors
from langgraph.checkpoint.base import (
    BaseCheckpointSaver,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
)

logger = logging.getLogger(__name__)


class MySQLSaver(BaseCheckpointSaver):
    """
    A LangGraph CheckpointSaver that persists state to MySQL.

    Reads/writes to two tables (created by Sequelize on JS server startup):
    - ``langgraph_checkpoints`` — full state snapshots after each node
    - ``langgraph_writes``      — granular channel-level pending writes

    Supports both sync and async execution modes:
    - sync:  ``get_tuple``, ``put``, ``put_writes``, ``list``
    - async: ``aget_tuple``, ``aput``, ``aput_writes``, ``alist``
    """

    def __init__(self, conn: pymysql.connections.Connection) -> None:
        super().__init__()
        self.conn = conn
        self._lock = threading.Lock()

    # ── Connection Health

    def _ensure_connection(self) -> None:
        """
        Verify the MySQL connection is alive; reconnect if stale.

        Long-running Celery workers may hold idle connections past MySQL's
        ``wait_timeout``, causing 'MySQL server has gone away' errors.
        """
        try:
            self.conn.ping(reconnect=True)
        except Exception:
            logger.warning("MySQL connection lost — attempting reconnect")
            try:
                self.conn.ping(reconnect=True)
            except Exception as e:
                logger.error(f"MySQL reconnect failed: {e}")
                raise

    # ── Synchronous Methods

    def get_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        """Fetch the latest (or specific) checkpoint for a thread."""
        with self._lock:
            self._ensure_connection()

            thread_id = config["configurable"]["thread_id"]
            checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
            checkpoint_id = config["configurable"].get("checkpoint_id")

            try:
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    if checkpoint_id:
                        cursor.execute(
                            "SELECT checkpoint_id, checkpoint, metadata, "
                            "parent_checkpoint_id, type "
                            "FROM langgraph_checkpoints "
                            "WHERE thread_id = %s AND checkpoint_ns = %s "
                            "AND checkpoint_id = %s",
                            (thread_id, checkpoint_ns, checkpoint_id),
                        )
                    else:
                        cursor.execute(
                            "SELECT checkpoint_id, checkpoint, metadata, "
                            "parent_checkpoint_id, type "
                            "FROM langgraph_checkpoints "
                            "WHERE thread_id = %s AND checkpoint_ns = %s "
                            "ORDER BY checkpoint_id DESC LIMIT 1",
                            (thread_id, checkpoint_ns),
                        )

                    row = cursor.fetchone()
                    if not row:
                        return None

                    return self._row_to_tuple(row, thread_id, checkpoint_ns, cursor)
            except Exception as e:
                logger.error(f"Error fetching checkpoint tuple: {e}")
                return None

    def list(
        self,
        config: Dict[str, Any],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Iterator[CheckpointTuple]:
        """List checkpoint history for a thread, newest first."""
        with self._lock:
            self._ensure_connection()

            thread_id = config["configurable"]["thread_id"]
            checkpoint_ns = config["configurable"].get("checkpoint_ns", "")

            query = (
                "SELECT checkpoint_id, checkpoint, metadata, "
                "parent_checkpoint_id, type "
                "FROM langgraph_checkpoints "
                "WHERE thread_id = %s AND checkpoint_ns = %s"
            )
            params = [thread_id, checkpoint_ns]

            if before and before.get("configurable", {}).get("checkpoint_id"):
                query += " AND checkpoint_id < %s"
                params.append(before["configurable"]["checkpoint_id"])

            query += " ORDER BY checkpoint_id DESC"

            if limit:
                query += " LIMIT %s"
                params.append(limit)

            try:
                with self.conn.cursor(pymysql.cursors.DictCursor) as cursor:
                    cursor.execute(query, tuple(params))
                    rows = cursor.fetchall()
            except Exception as e:
                logger.error(f"Error listing checkpoints: {e}")
                return

            for row in rows:
                result = self._row_to_tuple(row, thread_id, checkpoint_ns, cursor)
                if result:
                    yield result

    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Dict[str, str],
    ) -> Dict[str, Any]:
        """Persist a checkpoint snapshot to MySQL."""
        with self._lock:
            self._ensure_connection()

            thread_id = config["configurable"]["thread_id"]
            checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
            checkpoint_id = checkpoint["id"]

            if hasattr(self.serde, "dumps_typed"):
                type_, serialized = self.serde.dumps_typed(checkpoint)
            else:
                type_, serialized = "json", self.serde.dumps(checkpoint)

            if isinstance(serialized, bytes):
                try:
                    checkpoint_val = serialized.decode("utf-8")
                    json.loads(checkpoint_val)
                except Exception:
                    checkpoint_val = json.dumps(base64.b64encode(serialized).decode("ascii"))
                    type_ = f"b64:{type_}"
            else:
                checkpoint_val = serialized

            serialized_metadata = json.dumps(metadata)
            parent_checkpoint_id = config["configurable"].get("checkpoint_id")

            try:
                with self.conn.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO langgraph_checkpoints "
                        "(thread_id, checkpoint_ns, checkpoint_id, "
                        "parent_checkpoint_id, type, checkpoint, metadata, created_at) "
                        "VALUES (%s, %s, %s, %s, %s, %s, %s, NOW()) "
                        "ON DUPLICATE KEY UPDATE "
                        "checkpoint=VALUES(checkpoint), metadata=VALUES(metadata)",
                        (
                            thread_id,
                            checkpoint_ns,
                            checkpoint_id,
                            parent_checkpoint_id,
                            type_,
                            checkpoint_val,
                            serialized_metadata,
                        ),
                    )
                self.conn.commit()
            except Exception as e:
                logger.error(f"Error putting checkpoint: {e}")

            return {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            }

    def put_writes(
        self,
        config: Dict[str, Any],
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
    ) -> None:
        """Persist granular channel writes for a checkpoint."""
        with self._lock:
            self._ensure_connection()

            thread_id = config["configurable"]["thread_id"]
            checkpoint_ns = config["configurable"].get("checkpoint_ns", "")
            checkpoint_id = config["configurable"]["checkpoint_id"]

            try:
                with self.conn.cursor() as cursor:
                    for idx, (channel, value) in enumerate(writes):
                        if hasattr(self.serde, "dumps_typed"):
                            type_, serialized = self.serde.dumps_typed(value)
                        else:
                            type_, serialized = "json", self.serde.dumps(value)

                        if isinstance(serialized, bytes):
                            try:
                                write_val = serialized.decode("utf-8")
                            except UnicodeDecodeError:
                                write_val = base64.b64encode(serialized).decode("ascii")
                                type_ = f"b64:{type_}"
                        else:
                            write_val = serialized

                        cursor.execute(
                            "INSERT INTO langgraph_writes "
                            "(thread_id, checkpoint_ns, checkpoint_id, "
                            "task_id, idx, channel, type, value, created_at) "
                            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW()) "
                            "ON DUPLICATE KEY UPDATE value=VALUES(value)",
                            (
                                thread_id,
                                checkpoint_ns,
                                checkpoint_id,
                                task_id,
                                idx,
                                channel,
                                type_,
                                write_val,
                            ),
                        )
                self.conn.commit()
            except Exception as e:
                logger.error(f"Error putting writes: {e}")

    # ── Async Methods (via asyncio.to_thread)

    async def aget_tuple(self, config: Dict[str, Any]) -> Optional[CheckpointTuple]:
        """Async wrapper around ``get_tuple``."""
        return await asyncio.to_thread(self.get_tuple, config)

    async def aput(
        self,
        config: Dict[str, Any],
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: Dict[str, str],
    ) -> Dict[str, Any]:
        """Async wrapper around ``put``."""
        return await asyncio.to_thread(
            self.put, config, checkpoint, metadata, new_versions
        )

    async def aput_writes(
        self,
        config: Dict[str, Any],
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
    ) -> None:
        """Async wrapper around ``put_writes``."""
        return await asyncio.to_thread(self.put_writes, config, writes, task_id)

    async def alist(
        self,
        config: Dict[str, Any],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> AsyncIterator[CheckpointTuple]:
        """Async wrapper around ``list`` — yields checkpoint tuples."""
        results = await asyncio.to_thread(
            lambda: list(self.list(config, filter=filter, before=before, limit=limit))
        )
        for item in results:
            yield item

    # ── Internal Helpers

    def _row_to_tuple(
        self,
        row: dict,
        thread_id: str,
        checkpoint_ns: str,
        cursor,
    ) -> Optional[CheckpointTuple]:
        """Convert a database row into a ``CheckpointTuple``."""
        try:
            checkpoint_id = row["checkpoint_id"]

            fetched_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            }

            # Deserialize checkpoint data
            raw_checkpoint = row["checkpoint"]
            ckpt_type = row["type"] or "json"
            if ckpt_type.startswith("b64:"):
                ckpt_type = ckpt_type[4:]
                if isinstance(raw_checkpoint, str):
                    try:
                        parsed = json.loads(raw_checkpoint)
                        if isinstance(parsed, str):
                            raw_checkpoint = parsed
                    except Exception:
                        pass
                    raw_checkpoint = base64.b64decode(raw_checkpoint.encode("ascii"))
                elif isinstance(raw_checkpoint, bytes):
                    raw_checkpoint = base64.b64decode(raw_checkpoint)
            elif isinstance(raw_checkpoint, str):
                raw_checkpoint = raw_checkpoint.encode("utf-8")

            if hasattr(self.serde, "loads_typed"):
                checkpoint = self.serde.loads_typed(
                    (ckpt_type, raw_checkpoint)
                )
            else:
                checkpoint = self.serde.loads(raw_checkpoint)

            # Deserialize metadata
            raw_metadata = row["metadata"]
            if isinstance(raw_metadata, dict):
                metadata = raw_metadata
            else:
                metadata = json.loads(raw_metadata)

            # Build parent config
            parent_config = None
            if row.get("parent_checkpoint_id"):
                parent_config = {
                    "configurable": {
                        "thread_id": thread_id,
                        "checkpoint_ns": checkpoint_ns,
                        "checkpoint_id": row["parent_checkpoint_id"],
                    }
                }

            # Fetch pending writes for this checkpoint
            cursor.execute(
                "SELECT task_id, channel, type, value "
                "FROM langgraph_writes "
                "WHERE thread_id = %s AND checkpoint_ns = %s "
                "AND checkpoint_id = %s "
                "ORDER BY task_id, idx",
                (thread_id, checkpoint_ns, checkpoint_id),
            )
            writes_rows = cursor.fetchall()

            pending_writes = []
            for r in writes_rows:
                w_type = r["type"] or "json"
                w_val = r["value"]
                if w_type.startswith("b64:"):
                    w_type = w_type[4:]
                    if isinstance(w_val, str):
                        w_val = base64.b64decode(w_val.encode("ascii"))
                    elif isinstance(w_val, bytes):
                        w_val = base64.b64decode(w_val)
                elif isinstance(w_val, str):
                    w_val = w_val.encode("utf-8")

                if hasattr(self.serde, "loads_typed"):
                    val = self.serde.loads_typed((w_type, w_val))
                else:
                    val = self.serde.loads(w_val)
                pending_writes.append((r["task_id"], r["channel"], val))

            return CheckpointTuple(
                config=fetched_config,
                checkpoint=checkpoint,
                metadata=metadata,
                parent_config=parent_config,
                pending_writes=pending_writes,
            )
        except Exception as e:
            logger.error(f"Error deserializing checkpoint row: {e}")
            return None
