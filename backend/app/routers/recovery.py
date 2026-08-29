"""
Blackout / Recovery Center endpoints ("The Blackout" challenge).

Admin-only. These drive a lightweight, fully-resettable disaster-recovery
demo - see app/services/blackout.py. Nothing here deletes or corrupts the
real database: a blackout is a persisted status flag that the document-write
guard checks, and recovery restores rows from a verified JSON snapshot.
"""
from fastapi import APIRouter, BackgroundTasks, Body, Depends

from app.dependencies.auth import require_admin
from app.models.user import User
from app.services import blackout

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


@router.get("/status")
def recovery_status(current_user: User = Depends(require_admin)) -> dict:
    """Everything the Recovery Center renders, in one call."""
    return blackout.get_status()


@router.post("/snapshot")
def create_snapshot(current_user: User = Depends(require_admin)) -> dict:
    return {"ok": True, "snapshot": blackout.create_snapshot()}


@router.get("/snapshot/verify")
def verify_snapshot(current_user: User = Depends(require_admin)) -> dict:
    return blackout.verify_snapshot()


@router.post("/simulate-blackout")
def simulate_blackout(current_user: User = Depends(require_admin)) -> dict:
    """DEMO ONLY - marks the primary data store corrupted so writes fail and
    recovery mode activates. No production data is destroyed."""
    return blackout.simulate_blackout(user=current_user.username)


@router.post("/run-recovery")
def run_recovery(current_user: User = Depends(require_admin)) -> dict:
    return blackout.run_recovery(user=current_user.username)


@router.get("/inflight")
def list_inflight(current_user: User = Depends(require_admin)) -> list:
    return blackout.get_status()["inflight"]


@router.post("/reconcile")
def reconcile(
    background_tasks: BackgroundTasks,
    payload: dict = Body(..., example={"op_id": "BLACKOUT-OP-0001", "action": "retry"}),
    current_user: User = Depends(require_admin),
) -> dict:
    return blackout.reconcile(
        payload.get("op_id"),
        payload.get("action"),
        schedule=background_tasks.add_task,
        user=current_user.username,
    )


@router.post("/reset")
def reset_demo(current_user: User = Depends(require_admin)) -> dict:
    return blackout.reset_demo(user=current_user.username)


@router.get("/events")
def list_events(current_user: User = Depends(require_admin)) -> list:
    return blackout.get_events()[::-1]


@router.get("/journal")
def list_journal(current_user: User = Depends(require_admin)) -> list:
    return blackout._load_journal()[::-1]  # noqa: SLF001 - internal reader, admin-only
