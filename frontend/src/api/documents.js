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

// Fetched as a blob (not navigated to directly) so the shared axios instance
// can attach the Authorization header - a plain <a href> or <img src> can't
// send bearer tokens, and these documents are access-controlled by design.
export const fetchDocumentBlobRequest = (id) =>
  client.get(`/documents/download/${id}`, { responseType: "blob" });
