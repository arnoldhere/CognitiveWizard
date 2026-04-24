from sqlalchemy.orm import Session
from config.db import SessionLocal, engine
from config.base import Base
from models import *
from services.auth_service import create_user, get_user_by_email


def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = get_user_by_email(db, "admin@cogwiz.com")
        if existing_admin:
            print("Admin user already exists.")
            return

        # Create admin user
        admin = create_user(
            db,
            email="admin@cogwiz.com",
            password="cogwiz",
            full_name="System Administrator",
            role="admin",
        )
        print(f"Admin user created: {admin.email}")
    finally:
        db.close()


if __name__ == "__main__":
    # Ensure tables are created
    Base.metadata.create_all(bind=engine)
    create_admin_user()
