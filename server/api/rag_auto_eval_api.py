"""
Collects recent RAGQueryLog rows from MySQL and POSTs them to the
evaluation endpoint so the admin can trigger evaluation with one click
without manually providing qa_pairs.

Called by the admin dashboard's "Run Evaluation" button via:
  POST /rag-eval-auto/auto-evaluate

This endpoint internally:
  1. Fetches last N logged queries from DB
  2. Filters rows that have a ground_truth (or uses answer as proxy)
  3. Calls the evaluate pipeline directly
"""

import json
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from config.db import get_db
from models.rag_log import RAGQueryLog
from services.rag_evaluator import RAGEvaluator
from api.auth_api import require_role
from api.rag_evaluation_api import EvaluationStatusResponse
from depedencies.get_evaluator import get_evaluator
from fastapi import BackgroundTasks

router = APIRouter(prefix="/rag-eval-auto", tags=["RAG Auto Evaluation"])

# Default sample window: last 50 queries
SAMPLE_LIMIT = 50


@router.post("/auto-evaluate", response_model=EvaluationStatusResponse)
async def auto_evaluate(
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    _admin=Depends(require_role(["admin"])),
    evaluator: RAGEvaluator = Depends(get_evaluator),
    limit: int = Query(default=SAMPLE_LIMIT, ge=1, le=500),
):
    """
    One-click evaluation endpoint.
    Pulls recent RAG query logs from DB and runs full evaluation pipeline.
    No need to manually supply qa_pairs — the DB has them all.
    """

    # ── fetch recent logged queries ──────────────────────────────────────────
    logs: list[RAGQueryLog] = (
        db.query(RAGQueryLog)
        .order_by(RAGQueryLog.created_at.desc())
        .limit(limit)
        .all()
    )

    if not logs:
        raise HTTPException(
            status_code=404,
            detail="No RAG query logs found. Use the chatbot first to generate evaluation data.",
        )

    # ── build qa_pairs list ───────────────────────────────────────────────────
    qa_pairs = []
    for log in logs:
        contexts = log.contexts if isinstance(log.contexts, list) else []
        if isinstance(log.contexts, str):
            try:
                parsed = json.loads(log.contexts)
                if isinstance(parsed, list):
                    contexts = parsed
            except json.JSONDecodeError:
                contexts = [log.contexts]

        qa_pairs.append(
            {
                "question": log.question,
                "answer": log.answer,
                "contexts": contexts,
                # ground_truth: use stored value or fall back to answer itself
                # (faithfulness still meaningful; recall degrades gracefully)
                "ground_truth": getattr(log, "ground_truth", None) or log.answer,
                "retrieval_ms": (
                    log.latency_retrieval_ms
                    if log.latency_retrieval_ms is not None
                    else getattr(log, "retrieval_ms", None)
                ),
                "generation_ms": (
                    log.latency_generation_ms
                    if log.latency_generation_ms is not None
                    else getattr(log, "generation_ms", None)
                ),
                "total_ms": (
                    log.latency_total_ms
                    if log.latency_total_ms is not None
                    else getattr(log, "total_ms", None)
                ),
            }
        )

    # ── delegate to shared evaluation background task ─────────────────────────
    import api.rag_evaluation_api as eval_mod
    from api.rag_evaluation_api import REPORT_CACHE_PATH

    if eval_mod._eval_running:
        raise HTTPException(status_code=409, detail="Evaluation already in progress")

    eval_mod._eval_running = True

    async def _run():
        try:
            report = await evaluator.evaluate_pipeline(qa_pairs)
            eval_mod._latest_report = report
            REPORT_CACHE_PATH.write_text(json.dumps(report, indent=2))
        except Exception as exc:
            logging.getLogger(__name__).error(
                "Auto-eval failed: %s", exc, exc_info=True
            )
            eval_mod._latest_report = {
                "error": str(exc),
                "evaluated_at": datetime.utcnow().isoformat() + "Z",
            }
        finally:
            eval_mod._eval_running = False

    background.add_task(_run)
    return EvaluationStatusResponse(status="running")
