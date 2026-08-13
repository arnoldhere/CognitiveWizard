from pydantic import BaseModel


class SubscriptionPlan(BaseModel):
    id: str
    name: str
    amount_inr: int
    daily_chat_limit: int
    description: str


class SubscriptionOrderRequest(BaseModel):
    plan: str


class SubscriptionOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str


class VerifySignatureRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class VerifySignatureResponse(BaseModel):
    valid: bool
