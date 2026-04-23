class Retriever:
    def __init__(self, vector_store, embedder):
        self.vector_store = vector_store
        self.embedder = embedder

    def search(self, query_embedding, top_k=5, user_id=None):
        return self.vector_store.search_top_k(
            query_embedding,
            "rag",
            top_k,
            user_id=user_id,
        )
