from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self, model_name="Qwen/Qwen3-Embedding-8B"):
        self.model_name = model_name
        self._model = None  # not loaded yet

    @property
    def model(self):
        # Lazy loading happens here
        if self._model is None:
            print("Loading embedding model...")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed_documents(self, docs):
        return self.model.encode(
            docs, convert_to_numpy=True, normalize_embeddings=True, batch_size=32
        )

    def embed_query(self, query):
        embedding = self.model.encode(
            [query], convert_to_numpy=True, normalize_embeddings=True, batch_size=32
        )
        return embedding[0]
