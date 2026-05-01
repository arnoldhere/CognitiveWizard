from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func

from config.base import Base


class RAGDocument(Base):
    __tablename__ = "rag_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    document_name = Column(String(255), nullable=False)
    chunk_index = Column(Integer, nullable=False, default=0)
    snippet = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
