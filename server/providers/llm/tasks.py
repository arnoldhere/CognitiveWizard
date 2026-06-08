from enum import Enum


class TaskType(str, Enum):
    CHAT = "chat"  # chatbot  → ConversationChain
    SUMMARIZE = "summarize"  # summarization → load_summarize_chain
    QUIZ = "quiz"  # quiz gen → structured JSON output
    SENTIMENT = "sentiment"  # classification
    RAG = "rag"  # retrieval-augmented generation → RetrievalQA
