"""
rag_evaluator.py
────────────────
Core RAGAS-based evaluation engine for CognitiveWizard's RAG chatbot.
Computes all 8 metrics in a single pipeline call and returns a structured report.

Metrics evaluated
─────────────────
1.  Faithfulness          – answer grounded in retrieved context
2.  Context Precision     – retrieved chunks truly relevant to question
3.  Context Recall        – relevant info present in retrieved chunks
4.  Hallucination Rate    – 1 − faithfulness (derived)
5.  Context Retrieval Ratio – fraction of relevant chunks retrieved
6.  Answer Relevancy      – answer addresses the question
7.  Context Awareness     – LLM utilisation of available context
8.  Latency & Efficiency  – wall-clock timing per pipeline stage
"""

import time
import os
import asyncio
import logging
import math
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)


# ── helpers ───────────────────────────────────────────────────────────────────


def _build_ragas_dataset(qa_pairs: list[dict]):
    """
    Convert raw QA triplets into the HuggingFace Dataset format RAGAS expects.

    Each qa_pair must contain:
        question   : str
        answer     : str          (model-generated answer)
        contexts   : list[str]    (retrieved document chunks)
        ground_truth: str         (reference / expected answer)
    """
    from datasets import Dataset

    rows = []
    for item in qa_pairs:
        contexts = item.get("contexts") or []
        row = {
            **item,
            # Keep both legacy and current RAGAS column names so the evaluator
            # remains tolerant across ragas package versions.
            "question": item.get("question", ""),
            "answer": item.get("answer", ""),
            "contexts": contexts,
            "ground_truth": item.get("ground_truth", ""),
            "user_input": item.get("question", ""),
            "response": item.get("answer", ""),
            "retrieved_contexts": contexts,
            "reference": item.get("ground_truth", ""),
        }
        rows.append(row)

    return Dataset.from_list(rows)


def _compute_context_retrieval_ratio(qa_pairs: list[dict]) -> float:
    """
    Context Retrieval Ratio = (chunks that contain ground-truth keywords)/ (total chunks retrieved)

    Simple keyword-overlap heuristic — replace with BM25 or semantic
    similarity if you want a more rigorous implementation.
    """
    ratios = []
    for item in qa_pairs:
        gt_tokens = set(item["ground_truth"].lower().split())
        relevant = sum(
            1
            for chunk in item["contexts"]
            if gt_tokens & set(chunk.lower().split())  # non-empty intersection
        )
        total = len(item["contexts"]) or 1  # avoid div-by-zero
        ratios.append(relevant / total)
    return round(sum(ratios) / len(ratios), 4) if ratios else 0.0


def _compute_context_awareness(qa_pairs: list[dict]) -> float:
    """
    Context Awareness = fraction of answer tokens that can be traced to
    at least one retrieved chunk.

    Token-level coverage proxy — lightweight and dependency-free.
    """
    scores = []
    for item in qa_pairs:
        answer_tokens = set(item["answer"].lower().split())
        context_tokens = set(
            token for chunk in item["contexts"] for token in chunk.lower().split()
        )
        if not answer_tokens:
            scores.append(0.0)
            continue
        covered = answer_tokens & context_tokens
        scores.append(len(covered) / len(answer_tokens))
    return round(sum(scores) / len(scores), 4) if scores else 0.0


# ── main evaluator class ──────────────────────────────────────────────────────


class RAGEvaluator:
    """
    Stateless evaluation pipeline.
    Instantiate once at startup and reuse across requests.
    """

    def __init__(
        self,
        llm_model_name: str = "mistralai/Mistral-7B-Instruct-v0.2",
        embed_model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        hf_token: Optional[str] = None,
    ):
        self.llm_model_name = self._normalize_model_name(llm_model_name)
        self.embed_model_name = self._normalize_model_name(embed_model_name)
        self.hf_token = hf_token
        self._llm = None
        self._embeddings = None

    @staticmethod
    def _normalize_model_name(model_name: Optional[str]) -> Optional[str]:
        if not model_name:
            return model_name
        return model_name.strip().strip('"').strip("'")

    def _get_ragas_clients(self):
        """
        Lazily create evaluator dependencies so the API can start even when
        optional RAGAS packages or model credentials are not configured.
        """
        if self._llm is None:
            from config.settings import settings
            from providers.llm_provider import Provider

            self._llm = Provider(
                provider=settings.DEF_LLM_PROVIDER or "huggingface",
                model_name=self.llm_model_name,
                temperature=0.0,
            ).get_llm()

        if self._embeddings is None:
            if self.hf_token and "HF_API_KEY" not in os.environ:
                os.environ["HF_API_KEY"] = self.hf_token
            from langchain_huggingface import HuggingFaceEmbeddings

            self._embeddings = HuggingFaceEmbeddings(model_name=self.embed_model_name)

        return self._llm, self._embeddings

    # ── public entry point ────────────────────────────────────────────────────

    async def evaluate_pipeline(self, qa_pairs: list[dict]) -> dict:
        """
        Run full evaluation suite and return a structured metrics report.

        Parameters
        ──────────
        qa_pairs : list of dicts, each with keys:
            question, answer, contexts (list[str]), ground_truth

        Returns
        ───────
        dict with all metrics + metadata
        """
        if not qa_pairs:
            raise ValueError("qa_pairs must not be empty")

        report: dict = {
            "evaluated_at": datetime.utcnow().isoformat() + "Z",
            "sample_count": len(qa_pairs),
            "metrics": {},
            "latency": {},
        }

        # ── 1-4: RAGAS core metrics ───────────────────────────────────────────
        ragas_start = time.perf_counter()

        from ragas import evaluate
        from ragas.metrics import (
            faithfulness,
            context_precision,
            context_recall,
            answer_relevancy,
        )

        dataset = _build_ragas_dataset(qa_pairs)
        llm, embeddings = self._get_ragas_clients()

        # Run synchronous RAGAS evaluate in a thread so we don't block the
        # async FastAPI event loop.
        ragas_result = await asyncio.to_thread(
            evaluate,
            dataset,
            metrics=[
                faithfulness,
                context_precision,
                context_recall,
                answer_relevancy,
            ],
            llm=llm,
            embeddings=embeddings,
        )

        ragas_elapsed = round(time.perf_counter() - ragas_start, 3)

        # Extract scalar scores (RAGAS returns EvaluationResult; .to_pandas()
        # gives per-row scores; mean() gives aggregate)
        scores_df = ragas_result.to_pandas()

        faithfulness_score = _safe_mean(scores_df, "faithfulness")
        ctx_precision_score = _safe_mean(scores_df, "context_precision")
        ctx_recall_score = _safe_mean(scores_df, "context_recall")
        answer_rel_score = _safe_mean(scores_df, "answer_relevancy")
        per_sample = _build_per_sample_scores(qa_pairs, scores_df)

        # ── 5: Hallucination Rate = 1 − faithfulness ──────────────────────────
        hallucination_rate = round(1.0 - faithfulness_score, 4)

        # ── 6-7: custom lightweight metrics ──────────────────────────────────
        ctx_retrieval_ratio = _compute_context_retrieval_ratio(qa_pairs)
        context_awareness = _compute_context_awareness(qa_pairs)

        # ── 8: Latency captured per stage ─────────────────────────────────────
        # Actual retrieval / generation latency should be injected by the
        # chatbot pipeline (see chatbot.py).  We record evaluation latency here.
        report["latency"] = {
            "ragas_evaluation_sec": ragas_elapsed,
            "retrieval_avg_ms": _extract_latency(qa_pairs, "retrieval_ms"),
            "generation_avg_ms": _extract_latency(qa_pairs, "generation_ms"),
            "total_avg_ms": _extract_latency(qa_pairs, "total_ms"),
        }

        # ── assemble metrics dict ─────────────────────────────────────────────
        report["metrics"] = {
            "faithfulness": faithfulness_score,
            "context_precision": ctx_precision_score,
            "context_recall": ctx_recall_score,
            "hallucination_rate": hallucination_rate,
            "context_retrieval_ratio": ctx_retrieval_ratio,
            "answer_relevancy": answer_rel_score,
            "context_awareness": context_awareness,
            # answer_generation_quality derived from answer_relevancy +
            # faithfulness as composite — interpretable single number
            "answer_generation_quality": round(
                (answer_rel_score * 0.5 + faithfulness_score * 0.5), 4
            ),
        }

        # ── score interpretation ──────────────────────────────────────────────
        report["interpretation"] = _interpret_scores(report["metrics"])
        report["per_sample"] = per_sample
        report["breakdowns"] = _build_breakdowns(per_sample)

        logger.info("RAG evaluation complete: %s", report["metrics"])
        return report


# ── utilities ─────────────────────────────────────────────────────────────────


def _extract_latency(qa_pairs: list[dict], key: str) -> Optional[float]:
    """Average a latency field injected by the chatbot pipeline."""
    values = [p[key] for p in qa_pairs if p.get(key) is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _safe_mean(scores_df, column: str) -> float:
    """Return a stable 0-1 metric value even when RAGAS emits NaN values."""
    if column not in scores_df:
        return 0.0
    value = float(scores_df[column].mean())
    if math.isnan(value):
        return 0.0
    return round(max(0.0, min(1.0, value)), 4)


def _score_at(scores_df, column: str, index: int) -> float:
    if column not in scores_df:
        return 0.0
    value = float(scores_df[column].iloc[index])
    if math.isnan(value):
        return 0.0
    return round(max(0.0, min(1.0, value)), 4)


def _build_per_sample_scores(qa_pairs: list[dict], scores_df) -> list[dict]:
    rows = []
    for index, item in enumerate(qa_pairs):
        faithfulness_score = _score_at(scores_df, "faithfulness", index)
        answer_relevancy_score = _score_at(scores_df, "answer_relevancy", index)
        rows.append(
            {
                "id": item.get("id") or f"sample-{index + 1}",
                "source_file": item.get("source_file"),
                "query_type": item.get("query_type", "unknown"),
                "difficulty": item.get("difficulty", "unknown"),
                "is_negative": bool(item.get("is_negative", False)),
                "faithfulness": faithfulness_score,
                "context_precision": _score_at(scores_df, "context_precision", index),
                "context_recall": _score_at(scores_df, "context_recall", index),
                "answer_relevancy": answer_relevancy_score,
                "hallucination_rate": round(1.0 - faithfulness_score, 4),
                "answer_generation_quality": round(
                    (answer_relevancy_score * 0.5 + faithfulness_score * 0.5), 4
                ),
            }
        )
    return rows


def _build_breakdowns(per_sample: list[dict]) -> dict:
    metric_keys = [
        "faithfulness",
        "context_precision",
        "context_recall",
        "answer_relevancy",
        "hallucination_rate",
        "answer_generation_quality",
    ]

    def group_by(key: str) -> dict:
        grouped: dict[str, list[dict]] = {}
        for row in per_sample:
            group = str(row.get(key) or "unknown")
            grouped.setdefault(group, []).append(row)

        return {
            group: {
                "sample_count": len(rows),
                "metrics": {
                    metric: round(sum(row[metric] for row in rows) / len(rows), 4)
                    for metric in metric_keys
                },
            }
            for group, rows in grouped.items()
        }

    return {
        "by_source": group_by("source_file"),
        "by_query_type": group_by("query_type"),
        "by_difficulty": group_by("difficulty"),
    }


def _interpret_scores(metrics: dict) -> dict:
    """
    Human-readable threshold-based interpretation for the admin dashboard.
    Thresholds: ≥0.8 = Good, ≥0.6 = Fair, <0.6 = Poor
                (hallucination_rate inverted: ≤0.2 = Good, ≤0.4 = Fair)
    """

    def grade(value: float, invert: bool = False) -> str:
        if invert:
            if value <= 0.20:
                return "Good"
            if value <= 0.40:
                return "Fair"
            return "Poor"
        if value >= 0.80:
            return "Good"
        if value >= 0.60:
            return "Fair"
        return "Poor"

    return {
        "faithfulness": grade(metrics["faithfulness"]),
        "context_precision": grade(metrics["context_precision"]),
        "context_recall": grade(metrics["context_recall"]),
        "hallucination_rate": grade(metrics["hallucination_rate"], invert=True),
        "context_retrieval_ratio": grade(metrics["context_retrieval_ratio"]),
        "answer_relevancy": grade(metrics["answer_relevancy"]),
        "context_awareness": grade(metrics["context_awareness"]),
        "answer_generation_quality": grade(metrics["answer_generation_quality"]),
    }
