"""Analytics dashboard endpoints (Phase 8). Admin-only - see app/services/analytics_service.py."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.analytics import AnalyticsSummaryResponse, BreakdownEntry, UploadsOverTimePoint
from app.services import analytics_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_summary(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AnalyticsSummaryResponse:
    return AnalyticsSummaryResponse(**analytics_service.get_summary(db))


@router.get("/uploads-over-time", response_model=list[UploadsOverTimePoint])
def get_uploads_over_time(
    days: int = Query(default=30, ge=1, le=180),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UploadsOverTimePoint]:
    return analytics_service.get_uploads_over_time(db, days=days)


@router.get("/departments", response_model=list[BreakdownEntry])
def get_department_breakdown(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[BreakdownEntry]:
    return analytics_service.get_department_breakdown(db)


@router.get("/categories", response_model=list[BreakdownEntry])
def get_category_breakdown(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[BreakdownEntry]:
    return analytics_service.get_category_breakdown(db)
