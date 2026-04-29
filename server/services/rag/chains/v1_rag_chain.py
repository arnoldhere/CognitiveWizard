"""
LangChain-based RAG chain using modern LCEL (LangChain Expression Language).
Provides improved integration with LangChain components and better error handling.
"""

from typing import Any, Dict, List, Optional
from langchain_core.prompts import PromptTemplate, ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_community.chat_models.openai import ChatOpenAI
from providers.llm_provider import llm
from utils.prompt_builder.prompts.rag_prompt import RAG_PROMPT


def format_docs(docs: List[Dict[str, Any]]) -> str:
    """Format retrieved documents for the prompt."""
    if not docs:
        return "No relevant documents found."

    formatted = []
    for i, doc in enumerate(docs, 1):
        text = doc.get("text", doc) if isinstance(doc, dict) else doc
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
                    retriever.get_relevant_documents(x["query"])
                    if isinstance(x, dict) and "query" in x
                    else retriever.get_relevant_documents(x)
                )
            )
            | RunnableLambda(format_docs),
            "question": RunnableLambda(
                lambda x: x.get("query", x) if isinstance(x, dict) else x
            ),
        }
        | prompt
        | llm
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
        llm_instance = llm

    if prompt is None:
        prompt = RAG_PROMPT

    # Chain that also returns retrieved docs for source attribution
    def retrieve_and_format(x):
        query = x.get("query", x) if isinstance(x, dict) else x
        docs = retriever.get_relevant_documents(query)
        return {
            "query": query,
            "context": format_docs(
                [doc.get("text", doc) if isinstance(doc, dict) else doc for doc in docs]
            ),
            "original_docs": docs,
        }

    qa_chain = RunnableLambda(retrieve_and_format) | {
        "answer": prompt | llm_instance | StrOutputParser(),
        "original_docs": RunnablePassthrough()
        | RunnableLambda(lambda x: x.get("original_docs", [])),
    }

    return qa_chain
