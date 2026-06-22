from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from config.base import Base


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    plan = Column(String(50), nullable=False)
    amount = Column(Integer, nullable=False)
    amount_inr = Column(Integer, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    razorpay_order_id = Column(String(100), unique=True, nullable=False)
    razorpay_payment_id = Column(String(100), unique=True, nullable=True)
    razorpay_signature = Column(String(255), nullable=True)
    status = Column(String(50), nullable=False, default="created")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    paid_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="payment_transactions")
