"""
Document Trust & Verification layer ("The Bad Reading" challenge).

Four brand-new tables, so Base.metadata.create_all() on startup creates them
(same as audit_logs - see app/db/migrate.py for why that is NOT true of new
columns on the pre-existing `documents` table). The only column added to
`documents` itself is `file_sha256`, retrofitted by
ensure_document_provenance_columns().

Design principle: this layer records EVIDENCE and SIGNALS about a document's
reliability. It never asserts absolute truth. A verification_status is a
classification (VERIFIED / CORROBORATED / NEEDS_REVIEW / FLAGGED /
UNVERIFIED) backed by explainable reasons, and a human reviewer always has
the final say.
"""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class DocumentVerification(Base):
    """One row per document - its provenance, trust assessment and review state."""

    __tablename__ = "document_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    # Base classification: UNVERIFIED | VERIFIED | CORROBORATED | NEEDS_REVIEW | FLAGGED.
    # The *displayed* status is OUTDATED when currency_status == "outdated" and
    # the base is not FLAGGED - see verification_service._effective_status.
    verification_status: Mapped[str] = mapped_column(String(20), nullable=False, default="UNVERIFIED", index=True)

    # "current" | "outdated" - whether this document is still the operative one
    # for its scheme/subject (Feature 7). Kept separate from verification_status
    # so a document can be both accurate AND superseded.
    currency_status: Mapped[str] = mapped_column(String(15), nullable=False, default="current")
    superseded_by_document_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    superseded_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Explainable assessment - NOT a proof of truth. 0-100.
    trust_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    trust_band: Mapped[str | None] = mapped_column(String(20), nullable=True)  # High / Moderate / Low / Very Low

    # official | departmental | trusted_external | user_submitted | unknown
    source_type: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown", index=True)

    # Provenance captured at upload (any may be absent -> shown as "Unknown").
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_reference_no: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_published_date: Mapped[str | None] = mapped_column(String(40), nullable=True)  # free-form / ISO
    issuing_organization: Mapped[str | None] = mapped_column(String(160), nullable=True)

    # Explanation surfaced to users.
    reasons: Mapped[list | None] = mapped_column(JSON, nullable=True)          # ["Source could not be confirmed", ...]
    risk_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)     # [{"code","label","severity"}]
    evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)         # {"corroborating":[...],"contradicting":[...]}
    signals: Mapped[dict | None] = mapped_column(JSON, nullable=True)          # raw computed sub-scores
    ai_assessment: Mapped[dict | None] = mapped_column(JSON, nullable=True)    # Gemini's reliability read (never authoritative)

    analysis_method: Mapped[str | None] = mapped_column(String(30), nullable=True)  # "ai" | "heuristic" | "mixed"
    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Human-in-the-loop review.
    review_status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_submitted")  # not_submitted | pending_review | resolved
    submitted_by: Mapped[str | None] = mapped_column(String(50), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer: Mapped[str | None] = mapped_column(String(50), nullable=True)
    reviewer_decision: Mapped[str | None] = mapped_column(String(30), nullable=True)
    reviewer_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class DocumentClaim(Base):
    """A single factual claim extracted from a document's text."""

    __tablename__ = "document_claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    claim_text: Mapped[str] = mapped_column(Text, nullable=False)
    # monetary | eligibility | date | policy | statistic | deadline | contact | other
    claim_type: Mapped[str] = mapped_column(String(30), nullable=False, default="other", index=True)

    entities: Mapped[list | None] = mapped_column(JSON, nullable=True)
    dates: Mapped[list | None] = mapped_column(JSON, nullable=True)
    amounts: Mapped[list | None] = mapped_column(JSON, nullable=True)
    percentages: Mapped[list | None] = mapped_column(JSON, nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    scheme_name: Mapped[str | None] = mapped_column(String(200), nullable=True, index=True)
    issuing_organization: Mapped[str | None] = mapped_column(String(200), nullable=True)
    reference_number: Mapped[str | None] = mapped_column(String(120), nullable=True)

    ai_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    # UNVERIFIED | CORROBORATED | NEEDS_REVIEW | FLAGGED
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="UNVERIFIED", index=True)
    extraction_method: Mapped[str | None] = mapped_column(String(20), nullable=True)  # ai | heuristic

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ClaimContradiction(Base):
    """A detected conflict between a claim and another stored claim/document."""

    __tablename__ = "claim_contradictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    claim_id: Mapped[int] = mapped_column(ForeignKey("document_claims.id", ondelete="CASCADE"), nullable=False)
    other_document_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    other_claim_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    field: Mapped[str] = mapped_column(String(40), nullable=False)  # amount | date | eligibility | status
    value_a: Mapped[str | None] = mapped_column(String(300), nullable=True)
    value_b: Mapped[str | None] = mapped_column(String(300), nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    # NEEDS_HUMAN_REVIEW | RESOLVED_BY_AUTHORITY | DISMISSED
    resolution: Mapped[str] = mapped_column(String(30), nullable=False, default="NEEDS_HUMAN_REVIEW")
    resolved_by: Mapped[str | None] = mapped_column(String(50), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class VerificationEvent(Base):
    """Append-only trust/verification history for one document - a scoped,
    user-visible complement to the admin-only audit_logs table."""

    __tablename__ = "verification_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    actor: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
