// Document Management API calls, kept separate from components per the
// existing api/auth.js pattern in this codebase.
import client from "./client";

export const listDocumentsRequest = (params) => client.get("/documents", { params });

export const getDocumentRequest = (id) => client.get(`/documents/${id}`);

export const uploadDocumentRequest = (formData, onUploadProgress) =>
  client.post("/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
  });

export const updateDocumentRequest = (id, updates) => client.put(`/documents/${id}`, updates);

export const deleteDocumentRequest = (id) => client.delete(`/documents/${id}`);

export const getDocumentStatsRequest = () => client.get("/documents/stats");

// Phase 5 - manual (re)run of OCR, used both by the initial-failure Retry
// button and to backfill OCR on documents uploaded before this phase existed.
export const extractTextRequest = (id) => client.post(`/documents/${id}/extract-text`);

// Phase 6 - manual (re)run of AI metadata extraction.
export const extractMetadataRequest = (id) => client.post(`/documents/${id}/extract-metadata`);

// Fetched as a blob (not navigated to directly) so the shared axios instance
// can attach the Authorization header - a plain <a href> or <img src> can't
// send bearer tokens, and these documents are access-controlled by design.
export const fetchDocumentBlobRequest = (id) =>
  client.get(`/documents/download/${id}`, { responseType: "blob" });
