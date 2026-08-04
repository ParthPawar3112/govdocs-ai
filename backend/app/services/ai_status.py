"""
Tracks which documents currently have AI metadata extraction in flight.

Simpler than app/services/ocr_status.py: Phase 6 already persists two of the
four states as real columns (ai_processed, ai_error), so only "processing"
needs to be tracked at runtime - "completed" and "failed" are read directly
off the document. Resets on server restart, same reasoning as ocr_status.py.
"""

_processing_ids: set[int] = set()


def mark_processing(document_id: int) -> None:
    _processing_ids.add(document_id)


def clear_processing(document_id: int) -> None:
    _processing_ids.discard(document_id)


def get_status(document_id: int, ai_processed: bool, ai_error: str | None) -> str:
    """Returns 'completed' | 'failed' | 'processing' | 'pending'."""
    if ai_processed:
        return "completed"
    if ai_error:
        return "failed"
    if document_id in _processing_ids:
        return "processing"
    return "pending"
