"""
Layer 1: Retrieval Evaluation Metrics

Evaluates whether the retriever fetches correct context chunks.
Metrics: Recall@K, Precision@K, MRR, nDCG, Latency
"""

import time
from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import dataclass


@dataclass
class RetrievalEvaluationResult:
    """Results from retrieval evaluation."""

    recall_at_5: float
    recall_at_10: float
    precision_at_5: float
    precision_at_10: float
    mrr: float  # Mean Reciprocal Rank
    ndcg_at_5: float  # Normalized Discounted Cumulative Gain
    ndcg_at_10: float
    retrieval_latency_ms: float
    retrieved_chunks: List[str]
    relevance_scores: List[float]


class RetrievalEvaluator:
    """Evaluates retrieval quality."""

    @staticmethod
    def calculate_recall_at_k(
        retrieved_chunk_ids: List[str], expected_chunk_ids: List[str], k: int = 5
    ) -> float:
        """
        Recall@K: Percentage of relevant chunks that were retrieved.

        Formula: |retrieved ∩ expected| / |expected|

        Range: 0-1 (higher is better)
        Target: > 0.85
        """
        if not expected_chunk_ids:
            return 1.0

        retrieved_at_k = set(retrieved_chunk_ids[:k])
        expected_set = set(expected_chunk_ids)

        matches = len(retrieved_at_k & expected_set)
        recall = matches / len(expected_set)

        return round(recall, 4)

    @staticmethod
    def calculate_precision_at_k(
        retrieved_chunk_ids: List[str], expected_chunk_ids: List[str], k: int = 5
    ) -> float:
        """
        Precision@K: Percentage of retrieved chunks that were relevant.

        Formula: |retrieved ∩ expected| / |retrieved|

        Range: 0-1 (higher is better)
        Target: > 0.85
        """
        if not retrieved_chunk_ids:
            return 0.0

        retrieved_at_k = set(retrieved_chunk_ids[:k])
        expected_set = set(expected_chunk_ids)

        if len(retrieved_at_k) == 0:
            return 0.0

        matches = len(retrieved_at_k & expected_set)
        precision = matches / len(retrieved_at_k)

        return round(precision, 4)

    @staticmethod
    def calculate_mrr(
        retrieved_chunk_ids: List[str], expected_chunk_ids: List[str]
    ) -> float:
        """
        Mean Reciprocal Rank: Measures ranking quality.

        Formula: 1 / rank_of_first_relevant_chunk

        Range: 0-1 (higher is better)
        Interpretation:
        - 1.0: First result is relevant
        - 0.5: Second result is relevant
        - 0.0: No relevant results
        """
        expected_set = set(expected_chunk_ids)

        for rank, chunk_id in enumerate(retrieved_chunk_ids, 1):
            if chunk_id in expected_set:
                return round(1.0 / rank, 4)

        return 0.0

    @staticmethod
    def calculate_ndcg(
        retrieved_chunk_ids: List[str],
        relevance_scores: List[float],
        expected_chunk_ids: List[str],
        k: int = 5,
    ) -> float:
        """
        Normalized Discounted Cumulative Gain: Measures ranking quality with relevance scores.

        Considers:
        1. Relevance of retrieved items
        2. Position in ranking (penalty for lower ranks)
        3. Ideal ranking as normalization

        Formula: DCG@k / IDCG@k
        where DCG = Σ(relevance_i / log2(rank_i + 1))

        Range: 0-1 (higher is better)
        Target: > 0.75
        """
        # Calculate DCG
        dcg = 0.0
        for i, score in enumerate(relevance_scores[:k]):
            dcg += score / np.log2(i + 2)  # i+2 because rank starts at 1

        # Calculate IDCG (ideal ranking - all relevant items at top)
        ideal_scores = sorted(relevance_scores, reverse=True)[:k]
        idcg = 0.0
        for i, score in enumerate(ideal_scores):
            idcg += score / np.log2(i + 2)

        if idcg == 0:
            return 0.0

        ndcg = dcg / idcg
        return round(ndcg, 4)

    @staticmethod
    def evaluate_retrieval(
        retrieved_chunk_ids: List[str],
        expected_chunk_ids: List[str],
        relevance_scores: List[float] = None,
        retrieval_time_ms: float = 0.0,
        k: int = 5,
    ) -> RetrievalEvaluationResult:
        """
        Comprehensive retrieval evaluation.

        Args:
            retrieved_chunk_ids: Chunks returned by retriever
            expected_chunk_ids: Ground truth relevant chunks
            relevance_scores: Relevance score for each retrieved chunk (0-1)
            retrieval_time_ms: Time taken for retrieval
            k: Top-k for metrics calculation

        Returns:
            RetrievalEvaluationResult with all metrics
        """
        # Default relevance scores
        if relevance_scores is None:
            relevance_scores = [
                1.0 if cid in expected_chunk_ids else 0.0 for cid in retrieved_chunk_ids
            ]

        # Pad relevance scores if needed
        while len(relevance_scores) < len(retrieved_chunk_ids):
            relevance_scores.append(0.0)

        result = RetrievalEvaluationResult(
            recall_at_5=RetrievalEvaluator.calculate_recall_at_k(
                retrieved_chunk_ids, expected_chunk_ids, k=5
            ),
            recall_at_10=RetrievalEvaluator.calculate_recall_at_k(
                retrieved_chunk_ids, expected_chunk_ids, k=10
            ),
            precision_at_5=RetrievalEvaluator.calculate_precision_at_k(
                retrieved_chunk_ids, expected_chunk_ids, k=5
            ),
            precision_at_10=RetrievalEvaluator.calculate_precision_at_k(
                retrieved_chunk_ids, expected_chunk_ids, k=10
            ),
            mrr=RetrievalEvaluator.calculate_mrr(
                retrieved_chunk_ids, expected_chunk_ids
            ),
            ndcg_at_5=RetrievalEvaluator.calculate_ndcg(
                retrieved_chunk_ids, relevance_scores, expected_chunk_ids, k=5
            ),
            ndcg_at_10=RetrievalEvaluator.calculate_ndcg(
                retrieved_chunk_ids, relevance_scores, expected_chunk_ids, k=10
            ),
            retrieval_latency_ms=retrieval_time_ms,
            retrieved_chunks=retrieved_chunk_ids,
            relevance_scores=relevance_scores,
        )

        return result

    @staticmethod
    def evaluate_batch(batch_results: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Evaluate a batch of retrieval results and return average metrics.

        Args:
            batch_results: List of dicts with keys:
                - retrieved_chunk_ids: List[str]
                - expected_chunk_ids: List[str]
                - relevance_scores: List[float] (optional)
                - retrieval_time_ms: float (optional)

        Returns:
            Dictionary with average metrics
        """
        results = []

        for item in batch_results:
            result = RetrievalEvaluator.evaluate_retrieval(
                retrieved_chunk_ids=item.get("retrieved_chunk_ids", []),
                expected_chunk_ids=item.get("expected_chunk_ids", []),
                relevance_scores=item.get("relevance_scores"),
                retrieval_time_ms=item.get("retrieval_time_ms", 0.0),
            )
            results.append(result)

        # Calculate averages
        avg_metrics = {
            "avg_recall_at_5": round(np.mean([r.recall_at_5 for r in results]), 4),
            "avg_recall_at_10": round(np.mean([r.recall_at_10 for r in results]), 4),
            "avg_precision_at_5": round(
                np.mean([r.precision_at_5 for r in results]), 4
            ),
            "avg_precision_at_10": round(
                np.mean([r.precision_at_10 for r in results]), 4
            ),
            "avg_mrr": round(np.mean([r.mrr for r in results]), 4),
            "avg_ndcg_at_5": round(np.mean([r.ndcg_at_5 for r in results]), 4),
            "avg_ndcg_at_10": round(np.mean([r.ndcg_at_10 for r in results]), 4),
            "avg_retrieval_latency_ms": round(
                np.mean([r.retrieval_latency_ms for r in results]), 2
            ),
            "total_queries": len(results),
        }

        return avg_metrics


# ============================================================================
# KPI Thresholds for Retrieval Layer
# ============================================================================

RETRIEVAL_KPIS = {
    "recall_at_5": {
        "threshold": 0.85,
        "interpretation": "At least 85% of relevant chunks retrieved",
    },
    "precision_at_5": {
        "threshold": 0.85,
        "interpretation": "At least 85% of retrieved chunks are relevant",
    },
    "mrr": {
        "threshold": 0.70,
        "interpretation": "First relevant chunk typically in top 1-2 results",
    },
    "ndcg_at_5": {"threshold": 0.75, "interpretation": "Strong ranking quality"},
    "retrieval_latency_ms": {
        "threshold": 300,
        "interpretation": "Retrieval within 300ms",
        "lower_is_better": True,
    },
}
