import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load from server/.env (two directories up from py_server/config/settings.py)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=env_path)


@dataclass
class Settings:
    MEDIA_DIR: str = os.getenv("MEDIA_DIR")
    # ==============
    # ChromaDB setup
    # ==============
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR")
    FACE_CHROMA_COLLECTION: str = os.getenv("FACE_CHROMA_COLLECTION", "face_embeddings")
    RAG_CHROMA_COLLECTION_PREFIX: str = os.getenv(
        "RAG_CHROMA_COLLECTION_PREFIX", "rag_user"
    )
    RAG_USER_VECTOR_DIR: str = os.getenv(
        "RAG_USER_VECTOR_DIR", "vectorDB/chroma/rag_user_vectors"
    )
    RAG_USER_DATA_DIR: str = "vectorDB/rag_user_data"
    EMBEDDING_DIM: int = 1024
    TOP_K_RESULTS_RAG: int = 5

    # ===========
    # HF configurations
    # ===========
    HF_API_KEY: str = os.getenv("HF_API_KEY", "")
    HUGGINGFACEHUB_API_TOKEN: str = os.getenv(
        "HUGGINGFACEHUB_API_TOKEN", os.getenv("HF_API_KEY", "")
    )
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
    HF_PROVIDER: str = os.getenv("HF_PROVIDER", "cerebras")
    # ===========
    # Database configurations
    # ===========
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "password")
    DB_HOST: str = os.getenv("DB_HOST", "127.0.0.1")
    DB_PORT: str = os.getenv("DB_PORT", "3306")
    DB_NAME: str = os.getenv("DB_NAME", "cognitive_wizard")
    DATABASE_URL: str = os.getenv("DATABASE_URL")
    MONGO_URI: str = os.getenv("MONGO_URI", "")
    MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "")

    # ===========
    # Redis Configs
    # ===========
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = os.getenv("REDIS_PORT", 6379)
    REDIS_DB_INDEX: int = os.getenv("REDIS_DB_INDEX", 0)

    # ===========
    # Middlewares & Authentication configurations
    # ===========
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY")
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

    # Razorpay test credentials
    RAZORPAY_ORDER_URL: str = os.getenv("RAZORPAY_ORDER_URL", "")
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")

    # admin credentials
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_PASS: str = os.getenv("ADMIN_PASS")

    def __post_init__(self):
        if not self.JWT_SECRET_KEY:
            raise ValueError(
                "JWT_SECRET_KEY environment variable is required for authentication"
            )
        if not self.DATABASE_URL:
            raise ValueError(
                "DATABASE_URL environment variable is required for database access"
            )

    # ===========
    # LLM & Models - API configs
    # ===========
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_DEF_MODEL: str = os.getenv("OPENAI_DEF_MODEL")
    HF_DEF_MODEL: str = os.getenv("HF_DEF_MODEL")
    DEF_LLM_PROVIDER: str = os.getenv("DEF_LLM_PROVIDER")
    RAG_EVAL_LLM: str = os.getenv("RAG_EVAL_LLM")
    DEF_EMBEDD_MODEL: str = os.getenv("DEF_EMBEDD_MODEL", "")

    # ==========
    # Liveness detection settings
    # ==========
    LIVENESS_THRESHOLD: float = float(os.getenv("LIVENESS_THRESHOLD", "0.6"))
    FACE_LOGIN_RATE_MAX: int = int(os.getenv("FACE_LOGIN_RATE_MAX", "5"))
    FACE_LOGIN_RATE_WINDOW: int = int(os.getenv("FACE_LOGIN_RATE_WINDOW", "60"))
    FACE_LOGIN_MAX_BYTES: int = int(os.getenv("FACE_LOGIN_MAX_BYTES", "5242880"))

    # ===========
    # AUTH Configs
    # ===========
    AUTH_OTP_EXPIRY: int = os.getenv("AUTH_OTP_EXPIRY", 300)  # expiry in seconds
    SMTP_HOST: str | None = os.getenv("SMTP_HOST")
    SMTP_PORT: int | None = os.getenv("SMTP_PORT") and int(os.getenv("SMTP_PORT"))
    SMTP_USERNAME: str | None = os.getenv("SMTP_USERNAME")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str | None = os.getenv("SMTP_FROM_EMAIL")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in (
        "true",
        "1",
        "yes",
    )

    @property
    def SQLALCHEMY_DATABASE_URL(self):
        return self.DATABASE_URL


settings = Settings()
