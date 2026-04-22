from sentence_transformers import SentenceTransformer


class Embedder:
    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    def embed_document(self, doc):
        return self.model.encode(doc, convert_to_numpy=True)

    def embed_query(self, q):
        return self.model.encode([q], convert_to_numpy=True)[0]


embedder = Embedder()
