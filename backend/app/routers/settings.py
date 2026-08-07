"""Settings endpoints (Phase 8). Admin-only - see app/services/settings_service.py."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.services import audit_service, settings_service

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SettingsResponse:
    return SettingsResponse(**settings_service.get_settings(db))


@router.put("", response_model=SettingsResponse)
def update_settings(
    updates: SettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SettingsResponse:
    result = settings_service.update_confidence_threshold(db, updates.ai_confidence_threshold)
    audit_service.log_action(
        db, user=current_user.username, action="Settings Updated",
        details=f"ai_confidence_threshold={updates.ai_confidence_threshold}",
    )
    return SettingsResponse(**result)
