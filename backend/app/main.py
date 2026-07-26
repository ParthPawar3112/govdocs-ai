"""
GovDocs AI - Smart Digital Documentation System
FastAPI application entrypoint - Phase 1 (Project Setup).

This phase intentionally contains ONLY:
- app startup
- CORS configuration
- a database connectivity check
- a /api/health endpoint

No routers, models, or business logic exist yet. Those arrive one
module at a time, starting with Login.
"""
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import engine, get_db

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


@app.on_event("startup")
def verify_database_on_startup() -> None:
    """
    Fails fast and loudly if the SQLite file can't be created/opened,
    instead of silently deferring the error to the first real request.
    """
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
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "database": "connected",
        "database_url": settings.DATABASE_URL,
    }


@app.get("/", tags=["health"])
def root():
    return {"message": "GovDocs AI backend is running. See /docs for the API explorer."}
