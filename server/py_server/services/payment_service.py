import hmac
import requests
from datetime import datetime
from hashlib import sha256
from typing import Dict, Optional

from sqlalchemy.orm import Session

from config.settings import settings
from models.payment_transaction import PaymentTransaction
from models.user import User

RAZORPAY_ORDER_URL = settings.RAZORPAY_ORDER_URL

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


class PaymentService:
    def __init__(self):
        self.api_key = settings.RAZORPAY_KEY_ID
        self.api_secret = settings.RAZORPAY_KEY_SECRET
        if not self.api_key or not self.api_secret:
            raise ValueError("Razorpay API key and secret must be configured")

    def get_plan(self, plan_id: str) -> Optional[Dict]:
        return SUBSCRIPTION_PLANS.get(plan_id)

    def list_plans(self):
        return list(SUBSCRIPTION_PLANS.values())

    def create_order(self, plan_id: str, user: User) -> Dict:
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError("Unknown subscription plan")

        amount = int(plan["amount_inr"] * 100)
        receipt = (
            f"subscription_{user.id}_{plan_id}_{int(datetime.utcnow().timestamp())}"
        )
        payload = {
            "amount": amount,
            "currency": "INR",
            "receipt": receipt,
            "payment_capture": 1,
            "notes": {
                "user_id": str(user.id),
                "plan": plan_id,
            },
        }

        response = requests.post(
            RAZORPAY_ORDER_URL,
            auth=(self.api_key, self.api_secret),
            json=payload,
            timeout=15,
        )
        response.raise_for_status()
        order = response.json()

        transaction = PaymentTransaction(
            user_id=user.id,
            plan=plan_id,
            amount=amount,
            amount_inr=plan["amount_inr"],
            currency="INR",
            razorpay_order_id=order["id"],
            status="created",
        )
        db = None
        try:
            # create a new session just for transaction logging
            from config.db import SessionLocal

            db = SessionLocal()
            db.add(transaction)
            db.commit()
            db.refresh(transaction)
        finally:
            if db:
                db.close()

        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "amount_inr": plan["amount_inr"],
            "currency": order["currency"],
            "receipt": order.get("receipt", receipt),
            "key_id": self.api_key,
            "plan": plan,
        }

    def verify_signature(self, order_id: str, payment_id: str, signature: str) -> bool:
        payload = f"{order_id}|{payment_id}".encode("utf-8")
        expected = hmac.new(
            self.api_secret.encode("utf-8"), payload, sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def confirm_payment(
        self,
        db: Session,
        user: User,
        plan_id: str,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
    ) -> Dict:
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError("Unknown subscription plan")

        if not self.verify_signature(
            razorpay_order_id, razorpay_payment_id, razorpay_signature
        ):
            raise ValueError("Payment signature verification failed")

        transaction = (
            db.query(PaymentTransaction)
            .filter(PaymentTransaction.razorpay_order_id == razorpay_order_id)
            .first()
        )
        if not transaction:
            raise ValueError("Payment order record not found")

        transaction.razorpay_payment_id = razorpay_payment_id
        transaction.razorpay_signature = razorpay_signature
        transaction.status = "paid"
        transaction.paid_at = datetime.utcnow()

        user.subscription_plan = plan_id
        user.daily_chat_limit = plan["daily_chat_limit"]
        user.subscribed = True

        db.add(transaction)
        db.add(user)
        db.commit()
        db.refresh(transaction)
        db.refresh(user)

        return {
            "transaction_id": str(transaction.id),
            "paid_at": transaction.paid_at.isoformat() if transaction.paid_at else None,
            "plan": plan,
            "daily_chat_limit": plan["daily_chat_limit"],
        }


payment_service = PaymentService()
