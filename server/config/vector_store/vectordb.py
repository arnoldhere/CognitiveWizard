from langchain_community.vectorstores import FAISS


class VectorDBFactory:
    """
    Abstraction over vector DB

    WHY:
    - Switch FAISS → Pinecone without changing business logic
    """

    @staticmethod
    def create_from_doc(docs, embeddings):
        return FAISS.from_documents(docs, embeddings)

    @staticmethod
    def load_embeddings(path: str, embeddings):
        return FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
