from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
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
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])

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

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
