"""
RAG Evaluator Service - Comprehensive evaluation pipeline using RAGAS metrics.

Metrics evaluated:
1. Faithfulness Score - How factually correct is the answer based on context
2. Context Precision - Fraction of retrieved contexts that are relevant
3. Context Recall - Fraction of relevant contexts that were retrieved
4. Hallucination Rate - Derived from 1 - faithfulness
5. Context Retrieval Ratio - Keyword overlap ratio between question and contexts
6. Context Awareness - How well answer covers the retrieved contexts
7. Answer Generation Quality - Composite score (faithfulness + relevancy) / 2
8. Latency & Efficiency - Query execution time breakdown

This service provides structured evaluation with interpretations and caching.
"""

import logging
import json
from typing import Optional, Dict, List, Any
from datetime import datetime
import statistics

# RAGAS metrics
try:
    from ragas.metrics import (
        faithfulness,
        context_precision,
        context_recall,
        answer_relevancy,
    )
    from ragas import evaluate
    RAGAS_AVAILABLE = True
except ImportError:
    RAGAS_AVAILABLE = False
    logging.warning("RAGAS not installed. Install with: pip install ragas")

logger = logging.getLogger(__name__)


class RAGEvaluator:
    """
    Comprehensive RAG evaluation engine using RAGAS and custom metrics.
    
    Usage:
        evaluator = RAGEvaluator()
        report = evaluator.evaluate(
            question="What is the capital of France?",
            answer="Paris is the capital.",
            contexts=["France's capital is Paris...", "Paris is located..."],
            latency_retrieval_ms=150.5,
            latency_generation_ms=320.8
        )
    """
    
    def __init__(self, llm_model: str = "gpt-3.5-turbo"):
        """
        Initialize RAG evaluator.
        
        Args:
            llm_model: LLM model for evaluation (default: gpt-3.5-turbo)
        """
        self.llm_model = llm_model
        self._evaluation_cache = {}  # In-memory cache for evaluations
        
    def evaluate(
        self,
        question: str,
        answer: str,
        contexts: List[str],
        latency_retrieval_ms: Optional[float] = None,
        latency_generation_ms: Optional[float] = None,
        use_cache: bool = True,
    ) -> Dict[str, Any]:
        """
        Run comprehensive RAG evaluation on a query-answer pair.
        
        Args:
            question: The user's query
            answer: The generated answer
            contexts: List of retrieved context chunks
            latency_retrieval_ms: Time taken for retrieval
            latency_generation_ms: Time taken for generation
            use_cache: Whether to use cached evaluations
            
        Returns:
            Structured evaluation report with metrics and interpretations
        """
        
        # Create cache key
        cache_key = self._create_cache_key(question, answer, contexts)
        if use_cache and cache_key in self._evaluation_cache:
            return self._evaluation_cache[cache_key]
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "query": question,
            "answer": answer,
            "context_count": len(contexts),
            "metrics": {},
            "interpretations": {},
            "latency": {},
        }
        
        # === RAGAS Native Metrics ===
        if RAGAS_AVAILABLE and contexts:
            try:
                ragas_scores = self._evaluate_ragas_metrics(question, answer, contexts)
                report["metrics"].update(ragas_scores)
            except Exception as e:
                logger.warning(f"RAGAS evaluation failed: {e}")
        
        # === Custom Metrics ===
        custom_scores = self._evaluate_custom_metrics(question, answer, contexts)
        report["metrics"].update(custom_scores)
        
        # === Latency Metrics ===
        if latency_retrieval_ms or latency_generation_ms:
            latency_data = self._evaluate_latency(
                latency_retrieval_ms, latency_generation_ms
            )
            report["latency"] = latency_data
            report["metrics"]["latency_efficiency"] = latency_data["efficiency_score"]
        
        # === Generate Interpretations ===
        report["interpretations"] = self._interpret_metrics(report["metrics"])
        
        # === Overall Score ===
        report["overall_score"] = self._calculate_overall_score(report["metrics"])
        
        # Cache the result
        self._evaluation_cache[cache_key] = report
        
        return report
    
    def _evaluate_ragas_metrics(
        self, question: str, answer: str, contexts: List[str]
    ) -> Dict[str, float]:
        """
        Evaluate RAGAS native metrics.
        
        Returns:
            {
                'faithfulness': float (0-1),
                'context_precision': float (0-1),
                'context_recall': float (0-1),
                'answer_relevancy': float (0-1)
            }
        """
        try:
            # Prepare evaluation dataset format for RAGAS
            data = {
                "question": [question],
                "answer": [answer],
                "contexts": [contexts],
            }
            
            # Evaluate with RAGAS metrics
            scores = evaluate(
                data,
                metrics=[
                    faithfulness,
                    context_precision,
                    context_recall,
                    answer_relevancy,
                ],
            )
            
            return {
                "faithfulness": float(scores["faithfulness"].values[0]),
                "context_precision": float(scores["context_precision"].values[0]),
                "context_recall": float(scores["context_recall"].values[0]),
                "answer_relevancy": float(scores["answer_relevancy"].values[0]),
            }
        except Exception as e:
            logger.error(f"RAGAS evaluation error: {e}")
            return {}
    
    def _evaluate_custom_metrics(
        self, question: str, answer: str, contexts: List[str]
    ) -> Dict[str, float]:
        """
        Evaluate custom RAG metrics.
        
        Returns:
            {
                'hallucination_rate': float (0-1),
                'context_retrieval_ratio': float (0-1),
                'context_awareness': float (0-1),
                'answer_quality': float (0-1)
            }
        """
        metrics = {}
        
        # 1. Hallucination Rate = 1 - faithfulness (estimated via keyword overlap)
        hallucination_rate = self._calculate_hallucination_rate(question, answer, contexts)
        metrics["hallucination_rate"] = hallucination_rate
        
        # 2. Context Retrieval Ratio = keyword overlap ratio
        retrieval_ratio = self._calculate_retrieval_ratio(question, contexts)
        metrics["context_retrieval_ratio"] = retrieval_ratio
        
        # 3. Context Awareness = answer token coverage over context
        context_awareness = self._calculate_context_awareness(answer, contexts)
        metrics["context_awareness"] = context_awareness
        
        return metrics
    
    def _calculate_hallucination_rate(
        self, question: str, answer: str, contexts: List[str]
    ) -> float:
        """
        Calculate hallucination rate.
        
        Uses a heuristic: tokens in answer not covered by contexts indicate hallucination.
        Range: 0 (no hallucination) to 1 (complete hallucination)
        """
        try:
            if not contexts:
                return 1.0
            
            # Tokenize
            answer_tokens = set(answer.lower().split())
            context_tokens = set(" ".join(contexts).lower().split())
            
            # Filter stopwords for accuracy
            stopwords = {"the", "a", "an", "is", "are", "was", "were", "and", "or", "but"}
            answer_tokens -= stopwords
            
            if not answer_tokens:
                return 0.0
            
            # Calculate coverage
            covered_tokens = answer_tokens & context_tokens
            coverage = len(covered_tokens) / len(answer_tokens)
            
            hallucination_rate = max(0.0, 1.0 - coverage)
            return round(hallucination_rate, 3)
        except Exception as e:
            logger.warning(f"Hallucination calculation failed: {e}")
            return 0.5  # Neutral default
    
    def _calculate_retrieval_ratio(
        self, question: str, contexts: List[str]
    ) -> float:
        """
        Calculate context retrieval ratio using keyword overlap.
        
        Range: 0 (no overlap) to 1 (perfect overlap)
        """
        try:
            if not contexts:
                return 0.0
            
            question_tokens = set(question.lower().split())
            context_tokens = set(" ".join(contexts).lower().split())
            
            if not question_tokens:
                return 0.0
            
            overlap = question_tokens & context_tokens
            ratio = len(overlap) / len(question_tokens)
            
            return round(max(0.0, min(1.0, ratio)), 3)
        except Exception as e:
            logger.warning(f"Retrieval ratio calculation failed: {e}")
            return 0.5
    
    def _calculate_context_awareness(
        self, answer: str, contexts: List[str]
    ) -> float:
        """
        Calculate context awareness.
        
        Measures how well the answer utilizes the retrieved contexts.
        Range: 0 (ignores context) to 1 (fully utilizes context)
        """
        try:
            if not contexts:
                return 0.0
            
            answer_tokens = set(answer.lower().split())
            context_tokens = set(" ".join(contexts).lower().split())
            
            if not context_tokens:
                return 0.0
            
            # Coverage of context in answer
            coverage = len(answer_tokens & context_tokens) / len(context_tokens)
            
            return round(max(0.0, min(1.0, coverage)), 3)
        except Exception as e:
            logger.warning(f"Context awareness calculation failed: {e}")
            return 0.5
    
    def _evaluate_latency(
        self,
        latency_retrieval_ms: Optional[float],
        latency_generation_ms: Optional[float],
    ) -> Dict[str, Any]:
        """
        Evaluate latency and efficiency metrics.
        
        Returns:
            {
                'retrieval_ms': float,
                'generation_ms': float,
                'total_ms': float,
                'efficiency_score': float (0-1),
                'efficiency_level': str
            }
        """
        retrieval = latency_retrieval_ms or 0.0
        generation = latency_generation_ms or 0.0
        total = retrieval + generation
        
        # Efficiency scoring (lower latency = higher score)
        # Benchmark: retrieval < 500ms, generation < 1000ms
        retrieval_efficiency = max(0.0, 1.0 - (retrieval / 500.0))
        generation_efficiency = max(0.0, 1.0 - (generation / 1000.0))
        overall_efficiency = (retrieval_efficiency + generation_efficiency) / 2
        
        efficiency_level = (
            "Excellent" if overall_efficiency > 0.8
            else "Good" if overall_efficiency > 0.6
            else "Fair" if overall_efficiency > 0.4
            else "Poor"
        )
        
        return {
            "retrieval_ms": round(retrieval, 2),
            "generation_ms": round(generation, 2),
            "total_ms": round(total, 2),
            "efficiency_score": round(overall_efficiency, 3),
            "efficiency_level": efficiency_level,
        }
    
    def _interpret_metrics(self, metrics: Dict[str, float]) -> Dict[str, str]:
        """
        Generate human-readable interpretations of metric scores.
        
        Returns:
            Interpretation strings for each metric
        """
        interpretations = {}
        
        for metric_name, score in metrics.items():
            if metric_name == "latency_efficiency":
                interpretations[metric_name] = self._interpret_efficiency(score)
            elif metric_name in ["faithfulness", "answer_relevancy"]:
                interpretations[metric_name] = self._interpret_score(
                    score, "Answer quality"
                )
            elif metric_name in ["context_precision", "context_recall"]:
                interpretations[metric_name] = self._interpret_score(
                    score, "Context match"
                )
            elif metric_name == "hallucination_rate":
                interpretations[metric_name] = self._interpret_hallucination(score)
            elif metric_name == "context_retrieval_ratio":
                interpretations[metric_name] = self._interpret_score(
                    score, "Retrieval"
                )
            elif metric_name == "context_awareness":
                interpretations[metric_name] = self._interpret_score(
                    score, "Context usage"
                )
        
        return interpretations
    
    def _interpret_score(self, score: float, aspect: str) -> str:
        """Generate interpretation for a 0-1 score."""
        if score >= 0.8:
            return f"{aspect}: Excellent ({score:.1%})"
        elif score >= 0.6:
            return f"{aspect}: Good ({score:.1%})"
        elif score >= 0.4:
            return f"{aspect}: Fair ({score:.1%})"
        else:
            return f"{aspect}: Needs improvement ({score:.1%})"
    
    def _interpret_hallucination(self, rate: float) -> str:
        """Generate interpretation for hallucination rate."""
        if rate < 0.1:
            return f"Low hallucination ({rate:.1%}) - Very reliable"
        elif rate < 0.3:
            return f"Moderate hallucination ({rate:.1%}) - Generally reliable"
        elif rate < 0.5:
            return f"Notable hallucination ({rate:.1%}) - Use with caution"
        else:
            return f"High hallucination ({rate:.1%}) - Not reliable"
    
    def _interpret_efficiency(self, score: float) -> str:
        """Generate interpretation for efficiency score."""
        if score > 0.8:
            return f"Excellent efficiency - Very fast ({score:.1%})"
        elif score > 0.6:
            return f"Good efficiency - Acceptable speed ({score:.1%})"
        elif score > 0.4:
            return f"Fair efficiency - Moderate speed ({score:.1%})"
        else:
            return f"Poor efficiency - Slow response ({score:.1%})"
    
    def _calculate_overall_score(self, metrics: Dict[str, float]) -> float:
        """
        Calculate overall RAG quality score (0-1).
        
        Weights important metrics and produces a single composite score.
        """
        if not metrics:
            return 0.0
        
        # Weight important metrics
        weights = {
            "faithfulness": 0.25,
            "answer_relevancy": 0.20,
            "context_precision": 0.15,
            "context_recall": 0.15,
            "context_awareness": 0.10,
            "hallucination_rate": -0.10,  # Negative: lower is better
            "latency_efficiency": 0.05,
        }
        
        total_score = 0.0
        total_weight = 0.0
        
        for metric_name, weight in weights.items():
            if metric_name in metrics:
                value = metrics[metric_name]
                if metric_name == "hallucination_rate":
                    # Invert hallucination rate
                    value = 1.0 - value
                total_score += value * weight
                total_weight += abs(weight)
        
        if total_weight == 0:
            return 0.0
        
        overall = total_score / total_weight
        return round(max(0.0, min(1.0, overall)), 3)
    
    def _create_cache_key(
        self, question: str, answer: str, contexts: List[str]
    ) -> str:
        """Create a cache key from evaluation inputs."""
        key_data = f"{question}|{answer}|{'|'.join(contexts)}"
        return str(hash(key_data))
    
    def clear_cache(self) -> None:
        """Clear the in-memory evaluation cache."""
        self._evaluation_cache.clear()
        logger.info("Evaluation cache cleared")


# Singleton instance
rag_evaluator = RAGEvaluator()
