"""
Automated RAG Evaluation Pipeline
Orchestrates all 6 evaluation layers into a single, comprehensive evaluation
"""

import logging
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import uuid4

import numpy as np

from evaluation.retrieval.metrics import RetrievalEvaluator
from evaluation.generation.metrics import GenerationEvaluator
from evaluation.memory.context_eval import ConversationEvaluator
from evaluation.hallucination.hallucination_eval import HallucinationEvaluator
from evaluation.quiz.quiz_eval import QuizEvaluator

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class EvaluationReport:
    """Simplified evaluation report for easy use"""

    query: str
    timestamp: str
    overall_score: float
    layer_scores: Dict[str, Optional[float]]
    KPI_status: Dict[str, str]
    layer_results: Dict[str, Any]
    evaluation_summary: str
    report_id: str = None

    def __post_init__(self):
        if self.report_id is None:
            self.report_id = str(uuid4())[:8]

    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary"""
        return asdict(self)

    def to_json(self) -> str:
        """Convert report to JSON string"""
        import json

        return json.dumps(self.to_dict(), indent=2, default=str)


@dataclass
class RAGInput:
    """Input data for RAG evaluation pipeline"""

    query: str
    retrieved_chunks: List[str]
    retrieved_chunk_ids: List[str]
    generated_answer: str
    reference_answer: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None
    expected_chunks: Optional[List[str]] = None
    quiz_questions: Optional[List[Dict[str, Any]]] = None

    def __post_init__(self):
        """Validate input data"""
        assert self.query, "Query cannot be empty"
        assert self.retrieved_chunks, "Retrieved chunks cannot be empty"
        assert self.generated_answer, "Generated answer cannot be empty"
        if self.expected_chunks is None:
            self.expected_chunks = []


class RAGEvaluationPipeline:
    """
    Orchestrates all 6-layer RAG evaluation

    Layers:
    1. Retrieval - Chunk selection quality
    2. Generation - Answer quality and hallucination
    3. Memory - Multi-turn context handling
    4. Hallucination - Safety and validation
    5. Product - User metrics (phase 2)
    6. Quiz - Question generation quality
    """

    # KPI targets for each layer
    KPI_TARGETS = {
        "retrieval": {
            "recall_at_5": 0.85,
            "precision_at_5": 0.85,
            "mrr": 0.70,
            "ndcg": 0.75,
            "latency_ms": 300,
        },
        "generation": {
            "faithfulness": 0.85,
            "context_utilization": 0.80,
            "semantic_similarity": 0.80,
            "hallucination_rate": 0.05,  # max
        },
        "memory": {"consistency": 0.95, "retention": 0.90, "follow_up_accuracy": 0.85},
        "hallucination": {
            "unsupported_claim_ratio": 0.05,  # max
            "refusal_accuracy": 0.90,
            "citation_correctness": 0.90,
        },
        "quiz": {
            "generation_success": 0.95,
            "question_accuracy": 0.90,
            "duplicate_rate": 0.05,  # max
        },
    }

    def __init__(self, log_results: bool = True):
        """
        Initialize evaluation pipeline
        Args:
            log_results: Whether to log evaluation results
        """
        self.log_results = log_results
        self.evaluation_log = []

    def evaluate(self, rag_input: RAGInput) -> EvaluationReport:
        """
        Run complete 6-layer RAG evaluation pipeline
        Args:
            rag_input: RAGInput object with all necessary data
        Returns:
            EvaluationReport with comprehensive results and KPI status
        """
        logger.info("=" * 80)
        logger.info("Starting RAG Evaluation Pipeline")
        logger.info(f"Query: {rag_input.query[:100]}...")
        logger.info("=" * 80)

        results = {}
        scores = []

        # Layer 1: Retrieval Evaluation
        logger.info("\n[Layer 1/6] Evaluating Retrieval...")
        retrieval_result = self._evaluate_retrieval(rag_input)
        results["retrieval"] = retrieval_result
        retrieval_score = self._calculate_layer_score(retrieval_result, "retrieval")
        scores.append(retrieval_score)
        logger.info(f"✓ Retrieval Score: {retrieval_score:.2%}")

        # Layer 2: Generation Evaluation
        logger.info("\n[Layer 2/6] Evaluating Generation...")
        generation_result = self._evaluate_generation(rag_input)
        results["generation"] = generation_result
        generation_score = self._calculate_layer_score(generation_result, "generation")
        scores.append(generation_score)
        logger.info(f"✓ Generation Score: {generation_score:.2%}")

        # Layer 3: Memory Evaluation
        logger.info("\n[Layer 3/6] Evaluating Memory & Context...")
        memory_result = self._evaluate_memory(rag_input)
        results["memory"] = memory_result
        memory_score = self._calculate_layer_score(memory_result, "memory")
        scores.append(memory_score)
        logger.info(f"✓ Memory Score: {memory_score:.2%}")

        # Layer 4: Hallucination Detection
        logger.info("\n[Layer 4/6] Evaluating Hallucination & Safety...")
        hallucination_result = self._evaluate_hallucination(rag_input)
        results["hallucination"] = hallucination_result
        hallucination_score = self._calculate_layer_score(
            hallucination_result, "hallucination"
        )
        scores.append(hallucination_score)
        logger.info(f"✓ Hallucination Score: {hallucination_score:.2%}")

        # Layer 5: Product Metrics (Placeholder for Phase 2)
        logger.info("\n[Layer 5/6] Product Metrics (Phase 2)...")
        results["product"] = {"status": "Phase 2 - Not yet implemented"}
        logger.info("⊘ Skipped (Phase 2)")

        # Layer 6: Quiz Evaluation
        logger.info("\n[Layer 6/6] Evaluating Quiz Generation...")
        quiz_result = self._evaluate_quiz(rag_input)
        results["quiz"] = quiz_result
        quiz_score = (
            self._calculate_layer_score(quiz_result, "quiz") if quiz_result else 1.0
        )
        if quiz_result:
            scores.append(quiz_score)
            logger.info(f"✓ Quiz Score: {quiz_score:.2%}")
        else:
            logger.info("⊘ Skipped (No quiz data provided)")

        # Compile comprehensive report
        overall_score = float(np.mean(scores)) if scores else 0.0
        kpi_status = self._evaluate_kpi_status(results)

        report = EvaluationReport(
            query=rag_input.query,
            timestamp=datetime.now().isoformat(),
            overall_score=overall_score,
            layer_scores={
                "retrieval": retrieval_score,
                "generation": generation_score,
                "memory": memory_score,
                "hallucination": hallucination_score,
                "quiz": quiz_score if quiz_result else None,
            },
            layer_results=results,
            KPI_status=kpi_status,
            evaluation_summary=self._generate_summary(results, overall_score),
        )

        # Log final report
        self._log_report(report)

        return report

    def _evaluate_retrieval(self, rag_input: RAGInput) -> Dict[str, Any]:
        """Evaluate Layer 1: Retrieval"""
        expected_ids = (
            [id for id in rag_input.expected_chunks]
            if rag_input.expected_chunks
            else []
        )

        result = RetrievalEvaluator.evaluate_retrieval(
            retrieved_chunk_ids=rag_input.retrieved_chunk_ids,
            expected_chunk_ids=expected_ids,
            relevance_scores=[1.0] * len(rag_input.retrieved_chunk_ids),
        )

        return {
            "recall_at_5": result.recall_at_5,
            "precision_at_5": result.precision_at_5,
            "mrr": result.mrr,
            "ndcg": result.ndcg,
            "latency_ms": result.latency_ms,
        }

    def _evaluate_generation(self, rag_input: RAGInput) -> Dict[str, Any]:
        """Evaluate Layer 2: Generation"""
        context = " ".join(rag_input.retrieved_chunks)

        result = GenerationEvaluator.evaluate_generation(
            generated_answer=rag_input.generated_answer,
            query=rag_input.query,
            reference_answer=rag_input.reference_answer or "",
            retrieved_context=context,
        )

        return {
            "faithfulness": result.faithfulness,
            "context_utilization": result.context_utilization,
            "answer_relevance": result.answer_relevance,
            "semantic_similarity": result.semantic_similarity,
            "hallucination_rate": result.hallucination_rate,
            "unsupported_claims": result.unsupported_claims,
        }

    def _evaluate_memory(self, rag_input: RAGInput) -> Dict[str, Any]:
        """Evaluate Layer 3: Memory & Context"""
        if (
            not rag_input.conversation_history
            or len(rag_input.conversation_history) < 2
        ):
            logger.info("  ⊘ No multi-turn conversation provided")
            return {"status": "skipped"}

        result = ConversationEvaluator.evaluate_conversation(
            conversation=rag_input.conversation_history,
            context_requirements=[],
            expected_references={},
        )

        return {
            "context_retention": result.context_retention_score,
            "follow_up_accuracy": result.follow_up_accuracy,
            "consistency": result.consistency_score,
            "memory_recall": result.memory_recall_accuracy,
        }

    def _evaluate_hallucination(self, rag_input: RAGInput) -> Dict[str, Any]:
        """Evaluate Layer 4: Hallucination & Safety"""
        context = " ".join(rag_input.retrieved_chunks)

        result = HallucinationEvaluator.evaluate_hallucinations(
            answer=rag_input.generated_answer, context=context, expected_citations=[]
        )

        return {
            "hallucination_rate": result.hallucination_rate,
            "unsupported_claim_ratio": result.unsupported_claim_ratio,
            "citation_correctness": result.citation_correctness,
            "refusal_accuracy": result.refusal_accuracy,
        }

    def _evaluate_quiz(self, rag_input: RAGInput) -> Optional[Dict[str, Any]]:
        """Evaluate Layer 6: Quiz Generation"""
        if not rag_input.quiz_questions:
            return None

        # Prepare source text from retrieved chunks
        source_text = " ".join(rag_input.retrieved_chunks)

        try:
            result = QuizEvaluator.evaluate_quiz(
                generated_questions=rag_input.quiz_questions, source_text=source_text
            )

            return {
                "generation_success": result.generation_success_rate,
                "question_accuracy": result.question_accuracy,
                "difficulty_alignment": result.difficulty_alignment,
                "duplicate_rate": result.duplicate_question_rate,
                "blooms_coverage": result.blooms_taxonomy_coverage,
            }
        except Exception as e:
            logger.warning(f"Quiz evaluation failed: {e}")
            return None

    def _calculate_layer_score(self, layer_result: Dict[str, Any], layer: str) -> float:
        """Calculate normalized score for a layer (0-1)"""
        if not layer_result or layer_result.get("status") == "skipped":
            return 1.0

        # Metrics and their weights
        if layer == "retrieval":
            metrics = ["recall_at_5", "precision_at_5", "mrr", "ndcg"]
            score = float(np.mean([layer_result.get(m, 0) for m in metrics]))
        elif layer == "generation":
            # Faithfulness, context utilization, semantic similarity (max 1.0)
            # Hallucination rate (invert: 1 - rate)
            positive = [
                layer_result.get("faithfulness", 0),
                layer_result.get("context_utilization", 0),
                layer_result.get("semantic_similarity", 0),
                1 - layer_result.get("hallucination_rate", 0),
            ]
            score = float(np.mean(positive))
        elif layer == "memory":
            metrics = [
                "context_retention",
                "follow_up_accuracy",
                "consistency",
                "memory_recall",
            ]
            score = float(np.mean([layer_result.get(m, 0) for m in metrics]))
        elif layer == "hallucination":
            # Invert negatives: 1 - unsupported_ratio, refusal_accuracy, citation_correctness
            positive = [
                1 - layer_result.get("unsupported_claim_ratio", 0),
                layer_result.get("refusal_accuracy", 0),
                layer_result.get("citation_correctness", 0),
            ]
            score = float(np.mean(positive))
        elif layer == "quiz":
            metrics = [
                "generation_success",
                "question_accuracy",
                "difficulty_alignment",
                1 - layer_result.get("duplicate_rate", 0),
            ]
            score = float(np.mean([layer_result.get(m, 0) for m in metrics]))
        else:
            score = 1.0

        return max(0.0, min(1.0, score))  # Clamp to [0, 1]

    def _evaluate_kpi_status(self, results: Dict[str, Any]) -> Dict[str, str]:
        """Evaluate KPI status for each layer"""
        kpi_status = {}

        # Retrieval KPIs
        ret = results.get("retrieval", {})
        kpi_status["retrieval"] = (
            "PASS"
            if (
                ret.get("recall_at_5", 0) > 0.85 and ret.get("precision_at_5", 0) > 0.85
            )
            else "WARN" if (ret.get("recall_at_5", 0) > 0.75) else "FAIL"
        )

        # Generation KPIs
        gen = results.get("generation", {})
        kpi_status["generation"] = (
            "PASS"
            if (
                gen.get("faithfulness", 0) > 0.85
                and gen.get("hallucination_rate", 1) < 0.05
            )
            else "WARN" if (gen.get("faithfulness", 0) > 0.70) else "FAIL"
        )

        # Memory KPIs
        mem = results.get("memory", {})
        kpi_status["memory"] = (
            "PASS"
            if (
                mem.get("consistency", 0) > 0.95
                and mem.get("context_retention", 0) > 0.90
            )
            else "WARN" if (mem.get("status") == "skipped") else "FAIL"
        )

        # Hallucination KPIs
        hal = results.get("hallucination", {})
        kpi_status["hallucination"] = (
            "PASS"
            if (
                hal.get("unsupported_claim_ratio", 1) < 0.05
                and hal.get("refusal_accuracy", 0) > 0.90
            )
            else "WARN" if (hal.get("unsupported_claim_ratio", 1) < 0.10) else "FAIL"
        )

        # Quiz KPIs
        quiz = results.get("quiz", {})
        kpi_status["quiz"] = (
            "PASS"
            if (
                quiz
                and quiz.get("generation_success", 0) > 0.95
                and quiz.get("question_accuracy", 0) > 0.90
            )
            else (
                "WARN"
                if (quiz and quiz.get("generation_success", 0) > 0.80)
                else "PASS"
            )  # If no quiz data, mark as pass
        )

        return kpi_status

    def _generate_summary(self, results: Dict[str, Any], overall_score: float) -> str:
        """Generate human-readable evaluation summary"""
        summary = []

        # Overall
        if overall_score >= 0.90:
            summary.append(
                f"🟢 EXCELLENT: Overall score {overall_score:.1%} - RAG pipeline performing well"
            )
        elif overall_score >= 0.75:
            summary.append(
                f"🟡 GOOD: Overall score {overall_score:.1%} - Some areas for improvement"
            )
        else:
            summary.append(
                f"🔴 POOR: Overall score {overall_score:.1%} - Significant issues detected"
            )

        # Layer-specific insights
        ret = results.get("retrieval", {})
        if ret.get("recall_at_5", 0) < 0.75:
            summary.append("⚠️  Retrieval: Low recall - relevant chunks may be missed")

        gen = results.get("generation", {})
        if gen.get("hallucination_rate", 0) > 0.10:
            summary.append(
                f"⚠️  Generation: High hallucination rate ({gen['hallucination_rate']:.1%})"
            )

        hal = results.get("hallucination", {})
        if hal.get("unsupported_claim_ratio", 0) > 0.10:
            summary.append("⚠️  Hallucination: Many unsupported claims detected")

        return " | ".join(summary)

    def _log_report(self, report: EvaluationReport) -> None:
        """Log comprehensive evaluation report"""
        if not self.log_results:
            return

        logger.info("\n" + "=" * 80)
        logger.info("EVALUATION REPORT SUMMARY")
        logger.info("=" * 80)
        logger.info(f"Overall Score: {report.overall_score:.1%}")
        logger.info(f"Summary: {report.evaluation_summary}")
        logger.info("\nLayer Scores:")
        for layer, score in report.layer_scores.items():
            if score is not None:
                status = "✓" if score >= 0.75 else "⚠"
                logger.info(f"  {status} {layer.capitalize()}: {score:.1%}")
        logger.info("\nKPI Status:")
        for layer, status in report.KPI_status.items():
            icon = "🟢" if status == "PASS" else "🟡" if status == "WARN" else "🔴"
            logger.info(f"  {icon} {layer.capitalize()}: {status}")
        logger.info("=" * 80 + "\n")

        self.evaluation_log.append(report)

    def evaluate_batch(self, inputs: List[RAGInput]) -> List[EvaluationReport]:
        """
        Evaluate multiple RAG inputs

        Args:
            inputs: List of RAGInput objects

        Returns:
            List of EvaluationReports
        """
        logger.info(f"\nStarting batch evaluation of {len(inputs)} items...\n")
        reports = []
        for i, rag_input in enumerate(inputs, 1):
            logger.info(f"\n[{i}/{len(inputs)}] Evaluating sample...")
            report = self.evaluate(rag_input)
            reports.append(report)

        logger.info(f"\nBatch evaluation complete. {len(reports)} reports generated.")
        return reports

    def get_evaluation_summary_stats(self) -> Dict[str, float]:
        """Get summary statistics from all evaluations in log"""
        if not self.evaluation_log:
            return {}

        scores = [r.overall_score for r in self.evaluation_log]

        return {
            "total_evaluations": len(self.evaluation_log),
            "avg_overall_score": float(np.mean(scores)),
            "min_overall_score": float(np.min(scores)),
            "max_overall_score": float(np.max(scores)),
            "std_overall_score": float(np.std(scores)),
        }


# Convenience function for quick evaluation
def evaluate_rag(
    query: str,
    retrieved_chunks: List[str],
    retrieved_chunk_ids: List[str],
    generated_answer: str,
    **kwargs,
) -> EvaluationReport:
    """
    Quick evaluation function for RAG pipeline

    Args:
        query: User query
        retrieved_chunks: List of retrieved chunk texts
        retrieved_chunk_ids: List of chunk IDs
        generated_answer: Generated answer text
        **kwargs: Additional arguments (reference_answer, conversation_history, etc.)

    Returns:
        EvaluationReport
    """
    rag_input = RAGInput(
        query=query,
        retrieved_chunks=retrieved_chunks,
        retrieved_chunk_ids=retrieved_chunk_ids,
        generated_answer=generated_answer,
        **kwargs,
    )

    pipeline = RAGEvaluationPipeline()
    return pipeline.evaluate(rag_input)


if __name__ == "__main__":
    # Example usage
    logger.info("RAG Evaluation Pipeline ready for import")
