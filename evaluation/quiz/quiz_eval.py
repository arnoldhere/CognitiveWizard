"""
Layer 6: Quiz Generator Evaluation

Evaluates quality and correctness of generated quizzes/questions.
"""

from typing import List, Dict, Any, Tuple
from dataclasses import dataclass
import numpy as np


@dataclass
class QuizEvaluationResult:
    """Results from quiz evaluation."""

    generation_success_rate: float
    question_accuracy: float
    difficulty_alignment: float
    answer_correctness: float
    duplicate_question_rate: float
    blooms_taxonomy_coverage: Dict[str, float]
    total_questions: int
    valid_questions: int
    invalid_questions: int
    duplicates_found: int
    accuracy_issues: List[str]


class QuizEvaluator:
    """Evaluates quiz generation quality."""

    @staticmethod
    def calculate_generation_success_rate(
        generated_questions: List[Dict[str, str]],
    ) -> Tuple[float, List[str]]:
        """
        Generation Success Rate: % of valid, usable quizzes.
        Target: > 0.95
        """
        issues = []
        valid_count = 0

        for i, q in enumerate(generated_questions):
            is_valid = True

            if not q.get("question") or len(q.get("question", "")) < 10:
                is_valid = False
                issues.append(f"Q{i+1}: Invalid question text")

            if q.get("type", "mcq") == "mcq":
                options = q.get("options", [])
                correct = q.get("correct_answer", "")

                if not options or len(options) < 2:
                    is_valid = False
                    issues.append(f"Q{i+1}: Insufficient options")

                if not correct:
                    is_valid = False
                    issues.append(f"Q{i+1}: No correct answer")

                if correct not in options:
                    is_valid = False
                    issues.append(f"Q{i+1}: Correct answer not in options")

            if is_valid:
                valid_count += 1

        success_rate = valid_count / max(len(generated_questions), 1)
        return round(success_rate, 4), issues

    @staticmethod
    def calculate_question_accuracy(
        generated_question: str, source_text: str, correct_answer: str = None
    ) -> Tuple[float, List[str]]:
        """
        Question Accuracy: Is question factually correct?
        Target: > 0.90
        """
        issues = []
        accuracy = 1.0

        source_lower = source_text.lower()
        question_lower = generated_question.lower()

        # Check relation to source
        source_words = set(source_lower.split())
        question_words = set(question_lower.split())

        overlap = len(source_words & question_words) / max(len(question_words), 1)

        if overlap < 0.2:
            accuracy -= 0.3
            issues.append("Question doesn't relate to source")

        # Check grammar
        if not generated_question.endswith("?"):
            accuracy -= 0.2
            issues.append("Question missing question mark")

        # Check for question words
        question_starters = ["what", "why", "how", "which", "who", "when", "where"]
        if not any(q in question_lower.split()[0] for q in question_starters):
            accuracy -= 0.1
            issues.append("Question not properly formed")

        # Check answer relevance
        if correct_answer:
            if correct_answer.lower() not in source_lower:
                accuracy -= 0.2
                issues.append("Correct answer not in source")

        return round(max(accuracy, 0.0), 4), issues

    @staticmethod
    def calculate_difficulty_alignment(
        question_difficulty: str, expected_difficulty: str, bloom_level: str = None
    ) -> float:
        """
        Difficulty Alignment: Does question match specified difficulty?
        Target: > 0.80
        """
        difficulty_levels = {"easy": 1, "medium": 2, "hard": 3}

        assigned_level = difficulty_levels.get(question_difficulty, 2)
        expected_level = difficulty_levels.get(expected_difficulty, 2)

        diff = abs(assigned_level - expected_level)

        if diff == 0:
            alignment = 1.0
        elif diff == 1:
            alignment = 0.7
        else:
            alignment = 0.3

        return round(alignment, 4)

    @staticmethod
    def calculate_answer_correctness(
        correct_answer: str, source_text: str, alternative_answers: List[str] = None
    ) -> Tuple[float, List[str]]:
        """
        Answer Correctness: Is answer correct and unique?
        Target: > 0.90
        """
        issues = []
        correctness = 1.0

        source_lower = source_text.lower()
        answer_lower = correct_answer.lower()

        if answer_lower not in source_lower:
            correctness -= 0.3
            issues.append("Answer not in source")

        if alternative_answers:
            for alt in alternative_answers:
                if alt.lower() in source_lower:
                    correctness -= 0.15
                    issues.append(f"Alternative also valid: {alt}")

        answer_words = len(correct_answer.split())
        if answer_words < 2 or answer_words > 30:
            correctness -= 0.1
            issues.append("Answer length inappropriate")

        return round(max(correctness, 0.0), 4), issues

    @staticmethod
    def calculate_duplicate_rate(questions: List[str]) -> Tuple[float, List[int]]:
        """
        Duplicate Rate: % of duplicate questions.
        Target: < 0.05
        """
        duplicates_found = []

        for i, q1 in enumerate(questions):
            for j, q2 in enumerate(questions):
                if i < j:
                    q1_words = set(q1.lower().split())
                    q2_words = set(q2.lower().split())

                    if q1_words == q2_words:
                        duplicates_found.append(j)
                    elif (
                        len(q1_words & q2_words) / max(len(q1_words | q2_words), 1)
                        > 0.8
                    ):
                        duplicates_found.append(j)

        duplicates_found = list(set(duplicates_found))

        if len(questions) == 0:
            return 0.0, []

        duplicate_rate = len(duplicates_found) / len(questions)
        return round(duplicate_rate, 4), duplicates_found

    @staticmethod
    def calculate_blooms_taxonomy_coverage(
        questions: List[Dict[str, str]],
    ) -> Dict[str, float]:
        """Bloom's Taxonomy Coverage distribution."""
        bloom_keywords = {
            "remember": ["define", "list", "recall", "what is", "name", "identify"],
            "understand": ["explain", "describe", "summarize", "compare", "classify"],
            "apply": ["use", "solve", "demonstrate", "calculate", "show"],
            "analyze": [
                "analyze",
                "differentiate",
                "distinguish",
                "examine",
                "separate",
            ],
            "evaluate": ["evaluate", "judge", "justify", "defend", "assess"],
            "create": ["design", "create", "develop", "propose", "hypothesize"],
        }

        bloom_counts = {level: 0 for level in bloom_keywords.keys()}

        for q in questions:
            question_text = q.get("question", "").lower()

            for level, keywords in bloom_keywords.items():
                if any(kw in question_text for kw in keywords):
                    bloom_counts[level] += 1
                    break

        total = max(sum(bloom_counts.values()), 1)
        coverage = {
            level: round(count / total, 4) for level, count in bloom_counts.items()
        }

        return coverage

    @staticmethod
    def evaluate_quiz(
        generated_questions: List[Dict[str, str]],
        source_text: str,
        expected_difficulty: str = "medium",
    ) -> QuizEvaluationResult:
        """Comprehensive quiz evaluation."""
        success_rate, success_issues = QuizEvaluator.calculate_generation_success_rate(
            generated_questions
        )

        # Calculate accuracy
        valid_count = 0
        total_accuracy = 0.0
        accuracy_issues = []

        for q in generated_questions:
            if q.get("question"):
                accuracy, issues = QuizEvaluator.calculate_question_accuracy(
                    q.get("question", ""), source_text, q.get("correct_answer")
                )
                total_accuracy += accuracy
                accuracy_issues.extend(issues)
                valid_count += 1

        question_accuracy = total_accuracy / max(valid_count, 1)

        # Calculate difficulty alignment
        difficulty_scores = []
        for q in generated_questions:
            if q.get("question"):
                alignment = QuizEvaluator.calculate_difficulty_alignment(
                    q.get("difficulty", expected_difficulty),
                    expected_difficulty,
                    q.get("blooms_level"),
                )
                difficulty_scores.append(alignment)

        difficulty_alignment = sum(difficulty_scores) / max(len(difficulty_scores), 1)

        # Calculate answer correctness
        answer_scores = []
        for q in generated_questions:
            if q.get("correct_answer"):
                score, _ = QuizEvaluator.calculate_answer_correctness(
                    q.get("correct_answer", ""),
                    source_text,
                    q.get("alternative_answers"),
                )
                answer_scores.append(score)

        answer_correctness = sum(answer_scores) / max(len(answer_scores), 1)

        # Calculate duplicates
        questions_list = [q.get("question", "") for q in generated_questions]
        duplicate_rate, duplicate_indices = QuizEvaluator.calculate_duplicate_rate(
            questions_list
        )

        # Bloom's coverage
        blooms_coverage = QuizEvaluator.calculate_blooms_taxonomy_coverage(
            generated_questions
        )

        result = QuizEvaluationResult(
            generation_success_rate=success_rate,
            question_accuracy=question_accuracy,
            difficulty_alignment=difficulty_alignment,
            answer_correctness=answer_correctness,
            duplicate_question_rate=duplicate_rate,
            blooms_taxonomy_coverage=blooms_coverage,
            total_questions=len(generated_questions),
            valid_questions=valid_count,
            invalid_questions=len(generated_questions) - valid_count,
            duplicates_found=len(duplicate_indices),
            accuracy_issues=accuracy_issues,
        )

        return result

    @staticmethod
    def evaluate_batch(batch_results: List[Dict[str, Any]]) -> Dict[str, float]:
        """Evaluate a batch of quiz generation results."""
        results = []

        for item in batch_results:
            result = QuizEvaluator.evaluate_quiz(
                generated_questions=item.get("generated_questions", []),
                source_text=item.get("source_text", ""),
                expected_difficulty=item.get("expected_difficulty", "medium"),
            )
            results.append(result)

        avg_metrics = {
            "avg_generation_success_rate": round(
                np.mean([r.generation_success_rate for r in results]), 4
            ),
            "avg_question_accuracy": round(
                np.mean([r.question_accuracy for r in results]), 4
            ),
            "avg_difficulty_alignment": round(
                np.mean([r.difficulty_alignment for r in results]), 4
            ),
            "avg_answer_correctness": round(
                np.mean([r.answer_correctness for r in results]), 4
            ),
            "avg_duplicate_rate": round(
                np.mean([r.duplicate_question_rate for r in results]), 4
            ),
            "total_quizzes": len(results),
            "total_questions": sum(r.total_questions for r in results),
            "total_duplicates": sum(r.duplicates_found for r in results),
        }

        return avg_metrics


# KPI Thresholds for Quiz Layer
QUIZ_KPIS = {
    "generation_success_rate": {
        "threshold": 0.95,
        "interpretation": "95%+ valid quizzes",
    },
    "question_accuracy": {"threshold": 0.90, "interpretation": "Accurate, well-formed"},
    "difficulty_alignment": {"threshold": 0.80, "interpretation": "Matches difficulty"},
    "answer_correctness": {"threshold": 0.90, "interpretation": "Correct answers"},
    "duplicate_question_rate": {"threshold": 0.05, "lower_is_better": True},
}
