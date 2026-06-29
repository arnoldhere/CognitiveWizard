from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.auth_api import router as auth_router
from api.quiz_api import router as quiz_router
from api.rag_api import router as rag_router
from api.summarization_api import router as summarization_router
from api.subscription_api import router as subscription_router
from api.wizard_api import router as wizard_router
from config.settings import settings
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Cognitive Wizard Backend",
    description="Backend platform for Cognitive Wizard application",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.CORS_ALLOW_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(quiz_router)
app.include_router(summarization_router)
app.include_router(rag_router)
app.include_router(subscription_router)
app.include_router(wizard_router)


@app.get("/health")
def health():
    return {"message": "Hello from Wizard !!! 🚀"}


@app.on_event("startup")
async def startup_event():
    logger.info("FastAPI startup complete")
