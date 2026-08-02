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

    # --- Authentication ---
    # This value is supplied through .env and signs short-lived access tokens.
    JWT_SECRET_KEY: str = "change-this-development-secret-before-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --- Document storage (Phase 4) ---
    # Relative to the backend/ working directory, matching where uvicorn runs from.
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # --- OCR (Phase 5) ---
    # "tesseract" is the default: a thin wrapper around the Tesseract binary,
    # no heavy ML dependencies, and reliably installable on Windows even with
    # newer Python versions. "easyocr" is supported and fully implemented,
    # but depends on PyTorch (multi-GB, sometimes lacks Windows wheels for
    # brand-new Python releases) - switch to it by changing this one value
    # once torch is confirmed working in your environment, no code changes
    # needed. See README "OCR Engine" section for the Windows Tesseract setup.
    OCR_ENGINE: str = "tesseract"
    # Only needed on Windows if `tesseract` isn't on PATH, e.g.:
    # r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    TESSERACT_CMD: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
