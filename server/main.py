from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth_api import router as auth_router
from api.quiz_api import router as quiz_router
from api.rag_api import router as rag_router
from api.rag_evaluation_api import router as rag_evaluation_router
from api.rag_auto_eval_api import router as rag_auto_router
from api.summarization_api import router as summarization_router
from api.admin_api import router as admin_router
from api.subscription_api import router as subscription_router
from config.db import Base, engine
from config.settings import settings
from models import *
from services.auth_service import create_user, get_user_by_email
import logging
from config.db import get_db

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_admin_if_not_exists():
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASS:
        logger.warning(
            "Admin user not created because ADMIN_EMAIL or ADMIN_PASS is not configured."
        )
        return

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
            logger.info("Admin user created: %s", admin.email)
        else:
            logger.info("Admin user already exists")
    except Exception as e:
        logger.error("Error creating admin user: %s", e)
    finally:
        db.close()


# Create tables and admin user
Base.metadata.create_all(bind=engine)
create_admin_if_not_exists()

app = FastAPI(
    title="Cognitive Wizard Backend",
    description="Backend platform for Cognitive Wizard application",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ALLOW_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(quiz_router)
app.include_router(summarization_router)
app.include_router(rag_router)
app.include_router(admin_router)
app.include_router(subscription_router)
app.include_router(rag_evaluation_router)
app.include_router(rag_auto_router)


@app.get("/health")
def health():
    return {"message": "Hello from Wizard !!! 🚀"}


@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI startup complete")
