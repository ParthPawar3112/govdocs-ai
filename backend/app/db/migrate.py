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


def ensure_review_columns(engine: Engine) -> None:
    """Phase 8 - Document Approval Workflow + persisted OCR failure reason."""
    _ensure_columns(
        engine,
        "documents",
        {
            "ocr_error": "TEXT",
            "admin_remarks": "TEXT",
            "reviewed_by": "VARCHAR(50)",
            "reviewed_at": "DATETIME",
        },
    )


def ensure_ai_output_language_column(engine: Engine) -> None:
    """AI output-language toggle - per-upload choice of which language
    ai_title/ai_summary are written in. Nullable, no default at the SQL
    level: existing rows get NULL, which every reader treats identically to
    "english" (see Document.ai_output_language)."""
    _ensure_columns(engine, "documents", {"ai_output_language": "VARCHAR(20)"})


def ensure_search_indexes(engine: Engine) -> None:
    """
    Phase 7 - indexes for the new filter/sort dimensions this phase adds
    (file type, AI category, AI-processed, confidence). "IF NOT EXISTS" made
    this idempotent without needing the same missing-column bookkeeping as
    _ensure_columns - SQLite already no-ops safely on a duplicate index name.

    Deliberately NOT indexing ocr_text/ai_summary/ai_title/ai_department:
    they're only ever matched with LIKE '%word%' (leading wildcard), which a
    standard B-tree index can't accelerate anyway - an index there would
    cost write performance for zero read benefit.
    """
    inspector = inspect(engine)
    if "documents" not in inspector.get_table_names():
        return  # fresh DB - nothing to retrofit

    statements = [
        "CREATE INDEX IF NOT EXISTS ix_documents_filetype ON documents (filetype)",
        "CREATE INDEX IF NOT EXISTS ix_documents_ai_category ON documents (ai_category)",
        "CREATE INDEX IF NOT EXISTS ix_documents_ai_processed ON documents (ai_processed)",
        "CREATE INDEX IF NOT EXISTS ix_documents_ai_confidence ON documents (ai_confidence)",
    ]
    with engine.connect() as connection:
        for statement in statements:
            connection.execute(text(statement))
        connection.commit()
