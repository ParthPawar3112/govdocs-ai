"""Shared constants for the Document Management module (Phase 4)."""

# Application roles. "Admin"/"Officer" are seeded; "Citizen" is created via the
# public POST /api/auth/register flow. Casing is significant - RBAC checks
# compare against these exact strings.
ROLES = ("Admin", "Officer", "Citizen")
STAFF_ROLES = ("Admin", "Officer")

# Human-readable public identity for Citizen accounts - CIT-000001, CIT-000002...
# (6-digit zero-padded). See app/services/citizen_id.py.
CITIZEN_ID_PREFIX = "CIT-"
CITIZEN_ID_PAD = 6

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
    "Citizen Registered",
    "Citizen Viewed Document",
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
    "Password Changed",
    # Document Trust & Verification ("The Bad Reading").
    "Verification Completed",
    "Verification Failed",
    "Sent for Trust Review",
    "Trust Review Decision",
)

DEFAULT_AI_CONFIDENCE_THRESHOLD = 60.0

# --------------------------------------------------------------------------- #
# Document Trust & Verification ("The Bad Reading" challenge)                   #
# --------------------------------------------------------------------------- #
# A verification_status is an EVIDENCE-BASED CLASSIFICATION, never a claim of
# absolute truth. Uncertain information stays explicitly uncertain.
VERIFICATION_STATUSES = ("VERIFIED", "CORROBORATED", "NEEDS_REVIEW", "FLAGGED", "OUTDATED", "UNVERIFIED")

SOURCE_TYPES = ("official", "departmental", "trusted_external", "user_submitted", "unknown")
SOURCE_TYPE_LABELS = {
    "official": "Official source",
    "departmental": "Departmental source",
    "trusted_external": "Trusted external source",
    "user_submitted": "User-submitted source",
    "unknown": "Unknown source",
}
# Points contributed to the trust assessment by source authority.
SOURCE_TYPE_AUTHORITY = {
    "official": 30,
    "departmental": 20,
    "trusted_external": 12,
    "user_submitted": 0,
    "unknown": -10,
}

CLAIM_TYPES = (
    "monetary", "eligibility", "date", "deadline", "policy", "statistic", "contact", "other",
)

# Reviewer decisions in the human-in-the-loop workflow -> resulting base status.
# "mark_outdated" is special: it sets currency_status="outdated" and leaves the
# base classification untouched (a document can be accurate but superseded).
REVIEW_DECISIONS = {
    "verified": "VERIFIED",
    "corroborated": "CORROBORATED",
    "needs_more_evidence": "NEEDS_REVIEW",
    "flagged": "FLAGGED",
    "mark_outdated": None,
}

# Language that marks a document as replacing earlier guidance (Feature 7).
SUPERSEDE_TOKENS = (
    "supersedes", "superseded", "in supersession", "supersession of",
    "replaces the earlier", "replaces earlier", "in modification of",
    "revised guidance", "revision no", "amendment to circular",
    "deadline extended", "date extended", "extended to", "revised deadline",
)

# Tokens that, in a government-document context, are weak signals of an
# informal forward / manipulated notice rather than an issued document.
SUSPICIOUS_CONTENT_TOKENS = (
    "forwarded as received", "forwarded message", "whatsapp", "viral", "share widely",
    "share this", "please forward", "fwd:", "breaking", "urgent alert", "govt alert",
    "limited period", "act now", "before it is deleted", "before it's deleted",
    "click here to claim", "register now to get", "100% guaranteed",
)

# AI output-language toggle - which language ai_title/ai_summary are written
# in (see app/services/ai_service.py LANGUAGE_INSTRUCTIONS). Deliberately
# separate from OCR_LANGUAGE in config.py, which controls what Tesseract
# recognizes in the source image, not what Gemini writes in its output.
AI_OUTPUT_LANGUAGES = ("english", "marathi")
