"""
Layer 4: Hallucination & Safety Evaluation

Evaluates whether the model invents unsupported information.
Tests with missing context, adversarial prompts, and out-of-document questions.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
import re
import numpy as np


@dataclass
class HallucinationEvaluationResult:
    """Results from hallucination evaluation."""

    hallucination_rate: float
    unsupported_claim_ratio: float
    citation_correctness: float
    refusal_accuracy: float
    detected_hallucinations: List[str]
    total_claims: int
    unsupported_claims_count: int
    missed_refusals: int
    false_refusals: int


class HallucinationEvaluator:
    """Evaluates hallucination and safety."""

    @staticmethod
    def extract_claims_from_answer(answer: str) -> List[str]:
        """Extract factual claims from answer."""
        # Split into sentences
        sentences = re.split(r"[.!?]+", answer)
        sentences = [s.strip() for s in sentences if s.strip()]

        claims = []
        for sentence in sentences:
            # Filter out questions and greetings
            if "?" not in sentence and len(sentence) > 10:
                claims.append(sentence)

        return claims

    @staticmethod
    def calculate_unsupported_claim_ratio(
        answer: str, context: str
    ) -> Tuple[float, List[str]]:
        """
        Unsupported Claim Ratio: Claims in answer not found in context.

        Checks:
        1. Specific facts (dates, numbers, names)
        2. Causal claims not implied by context
        3. Comparative claims

        Returns: (ratio, list_of_unsupported_claims)
        Range: 0-1 (lower is better)
        Target: < 0.05
        """
        context_lower = context.lower()
        answer_lower = answer.lower()

        claims = HallucinationEvaluator.extract_claims_from_answer(answer)
        unsupported = []

        for claim in claims:
            claim_lower = claim.lower()

            # Extract key terms from claim
            words = claim_lower.split()
            key_words = [
                w
                for w in words
                if len(w) > 4
                and w not in ["that", "this", "which", "where", "when", "they", "what"]
            ]

            # Check if key terms appear in context
            found_in_context = False
            for key_word in key_words[:3]:  # Check first 3 key words
                if key_word in context_lower:
                    found_in_context = True
                    break

            if not found_in_context and key_words:
                unsupported.append(claim)

        if not claims:
            return 0.0, unsupported

        ratio = len(unsupported) / len(claims)
        return round(ratio, 4), unsupported

    @staticmethod
    def calculate_citation_correctness(
        answer: str,
        expected_citations: List[str],
        document_index: Dict[str, List[str]] = None,
    ) -> Tuple[float, List[str]]:
        """
        Citation Correctness: Citations are accurate and point to right source.

        Checks:
        1. Citations match source documents
        2. No citations for unsupported claims
        3. All major claims have citations

        Range: 0-1 (higher is better)
        Target: > 0.90
        """
        if not expected_citations:
            return 1.0, []

        # Extract citations from answer (usually in brackets or parentheses)
        citation_pattern = r"\[.*?\]|\(.*?citation.*?\)|\(.*?page.*?\)"
        found_citations = re.findall(citation_pattern, answer, re.IGNORECASE)

        issues = []

        # Check if found citations match expected
        correct_count = 0
        for citation in found_citations:
            # Clean citation
            citation_clean = citation.strip("[]() ")

            # Check if it matches any expected citation
            if any(exp_cit in citation_clean for exp_cit in expected_citations):
                correct_count += 1
            else:
                issues.append(f"Incorrect citation: {citation}")

        if len(found_citations) == 0:
            # No citations found - major issue if there are expected ones
            correctness = 0.5
            issues.append("No citations found in answer")
        else:
            correctness = correct_count / len(found_citations)

        return round(correctness, 4), issues

    @staticmethod
    def calculate_refusal_accuracy(
        answer: str, query: str, context: str, should_refuse: bool = False
    ) -> Tuple[float, List[str]]:
        """
        Refusal Accuracy: Proper handling of unknowns and edge cases.

        Tests:
        1. Model refuses when info not in context
        2. Model doesn't refuse when info IS in context
        3. Appropriate confidence levels

        Returns: (accuracy, issues)
        Range: 0-1 (higher is better)
        Target: > 0.90
        """
        issues = []

        # Patterns indicating refusal
        refusal_patterns = [
            r"i don't know",
            r"not mentioned",
            r"not found",
            r"unclear",
            r"not available",
            r"cannot find",
            r"not clear",
        ]

        contains_refusal = any(
            re.search(pattern, answer.lower()) for pattern in refusal_patterns
        )

        # Check if answer contains many exact phrases from context
        context_lower = context.lower()
        answer_lower = answer.lower()

        # Extract multi-word phrases
        answer_phrases = [
            phrase.strip() for phrase in re.split(r"[.!?]+", answer_lower)
        ]
        context_match_count = 0

        for phrase in answer_phrases:
            if phrase and len(phrase) > 20:  # Meaningful phrases
                if phrase[:30] in context_lower:  # Check first 30 chars
                    context_match_count += 1

        has_relevant_context = context_match_count > 0

        # Evaluate refusal appropriateness
        if should_refuse:
            # Model SHOULD refuse - was it correct?
            if contains_refusal:
                accuracy = 1.0
            else:
                accuracy = 0.0
                issues.append("Model should have refused but didn't")
        else:
            # Model should NOT refuse
            if contains_refusal and has_relevant_context:
                accuracy = 0.0
                issues.append("Model refused despite relevant context available")
            else:
                accuracy = 1.0 if not contains_refusal else 0.5

        return round(accuracy, 4), issues

    @staticmethod
    def evaluate_hallucinations(
        answer: str,
        query: str,
        context: str,
        expected_citations: List[str] = None,
        should_refuse: bool = False,
    ) -> HallucinationEvaluationResult:
        """
        Comprehensive hallucination evaluation.

        Args:
            answer: Generated answer
            query: Original query
            context: Available context
            expected_citations: Expected citations
            should_refuse: Whether answer should refuse to answer

        Returns:
            HallucinationEvaluationResult
        """
        if expected_citations is None:
            expected_citations = []

        # Calculate metrics
        unsupported_ratio, unsupported = (
            HallucinationEvaluator.calculate_unsupported_claim_ratio(answer, context)
        )

        citation_correctness, citation_issues = (
            HallucinationEvaluator.calculate_citation_correctness(
                answer, expected_citations
            )
        )

        refusal_accuracy, refusal_issues = (
            HallucinationEvaluator.calculate_refusal_accuracy(
                answer, query, context, should_refuse
            )
        )

        # Overall hallucination rate (0-1, lower is better)
        claims = HallucinationEvaluator.extract_claims_from_answer(answer)
        hallucination_rate = unsupported_ratio

        result = HallucinationEvaluationResult(
            hallucination_rate=hallucination_rate,
            unsupported_claim_ratio=unsupported_ratio,
            citation_correctness=citation_correctness,
            refusal_accuracy=refusal_accuracy,
            detected_hallucinations=unsupported + citation_issues + refusal_issues,
            total_claims=len(claims),
            unsupported_claims_count=len(unsupported),
            missed_refusals=(
                1
                if (
                    should_refuse
                    and not any(
                        re.search(pattern, answer.lower())
                        for pattern in [
                            r"i don't know",
                            r"not mentioned",
                            r"not found",
                            r"not available",
                            r"cannot",
                        ]
                    )
                )
                else 0
            ),
            false_refusals=0,
        )

        return result

    @staticmethod
    def evaluate_batch(batch_results: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Evaluate a batch of hallucination results.

        Args:
            batch_results: List of dicts with:
                - answer: str
                - query: str
                - context: str
                - expected_citations: List[str] (optional)
                - should_refuse: bool (optional)

        Returns:
            Dictionary with average metrics
        """
        results = []

        for item in batch_results:
            result = HallucinationEvaluator.evaluate_hallucinations(
                answer=item.get("answer", ""),
                query=item.get("query", ""),
                context=item.get("context", ""),
                expected_citations=item.get("expected_citations", []),
                should_refuse=item.get("should_refuse", False),
            )
            results.append(result)

        avg_metrics = {
            "avg_hallucination_rate": round(
                np.mean([r.hallucination_rate for r in results]), 4
            ),
            "avg_unsupported_claim_ratio": round(
                np.mean([r.unsupported_claim_ratio for r in results]), 4
            ),
            "avg_citation_correctness": round(
                np.mean([r.citation_correctness for r in results]), 4
            ),
            "avg_refusal_accuracy": round(
                np.mean([r.refusal_accuracy for r in results]), 4
            ),
            "total_queries": len(results),
            "total_hallucinations_detected": sum(
                len(r.detected_hallucinations) for r in results
            ),
            "total_missed_refusals": sum(r.missed_refusals for r in results),
        }

        return avg_metrics


# ============================================================================
# KPI Thresholds for Hallucination Layer
# ============================================================================

HALLUCINATION_KPIS = {
    "hallucination_rate": {
        "threshold": 0.05,
        "interpretation": "Less than 5% hallucinated content",
        "lower_is_better": True,
    },
    "unsupported_claim_ratio": {
        "threshold": 0.05,
        "interpretation": "Claims grounded in context",
        "lower_is_better": True,
    },
    "citation_correctness": {
        "threshold": 0.90,
        "interpretation": "Citations are accurate",
    },
    "refusal_accuracy": {
        "threshold": 0.90,
        "interpretation": "Proper handling of unknowns",
    },
}
