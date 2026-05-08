import torch
from config.settings import settings
from langchain_huggingface import HuggingFaceEndpointEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings
from sentence_transformers import SentenceTransformer

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

    model = SentenceTransformer(DEF_EMBEDD_MODEL)

    @staticmethod
    def get_embeddings(model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        return HuggingFaceEmbeddings(model_name=model_name)
