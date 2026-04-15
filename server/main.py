from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.quiz_api import router as quiz_router
from api.auth_api import router as auth_router
from api.summarization_api import router as summarization_router
from db import engine, Base
from models import *
from config.settings import settings

Base.metadata.create_all(bind=engine)

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


@app.get("/health")
def health():
    return {"message": "Hello from Wizard !!! 🚀"}
