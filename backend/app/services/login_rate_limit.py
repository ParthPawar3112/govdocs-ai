"""
Basic login rate limiting (Phase 9), keyed by username.

In-memory only, mirroring the same lightweight tracker pattern already used
by ocr_status.py/ai_status.py in this codebase - no new dependency, no new
infrastructure (Redis, etc.). Resets on server restart, which is an
acceptable tradeoff for a single-process hackathon-scale deployment: a
restarted server has no "recent attempts" to protect against anyway, and a
real distributed deployment would need shared storage this simple approach
deliberately doesn't attempt to provide.
"""
from datetime import datetime, timedelta, timezone

MAX_ATTEMPTS = 5
LOCKOUT_MINUTES = 5

_failed_attempts: dict[str, list[datetime]] = {}


def _recent_failures(username: str, now: datetime) -> list[datetime]:
    window_start = now - timedelta(minutes=LOCKOUT_MINUTES)
    attempts = [attempt for attempt in _failed_attempts.get(username, []) if attempt > window_start]
    _failed_attempts[username] = attempts
    return attempts


def is_locked_out(username: str) -> bool:
    return len(_recent_failures(username, datetime.now(timezone.utc))) >= MAX_ATTEMPTS


def record_failure(username: str) -> None:
    now = datetime.now(timezone.utc)
    _recent_failures(username, now)
    _failed_attempts.setdefault(username, []).append(now)


def record_success(username: str) -> None:
    _failed_attempts.pop(username, None)
