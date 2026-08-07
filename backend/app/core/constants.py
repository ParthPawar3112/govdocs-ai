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

DOCUMENT_STATUSES = ("Pending", "Approved", "Rejected", "Needs Correction", "Archived")

# Phase 8 - Document Approval Workflow review actions.
REVIEW_ACTIONS = ("approve", "reject", "send_back")
REVIEW_ACTION_STATUS = {
    "approve": "Approved",
    "reject": "Rejected",
    "send_back": "Needs Correction",
}

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

# Phase 8 - Audit Log action labels. Not enforced at the DB layer (audit_logs.action
# is a plain string) - kept here so every call site uses the same wording.
AUDIT_ACTIONS = (
    "Login",
    "Upload",
    "OCR Started",
    "OCR Completed",
    "OCR Failed",
    "AI Started",
    "AI Completed",
    "AI Failed",
    "Metadata Edited",
    "Approved",
    "Rejected",
    "Sent Back for Corrections",
    "Archived",
    "Downloaded",
    "Deleted",
    "Settings Updated",
)

DEFAULT_AI_CONFIDENCE_THRESHOLD = 60.0
