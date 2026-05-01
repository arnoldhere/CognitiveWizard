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
from sqlalchemy.orm import Session
from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from config.settings import settings
from models.rag_document import RAGDocument
from services.rag.chains.v1_rag_chain import build_retrieval_qa_chain
from services.rag.hybrid_retriver import HybridRetriever
from services.rag.memory.chat_memory import get_memory
from config.vector_store.vectordb import VectorDBFactory
from utils.preprocess.embedder import EmbeddingFactory

logger = logging.getLogger(__name__)

TOP_K_RES = settings.TOP_K_RESULTS_RAG
RAG_INDEX_FILENAME = "index.faiss"


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
        if user_id not in self._vectordbs:
            self._vectordbs[user_id] = None  # Don't initialize yet
        index_path = self._get_user_index_path(user_id)
        index_file = index_path / RAG_INDEX_FILENAME

        if index_file.exists():
            logger.info(f"Loading existing FAISS index for user {user_id}")
            try:
                self._vectordbs[user_id] = VectorDBFactory.load_embeddings(
                    str(index_path), self.embedder
                )
            except Exception as exc:
                logger.warning(
                    f"Failed to load FAISS index for user {user_id}: {exc}. "
                    "Reinitializing empty user index."
                )
                self._vectordbs[user_id] = FAISS.from_documents([], self.embedder)
                self._vectordbs[user_id].save_local(str(index_path))
        else:
            logger.info(
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
        db: Optional[Session] = None,
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
        if self._vectordbs[user_id] is None:
            self._vectordbs[user_id] = FAISS.from_documents(docs, self.embedder)
        else:
            self._vectordbs[user_id].add_documents(docs)
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
        self._persist_uploaded_document_metadata(user_id, title, chunks, metadata, db)

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
        docs = user_vectordb.similarity_search(query, k=top_k)

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

    def query(
        self,
        query: str,
        use_rag: bool = True,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ):
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
                try:
                    memory = None
                    if session_id or user_id:
                        memory = get_memory(session_id or user_id)

                    chain_input = {"input": query}
                    if memory is not None:
                        chain_input["chat_history"] = memory

                    chain_result = chain.invoke(chain_input)
                    if isinstance(chain_result, dict):
                        answer = chain_result.get("answer", str(chain_result))
                        original_docs = chain_result.get("original_docs", [])
                    else:
                        answer = str(chain_result)
                        original_docs = []

                    sources = [
                        {
                            "id": idx,
                            "title": (
                                doc.metadata.get("title")
                                if hasattr(doc, "metadata")
                                else None
                            ),
                            "snippet": getattr(doc, "page_content", str(doc))[:280],
                            "text": getattr(doc, "page_content", str(doc)),
                            "score": None,
                        }
                        for idx, doc in enumerate(original_docs)
                    ]

                    if not sources:
                        mode_used = "llm"
                        warning = (
                            "No relevant context was found in your uploaded documents. "
                            "Answer generated without retrieval."
                        )
                        answer = self._generate_without_context(query)
                except Exception as e:
                    logger.warning(
                        f"LangChain RAG chain failed: {e}. Falling back to basic generation."
                    )
                    mode_used = "llm"
                    warning = "Unable to execute retrieval chain. Answer generated without retrieval."
                    answer = self._generate_without_context(query)
            else:
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

        chunked = len(self._chunk_store.get(user_id, [])) > 0
        vector_count = self._get_vectordb_count(user_id)
        return chunked or vector_count > 0

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

    def _get_vectordb_count(self, user_id: str) -> int:
        try:
            self._ensure_user_vectordb_loaded(user_id)
            vectordb = self._vectordbs.get(user_id)
            if vectordb is not None and hasattr(vectordb, "index"):
                index = getattr(vectordb, "index")
                if hasattr(index, "ntotal"):
                    return int(index.ntotal)
            return 0
        except Exception:
            return 0

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

    def _persist_uploaded_document_metadata(
        self,
        user_id: str,
        title: str,
        chunks: List[str],
        metadata: Optional[Dict[str, Any]],
        db: Optional[Session],
    ) -> None:
        """Save document metadata to the relational database for auditing and reference."""
        if db is None:
            return

        try:
            for idx, chunk_text in enumerate(chunks, start=1):
                rag_doc = RAGDocument(
                    user_id=int(user_id),
                    document_name=title,
                    chunk_index=idx,
                    snippet=chunk_text[:280],
                    metadata_json=json.dumps(metadata or {}),
                )
                db.add(rag_doc)
            db.commit()
        except Exception as exc:
            logger.warning(f"Failed to persist RAG metadata for user {user_id}: {exc}.")
            try:
                db.rollback()
            except Exception:
                pass

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
