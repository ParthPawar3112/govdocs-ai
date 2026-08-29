// Document Trust & Verification API calls ("The Bad Reading" challenge).
import client from "./client";

export const getVerification = (documentId) => client.get(`/verification/${documentId}`);
export const analyzeVerification = (documentId) =>
  client.post(`/verification/${documentId}/analyze`);
export const submitForTrustReview = (documentId) =>
  client.post(`/verification/${documentId}/submit-review`);
export const recordReviewDecision = (documentId, decision, reason) =>
  client.post(`/verification/${documentId}/review-decision`, { decision, reason });
export const getTrustReviewQueue = () => client.get("/verification/review-queue");

// Demo scenario helpers (admin only).
export const seedBadReadingDemo = () => client.post("/verification/demo/seed");
export const resetBadReadingDemo = () => client.post("/verification/demo/reset");
