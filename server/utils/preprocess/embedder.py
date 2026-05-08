import torch
from langchain_huggingface import HuggingFaceEmbeddings

# ==========================
# Config
# ==========================

DEF_EMBEDD_MODEL = "BAAI/bge-m3"
EMBEDDING_MODEL_MODE = "local"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


class EmbeddingFactory:
    """
    Factory class for embedding models.
    """

    # model = SentenceTransformer(DEF_EMBEDD_MODEL)

    @staticmethod
    def get_embeddings(model_name: str = DEF_EMBEDD_MODEL):
        return HuggingFaceEmbeddings(model_name=model_name)
