"""
File storage for uploaded documents.

Handles validation (type + size), generates collision-proof filenames, and
saves/deletes files under backend/uploads/. Kept as a thin service so the
router stays focused on HTTP concerns and this logic is swappable (e.g. for
S3) without touching route handlers - same pattern used by every other
service in this codebase.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.core.constants import ALLOWED_UPLOAD_TYPES

MAX_UPLOAD_SIZE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _upload_dir() -> Path:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _extension_of(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_upload(file: UploadFile, size_bytes: int) -> str:
    """Returns the validated lowercase extension, or raises a 400/413."""
    extension = _extension_of(file.filename or "")
    if extension not in ALLOWED_UPLOAD_TYPES:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_TYPES)).upper()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {allowed}",
        )
    if size_bytes > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )
    if size_bytes == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")
    return extension


def save_file(content: bytes, extension: str) -> tuple[str, str]:
    """Writes bytes to a UUID-named file. Returns (stored_filename, filepath).
    UUID naming makes duplicate-filename collisions structurally impossible
    without needing a separate uniqueness check against the database."""
    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    filepath = _upload_dir() / stored_filename
    filepath.write_bytes(content)
    return stored_filename, str(filepath)


def delete_file(filepath: str) -> None:
    """Best-effort delete - a missing file on disk shouldn't block deleting
    the database record (e.g. if it was already manually removed)."""
    path = Path(filepath)
    if path.exists():
        path.unlink()


def read_file(filepath: str) -> bytes:
    path = Path(filepath)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")
    return path.read_bytes()
