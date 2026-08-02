"""
Tracks OCR processing/failure state per document, in memory only.

Deliberately NOT a database column: the brief for this phase adds exactly
one field (ocr_text) and nothing else to the documents table. "processing"
and "failed" are transient states the frontend only needs while a request is
live - the presence of ocr_text itself is the durable "completed" signal.
This resets on server restart, which is fine: a restarted server has no
requests "in flight" anyway, and Retry is always available.

Kept as its own tiny module (no internal imports) so both ocr_service.py
and schemas/document.py can import it without any circular-import risk.
"""

_processing_ids: set[int] = set()
_failed_ids: set[int] = set()


def mark_processing(document_id: int) -> None:
    _failed_ids.discard(document_id)
    _processing_ids.add(document_id)


def mark_failed(document_id: int) -> None:
    _processing_ids.discard(document_id)
    _failed_ids.add(document_id)


def mark_done(document_id: int) -> None:
    _processing_ids.discard(document_id)
    _failed_ids.discard(document_id)


def get_status(document_id: int, ocr_text: str | None) -> str:
    """Returns 'completed' | 'processing' | 'failed' | 'pending'."""
    if ocr_text:
        return "completed"
    if document_id in _processing_ids:
        return "processing"
    if document_id in _failed_ids:
        return "failed"
    return "pending"
