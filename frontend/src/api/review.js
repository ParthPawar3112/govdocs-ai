// Document Approval Workflow API calls (Phase 8), kept separate per the
// existing api/*.js pattern in this codebase.
import client from "./client";

export const reviewDocumentRequest = (id, { action, remarks }) =>
  client.post(`/documents/${id}/review`, { action, remarks });

export const archiveDocumentRequest = (id) => client.post(`/documents/${id}/archive`);
