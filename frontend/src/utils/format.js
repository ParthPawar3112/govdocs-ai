// Presentation-only helpers. No business logic, no API calls.

export function getInitials(username = "") {
  const clean = username.trim();
  if (!clean) return "?";
  return clean.slice(0, 2).toUpperCase();
}

export function formatRelativeTime(date) {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  return `${diffHr}h ago`;
}

export function formatFullDate(date) {
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(date) {
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Single source of truth for "is this filetype an image" - was previously
// duplicated identically in DocumentsTable, SearchResultCard, and
// OriginalDocumentPanel.
export function isImageFile(filetype) {
  return ["jpg", "jpeg", "png"].includes(filetype);
}
