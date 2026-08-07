// Analytics dashboard API calls (Phase 8).
import client from "./client";

export const getAnalyticsSummaryRequest = () => client.get("/analytics/summary");
export const getUploadsOverTimeRequest = (days = 30) =>
  client.get("/analytics/uploads-over-time", { params: { days } });
export const getDepartmentBreakdownRequest = () => client.get("/analytics/departments");
export const getCategoryBreakdownRequest = () => client.get("/analytics/categories");
