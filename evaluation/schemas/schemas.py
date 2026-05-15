"""
Pydantic schemas for RAG evaluation datasets.
Defines the data structure for all evaluation layers.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class DifficultyLevel(str, Enum):
    """Question difficulty levels."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CategoryType(str, Enum):
    """Question categories."""

    DEFINITION = "definition"
    COMPARISON = "comparison"
    REASONING = "reasoning"
    MULTI_HOP = "multi_hop"
    NUMERICAL = "numerical"
    TABLE_BASED = "table_based"
    DIAGRAM_BASED = "diagram_based"


class BloomsTaxonomy(str, Enum):
    """Bloom's taxonomy levels for quiz evaluation."""

    REMEMBER = "remember"
    UNDERSTAND = "understand"
    APPLY = "apply"
    ANALYZE = "analyze"
    EVALUATE = "evaluate"
    CREATE = "create"


# ============================================================================
# Layer 1: Retrieval Evaluation Schemas
# ============================================================================


class RetrievalDataset(BaseModel):
    """Schema for retrieval evaluation datasets.

    Evaluates whether the retriever fetches correct context chunks.
    """

    id: str = Field(..., description="Unique identifier")
    document: str = Field(..., description="Document ID or filename")
    query: str = Field(..., description="User query")
    expected_chunk_ids: List[str] = Field(
        ..., description="Expected relevant chunk IDs"
    )
    expected_keywords: List[str] = Field(
        ..., description="Keywords that should appear in relevant chunks"
    )
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    category: str = Field(default="retrieval")
    metadata: Optional[Dict[str, Any]] = Field(default=None)

    class Config:
        use_enum_values = True


class ChunkMetadata(BaseModel):
    """Metadata for document chunks."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Source document ID")
    page: int = Field(..., description="Page number in source document")
    section: str = Field(..., description="Section title in document")
    content: str = Field(..., description="Chunk text content")
    embedding: Optional[List[float]] = Field(
        default=None, description="Vector embedding"
    )
    token_count: Optional[int] = Field(default=None)

    class Config:
        use_enum_values = True


# ============================================================================
# Layer 2: Generation Evaluation Schemas
# ============================================================================


class GenerationDataset(BaseModel):
    """Schema for generation/answer evaluation datasets.

    Evaluates whether generated answers are accurate, grounded, and relevant.
    """

    id: str = Field(..., description="Unique identifier")
    query: str = Field(..., description="User query")
    reference_answer: str = Field(..., description="Expected/reference answer")
    source_chunks: List[str] = Field(..., description="Chunk IDs that should be used")
    expected_citations: List[str] = Field(
        ..., description="Expected citations/references"
    )
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    category: CategoryType = Field(default=CategoryType.DEFINITION)
    metadata: Optional[Dict[str, Any]] = Field(default=None)

    class Config:
        use_enum_values = True


# ============================================================================
# Layer 3: Conversational/Memory Evaluation Schemas
# ============================================================================


class ConversationTurn(BaseModel):
    """Single turn in a conversation."""

    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Turn content")
    metadata: Optional[Dict[str, Any]] = Field(default=None)


class ConversationDataset(BaseModel):
    """Schema for multi-turn conversation evaluation datasets.

    Evaluates memory, context carry-over, and follow-up understanding.
    """

    id: str = Field(..., description="Unique identifier")
    conversation: List[ConversationTurn] = Field(
        ..., description="Multi-turn conversation"
    )
    expected_behavior: List[str] = Field(
        ..., description="Expected behaviors to verify"
    )
    reference_answer: str = Field(..., description="Reference answer for final turn")
    context_requirements: List[str] = Field(
        default_factory=list,
        description="Specific context requirements from earlier turns",
    )
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)

    class Config:
        use_enum_values = True


# ============================================================================
# Layer 4: Hallucination & Safety Evaluation Schemas
# ============================================================================


class HallucinationDataset(BaseModel):
    """Schema for hallucination detection datasets.

    Tests with ambiguous, impossible, or unsupported questions.
    """

    id: str = Field(..., description="Unique identifier")
    query: str = Field(..., description="Query that might trigger hallucination")
    document_context: Optional[str] = Field(
        default=None,
        description="Document content available (empty if testing out-of-context)",
    )
    expected_behavior: str = Field(
        ..., description="What model should say (e.g., 'Not available in context')"
    )
    hallucination_expected: bool = Field(
        default=False,
        description="Whether hallucination is expected if context is missing",
    )
    test_type: str = Field(
        default="missing_context",
        description="Type: missing_context, adversarial, or unsupported",
    )

    class Config:
        use_enum_values = True


# ============================================================================
# Layer 5: Product/User Metrics Schemas
# ============================================================================


class UserInteractionMetric(BaseModel):
    """User interaction metric for product evaluation."""

    session_id: str = Field(..., description="Unique session ID")
    user_id: Optional[str] = Field(default=None)
    timestamp: str = Field(..., description="ISO format timestamp")
    query: str = Field(..., description="User query")
    response: str = Field(..., description="System response")
    response_time_ms: float = Field(..., description="Response latency in milliseconds")
    user_satisfied: Optional[bool] = Field(
        default=None, description="User satisfaction flag"
    )
    conversation_turn: int = Field(..., description="Turn number in session")
    session_ended: bool = Field(default=False)

    class Config:
        use_enum_values = True


# ============================================================================
# Layer 6: Quiz Generator Evaluation Schemas
# ============================================================================


class QuizQuestion(BaseModel):
    """Single quiz question."""

    text: str = Field(..., description="Question text")
    options: Optional[List[str]] = Field(default=None, description="MCQ options")
    correct_answer: str = Field(..., description="Correct answer")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)


class QuizDataset(BaseModel):
    """Schema for quiz generation evaluation datasets.

    Evaluates question quality, correctness, and educational value.
    """

    id: str = Field(..., description="Unique identifier")
    source_text: str = Field(..., description="Source text for quiz generation")
    expected_questions: List[str] = Field(..., description="Expected question formats")
    expected_answer: str = Field(..., description="Expected answer")
    difficulty: DifficultyLevel = Field(default=DifficultyLevel.MEDIUM)
    blooms_taxonomy: BloomsTaxonomy = Field(default=BloomsTaxonomy.UNDERSTAND)
    category: str = Field(default="mcq")
    metadata: Optional[Dict[str, Any]] = Field(default=None)

    class Config:
        use_enum_values = True


# ============================================================================
# Evaluation Results Schemas
# ============================================================================


class RetrievalMetrics(BaseModel):
    """Results from retrieval evaluation."""

    recall_at_5: float = Field(..., description="Recall@5 score")
    precision_at_5: float = Field(..., description="Precision@5 score")
    mrr: float = Field(..., description="Mean Reciprocal Rank")
    ndcg: float = Field(..., description="Normalized Discounted Cumulative Gain")
    retrieval_latency_ms: float = Field(..., description="Retrieval latency in ms")
    chunk_relevance_scores: List[float] = Field(default_factory=list)
    retrieved_chunk_ids: List[str] = Field(default_factory=list)


class GenerationMetrics(BaseModel):
    """Results from generation evaluation."""

    faithfulness_score: float = Field(
        ..., description="0-1, does answer match context?"
    )
    context_utilization: float = Field(..., description="0-1, was retrieved info used?")
    answer_relevance: float = Field(..., description="0-1, does answer solve query?")
    semantic_similarity: float = Field(..., description="0-1, similarity to reference")
    hallucination_rate: float = Field(..., description="0-1, unsupported claims ratio")
    generated_answer: str = Field(..., description="Generated answer text")


class MemoryMetrics(BaseModel):
    """Results from memory/conversation evaluation."""

    context_retention_score: float = Field(..., description="0-1, memory quality")
    follow_up_accuracy: float = Field(..., description="0-1, follow-up understanding")
    conversation_consistency: float = Field(..., description="0-1, no contradictions")
    memory_recall_accuracy: float = Field(..., description="0-1, correct recall")
    issues_found: List[str] = Field(
        default_factory=list, description="Memory issues detected"
    )


class HallucinationMetrics(BaseModel):
    """Results from hallucination detection."""

    hallucination_rate: float = Field(
        ..., description="0-1, ratio of unsupported claims"
    )
    unsupported_claim_ratio: float = Field(
        ..., description="0-1, claims not in context"
    )
    citation_correctness: float = Field(..., description="0-1, citation accuracy")
    refusal_accuracy: float = Field(..., description="0-1, proper unknowns handling")
    detected_hallucinations: List[str] = Field(default_factory=list)


class QuizMetrics(BaseModel):
    """Results from quiz evaluation."""

    generation_success_rate: float = Field(
        ..., description="0-1, valid quiz generation"
    )
    question_accuracy: float = Field(..., description="0-1, question correctness")
    difficulty_alignment: float = Field(..., description="0-1, difficulty match")
    answer_correctness: float = Field(..., description="0-1, answer correctness")
    duplicate_question_rate: float = Field(..., description="0-1, redundancy ratio")
    blooms_taxonomy_coverage: Dict[str, float] = Field(
        default_factory=dict, description="Coverage of cognitive levels"
    )


# ============================================================================
# Comprehensive Evaluation Report
# ============================================================================


class EvaluationReport(BaseModel):
    """Comprehensive evaluation report across all layers."""

    report_id: str = Field(..., description="Unique report ID")
    timestamp: str = Field(..., description="ISO format timestamp")
    model_name: str = Field(..., description="Model being evaluated")
    dataset_name: str = Field(..., description="Evaluation dataset name")

    # Layer metrics
    retrieval_metrics: Optional[RetrievalMetrics] = None
    generation_metrics: Optional[GenerationMetrics] = None
    memory_metrics: Optional[MemoryMetrics] = None
    hallucination_metrics: Optional[HallucinationMetrics] = None
    quiz_metrics: Optional[QuizMetrics] = None

    # Summary KPIs
    overall_score: float = Field(..., description="Overall system score 0-1")
    kpi_status: Dict[str, bool] = Field(
        default_factory=dict, description="KPI threshold status"
    )
    recommendations: List[str] = Field(default_factory=list)
    issues_found: List[str] = Field(default_factory=list)


class Config:
    use_enum_values = True
