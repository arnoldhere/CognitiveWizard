from langchain_community.embeddings import HuggingFaceEmbeddings


# ============
# Factory to create embeddings using langchain
# ============
class EmbeddingFactory:
    """
    Factory to create embeddings.
    WHY:
    - Avoid hardcoding model
    - Easily switch to OpenAI / other embeddings later
    """

    @staticmethod
    def get_embeddings(model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        return HuggingFaceEmbeddings(model_name=model_name)
