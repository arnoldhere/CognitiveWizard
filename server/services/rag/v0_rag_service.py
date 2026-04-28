"""Singleton service/orchestrator for RAG ingestion, retrieval and response generation."""

from __future__ import annotations
import json
import logging
import os
from typing import Any, Dict, List, Optional
import numpy as np
from config.Faiss_index import faiss_service
from config.settings import settings
from services.rag.generator import Generator
from services.rag.preprocess.embedder import Embedder
from services.rag.retriever import Retriever

logger = logging.getLogger(__name__)

TOP_K_RES = settings.TOP_K_RESULTS_RAG


class RAGService:
    def __init__(self):
        self.embedder = Embedder()
        self.vector_store = faiss_service
        self.generator = Generator()
        self.retriever = Retriever(self.vector_store, self.embedder)

        self._chunk_store: Dict[str, List[Dict[str, Any]]] = {}
        self._documents_ingested: Dict[str, int] = {}
        self._user_documents: Dict[str, List[str]] = {}

    def preprocess(
        self,
        documents: List[str],
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ):
        if not user_id:
            raise ValueError("user_id is required for document ingestion.")
        if not documents:
            raise ValueError("No documents provided for ingestion.")

        self._ensure_user_loaded(user_id)

        chunks = self._chunk_docs(documents)
        if not chunks:
            raise ValueError("No usable text chunks found in document payload.")

        embeddings = self.embedder.embed_documents(chunks)
        embeddings = self._align_vector_dim(embeddings)
        chunk_ids = self.vector_store.add_vectors(
            embeddings, src="rag", user_id=user_id
        )

        title = (metadata or {}).get("filename", "Uploaded Document")

        for idx, chunk_text in zip(chunk_ids, chunks):
            self._chunk_store[user_id].append(
                {
                    "id": int(idx),
                    "title": title,
                    "snippet": chunk_text[:280],
                    "text": chunk_text,
                }
            )

        if title not in self._user_documents[user_id]:
            self._user_documents[user_id].append(title)

        self._documents_ingested[user_id] += len(documents)
        self._persist_user_state(user_id)

        return {
            "status": "success",
            "documents_ingested": len(documents),
            "chunks": len(chunks),
            "ready_for_rag": self.has_knowledge_base(user_id),
            "uploaded_documents": self._user_documents[user_id],
        }

    def retrieve(
        self, query: str, top_k: int = TOP_K_RES, user_id: Optional[str] = None
    ):
        self._ensure_user_loaded(user_id)
        if not self.has_knowledge_base(user_id):
            return []

        query_embedding = self.embedder.embed_query(query)
        query_embedding = self._align_vector_dim(query_embedding)
        results = self.retriever.search(query_embedding, top_k, user_id=user_id)

        sources = []
        for item in results:
            chunk = self._find_chunk(item["vector_id"], user_id)
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
        result = self.generator.generate_response(query, retrieved_docs)
        # print(
        #     f"Query: {query}\nRetrieved Docs: {retrieved_docs}\nGenerated Result: {result}"
        # )
        if isinstance(result, tuple):
            answer, token_usage = result
            return answer, token_usage
        return result, None

    def query(self, query: str, use_rag: bool = True, user_id: Optional[str] = None):
        self._ensure_user_loaded(user_id)

        warning = None
        mode_used = "rag"
        sources = []

        should_use_rag = bool(use_rag) and self.has_knowledge_base(user_id)
        if use_rag and not should_use_rag:
            mode_used = "llm"
            warning = (
                "No ingested documents were found. Answer generated without retrieval."
            )
        elif not use_rag:
            mode_used = "llm"

        if should_use_rag:
            sources = self.retrieve(query, user_id=user_id)
            if not sources:
                mode_used = "llm"
                warning = (
                    "No relevant context was found in your uploaded documents. "
                    "Answer generated without retrieval."
                )
                answer, token_usage = self.generate(query, None)
            else:
                answer, token_usage = self.generate(
                    query, [source["text"] for source in sources]
                )
        else:
            answer, token_usage = self.generate(query, None)

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
            "token_usage": token_usage,
        }

    def status(self, user_id: Optional[str] = None):
        self._ensure_user_loaded(user_id)

        if not user_id or user_id not in self._chunk_store:
            recent_chunks = []
            docs_ingested = 0
            uploaded_documents = []
        else:
            recent_chunks = [
                item["snippet"] for item in self._chunk_store[user_id][-3:]
            ]
            docs_ingested = self._documents_ingested.get(user_id, 0)
            uploaded_documents = self._user_documents.get(user_id, [])

        return {
            "ready_for_rag": self.has_knowledge_base(user_id),
            "documents_ingested": docs_ingested,
            "chunks_ingested": len(self._chunk_store.get(user_id, [])),
            "recent_chunks": recent_chunks,
            "uploaded_documents": uploaded_documents,
        }

    def has_knowledge_base(self, user_id: Optional[str] = None):
        self._ensure_user_loaded(user_id)
        if not user_id:
            return False
        return len(self._chunk_store.get(user_id, [])) > 0

    def _user_metadata_path(self, user_id: str) -> str:
        os.makedirs(settings.RAG_USER_DATA_DIR, exist_ok=True)
        return os.path.join(settings.RAG_USER_DATA_DIR, f"{user_id}.json")

    def _ensure_user_loaded(self, user_id: Optional[str]) -> None:
        if not user_id or user_id in self._chunk_store:
            return

        metadata_path = self._user_metadata_path(user_id)
        self._chunk_store[user_id] = []
        self._documents_ingested[user_id] = 0
        self._user_documents[user_id] = []

        if not os.path.exists(metadata_path):
            return

        try:
            with open(metadata_path, "r", encoding="utf-8") as handle:
                payload = json.load(handle)
        except (OSError, json.JSONDecodeError):
            logger.warning("Failed to load RAG metadata for user %s", user_id)
            return

        self._chunk_store[user_id] = payload.get("chunks", [])
        self._documents_ingested[user_id] = int(payload.get("documents_ingested", 0))
        self._user_documents[user_id] = payload.get("uploaded_documents", [])

    def _persist_user_state(self, user_id: str) -> None:
        payload = {
            "documents_ingested": self._documents_ingested.get(user_id, 0),
            "uploaded_documents": self._user_documents.get(user_id, []),
            "chunks": self._chunk_store.get(user_id, []),
        }
        metadata_path = self._user_metadata_path(user_id)
        with open(metadata_path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)

    def _find_chunk(self, vector_id: int, user_id: Optional[str] = None):
        if not user_id or user_id not in self._chunk_store:
            return None
        for item in reversed(self._chunk_store[user_id]):
            if item["id"] == vector_id:
                return item
        return None

    def _align_vector_dim(self, vectors):
        target_dim = int(self.vector_store.dim)
        arr = np.array(vectors, dtype="float32")
        if arr.ndim == 1:
            arr = np.expand_dims(arr, axis=0)

        current_dim = arr.shape[1]
        if current_dim == target_dim:
            return arr if np.array(vectors).ndim > 1 else arr[0]

        logger.warning(
            "Embedding dimension mismatch detected (embedder=%s, faiss=%s). Applying runtime alignment.",
            current_dim,
            target_dim,
        )

        if current_dim > target_dim:
            arr = arr[:, :target_dim]
        else:
            pad = np.zeros((arr.shape[0], target_dim - current_dim), dtype="float32")
            arr = np.concatenate([arr, pad], axis=1)

        return arr if np.array(vectors).ndim > 1 else arr[0]

    def _chunk_docs(
        self, documents: List[str], chunk_size: int = 500, overlap: int = 80
    ):
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
