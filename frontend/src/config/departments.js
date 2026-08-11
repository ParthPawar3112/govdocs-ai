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

// Mirrors backend AI_OUTPUT_LANGUAGES (app/core/constants.py). This is the
// language the AI-generated title/summary come back in - separate from OCR,
// which always reads both English and Marathi script in the source image
// regardless of this choice. value is what's sent to the API; label is
// what's shown in the dropdown.
export const AI_OUTPUT_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "marathi", label: "Marathi (मराठी)" },
];
export const DEFAULT_AI_OUTPUT_LANGUAGE = "english";
