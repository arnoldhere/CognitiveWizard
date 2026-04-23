from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.quiz_api import router as quiz_router
from api.auth_api import router as auth_router
from api.summarization_api import router as summarization_router
from api.rag_api import router as rag_router
from config.db import engine, Base
from models import *
from config.settings import settings
import onnxruntime as ort

import tensorflow as tf

gpus = tf.config.list_physical_devices("GPU")
if gpus:
    try:
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
    except RuntimeError as e:
        print(e)

ort.set_default_logger_severity(3)  # errors only


Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="Cognitive Wizard Backend",
    description="Backend platform for Cognitive Wizard application",
)

# Ensure a temporary directory exists for testing the basic "store" functionality
# UPLOAD_DIR = "media/temp_faces"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

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
