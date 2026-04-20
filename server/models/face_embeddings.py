from sqlalchemy import Column, ForeignKey, Integer, BigInteger, TIMESTAMP
from sqlalchemy.sql import func
from config.base import Base


class FaceEmbedding(Base):
    __tablename__ = "face_embeddings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    vector_id = Column(BigInteger, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
