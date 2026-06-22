from langchain_core.documents import Document
from langchain_core.runnables import RunnableLambda

from schemas.rag_schema import RAGResponse
from services.rag.chains.v1_rag_chain import build_retrieval_qa_chain, format_docs


class FakeRetriever:
    def get_relevant_documents(self, query):
        return [Document(page_content=f"context for {query}")]

    def get_relevant_documents_with_scores(self, query, k=5):
        return [(Document(page_content=f"context for {query}"), 0.87)]


def test_format_docs_uses_chroma_document_page_content():
    formatted = format_docs([Document(page_content="uploaded source context")])

    assert "Document 1:" in formatted
    assert "uploaded source context" in formatted
    assert "page_content=" not in formatted


def test_retrieval_chain_supplies_default_chat_history():
    chain = build_retrieval_qa_chain(
        FakeRetriever(),
        llm_instance=RunnableLambda(lambda _: "answer from context"),
    )

    result = chain.invoke({"input": "question"})

    assert result["answer"] == "answer from context"
    doc, score = result["original_docs"][0]
    assert doc.page_content == "context for question"
    assert score == 0.87


def test_rag_response_accepts_scored_langchain_sources():
    response = RAGResponse(
        answer="answer",
        mode_used="rag",
        sources=[
            {
                "id": 0,
                "title": "source.pdf",
                "snippet": "retrieved context",
                "score": 0.73,
            }
        ],
    )

    assert response.sources[0].score == 0.73
