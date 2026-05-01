import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


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

    # admin credentials
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL")
    ADMIN_PASS: str = os.getenv("ADMIN_PASS")

    # ===========
    # LLM & Models - API configs
    # ===========
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY")
    OPENAI_DEF_MODEL: str = os.getenv("OPENAI_DEF_MODEL")
    HF_DEF_MODEL: str = os.getenv("HF_DEF_MODEL")
    DEF_LLM_PROVIDER: str = os.getenv("DEF_LLM_PROVIDER")

    @property
    def SQLALCHEMY_DATABASE_URL(self):
        return self.DATABASE_URL


settings = Settings()
