"""
Smart Search & Advanced Retrieval (Phase 7).

Search strategy, two stages:

1. SQL-level, tokenized: the query is split into words, and a document
   matches only if EVERY word appears (case-insensitive substring) SOMEWHERE
   across the searchable fields - not necessarily the same field, not
   necessarily in order. This is what makes "Birth Certificate" match a
   document whose OCR text contains "...Government Birth Certificate..." or
   whose AI title is "Certificate of Birth" (word order doesn't matter).
   Runs entirely in SQL, so it scales fine and is the fast, common path.

2. Fuzzy fallback: only runs when stage 1 finds nothing AND a query was
   given. Pulls a bounded candidate pool (other filters still applied) and
   scores each with rapidfuzz - this is what catches typos ("brith" ->
   "birth") and heavier rewording that substring matching can't. Bounded and
   only triggered on the zero-result case specifically so it never adds cost
   to the common case, per the brief's "avoid unnecessary scans" requirement.

Kept in its own module, not the router, matching how ocr_service.py and
ai_service.py are structured in this codebase - the router stays a thin
HTTP layer, this stays independently testable.
"""
import re
from datetime import date as date_type

from rapidfuzz import fuzz
from sqlalchemy import String, and_, cast, func, or_
from sqlalchemy.orm import Session

from app.core.constants import DEFAULT_PAGE_SIZE
from app.models.document import Document

FUZZY_CANDIDATE_CAP = 1000
FUZZY_SCORE_THRESHOLD = 60

TEXT_SEARCH_COLUMNS = [
    Document.title,
    Document.description,  # kept from Phase 4 - the brief's 7 fields are additive, not exclusive
    Document.original_filename,
    Document.ocr_text,
    Document.ai_title,
    Document.ai_summary,
    Document.ai_category,
    Document.ai_department,
    cast(Document.ai_keywords, String),
]

BLOB_ATTRS = (
    "title",
    "description",
    "original_filename",
    "ocr_text",
    "ai_title",
    "ai_summary",
    "ai_category",
    "ai_department",
)

SORT_MAP = {
    "newest": lambda: Document.upload_date.desc(),
    "oldest": lambda: Document.upload_date.asc(),
    "name": lambda: Document.title.asc(),
    "category": lambda: Document.ai_category.asc().nulls_last(),
    "department": lambda: Document.department.asc(),
    "confidence": lambda: Document.ai_confidence.desc().nulls_last(),
}


def _tokenize(query: str) -> list[str]:
    return [token for token in re.split(r"\s+", query.strip()) if token]


def _token_condition(token: str):
    like = f"%{token}%"
    return or_(*[column.ilike(like) for column in TEXT_SEARCH_COLUMNS])


def apply_text_search(query, q: str):
    """Stage 1. Every token must match somewhere - AND across tokens,
    OR across fields for each token."""
    tokens = _tokenize(q)
    if not tokens:
        return query
    return query.filter(and_(*[_token_condition(token) for token in tokens]))


def apply_filters(
    query,
    *,
    category: str | None = None,
    department: str | None = None,
    status: str | None = None,
    file_type: str | None = None,
    uploaded_by: str | None = None,
    ai_processed: bool | None = None,
    ocr_processed: bool | None = None,
    date: date_type | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    min_confidence: float | None = None,
    max_confidence: float | None = None,
):
    """All equality/range filters - independent of text search, and cheap
    since they hit indexed columns (see app/db/migrate.py for the Phase 7
    indexes added on filetype, ai_category, ai_processed)."""
    if category:
        query = query.filter(Document.ai_category == category)
    if department:
        query = query.filter(Document.department == department)
    if status:
        query = query.filter(Document.status == status)
    if file_type:
        query = query.filter(Document.filetype == file_type)
    if uploaded_by:
        query = query.filter(Document.uploaded_by == uploaded_by)
    if ai_processed is not None:
        query = query.filter(Document.ai_processed == ai_processed)
    if ocr_processed is not None:
        query = query.filter(
            Document.ocr_text.isnot(None) if ocr_processed else Document.ocr_text.is_(None)
        )
    if date:
        query = query.filter(func.date(Document.upload_date) == str(date))
    if date_from:
        query = query.filter(func.date(Document.upload_date) >= str(date_from))
    if date_to:
        query = query.filter(func.date(Document.upload_date) <= str(date_to))
    if min_confidence is not None:
        query = query.filter(Document.ai_confidence >= min_confidence)
    if max_confidence is not None:
        query = query.filter(Document.ai_confidence <= max_confidence)
    return query


def _document_blob(document: Document) -> str:
    parts = [getattr(document, attr) or "" for attr in BLOB_ATTRS]
    if document.ai_keywords:
        parts.append(" ".join(document.ai_keywords))
    return " ".join(parts)


def _fuzzy_fallback(candidates: list[Document], q: str) -> list[Document]:
    scored = []
    for document in candidates:
        blob = _document_blob(document)
        if not blob:
            continue
        score = max(fuzz.token_set_ratio(q, blob), fuzz.partial_ratio(q, blob))
        if score >= FUZZY_SCORE_THRESHOLD:
            scored.append((document, score))
    scored.sort(key=lambda pair: pair[1], reverse=True)
    return [document for document, _score in scored]


def search_documents(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    department: str | None = None,
    status: str | None = None,
    file_type: str | None = None,
    uploaded_by: str | None = None,
    ai_processed: bool | None = None,
    ocr_processed: bool | None = None,
    date: date_type | None = None,
    date_from: date_type | None = None,
    date_to: date_type | None = None,
    min_confidence: float | None = None,
    max_confidence: float | None = None,
    sort: str | None = None,
    page: int = 1,
    page_size: int | None = None,
) -> dict:
    """Returns items (already paginated), total (matching current filters),
    overall_total (system-wide, ignoring filters), ai_processed_count and
    ocr_processed_count (within the filtered set), plus page/page_size/
    total_pages - everything the frontend's stats bar and pagination
    controls need in one call."""
    page = max(1, page)
    page_size = page_size or DEFAULT_PAGE_SIZE

    overall_total = db.query(Document).count()

    filtered_query = apply_filters(
        db.query(Document),
        category=category,
        department=department,
        status=status,
        file_type=file_type,
        uploaded_by=uploaded_by,
        ai_processed=ai_processed,
        ocr_processed=ocr_processed,
        date=date,
        date_from=date_from,
        date_to=date_to,
        min_confidence=min_confidence,
        max_confidence=max_confidence,
    )

    used_fuzzy_fallback = False

    if q:
        text_query = apply_text_search(filtered_query, q)
        total = text_query.count()

        if total == 0:
            # Stage 2 - nothing matched exactly, try fuzzy.
            candidates = filtered_query.limit(FUZZY_CANDIDATE_CAP).all()
            fuzzy_matches = _fuzzy_fallback(candidates, q)
            total = len(fuzzy_matches)
            used_fuzzy_fallback = True
            start = (page - 1) * page_size
            items = fuzzy_matches[start : start + page_size]
        else:
            sort_key = sort or "newest"
            text_query = text_query.order_by(SORT_MAP.get(sort_key, SORT_MAP["newest"])())
            items = text_query.offset((page - 1) * page_size).limit(page_size).all()
    else:
        total = filtered_query.count()
        sort_key = sort or "newest"
        ordered_query = filtered_query.order_by(SORT_MAP.get(sort_key, SORT_MAP["newest"])())
        items = ordered_query.offset((page - 1) * page_size).limit(page_size).all()

    ai_processed_count = filtered_query.filter(Document.ai_processed.is_(True)).count()
    ocr_processed_count = filtered_query.filter(Document.ocr_text.isnot(None)).count()

    return {
        "items": items,
        "total": total,
        "overall_total": overall_total,
        "ai_processed_count": ai_processed_count,
        "ocr_processed_count": ocr_processed_count,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, -(-total // page_size)),  # ceil division
        "used_fuzzy_fallback": used_fuzzy_fallback,
    }
