// Audit Log API calls (Phase 8).
import client from "./client";

export const listAuditLogsRequest = (params) => client.get("/audit-logs", { params });
