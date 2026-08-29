// Citizen self-service API calls, kept separate per the existing api/*.js
// pattern. All are scoped server-side to the caller's own uploads.
import client from "./client";

export const getCitizenDashboardRequest = () => client.get("/citizen/dashboard");

export const getCitizenDocumentsRequest = () => client.get("/citizen/documents");

export const getCitizenDocumentRequest = (id) => client.get(`/citizen/documents/${id}`);
