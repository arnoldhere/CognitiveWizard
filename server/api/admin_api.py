import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from config.db import get_db
from models.user import User
from schemas.auth_schema import UserRead, UserStatusUpdate
from api.auth_api import require_role

CONFIG_FILE = Path(__file__).resolve().parent.parent / "config" / "system_config.json"
DEFAULT_SYSTEM_CONFIG = {
    "max_chat_limit": 100,
    "default_chat_limit": 10,
    "maintenance_mode": False,
}

router = APIRouter(prefix="/admin", tags=["Admin"])


def _ensure_config_file():
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not CONFIG_FILE.exists():
        CONFIG_FILE.write_text(
            json.dumps(DEFAULT_SYSTEM_CONFIG, indent=2), encoding="utf-8"
        )


def _load_system_config():
    _ensure_config_file()
    try:
        return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        CONFIG_FILE.write_text(
            json.dumps(DEFAULT_SYSTEM_CONFIG, indent=2), encoding="utf-8"
        )
        return DEFAULT_SYSTEM_CONFIG.copy()


def _save_system_config(config: dict):
    _ensure_config_file()
    CONFIG_FILE.write_text(json.dumps(config, indent=2), encoding="utf-8")


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
def update_user_status(
    user_id: int,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = payload.is_active
    db.commit()

    return {"message": "User status updated"}


@router.get("/config", dependencies=[Depends(require_role(["admin"]))])
def get_system_config():
    return _load_system_config()


@router.put("/config", dependencies=[Depends(require_role(["admin"]))])
def update_system_config(config: dict):
    if not isinstance(config, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Config payload must be a JSON object.",
        )

    current = _load_system_config()
    current.update(config)
    _save_system_config(current)
    return {"message": "Config updated", "config": current}
