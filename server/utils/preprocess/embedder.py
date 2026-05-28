import torch
from langchain_huggingface import HuggingFaceEmbeddings

# ==========================
# Config
# ==========================

DEF_EMBEDD_MODEL = "all-MiniLM-L6-v2"
# EMBEDDING_MODEL_MODE = "local"

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmbeddingFactory:
    """
    Factory class for embedding models.
    """

    _cached_embeddings = None

    @staticmethod
    def get_embeddings(model_name: str = DEF_EMBEDD_MODEL):
        """
        Returns singleton embedding model instance.
        """

        if EmbeddingFactory._cached_embeddings is None:
            EmbeddingFactory._cached_embeddings = HuggingFaceEmbeddings(
                model_name=model_name,
                model_kwargs={
                    "device": DEVICE,
                    "trust_remote_code": True,
                },
                encode_kwargs={
                    "normalize_embeddings": True,
                    "batch_size": 16,
                },
            )

        return EmbeddingFactory._cached_embeddings
