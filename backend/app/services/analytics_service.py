"""
Analytics service (Phase 8).

Read-only aggregate queries (COUNT/GROUP BY) over the documents table - no
new state, nothing written here. Kept separate from search_service.py since
these answer "how many/which" questions for the Analytics dashboard rather
than "which documents match" for the Documents page.
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.document import Document

UPLOADS_OVER_TIME_DAYS = 30


def get_summary(db: Session) -> dict:
    base = db.query(Document)
    today = datetime.now(timezone.utc).date()

    department_row = (
        db.query(Document.department, func.count(Document.id).label("count"))
        .group_by(Document.department)
        .order_by(func.count(Document.id).desc())
        .first()
    )
    category_row = (
        db.query(Document.ai_category, func.count(Document.id).label("count"))
        .filter(Document.ai_category.isnot(None), Document.ai_category != "")
        .group_by(Document.ai_category)
        .order_by(func.count(Document.id).desc())
        .first()
    )

    return {
        "total": base.count(),
        "uploaded_today": base.filter(func.date(Document.upload_date) == str(today)).count(),
        "pending": base.filter(Document.status == "Pending").count(),
        "approved": base.filter(Document.status == "Approved").count(),
        "rejected": base.filter(Document.status == "Rejected").count(),
        "needs_correction": base.filter(Document.status == "Needs Correction").count(),
        "archived": base.filter(Document.status == "Archived").count(),
        "ocr_success": base.filter(Document.ocr_text.isnot(None)).count(),
        "ocr_failure": base.filter(Document.ocr_text.is_(None), Document.ocr_error.isnot(None)).count(),
        "ai_success": base.filter(Document.ai_processed.is_(True)).count(),
        "ai_failure": base.filter(Document.ai_processed.is_(False), Document.ai_error.isnot(None)).count(),
        "most_common_department": department_row[0] if department_row else None,
        "most_common_category": category_row[0] if category_row else None,
    }


def get_uploads_over_time(db: Session, days: int = UPLOADS_OVER_TIME_DAYS) -> list[dict]:
    start_date = datetime.now(timezone.utc).date() - timedelta(days=days - 1)
    rows = (
        db.query(func.date(Document.upload_date).label("date"), func.count(Document.id).label("count"))
        .filter(func.date(Document.upload_date) >= str(start_date))
        .group_by("date")
        .order_by("date")
        .all()
    )
    counts_by_date = {row.date: row.count for row in rows}
    return [
        {"date": str(start_date + timedelta(days=offset)), "count": counts_by_date.get(str(start_date + timedelta(days=offset)), 0)}
        for offset in range(days)
    ]


def get_department_breakdown(db: Session) -> list[dict]:
    rows = (
        db.query(Document.department, func.count(Document.id))
        .group_by(Document.department)
        .order_by(func.count(Document.id).desc())
        .all()
    )
    return [{"label": label, "count": count} for label, count in rows]


def get_category_breakdown(db: Session) -> list[dict]:
    rows = (
        db.query(Document.ai_category, func.count(Document.id))
        .filter(Document.ai_category.isnot(None), Document.ai_category != "")
        .group_by(Document.ai_category)
        .order_by(func.count(Document.id).desc())
        .all()
    )
    return [{"label": label, "count": count} for label, count in rows]
