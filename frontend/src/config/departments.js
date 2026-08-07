// Mirrors backend/app/core/constants.py DEPARTMENTS exactly. If the backend
// list ever changes, update both - there's no shared source across the
// Python/JS boundary in this stack.
export const DEPARTMENTS = [
  "Revenue",
  "Education",
  "Health",
  "Agriculture",
  "Police",
  "Municipal",
  "Finance",
  "General Administration",
];

export const DOCUMENT_STATUSES = ["Pending", "Approved", "Rejected", "Needs Correction", "Archived"];

export const ALLOWED_UPLOAD_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];
export const MAX_UPLOAD_SIZE_MB = 10;
