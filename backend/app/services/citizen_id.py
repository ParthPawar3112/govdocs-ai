"""Human-readable Citizen ID generation (CIT-000001, CIT-000002, ...).

Kept separate from the auth router so it stays independently testable, matching
how ocr_service.py / ai_service.py / search_service.py are structured here.

The raw database integer id still exists and is unchanged - this is a stable,
public-facing identity assigned only to Citizen accounts at registration. The
`users.citizen_id` column has a UNIQUE index (see app/db/migrate.py), so the
registration path retries once on IntegrityError to absorb a concurrent insert.
"""
import re

from sqlalchemy.orm import Session

from app.core.constants import CITIZEN_ID_PAD, CITIZEN_ID_PREFIX
from app.models.user import User

_PATTERN = re.compile(rf"^{re.escape(CITIZEN_ID_PREFIX)}(\d+)$")


def format_citizen_id(number: int) -> str:
    """3 -> 'CIT-000003'."""
    return f"{CITIZEN_ID_PREFIX}{number:0{CITIZEN_ID_PAD}d}"


def next_citizen_id(db: Session) -> str:
    """Highest existing CIT-nnnnnn number + 1, formatted. Scans only non-null
    citizen_id rows (a handful of Citizen accounts), so a full sequence table
    would be overkill at this scope."""
    highest = 0
    for (value,) in db.query(User.citizen_id).filter(User.citizen_id.isnot(None)).all():
        match = _PATTERN.match(value or "")
        if match:
            highest = max(highest, int(match.group(1)))
    return format_citizen_id(highest + 1)
