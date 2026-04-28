from sentence_transformers import SentenceTransformer


# =========
# Sample customized Embedder
# =========
class Embedder:
    def __init__(self):
        self.model = SentenceTransformer("all-mpnet-base-v2")

    def embed_documents(self, docs):
        """
        docs: list[str]
        returns: np.ndarray (n_docs, dim)
        """
        return self.model.encode(
            docs, convert_to_numpy=True, normalize_embeddings=True, batch_size=32
        )

    def embed_query(self, query):
        """
        query: str
        returns: np.ndarray (dim,)
        """
        embedding = self.model.encode(
            [query], convert_to_numpy=True, normalize_embeddings=True, batch_size=32
        )
        return embedding[0]
