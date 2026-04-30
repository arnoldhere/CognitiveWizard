from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth_api import router as auth_router
from api.quiz_api import router as quiz_router
from api.rag_api import router as rag_router
from api.summarization_api import router as summarization_router
from api.admin_api import router as admin_router
from config.db import Base, engine, ensure_user_table_columns
from config.settings import settings
from models import *
from services.auth_service import create_user, get_user_by_email
import logging
from config.db import get_db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_admin_if_not_exists():
    db = next(get_db())
    try:
        existing_admin = get_user_by_email(db, settings.ADMIN_EMAIL)
        if not existing_admin:
            admin = create_user(
                db,
                email=settings.ADMIN_EMAIL,
                password=settings.ADMIN_PASS,
                full_name="System Administrator",
                role="admin",
            )
            logger.info(f"Admin user created: {admin.email}")
        else:
            logger.info("Admin user already exists")
    except Exception as e:
        logger.error(f"Error creating admin user: {e}")
    finally:
        db.close()


# Create tables and admin user
Base.metadata.create_all(bind=engine)
ensure_user_table_columns()
create_admin_if_not_exists()

app = FastAPI(
    title="Cognitive Wizard Backend",
    description="Backend platform for Cognitive Wizard application",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ALLOW_ORIGINS),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(quiz_router)
app.include_router(summarization_router)
app.include_router(rag_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    return {"message": "Hello from Wizard !!! 🚀"}


@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI startup complete")
