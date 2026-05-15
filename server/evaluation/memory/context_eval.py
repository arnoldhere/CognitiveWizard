"""
Layer 3: Memory and Conversational Evaluation Metrics

Evaluates multi-turn memory, context carry-over, and conversational awareness.
Metrics: Context Retention, Follow-up Accuracy, Conversation Consistency, Memory Recall
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass


@dataclass
class MemoryEvaluationResult:
    """Results from memory evaluation."""

    context_retention_score: float
    follow_up_accuracy: float
    conversation_consistency: float
    memory_recall_accuracy: float
    conversation_length: int
    issues_found: List[str]
    references_to_previous: int


class MemoryEvaluator:
    """Evaluates conversational memory and context."""

    @staticmethod
    def calculate_context_retention(
        conversation_turns: List[Dict[str, str]], context_requirements: List[str] = None
    ) -> Tuple[float, List[str]]:
        """
        Context Retention: Quality of memory across turns.

        Checks:
        1. Earlier turns are referenced later
        2. Key information from early turns remains consistent
        3. Context doesn't get lost

        Range: 0-1 (higher is better)
        Target: > 0.90
        """
        if len(conversation_turns) < 2:
            return 1.0, []

        issues = []

        # Collect all user queries and assistant responses
        user_queries = []
        assistant_responses = []

        for turn in conversation_turns:
            if turn.get("role") == "user":
                user_queries.append(turn.get("content", "").lower())
            elif turn.get("role") == "assistant":
                assistant_responses.append(turn.get("content", "").lower())

        # Check if assistant responses reference previous user inputs
        references_found = 0
        for i, response in enumerate(assistant_responses):
            if i > 0:
                # Check if current response references previous query
                prev_query_words = set(user_queries[i - 1].split())
                response_words = set(response.split())

                overlap = len(prev_query_words & response_words) / max(
                    len(prev_query_words), 1
                )
                if overlap > 0.2:  # At least 20% word overlap
                    references_found += 1

        retention_score = references_found / max(len(assistant_responses) - 1, 1)

        # Check for explicit context requirements
        if context_requirements:
            full_conversation = " ".join(
                [turn.get("content", "") for turn in conversation_turns]
            )
            for requirement in context_requirements:
                if requirement.lower() not in full_conversation.lower():
                    issues.append(f"Context requirement not maintained: {requirement}")

        return round(retention_score, 4), issues

    @staticmethod
    def calculate_follow_up_accuracy(
        conversation_turns: List[Dict[str, str]], user_queries: List[str] = None
    ) -> Tuple[float, List[str]]:
        """
        Follow-up Accuracy: How well system handles follow-up questions.

        Tests:
        1. "Explain X more" - should expand on previous X
        2. "Compare X and Y" - should remember X from earlier
        3. "What about..." - should continue context

        Range: 0-1 (higher is better)
        Target: > 0.85
        """
        issues = []
        accurate_follow_ups = 0

        # Find follow-up patterns
        follow_up_keywords = [
            "more",
            "explain",
            "compare",
            "difference",
            "relate",
            "connect",
            "also",
        ]

        for i, turn in enumerate(conversation_turns):
            if turn.get("role") == "user" and i > 0:
                query = turn.get("content", "").lower()

                # Check if this is a follow-up query
                is_follow_up = any(keyword in query for keyword in follow_up_keywords)

                if is_follow_up and i + 1 < len(conversation_turns):
                    response = conversation_turns[i + 1].get("content", "").lower()

                    # Check if response references previous context
                    if i >= 2:
                        previous_context = (
                            conversation_turns[i - 2].get("content", "").lower()
                        )
                        if any(
                            word in response for word in previous_context.split()[:5]
                        ):
                            accurate_follow_ups += 1
                    else:
                        accurate_follow_ups += 1

        # Count total follow-up queries
        follow_up_queries = sum(
            1
            for turn in conversation_turns
            if turn.get("role") == "user"
            and any(
                keyword in turn.get("content", "").lower()
                for keyword in follow_up_keywords
            )
        )

        if follow_up_queries == 0:
            return 1.0, issues

        accuracy = accurate_follow_ups / follow_up_queries
        return round(accuracy, 4), issues

    @staticmethod
    def calculate_conversation_consistency(
        conversation_turns: List[Dict[str, str]],
    ) -> Tuple[float, List[str]]:
        """
        Conversation Consistency: No contradictions across turns.

        Detects:
        1. Contradictory statements
        2. Information inconsistency
        3. Logical contradictions

        Range: 0-1 (higher is better)
        Target: > 0.95
        """
        issues = []
        contradictions_found = 0

        assistant_responses = [
            turn.get("content", "").lower()
            for turn in conversation_turns
            if turn.get("role") == "assistant"
        ]

        # Simple contradiction detection
        contradiction_patterns = [
            ("always", "never"),
            ("true", "false"),
            ("yes", "no"),
            ("correct", "incorrect"),
            ("support", "oppose"),
        ]

        for i, response_i in enumerate(assistant_responses):
            for j, response_j in enumerate(assistant_responses):
                if i < j:
                    for pattern_a, pattern_b in contradiction_patterns:
                        if pattern_a in response_i and pattern_b in response_j:
                            # Check if they're talking about same thing
                            words_i = set(response_i.split())
                            words_j = set(response_j.split())
                            overlap = len(words_i & words_j) / max(
                                len(words_i | words_j), 1
                            )

                            if overlap > 0.3:  # Significant overlap = contradiction
                                contradictions_found += 1
                                issues.append(
                                    f"Contradiction detected between turn {i} and {j}: "
                                    f"'{pattern_a}' vs '{pattern_b}'"
                                )

        consistency_score = 1.0 - min((contradictions_found * 0.1), 1.0)
        return round(consistency_score, 4), issues

    @staticmethod
    def calculate_memory_recall_accuracy(
        conversation_turns: List[Dict[str, str]],
        expected_references: Dict[str, str] = None,
    ) -> Tuple[float, List[str]]:
        """
        Memory Recall Accuracy: Correct recall of earlier information.

        Tests:
        1. System correctly recalls facts from earlier turns
        2. No confusion with other information
        3. Accurate entity references

        Range: 0-1 (higher is better)
        Target: > 0.90
        """
        issues = []

        if len(conversation_turns) < 3:
            return 1.0, issues

        # Extract key facts from early turns
        early_facts = {}
        for i, turn in enumerate(conversation_turns[:3]):
            if turn.get("role") == "user":
                content = turn.get("content", "")
                # Extract entities (words capitalized or in quotes)
                words = content.split()
                for j, word in enumerate(words):
                    if word[0].isupper() or (j > 0 and words[j - 1] == "called"):
                        early_facts[word] = i

        # Check later turns for correct references
        correct_recalls = 0
        total_references = 0

        for turn in conversation_turns[3:]:
            if turn.get("role") == "assistant":
                response = turn.get("content", "")
                for fact, turn_idx in early_facts.items():
                    if fact in response:
                        total_references += 1
                        correct_recalls += 1

        if total_references == 0:
            accuracy = 1.0
        else:
            accuracy = correct_recalls / total_references

        # Add expected references check if provided
        if expected_references:
            full_conversation = " ".join(
                [turn.get("content", "") for turn in conversation_turns]
            )
            for ref_key, ref_value in expected_references.items():
                if ref_value not in full_conversation:
                    issues.append(
                        f"Expected reference '{ref_key}' not recalled correctly"
                    )

        return round(accuracy, 4), issues

    @staticmethod
    def evaluate_conversation(
        conversation_turns: List[Dict[str, str]],
        context_requirements: List[str] = None,
        expected_references: Dict[str, str] = None,
    ) -> MemoryEvaluationResult:
        """
        Comprehensive conversation memory evaluation.

        Args:
            conversation_turns: List of dicts with 'role' and 'content'
            context_requirements: Specific contexts that must be maintained
            expected_references: Expected entity/fact references

        Returns:
            MemoryEvaluationResult with all metrics
        """
        retention, retention_issues = MemoryEvaluator.calculate_context_retention(
            conversation_turns, context_requirements
        )

        follow_up, follow_up_issues = MemoryEvaluator.calculate_follow_up_accuracy(
            conversation_turns
        )

        consistency, consistency_issues = (
            MemoryEvaluator.calculate_conversation_consistency(conversation_turns)
        )

        recall, recall_issues = MemoryEvaluator.calculate_memory_recall_accuracy(
            conversation_turns, expected_references
        )

        # Count references to previous content
        references = 0
        for i, turn in enumerate(conversation_turns):
            if turn.get("role") == "assistant" and i > 0:
                response = turn.get("content", "").lower()
                prev_content = conversation_turns[i - 1].get("content", "").lower()
                if any(word in response for word in prev_content.split()[:5]):
                    references += 1

        all_issues = (
            retention_issues + follow_up_issues + consistency_issues + recall_issues
        )

        result = MemoryEvaluationResult(
            context_retention_score=retention,
            follow_up_accuracy=follow_up,
            conversation_consistency=consistency,
            memory_recall_accuracy=recall,
            conversation_length=len(conversation_turns),
            issues_found=all_issues,
            references_to_previous=references,
        )

        return result


# ============================================================================
# KPI Thresholds for Memory Layer
# ============================================================================

MEMORY_KPIS = {
    "context_retention_score": {
        "threshold": 0.90,
        "interpretation": "Context maintained across turns",
    },
    "follow_up_accuracy": {
        "threshold": 0.85,
        "interpretation": "Follow-up questions understood correctly",
    },
    "conversation_consistency": {
        "threshold": 0.95,
        "interpretation": "No contradictions",
    },
    "memory_recall_accuracy": {
        "threshold": 0.90,
        "interpretation": "Previous information recalled correctly",
    },
}
