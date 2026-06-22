from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from api.auth_api import get_current_active_user
from config.db import get_db
from services.payment_service import payment_service
from schemas.subscription_schema import (
    SubscriptionConfirmationRequest,
    SubscriptionConfirmationResponse,
    SubscriptionOrderRequest,
    SubscriptionOrderResponse,
    SubscriptionPlan,
)
from models.user import User

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("/plans", response_model=list[SubscriptionPlan])
def list_subscription_plans():
    return payment_service.list_plans()


@router.post("/order", response_model=SubscriptionOrderResponse)
def create_subscription_order(
    request: SubscriptionOrderRequest,
    current_user: User = Depends(get_current_active_user),
):
    try:
        return payment_service.create_order(request.plan, current_user)
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


@router.post("/confirm", response_model=SubscriptionConfirmationResponse)
def confirm_subscription_payment(
    request: SubscriptionConfirmationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    try:
        confirmation = payment_service.confirm_payment(
            db,
            current_user,
            request.plan,
            request.razorpay_order_id,
            request.razorpay_payment_id,
            request.razorpay_signature,
        )
        return {
            "status": "success",
            "message": f"Subscription activated: {confirmation['plan'][ 'name']}.",
            "plan": confirmation["plan"],
            "daily_chat_limit": confirmation["daily_chat_limit"],
            "transaction_id": confirmation["transaction_id"],
            "paid_at": confirmation["paid_at"],
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment confirmation failed. Contact support if this persists.",
        ) from exc
