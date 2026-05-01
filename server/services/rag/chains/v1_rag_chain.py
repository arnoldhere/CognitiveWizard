"""
LangChain-based RAG chain using modern LCEL (LangChain Expression Language).
Provides improved integration with LangChain components and better error handling.
"""

from typing import Any, List, Optional
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from utils.prompt_builder.prompts.rag_prompt import RAG_PROMPT


def _get_default_llm():
    from providers.llm_provider import llm

    return llm


def _doc_text(doc: Any) -> str:
    """Extract clean text from Chroma/LangChain documents and legacy dict rows."""
    if isinstance(doc, tuple) and doc:
        return _doc_text(doc[0])
    if isinstance(doc, Document):
        return doc.page_content
    if isinstance(doc, dict):
        return str(doc.get("text") or doc.get("page_content") or doc)
    return str(getattr(doc, "page_content", doc))


def format_docs(docs: List[Any]) -> str:
    """Format retrieved documents for the prompt."""
    if not docs:
        return "No relevant documents found."

    formatted = []
    for i, doc in enumerate(docs, 1):
        text = _doc_text(doc)
        formatted.append(f"Document {i}:\n{text}")

    return "\n\n".join(formatted)


def build_v1_rag_chain(retriever, prompt: Optional[PromptTemplate] = None):
    """
    Build a modern LangChain RAG chain using LCEL.

    Args:
        retriever: The retriever to use for document retrieval
        prompt: The prompt template to use (defaults to RAG_PROMPT)

    Returns:
        A runnable chain that processes queries and returns answers
    """

    if prompt is None:
        prompt = RAG_PROMPT
    llm_instance = _get_default_llm()

    # Create the RAG chain using LCEL
    # This chain:
    # 1. Takes input and retrieves documents
    # 2. Formats the documents
    # 3. Passes everything to the LLM
    # 4. Parses the output

    chain = (
        {
            "context": RunnableLambda(
                lambda x: (
                    retriever.get_relevant_documents(x["input"])
                    if isinstance(x, dict) and "input" in x
                    else retriever.get_relevant_documents(x)
                )
            )
            | RunnableLambda(format_docs),
            "input": RunnableLambda(
                lambda x: x.get("input", x) if isinstance(x, dict) else x
            ),
            "chat_history": RunnableLambda(
                lambda x: x.get("chat_history", []) if isinstance(x, dict) else []
            ),
        }
        | prompt
        | llm_instance
        | StrOutputParser()
    )

    return chain


def build_retrieval_qa_chain(
    retriever, llm_instance=None, prompt: Optional[PromptTemplate] = None
):
    """
    Build a complete RAG QA chain with context awareness.
    Args:
        retriever: The retriever to use
        llm_instance: The LLM to use (defaults to configured provider)
        prompt: The prompt template (defaults to RAG_PROMPT)
    Returns:
        A chain that processes questions and returns answers with metadata
    """

    if llm_instance is None:
        llm_instance = _get_default_llm()

    if prompt is None:
        prompt = RAG_PROMPT

    # Chain that also returns retrieved docs for source attribution
    def retrieve_and_format(x):
        query = x.get("input", x) if isinstance(x, dict) else x
        chat_history = x.get("chat_history", []) if isinstance(x, dict) else []
        if hasattr(retriever, "get_relevant_documents_with_scores"):
            docs = retriever.get_relevant_documents_with_scores(query)
        else:
            docs = [(doc, 0.0) for doc in retriever.get_relevant_documents(query)]
        return {
            "input": query,
            "chat_history": chat_history,
            "context": format_docs(docs),
            "original_docs": docs,
        }

    qa_chain = RunnableLambda(retrieve_and_format) | {
        "answer": prompt | llm_instance | StrOutputParser(),
        "original_docs": RunnablePassthrough()
        | RunnableLambda(lambda x: x.get("original_docs", [])),
    }

    return qa_chain
