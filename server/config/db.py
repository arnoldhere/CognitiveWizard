from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from config.base import Base
from config.settings import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def ensure_user_table_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    statements = []

    if "chat_limit" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN chat_limit INTEGER NULL")
    if "subscribed" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN subscribed BOOLEAN NULL")
    if "chat_limit_reset_at" not in existing_columns:
        statements.append(
            "ALTER TABLE users ADD COLUMN chat_limit_reset_at DATETIME NULL"
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def ensure_grade_table_columns() -> None:
    """
    Ensure all required columns exist in the grades table for the new quiz features.
    Adds missing columns to support schema evolution and backward compatibility.
    """
    inspector = inspect(engine)
    if "grades" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("grades")}
    statements = []

    # Add time_limit_seconds if missing (default 8 minutes for backward compatibility)
    if "time_limit_seconds" not in existing_columns:
        statements.append(
            "ALTER TABLE grades ADD COLUMN time_limit_seconds INTEGER NOT NULL DEFAULT 480"
        )

    # Add time_taken to track actual time spent on quiz
    if "time_taken" not in existing_columns:
        statements.append("ALTER TABLE grades ADD COLUMN time_taken INTEGER NULL")

    # Add started_at to track quiz session start time
    if "started_at" not in existing_columns:
        statements.append("ALTER TABLE grades ADD COLUMN started_at DATETIME NULL")

    if not statements:
        return

    try:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
    except Exception as e:
        # Log warning but don't fail - schema may already exist
        import sys

        print(f"[DB] Schema migration note: {e}", file=sys.stderr)


def get_db():
    db = SessionLocal()
    if db is None:
        raise Exception("Failed to create database session")
    try:
        yield db
    finally:
        db.close()
