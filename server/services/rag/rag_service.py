"""Singleton Class Service/Orchestrator for RAG operations includes preprocessing, retrieval and generation"""

from services.rag.preprocess.embedder import Embedder
from config.Faiss_index import faiss_service
from services.rag.generator import Generator
from services.rag.retriever import Retriever


class RAGService:
    def __init__(self):
        # Initialize any necessary resources or configurations
        self.embedder = Embedder()
        self.vector_store = faiss_service
        self.generator = Generator()
        self.retriever = Retriever(self.vector_store, self.embedder)

    def preprocess(self, documents, metadata=None):
        """
        Convert raw documents into embeddings and store in vector DB
        """
        # chunking
        chunks = self._chunk_docs(documents)
        # embeddings
        embeddings = self.embedder.embed_document(chunks)
        # store in vector db
        self.vector_store.add_vector(embeddings, src="rag")
        return {"status": "success", "chunks": len(chunks)}

    def retrieve(self, query, top_k=5):
        """
        Retrieve relevant chunks for query
        """
        query_embedding = self.embedder.embed_query(query)
        res = self.retriever.search(query_embedding, top_k)
        return res

    def generate(self, query, retrieved_docs=None):
        """
        Generate final answer using LLM
        """
        res = self.generator.generate_response(query, retrieved_docs)
        return res

    # ==================
    # RAG Query Pipeline
    # ==================
    def query(self, query, use_rag=True):
        if use_rag:
            retrieved_docs = self.retrieve(query)
            return self.generate(query, retrieved_docs)
        else:
            return self.generate(query, None)

    # helper methods
    def _chunk_docs(self, documents, chunk_size=500, overlap=50):
        """
        Simple chunking (for now) where we split documents into fixed-size chunks with some overlap.
        """
        chunks = []
        for doc in documents:
            text = doc if isinstance(doc, str) else doc["text"]

            for i in range(0, len(text), chunk_size - overlap):
                chunk = text[i : i + chunk_size]
                chunks.append(chunk)
        return chunks


rag_service = RAGService()
