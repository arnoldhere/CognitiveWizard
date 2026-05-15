"""
Layer 2: Generation Evaluation Metrics

Evaluates whether generated answers are accurate, grounded, relevant, and useful.
Metrics: Faithfulness, Context Utilization, Answer Relevance, Semantic Similarity, Hallucination Rate
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
import numpy as np
from difflib import SequenceMatcher
import re


@dataclass
class GenerationEvaluationResult:
    """Results from generation evaluation."""

    faithfulness_score: float
    context_utilization: float
    answer_relevance: float
    semantic_similarity: float
    hallucination_rate: float
    generated_answer: str
    reference_answer: str
    retrieved_context: str
    unsupported_claims: List[str]


class GenerationEvaluator:
    """Evaluates generation quality."""

    @staticmethod
    def calculate_faithfulness(
        generated_answer: str, retrieved_context: str
    ) -> Tuple[float, List[str]]:
        """
        Faithfulness: Does generated answer match retrieved context?

        Checks:
        1. Key entities from context appear in answer
        2. Answer doesn't contradict context
        3. Answer facts are supported by context

        Range: 0-1 (higher is better)
        Target: > 0.85
        """
        if not generated_answer or not retrieved_context:
            return 0.0, []

        # Extract key phrases from context (3-5 word phrases)
        context_lower = retrieved_context.lower()
        answer_lower = generated_answer.lower()

        # Simple check: percentage of context entities in answer
        context_words = set(context_lower.split())
        answer_words = set(answer_lower.split())

        # Calculate word overlap
        overlap = len(context_words & answer_words) / max(len(context_words), 1)

        # Check for contradictions (simple approach)
        contradictions = []
        contradiction_patterns = [
            (r"not\s+\w+", r"\w+"),  # "not X" vs "X"
            (r"never\s+\w+", r"\w+"),  # "never X" vs "X"
        ]

        faithfulness_score = min(overlap * 1.2, 1.0)  # Cap at 1.0
        return round(faithfulness_score, 4), contradictions

    @staticmethod
    def calculate_context_utilization(
        generated_answer: str, retrieved_context: str, expected_chunks: List[str] = None
    ) -> Tuple[float, List[str]]:
        """
        Context Utilization: Was retrieved information actually used?

        Measures:
        1. How much of the retrieved context appears in answer
        2. Key information from context included in answer
        3. Proportion of context covered

        Range: 0-1 (higher is better)
        Target: > 0.80
        """
        if not generated_answer or not retrieved_context:
            return 0.0, []

        # Calculate percentage of context used in answer
        context_lower = retrieved_context.lower()
        answer_lower = generated_answer.lower()

        # N-gram overlap (check if chunks of context appear in answer)
        context_phrases = [
            phrase.strip() for phrase in context_lower.split(".") if phrase.strip()
        ]
        used_phrases = []

        for phrase in context_phrases[:5]:  # Check first 5 phrases
            words = phrase.split()
            if len(words) >= 3:
                # Check if key words from phrase appear in answer
                key_words = [
                    w for w in words if len(w) > 4
                ]  # Focus on meaningful words
                if any(word in answer_lower for word in key_words):
                    used_phrases.append(phrase)

        utilization = len(used_phrases) / max(len(context_phrases[:5]), 1)
        return round(utilization, 4), used_phrases

    @staticmethod
    def calculate_answer_relevance(generated_answer: str, query: str) -> float:
        """
        Answer Relevance: Does answer solve user query?

        Checks:
        1. Answer contains key concepts from query
        2. Answer length is appropriate
        3. Answer directly addresses query

        Range: 0-1 (higher is better)
        Target: > 0.85
        """
        if not generated_answer or not query:
            return 0.0

        query_lower = query.lower()
        answer_lower = generated_answer.lower()

        # Extract key words from query (nouns, verbs)
        query_words = query_lower.split()

        # Count how many query words appear in answer
        matched_words = sum(1 for w in query_words if w in answer_lower)
        relevance = matched_words / max(len(query_words), 1)

        # Penalty if answer is too short or too long
        query_len = len(query.split())
        answer_len = len(generated_answer.split())

        if answer_len < query_len / 2 or answer_len > query_len * 10:
            relevance *= 0.8

        return round(min(relevance, 1.0), 4)

    @staticmethod
    def calculate_semantic_similarity(
        generated_answer: str, reference_answer: str
    ) -> float:
        """
        Semantic Similarity: Compare generated answer to reference answer.

        Uses sequence matching to determine similarity.

        Range: 0-1 (higher is better)
        Target: > 0.75
        """
        if not generated_answer or not reference_answer:
            return 0.0

        # Simple string similarity using SequenceMatcher
        similarity_ratio = SequenceMatcher(
            None, generated_answer.lower(), reference_answer.lower()
        ).ratio()

        return round(similarity_ratio, 4)

    @staticmethod
    def detect_unsupported_claims(
        generated_answer: str, retrieved_context: str
    ) -> Tuple[float, List[str]]:
        """
        Hallucination Detection: Identify unsupported claims.

        Looks for:
        1. Facts in answer not present in context
        2. Specific numbers/dates not in context
        3. Named entities not in context

        Returns: (hallucination_rate, unsupported_claims)
        Range: 0-1 (lower is better)
        Target: < 0.05
        """
        unsupported_claims = []

        # Extract sentences from answer
        answer_sentences = re.split(r"[.!?]+", generated_answer)
        answer_sentences = [s.strip() for s in answer_sentences if s.strip()]

        context_lower = retrieved_context.lower()

        for sentence in answer_sentences:
            sentence_lower = sentence.lower()

            # Check for numbers/percentages
            numbers = re.findall(r"\d+(?:%|[A-Za-z]*)?", sentence)
            for number in numbers:
                if number not in context_lower:
                    unsupported_claims.append(f"Number '{number}' not found in context")

            # Check for specific verbs + entities that might not be supported
            entity_patterns = re.findall(
                r"(?:showed|proved|demonstrated|claimed)\s+that\s+(.+?)(?:[.!?]|$)",
                sentence_lower,
            )
            for entity in entity_patterns:
                if entity not in context_lower:
                    unsupported_claims.append(f"Unsupported claim: {entity}")

        hallucination_rate = len(unsupported_claims) / max(len(answer_sentences), 1)
        hallucination_rate = min(hallucination_rate, 1.0)

        return round(hallucination_rate, 4), unsupported_claims

    @staticmethod
    def evaluate_generation(
        generated_answer: str,
        query: str,
        reference_answer: str,
        retrieved_context: str,
        expected_chunks: List[str] = None,
    ) -> GenerationEvaluationResult:
        """
        Comprehensive generation evaluation.

        Args:
            generated_answer: Generated by LLM
            query: Original user query
            reference_answer: Expected/reference answer
            retrieved_context: Context chunks passed to LLM
            expected_chunks: List of expected source chunks

        Returns:
            GenerationEvaluationResult with all metrics
        """
        faithfulness, _ = GenerationEvaluator.calculate_faithfulness(
            generated_answer, retrieved_context
        )

        context_util, _ = GenerationEvaluator.calculate_context_utilization(
            generated_answer, retrieved_context, expected_chunks
        )

        relevance = GenerationEvaluator.calculate_answer_relevance(
            generated_answer, query
        )

        similarity = GenerationEvaluator.calculate_semantic_similarity(
            generated_answer, reference_answer
        )

        hallucination_rate, unsupported = GenerationEvaluator.detect_unsupported_claims(
            generated_answer, retrieved_context
        )

        result = GenerationEvaluationResult(
            faithfulness_score=faithfulness,
            context_utilization=context_util,
            answer_relevance=relevance,
            semantic_similarity=similarity,
            hallucination_rate=hallucination_rate,
            generated_answer=generated_answer,
            reference_answer=reference_answer,
            retrieved_context=retrieved_context,
            unsupported_claims=unsupported,
        )

        return result

    @staticmethod
    def evaluate_batch(batch_results: List[Dict[str, str]]) -> Dict[str, float]:
        """
        Evaluate a batch of generation results.

        Args:
            batch_results: List of dicts with keys:
                - generated_answer: str
                - query: str
                - reference_answer: str
                - retrieved_context: str

        Returns:
            Dictionary with average metrics
        """
        results = []

        for item in batch_results:
            result = GenerationEvaluator.evaluate_generation(
                generated_answer=item.get("generated_answer", ""),
                query=item.get("query", ""),
                reference_answer=item.get("reference_answer", ""),
                retrieved_context=item.get("retrieved_context", ""),
            )
            results.append(result)

        avg_metrics = {
            "avg_faithfulness_score": round(
                np.mean([r.faithfulness_score for r in results]), 4
            ),
            "avg_context_utilization": round(
                np.mean([r.context_utilization for r in results]), 4
            ),
            "avg_answer_relevance": round(
                np.mean([r.answer_relevance for r in results]), 4
            ),
            "avg_semantic_similarity": round(
                np.mean([r.semantic_similarity for r in results]), 4
            ),
            "avg_hallucination_rate": round(
                np.mean([r.hallucination_rate for r in results]), 4
            ),
            "total_queries": len(results),
            "total_unsupported_claims": sum(len(r.unsupported_claims) for r in results),
        }

        return avg_metrics


# ============================================================================
# KPI Thresholds for Generation Layer
# ============================================================================

GENERATION_KPIS = {
    "faithfulness_score": {
        "threshold": 0.85,
        "interpretation": "Answer matches retrieved context",
    },
    "context_utilization": {
        "threshold": 0.80,
        "interpretation": "Retrieved info is used in answer",
    },
    "answer_relevance": {
        "threshold": 0.85,
        "interpretation": "Answer solves user query",
    },
    "semantic_similarity": {
        "threshold": 0.75,
        "interpretation": "Generated answer similar to reference",
    },
    "hallucination_rate": {
        "threshold": 0.05,
        "interpretation": "Less than 5% unsupported claims",
        "lower_is_better": True,
    },
}
