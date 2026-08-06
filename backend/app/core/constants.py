"""Shared constants for the Document Management module (Phase 4)."""

DEPARTMENTS = (
    "Revenue",
    "Education",
    "Health",
    "Agriculture",
    "Police",
    "Municipal",
    "Finance",
    "General Administration",
)

DOCUMENT_STATUSES = ("Pending", "Approved", "Rejected")

# Extension -> MIME type, used both to validate uploads and to set the
# correct Content-Type when serving a file back for download/preview.
ALLOWED_UPLOAD_TYPES = {
    "pdf": "application/pdf",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
}

# Phase 7 - Smart Search sort options.
SORT_OPTIONS = ("newest", "oldest", "name", "category", "department", "confidence")
DEFAULT_PAGE_SIZE = 20
