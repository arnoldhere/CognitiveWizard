"""
RAG Evaluation API Routes - Endpoints for running and retrieving RAG evaluations.

Endpoints:
- POST /rag/evaluate - Evaluate a single query-answer pair
- GET /rag/evaluation-report - Get the latest evaluation report
- POST /rag/auto-evaluate - One-click evaluation on recent query logs
- DELETE /rag/evaluation-report - Clear cached report
- GET /rag/evaluation-logs - Get recent query logs for analysis
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from config.db import get_db
from models.user import User
from models.rag_log import RAGQueryLog
from services.rag_evaluator import rag_evaluator
from api.auth_api import get_current_user, get_current_active_user
from pydantic import BaseModel

router = APIRouter(prefix="/rag", tags=["rag-evaluation"])
logger = logging.getLogger(__name__)

# In-memory report cache
_report_cache = {"report": None, "last_updated": None}


class RAGEvaluateRequest(BaseModel):
    """Request to evaluate a single query-answer pair."""

    question: str
    answer: str
    contexts: List[str]
    latency_retrieval_ms: Optional[float] = None
    latency_generation_ms: Optional[float] = None


class MetricScore(BaseModel):
    """Individual metric score with interpretation."""

    name: str
    score: float
    interpretation: str


class EvaluationReport(BaseModel):
    """Complete evaluation report."""

    timestamp: str
    query: str
    overall_score: float
    context_count: int
    metrics: List[MetricScore]
    latency: dict
    quality_level: str


@router.post("/evaluate")
def evaluate_single_query(
    req: RAGEvaluateRequest,
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """
    Evaluate a single RAG query-answer pair.

    Calculates all metrics including:
    - Faithfulness, context precision/recall, answer relevancy (RAGAS)
    - Hallucination rate, retrieval ratio, context awareness (custom)
    - Latency and efficiency scores

    Returns structured evaluation report.
    """
    try:
        report = rag_evaluator.evaluate(
            question=req.question,
            answer=req.answer,
            contexts=req.contexts,
            latency_retrieval_ms=req.latency_retrieval_ms,
            latency_generation_ms=req.latency_generation_ms,
        )

        return {
            "status": "success",
            "data": report,
        }
    except Exception as e:
        logger.exception("Single query evaluation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(e)}",
        )


@router.post("/auto-evaluate")
def auto_evaluate_recent_logs(
    background_tasks: BackgroundTasks,
    limit: int = 50,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    One-click evaluation on recent query logs.

    Fetches the last `limit` queries from database and evaluates them.
    Returns aggregated metrics and detailed reports.

    This runs in the background and caches results.
    """
    try:
        user_id = int(current_user.id)

        # Fetch recent logs for this user
        logs = (
            db.query(RAGQueryLog)
            .filter(RAGQueryLog.user_id == user_id)
            .order_by(RAGQueryLog.created_at.desc())
            .limit(limit)
            .all()
        )

        if not logs:
            return {
                "status": "info",
                "message": "No query logs found for evaluation",
                "data": {"total_queries": 0},
            }

        # Run evaluation in background
        background_tasks.add_task(
            _evaluate_logs_batch,
            logs,
            db,
        )

        return {
            "status": "processing",
            "message": f"Evaluation started for {len(logs)} queries",
            "data": {
                "total_queries": len(logs),
                "task_id": "auto_eval_" + str(user_id),
            },
        }
    except Exception as e:
        logger.exception("Auto-evaluation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Auto-evaluation failed: {str(e)}",
        )


@router.get("/evaluation-report")
def get_evaluation_report(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get the latest evaluation report.

    If no cached report exists, runs auto-evaluation on recent logs.
    Returns detailed metrics with color-coding and interpretation.
    """
    try:
        # Return cached report if available
        if _report_cache["report"]:
            return {
                "status": "success",
                "data": _report_cache["report"],
                "cached": True,
                "cached_at": _report_cache["last_updated"],
            }

        # Otherwise, evaluate recent logs
        user_id = int(current_user.id)
        logs = (
            db.query(RAGQueryLog)
            .filter(RAGQueryLog.user_id == user_id)
            .order_by(RAGQueryLog.created_at.desc())
            .limit(50)
            .all()
        )

        if not logs:
            return {
                "status": "info",
                "message": "No query logs available for report",
                "data": None,
            }

        # Generate aggregated report
        report = _generate_aggregated_report(logs)

        # Cache the report
        from datetime import datetime

        _report_cache["report"] = report
        _report_cache["last_updated"] = datetime.now().isoformat()

        return {
            "status": "success",
            "data": report,
            "cached": False,
        }
    except Exception as e:
        logger.exception("Failed to retrieve evaluation report")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve report: {str(e)}",
        )


@router.get("/evaluation-logs")
def get_evaluation_logs(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Retrieve recent RAG query logs.

    Used for manual review and detailed analysis of individual queries.
    """
    try:
        user_id = int(current_user.id)

        logs = (
            db.query(RAGQueryLog)
            .filter(RAGQueryLog.user_id == user_id)
            .order_by(RAGQueryLog.created_at.desc())
            .limit(limit)
            .all()
        )

        log_data = [
            {
                "id": log.id,
                "question": log.question,
                "answer": (
                    log.answer[:200] + "..." if len(log.answer) > 200 else log.answer
                ),
                "context_count": log.context_count,
                "latency_total_ms": log.latency_total_ms,
                "created_at": log.created_at.isoformat() if log.created_at else None,
                "metrics": log.metrics,
            }
            for log in logs
        ]

        return {
            "status": "success",
            "data": log_data,
            "total": len(log_data),
        }
    except Exception as e:
        logger.exception("Failed to retrieve evaluation logs")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve logs: {str(e)}",
        )


@router.delete("/evaluation-report")
def clear_evaluation_report(
    current_user: User = Depends(get_current_active_user),
) -> dict:
    """Clear cached evaluation report."""
    try:
        _report_cache["report"] = None
        _report_cache["last_updated"] = None
        rag_evaluator.clear_cache()

        return {
            "status": "success",
            "message": "Evaluation cache cleared",
        }
    except Exception as e:
        logger.exception("Failed to clear report cache")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}",
        )


# ============
# Helper Functions
# ============


def _evaluate_logs_batch(logs: List[RAGQueryLog], db: Session) -> None:
    """
    Batch evaluate query logs.

    This runs in the background to evaluate all logs and cache results.
    """
    try:
        for log in logs:
            if log.contexts:
                report = rag_evaluator.evaluate(
                    question=log.question,
                    answer=log.answer,
                    contexts=log.contexts,
                    latency_retrieval_ms=log.latency_retrieval_ms,
                    latency_generation_ms=log.latency_generation_ms,
                )

                # Store metrics in the log entry
                log.metrics = report.get("metrics", {})
                db.commit()

        logger.info(f"Batch evaluation completed for {len(logs)} logs")
    except Exception as e:
        logger.error(f"Batch evaluation failed: {e}")


def _generate_aggregated_report(logs: List[RAGQueryLog]) -> dict:
    """
    Generate aggregated evaluation report from multiple logs.

    Computes statistics across all queries for dashboard display.
    """
    import statistics
    from datetime import datetime

    if not logs:
        return {"status": "no_data"}

    # Evaluate all logs
    all_metrics = {"faithfulness": [], "answer_relevancy": [], "context_precision": []}
    all_latencies = {"retrieval": [], "generation": [], "total": []}

    for log in logs:
        if log.contexts:
            try:
                report = rag_evaluator.evaluate(
                    question=log.question,
                    answer=log.answer,
                    contexts=log.contexts,
                    latency_retrieval_ms=log.latency_retrieval_ms,
                    latency_generation_ms=log.latency_generation_ms,
                )

                metrics = report.get("metrics", {})
                for key in all_metrics.keys():
                    if key in metrics:
                        all_metrics[key].append(metrics[key])

                latency = report.get("latency", {})
                if latency.get("retrieval_ms"):
                    all_latencies["retrieval"].append(latency["retrieval_ms"])
                if latency.get("generation_ms"):
                    all_latencies["generation"].append(latency["generation_ms"])
                if latency.get("total_ms"):
                    all_latencies["total"].append(latency["total_ms"])

            except Exception as e:
                logger.debug(f"Could not evaluate log {log.id}: {e}")

    # Compute aggregated statistics
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_queries_evaluated": len(logs),
        "metrics_summary": {},
        "latency_summary": {},
    }

    # Aggregate metrics
    for metric, values in all_metrics.items():
        if values:
            report["metrics_summary"][metric] = {
                "mean": round(statistics.mean(values), 3),
                "median": round(statistics.median(values), 3),
                "min": round(min(values), 3),
                "max": round(max(values), 3),
                "stdev": round(statistics.stdev(values), 3) if len(values) > 1 else 0.0,
            }

    # Aggregate latencies
    for latency_type, values in all_latencies.items():
        if values:
            report["latency_summary"][latency_type] = {
                "mean_ms": round(statistics.mean(values), 2),
                "median_ms": round(statistics.median(values), 2),
                "min_ms": round(min(values), 2),
                "max_ms": round(max(values), 2),
            }

    return report
