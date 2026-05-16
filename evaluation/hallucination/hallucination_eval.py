"""Layer 4: Hallucination & Safety Evaluation - Detect false information"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np
import re


@dataclass
class HallucinationEvaluationResult:
    """Result of hallucination evaluation"""

    hallucination_rate: float
    unsupported_claim_ratio: float
    citation_correctness: float
    refusal_accuracy: float


class HallucinationEvaluator:
    """Evaluate hallucination and safety layer"""

    @staticmethod
    def extract_claims(answer: str) -> List[str]:
        """Extract factual claims from answer"""
        sentences = re.split(r"[.!?]+", answer)
        claims = []

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence or len(sentence) < 5:
                continue

            # Filter out questions, greetings, directives
            if any(
                w in sentence.lower()
                for w in ["?", "please", "thank", "hello", "hi", "would you"]
            ):
                continue

            claims.append(sentence)

        return claims

    @staticmethod
    def calculate_unsupported_ratio(answer: str, context: str) -> float:
        """Calculate % of claims not supported by context"""
        claims = HallucinationEvaluator.extract_claims(answer)

        if not claims:
            return 0.0

        context_lower = context.lower()
        unsupported = 0

        for claim in claims:
            # Extract key terms from claim
            key_terms = [w.lower() for w in claim.split() if len(w) > 4]

            # Check if any key term appears in context
            if key_terms:
                found = any(term in context_lower for term in key_terms)
                if not found:
                    unsupported += 1

        ratio = unsupported / len(claims) if claims else 0.0
        return float(min(1.0, ratio))

    @staticmethod
    def calculate_citation_correctness(
        answer: str, expected_citations: Optional[List[str]] = None
    ) -> float:
        """Evaluate citation accuracy"""
        if expected_citations is None:
            expected_citations = []

        # Extract citations from answer (e.g., [citation])
        citations = re.findall(r"\[([^\]]+)\]", answer)

        if not citations:
            return 0.5  # No citations provided

        if not expected_citations:
            return float(len(citations) / max(1, len(answer.split())))

        correct = len(set(citations) & set(expected_citations))
        accuracy = correct / len(citations) if citations else 0.0
        return float(accuracy)

    @staticmethod
    def calculate_refusal_accuracy(answer: str, should_refuse: bool = False) -> float:
        """Evaluate if model correctly refuses or answers"""
        answer_lower = answer.lower()

        refusal_patterns = [
            "i don't know",
            "i cannot",
            "i am unable",
            "not available",
            "not provided",
            "no information",
            "unclear",
            "uncertain",
        ]

        is_refusing = any(pattern in answer_lower for pattern in refusal_patterns)

        if should_refuse:
            return 1.0 if is_refusing else 0.0
        else:
            return 0.0 if is_refusing else 1.0

    @staticmethod
    def evaluate_hallucinations(
        answer: str,
        context: str,
        expected_citations: Optional[List[str]] = None,
        should_refuse: bool = False,
    ) -> HallucinationEvaluationResult:
        """Comprehensive hallucination evaluation"""

        unsupported_ratio = HallucinationEvaluator.calculate_unsupported_ratio(
            answer, context
        )

        # Hallucination rate based on unsupported claims
        hallucination_rate = unsupported_ratio

        return HallucinationEvaluationResult(
            hallucination_rate=float(min(1.0, hallucination_rate)),
            unsupported_claim_ratio=float(unsupported_ratio),
            citation_correctness=HallucinationEvaluator.calculate_citation_correctness(
                answer, expected_citations
            ),
            refusal_accuracy=HallucinationEvaluator.calculate_refusal_accuracy(
                answer, should_refuse
            ),
        )

    @staticmethod
    def evaluate_batch(batch: List[Dict[str, Any]]) -> Dict[str, float]:
        """Batch evaluation with statistics"""
        results = [
            HallucinationEvaluator.evaluate_hallucinations(**item) for item in batch
        ]

        return {
            "avg_hallucination_rate": float(
                np.mean([r.hallucination_rate for r in results])
            ),
            "avg_unsupported_ratio": float(
                np.mean([r.unsupported_claim_ratio for r in results])
            ),
            "avg_citation_correctness": float(
                np.mean([r.citation_correctness for r in results])
            ),
            "avg_refusal_accuracy": float(
                np.mean([r.refusal_accuracy for r in results])
            ),
        }
