"""
LangChain-based RAG Service - Orchestrator for RAG ingestion, retrieval and response generation.
Uses modern LangChain LCEL for improved chain composition and LLM integration.

This service provides the same interface as v0_rag_service but uses LangChain internally.
"""

from __future__ import annotations
import faiss
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from langchain_core.runnables.history import RunnableWithMessageHistory
from config.Faiss_index import faiss_service
from config.settings import settings
from services.rag.chains.v1_rag_chain import build_retrieval_qa_chain
from utils.preprocess.embedder import EmbeddingFactory
from config.vector_store.vectordb import VectorDBFactory
from services.rag.hybrid_retriver import HybridRetriever
from services.rag.memory.chat_memory import get_memory
from langchain_community.docstore.in_memory import InMemoryDocstore

logger = logging.getLogger(__name__)

TOP_K_RES = settings.TOP_K_RESULTS_RAG


class LangChainRAGService:
    """
    LangChain-powered RAG Service - Main orchestrator for RAG operations.
    Provides the same interface as v0_rag_service for compatibility.
    """

    def __init__(self):
        self.embedder = EmbeddingFactory.get_embeddings()
        self.vector_store = faiss_service
        self._vectordb = None  # Lazy load
        self._retriever = None  # Lazy load
        self._rag_chain = None  # Lazy load

        self._chunk_store: Dict[str, List[Dict[str, Any]]] = {}
        self._documents_ingested: Dict[str, int] = {}
        self._user_documents: Dict[str, List[str]] = {}

    def _ensure_vectordb_loaded(self):
        """Lazy load vector database - creates empty index if not found."""
        if self._vectordb is not None:
            return

        try:
            index_path = Path(settings.RAG_FAISS_INDEX_PATH)
            index_file = index_path / "index.faiss"

            if index_file.exists():
                logger.info(
                    f"Loading existing FAISS index from {settings.RAG_FAISS_INDEX_PATH}"
                )
                self._vectordb = VectorDBFactory.load_embeddings(
                    settings.RAG_FAISS_INDEX_PATH, self.embedder
                )
            else:
                logger.warning(
                    f"FAISS index not found at {settings.RAG_FAISS_INDEX_PATH}. "
                    "Creating new empty index."
                )
                # Create directory if it doesn't exist
                index_path.mkdir(parents=True, exist_ok=True)
                # Create empty FAISS index from empty documents list
                from langchain_community.vectorstores import FAISS

                dim = settings.EMBEDDING_DIM
                index = faiss.IndexFlatL2(dim)

                self._vectordb = FAISS(
                    embedding_function=self.embedder,
                    index=index,
                    docstore=InMemoryDocstore(),
                    index_to_docstore_id={},
                )

                # Save the empty index
                self._vectordb.save_local(settings.RAG_FAISS_INDEX_PATH)
                logger.info(
                    f"Created new empty FAISS index at {settings.RAG_FAISS_INDEX_PATH}"
                )

            # Initialize retriever and chain after vectordb is loaded
            self._retriever = HybridRetriever(self._vectordb)
            self._rag_chain = build_retrieval_qa_chain(self._retriever, prompt=None)
        except Exception as e:
            logger.error(f"Failed to initialize vector database: {e}")
            raise

    @property
    def vectordb(self):
        """Property to ensure vectordb is loaded before access."""
        self._ensure_vectordb_loaded()
        return self._vectordb

    @property
    def retriever(self):
        """Property to ensure retriever is loaded before access."""
        self._ensure_vectordb_loaded()
        return self._retriever

    @property
    def rag_chain(self):
        """Property to ensure rag_chain is loaded before access."""
        self._ensure_vectordb_loaded()
        return self._rag_chain

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
        """Retrieve relevant documents from the knowledge base."""
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

    def query(self, query: str, use_rag: bool = True, user_id: Optional[str] = None):
        """
        Process a query using LangChain RAG chain.
        Returns answer, mode_used, sources, and metadata.
        """
        self._ensure_user_loaded(user_id)
        chain = self._get_chain_with_memory()

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
                        answer = chain.invoke(
                            {
                                "query": query,
                                "context": "\n\n".join([s["text"] for s in sources]),
                            },
                            config={"configurable": {"session_id": user_id}},
                        )
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
            response = llm.invoke([{"role":"user", "content":prompt}])
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

    def _find_chunk(self, chunk_id: int, user_id: str) -> Optional[Dict[str, Any]]:
        """Find a chunk by its ID."""
        if user_id not in self._chunk_store:
            return None

        for chunk in self._chunk_store[user_id]:
            if chunk["id"] == chunk_id:
                return chunk

        return None

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
            "chunk_store": self._chunk_store.get(user_id, []),
            "documents_ingested": self._documents_ingested.get(user_id, 0),
            "user_documents": self._user_documents.get(user_id, []),
        }

        try:
            path = self._user_metadata_path(user_id)
            with open(path, "w") as f:
                json.dump(state, f, indent=2)
        except Exception as e:
            logger.warning(f"Failed to persist user state: {e}")

    def _load_user_state(self, user_id: str) -> None:
        """Load user state from disk."""
        path = self._user_metadata_path(user_id)

        if not os.path.exists(path):
            return

        try:
            with open(path, "r") as f:
                state = json.load(f)

            self._chunk_store[user_id] = state.get("chunk_store", [])
            self._documents_ingested[user_id] = state.get("documents_ingested", 0)
            self._user_documents[user_id] = state.get("user_documents", [])
        except Exception as e:
            logger.warning(f"Failed to load user state: {e}")

    def _get_chain_with_memory(self):
        return RunnableWithMessageHistory(
            self.rag_chain,
            get_memory,
            input_messages_key="query",  #
            history_messages_key="chat_history",
        )


# Create singleton instance
langchain_rag_service = LangChainRAGService()
