"""
api/subscription_api.py
========================
FastAPI endpoints for subscription management:
 - GET  /subscriptions/plans         — list available plans
 - POST /subscriptions/order-raw     — create Razorpay order
 - POST /subscriptions/verify-signature — verify Razorpay HMAC signature
 - POST /subscriptions/notify-expiry — send subscription expiry reminder email

Note: subscription state (activate/cancel) is managed by the Express gateway
(js_server) which owns the Users MySQL table.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
import hmac
import hashlib
import httpx
import base64
import logging
from datetime import datetime
from schemas.subscription_schema import *
from config.settings import settings
from utils.email_utils import send_subscription_expiry_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

# ─── Plan catalogue ──────────────────────────────────────────────────────────

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


class ExpiryNotifyRequest(BaseModel):
    """Payload sent from js_server when triggering expiry reminder emails."""

    email: str
    full_name: str
    plan: str
    days_left: int
    expires_at: str  # ISO datetime string


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.get("/plans", response_model=list[SubscriptionPlan])
def list_subscription_plans():
    """Return all available subscription plans."""
    return list(SUBSCRIPTION_PLANS.values())


@router.post("/order-raw", response_model=SubscriptionOrderResponse)
async def create_subscription_order_raw(request: SubscriptionOrderRequest):
    """
    Create a Razorpay payment order for the given plan.
    Called by js_server after authentication.
    """
    try:
        plan_data = SUBSCRIPTION_PLANS.get(request.plan)
        if not plan_data:
            raise ValueError(f"Invalid plan ID: {request.plan}")

        api_key = settings.RAZORPAY_KEY_ID
        api_secret = settings.RAZORPAY_KEY_SECRET

        if not api_key or not api_secret:
            raise HTTPException(
                status_code=500, detail="Razorpay credentials not configured"
            )

        # Amount in paise (INR × 100)
        amount = int(plan_data["amount_inr"] * 100)
        receipt = f"subscription_{request.plan}_{int(datetime.utcnow().timestamp())}"

        auth_string = f"{api_key}:{api_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode()

        payload = {
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                settings.RAZORPAY_ORDER_URL or "https://api.razorpay.com/v1/orders",
                headers={
                    "Authorization": f"Basic {encoded_auth}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=15,
            )
        response.raise_for_status()
        order = response.json()

        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create subscription order. Please try again later.",
        ) from exc


@router.post("/verify-signature", response_model=VerifySignatureResponse)
def verify_signature(request: VerifySignatureRequest):
    """
    Verify a Razorpay payment signature using HMAC-SHA256.
    Returns {valid: true} if the signature matches, {valid: false} otherwise.
    """
    secret = settings.RAZORPAY_KEY_SECRET
    if not secret:
        raise HTTPException(
            status_code=500, detail="Razorpay secret not configured on server"
        )
    message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_signature = hmac.new(
        secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return {"valid": generated_signature == request.razorpay_signature}


@router.post("/notify-expiry")
async def notify_subscription_expiry(
    request: ExpiryNotifyRequest, background_tasks: BackgroundTasks
):
    """
    Send a subscription expiry reminder email to the given user.
    The email is dispatched in the background so the response is immediate.
    Called by js_server's /subscriptions/check-expiry endpoint.
    """
    try:
        # Schedule the email in the background to avoid blocking the response
        background_tasks.add_task(
            send_subscription_expiry_email,
            email=request.email,
            full_name=request.full_name,
            plan=request.plan,
            days_left=request.days_left,
            expires_at=request.expires_at,
        )
        logger.info(
            f"[SUBSCRIPTION] Expiry reminder queued for {request.email}, {request.days_left} days left"
        )
        return {"status": "queued", "email": request.email}
    except Exception as exc:
        logger.error(
            f"[SUBSCRIPTION] Failed to queue expiry email for {request.email}: {exc}"
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send expiry notification email.",
        ) from exc
