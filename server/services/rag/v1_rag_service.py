from utils.preprocess.embedder import EmbeddingFactory
from config.vector_store.vectordb import VectorDBFactory
from services.rag.hybrid_retriver import HybridRetriever
from services.rag.chains.v0_rag_chain import build_rag_chain
from utils.prompt_builder.prompts.rag_prompt import RAG_PROMPT
from services.rag.memory.chat_memory import get_memory


class RAGService:
    """
    Main orchestrator for rag services
    """

    def __init__(self, vectordb_path: str):
        self.embeddings = EmbeddingFactory.get_embeddings()
        self.vectordb = VectorDBFactory.load_embeddings(vectordb_path, self.embeddings)
        self.retriever = HybridRetriever(self.vectordb)
        self.chain = build_rag_chain(self.retriever, prompt=RAG_PROMPT)
        self.memory = get_memory()

    def query(self, question: str):
        """
        Query handler
        """
        res = self.chain.run(question)
        return res


rag_service = RAGService()
