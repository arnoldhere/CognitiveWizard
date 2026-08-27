from config.settings import settings
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.quiz_api import router as quiz_router
from api.rag_api import router as rag_router
from api.summarization_api import router as summarization_router
from api.subscription_api import router as subscription_router
from api.wizard_api import router as wizard_router
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

# Note: auth_api (facial recognition endpoints) deprecated → server/py_server/deprecated/
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
    # Auto-resume any interrupted agentic workflows
    from tasks.wizard_tasks import resume_incomplete_workflows
    import asyncio

    asyncio.create_task(resume_incomplete_workflows())

    logger.info("FastAPI startup complete")
