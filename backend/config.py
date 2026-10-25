"""
backend/config.py – App settings loaded from .env (never hard-coded secrets)
"""

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

    # CORS – allow the Vite dev server
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]


settings = Settings()
