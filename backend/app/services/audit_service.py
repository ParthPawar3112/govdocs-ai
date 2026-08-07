"""
Audit Log service (Phase 8).

log_action() is called from wherever an important event actually happens
(auth router, documents router, ocr_service, ai_service) rather than
inferred after the fact - that's the only way document_id/user/action stay
accurate. Callers pass their own `db` session (the request's, or a
background task's own SessionLocal()) so this never opens a connection of
its own; it only ever adds+commits to a session that already exists.

Failure of an audit write must never break the action it's describing, so
log_action() never raises - a logging failure is logged and swallowed.
"""
import logging

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog

logger = logging.getLogger("govdocs.audit")


def log_action(
    db: Session,
    user: str,
    action: str,
    document_id: int | None = None,
    details: str | None = None,
) -> None:
    try:
        db.add(AuditLog(user=user, action=action, document_id=document_id, details=details))
        db.commit()
    except Exception:
        logger.exception(f"Failed to write audit log: user={user} action={action} document_id={document_id}")
        db.rollback()


def list_audit_logs(
    db: Session,
    *,
    user: str | None = None,
    action: str | None = None,
    document_id: int | None = None,
    page: int = 1,
    page_size: int = 25,
) -> dict:
    query = db.query(AuditLog)
    if user:
        query = query.filter(AuditLog.user == user)
    if action:
        query = query.filter(AuditLog.action == action)
    if document_id is not None:
        query = query.filter(AuditLog.document_id == document_id)

    total = query.count()
    page = max(1, page)
    items = (
        query.order_by(AuditLog.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),
    }
