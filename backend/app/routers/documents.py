"""
Document Management endpoints (Phase 4).

Every route requires an authenticated user (Admin or Officer - Phase 4 does
not add role restrictions beyond "must be logged in", matching the brief's
security requirement). Auth itself is untouched - this router only consumes
the existing get_current_user dependency from Phase 2.
"""
from datetime import date as date_type, datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import ALLOWED_UPLOAD_TYPES, DEPARTMENTS
from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentStatsResponse,
    DocumentUpdate,
)
from app.services import file_storage

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
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
    stored_filename, filepath = file_storage.save_file(content, extension)

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
    return document


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
    q: str | None = Query(default=None, description="Search title, department, description"),
    department: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    upload_date: date_type | None = Query(default=None, alias="date"),
    limit: int | None = Query(default=None, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DocumentListResponse:
    query = db.query(Document)

    if q:
        like = f"%{q}%"
        query = query.filter(
            Document.title.ilike(like)
            | Document.department.ilike(like)
            | Document.description.ilike(like)
        )
    if department:
        query = query.filter(Document.department == department)
    if status_filter:
        query = query.filter(Document.status == status_filter)
    if upload_date:
        query = query.filter(func.date(Document.upload_date) == str(upload_date))

    query = query.order_by(Document.upload_date.desc())
    total = query.count()
    if limit:
        query = query.limit(limit)

    return DocumentListResponse(items=query.all(), total=total)


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

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)
    return document


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
