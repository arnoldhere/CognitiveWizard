from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from config.base import Base
from sqlalchemy.orm import relationship

class WizardContent(Base):
    __tablename__ = "wizard_contents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    topic = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False, default="generated")
    content = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="wizard_contents")
