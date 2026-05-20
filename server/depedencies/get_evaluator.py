from functools import lru_cache
from services.rag_evaluator import RAGEvaluator
import os
from config.settings import settings

# ── dependency: singleton evaluator


@lru_cache(maxsize=1)
def get_evaluator(
    llm_model: str = settings.RAG_EVAL_LLM,
    embedd_model: str = settings.DEF_EMBEDD_MODEL,
    HF_TOKEN: str = settings.HF_API_KEY,
) -> RAGEvaluator:
    """
    Instantiated once.  Uses env vars so no secrets in code.
    Map to your existing project env config.
    """
    return RAGEvaluator(
        llm_model_name=llm_model,
        embed_model_name=embedd_model,
        hf_token=HF_TOKEN,
    )
