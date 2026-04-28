from langchain_classic.chains.retrieval_qa.base import RetrievalQA
from langchain_classic.chat_models.openai import ChatOpenAI
from providers.llm_openai import provider as llm_openai


def build_rag_chain(retriever, prompt):
    """
    Core RAG chain
    - Combines retrieval + LLM cleanly
    """
    return RetrievalQA.from_chain_type(
        llm=llm_openai,
        retriever=retriever,
        chain_type="stuff",
        chain_type_kwargs={"prompt": prompt},
    )
