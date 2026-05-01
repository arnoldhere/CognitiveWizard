class HybridRetriever:
    """
    Hybrid Retriever
    WHY:
    - Better than pure similarity search
    - Can be extended with BM25 later
    """

    def __init__(self, vectordb):
        self.vectordb = vectordb
        self.retriever = vectordb.as_retriever(
            search_type="mmr", search_kwargs={"k": 5}
        )

    def retrieve(self, query: str):
        return self.retriever.invoke(query)

    def search(self, query: str, k: int = 5):
        return self.retriever.invoke(query)

    def get_relevant_documents(self, query: str):
        return self.retriever.invoke(query)

    def get_relevant_documents_with_scores(self, query: str, k: int = 5):
        """
        Return documents with numeric similarity scores for API responses.

        Chroma exposes relevance scores as higher-is-better floats. Some vector
        stores expose raw distances instead, so the fallback converts distance
        into a bounded similarity score to keep the response contract stable.
        """
        if hasattr(self.vectordb, "similarity_search_with_relevance_scores"):
            results = self.vectordb.similarity_search_with_relevance_scores(query, k=k)
            return [
                (doc, self._normalize_score(score))
                for doc, score in results
            ]

        if hasattr(self.vectordb, "similarity_search_with_score"):
            results = self.vectordb.similarity_search_with_score(query, k=k)
            return [
                (doc, self._distance_to_similarity(distance))
                for doc, distance in results
            ]

        return [(doc, 0.0) for doc in self.get_relevant_documents(query)[:k]]

    def _normalize_score(self, score) -> float:
        try:
            value = float(score)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, value))

    def _distance_to_similarity(self, distance) -> float:
        try:
            value = float(distance)
        except (TypeError, ValueError):
            return 0.0
        return max(0.0, min(1.0, 1.0 - value))
