import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Nagar Drishti - AI Civic Issue Management"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "nagar_drishti_super_secret_jwt_key_change_in_production_2026!"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Database: In local dev, SQLite is used by default if Postgres is not running
    DATABASE_URL: str = "sqlite:///./nagar_drishti.db"

    # Storage
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "uploads"))
    MAX_UPLOAD_SIZE_MB: int = 15

    # AI Configuration
    USE_MOCK_AI_IN_DEV: bool = True
    YOLO_MODEL_PATH: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ai", "models", "yolov8_civic.pt"))
    DUPLICATE_DISTANCE_THRESHOLD_METERS: float = 150.0
    DUPLICATE_EMBEDDING_SIMILARITY_THRESHOLD: float = 0.85
    DUPLICATE_OVERALL_SCORE_THRESHOLD: float = 0.80

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8081",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "allow"

settings = Settings()
