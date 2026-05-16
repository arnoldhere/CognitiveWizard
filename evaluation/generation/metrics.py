"""Layer 2: Generation Evaluation - Assess answer quality and groundedness"""

from dataclasses import dataclass
from typing import List, Dict, Any
from difflib import SequenceMatcher
import numpy as np
import re


@dataclass
class GenerationEvaluationResult:
    """Result of generation evaluation"""

    faithfulness: float
    context_utilization: float
    answer_relevance: float
    semantic_similarity: float
    hallucination_rate: float
    unsupported_claims: List[str]


class GenerationEvaluator:
    """Evaluate generation layer"""

    @staticmethod
    def calculate_faithfulness(answer: str, context: str) -> float:
        """Faithfulness: % of answer concepts present in context"""
        if not answer or not context:
            return 0.0

        # Extract key entities/terms from answer
        answer_words = set(w.lower() for w in answer.split() if len(w) > 3)
        context_words = set(w.lower() for w in context.split() if len(w) > 3)

        if not answer_words:
            return 0.0

        overlap = len(answer_words & context_words) / len(answer_words)
        return float(min(1.0, overlap))

    @staticmethod
    def calculate_context_utilization(answer: str, context: str) -> float:
        """Context utilization: % of context used in answer"""
        if not context:
            return 0.0

        context_words = set(w.lower() for w in context.split())
        answer_words = set(w.lower() for w in answer.split())

        if not context_words:
            return 1.0

        used = len(answer_words & context_words) / len(context_words)
        return float(min(1.0, used))

    @staticmethod
    def calculate_answer_relevance(query: str, answer: str) -> float:
        """Answer relevance: % query concepts in answer"""
        if not query or not answer:
            return 0.0

        query_words = set(w.lower() for w in query.split() if len(w) > 2)
        answer_words = set(w.lower() for w in answer.split())

        if not query_words:
            return 1.0

        relevance = len(query_words & answer_words) / len(query_words)
        # Penalize if answer is too short
        length_factor = min(1.0, len(answer) / max(10, len(query) * 3))
        return float(relevance * length_factor)

    @staticmethod
    def calculate_semantic_similarity(answer: str, reference: str) -> float:
        """Semantic similarity using SequenceMatcher"""
        if not reference:
            return 1.0  # No reference to compare

        matcher = SequenceMatcher(None, answer.lower(), reference.lower())
        return float(matcher.ratio())

    @staticmethod
    def detect_unsupported_claims(answer: str, context: str) -> tuple:
        """Detect claims not supported by context"""
        # Split into sentences
        sentences = re.split(r"[.!?]+", answer)

        unsupported = []
        total_claims = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if (
                not sentence
                or len(sentence) < 5
                or any(w in sentence.lower() for w in ["?", "please", "hello"])
            ):
                continue

            total_claims += 1
            # Check if key terms from sentence are in context
            key_terms = [w.lower() for w in sentence.split() if len(w) > 4]
            context_lower = context.lower()

            if key_terms and not any(term in context_lower for term in key_terms):
                unsupported.append(sentence[:100])

        return unsupported, total_claims

    @staticmethod
    def evaluate_generation(
        generated_answer: str,
        query: str,
        reference_answer: str = "",
        retrieved_context: str = "",
    ) -> GenerationEvaluationResult:
        """Comprehensive generation evaluation"""
        unsupported, total_claims = GenerationEvaluator.detect_unsupported_claims(
            generated_answer, retrieved_context
        )

        hallucination_rate = (
            len(unsupported) / total_claims if total_claims > 0 else 0.0
        )

        return GenerationEvaluationResult(
            faithfulness=GenerationEvaluator.calculate_faithfulness(
                generated_answer, retrieved_context
            ),
            context_utilization=GenerationEvaluator.calculate_context_utilization(
                generated_answer, retrieved_context
            ),
            answer_relevance=GenerationEvaluator.calculate_answer_relevance(
                query, generated_answer
            ),
            semantic_similarity=GenerationEvaluator.calculate_semantic_similarity(
                generated_answer, reference_answer
            ),
            hallucination_rate=float(min(1.0, hallucination_rate)),
            unsupported_claims=unsupported,
        )

    @staticmethod
    def evaluate_batch(batch: List[Dict[str, Any]]) -> Dict[str, float]:
        """Batch evaluation with statistics"""
        results = [GenerationEvaluator.evaluate_generation(**item) for item in batch]

        return {
            "avg_faithfulness": float(np.mean([r.faithfulness for r in results])),
            "avg_context_utilization": float(
                np.mean([r.context_utilization for r in results])
            ),
            "avg_answer_relevance": float(
                np.mean([r.answer_relevance for r in results])
            ),
            "avg_semantic_similarity": float(
                np.mean([r.semantic_similarity for r in results])
            ),
            "avg_hallucination_rate": float(
                np.mean([r.hallucination_rate for r in results])
            ),
        }
