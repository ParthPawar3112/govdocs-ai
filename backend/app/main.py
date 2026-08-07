"""
GovDocs AI - Smart Digital Documentation System
FastAPI application entrypoint.

Mounts: authentication (Phase 2), document management (Phase 4), and the
Phase 1 health check. Business logic itself lives in each module's router/
service files, not here - this file only wires the app together.
"""
import logging

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import Base, engine, get_db
from app.db.migrate import (
    ensure_ai_metadata_columns,
    ensure_ocr_text_column,
    ensure_review_columns,
    ensure_search_indexes,
)
from app.models.app_setting import AppSetting  # noqa: F401 - registers table with Base.metadata
from app.models.audit_log import AuditLog  # noqa: F401 - registers table with Base.metadata
from app.models.document import Document  # noqa: F401 - registers table with Base.metadata
from app.models.user import User  # noqa: F401 - registers table with Base.metadata
from app.routers.analytics import router as analytics_router
from app.routers.audit import router as audit_router
from app.routers.auth import router as auth_router
from app.routers.documents import router as documents_router
from app.routers.settings import router as settings_router
from app.services.seed import seed_default_users
from app.services.settings_service import seed_default_settings

logger = logging.getLogger("govdocs.main")

app = FastAPI(
    title=settings.APP_NAME,
    description="Smart Digital Documentation System for Government Offices",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication endpoints are kept in their own router so future modules can
# reuse the current-user dependency without expanding this application module.
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(analytics_router)
app.include_router(audit_router)
app.include_router(settings_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Phase 8 - security hardening: guarantee no raw traceback ever reaches a
    client (which can leak file paths/internals), while still logging the
    full detail server-side for debugging. Endpoints that already raise
    HTTPException are unaffected - only genuinely unhandled errors land here.
    """
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred."})


@app.on_event("startup")
def verify_database_on_startup() -> None:
    """
    Fails fast and loudly if the SQLite file can't be created/opened,
    instead of silently deferring the error to the first real request.
    """
    Base.metadata.create_all(bind=engine)
    ensure_ocr_text_column(engine)
    ensure_ai_metadata_columns(engine)
    ensure_search_indexes(engine)
    ensure_review_columns(engine)
    seed_default_users()
    seed_default_settings()
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    print(f"[GovDocs AI] Database connection verified -> {settings.DATABASE_URL}")


@app.get("/api/health", tags=["health"])
def health_check(db: Session = Depends(get_db)):
    """
    Confirms three things at once, which is exactly what you want to see
    green before building any real module on top of this:
    1. The FastAPI server is up and responding.
    2. The database session dependency works.
    3. A real query against SQLite succeeds.
    """
    db.execute(text("SELECT 1"))
    # Phase 9 - this endpoint is intentionally unauthenticated (it's a basic
    # liveness probe), so it must not leak connection details - "connected"
    # is all a caller needs, unlike the raw database_url this used to return.
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "database": "connected",
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "GovDocs AI backend is running. See /docs for the API explorer."}
