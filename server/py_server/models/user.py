from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from config.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="user")
    is_active = Column(Boolean, default=True)
    chat_limit = Column(Integer, nullable=True)
    subscribed = Column(Boolean, nullable=True)
    subscription_plan = Column(String(50), nullable=True)
    daily_chat_limit = Column(Integer, nullable=True)
    chat_limit_reset_at = Column(DateTime(timezone=True), nullable=True)
    phone = Column(String(30), nullable=True)
    dob = Column(Date, nullable=True)
    otp = Column(String(10), nullable=True)
    otp_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    grades = relationship(
        "Grade",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    payment_transactions = relationship(
        "PaymentTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    wizard_contents = relationship(
        "WizardContent",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
