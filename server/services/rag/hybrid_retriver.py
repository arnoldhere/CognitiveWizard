from langchain_community.vectorstores import FAISS


class HybridRetriever:
    """
    Hybrid Retriever
    WHY:
    - Better than pure similarity search
    - Can be extended with BM25 later
    """

    def __init__(self, vectordb):
        self.retriever = vectordb.as_retriever(
            search_type="mmr", search_kwargs={"k": 5}
        )

    def retrieve(self, query: str):
        return self.retrieve.get_relavant_documents(query)
