"""
rag_evaluation.py  (router)
───────────────────────────
FastAPI router that exposes:
  POST /rag-eval/evaluate  – run full evaluation pipeline
  GET  /rag-eval/report    – fetch latest cached report

Mount in main.py:
    from api.rag_evaluation_api import router as rag_eval_router
    app.include_router(rag_eval_router)
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from schemas.rag_eval_schema import EvaluationRequest, EvaluationStatusResponse
from depedencies.get_evaluator import get_evaluator
from services.rag_evaluator import RAGEvaluator
from api.auth_api import require_role

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Rag evaluation"], prefix="/rag-eval")

# ── report cache (in-memory + disk fallback) ──────────────────────────────────
REPORT_CACHE_PATH = Path("reports/rag_eval_latest.json")
REPORT_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)

_latest_report: dict | None = None  # in-process cache
_eval_running: bool = False  # prevent duplicate runs


# ── endpoints ─────────────────────────────────────────────────────────────────


@router.post("/evaluate", response_model=EvaluationStatusResponse)
async def trigger_evaluation(
    request: EvaluationRequest,
    background: BackgroundTasks,
    _admin=Depends(require_role(["admin"])),  # auth guard
    evaluator: RAGEvaluator = Depends(get_evaluator),
):
    """
    Kick off async evaluation.  Returns immediately with status="running".
    Poll GET /report for results.  Prevents concurrent duplicate runs.
    """
    global _eval_running
    if _eval_running:
        raise HTTPException(status_code=409, detail="Evaluation already in progress")

    _eval_running = True
    qa_dicts = [p.model_dump() for p in request.qa_pairs]

    async def _run():
        global _latest_report, _eval_running
        try:
            report = await evaluator.evaluate_pipeline(qa_dicts)
            _latest_report = report
            # persist to disk so a server restart doesn't lose the last report
            REPORT_CACHE_PATH.write_text(json.dumps(report, indent=2))
            logger.info("RAG evaluation stored at %s", REPORT_CACHE_PATH)
        except Exception as exc:
            logger.error("Evaluation failed: %s", exc, exc_info=True)
            _latest_report = {
                "error": str(exc),
                "evaluated_at": datetime.utcnow().isoformat() + "Z",
            }
        finally:
            _eval_running = False

    background.add_task(_run)
    return EvaluationStatusResponse(status="running")


@router.get("/report", response_model=EvaluationStatusResponse)
async def get_report(
    _admin=Depends(require_role(["admin"])),
):
    """
    Return the latest evaluation report.
    Falls back to disk cache if the server was restarted.
    """
    global _latest_report

    if _eval_running:
        return EvaluationStatusResponse(status="running")

    # try in-memory cache first
    if _latest_report:
        return EvaluationStatusResponse(status="completed", report=_latest_report)

    # fallback: load from disk
    if REPORT_CACHE_PATH.exists():
        _latest_report = json.loads(REPORT_CACHE_PATH.read_text())
        return EvaluationStatusResponse(status="completed", report=_latest_report)

    return EvaluationStatusResponse(status="idle")


@router.delete("/report", status_code=204)
async def clear_report(
    _admin=Depends(require_role(["admin"])),
):
    """Reset cached report (useful for re-testing)."""
    global _latest_report
    _latest_report = None
    if REPORT_CACHE_PATH.exists():
        REPORT_CACHE_PATH.unlink()
