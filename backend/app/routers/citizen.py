"""
Citizen self-service endpoints.

A Citizen never touches the /api/documents repository routes (those are
require_staff now) or the Admin routes (require_admin) - everything here is
scoped to `Document.uploaded_by == current_user.username`, which is the same
single ownership signal the upload flow already writes. Responses are the
narrower CitizenDocumentResponse (no raw OCR, no confidence, no reviewer
identity - see app/schemas/citizen.py).

Uploading itself is done through the existing POST /api/documents/upload
(unchanged, still get_current_user) so OCR/AI kick off exactly as they do for
an Officer upload - no duplicate pipeline here.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import require_citizen
from app.models.document import Document
from app.models.user import User
from app.schemas.citizen import (
    CitizenDashboardResponse,
    CitizenDocStats,
    CitizenDocumentResponse,
)
from app.schemas.document import compute_lifecycle_status
from app.services import audit_service
from app.services import ai_status as ai_status_tracker
from app.services import ocr_status as ocr_status_tracker

router = APIRouter(prefix="/api/citizen", tags=["citizen"])

RECENT_LIMIT = 5


def _to_citizen_document(document: Document) -> CitizenDocumentResponse:
    """Map a Document ORM row to the Citizen-safe view, reading the in-memory
    OCR/AI status trackers at request time exactly like schemas/document.py's
    computed fields do."""
    ocr_state = ocr_status_tracker.get_status(document.id, document.ocr_text)
    ai_state = ai_status_tracker.get_status(document.id, document.ai_processed, document.ai_error)
    return CitizenDocumentResponse(
        id=document.id,
        title=document.title,
        department=document.department,
        description=document.description,
        original_filename=document.original_filename,
        filesize=document.filesize,
        filetype=document.filetype,
        upload_date=document.upload_date,
        status=document.status,
        ocr_status=ocr_state,
        ai_status=ai_state,
        lifecycle_status=compute_lifecycle_status(
            status=document.status, ocr_status=ocr_state, ai_status=ai_state
        ),
        ai_title=document.ai_title,
        ai_summary=document.ai_summary,
        ai_category=document.ai_category,
        ai_keywords=document.ai_keywords,
        ai_output_language=document.ai_output_language,
        officer_remarks=document.admin_remarks,
        reviewed_at=document.reviewed_at,
    )


def _own_documents(db: Session, username: str):
    return (
        db.query(Document)
        .filter(Document.uploaded_by == username)
        .order_by(Document.upload_date.desc())
    )


def _build_stats(documents: list[CitizenDocumentResponse]) -> CitizenDocStats:
    """Five citizen-facing buckets. Every document falls into exactly one, so
    total == processing + needs_correction + approved + rejected. `processing`
    means "still moving" - anything from upload through officer review that
    hasn't reached a decision yet; `awaiting_review` is the subset of that
    which has cleared OCR + AI and is now with an officer (shown as a hint,
    not its own card)."""
    stats = CitizenDocStats(
        total=len(documents),
        processing=0,
        awaiting_review=0,
        needs_correction=0,
        approved=0,
        rejected=0,
    )
    for doc in documents:
        stage = doc.lifecycle_status
        if stage == "Approved":
            stats.approved += 1
        elif stage == "Rejected":
            stats.rejected += 1
        elif stage == "Needs Correction":
            stats.needs_correction += 1
        else:
            # Uploaded / OCR Processing / OCR Failed / AI Processing / AI Failed
            # / Pending Review / anything else not yet decided.
            stats.processing += 1
            if stage == "Pending Review":
                stats.awaiting_review += 1
    return stats


@router.get("/dashboard", response_model=CitizenDashboardResponse)
def get_citizen_dashboard(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db),
) -> CitizenDashboardResponse:
    all_docs = [_to_citizen_document(d) for d in _own_documents(db, current_user.username).all()]
    return CitizenDashboardResponse(
        full_name=current_user.full_name,
        citizen_id=current_user.citizen_id,
        username=current_user.username,
        stats=_build_stats(all_docs),
        recent=all_docs[:RECENT_LIMIT],
    )


@router.get("/documents", response_model=list[CitizenDocumentResponse])
def list_citizen_documents(
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db),
) -> list[CitizenDocumentResponse]:
    return [_to_citizen_document(d) for d in _own_documents(db, current_user.username).all()]


@router.get("/documents/{document_id}", response_model=CitizenDocumentResponse)
def get_citizen_document(
    document_id: int,
    current_user: User = Depends(require_citizen),
    db: Session = Depends(get_db),
) -> CitizenDocumentResponse:
    document = db.get(Document, document_id)
    # 404 (not 403) for someone else's document - never confirm it exists.
    if document is None or document.uploaded_by != current_user.username:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    audit_service.log_action(
        db, user=current_user.username, action="Citizen Viewed Document", document_id=document_id
    )
    return _to_citizen_document(document)
