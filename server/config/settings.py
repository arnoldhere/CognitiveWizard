import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    # ===========
    # FAISS setup
    # ===========
    FACE_FAISS_INDEX_PATH: str = "vectorDB/face_faiss.index"
    RAG_FAISS_INDEX_PATH: str = "vectorDB/rag_faiss.index"
    RAG_USER_INDEX_DIR: str = "vectorDB/rag_user_indices"
    RAG_USER_DATA_DIR: str = "vectorDB/rag_user_data"
    EMBEDDING_DIM: int = 512
    TOP_K_RESULTS_RAG: int = 3

    # ===========
    # HF configurations
    # ===========
    HF_API_KEY: str = os.getenv("HF_API_KEY", "")
    HF_BASE_URL: str = os.getenv(
        "HF_BASE_URL", "https://router.huggingface.co/hf-inference/models"
    )

    # ===========
    # HF model settings
    # ===========
    QUIZ_GENERATOR_MODEL: str = os.getenv(
        "QUIZ_GENERATOR_MODEL", "meta-llama/Llama-3.1-8B-Instruct"
    )
    QUIZ_GENERATOR_MODEL_LOCAL: str = os.getenv("QUIZ_GENERATOR_MODEL_LOCAL")

    # ===========
    # Database configurations
    # ===========
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "password")
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "cognitive_wizard")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', 'password')}@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '3306')}/{os.getenv('DB_NAME', 'cognitive_wizard')}",
    )

    # ===========
    # Middlewares & Authentication configurations
    # ===========
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "cogwiz")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )
    CORS_ALLOW_ORIGINS: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "CORS_ALLOW_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    )

    # admin credentials
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_PASS: str = os.getenv("ADMIN_PASS")

    @property
    def SQLALCHEMY_DATABASE_URL(self):
        return self.DATABASE_URL


settings = Settings()
