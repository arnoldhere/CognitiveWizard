from pydantic import BaseModel, Field


class QAPair(BaseModel):
    question: str
    answer: str  # chatbot-generated answer
    contexts: list[str] = Field(min_length=1)  # retrieved chunks
    ground_truth: str
    # optional latency fields (ms) injected by chatbot pipeline
    retrieval_ms: float | None = None
    generation_ms: float | None = None
    total_ms: float | None = None


class EvaluationRequest(BaseModel):
    """
    Send a representative sample (≥5 QA pairs recommended).
    For a one-click admin run, the frontend auto-collects
    logged QA pairs from the DB and sends them here.
    """

    qa_pairs: list[QAPair] = Field(min_length=1)


class EvaluationStatusResponse(BaseModel):
    status: str  # "running" | "completed" | "idle"
    report: dict | None = None
