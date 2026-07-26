"""
Centralized application configuration.

Reads values from a .env file (see .env.example) using pydantic-settings.
Only the settings needed for Phase 1 (project setup + health check) are
defined here. New settings are added to this file only when the module
that needs them is built (e.g. JWT_SECRET_KEY arrives with the Login
module), so this file never carries unused configuration.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- App ---
    APP_NAME: str = "GovDocs AI"
    ENV: str = "development"

    # --- Database (SQLite for the hackathon MVP) ---
    # A relative sqlite file is created automatically on first run.
    DATABASE_URL: str = "sqlite:///./govdocs.db"

    # --- CORS ---
    # Vite's default dev server port.
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
