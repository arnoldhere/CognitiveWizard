from functools import lru_cache
from services.rag_evaluator import RAGEvaluator
from config.settings import settings

# ── dependency: singleton evaluator


@lru_cache(maxsize=1)
def get_evaluator(
    llm_model: str | None = settings.RAG_EVAL_LLM,
    embed_model: str | None = settings.DEF_EMBEDD_MODEL,
    HF_TOKEN: str = settings.HUGGINGFACEHUB_API_TOKEN or settings.HF_API_KEY,
) -> RAGEvaluator:
    """
    Instantiated once.  Uses env vars so no secrets in code.
    Map to your existing project env config.
    """
    return RAGEvaluator(
        llm_model_name=llm_model or settings.HF_DEF_MODEL,
        embed_model_name=embed_model or "sentence-transformers/all-MiniLM-L6-v2",
        hf_token=HF_TOKEN,
    )
