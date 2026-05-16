"""
Example usage of the RAG Evaluation Pipeline
Demonstrates how to evaluate RAG outputs using all 6 layers
"""

import json
import logging
import sys
from pathlib import Path
from typing import List, Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from evaluation.pipeline import RAGEvaluationPipeline, RAGInput
from evaluation.loaders.dataset_loader import DatasetLoader

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def load_benchmark_datasets() -> Dict[str, List[Dict[str, Any]]]:
    """Load all benchmark datasets"""
    datasets = {}

    try:
        # Load retrieval benchmark
        ret_path = Path("evaluation/datasets/retrieval/benchmark_retrieval.jsonl")
        if ret_path.exists():
            datasets["retrieval"] = list(DatasetLoader.load_jsonl(str(ret_path)))
            logger.info(f"✓ Loaded {len(datasets['retrieval'])} retrieval samples")

        # Load generation benchmark
        gen_path = Path("evaluation/datasets/generation/benchmark_generation.jsonl")
        if gen_path.exists():
            datasets["generation"] = list(DatasetLoader.load_jsonl(str(gen_path)))
            logger.info(f"✓ Loaded {len(datasets['generation'])} generation samples")

        # Load conversation benchmark
        conv_path = Path(
            "evaluation/datasets/conversations/benchmark_conversations.jsonl"
        )
        if conv_path.exists():
            datasets["conversations"] = list(DatasetLoader.load_jsonl(str(conv_path)))
            logger.info(
                f"✓ Loaded {len(datasets['conversations'])} conversation samples"
            )

        # Load hallucination benchmark
        hal_path = Path(
            "evaluation/datasets/hallucination/benchmark_hallucination.jsonl"
        )
        if hal_path.exists():
            datasets["hallucination"] = list(DatasetLoader.load_jsonl(str(hal_path)))
            logger.info(
                f"✓ Loaded {len(datasets['hallucination'])} hallucination samples"
            )

        # Load quiz benchmark
        quiz_path = Path("evaluation/datasets/quizzes/benchmark_quizzes.jsonl")
        if quiz_path.exists():
            datasets["quizzes"] = list(DatasetLoader.load_jsonl(str(quiz_path)))
            logger.info(f"✓ Loaded {len(datasets['quizzes'])} quiz samples")

    except Exception as e:
        logger.error(f"Error loading datasets: {e}")

    return datasets


def example_1_simple_evaluation():
    """Example 1: Simple single-shot evaluation"""
    logger.info("\n" + "=" * 80)
    logger.info("EXAMPLE 1: Simple Single-Shot Evaluation")
    logger.info("=" * 80)

    # Create RAG input
    rag_input = RAGInput(
        query="What is extended reality?",
        retrieved_chunks=[
            "Extended Reality (XR) is an umbrella term for all real and virtual combined environments.",
            "XR encompasses AR, VR, and MR technologies.",
            "XR is used in gaming, education, and enterprise applications.",
        ],
        retrieved_chunk_ids=["chunk_1", "chunk_2", "chunk_3"],
        generated_answer="Extended Reality (XR) combines physical and digital worlds, enabling immersive experiences through AR, VR, and MR technologies.",
        reference_answer="Extended Reality is the spectrum of technologies that blend digital content with the real world.",
        expected_chunks=["chunk_1", "chunk_2"],
    )

    # Evaluate
    pipeline = RAGEvaluationPipeline(log_results=True)
    report = pipeline.evaluate(rag_input)

    logger.info(f"\n✓ Report generated with overall score: {report.overall_score:.1%}")
    return report


def example_2_batch_evaluation(datasets: Dict[str, List[Dict[str, Any]]]):
    """Example 2: Batch evaluation using benchmark data"""
    logger.info("\n" + "=" * 80)
    logger.info("EXAMPLE 2: Batch Evaluation with Benchmark Data")
    logger.info("=" * 80)

    if not datasets.get("retrieval"):
        logger.warning("⚠ Retrieval dataset not found, skipping batch evaluation")
        return

    # Convert benchmark data to RAGInput objects
    inputs = []
    for sample in datasets["retrieval"][:3]:  # Use first 3 samples
        rag_input = RAGInput(
            query=sample.get("query", ""),
            retrieved_chunks=sample.get("retrieved_chunks", []),
            retrieved_chunk_ids=sample.get("retrieved_chunk_ids", []),
            generated_answer=sample.get("generated_answer", ""),
            reference_answer=sample.get("reference_answer"),
            expected_chunks=sample.get("expected_chunks"),
        )
        inputs.append(rag_input)

    # Batch evaluate
    pipeline = RAGEvaluationPipeline(log_results=True)
    reports = pipeline.evaluate_batch(inputs)

    # Print summary
    stats = pipeline.get_evaluation_summary_stats()
    logger.info(f"\n✓ Batch evaluation complete!")
    logger.info(f"  Total Evaluations: {stats['total_evaluations']}")
    logger.info(f"  Average Score: {stats['avg_overall_score']:.1%}")
    logger.info(f"  Min Score: {stats['min_overall_score']:.1%}")
    logger.info(f"  Max Score: {stats['max_overall_score']:.1%}")

    return reports


def example_3_multi_layer_evaluation():
    """Example 3: Multi-layer evaluation with all RAG components"""
    logger.info("\n" + "=" * 80)
    logger.info("EXAMPLE 3: Multi-Layer Evaluation with All Components")
    logger.info("=" * 80)

    # Create comprehensive RAG input
    rag_input = RAGInput(
        query="Compare edge computing and cloud computing",
        retrieved_chunks=[
            "Edge computing processes data at the network edge, closer to data sources.",
            "Cloud computing centralizes data processing in remote data centers.",
            "Edge is better for real-time applications; cloud excels at scale.",
            "Edge reduces latency; cloud provides flexibility.",
        ],
        retrieved_chunk_ids=["edge_1", "cloud_1", "comparison_1", "comparison_2"],
        generated_answer="Edge computing and cloud computing are complementary. Edge processing data locally reduces latency and is ideal for real-time applications, while cloud computing provides centralized, scalable processing for bulk data.",
        reference_answer="Edge computing processes data locally for low latency, while cloud computing centralizes processing for scale and flexibility.",
        expected_chunks=["edge_1", "comparison_1"],
        conversation_history=[
            {"role": "user", "content": "What is edge computing?"},
            {
                "role": "assistant",
                "content": "Edge computing processes data closer to the source...",
            },
            {"role": "user", "content": "How does it compare to cloud?"},
            {
                "role": "assistant",
                "content": "Edge reduces latency while cloud provides scale...",
            },
        ],
        quiz_questions=[
            {
                "question": "What is the main advantage of edge computing?",
                "options": [
                    "Reduced latency",
                    "More storage",
                    "Lower cost",
                    "Better UI",
                ],
                "correct_answer": 0,
                "difficulty": "easy",
                "category": "Definition",
                "bloom_level": "Remember",
                "source": "Edge computing reduces latency by processing data locally.",
            }
        ],
    )

    # Evaluate all layers
    pipeline = RAGEvaluationPipeline(log_results=True)
    report = pipeline.evaluate(rag_input)

    logger.info(f"\n✓ Multi-layer evaluation complete!")
    logger.info(f"  Overall Score: {report.overall_score:.1%}")
    logger.info(f"  All layers evaluated successfully")

    return report


def example_4_programmatic_access(report):
    """Example 4: Programmatically access evaluation results"""
    logger.info("\n" + "=" * 80)
    logger.info("EXAMPLE 4: Programmatic Access to Results")
    logger.info("=" * 80)

    if not report:
        logger.warning("⚠ No report available")
        return

    # Access overall metrics
    logger.info(f"\nOverall Metrics:")
    logger.info(f"  Overall Score: {report.overall_score:.2%}")
    logger.info(f"  Query: {report.query[:50]}...")

    # Access layer-specific scores
    logger.info(f"\nLayer Scores:")
    for layer, score in report.layer_scores.items():
        if score is not None:
            logger.info(f"  {layer.capitalize()}: {score:.2%}")

    # Access KPI status
    logger.info(f"\nKPI Status:")
    for layer, status in report.KPI_status.items():
        logger.info(f"  {layer.capitalize()}: {status}")

    # Access detailed layer results
    logger.info(f"\nDetailed Results (Sample):")
    if "retrieval" in report.layer_results:
        ret = report.layer_results["retrieval"]
        logger.info(f"  Retrieval Recall@5: {ret.get('recall_at_5', 0):.2%}")
        logger.info(f"  Retrieval Precision@5: {ret.get('precision_at_5', 0):.2%}")

    if "generation" in report.layer_results:
        gen = report.layer_results["generation"]
        logger.info(f"  Generation Faithfulness: {gen.get('faithfulness', 0):.2%}")
        logger.info(f"  Hallucination Rate: {gen.get('hallucination_rate', 0):.2%}")

    if "hallucination" in report.layer_results:
        hal = report.layer_results["hallucination"]
        logger.info(
            f"  Unsupported Claims: {hal.get('unsupported_claim_ratio', 0):.2%}"
        )
        logger.info(f"  Refusal Accuracy: {hal.get('refusal_accuracy', 0):.2%}")


def export_report_to_json(report, output_path: str = "evaluation_report.json"):
    """Export evaluation report to JSON for further analysis"""
    logger.info("\n" + "=" * 80)
    logger.info("EXPORTING REPORT TO JSON")
    logger.info("=" * 80)

    if not report:
        logger.warning("⚠ No report available for export")
        return

    # Convert report to dictionary
    report_dict = {
        "query": report.query,
        "timestamp": report.timestamp,
        "overall_score": report.overall_score,
        "layer_scores": report.layer_scores,
        "kpi_status": report.KPI_status,
        "summary": report.evaluation_summary,
        "detailed_results": report.layer_results,
    }

    # Save to JSON
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    with open(output_file, "w") as f:
        json.dump(report_dict, f, indent=2, default=str)

    logger.info(f"✓ Report exported to: {output_file}")
    logger.info(f"  Overall Score: {report.overall_score:.1%}")
    logger.info(f"  KPI Status: {', '.join(report.KPI_status.values())}")


def main():
    """Run all examples"""
    logger.info("\n" + "🚀 " * 40)
    logger.info("RAG EVALUATION PIPELINE - EXAMPLES")
    logger.info("🚀 " * 40)

    # Load datasets
    logger.info("\nLoading benchmark datasets...")
    datasets = load_benchmark_datasets()

    # Run examples
    try:
        # Example 1: Simple evaluation
        report1 = example_1_simple_evaluation()

        # Example 2: Batch evaluation
        reports2 = example_2_batch_evaluation(datasets)

        # Example 3: Multi-layer evaluation
        report3 = example_3_multi_layer_evaluation()

        # Example 4: Programmatic access
        example_4_programmatic_access(report3)

        # Export report
        if report3:
            export_report_to_json(report3, "evaluation_output/evaluation_report.json")

        logger.info("\n" + "✓ " * 40)
        logger.info("ALL EXAMPLES COMPLETED SUCCESSFULLY!")
        logger.info("✓ " * 40 + "\n")

    except Exception as e:
        logger.error(f"Error running examples: {e}", exc_info=True)


if __name__ == "__main__":
    main()
