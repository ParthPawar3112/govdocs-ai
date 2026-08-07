"""Audit Log endpoints (Phase 8). Admin-only - see app/services/audit_service.py."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.audit import AuditLogListResponse
from app.services import audit_service

router = APIRouter(prefix="/api/audit-logs", tags=["audit"])


@router.get("", response_model=AuditLogListResponse)
def list_audit_logs(
    user: str | None = Query(default=None, description="Filter by acting username"),
    action: str | None = Query(default=None, description="Filter by action label"),
    document_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AuditLogListResponse:
    result = audit_service.list_audit_logs(
        db, user=user, action=action, document_id=document_id, page=page, page_size=page_size
    )
    return AuditLogListResponse(**result)
