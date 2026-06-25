import torch
from config.settings import settings
from langchain_huggingface import HuggingFaceEndpointEmbeddings, HuggingFaceEmbeddings

# ==========================
# Config
# ==========================

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmbeddingFactory:
    """
    Factory class for Hugging Face Inference API embeddings.
    """

    _cached_embeddings = None

    @staticmethod
    def get_embeddings(
        model_name: str = settings.DEF_EMBEDD_MODEL, mode: str = "local"
    ):
        if mode == "local":
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
        elif mode == "inference":
            if EmbeddingFactory._cached_embeddings is None:
                EmbeddingFactory._cached_embeddings = HuggingFaceEndpointEmbeddings(
                    model=model_name,
                    huggingfacehub_api_token=settings.HF_API_KEY,
                )
            return EmbeddingFactory._cached_embeddings
