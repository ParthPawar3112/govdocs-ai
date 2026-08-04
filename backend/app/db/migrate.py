"""
Lightweight schema migrations.

SQLite + Base.metadata.create_all() only creates tables that don't exist
yet - it will NOT add new columns to a `documents` table that already
existed from an earlier phase. Anyone with real uploaded documents from
before a given phase would hit "no such column: ..." on first request
without this. This runs once at startup, checks which columns are already
there, and adds whatever's missing - existing rows and files are untouched.

Not a full migration framework (Alembic would be the real-world choice at
scale) - deliberately minimal, matching this project's hackathon-MVP scope.
"""
from sqlalchemy import Engine, inspect, text


def _ensure_columns(engine: Engine, table: str, column_defs: dict[str, str]) -> None:
    """column_defs maps column name -> SQL type clause, e.g. {"ocr_text": "TEXT"}."""
    inspector = inspect(engine)
    if table not in inspector.get_table_names():
        return  # fresh DB - create_all() will include these columns already

    existing = {col["name"] for col in inspector.get_columns(table)}
    missing = {name: sql_type for name, sql_type in column_defs.items() if name not in existing}
    if not missing:
        return

    with engine.connect() as connection:
        for name, sql_type in missing.items():
            connection.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {sql_type}"))
        connection.commit()


def ensure_ocr_text_column(engine: Engine) -> None:
    """Phase 5."""
    _ensure_columns(engine, "documents", {"ocr_text": "TEXT"})


def ensure_ai_metadata_columns(engine: Engine) -> None:
    """Phase 6 - exactly the 8 fields that phase specifies."""
    _ensure_columns(
        engine,
        "documents",
        {
            "ai_title": "VARCHAR(255)",
            "ai_summary": "TEXT",
            "ai_department": "VARCHAR(100)",
            "ai_category": "VARCHAR(100)",
            "ai_keywords": "JSON",
            "ai_confidence": "FLOAT",
            "ai_processed": "BOOLEAN DEFAULT 0",
            "ai_error": "TEXT",
        },
    )
