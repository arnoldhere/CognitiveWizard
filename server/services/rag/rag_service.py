"""Singleton service/orchestrator for RAG ingestion, retrieval and response generation."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import numpy as np

from config.Faiss_index import faiss_service
from services.rag.generator import Generator
from services.rag.preprocess.embedder import Embedder
from services.rag.retriever import Retriever

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        self.embedder = Embedder()
        self.vector_store = faiss_service
        self.generator = Generator()
        self.retriever = Retriever(self.vector_store, self.embedder)

        # In-memory source map for citation snippets.
        self._chunk_store: List[Dict[str, Any]] = []
        self._documents_ingested = 0

    def preprocess(self, documents: List[str], metadata: Optional[Dict[str, Any]] = None):
        """
        Convert raw documents into chunks, embed them and store in vector DB.
        """
        if not documents:
            raise ValueError("No documents provided for ingestion.")

        chunks = self._chunk_docs(documents)
        if not chunks:
            raise ValueError("No usable text chunks found in document payload.")

        embeddings = self.embedder.embed_documents(chunks)
        embeddings = self._align_vector_dim(embeddings)
        chunk_ids = self.vector_store.add_vectors(embeddings, src="rag")

        title = (metadata or {}).get("filename", "Uploaded Document")
        for idx, chunk_text in zip(chunk_ids, chunks):
            self._chunk_store.append(
                {
                    "id": int(idx),
                    "title": title,
                    "snippet": chunk_text[:280],
                    "text": chunk_text,
                }
            )

        self._documents_ingested += len(documents)

        return {
            "status": "success",
            "documents_ingested": len(documents),
            "chunks": len(chunks),
            "ready_for_rag": self.has_knowledge_base(),
        }

    def retrieve(self, query: str, top_k: int = 5):
        """
        Retrieve top-k relevant chunk snippets for a query.
        """
        if not self.has_knowledge_base():
            return []

        query_embedding = self.embedder.embed_query(query)
        query_embedding = self._align_vector_dim(query_embedding)
        results = self.retriever.search(query_embedding, top_k)

        sources = []
        for item in results:
            chunk = self._find_chunk(item["vector_id"])
            if not chunk:
                continue
            sources.append(
                {
                    "id": chunk["id"],
                    "title": chunk["title"],
                    "snippet": chunk["snippet"],
                    "score": float(item["score"]),
                    "text": chunk["text"],
                }
            )
        return sources

    def generate(self, query: str, retrieved_docs: Optional[List[str]] = None):
        """
        Generate final answer using LLM with optional retrieved context.
        """
        return self.generator.generate_response(query, retrieved_docs)

    def query(self, query: str, use_rag: bool = True):
        """
        Query pipeline with automatic non-RAG fallback when KB is empty.
        """
        warning = None
        mode_used = "rag"
        sources = []

        should_use_rag = bool(use_rag) and self.has_knowledge_base()
        if use_rag and not should_use_rag:
            mode_used = "llm"
            warning = "No ingested documents were found. Answer generated without retrieval."
        elif not use_rag:
            mode_used = "llm"

        if should_use_rag:
            sources = self.retrieve(query)
            if not sources:
                mode_used = "llm"
                warning = (
                    "No relevant context was found in uploaded documents. "
                    "Answer generated without retrieval."
                )
                answer = self.generate(query, None)
            else:
                answer = self.generate(query, [source["text"] for source in sources])
        else:
            answer = self.generate(query, None)

        return {
            "answer": answer,
            "mode_used": mode_used,
            "sources": [
                {
                    "id": source["id"],
                    "title": source["title"],
                    "snippet": source["snippet"],
                    "score": source["score"],
                }
                for source in sources
            ],
            "warning": warning,
        }

    def status(self):
        recent_chunks = [item["snippet"] for item in self._chunk_store[-3:]]
        return {
            "ready_for_rag": self.has_knowledge_base(),
            "documents_ingested": self._documents_ingested,
            "chunks_ingested": self.vector_store.count("rag"),
            "recent_chunks": recent_chunks,
        }

    def has_knowledge_base(self):
        return self.vector_store.count("rag") > 0

    def _find_chunk(self, vector_id: int):
        for item in reversed(self._chunk_store):
            if item["id"] == vector_id:
                return item
        return None

    def _align_vector_dim(self, vectors):
        """
        Ensure embedding dims match FAISS index dims.
        Truncates or zero-pads if mismatch is detected.
        """
        target_dim = int(self.vector_store.dim)
        arr = np.array(vectors, dtype="float32")
        if arr.ndim == 1:
            arr = np.expand_dims(arr, axis=0)

        current_dim = arr.shape[1]
        if current_dim == target_dim:
            return arr if np.array(vectors).ndim > 1 else arr[0]

        logger.warning(
            "Embedding dimension mismatch detected (embedder=%s, faiss=%s). "
            "Applying runtime alignment.",
            current_dim,
            target_dim,
        )

        if current_dim > target_dim:
            arr = arr[:, :target_dim]
        else:
            pad = np.zeros((arr.shape[0], target_dim - current_dim), dtype="float32")
            arr = np.concatenate([arr, pad], axis=1)

        return arr if np.array(vectors).ndim > 1 else arr[0]

    def _chunk_docs(self, documents: List[str], chunk_size: int = 500, overlap: int = 80):
        """
        Split each document into fixed-size text chunks with overlap.
        """
        chunks = []
        stride = max(chunk_size - overlap, 1)
        for doc in documents:
            text = doc if isinstance(doc, str) else doc.get("text", "")
            text = (text or "").strip()
            if not text:
                continue

            for i in range(0, len(text), stride):
                chunk = text[i : i + chunk_size].strip()
                if chunk:
                    chunks.append(chunk)
        return chunks


rag_service = RAGService()
