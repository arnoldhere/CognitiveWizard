"""
chatbot_patch.py
────────────────
Drop-in wrapper for your existing RAG chatbot pipeline.
Instruments retrieval + generation latency and logs QA pairs to DB
so the admin evaluation endpoint always has fresh data to evaluate.

Usage — in existing chatbot service / chain:

    from app.services.chatbot_patch import InstrumentedRAGChain
    chain = InstrumentedRAGChain(your_existing_chain, db_session)
    answer = await chain.ainvoke(question)
"""

import time
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from models.rag_log import RAGQueryLog

logger = logging.getLogger(__name__)


class InstrumentedRAGChain:
    """
    Wraps your LangChain RAG chain, captures timing at each stage,
    and persists query logs for batch evaluation.
    """

    def __init__(self, chain: Any, db: AsyncSession):
        self._chain = chain
        self._db = db

    async def ainvoke(self, question: str) -> dict:
        """
        Returns:
            {
              "answer":       str,
              "contexts":     list[str],
              "retrieval_ms": float,
              "generation_ms":float,
              "total_ms":     float,
            }
        """
        t0 = time.perf_counter()

        # ── retrieval stage ──────────────────────────────────────────────────
        t_ret_start = time.perf_counter()
        docs = await self._chain.retriever.aget_relevant_documents(question)
        retrieval_ms = round((time.perf_counter() - t_ret_start) * 1000, 2)
        contexts = [doc.page_content for doc in docs]

        # ── generation stage ─────────────────────────────────────────────────
        t_gen_start = time.perf_counter()
        # Pass retrieved context + question to the generation LLM
        answer = await self._chain.combine_docs_chain.acombine_docs(
            docs, question=question
        )
        generation_ms = round((time.perf_counter() - t_gen_start) * 1000, 2)
        total_ms = round((time.perf_counter() - t0) * 1000, 2)

        result = {
            "answer": answer,
            "contexts": contexts,
            "retrieval_ms": retrieval_ms,
            "generation_ms": generation_ms,
            "total_ms": total_ms,
        }

        # ── persist for evaluation ───────────────────────────────────────────
        await self._log_query(question, result)
        return result

    async def _log_query(self, question: str, result: dict) -> None:
        """Persist query + answer + contexts for admin evaluation sampling."""
        try:
            log = RAGQueryLog(
                question=question,
                answer=result["answer"],
                contexts=result["contexts"],  # stored as JSON
                retrieval_ms=result["retrieval_ms"],
                generation_ms=result["generation_ms"],
                total_ms=result["total_ms"],
            )
            self._db.add(log)
            await self._db.commit()
        except Exception as exc:
            logger.warning("Failed to log RAG query: %s", exc)
