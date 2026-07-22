"""
LangChain-based RAG chain using modern LCEL (LangChain Expression Language).
Provides improved integration with LangChain components and better error handling.
"""

from typing import Any, List, Optional
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from utils.builders.rag_prompt import RAG_PROMPT

# ===========================
# Helpers methods
# ===========================


def _get_default_llm(provider: Optional[str] = None):
    from providers.llm.factory import get_llm_for_task
    from providers.llm.tasks import TaskType

    llm = get_llm_for_task(task=TaskType.RAG, provider=provider)
    return llm


def _doc_text(doc: Any) -> str:
    """Extract clean text from Chroma/LangChain Document, tuple, or legacy dict."""
    if isinstance(doc, tuple) and doc:
        return _doc_text(doc[0])
    if isinstance(doc, Document):
        return doc.page_content
    if isinstance(doc, dict):
        return str(doc.get("text") or doc.get("page_content") or doc)
    return str(getattr(doc, "page_content", doc))


def _format_docs(docs: List[Any]) -> str:
    """Join document/chunks texts for retrieval context."""
    if not docs:
        return "No relevant chunks found."
    formatted_docs = []
    for doc in docs:
        text = _doc_text(doc).strip()
        if not text:
            continue
        formatted_docs.append(text)
    return (
        "\n\n".join(formatted_docs)
        if formatted_docs
        else "No relevant documents or chunks found."
    )


format_docs = _format_docs


def _extract_query(x: Any) -> str:
    return x.get("input", x) if isinstance(x, dict) else str(x)


def _extract_history(x: Any) -> list:
    history = x.get("chat_history", []) if isinstance(x, dict) else []
    return history if isinstance(history, list) else []


def build_v1_rag_chain(
    retriever,
    prompt: Optional[PromptTemplate] = None,
    provider: Optional[str] = None,
):
    """
    Minimal RAG chain — query in, answer string out.

    Args:
        retriever : any LangChain-compatible retriever
        prompt    : optional override (defaults to RAG_PROMPT)
        provider  : optional provider override e.g. "openai", "anthropic"

    Returns:
        Runnable: accepts {"input": str, "chat_history": list} or plain str
    """
    llm = _get_default_llm(provider)
    prompt = prompt or RAG_PROMPT

    chain = (
        {
            # retriever.invoke() — not deprecated get_relevant_documents()
            "context": RunnableLambda(_extract_query)
            | retriever
            | RunnableLambda(_format_docs),
            "input": RunnableLambda(_extract_query),
            "chat_history": RunnableLambda(_extract_history),
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    return chain


def build_retrieval_qa_chain(
    retriever,
    prompt: Optional[PromptTemplate] = None,
    provider: Optional[str] = None,
    llm_instance: Optional[Any] = None,
):
    """
    Full RAG QA chain — returns both answer and source documents.
    Args:
        retriever : any LangChain-compatible retriever
        prompt    : optional override (defaults to RAG_PROMPT)
        provider  : optional provider override
        llm_instance: optional runnable LLM for testing or injection
    Returns:
        Runnable: accepts {"input": str, "chat_history": list}
        Output  : {"answer": str, "source_docs": List[Document], "original_docs": List}
    """
    llm = llm_instance or _get_default_llm(provider)
    prompt = prompt or RAG_PROMPT

    def _invoke_retriever(retriever_obj, query_text: str):
        if hasattr(retriever_obj, "invoke"):
            return retriever_obj.invoke(query_text)
        if hasattr(retriever_obj, "retrieve"):
            return retriever_obj.retrieve(query_text)
        if hasattr(retriever_obj, "get_relevant_documents_with_scores"):
            return retriever_obj.get_relevant_documents_with_scores(query_text)
        if hasattr(retriever_obj, "get_relevant_documents"):
            return retriever_obj.get_relevant_documents(query_text)
        if callable(retriever_obj):
            return retriever_obj(query_text)
        raise AttributeError(
            "Retriever must support invoke(), retrieve(), get_relevant_documents[_with_scores](), or call(query)"
        )

    def _retrieve(x: dict) -> dict:
        """Single retrieval call — result shared between answer + source branches."""
        query = _extract_query(x)
        history = _extract_history(x)

        docs = _invoke_retriever(retriever, query)

        return {
            "input": query,
            "chat_history": history,
            "context": _format_docs(docs),
            "source_docs": docs,
            "original_docs": docs,
        }

    # After _retrieve, the dict has all keys the prompt needs
    # plus source_docs for attribution
    answer_chain = prompt | llm

    chain = (
        RunnableLambda(_retrieve)
        | RunnablePassthrough.assign(answer=answer_chain)
        | RunnableLambda(
            lambda x: {
                "answer": x["answer"],
                "source_docs": x["source_docs"],
                "original_docs": x["original_docs"],
                "input": x.get("input"),
                "context": x.get("context"),
            }
        )
    )

    return chain
