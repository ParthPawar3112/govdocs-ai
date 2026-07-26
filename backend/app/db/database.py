"""
Database engine and session management (SQLite for the hackathon MVP).

Architecture note: the ONLY SQLite-specific line is `connect_args`
below. Everything else (engine, SessionLocal, Base, get_db) is
standard SQLAlchemy and works unchanged against PostgreSQL later --
migrating is a one-line change to DATABASE_URL plus removing
`connect_args`.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# check_same_thread=False is required for SQLite when used with FastAPI,
# since FastAPI can access the DB from different threads for a single request.
# This argument is ignored/unnecessary for PostgreSQL.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """FastAPI dependency that yields a DB session and always closes it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
