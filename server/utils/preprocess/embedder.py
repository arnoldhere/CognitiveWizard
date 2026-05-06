import torch
from langchain_huggingface import HuggingFaceEmbeddings
from sentence_transformers import SentenceTransformer
from config.settings import settings

# ============
# Factory to create embeddings using langchain
# ============
DEF_EMBEDD_MODEL = "BAAI/bge-m3"  # best balance: speed + accuracy + multilingual
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmbeddingFactory:
    """
    Factory to create embeddings.
    WHY:
    - Avoid hardcoding model
    - Easily switch to OpenAI / other embeddings later
    """

    # default embedding model
    # DEF_EMBEDD_MODEL = SentenceTransformer("google/embeddinggemma-300m")
    # DEF_EMBEDD_MODEL = SentenceTransformer("Qwen/Qwen3-Embedding-8B") Find alternate too large

    @staticmethod
    def get_embeddings(model_name: str = DEF_EMBEDD_MODEL):
        return HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"token": settings.HF_API_KEY, "device": DEVICE},
        )
