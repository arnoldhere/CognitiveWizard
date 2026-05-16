"""Layer 1: Retrieval Evaluation - Assess chunk selection quality"""

import time
from dataclasses import dataclass
from typing import List, Dict, Any
import numpy as np


@dataclass
class RetrievalEvaluationResult:
    """Result of retrieval evaluation"""

    recall_at_5: float
    precision_at_5: float
    mrr: float
    ndcg: float
    latency_ms: float


class RetrievalEvaluator:
    """Evaluate retrieval layer"""

    @staticmethod
    def calculate_recall_at_k(
        retrieved: List[str], expected: List[str], k: int = 5
    ) -> float:
        """Calculate recall@k: |retrieved ∩ expected| / |expected|"""
        if not expected:
            return 1.0
        retrieved_set = set(retrieved[:k])
        expected_set = set(expected)
        return len(retrieved_set & expected_set) / len(expected_set)

    @staticmethod
    def calculate_precision_at_k(
        retrieved: List[str], expected: List[str], k: int = 5
    ) -> float:
        """Calculate precision@k: |retrieved ∩ expected| / |retrieved|"""
        if not retrieved:
            return 0.0
        retrieved_set = set(retrieved[:k])
        expected_set = set(expected)
        return len(retrieved_set & expected_set) / len(retrieved_set)

    @staticmethod
    def calculate_mrr(retrieved: List[str], expected: List[str]) -> float:
        """Calculate Mean Reciprocal Rank: 1 / (rank of first relevant)"""
        expected_set = set(expected)
        for rank, item in enumerate(retrieved, 1):
            if item in expected_set:
                return 1.0 / rank
        return 0.0

    @staticmethod
    def calculate_ndcg(
        retrieved: List[str],
        expected: List[str],
        k: int = 5,
        relevance_scores: List[float] = None,
    ) -> float:
        """Calculate nDCG@k: DCG@k / IDCG@k"""
        if not expected:
            return 1.0

        expected_set = set(expected)
        if relevance_scores is None:
            relevance_scores = [1.0] * len(retrieved)

        # DCG: sum of (rel_i / log2(i+1))
        dcg = 0.0
        for i, item in enumerate(retrieved[:k]):
            if item in expected_set:
                dcg += 1.0 / np.log2(i + 2)

        # IDCG: perfect ranking
        idcg = sum(1.0 / np.log2(i + 2) for i in range(min(k, len(expected))))

        return dcg / idcg if idcg > 0 else 0.0

    @staticmethod
    def evaluate_retrieval(
        retrieved_chunk_ids: List[str],
        expected_chunk_ids: List[str],
        relevance_scores: List[float] = None,
        latency_ms: float = 0.0,
    ) -> RetrievalEvaluationResult:
        """Comprehensive retrieval evaluation"""
        return RetrievalEvaluationResult(
            recall_at_5=RetrievalEvaluator.calculate_recall_at_k(
                retrieved_chunk_ids, expected_chunk_ids, 5
            ),
            precision_at_5=RetrievalEvaluator.calculate_precision_at_k(
                retrieved_chunk_ids, expected_chunk_ids, 5
            ),
            mrr=RetrievalEvaluator.calculate_mrr(
                retrieved_chunk_ids, expected_chunk_ids
            ),
            ndcg=RetrievalEvaluator.calculate_ndcg(
                retrieved_chunk_ids, expected_chunk_ids, 5, relevance_scores
            ),
            latency_ms=latency_ms,
        )

    @staticmethod
    def evaluate_batch(batch: List[Dict[str, Any]]) -> Dict[str, float]:
        """Batch evaluation with statistics"""
        results = [RetrievalEvaluator.evaluate_retrieval(**item) for item in batch]

        return {
            "avg_recall_at_5": float(np.mean([r.recall_at_5 for r in results])),
            "avg_precision_at_5": float(np.mean([r.precision_at_5 for r in results])),
            "avg_mrr": float(np.mean([r.mrr for r in results])),
            "avg_ndcg": float(np.mean([r.ndcg for r in results])),
            "avg_latency_ms": float(np.mean([r.latency_ms for r in results])),
        }
