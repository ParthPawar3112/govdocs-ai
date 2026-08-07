// Presentation-only helper for Smart Search result cards - no API calls.
// Finds the field a query actually matched in and returns a short window of
// text around that match, so results show *why* a document matched instead
// of just its title.
const SNIPPET_FIELDS = ["ocr_text", "ai_summary", "description"];
const SNIPPET_RADIUS = 90;
const FALLBACK_LENGTH = 200;

function truncate(text, length) {
  return text.length > length ? `${text.slice(0, length).trim()}...` : text;
}

function findMatchIndex(text, words) {
  const lower = text.toLowerCase();
  for (const word of words) {
    const index = lower.indexOf(word.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

export function getSearchSnippet(document, query) {
  const words = (query || "").trim().split(/\s+/).filter(Boolean);

  for (const field of SNIPPET_FIELDS) {
    const text = document[field];
    if (!text) continue;

    const matchIndex = words.length > 0 ? findMatchIndex(text, words) : -1;
    if (matchIndex === -1) continue;

    const start = Math.max(0, matchIndex - SNIPPET_RADIUS);
    const end = Math.min(text.length, matchIndex + SNIPPET_RADIUS);
    const prefix = start > 0 ? "..." : "";
    const suffix = end < text.length ? "..." : "";
    return `${prefix}${text.slice(start, end).trim()}${suffix}`;
  }

  // Nothing matched a searchable text field directly (e.g. the fuzzy
  // fallback matched only on title/keywords) - still show some preview.
  for (const field of SNIPPET_FIELDS) {
    if (document[field]) return truncate(document[field], FALLBACK_LENGTH);
  }
  return null;
}
