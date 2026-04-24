from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.db import get_db
from models.user import User
from schemas.auth_schema import UserRead
from api.auth_api import require_role, get_current_active_user
from sqlalchemy import func

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/dashboard", dependencies=[Depends(require_role(["admin"]))])
def get_dashboard_stats(db: Session = Depends(get_db)):
    # KPIs
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == "admin").count()

    # Recent users (last 7 days)
    from datetime import datetime, timedelta

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_users = db.query(User).filter(User.created_at >= seven_days_ago).count()

    return {
        "total_users": total_users,
        "active_users": active_users,
        "admin_users": admin_users,
        "recent_users": recent_users,
        "system_health": "Good",  # Placeholder
    }


@router.get(
    "/users",
    response_model=list[UserRead],
    dependencies=[Depends(require_role(["admin"]))],
)
def get_all_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@router.put("/users/{user_id}/status", dependencies=[Depends(require_role(["admin"]))])
def update_user_status(user_id: int, is_active: bool, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = is_active
    db.commit()
    return {"message": "User status updated"}


@router.get("/config", dependencies=[Depends(require_role(["admin"]))])
def get_system_config():
    # Placeholder for system configs
    return {"max_chat_limit": 100, "default_chat_limit": 10, "maintenance_mode": False}


@router.put("/config", dependencies=[Depends(require_role(["admin"]))])
def update_system_config(config: dict):
    # Placeholder for updating configs
    # In real implementation, save to DB or config file
    return {"message": "Config updated", "config": config}
