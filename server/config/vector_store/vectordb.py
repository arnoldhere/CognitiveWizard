import logging

from langchain_chroma import Chroma

from config.settings import settings

logger = logging.getLogger(__name__)


class VectorDBFactory:
    """
    Factory for LangChain-compatible Chroma vector stores.

    Chroma persists each user's RAG documents on disk and exposes LangChain's
    retriever interface, so chains and services can stay backend-agnostic.
    """

    @staticmethod
    def create(collection_name: str, embeddings, persist_directory: str):
        return Chroma(
            collection_name=collection_name,
            embedding_function=embeddings,
            persist_directory=persist_directory,
            collection_metadata={"hnsw:space": "cosine"},
        )

    @staticmethod
    def create_from_doc(docs, embeddings, collection_name=None, persist_directory=None):
        collection = collection_name or settings.RAG_CHROMA_COLLECTION_PREFIX
        directory = persist_directory or settings.RAG_USER_VECTOR_DIR
        vectordb = VectorDBFactory.create(collection, embeddings, directory)
        if docs:
            vectordb.add_documents(docs)
        return vectordb

    @staticmethod
    def load_embeddings(path: str, embeddings, collection_name: str):
        try:
            return VectorDBFactory.create(collection_name, embeddings, path)
        except Exception as exc:
            logger.exception(
                "Failed to load Chroma collection %s from %s", collection_name, path
            )
            raise RuntimeError("Unable to load Chroma vector store.") from exc
