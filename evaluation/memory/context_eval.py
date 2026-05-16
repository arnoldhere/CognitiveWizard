"""Layer 3: Memory Evaluation - Assess multi-turn conversation handling"""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional
import numpy as np


@dataclass
class MemoryEvaluationResult:
    """Result of memory evaluation"""

    context_retention_score: float
    follow_up_accuracy: float
    consistency_score: float
    memory_recall_accuracy: float


class ConversationEvaluator:
    """Evaluate conversation memory layer"""

    @staticmethod
    def calculate_context_retention(conversation: List[Dict[str, str]]) -> float:
        """Score how well previous context is retained and used"""
        if len(conversation) < 2:
            return 1.0

        # Check if later responses reference earlier exchanges
        earlier_context = " ".join([msg["content"] for msg in conversation[:-2]])
        last_response = conversation[-1].get("content", "")

        earlier_words = set(w.lower() for w in earlier_context.split() if len(w) > 4)
        later_words = set(w.lower() for w in last_response.split() if len(w) > 4)

        if not earlier_words or not later_words:
            return 0.5

        retention = len(earlier_words & later_words) / max(
            len(earlier_words), len(later_words)
        )
        return float(min(1.0, retention))

    @staticmethod
    def calculate_follow_up_accuracy(conversation: List[Dict[str, str]]) -> float:
        """Score how well follow-up questions are handled"""
        if len(conversation) < 3:
            return 1.0

        # Detect follow-up patterns
        last_user = (
            conversation[-2].get("content", "").lower() if len(conversation) > 1 else ""
        )
        last_assistant = (
            conversation[-1].get("content", "") if len(conversation) > 1 else ""
        )

        follow_up_keywords = [
            "explain",
            "compare",
            "more",
            "detail",
            "how",
            "why",
            "relate",
            "between",
        ]

        is_follow_up = any(kw in last_user for kw in follow_up_keywords)

        if not is_follow_up:
            return 1.0

        # Check if assistant addressed the follow-up
        addressed = len(last_assistant) > 20  # Simple heuristic: substantial response
        return 1.0 if addressed else 0.3

    @staticmethod
    def calculate_consistency(conversation: List[Dict[str, str]]) -> float:
        """Detect contradictions in responses"""
        if len(conversation) < 2:
            return 1.0

        # Simple pattern detection for contradictions
        responses = [
            msg["content"].lower()
            for msg in conversation
            if msg.get("role") == "assistant"
        ]

        contradictions = 0
        total_checks = max(1, len(responses) - 1)

        contradiction_patterns = [
            ("always", "never"),
            ("yes", "no"),
            ("true", "false"),
            ("possible", "impossible"),
        ]

        for i in range(len(responses) - 1):
            current = responses[i]
            next_response = responses[i + 1]

            for pos, neg in contradiction_patterns:
                if pos in current and neg in next_response:
                    contradictions += 1
                elif neg in current and pos in next_response:
                    contradictions += 1

        consistency = 1.0 - (contradictions / total_checks)
        return float(max(0.0, min(1.0, consistency)))

    @staticmethod
    def calculate_memory_recall(
        conversation: List[Dict[str, str]],
        expected_references: Optional[Dict[str, str]] = None,
    ) -> float:
        """Score memory recall accuracy"""
        if len(conversation) < 3:
            return 1.0

        if expected_references is None:
            expected_references = {}

        if not expected_references:
            return 0.5

        # Check how many expected references appear in later responses
        later_text = " ".join([msg["content"].lower() for msg in conversation[-3:]])

        found = 0
        for key, value in expected_references.items():
            if value.lower() in later_text or key.lower() in later_text:
                found += 1

        recall = found / len(expected_references)
        return float(min(1.0, recall))

    @staticmethod
    def evaluate_conversation(
        conversation: List[Dict[str, str]],
        context_requirements: Optional[List[str]] = None,
        expected_references: Optional[Dict[str, str]] = None,
    ) -> MemoryEvaluationResult:
        """Comprehensive conversation evaluation"""

        if not conversation or len(conversation) < 2:
            return MemoryEvaluationResult(
                context_retention_score=1.0,
                follow_up_accuracy=1.0,
                consistency_score=1.0,
                memory_recall_accuracy=1.0,
            )

        return MemoryEvaluationResult(
            context_retention_score=ConversationEvaluator.calculate_context_retention(
                conversation
            ),
            follow_up_accuracy=ConversationEvaluator.calculate_follow_up_accuracy(
                conversation
            ),
            consistency_score=ConversationEvaluator.calculate_consistency(conversation),
            memory_recall_accuracy=ConversationEvaluator.calculate_memory_recall(
                conversation, expected_references
            ),
        )

    @staticmethod
    def evaluate_batch(batch: List[Dict[str, Any]]) -> Dict[str, float]:
        """Batch evaluation with statistics"""
        results = [
            ConversationEvaluator.evaluate_conversation(**item) for item in batch
        ]

        return {
            "avg_retention": float(
                np.mean([r.context_retention_score for r in results])
            ),
            "avg_follow_up": float(np.mean([r.follow_up_accuracy for r in results])),
            "avg_consistency": float(np.mean([r.consistency_score for r in results])),
            "avg_recall": float(np.mean([r.memory_recall_accuracy for r in results])),
        }
