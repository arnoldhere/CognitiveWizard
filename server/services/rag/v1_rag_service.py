"""
LangChain-based RAG Service - Orchestrator for RAG ingestion, retrieval and response generation.
Uses modern LangChain LCEL for improved chain composition and LLM integration.

This service provides the same interface as v0_rag_service but uses LangChain internally.
"""

from __future__ import annotations
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from config.settings import settings
from services.rag.chains.v1_rag_chain import build_retrieval_qa_chain
from utils.preprocess.embedder import EmbeddingFactory
from config.vector_store.vectordb import VectorDBFactory
from services.rag.hybrid_retriver import HybridRetriever
from utils.trim_context import trim_context_to_budget

logger = logging.getLogger(__name__)

TOP_K_RES = settings.TOP_K_RESULTS_RAG


class LangChainRAGService:
    """
    LangChain-powered RAG Service - Main orchestrator for RAG operations.
    Provides the same interface as v0_rag_service for compatibility.
    """

    def __init__(self):
        self.embedder = EmbeddingFactory.get_embeddings()
        self._vectordbs: Dict[str, Any] = {}
        self._retrievers: Dict[str, Any] = {}
        self._rag_chains: Dict[str, Any] = {}

        self._chunk_store: Dict[str, List[Dict[str, Any]]] = {}
        self._documents_ingested: Dict[str, int] = {}
        self._user_documents: Dict[str, List[str]] = {}

    def _get_user_index_path(self, user_id: str) -> Path:
        index_path = Path(settings.RAG_USER_INDEX_DIR) / str(user_id)
        index_path.mkdir(parents=True, exist_ok=True)
        return index_path

    def _ensure_user_vectordb_loaded(self, user_id: str):
        """Ensure a per-user FAISS vector store is available."""
        if user_id in self._vectordbs:
            return

        index_path = self._get_user_index_path(user_id)
        index_file = index_path / "index.faiss"

        if index_file.exists():
            logger.info(f"Loading existing FAISS index for user {user_id}")
            self._vectordbs[user_id] = VectorDBFactory.load_embeddings(
                str(index_path), self.embedder
            )
        else:
            logger.warning(
                f"FAISS index not found for user {user_id}. Creating new empty per-user index."
            )
            self._vectordbs[user_id] = FAISS.from_documents([], self.embedder)
            self._vectordbs[user_id].save_local(str(index_path))
            logger.info(f"Created new empty FAISS index at {index_path}")

        self._retrievers[user_id] = HybridRetriever(self._vectordbs[user_id])
        self._rag_chains[user_id] = build_retrieval_qa_chain(
            self._retrievers[user_id], prompt=None
        )

    def _get_user_vectordb(self, user_id: str):
        if not user_id:
            raise ValueError("user_id is required for LangChain RAG vector access.")
        self._ensure_user_loaded(user_id)
        self._ensure_user_vectordb_loaded(user_id)
        return self._vectordbs[user_id]

    def _get_user_retriever(self, user_id: str):
        self._ensure_user_vectordb_loaded(user_id)
        return self._retrievers[user_id]

    def _get_user_chain(self, user_id: str):
        self._ensure_user_vectordb_loaded(user_id)
        return self._rag_chains[user_id]

    def preprocess(
        self,
        documents: List[str],
        metadata: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
    ):
        """Preprocess and ingest documents into the knowledge base."""
        if not user_id:
            raise ValueError("user_id is required for document ingestion.")
        if not documents:
            raise ValueError("No documents provided for ingestion.")

        self._ensure_user_loaded(user_id)

        chunks = self._chunk_docs(documents)
        if not chunks:
            raise ValueError("No usable text chunks found in document payload.")

        title = (metadata or {}).get("filename", "Uploaded Document")
        docs = [
            Document(page_content=chunk, metadata={"user_id": user_id, "title": title})
            for chunk in chunks
        ]

        user_vectordb = self._get_user_vectordb(user_id)
        user_vectordb.add_documents(docs)
        user_vectordb.save_local(str(self._get_user_index_path(user_id)))

        for chunk_text in chunks:
            self._chunk_store[user_id].append(
                {
                    "id": len(self._chunk_store[user_id]) + 1,
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
        """Retrieve relevant documents from the knowledge base."""
        self._ensure_user_loaded(user_id)

        if not self.has_knowledge_base(user_id):
            return []

        user_vectordb = self._get_user_vectordb(user_id)
        docs = user_vectordb.similarity_search(
            query, k=top_k, filter={"user_id": user_id}
        )

        sources = []
        for i, doc in enumerate(docs):
            sources.append(
                {
                    "id": i,
                    "title": doc.metadata.get("title"),
                    "snippet": doc.page_content[:280],
                    "text": doc.page_content,
                    "score": None,
                }
            )

        return sources

    def query(self, query: str, use_rag: bool = True, user_id: Optional[str] = None):
        """
        Process a query using LangChain RAG chain.
        Returns answer, mode_used, sources, and metadata.
        """
        self._ensure_user_loaded(user_id)
        chain = self._get_user_chain(user_id)

        warning = None
        mode_used = "rag"
        sources = []
        answer = ""
        token_usage = None

        # Determine if we should use RAG
        should_use_rag = bool(use_rag) and self.has_knowledge_base(user_id)

        if use_rag and not should_use_rag:
            mode_used = "llm"
            warning = (
                "No ingested documents were found. Answer generated without retrieval."
            )
        elif not use_rag:
            mode_used = "llm"

        try:
            if should_use_rag:
                # Retrieve documents first
                sources = self.retrieve(query, user_id=user_id)

                if not sources:
                    mode_used = "llm"
                    warning = (
                        "No relevant context was found in your uploaded documents. "
                        "Answer generated without retrieval."
                    )
                    answer = self._generate_without_context(query)
                else:
                    # Use LangChain RAG chain with context
                    try:
                        # TODO: for better context management do implement:rank->trim/summarize->final context
                        chain_result = chain.invoke(
                            {
                                "input": query,
                                "context": trim_context_to_budget(
                                    sources=sources, max_tokens=3000
                                ),
                            },
                            config={"configurable": {"session_id": user_id}},
                        )
                        if isinstance(chain_result, dict):
                            answer = chain_result.get("answer", str(chain_result))
                        else:
                            answer = str(chain_result)
                    except Exception as e:
                        logger.warning(
                            f"LangChain RAG chain failed: {e}. Falling back to basic generation."
                        )
                        answer = self._generate_without_context(query)
            else:
                # LLM only mode
                answer = self._generate_without_context(query)

        except Exception as e:
            logger.exception(f"Error in query processing: {e}")
            answer = f"Error processing query: {str(e)}"
            mode_used = "error"

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
        """Get the status of the user's knowledge base."""
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

    def has_knowledge_base(self, user_id: Optional[str] = None) -> bool:
        """Check if the user has any ingested documents."""
        self._ensure_user_loaded(user_id)
        if not user_id:
            return False
        return len(self._chunk_store.get(user_id, [])) > 0

    # =====================
    # Private Helper Methods
    # =====================

    def _generate_without_context(self, query: str) -> str:
        """Generate an answer without retrieval context."""
        from providers.llm_provider import llm

        prompt = f"Answer the following question helpfully: {query}"
        try:
            response = llm.invoke([{"role": "user", "content": prompt}])
            return getattr(response, "content", str(response))
        except Exception as e:
            logger.exception(f"Error generating response: {e}")
            return f"Unable to generate response: {str(e)}"

    def _chunk_docs(
        self, documents: List[str], chunk_size: int = 512, overlap: int = 100
    ) -> List[str]:
        """Split documents into chunks."""
        chunks = []
        for doc in documents:
            if not doc or not doc.strip():
                continue

            # Simple chunking strategy
            words = doc.split()
            current_chunk = []

            for word in words:
                current_chunk.append(word)
                if len(" ".join(current_chunk)) >= chunk_size:
                    chunks.append(" ".join(current_chunk))
                    # Keep last few words for overlap
                    current_chunk = current_chunk[-overlap // 10 :]

            if current_chunk:
                chunks.append(" ".join(current_chunk))

        return chunks

    def _align_vector_dim(self, embeddings: np.ndarray) -> np.ndarray:
        """Ensure embeddings have the correct dimension."""
        expected_dim = settings.EMBEDDING_DIM

        if isinstance(embeddings, list):
            if not embeddings:
                return np.array([]).reshape(0, expected_dim)
            embeddings = np.array(embeddings)

        if embeddings.ndim == 1:
            embeddings = embeddings.reshape(1, -1)

        if embeddings.shape[1] < expected_dim:
            padding = np.zeros(
                (embeddings.shape[0], expected_dim - embeddings.shape[1])
            )
            embeddings = np.hstack([embeddings, padding])
        elif embeddings.shape[1] > expected_dim:
            embeddings = embeddings[:, :expected_dim]

        return embeddings

    def _user_metadata_path(self, user_id: str) -> str:
        """Get the path for user metadata."""
        os.makedirs(settings.RAG_USER_DATA_DIR, exist_ok=True)
        return os.path.join(settings.RAG_USER_DATA_DIR, f"{user_id}.json")

    def _ensure_user_loaded(self, user_id: Optional[str]) -> None:
        """Ensure user data is loaded into memory."""
        if not user_id or user_id in self._chunk_store:
            return

        self._chunk_store[user_id] = []
        self._documents_ingested[user_id] = 0
        self._user_documents[user_id] = []

        # Try to load from disk
        self._load_user_state(user_id)

    def _persist_user_state(self, user_id: str) -> None:
        """Save user state to disk."""
        state = {
            "chunks": self._chunk_store.get(user_id, []),
            "uploaded_documents": self._user_documents.get(user_id, []),
            "documents_ingested": self._documents_ingested.get(user_id, 0),
            "chunk_store": self._chunk_store.get(user_id, []),
            "user_documents": self._user_documents.get(user_id, []),
        }

        try:
            path = self._user_metadata_path(user_id)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist user state: {e}")

    def _load_user_state(self, user_id: str) -> None:
        """Load user state from disk."""
        path = self._user_metadata_path(user_id)

        if not os.path.exists(path):
            return

        try:
            with open(path, "r", encoding="utf-8") as f:
                state = json.load(f)

            self._chunk_store[user_id] = state.get(
                "chunk_store", state.get("chunks", [])
            )
            self._documents_ingested[user_id] = state.get("documents_ingested", 0)
            self._user_documents[user_id] = state.get(
                "user_documents", state.get("uploaded_documents", [])
            )
        except Exception as e:
            logger.warning(f"Failed to load user state: {e}")


# Create singleton instance
langchain_rag_service = LangChainRAGService()
