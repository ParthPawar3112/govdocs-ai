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

# Phase 9 - magic-byte signatures for the 4 allowed types, checked against the
# actual uploaded bytes (not just the filename extension) so a renamed file
# (e.g. malicious.exe -> scan.pdf) is rejected instead of trusted. Kept
# dependency-free (stdlib only) - a real content-type sniffing library
# (python-magic) needs libmagic, a C library that's awkward to install on
# Windows, which this project has consistently avoided elsewhere (pymupdf
# over poppler, pytesseract over easyocr) for the same reason.
_FILE_SIGNATURES: dict[str, tuple[bytes, ...]] = {
    "pdf": (b"%PDF-",),
    "jpg": (b"\xff\xd8\xff",),
    "jpeg": (b"\xff\xd8\xff",),
    "png": (b"\x89PNG\r\n\x1a\n",),
}


def _content_matches_extension(content: bytes, extension: str) -> bool:
    signatures = _FILE_SIGNATURES.get(extension)
    if not signatures:
        return True  # no signature registered for this extension - nothing to check
    return any(content.startswith(signature) for signature in signatures)


def _upload_dir() -> Path:
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _extension_of(filename: str) -> str:
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def validate_upload(file: UploadFile, content: bytes) -> str:
    """Returns the validated lowercase extension, or raises a 400/413."""
    extension = _extension_of(file.filename or "")
    if extension not in ALLOWED_UPLOAD_TYPES:
        allowed = ", ".join(sorted(ALLOWED_UPLOAD_TYPES)).upper()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed types: {allowed}",
        )
    size_bytes = len(content)
    if size_bytes > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )
    if size_bytes == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")
    if not _content_matches_extension(content, extension):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content does not match its extension. The file may be corrupted or mislabeled.",
        )
    return extension


def save_file(content: bytes, extension: str) -> tuple[str, str]:
    """Writes bytes to a UUID-named file. Returns (stored_filename, filepath).
    UUID naming makes duplicate-filename collisions structurally impossible
    without needing a separate uniqueness check against the database - and,
    since it never incorporates any user-supplied string, makes path
    traversal via the filename structurally impossible too."""
    stored_filename = f"{uuid.uuid4().hex}.{extension}"
    filepath = _upload_dir() / stored_filename
    filepath.write_bytes(content)
    return stored_filename, str(filepath)


def _resolve_within_upload_dir(filepath: str) -> Path | None:
    """Defense in depth (Phase 9): `filepath` only ever comes from a
    Document row, which only ever gets it from save_file() above - so this
    is currently unreachable, not a fix for a live bug. It guards against
    any *future* code path that constructs a Document.filepath differently
    (a migration, a bulk import) ever resulting in a read/delete outside
    UPLOAD_DIR. Returns None if the resolved path escapes the upload root,
    which callers treat identically to "file not found"."""
    resolved = Path(filepath).resolve()
    upload_root = _upload_dir().resolve()
    if not resolved.is_relative_to(upload_root):
        return None
    return resolved


def delete_file(filepath: str) -> None:
    """Best-effort delete - a missing file on disk shouldn't block deleting
    the database record (e.g. if it was already manually removed)."""
    path = _resolve_within_upload_dir(filepath)
    if path and path.exists():
        path.unlink()


def read_file(filepath: str) -> bytes:
    path = _resolve_within_upload_dir(filepath)
    if path is None or not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk")
    return path.read_bytes()
