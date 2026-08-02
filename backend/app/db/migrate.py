"""
Lightweight schema migrations.

SQLite + Base.metadata.create_all() only creates tables that don't exist
yet - it will NOT add a new column to a `documents` table that was already
created by Phase 4. Anyone with real uploaded documents from before this
phase would hit "no such column: documents.ocr_text" on first request
without this. This runs once at startup, checks whether the column is
already there, and adds it if not - existing rows and files are untouched.

Not a full migration framework (Alembic would be the real-world choice at
scale) - deliberately minimal, matching this project's hackathon-MVP scope.
"""
from sqlalchemy import Engine, inspect, text


def ensure_ocr_text_column(engine: Engine) -> None:
    inspector = inspect(engine)
    if "documents" not in inspector.get_table_names():
        return  # fresh DB - create_all() will include the column already

    columns = {col["name"] for col in inspector.get_columns("documents")}
    if "ocr_text" in columns:
        return

    with engine.connect() as connection:
        connection.execute(text("ALTER TABLE documents ADD COLUMN ocr_text TEXT"))
        connection.commit()
