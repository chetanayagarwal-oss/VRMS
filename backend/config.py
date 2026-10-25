"""
backend/config.py – App settings loaded from .env (never hard-coded secrets)
"""

from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # LLM provider – "openai" or "anthropic"
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o-mini"

    # Keys – read from environment; never included in source
    openai_api_key: str = ""
    anthropic_api_key: str = ""

    # Negotiation tuning
    max_rounds: int = 6

    # Authentication & JWT
    jwt_secret: str = "swipegig-super-secure-jwt-secret-key-2026-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS – explicit list of allowed origins (no "*")
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str):
            # Support comma-delimited strings in .env: "http://localhost:5173,http://localhost:3000"
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


settings = Settings()
