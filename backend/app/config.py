from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_env: str = "development"
    app_name: str = "LexiAI"
    frontend_url: str = "http://localhost:5173"

    database_url: str = "postgresql://lexiai:lexiai@localhost:5432/lexiai"

    jwt_secret_key: str = "change-me-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    upload_dir: str = "uploads"
    max_upload_size_mb: int = 20

    # Embeddings (local sentence-transformers)
    embedding_provider: str = "local"
    local_embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimensions: int = 384

    # Chat generation (Groq) — mapped from model_mode on the backend only
    groq_api_key: str = ""
    groq_model_fast: str = Field(
        default="llama-3.1-8b-instant",
        validation_alias=AliasChoices("GROQ_MODEL_FAST", "GROQ_FALLBACK_MODEL"),
    )
    groq_model_smart: str = Field(
        default="llama-3.3-70b-versatile",
        validation_alias=AliasChoices("GROQ_MODEL_SMART", "GROQ_MODEL"),
    )

    @property
    def upload_path(self) -> Path:
        path = BACKEND_ROOT / self.upload_dir
        path.mkdir(parents=True, exist_ok=True)
        return path

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


settings = Settings()
