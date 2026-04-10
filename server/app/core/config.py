from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Dhaka Emergency Response API"
    app_env: Literal["development", "staging", "production"] = "development"
    debug: bool = False
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: str = "*"

    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "dhaka_emergency"

    jwt_secret_key: str = "replace-in-env"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 24 * 60

    admin_api_key: str | None = None
    dummy_otp: str = "123456"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-1.5-flash"

    whisper_model: str = "tiny"
    whisper_language: str = "bn"

    max_dispatch_responders: int = 5
    severity_escalation_threshold: int = 4

    @property
    def allowed_origins_list(self) -> list[str]:
        value = self.allowed_origins.strip()
        if not value:
            return ["*"]
        return [item.strip() for item in value.split(",") if item.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
