from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import onnxruntime as ort
import tensorflow as tf

from api.auth_api import router as auth_router
from api.quiz_api import router as quiz_router
from api.rag_api import router as rag_router
from api.summarization_api import router as summarization_router
from config.db import Base, engine, ensure_user_table_columns
from config.settings import settings
from models import *


gpus = tf.config.list_physical_devices("GPU")
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    except RuntimeError as e:
        print(e)

ort.set_default_logger_severity(3)

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


@app.get("/health")
def health():
    return {"message": "Hello from Wizard !!! 🚀"}
