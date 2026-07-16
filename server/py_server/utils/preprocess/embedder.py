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

    _cache = {}

    @classmethod
    def get_embeddings(cls, model_name=settings.DEF_EMBEDD_MODEL, mode="local"):
        key = (mode, model_name)

        if key not in cls._cache:
            if mode == "local":
                cls._cache[key] = HuggingFaceEmbeddings(
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
            elif mode == "inference":
                cls._cache[key] = HuggingFaceEndpointEmbeddings(
                    model=model_name,
                    huggingfacehub_api_token=settings.HF_API_KEY,
                )

        return cls._cache[key]
