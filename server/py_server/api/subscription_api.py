from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import hmac
import hashlib
import os
import requests
from datetime import datetime

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

SUBSCRIPTION_PLANS = {
    "silver": {
        "id": "silver",
        "name": "Silver",
        "amount_inr": 299,
        "daily_chat_limit": 25,
        "description": "25 daily chat requests with premium coverage.",
    },
    "gold": {
        "id": "gold",
        "name": "Gold",
        "amount_inr": 499,
        "daily_chat_limit": 50,
        "description": "50 daily chat requests with enhanced priority.",
    },
    "diamond": {
        "id": "diamond",
        "name": "Diamond",
        "amount_inr": 699,
        "daily_chat_limit": 99,
        "description": "99 daily chat requests for power users.",
    },
}

class SubscriptionPlan(BaseModel):
    id: str
    name: str
    amount_inr: int
    daily_chat_limit: int
    description: str

@router.get("/plans", response_model=list[SubscriptionPlan])
def list_subscription_plans():
    return list(SUBSCRIPTION_PLANS.values())

class SubscriptionOrderRequest(BaseModel):
    plan: str

class SubscriptionOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str

@router.post("/order-raw", response_model=SubscriptionOrderResponse)
def create_subscription_order_raw(request: SubscriptionOrderRequest):
    try:
        plan_data = SUBSCRIPTION_PLANS.get(request.plan)
        if not plan_data:
            raise ValueError(f"Invalid plan ID: {request.plan}")
            
        api_key = os.environ.get("RAZORPAY_KEY_ID", "")
        api_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
        
        amount = int(plan_data["amount_inr"] * 100)
        receipt = f"subscription_{request.plan}_{int(datetime.utcnow().timestamp())}"
        
        payload = {
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        }
        
        response = requests.post(
            os.environ.get("RAZORPAY_ORDER_URL", "https://api.razorpay.com/v1/orders"),
            auth=(api_key, api_secret),
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        order = response.json()
        
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"]
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create subscription order. Please try again later.",
        ) from exc

class VerifySignatureRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str

class VerifySignatureResponse(BaseModel):
    valid: bool

@router.post("/verify-signature")
def verify_signature(request: VerifySignatureRequest):
    secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_signature = hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature == request.razorpay_signature:
        return {"valid": True}
    else:
        return {"valid": False}
