"""
Document Management endpoints (Phase 4).

Every route requires an authenticated user (Admin or Officer - Phase 4 does
not add role restrictions beyond "must be logged in", matching the brief's
security requirement). Auth itself is untouched - this router only consumes
the existing get_current_user dependency from Phase 2.
"""
from datetime import date as date_type, datetime, timezone
import logging

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import ALLOWED_UPLOAD_TYPES, DEPARTMENTS, REVIEW_ACTION_STATUS, SORT_OPTIONS
from app.db.database import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentStatsResponse,
    DocumentUpdate,
    FilterOptionsResponse,
    ReviewRequest,
)
from app.services import audit_service, export_service, file_storage, ocr_status
from app.services import ai_status
from app.services import search_service
from app.services.ai_service import process_document_ai
from app.services.ocr_service import extract_text, process_document_ocr

logger = logging.getLogger("govdocs.documents")

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Fields on DocumentUpdate that count as "AI metadata" for audit purposes -
# used to tell a plain title/department edit apart from a Review-page
# correction to the AI's output (see update_document below).
AI_METADATA_FIELDS = {"ai_title", "ai_summary", "ai_department", "ai_category", "ai_keywords", "ai_confidence"}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    title: str = Form(..., min_length=1, max_length=255),
    department: str = Form(...),
    description: str | None = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    if department not in DEPARTMENTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Department must be one of: {', '.join(DEPARTMENTS)}",
        )

    content = await file.read()
    extension = file_storage.validate_upload(file, len(content))

    try:
        stored_filename, filepath = file_storage.save_file(content, extension)
    except OSError:
        logger.exception(f"Failed to save uploaded file for user {current_user.username}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save the uploaded file. Please try again.",
        )

    document = Document(
        title=title,
        department=department,
        description=description,
        original_filename=file.filename,
        filename=stored_filename,
        filepath=filepath,
        filesize=len(content),
        filetype=extension,
        uploaded_by=current_user.username,
        status="Pending",
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    audit_service.log_action(
        db, user=current_user.username, action="Upload", document_id=document.id, details=title,
    )

    # OCR runs after the response is sent (BackgroundTasks), so upload stays
    # fast regardless of file size. Marked "processing" synchronously, right
    # now, so the response we're about to return already reflects it
    # honestly instead of a misleading "pending" that flips a moment later.
    ocr_status.mark_processing(document.id)
    background_tasks.add_task(process_document_ocr, document.id)

    return document


@router.get("/filter-options", response_model=FilterOptionsResponse)
def get_filter_options(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FilterOptionsResponse:
    """Distinct AI categories and uploader usernames currently in the
    database, for the filter panel's dropdowns. Department/status/file-type
    dropdowns don't need this - they're fixed enums the frontend already has
    in config/departments.js."""
    categories = [
        row[0]
        for row in db.query(Document.ai_category)
        .filter(Document.ai_category.isnot(None), Document.ai_category != "")
        .distinct()
        .order_by(Document.ai_category.asc())
        .all()
    ]
    uploaders = [
        row[0]
        for row in db.query(Document.uploaded_by).distinct().order_by(Document.uploaded_by.asc()).all()
    ]
    return FilterOptionsResponse(categories=categories, uploaded_by=uploaders)


@router.get("/stats", response_model=DocumentStatsResponse)
def get_document_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentStatsResponse:
    today = datetime.now(timezone.utc).date()
    base = db.query(Document)
    return DocumentStatsResponse(
        total=base.count(),
        uploaded_today=base.filter(func.date(Document.upload_date) == str(today)).count(),
        pending=base.filter(Document.status == "Pending").count(),
        approved=base.filter(Document.status == "Approved").count(),
        rejected=base.filter(Document.status == "Rejected").count(),
    )


@router.get("", response_model=DocumentListResponse)
def list_documents(
    q: str | None = Query(
        default=None,
        description="Searches filename, OCR text, AI title/summary/category/department/keywords",
    ),
    category: str | None = Query(default=None, description="Filters on AI-assigned category"),
    department: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    file_type: str | None = Query(default=None),
    uploaded_by: str | None = Query(default=None),
    ai_processed: bool | None = Query(default=None),
    ocr_processed: bool | None = Query(default=None),
    upload_date: date_type | None = Query(default=None, alias="date"),
    date_from: date_type | None = Query(default=None),
    date_to: date_type | None = Query(default=None),
    min_confidence: float | None = Query(default=None, ge=0, le=100),
    max_confidence: float | None = Query(default=None, ge=0, le=100),
    sort: str | None = Query(default=None, description=f"One of: {', '.join(SORT_OPTIONS)}"),
    page: int = Query(default=1, ge=1),
    limit: int | None = Query(default=None, ge=1, le=200, description="Page size"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    if sort and sort not in SORT_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"sort must be one of: {', '.join(SORT_OPTIONS)}",
        )

    result = search_service.search_documents(
        db,
        q=q,
        category=category,
        department=department,
        status=status_filter,
        file_type=file_type,
        uploaded_by=uploaded_by,
        ai_processed=ai_processed,
        ocr_processed=ocr_processed,
        date=upload_date,
        date_from=date_from,
        date_to=date_to,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
        sort=sort,
        page=page,
        page_size=limit,
    )
    return DocumentListResponse(**result)


@router.get("/download/{document_id}")
def download_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    content = file_storage.read_file(document.filepath)
    audit_service.log_action(db, user=current_user.username, action="Downloaded", document_id=document_id)
    media_type = ALLOWED_UPLOAD_TYPES.get(document.filetype, "application/octet-stream")
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{document.original_filename}"'},
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.post("/{document_id}/extract-text", response_model=DocumentResponse)
def extract_document_text(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    """
    Manual (re)run of OCR - used both to retry a failed automatic run and to
    process documents that predate this phase. Synchronous by design: this
    is a single user-initiated action worth waiting a few seconds for a
    definitive answer, unlike the upload flow which must never block.

    On success, schedules AI metadata extraction (Phase 6) as a real
    BackgroundTask - same trigger condition as the automatic upload path
    ("begins immediately after OCR completes successfully"), but genuinely
    non-blocking here since this endpoint itself stays synchronous.
    """
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    ocr_status.mark_processing(document_id)
    audit_service.log_action(db, user=current_user.username, action="OCR Started", document_id=document_id)
    try:
        document.ocr_text = extract_text(document.filepath, document.filetype)
        document.ocr_error = None
        db.commit()
        db.refresh(document)
        ocr_status.mark_done(document_id)
        audit_service.log_action(
            db, user=current_user.username, action="OCR Completed", document_id=document_id,
        )

        ai_status.mark_processing(document_id)
        background_tasks.add_task(process_document_ai, document_id)

        return document
    except Exception as exc:
        logger.exception(f"Manual OCR retry failed for document {document_id}")
        ocr_status.mark_failed(document_id)
        document.ocr_error = str(exc)[:1000]
        db.commit()
        audit_service.log_action(
            db, user=current_user.username, action="OCR Failed", document_id=document_id,
            details=str(exc)[:500],
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to extract text. Please try again.",
        )


@router.post("/{document_id}/extract-metadata", response_model=DocumentResponse)
def extract_document_metadata(
    document_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    """
    Manual (re)run of AI metadata extraction - the Retry action for a failed
    AI run, or for backfilling documents that predate this phase. Schedules
    a background task (unlike OCR's manual retry, an LLM call can be slow
    enough that it's worth keeping this endpoint itself fast) and returns
    the document immediately showing ai_status="processing"; the frontend
    polls GET /documents/{id} the same way it already does for OCR.
    """
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if not document.ocr_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This document has no OCR text yet - extract text first.",
        )

    document.ai_error = None
    db.commit()
    db.refresh(document)

    ai_status.mark_processing(document_id)
    background_tasks.add_task(process_document_ai, document_id)

    return document


@router.put("/{document_id}", response_model=DocumentResponse)
def update_document(
    document_id: int,
    updates: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Document:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    changed_fields = updates.model_dump(exclude_unset=True)
    for field, value in changed_fields.items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)

    if AI_METADATA_FIELDS & changed_fields.keys():
        audit_service.log_action(
            db, user=current_user.username, action="Metadata Edited", document_id=document_id,
            details=", ".join(sorted(AI_METADATA_FIELDS & changed_fields.keys())),
        )
    return document


@router.post("/{document_id}/review", response_model=DocumentResponse)
def review_document(
    document_id: int,
    review: ReviewRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Document:
    """
    Document Approval Workflow (Phase 8) - Admin decision on a document
    that's finished OCR+AI processing. Approve/Reject/Send Back all follow
    the same shape: set status, record who/when/why, log it, done. Doesn't
    require ai_status to be "completed" first - an admin may still need to
    reject/send-back a document whose AI analysis failed.
    """
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    new_status = REVIEW_ACTION_STATUS[review.action]
    document.status = new_status
    document.admin_remarks = review.remarks
    document.reviewed_by = current_user.username
    document.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(document)

    audit_action = {"approve": "Approved", "reject": "Rejected", "send_back": "Sent Back for Corrections"}[
        review.action
    ]
    audit_service.log_action(
        db, user=current_user.username, action=audit_action, document_id=document_id, details=review.remarks,
    )
    return document


@router.post("/{document_id}/archive", response_model=DocumentResponse)
def archive_document(
    document_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Document:
    """Moves a reviewed document out of the active workflow. Only meaningful
    once a decision has already been made - archiving a still-Pending
    document would hide it from the review queue with no reviewer of record."""
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    if document.status not in ("Approved", "Rejected"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only Approved or Rejected documents can be archived.",
        )

    document.status = "Archived"
    db.commit()
    db.refresh(document)
    audit_service.log_action(db, user=current_user.username, action="Archived", document_id=document_id)
    return document


@router.get("/{document_id}/export/summary-pdf")
def export_summary_pdf(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    """Phase 8 - a one-page PDF snapshot of a document's title, status, OCR
    excerpt, and AI metadata, for offline records/handoff."""
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    pdf_bytes = export_service.generate_summary_pdf(document)
    audit_service.log_action(db, user=current_user.username, action="Downloaded", document_id=document_id, details="Summary PDF")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{document.title}-summary.pdf"'},
    )


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_storage.delete_file(document.filepath)
    db.delete(document)
    db.commit()
    audit_service.log_action(db, user=current_user.username, action="Deleted", document_id=document_id)
