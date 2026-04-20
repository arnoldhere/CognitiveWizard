from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from config.base import Base
from config.settings import settings

engine = create_engine(
    settings.SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    if db is None:
        raise Exception("Failed to create database session")
    try:
        yield db
    finally:
        db.close()
