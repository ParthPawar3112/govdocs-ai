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
    # Tesseract language(s) to recognize, in Tesseract's own "+"-joined format
    # (e.g. "eng", "mar", "eng+mar"). Defaults to eng+mar so a single OCR pass
    # picks up both scripts on government documents that mix English and
    # Marathi on the same page. Requires the matching .traineddata file(s) to
    # be installed in Tesseract's tessdata directory - see README.
    OCR_LANGUAGE: str = "eng+mar"
    # Only needed if language packs (e.g. mar.traineddata) live outside
    # Tesseract's own tessdata folder - e.g. C:\HACAKATHON\tessdata when
    # Program Files isn't writable without elevation. If set, ocr_service
    # applies this to the process's own environment before every OCR call,
    # so it's honored no matter how uvicorn happens to be launched (a fresh
    # terminal, VS Code, a double-clicked script) - it does not depend on
    # TESSDATA_PREFIX already being set in whatever shell started the app.
    TESSDATA_PREFIX: str | None = None

    # --- AI Metadata Extraction (Phase 6) ---
    # Required for Phase 6. Get a key at https://aistudio.google.com/apikey
    # Left empty by default so the app still runs without it - AI extraction
    # simply reports a clear "not configured" error instead of crashing.
    GEMINI_API_KEY: str = ""
    # gemini-2.5-flash is GA/stable as of this writing. Gemini's model
    # lineup moves fast - if this model is retired by the time you're
    # running this, update this one value to whatever's current
    # (see https://ai.google.dev/gemini-api/docs/models), no code changes needed.
    GEMINI_MODEL: str = "gemini-2.5-flash"
    # Default language for the AI-generated "title" and "summary" fields
    # ("english" | "marathi") when an upload doesn't specify one - see the
    # per-upload output_language form field on POST /documents/upload. This
    # is deliberately separate from OCR_LANGUAGE above: OCR_LANGUAGE controls
    # which scripts Tesseract recognizes in the source image (always eng+mar,
    # regardless of this setting), while this controls what language Gemini
    # writes its OUTPUT in. department/category/keywords always stay in
    # English regardless of this setting, so cross-document search/filtering
    # never fragments across languages. MUST default to "english" - existing
    # rows and callers that don't pass output_language rely on this.
    AI_OUTPUT_LANGUAGE: str = "english"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
