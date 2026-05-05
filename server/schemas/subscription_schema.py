from typing import Literal, Optional

from pydantic import BaseModel


class SubscriptionPlan(BaseModel):
    id: Literal["silver", "gold", "diamond"]
    name: str
    amount_inr: int
    daily_chat_limit: int
    description: str


class SubscriptionOrderRequest(BaseModel):
    plan: Literal["silver", "gold", "diamond"]


class SubscriptionOrderResponse(BaseModel):
    order_id: str
    amount: int
    amount_inr: int
    currency: str
    receipt: str
    key_id: str
    plan: SubscriptionPlan


class SubscriptionConfirmationRequest(BaseModel):
    plan: Literal["silver", "gold", "diamond"]
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class SubscriptionConfirmationResponse(BaseModel):
    status: str
    message: str
    plan: SubscriptionPlan
    daily_chat_limit: int
    transaction_id: str
    paid_at: Optional[str] = None
