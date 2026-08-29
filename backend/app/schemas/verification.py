"""Request bodies for the Document Trust & Verification API ("The Bad Reading").

Responses are plain dicts assembled in app/services/verification_service.py
(full_payload / compact) - they are already flat, JSON-safe, and shaped for
the UI, so wrapping them in a response_model would only add churn."""
from pydantic import BaseModel, Field


class ReviewDecisionRequest(BaseModel):
    # verified | corroborated | needs_more_evidence | flagged  (see constants.REVIEW_DECISIONS)
    decision: str = Field(min_length=1, max_length=30)
    reason: str | None = Field(default=None, max_length=2000)
